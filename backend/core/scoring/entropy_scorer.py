"""Entropy Scorer module.

Wraps zxcvbn password complexity and entropy estimation.
Returns estimated guesses, entropy bits, and crack time displays as a supplementary
score object without modifying or overwriting rule-based strength labels.
"""

import math
from typing import Any, List, Dict, Optional
from zxcvbn import zxcvbn
from backend.core.interfaces.scorer import Scorer, ScoreResult


def score_entropy(password: str, user_inputs: Optional[List[str]] = None) -> Dict[str, Any]:
    """Calculates supplementary entropy metrics and zxcvbn estimates for a password.

    Args:
        password (str): Plaintext password to evaluate.
        user_inputs (Optional[List[str]]): Additional contextual terms (usernames, domain names).

    Returns:
        Dict[str, Any]: Structured dictionary with guesses, log10 guesses, entropy bits,
                        zxcvbn score (0-4), crack times, and feedback.
    """
    if user_inputs is None:
        user_inputs = []

    # Edge case: empty string handling for zxcvbn
    if not password:
        return {
            "zxcvbn_score": 0,
            "guesses": 1,
            "guesses_log10": 0.0,
            "entropy_bits": 0.0,
            "crack_times_seconds": {
                "online_throttling_100_per_hour": 0,
                "online_no_throttling_10_per_second": 0,
                "offline_slow_hashing_1e4_per_second": 0,
                "offline_fast_hashing_1e10_per_second": 0,
            },
            "crack_times_display": {
                "online_throttling_100_per_hour": "instant",
                "online_no_throttling_10_per_second": "instant",
                "offline_slow_hashing_1e4_per_second": "instant",
                "offline_fast_hashing_1e10_per_second": "instant",
            },
            "feedback": {"warning": "Empty password provided", "suggestions": []},
            "calc_time_ms": 0.0
        }

    # Run zxcvbn evaluation
    res = zxcvbn(password, user_inputs=user_inputs)

    guesses = res.get("guesses", 1)
    # Entropy bits calculation: log2(guesses)
    entropy_bits = math.log2(guesses) if guesses > 0 else 0.0

    return {
        "zxcvbn_score": res.get("score", 0),
        "guesses": guesses,
        "guesses_log10": res.get("guesses_log10", 0.0),
        "entropy_bits": round(entropy_bits, 2),
        "crack_times_seconds": res.get("crack_times_seconds", {}),
        "crack_times_display": res.get("crack_times_display", {}),
        "feedback": res.get("feedback", {}),
        "calc_time_ms": res.get("calc_time", 0.0)
    }


class EntropyScorer(Scorer):
    """Entropy Scorer wrapper fulfilling Scorer interface."""

    @property
    def scorer_name(self) -> str:
        return "zxcvbn Entropy Scorer"

    def score(self, password: str, **kwargs: Any) -> ScoreResult:
        """Evaluates password using zxcvbn and returns a supplementary ScoreResult object.

        Args:
            password (str): Plaintext password string.
            **kwargs: user_inputs (List[str]).

        Returns:
            ScoreResult: Supplementary score object.
        """
        user_inputs = kwargs.get("user_inputs", None)
        metrics = score_entropy(password, user_inputs=user_inputs)

        # Get display string for offline fast hashing (e.g. 1e10/s)
        crack_display = metrics["crack_times_display"].get(
            "offline_fast_hashing_1e10_per_second", "instant"
        )

        return ScoreResult(
            scorer_name=self.scorer_name,
            score=float(metrics["zxcvbn_score"]),
            max_score=4.0,
            entropy_bits=metrics["entropy_bits"],
            crack_time_display=str(crack_display),
            feedback=metrics["feedback"],
            metadata={
                "guesses": metrics["guesses"],
                "guesses_log10": metrics["guesses_log10"],
                "crack_times_seconds": metrics["crack_times_seconds"],
                "is_supplementary": True
            }
        )
