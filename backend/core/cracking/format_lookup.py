"""Format lookup module for Hashcat modes and John the Ripper formats.

Maps common algorithm names to engine-specific parameters.
"""

from typing import Dict, Any

# Hashcat mode mapping (-m flag)
HASHCAT_MODE_MAP: Dict[str, int] = {
    "md5": 0,
    "sha1": 100,
    "sha256": 1400,
    "sha512": 1700,
    "ntlm": 1000,
    "bcrypt": 3200,
}

# John the Ripper format mapping (--format flag)
JOHN_FORMAT_MAP: Dict[str, str] = {
    "md5": "raw-md5",
    "sha1": "raw-sha1",
    "sha256": "raw-sha256",
    "sha512": "raw-sha512",
    "ntlm": "nt",
    "bcrypt": "bcrypt",
}


def get_hashcat_mode(algorithm: str) -> int:
    """Returns Hashcat mode integer for given algorithm.

    Raises:
        ValueError: If algorithm is unknown.
    """
    algo = algorithm.lower().strip()
    if algo not in HASHCAT_MODE_MAP:
        raise ValueError(f"Unknown Hashcat algorithm: '{algorithm}'. Supported: {list(HASHCAT_MODE_MAP.keys())}")
    return HASHCAT_MODE_MAP[algo]


def get_john_format(algorithm: str) -> str:
    """Returns John the Ripper format string for given algorithm.

    Raises:
        ValueError: If algorithm is unknown.
    """
    algo = algorithm.lower().strip()
    if algo not in JOHN_FORMAT_MAP:
        raise ValueError(f"Unknown John the Ripper algorithm: '{algorithm}'. Supported: {list(JOHN_FORMAT_MAP.keys())}")
    return JOHN_FORMAT_MAP[algo]
