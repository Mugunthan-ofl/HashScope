"""Core interfaces module for HashScope architecture abstractions."""

from backend.core.interfaces.crack_engine import CrackEngine, CrackResult, CrackedHash
from backend.core.interfaces.policy_rule import PolicyRule, PolicyResult, PolicyViolation
from backend.core.interfaces.scorer import Scorer, ScoreResult

__all__ = [
    "CrackEngine",
    "CrackResult",
    "CrackedHash",
    "PolicyRule",
    "PolicyResult",
    "PolicyViolation",
    "Scorer",
    "ScoreResult",
]
