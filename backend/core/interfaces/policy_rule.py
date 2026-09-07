"""Abstract Interface for Password Policy Rules.

Follows Interface Segregation Principle (ISP) and Single Responsibility Principle (SRP):
Policy rules perform individual policy compliance checks independently from password scoring engines.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class PolicyViolation:
    """Represents a specific policy rule failure."""
    rule_name: str
    severity: str  # low, medium, high, critical
    message: str


@dataclass
class PolicyResult:
    """Outcome of evaluating password compliance against one or more rules."""
    is_compliant: bool
    violations: List[PolicyViolation] = field(default_factory=list)
    passed_rules: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class PolicyRule(ABC):
    """Abstract Base Class for password policy rules."""

    @property
    @abstractmethod
    def rule_name(self) -> str:
        """Return unique identifier for the policy rule."""
        pass

    @abstractmethod
    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        """Evaluates a plaintext password against the policy rule.

        Args:
            password (str): Plaintext password string to audit.
            **kwargs: Additional evaluation context (e.g. user context, breach DBs).

        Returns:
            PolicyResult: Pass/fail status and violation details.
        """
        pass
