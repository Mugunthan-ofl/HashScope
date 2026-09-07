"""Strength Scorer module.

Categorizes cracked password strength into rule-based tiers based on time to crack:
- < 10 seconds: Very Weak
- < 300 seconds: Weak
- >= 300 seconds: Medium
- Uncracked: Uncracked (deferred to entropy scorer)
"""

from typing import Any, Optional
from backend.core.interfaces.scorer import Scorer, ScoreResult


def score_strength(cracked: bool, crack_time_seconds: Optional[float] = None) -> str:
    """Categorizes password strength based on cracking result and time taken.

    Args:
        cracked (bool): Whether the password hash was successfully cracked.
        crack_time_seconds (Optional[float]): Time in seconds required to crack.

    Returns:
        str: Tiered label ("Very Weak", "Weak", "Medium", or "Uncracked").
    """
    if not cracked:
        return "Uncracked"

    if crack_time_seconds is None or crack_time_seconds < 0:
        return "Very Weak"

    if crack_time_seconds < 10.0:
        return "Very Weak"
    elif crack_time_seconds < 300.0:
        return "Weak"
    else:
        return "Medium"


class StrengthScorer(Scorer):
    """Strength Scorer wrapper fulfilling Scorer interface."""

    @property
    def scorer_name(self) -> str:
        return "Tiered Strength Scorer"

    def score(self, password: str, **kwargs: Any) -> ScoreResult:
        """Calculates strength score for a given password or cracking result.

        Args:
            password (str): Plaintext password.
            **kwargs:
                cracked (bool): Optional crack flag.
                crack_time_seconds (float): Optional time taken to crack.

        Returns:
            ScoreResult: Score object containing tier label and metadata.
        """
        cracked = kwargs.get("cracked", False)
        crack_time = kwargs.get("crack_time_seconds", None)

        tier_label = score_strength(cracked=cracked, crack_time_seconds=crack_time)

        # Mapping tier labels to 0-4 numeric scores for standard Scorer compatibility
        numeric_scores = {
            "Very Weak": 0.0,
            "Weak": 1.0,
            "Medium": 2.5,
            "Uncracked": 4.0
        }

        return ScoreResult(
            scorer_name=self.scorer_name,
            score=numeric_scores.get(tier_label, 0.0),
            max_score=4.0,
            entropy_bits=0.0,
            crack_time_display=f"{crack_time:.2f}s" if crack_time is not None else "N/A",
            feedback={"tier_label": tier_label},
            metadata={"cracked": cracked, "crack_time_seconds": crack_time}
        )
