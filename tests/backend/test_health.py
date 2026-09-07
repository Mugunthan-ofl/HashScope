"""Test suite for FastAPI health check route and basic API setup."""

import sys
import os
from fastapi.testclient import TestClient

# Ensure backend path is on sys.path for test discovery
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.main import app

client = TestClient(app)


def test_health_check():
    """Verify GET /health returns 200 OK and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_audit_post_endpoint():
    """Verify POST /api/v1/audit returns 202 Accepted and status payload."""
    payload = {
        "algorithm": "md5",
        "engine": "mock",
        "passwords": ["password123"],
        "wordlist_name": "rockyou.txt",
        "min_password_length": 12
    }
    response = client.post("/api/v1/audit", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "audit_id" in data
    assert data["status"] in ["pending", "running", "completed"]
