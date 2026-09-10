"""Integration tests for Audit API endpoints using TestClient and real cracking engine wrappers (with mocked execution).

Executes in milliseconds without requiring external CLI binary installations.
"""

import sys
import os
import time
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.main import app
from backend.core.interfaces.crack_engine import CrackResult, CrackedHash
from backend.core.cracking.hashcat_engine import HashcatEngine

client = TestClient(app)


def test_full_audit_api_workflow_hashcat():
    """Verify POST /audit -> GET /audit/{id}/status -> GET /audit/{id} workflow with Hashcat engine."""
    payload = {
        "algorithm": "md5",
        "engine": "hashcat",
        "passwords": ["123456", "password", "SuperSecurePass2026!"],
        "wordlist_name": "rockyou.txt",
        "context_words": ["Super"],
        "min_password_length": 12
    }

    mock_cracked_result = CrackResult(
        engine_name="Hashcat Engine",
        total_hashes=3,
        cracked_count=2,
        cracked_hashes=[
            CrackedHash(
                hash_value="e10adc3949ba59abbe56e057f20f883e",
                cracked=True,
                plaintext="123456",
                crack_time_seconds=0.5,
                hash_type="md5"
            ),
            CrackedHash(
                hash_value="5f4dcc3b5aa765d61d8327deb882cf99",
                cracked=True,
                plaintext="password",
                crack_time_seconds=1.0,
                hash_type="md5"
            ),
        ],
        execution_time_seconds=1.5,
        status="success"
    )

    with patch.object(HashcatEngine, "run", return_value=mock_cracked_result):
        # 1. Trigger Audit Job
        response = client.post("/api/v1/audit", json=payload)
        assert response.status_code == 202
        status_data = response.json()

        assert "audit_id" in status_data
        audit_id = status_data["audit_id"]

        # 2. Poll Status Endpoint until completed
        completed = False
        for _ in range(10):
            res_status = client.get(f"/api/v1/audit/{audit_id}/status")
            assert res_status.status_code == 200
            data_status = res_status.json()
            if data_status["status"] == "completed":
                completed = True
                assert data_status["progress_percent"] == 100.0
                break
            time.sleep(0.1)

        assert completed is True, f"Audit job '{audit_id}' did not complete in time."

        # 3. Retrieve Full Audit Report JSON
        res_report = client.get(f"/api/v1/audit/{audit_id}")
        assert res_report.status_code == 200
        report = res_report.json()

        assert report["audit_id"] == audit_id
        assert report["status"] == "completed"
        assert "summary" in report

        summary = report["summary"]
        assert summary["total_hashes"] == 3
        assert summary["cracked_count"] == 2
        assert summary["cracked_percentage"] > 50.0

        # Verify Recommendations present
        assert "recommendations" in report
        recs = report["recommendations"]
        assert len(recs) > 0

        # Verify structured policy sections present
        assert "policy_reports" in report
        assert len(report["policy_reports"]) == 3


def test_audit_not_found_404():
    """Verify 404 Not Found for non-existent audit IDs."""
    res_status = client.get("/api/v1/audit/nonexistent_audit_id/status")
    assert res_status.status_code == 404

    res_report = client.get("/api/v1/audit/nonexistent_audit_id")
    assert res_report.status_code == 404
