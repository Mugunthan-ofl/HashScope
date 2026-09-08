"""Configuration Manager for HashScope Backend.

Manages loading and updating `config.yaml` settings including engine binary paths.
"""

import os
import yaml
from typing import Dict, Any, Optional

CONFIG_FILE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "config.yaml")
)


def load_config() -> Dict[str, Any]:
    """Loads configuration dictionary from config.yaml."""
    if os.path.exists(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return {}
    return {}


def save_config(cfg: Dict[str, Any]) -> bool:
    """Saves updated configuration dictionary to config.yaml."""
    try:
        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            yaml.safe_dump(cfg, f, default_flow_style=False, sort_keys=False)
        return True
    except Exception:
        return False


def get_engine_binary_paths() -> Dict[str, Optional[str]]:
    """Returns currently configured binary paths for hashcat and john."""
    cfg = load_config()
    engines = cfg.get("engines", {})
    hashcat_path = engines.get("hashcat", {}).get("binary_path")
    john_path = engines.get("john", {}).get("binary_path")

    return {
        "hashcat_binary_path": hashcat_path if hashcat_path else "",
        "john_binary_path": john_path if john_path else "",
    }


def update_engine_binary_paths(
    hashcat_path: Optional[str] = None, john_path: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """Updates binary paths for hashcat and john in config.yaml."""
    cfg = load_config()
    if "engines" not in cfg:
        cfg["engines"] = {}
    if "hashcat" not in cfg["engines"]:
        cfg["engines"]["hashcat"] = {}
    if "john" not in cfg["engines"]:
        cfg["engines"]["john"] = {}

    if hashcat_path is not None:
        cfg["engines"]["hashcat"]["binary_path"] = hashcat_path.strip()
    if john_path is not None:
        cfg["engines"]["john"]["binary_path"] = john_path.strip()

    save_config(cfg)
    return get_engine_binary_paths()
