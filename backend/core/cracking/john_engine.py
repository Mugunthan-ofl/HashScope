"""John the Ripper CrackEngine Implementation.

Fulfills `CrackEngine` interface (OCP & LSP), wrapping John the Ripper CLI via list-based subprocess.
Never uses `shell=True`. Always enforces execution timeout.
"""

import os
import subprocess
import time
from typing import Any, List, Optional
from backend.core.interfaces.crack_engine import CrackEngine, CrackResult, CrackedHash
from backend.core.cracking.format_lookup import get_john_format
from backend.core.cracking.wordlist_utils import resolve_wordlist_path


class JohnEngine(CrackEngine):
    """John the Ripper CLI wrapper implementing CrackEngine."""

    def __init__(self, binary_path: str = "john"):
        self._binary_path = binary_path

    @property
    def engine_name(self) -> str:
        return "John the Ripper Engine"

    def run(self, hash_file: str, wordlist: str, **kwargs: Any) -> CrackResult:
        """Runs John the Ripper CLI via list-based subprocess against hash_file.

        Args:
            hash_file (str): Path to hash file.
            wordlist (str): Path to wordlist dictionary.
            **kwargs:
                algorithm (str): Target hash algorithm (md5, sha256, ntlm, etc.).
                timeout (int): Timeout in seconds (default 300).
                potfile_path (str): Optional custom potfile path.

        Returns:
            CrackResult: Parsed cracking statistics and cracked plaintext results.
        """
        algorithm = kwargs.get("algorithm", "md5")
        timeout = int(kwargs.get("timeout", 300))
        potfile_path = kwargs.get("potfile_path", None)

        try:
            fmt = get_john_format(algorithm)
        except ValueError as e:
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=0,
                cracked_count=0,
                status="error",
                error_message=str(e)
            )

        # Count total input hashes from hash_file
        total_input_hashes = 0
        if os.path.exists(hash_file):
            with open(hash_file, "r", encoding="utf-8", errors="ignore") as hf:
                total_input_hashes = sum(1 for line in hf if line.strip())

        # Resolve wordlist to absolute file path on disk
        resolved_wordlist = resolve_wordlist_path(wordlist)

        # Build list-based command argument vector (never shell=True)
        cmd: List[str] = [
            self._binary_path,
            f"--format={fmt}",
            f"--wordlist={resolved_wordlist}",
            hash_file,
        ]

        if potfile_path:
            cmd.append(f"--pot={potfile_path}")

        start_time = time.time()
        try:
            res = subprocess.run(
                cmd,
                shell=False,
                timeout=timeout,
                capture_output=True,
                text=True
            )
            elapsed_time = time.time() - start_time
        except FileNotFoundError:
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="tool_not_found",
                error_message=f"John the Ripper binary not found at path '{self._binary_path}'."
            )
        except subprocess.TimeoutExpired:
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                execution_time_seconds=float(timeout),
                status="timeout",
                error_message=f"John the Ripper run timed out after {timeout} seconds."
            )

        # Run john --show to get cracked plaintexts
        cracked_items: List[CrackedHash] = []
        show_cmd = [self._binary_path, "--show", f"--format={fmt}", hash_file]
        if potfile_path:
            show_cmd.append(f"--pot={potfile_path}")

        try:
            show_res = subprocess.run(
                show_cmd,
                shell=False,
                timeout=30,
                capture_output=True,
                text=True
            )
            if show_res.returncode == 0 and show_res.stdout:
                for line in show_res.stdout.splitlines():
                    line = line.strip()
                    if ":" in line and not line.startswith("0 password hashes") and not line.endswith("left"):
                        parts = line.split(":", 1)
                        cracked_items.append(
                            CrackedHash(
                                hash_value=parts[0],
                                cracked=True,
                                plaintext=parts[1],
                                crack_time_seconds=elapsed_time,
                                hash_type=algorithm
                            )
                        )
        except Exception:
            pass

        return CrackResult(
            engine_name=self.engine_name,
            total_hashes=total_input_hashes,
            cracked_count=len(cracked_items),
            cracked_hashes=cracked_items,
            execution_time_seconds=elapsed_time,
            status="success" if res.returncode in [0, 1] else "error",
            error_message=res.stderr if res.returncode not in [0, 1] else None,
            metadata={
                "returncode": res.returncode,
                "algorithm": algorithm,
                "format": fmt,
                "wordlist": resolved_wordlist
            }
        )

