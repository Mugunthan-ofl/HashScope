"""Multi-Tier Binary Path Resolver for Hashcat and John the Ripper.

Checks in order:
1. Custom path configured in Settings / config.yaml
2. System PATH via shutil.which()
3. Common default OS installation directories for Windows, Linux, and macOS.
"""

import os
import sys
import shutil
import subprocess
from typing import Optional, List, Tuple, Dict, Any

# Common default install locations by OS
COMMON_INSTALL_PATHS: Dict[str, Dict[str, List[str]]] = {
    "win32": {
        "hashcat": [
            r"C:\hashcat\hashcat.exe",
            r"C:\hashcat-6.2.6\hashcat.exe",
            r"C:\Program Files\hashcat\hashcat.exe",
            r"C:\Program Files (x86)\hashcat\hashcat.exe",
            r"C:\ProgramData\chocolatey\bin\hashcat.exe",
            os.path.expanduser(r"~\scoop\shims\hashcat.exe"),
            os.path.expanduser(r"~\AppData\Local\Programs\hashcat\hashcat.exe"),
        ],
        "john": [
            r"C:\john\run\john.exe",
            r"C:\john\john.exe",
            r"C:\Program Files\john\run\john.exe",
            r"C:\Program Files (x86)\john\run\john.exe",
            os.path.expanduser(r"~\scoop\shims\john.exe"),
        ],
    },
    "posix": {
        "hashcat": [
            "/usr/bin/hashcat",
            "/usr/local/bin/hashcat",
            "/opt/hashcat/hashcat",
            "/bin/hashcat",
            "/snap/bin/hashcat",
            "/opt/homebrew/bin/hashcat",
        ],
        "john": [
            "/usr/bin/john",
            "/usr/local/bin/john",
            "/opt/john/run/john",
            "/bin/john",
            "/snap/bin/john",
            "/opt/homebrew/bin/john",
        ],
    },
}


def _get_os_category() -> str:
    """Returns 'win32' for Windows, 'posix' for Linux/macOS."""
    return "win32" if sys.platform == "win32" else "posix"


def get_version_string(binary_path: str) -> Optional[str]:
    """Executes binary with --version flag to extract version string.

    Args:
        binary_path (str): Verified path to executable file.

    Returns:
        Optional[str]: Extracted version string if successful.
    """
    if not binary_path or not os.path.exists(binary_path):
        return None

    flags = ["--version", "-v", "--help"]
    for flag in flags:
        try:
            res = subprocess.run(
                [binary_path, flag],
                capture_output=True,
                text=True,
                timeout=3,
                shell=False
            )
            output = (res.stdout or res.stderr or "").strip()
            if output:
                lines = [line.strip() for line in output.splitlines() if line.strip()]
                if lines:
                    first_line = lines[0]
                    if len(first_line) > 60:
                        first_line = first_line[:60] + "..."
                    return first_line
        except Exception:
            continue
    return "Executable verified"


def resolve_engine_binary(
    engine: str, custom_path: Optional[str] = None
) -> Tuple[Optional[str], List[str], Optional[str]]:
    """Resolves executable path for cracking engine in 3-tier order.

    Args:
        engine (str): 'hashcat' or 'john'.
        custom_path (Optional[str]): Optional custom binary path specified by user.

    Returns:
        Tuple[Optional[str], List[str], Optional[str]]:
            - Resolved absolute path to executable (or None if not found)
            - List of all candidate paths checked
            - Extracted version string (or None)
    """
    engine_key = engine.lower().strip()
    checked_paths: List[str] = []

    # 1. Check custom path if provided (and not generic name)
    if custom_path and custom_path.strip():
        cp_clean = custom_path.strip()
        if cp_clean.lower() not in ["hashcat", "john", "hashcat.exe", "john.exe"]:
            cp_abs = os.path.abspath(cp_clean)
            checked_paths.append(f"Custom path: '{cp_clean}'")
            if os.path.exists(cp_abs) and os.path.isfile(cp_abs):
                ver = get_version_string(cp_abs)
                return (cp_abs, checked_paths, ver)

    # 2. Check system PATH via shutil.which()
    bin_name = f"{engine_key}.exe" if sys.platform == "win32" else engine_key
    path_found = shutil.which(bin_name) or shutil.which(engine_key)
    checked_paths.append(f"System PATH ('{engine_key}')")
    if path_found and os.path.exists(path_found):
        ver = get_version_string(path_found)
        return (path_found, checked_paths, ver)

    # 3. Check common OS default installation locations
    os_cat = _get_os_category()
    common_list = COMMON_INSTALL_PATHS.get(os_cat, {}).get(engine_key, [])
    for p in common_list:
        checked_paths.append(p)
        if os.path.exists(p) and os.path.isfile(p):
            ver = get_version_string(p)
            return (p, checked_paths, ver)

    return (None, checked_paths, None)


def check_all_engines(
    custom_hashcat_path: Optional[str] = None, custom_john_path: Optional[str] = None
) -> Dict[str, Dict[str, Any]]:
    """Runs binary detection check across Hashcat and John the Ripper.

    Returns:
        Dict[str, Dict[str, Any]]: Status dict for each engine.
    """
    h_path, h_checked, h_ver = resolve_engine_binary("hashcat", custom_hashcat_path)
    j_path, j_checked, j_ver = resolve_engine_binary("john", custom_john_path)

    return {
        "hashcat": {
            "engine": "Hashcat",
            "status": "found" if h_path else "not_found",
            "binary_path": h_path,
            "version": h_ver,
            "checked_paths": h_checked,
        },
        "john": {
            "engine": "John the Ripper",
            "status": "found" if j_path else "not_found",
            "binary_path": j_path,
            "version": j_ver,
            "checked_paths": j_checked,
        },
    }
