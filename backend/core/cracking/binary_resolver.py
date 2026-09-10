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
            r"C:\tools\hashcat-7.1.2\hashcat.exe",
            r"C:\tools\hashcat\hashcat.exe",
            r"C:\hashcat\hashcat.exe",
            r"C:\hashcat-6.2.6\hashcat.exe",
            r"C:\Program Files\hashcat\hashcat.exe",
            r"C:\Program Files (x86)\hashcat\hashcat.exe",
            r"C:\ProgramData\chocolatey\bin\hashcat.exe",
            os.path.expanduser(r"~\scoop\shims\hashcat.exe"),
            os.path.expanduser(r"~\AppData\Local\Programs\hashcat\hashcat.exe"),
        ],
        "john": [
            r"C:\tools\john\run\john.exe",
            r"C:\tools\john-1.9.0-jumbo-1-win64\run\john.exe",
            r"C:\john\run\john.exe",
            r"C:\john\john.exe",
            r"C:\john-jumbo\run\john.exe",
            r"C:\john-jumbo\john.exe",
            r"C:\john190j1w\run\john.exe",
            r"C:\Program Files\john\run\john.exe",
            r"C:\Program Files\john\john.exe",
            r"C:\Program Files (x86)\john\run\john.exe",
            r"C:\Program Files (x86)\john\john.exe",
            r"C:\ProgramData\chocolatey\bin\john.exe",
            r"C:\ProgramData\chocolatey\bin\john-the-ripper.exe",
            r"C:\ProgramData\chocolatey\lib\john-the-ripper\tools\john-1.9.0-jumbo-1-win64\run\john.exe",
            os.path.expanduser(r"~\scoop\shims\john.exe"),
            os.path.expanduser(r"~\scoop\apps\john\current\run\john.exe"),
            os.path.expanduser(r"~\AppData\Local\Programs\john\john.exe"),
            os.path.expanduser(r"~\Downloads\john-1.9.0-jumbo-1-win64\run\john.exe"),
            os.path.expanduser(r"~\Desktop\john-1.9.0-jumbo-1-win64\run\john.exe"),
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
            "/usr/sbin/john",
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

    # Set working directory to binary parent directory if possible
    bin_cwd = os.path.dirname(binary_path) if os.path.isabs(binary_path) and os.path.isfile(binary_path) else None

    flags = ["--version", "-v", "--help"]
    for flag in flags:
        try:
            res = subprocess.run(
                [binary_path, flag],
                capture_output=True,
                text=True,
                timeout=3,
                shell=False,
                cwd=bin_cwd
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
    """Resolves executable path for cracking engine in 3-tier order:
    (a) Custom path configured in Settings / config.yaml
    (b) System PATH via shutil.which() (checking both name and name.exe)
    (c) Common default OS installation directories for Windows, Linux, and macOS.

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

    # 2. Check system PATH via shutil.which() - checking both 'john' and 'john.exe' (or hashcat / hashcat.exe)
    checked_paths.append(f"System PATH ('{engine_key}')")
    names_to_check = [f"{engine_key}.exe", engine_key] if sys.platform == "win32" else [engine_key, f"{engine_key}.exe"]
    for name in names_to_check:
        path_found = shutil.which(name)
        if path_found and os.path.exists(path_found) and os.path.isfile(path_found):
            # On Windows, ignore batch wrappers (.bat / .cmd) so native .exe binaries are preferred
            if sys.platform == "win32" and path_found.lower().endswith((".bat", ".cmd")):
                continue
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
