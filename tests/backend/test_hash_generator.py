"""Unit tests for Hash Generator module (pure functions, edge cases)."""

import sys
import os
import pytest
import bcrypt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.hashing.hash_generator import (
    generate_test_hashes,
    HashRecord,
    SUPPORTED_ALGORITHMS,
)


def test_generate_test_hashes_md5():
    """Verify MD5 generation and synthetic user labels."""
    passwords = ["admin", "secret"]
    records = generate_test_hashes(passwords, "md5")

    assert len(records) == 2
    assert records[0].label == "user01"
    assert records[0].plaintext == "admin"
    assert records[0].hash_value == "21232f297a57a5a743894a0e4a801fc3"
    assert records[0].algorithm == "md5"

    assert records[1].label == "user02"
    assert records[1].plaintext == "secret"
    assert records[1].hash_value == "5ebe2294ecd0e0f08eab7690d2a6ee69"


def test_generate_test_hashes_sha1_and_sha256():
    """Verify SHA1 and SHA256 hash generation."""
    rec_sha1 = generate_test_hashes(["password"], "sha1")
    assert rec_sha1[0].hash_value == "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8"

    rec_sha256 = generate_test_hashes(["password"], "sha256")
    assert rec_sha256[0].hash_value == "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"


def test_generate_test_hashes_ntlm():
    """Verify NTLM hash calculation (MD4 of UTF-16LE)."""
    records = generate_test_hashes(["password"], "ntlm")
    # NTLM hash of "password" in lowercase hex is 8846f7eaee8fb117ad06bdd830b7586c
    assert records[0].hash_value.lower() == "8846f7eaee8fb117ad06bdd830b7586c"


def test_generate_test_hashes_bcrypt_non_determinism():
    """Verify bcrypt non-deterministic salting and verification."""
    passwords = ["Secret123!"]

    records1 = generate_test_hashes(passwords, "bcrypt")
    records2 = generate_test_hashes(passwords, "bcrypt")

    h1 = records1[0].hash_value
    h2 = records2[0].hash_value

    # Different salts must produce distinct hash strings
    assert h1 != h2

    # Both hashes must verify successfully against original password bytes
    pwd_bytes = "Secret123!".encode("utf-8")
    assert bcrypt.checkpw(pwd_bytes, h1.encode("utf-8")) is True
    assert bcrypt.checkpw(pwd_bytes, h2.encode("utf-8")) is True


def test_empty_password_edge_case():
    """Verify hash generation behavior on empty password string."""
    records = generate_test_hashes([""], "md5")
    assert records[0].plaintext == ""
    # MD5 of empty string
    assert records[0].hash_value == "d41d8cd98f00b204e9800998ecf8427e"


def test_unicode_password_edge_case():
    """Verify hash generation with unicode characters and emojis."""
    pwd = "P@sswørd🔑123!_测试"
    records_md5 = generate_test_hashes([pwd], "md5")
    assert isinstance(records_md5[0].hash_value, str)
    assert len(records_md5[0].hash_value) == 32

    records_bcrypt = generate_test_hashes([pwd], "bcrypt")
    pwd_bytes = pwd.encode("utf-8")[:72]
    assert bcrypt.checkpw(pwd_bytes, records_bcrypt[0].hash_value.encode("utf-8")) is True


def test_invalid_algorithm_raises_value_error():
    """Verify unsupported algorithm raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported algorithm"):
        generate_test_hashes(["password"], "invalid_algo")
