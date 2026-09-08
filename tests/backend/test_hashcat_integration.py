"""End-to-end integration test for HashcatEngine real subprocess cracking pipeline.

Hashes literal 'password' as MD5, executes real HashcatEngine subprocess against a real
dictionary file on disk, and verifies crack status, plaintext recovery, and execution time.
"""

import os
import sys
import tempfile
import hashlib
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.cracking.hashcat_engine import HashcatEngine
from backend.core.cracking.wordlist_utils import resolve_wordlist_path


def test_hashcat_md5_real_subprocess_password_cracking():
    """Integration test verifying HashcatEngine CLI command construction, wordlist path resolution,
    subprocess execution, and result parsing for MD5 password 'password'.
    """
    target_pwd = "password"
    md5_hash = hashlib.md5(target_pwd.encode("utf-8")).hexdigest()

    # 1. Create temporary hash file
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".hash") as tf:
        tf.write(f"{md5_hash}\n")
        hash_file_path = tf.name

    # 2. Create temporary wordlist file containing 'password'
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as wf:
        wf.write("123456\nadmin\npassword\nqwerty\n")
        wordlist_path = wf.name

    try:
        # 3. Instantiate real non-mock HashcatEngine
        engine = HashcatEngine()
        result = engine.run(
            hash_file=hash_file_path,
            wordlist=wordlist_path,
            algorithm="md5",
            timeout=10
        )

        assert result.engine_name == "Hashcat Engine"
        assert result.total_hashes == 1

        # If hashcat CLI binary is available on machine, verify successful crack
        if result.status == "success":
            assert result.cracked_count == 1
            assert len(result.cracked_hashes) == 1
            cracked = result.cracked_hashes[0]
            assert cracked.cracked is True
            assert cracked.plaintext == target_pwd
            assert cracked.hash_value == md5_hash
            assert result.execution_time_seconds < 5.0
        elif result.status == "tool_not_found":
            # If hashcat CLI binary is not installed in PATH on test host,
            # verify engine cleanly reports tool_not_found error state
            assert result.cracked_count == 0
            assert "Hashcat binary not found" in (result.error_message or "")
        else:
            pytest.fail(f"Unexpected Hashcat execution status: {result.status}, error: {result.error_message}")

    finally:
        if os.path.exists(hash_file_path):
            os.remove(hash_file_path)
        if os.path.exists(wordlist_path):
            os.remove(wordlist_path)


def test_hashcat_wordlist_path_resolution():
    """Verify relative wordlist names automatically resolve to real existing files on disk."""
    resolved_path = resolve_wordlist_path("rockyou.txt")
    assert os.path.isabs(resolved_path)
    assert os.path.exists(resolved_path)
    assert os.path.isfile(resolved_path)

    # Verify default rockyou.txt contains 'password'
    with open(resolved_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert "password" in content
