"""Hashcat CrackEngine Implementation.

Fulfills `CrackEngine` interface (OCP & LSP), wrapping Hashcat CLI via list-based subprocess.
Never uses `shell=True`. Always enforces execution timeout.
"""

import os
import subprocess
import time
from typing import Any, List, Optional
from backend.core.interfaces.crack_engine import CrackEngine, CrackResult, CrackedHash
from backend.core.cracking.format_lookup import get_hashcat_mode


class HashcatEngine(CrackEngine):
    """Hashcat CLI wrapper implementing CrackEngine."""

    def __init__(self, binary_path: str = "hashcat"):
        self._binary_path = binary_path

    @property
    def engine_name(self) -> str:
        return "Hashcat Engine"

    def run(self, hash_file: str, wordlist: str, **kwargs: Any) -> CrackResult:
        """Runs Hashcat CLI via list-based subprocess against hash_file.

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
            mode = get_hashcat_mode(algorithm)
        except ValueError as e:
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=0,
                cracked_count=0,
                status="error",
                error_message=str(e)
            )

        # Build list-based command argument vector (never shell=True)
        out_file = f"{hash_file}.cracked"
        cmd: List[str] = [
            self._binary_path,
            "-m", str(mode),
            "-a", "0",  # Dictionary attack mode
            hash_file,
            wordlist,
            "--outfile", out_file,
            "--outfile-format", "1,2",  # output format: hash:plaintext
            "--quiet",
        ]

        if potfile_path:
            cmd.extend(["--potfile-path", potfile_path])

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
                total_hashes=0,
                cracked_count=0,
                status="tool_not_found",
                error_message=f"Hashcat binary not found at path '{self._binary_path}'."
            )
        except subprocess.TimeoutExpired:
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=0,
                cracked_count=0,
                execution_time_seconds=float(timeout),
                status="timeout",
                error_message=f"Hashcat run timed out after {timeout} seconds."
            )

        # Parse cracked output file
        cracked_items: List[CrackedHash] = []
        if os.path.exists(out_file):
            with open(out_file, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    if ":" in line:
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
            # Cleanup output file
            try:
                os.remove(out_file)
            except OSError:
                pass

        return CrackResult(
            engine_name=self.engine_name,
            total_hashes=len(cracked_items),
            cracked_count=len(cracked_items),
            cracked_hashes=cracked_items,
            execution_time_seconds=elapsed_time,
            status="success" if res.returncode in [0, 1] else "error",
            error_message=res.stderr if res.returncode not in [0, 1] else None,
            metadata={"returncode": res.returncode, "algorithm": algorithm, "mode": mode}
        )
