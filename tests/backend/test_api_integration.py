"""Integration tests for Audit API endpoints using TestClient and mock cracking engine.

Executes in milliseconds without external Hashcat/John binary dependencies.
"""

import sys
import os
import time
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.main import app

client = TestClient(app)


def test_full_audit_api_workflow_mock():
    """Verify POST /audit -> GET /audit/{id}/status -> GET /audit/{id} workflow with mock engine."""
    payload = {
        "algorithm": "md5",
        "engine": "mock",
        "passwords": ["123456", "password", "SuperSecurePass2026!"],
        "wordlist_name": "rockyou.txt",
        "context_words": ["Super"],
        "min_password_length": 12
    }

    # 1. Trigger Audit Job
    response = client.post("/api/v1/audit", json=payload)
    assert response.status_code == 202
    status_data = response.json()

    assert "audit_id" in status_data
    audit_id = status_data["audit_id"]
    assert status_data["status"] in ["pending", "running", "completed"]

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
    assert summary["cracked_count"] >= 2  # "123456" and "password" cracked in mock engine
    assert summary["cracked_percentage"] > 50.0
    assert "Very Weak" in summary["strength_distribution"]

    # Verify Ranked Recommendations
    assert "recommendations" in report
    recs = report["recommendations"]
    assert len(recs) > 0
    # Priority 1 recommendation for fast cracking
    assert recs[0]["priority"] == 1
    assert "MFA" in recs[0]["title"] or "Length" in recs[0]["title"]

    # Verify structured policy sections present
    assert "policy_reports" in report
    assert len(report["policy_reports"]) == 3
    for pr in report["policy_reports"]:
        assert "baseline" in pr
        assert "advanced" in pr
        assert "breach" in pr


def test_audit_not_found_404():
    """Verify 404 Not Found for non-existent audit IDs."""
    res_status = client.get("/api/v1/audit/nonexistent_audit_id/status")
    assert res_status.status_code == 404

    res_report = client.get("/api/v1/audit/nonexistent_audit_id")
    assert res_report.status_code == 404
