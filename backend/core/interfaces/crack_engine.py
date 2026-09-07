"""Abstract Interface for Cracking Engines.

Follows Open/Closed Principle (OCP) and Liskov Substitution Principle (LSP):
New cracking engines (e.g., Hashcat, John the Ripper) can be introduced by inheriting
from `CrackEngine` without modifying existing engine orchestration code.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class CrackedHash:
    """Represents an individual hash result from a cracking engine."""
    hash_value: str
    cracked: bool
    plaintext: Optional[str] = None
    crack_time_seconds: float = 0.0
    hash_type: str = "unknown"


@dataclass
class CrackResult:
    """Unified output from any CrackEngine execution."""
    engine_name: str
    total_hashes: int
    cracked_count: int
    cracked_hashes: List[CrackedHash] = field(default_factory=list)
    execution_time_seconds: float = 0.0
    status: str = "success"  # success, timeout, error, tool_not_found
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class CrackEngine(ABC):
    """Abstract Base Class for all password hash cracking engines."""

    @property
    @abstractmethod
    def engine_name(self) -> str:
        """Return the unique human-readable identifier of the cracking engine."""
        pass

    @abstractmethod
    def run(self, hash_file: str, wordlist: str, **kwargs: Any) -> CrackResult:
        """Executes the cracking process on a given hash file using a wordlist.

        Args:
            hash_file (str): Path to file containing hashes to crack.
            wordlist (str): Path to dictionary/wordlist file.
            **kwargs: Engine-specific optional arguments (e.g. algorithm, timeout).

        Returns:
            CrackResult: Standardized result containing cracked plaintexts and execution statistics.
        """
        pass
