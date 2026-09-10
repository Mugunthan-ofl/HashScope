"""Unit and Integration Tests for Admin Authentication and Settings Route Protection."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.main import app
from backend.core.auth import create_access_token, decode_access_token

client = TestClient(app)


def test_admin_login_success():
    """Verify admin login succeeds with default or configured ADMIN_PASSWORD and returns a valid Bearer token."""
    password = os.getenv("ADMIN_PASSWORD", "admin")
    response = client.post("/api/v1/auth/admin-login", json={"password": password})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["token_type"] == "bearer"

    # Verify token payload
    payload = decode_access_token(data["token"])
    assert payload is not None
    assert payload["sub"] == "admin"


def test_admin_login_invalid_password():
    """Verify admin login fails with incorrect password."""
    response = client.post("/api/v1/auth/admin-login", json={"password": "wrong_password_123!"})
    assert response.status_code == 401
    assert "detail" in response.json()


def test_settings_endpoints_reject_unauthenticated():
    """Verify settings endpoints reject requests without a valid Bearer token (401 Unauthorized)."""
    # 1. GET /api/v1/audit/engines/config without token
    res_get = client.get("/api/v1/audit/engines/config")
    assert res_get.status_code == 401

    # 2. POST /api/v1/audit/engines/config without token
    res_post = client.post(
        "/api/v1/audit/engines/config",
        json={"hashcat_binary_path": "/usr/bin/hashcat", "john_binary_path": ""}
    )
    assert res_post.status_code == 401

    # 3. GET with invalid token
    res_invalid = client.get(
        "/api/v1/audit/engines/config",
        headers={"Authorization": "Bearer invalid_token_xyz"}
    )
    assert res_invalid.status_code == 401


def test_settings_endpoints_allow_authenticated_admin():
    """Verify settings endpoints accept requests with valid admin Bearer token."""
    password = os.getenv("ADMIN_PASSWORD", "admin")
    login_res = client.post("/api/v1/auth/admin-login", json={"password": password})
    token = login_res.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/v1/audit/engines/config
    res_get = client.get("/api/v1/audit/engines/config", headers=headers)
    assert res_get.status_code == 200
    config_data = res_get.json()
    assert "hashcat_binary_path" in config_data
    assert "john_binary_path" in config_data

    # 2. POST /api/v1/audit/engines/config
    res_post = client.post(
        "/api/v1/audit/engines/config",
        json={"hashcat_binary_path": config_data["hashcat_binary_path"], "john_binary_path": config_data["john_binary_path"]},
        headers=headers
    )
    assert res_post.status_code == 200

    # 3. GET /api/v1/auth/verify
    res_verify = client.get("/api/v1/auth/verify", headers=headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "authenticated"


def test_non_settings_endpoints_remain_unauthenticated():
    """Verify non-settings endpoints (audit creation, health check, engine status check, wordlists) work without token."""
    # Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200

    # Engine check (for UI status badge)
    res_check = client.get("/api/v1/audit/engines/check")
    assert res_check.status_code == 200

    # Wordlists list (for audit creation UI)
    res_wl = client.get("/api/v1/audit/wordlists")
    assert res_wl.status_code == 200
