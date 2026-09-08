"""Hashcat CrackEngine Implementation.

Fulfills `CrackEngine` interface (OCP & LSP), wrapping Hashcat CLI via list-based subprocess.
Never uses `shell=True`. Always enforces execution timeout.
"""

import os
import logging
import subprocess
import time
from typing import Any, List, Optional
from backend.core.interfaces.crack_engine import CrackEngine, CrackResult, CrackedHash
from backend.core.cracking.binary_resolver import resolve_engine_binary
from backend.core.cracking.format_lookup import get_hashcat_mode
from backend.core.cracking.wordlist_utils import resolve_wordlist_path

logger = logging.getLogger(__name__)


class HashcatEngine(CrackEngine):
    """Hashcat CLI wrapper implementing CrackEngine."""

    def __init__(self, binary_path: Optional[str] = None):
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

        # Count total input hashes from hash_file
        total_input_hashes = 0
        if os.path.exists(hash_file):
            with open(hash_file, "r", encoding="utf-8", errors="ignore") as hf:
                total_input_hashes = sum(1 for line in hf if line.strip())

        # Resolve binary path via 3-tier lookup
        resolved_bin, checked_paths, version = resolve_engine_binary("hashcat", self._binary_path)
        if not resolved_bin:
            err_msg = (
                f"Hashcat binary not found. Checked: [{', '.join(checked_paths)}]. "
                "Specify a custom binary path in Settings or verify installation."
            )
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="tool_not_found",
                error_message=err_msg
            )

        # Resolve wordlist to a verified absolute path on disk
        resolved_wordlist = resolve_wordlist_path(wordlist)

        # Build list-based command argument vector (never shell=True)
        out_file = f"{hash_file}.cracked"
        cmd: List[str] = [
            resolved_bin,
            "-m", str(mode),
            "-a", "0",  # Dictionary attack mode
            "--potfile-disable",  # Ensure potfile lookup doesn't suppress output
            hash_file,
            resolved_wordlist,
            "--outfile", out_file,
            "--outfile-format", "1,2",  # output format: hash:plaintext
            "--quiet",
        ]

        if potfile_path:
            cmd.extend(["--potfile-path", potfile_path])

        logger.info(f"Executing Hashcat CLI command: {' '.join(cmd)}")
        print(f"[HashcatEngine] Command vector: {' '.join(cmd)}")

        bin_cwd = os.path.dirname(resolved_bin) if os.path.isabs(resolved_bin) and os.path.isfile(resolved_bin) else None

        start_time = time.time()
        try:
            res = subprocess.run(
                cmd,
                shell=False,
                timeout=timeout,
                capture_output=True,
                text=True,
                cwd=bin_cwd
            )
            elapsed_time = time.time() - start_time
        except FileNotFoundError as e:
            err_msg = (
                f"Hashcat binary not found at resolved path '{resolved_bin}'. "
                f"Checked: [{', '.join(checked_paths)}]."
            )
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="tool_not_found",
                error_message=err_msg
            )
        except subprocess.TimeoutExpired as e:
            err_msg = f"Hashcat run timed out after {timeout} seconds."
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                execution_time_seconds=float(timeout),
                status="timeout",
                error_message=err_msg
            )
        except Exception as e:
            err_msg = f"Subprocess error executing Hashcat: {str(e)}"
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="execution_error",
                error_message=err_msg
            )

        if res.returncode not in [0, 1]:
            err_msg = f"Hashcat process failed with exit code {res.returncode}: {res.stderr or res.stdout}"
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="execution_error",
                error_message=err_msg
            )

        # Parse cracked output file and stdout streams
        cracked_items: List[CrackedHash] = []
        raw_lines: List[str] = []

        try:
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="ignore") as f:
                    raw_lines.extend(f.readlines())
                try:
                    os.remove(out_file)
                except OSError:
                    pass
            elif res.stdout:
                raw_lines.extend(res.stdout.splitlines())

            seen_hashes = set()
            for line in raw_lines:
                line = line.strip()
                if not line:
                    continue
                if ":" in line:
                    parts = line.split(":", 1)
                    h_val, p_text = parts[0].strip(), parts[1].strip()
                    if h_val not in seen_hashes:
                        seen_hashes.add(h_val)
                        cracked_items.append(
                            CrackedHash(
                                hash_value=h_val,
                                cracked=True,
                                plaintext=p_text,
                                crack_time_seconds=elapsed_time,
                                hash_type=algorithm
                            )
                        )
        except Exception as parse_err:
            err_msg = f"Failed to parse Hashcat output stream: {str(parse_err)}"
            logger.error(err_msg)
            return CrackResult(
                engine_name=self.engine_name,
                total_hashes=total_input_hashes,
                cracked_count=0,
                status="result_parse_error",
                error_message=err_msg
            )

        return CrackResult(
            engine_name=self.engine_name,
            total_hashes=total_input_hashes,
            cracked_count=len(cracked_items),
            cracked_hashes=cracked_items,
            execution_time_seconds=elapsed_time,
            status="success",
            error_message=None,
            metadata={
                "returncode": res.returncode,
                "algorithm": algorithm,
                "mode": mode,
                "wordlist": resolved_wordlist
            }
        )

