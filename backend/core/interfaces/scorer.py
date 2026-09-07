"""Abstract Interface for Password Strength Scorers.

Follows Interface Segregation Principle (ISP):
Scoring interfaces measure password complexity/entropy independently from policy enforcement rules.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional


@dataclass
class ScoreResult:
    """Standardized password strength scoring result."""
    scorer_name: str
    score: float  # e.g., 0-4 for zxcvbn or raw entropy bits
    max_score: float
    entropy_bits: float
    crack_time_display: Optional[str] = None
    feedback: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


class Scorer(ABC):
    """Abstract Base Class for password strength and entropy scoring implementations."""

    @property
    @abstractmethod
    def scorer_name(self) -> str:
        """Return unique identifier for the scoring implementation."""
        pass

    @abstractmethod
    def score(self, password: str, **kwargs: Any) -> ScoreResult:
        """Calculates strength score and entropy for a password.

        Args:
            password (str): Plaintext password to evaluate.
            **kwargs: Additional scoring options (e.g. user dictionary inputs).

        Returns:
            ScoreResult: Numerical score, calculated entropy, and feedback.
        """
        pass
