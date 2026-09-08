"""Unit tests for multi-tier binary resolver and custom engine path configuration.

Tests:
1. 3-tier resolution order: Custom path -> System PATH -> Common default install locations.
2. Handling of non-existent custom paths and reporting all checked paths in error message.
3. Engine check API endpoint (/api/v1/audit/engines/check).
4. Engine config GET and POST API endpoints (/api/v1/audit/engines/config).
"""

import pytest
import os
import sys
import shutil
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.cracking.binary_resolver import (
    resolve_engine_binary,
    check_all_engines,
    get_version_string,
    COMMON_INSTALL_PATHS,
)
from backend.core.config_manager import (
    get_engine_binary_paths,
    update_engine_binary_paths,
)
from backend.core.cracking.hashcat_engine import HashcatEngine
from backend.core.cracking.john_engine import JohnEngine
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_resolve_engine_binary_custom_path_valid(tmp_path):
    """Verify valid custom path is returned first in 3-tier lookup."""
    fake_bin = tmp_path / "custom_hashcat.exe"
    fake_bin.write_text("fake binary")

    res_path, checked_paths, ver = resolve_engine_binary("hashcat", str(fake_bin))

    assert res_path == str(fake_bin)
    assert any(f"Custom path: '{fake_bin}'" in p for p in checked_paths)


def test_resolve_engine_binary_custom_path_invalid_falls_back():
    """Verify non-existent custom path is recorded in checked_paths and lookup falls back."""
    invalid_path = r"C:\non_existent_folder_xyz\hashcat.exe"

    with patch("shutil.which", return_value=None):
        res_path, checked_paths, ver = resolve_engine_binary("hashcat", invalid_path)

        assert res_path is None
        assert any("Custom path:" in p for p in checked_paths)
        assert any("System PATH" in p for p in checked_paths)
        # Should include common OS fallback paths as well
        assert len(checked_paths) > 2


def test_hashcat_engine_error_message_includes_checked_paths():
    """Verify missing hashcat binary error message explicitly lists all checked candidate paths."""
    engine = HashcatEngine(binary_path=r"C:\invalid_path\hashcat.exe")

    with patch("shutil.which", return_value=None):
        res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

        assert res.status == "tool_not_found"
        assert "Checked:" in res.error_message
        assert "Custom path:" in res.error_message or "System PATH" in res.error_message


def test_engine_check_api_endpoint():
    """Verify GET /api/v1/audit/engines/check returns engine status structure."""
    response = client.get("/api/v1/audit/engines/check")
    assert response.status_code == 200
    data = response.json()

    assert "hashcat" in data
    assert "john" in data
    assert data["hashcat"]["engine"] == "Hashcat"
    assert "status" in data["hashcat"]
    assert "checked_paths" in data["hashcat"]
    assert isinstance(data["hashcat"]["checked_paths"], list)


def test_engine_config_api_endpoints(tmp_path):
    """Verify GET and POST /api/v1/audit/engines/config endpoints."""
    # Test GET config
    get_res = client.get("/api/v1/audit/engines/config")
    assert get_res.status_code == 200
    assert "hashcat_binary_path" in get_res.json()

    # Test POST config update
    fake_custom_path = str(tmp_path / "hashcat.exe")
    post_res = client.post(
        "/api/v1/audit/engines/config",
        json={"hashcat_binary_path": fake_custom_path, "john_binary_path": ""}
    )
    assert post_res.status_code == 200
    data = post_res.json()
    assert "hashcat" in data
    assert "john" in data
