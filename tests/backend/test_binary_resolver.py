"""Unit tests for multi-tier binary resolver and custom engine path configuration.

Tests:
1. 3-tier resolution order: Custom path -> System PATH -> Common default install locations.
2. Handling of non-existent custom paths and reporting all checked paths in error message.
3. John the Ripper binary detection via custom path, shutil.which (john and john.exe), and common locations.
4. Engine check API endpoint (/api/v1/audit/engines/check).
5. Engine config GET and POST API endpoints (/api/v1/audit/engines/config).
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
    """Verify valid custom path is returned first in 3-tier lookup for Hashcat."""
    fake_bin = tmp_path / "custom_hashcat.exe"
    fake_bin.write_text("fake binary")

    res_path, checked_paths, ver = resolve_engine_binary("hashcat", str(fake_bin))

    assert res_path == str(fake_bin)
    assert any(f"Custom path: '{fake_bin}'" in p for p in checked_paths)


def test_resolve_john_binary_custom_path_valid(tmp_path):
    """Verify valid custom path is returned first in 3-tier lookup for John."""
    fake_bin = tmp_path / "custom_john.exe"
    fake_bin.write_text("fake john binary")

    res_path, checked_paths, ver = resolve_engine_binary("john", str(fake_bin))

    assert res_path == str(fake_bin)
    assert any(f"Custom path: '{fake_bin}'" in p for p in checked_paths)


def test_resolve_john_binary_system_path(tmp_path):
    """Verify John binary detection via system PATH (checking john / john.exe)."""
    fake_john = tmp_path / ("john.exe" if sys.platform == "win32" else "john")
    fake_john.write_text("fake john executable")

    def mock_which(cmd):
        if cmd in ["john", "john.exe"]:
            return str(fake_john)
        return None

    with patch("shutil.which", side_effect=mock_which):
        res_path, checked_paths, ver = resolve_engine_binary("john")
        assert res_path == str(fake_john)
        assert any("System PATH ('john')" in p for p in checked_paths)


def test_resolve_engine_binary_custom_path_invalid_falls_back():
    """Verify non-existent custom path is recorded in checked_paths and lookup falls back."""
    invalid_path = r"C:\non_existent_folder_xyz\hashcat.exe"

    with patch("shutil.which", return_value=None), patch.dict("backend.core.cracking.binary_resolver.COMMON_INSTALL_PATHS", {"win32": {}, "posix": {}}):
        res_path, checked_paths, ver = resolve_engine_binary("hashcat", invalid_path)

        assert res_path is None
        assert any("Custom path:" in p for p in checked_paths)
        assert any("System PATH" in p for p in checked_paths)


def test_hashcat_engine_error_message_includes_checked_paths():
    """Verify missing hashcat binary error message explicitly lists all checked candidate paths."""
    engine = HashcatEngine(binary_path=r"C:\invalid_path\hashcat.exe")

    with patch("shutil.which", return_value=None), patch.dict("backend.core.cracking.binary_resolver.COMMON_INSTALL_PATHS", {"win32": {}, "posix": {}}):
        res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

        assert res.status == "tool_not_found"
        assert "Checked:" in res.error_message
        assert "Custom path:" in res.error_message or "System PATH" in res.error_message


def test_john_engine_error_message_includes_checked_paths():
    """Verify missing john binary error message explicitly lists all checked candidate paths."""
    engine = JohnEngine(binary_path=r"C:\invalid_path\john.exe")

    with patch("shutil.which", return_value=None), patch.dict("backend.core.cracking.binary_resolver.COMMON_INSTALL_PATHS", {"win32": {}, "posix": {}}):
        res = engine.run("dummy.hash", "dummy.txt", algorithm="md5")

        assert res.status == "tool_not_found"
        assert "John the Ripper binary not found" in res.error_message
        assert "Checked:" in res.error_message


def test_engine_check_api_endpoint():
    """Verify GET /api/v1/audit/engines/check returns engine status structure for both Hashcat and John."""
    response = client.get("/api/v1/audit/engines/check")
    assert response.status_code == 200
    data = response.json()

    assert "hashcat" in data
    assert "john" in data
    assert data["hashcat"]["engine"] == "Hashcat"
    assert data["john"]["engine"] == "John the Ripper"
    assert "status" in data["hashcat"]
    assert "status" in data["john"]
    assert "checked_paths" in data["hashcat"]
    assert "checked_paths" in data["john"]
    assert isinstance(data["hashcat"]["checked_paths"], list)
    assert isinstance(data["john"]["checked_paths"], list)


def test_engine_config_api_endpoints(tmp_path):
    """Verify GET and POST /api/v1/audit/engines/config endpoints with admin authentication."""
    password = os.getenv("ADMIN_PASSWORD", "admin")
    login_res = client.post("/api/v1/auth/admin-login", json={"password": password})
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test GET config
    get_res = client.get("/api/v1/audit/engines/config", headers=headers)
    assert get_res.status_code == 200
    assert "hashcat_binary_path" in get_res.json()
    assert "john_binary_path" in get_res.json()

    # Test POST config update
    fake_custom_hashcat = str(tmp_path / "hashcat.exe")
    fake_custom_john = str(tmp_path / "john.exe")
    post_res = client.post(
        "/api/v1/audit/engines/config",
        json={"hashcat_binary_path": fake_custom_hashcat, "john_binary_path": fake_custom_john},
        headers=headers
    )
    assert post_res.status_code == 200
    data = post_res.json()
    assert "hashcat" in data
    assert "john" in data
