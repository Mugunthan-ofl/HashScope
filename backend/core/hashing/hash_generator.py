"""Hash Generator Module.

Provides synthetic hash generation for password audit simulations.
Supports MD5, SHA1, SHA256, NTLM, and bcrypt algorithms.
"""

from dataclasses import dataclass
import hashlib
from typing import List
import bcrypt
from passlib.hash import nthash


@dataclass
class HashRecord:
    """Represents a generated hash record with a synthetic identifier."""
    label: str
    plaintext: str
    hash_value: str
    algorithm: str


SUPPORTED_ALGORITHMS = ["md5", "sha1", "sha256", "ntlm", "bcrypt"]


def _hash_single(password: str, algorithm: str) -> str:
    """Helper to compute hash for a single plaintext string.

    Args:
        password (str): Plaintext string.
        algorithm (str): Normalized algorithm string.

    Returns:
        str: Hexdigest or formatted hash string.
    """
    algo = algorithm.lower().strip()

    if algo == "md5":
        return hashlib.md5(password.encode("utf-8")).hexdigest()
    elif algo == "sha1":
        return hashlib.sha1(password.encode("utf-8")).hexdigest()
    elif algo == "sha256":
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
    elif algo == "ntlm":
        # NTLM via passlib nthash (MD4 of UTF-16LE)
        return nthash.hash(password)
    elif algo == "bcrypt":
        # Direct bcrypt hashing with 72-byte max safety cutoff
        pwd_bytes = password.encode("utf-8")[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")
    else:
        raise ValueError(
            f"Unsupported algorithm '{algorithm}'. Supported: {', '.join(SUPPORTED_ALGORITHMS)}"
        )


def generate_test_hashes(passwords: List[str], algorithm: str) -> List[HashRecord]:
    """Generates synthetic test hash records for a list of plaintext passwords.

    Args:
        passwords (List[str]): List of plaintext passwords.
        algorithm (str): Hash algorithm (md5, sha1, sha256, ntlm, bcrypt).

    Returns:
        List[HashRecord]: List of HashRecord objects carrying synthetic labels (user01, user02...).
    """
    normalized_algo = algorithm.lower().strip()
    if normalized_algo not in SUPPORTED_ALGORITHMS:
        raise ValueError(
            f"Unsupported algorithm '{algorithm}'. Supported: {', '.join(SUPPORTED_ALGORITHMS)}"
        )

    records: List[HashRecord] = []
    for idx, pwd in enumerate(passwords, start=1):
        label = f"user{idx:02d}"
        hash_val = _hash_single(pwd, normalized_algo)
        records.append(
            HashRecord(
                label=label,
                plaintext=pwd,
                hash_value=hash_val,
                algorithm=normalized_algo,
            )
        )
    return records


class HashGenerator:
    """Class wrapper for hash generation utility."""

    def __init__(self, default_algorithm: str = "md5"):
        self.default_algorithm = default_algorithm

    def generate(self, passwords: List[str], algorithm: str = None) -> List[HashRecord]:
        algo = algorithm or self.default_algorithm
        return generate_test_hashes(passwords, algo)
