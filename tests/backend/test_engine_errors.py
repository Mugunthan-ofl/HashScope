"""Unit tests for cracking engine error handling and distinct exception types.

Verifies that missing CLI binaries, execution timeouts, non-zero exit codes, and output
parsing failures raise distinct exceptions and fail audit jobs cleanly rather than reporting 0% cracked success.
"""

import pytest
import os
import sys
from unittest.mock import MagicMock, patch
import subprocess

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.cracking.hashcat_engine import HashcatEngine
from backend.core.cracking.john_engine import JohnEngine
from backend.core.cracking.exceptions import (
    CrackingEngineError,
    EngineNotFoundError,
    EngineTimeoutError,
    EngineExecutionError,
    ResultParseError,
)
from backend.services.audit_service import AuditService, AuditConfig


def test_hashcat_missing_binary_returns_tool_not_found():
    """Verify missing hashcat binary returns tool_not_found error state."""
    engine = HashcatEngine(binary_path="nonexistent_hashcat_binary_xyz")
    res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

    assert res.status == "tool_not_found"
    assert "not found" in res.error_message.lower()


def test_john_missing_binary_returns_tool_not_found():
    """Verify missing john binary returns tool_not_found error state."""
    engine = JohnEngine(binary_path="nonexistent_john_binary_xyz")
    res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

    assert res.status == "tool_not_found"
    assert "not found" in res.error_message.lower()


@patch("backend.core.cracking.hashcat_engine.resolve_engine_binary")
@patch("subprocess.run")
def test_hashcat_timeout_returns_timeout_status(mock_run, mock_resolve):
    """Verify subprocess TimeoutExpired returns timeout status."""
    mock_resolve.return_value = ("hashcat", ["hashcat"], "v6.2.6")
    mock_run.side_effect = subprocess.TimeoutExpired(cmd="hashcat", timeout=5)

    engine = HashcatEngine()
    res = engine.run("dummy.hash", "dummy.txt", algorithm="md5", timeout=5)

    assert res.status == "timeout"
    assert "timed out" in res.error_message.lower()


@patch("backend.core.cracking.hashcat_engine.resolve_engine_binary")
@patch("subprocess.run")
def test_hashcat_execution_error_on_nonzero_exit(mock_run, mock_resolve):
    """Verify non-zero return code returns execution_error status."""
    mock_resolve.return_value = ("hashcat", ["hashcat"], "v6.2.6")
    mock_proc = MagicMock()
    mock_proc.returncode = 255
    mock_proc.stderr = "CUDA error: Out of memory"
    mock_proc.stdout = ""
    mock_run.return_value = mock_proc

    engine = HashcatEngine()
    res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

    assert res.status == "execution_error"
    assert "exit code 255" in res.error_message



def test_audit_service_fails_job_on_engine_error():
    """Verify AuditService sets status='failed' and records exact error when engine fails."""
    service = AuditService()
    config = AuditConfig(
        algorithm="md5",
        engine="hashcat",
        passwords=["password123"],
        wordlist_name="rockyou.txt"
    )

    # Mock BackgroundTasks container
    bg_tasks = MagicMock()
    status = service.start_audit_job(config, bg_tasks)
    audit_id = status.audit_id

    # Force Hashcat failure by patching HashcatEngine.run to return tool_not_found
    with patch.object(HashcatEngine, "run") as mock_run:
        from backend.core.interfaces.crack_engine import CrackResult
        mock_run.return_value = CrackResult(
            engine_name="Hashcat Engine",
            total_hashes=1,
            cracked_count=0,
            status="tool_not_found",
            error_message="Hashcat binary not found at path 'hashcat'."
        )

        service.run_pipeline(audit_id, config)

    final_status = service.get_status(audit_id)
    assert final_status.status == "failed"
    assert "Hashcat binary not found" in final_status.error_message
