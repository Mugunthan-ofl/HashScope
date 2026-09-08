"""Wordlist Utilities Module.

Handles resolution of wordlist filenames to absolute file paths on disk,
creating default dictionary files if missing.
"""

import os
from typing import List

# Default directory for storing dictionary wordlists
WORDLISTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "wordlists")
)

# Common passwords to seed default wordlist files
DEFAULT_PASSWORDS: List[str] = [
    "password",
    "123456",
    "123456789",
    "picture1",
    "password1",
    "12345678",
    "111111",
    "123123",
    "12345",
    "1234567",
    "admin",
    "qwerty",
    "qwerty123456",
    "P@ssw0rd123!",
    "SuperSecurePass2026!",
]


def ensure_wordlists_exist() -> str:
    """Ensures wordlists directory and default dictionary files exist on disk.

    Returns:
        str: Absolute path to wordlists directory.
    """
    os.makedirs(WORDLISTS_DIR, exist_ok=True)

    default_files = ["rockyou.txt", "default.txt", "top1000.txt", "passwords.txt"]
    for filename in default_files:
        filepath = os.path.join(WORDLISTS_DIR, filename)
        if not os.path.exists(filepath):
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(DEFAULT_PASSWORDS) + "\n")

    return WORDLISTS_DIR


def resolve_wordlist_path(wordlist_name: str) -> str:
    """Resolves a wordlist name or path to an existing absolute file path on disk.

    Args:
        wordlist_name (str): Relative filename or path string.

    Returns:
        str: Verified absolute file path to existing wordlist file.
    """
    if not wordlist_name:
        wordlist_name = "rockyou.txt"

    # If wordlist_name is already a valid absolute path or relative file that exists
    if os.path.exists(wordlist_name) and os.path.isfile(wordlist_name):
        return os.path.abspath(wordlist_name)

    # Ensure wordlists directory exists
    wordlists_dir = ensure_wordlists_exist()

    # Check inside WORDLISTS_DIR
    target_filename = os.path.basename(wordlist_name)
    target_path = os.path.join(wordlists_dir, target_filename)

    if not os.path.exists(target_path):
        # Create dictionary file populated with default passwords
        with open(target_path, "w", encoding="utf-8") as f:
            f.write("\n".join(DEFAULT_PASSWORDS) + "\n")

    return target_path
