"""Unit tests for Strength Scorer and Entropy Scorer (pure functions)."""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.scoring.strength_scorer import score_strength, StrengthScorer
from backend.core.scoring.entropy_scorer import score_entropy, EntropyScorer


# ---------------------------------------------------------------------------
# Strength Scorer Tests (Tiered Rules)
# ---------------------------------------------------------------------------

def test_score_strength_tiers():
    """Verify tiered label categorization based on crack time thresholds."""
    # < 10s -> Very Weak
    assert score_strength(cracked=True, crack_time_seconds=0.5) == "Very Weak"
    assert score_strength(cracked=True, crack_time_seconds=9.99) == "Very Weak"

    # < 300s -> Weak
    assert score_strength(cracked=True, crack_time_seconds=10.0) == "Weak"
    assert score_strength(cracked=True, crack_time_seconds=299.9) == "Weak"

    # >= 300s -> Medium
    assert score_strength(cracked=True, crack_time_seconds=300.0) == "Medium"
    assert score_strength(cracked=True, crack_time_seconds=3600.0) == "Medium"

    # Uncracked -> Uncracked
    assert score_strength(cracked=False, crack_time_seconds=None) == "Uncracked"
    assert score_strength(cracked=False, crack_time_seconds=100.0) == "Uncracked"


def test_score_strength_edge_cases():
    """Verify strength scorer edge cases (negative times, None times)."""
    assert score_strength(cracked=True, crack_time_seconds=None) == "Very Weak"
    assert score_strength(cracked=True, crack_time_seconds=-5.0) == "Very Weak"


def test_strength_scorer_class_wrapper():
    """Verify StrengthScorer class returns standard ScoreResult."""
    scorer = StrengthScorer()
    res = scorer.score("password", cracked=True, crack_time_seconds=5.0)

    assert res.score == 0.0  # Very Weak -> 0.0
    assert res.feedback["tier_label"] == "Very Weak"
    assert res.metadata["cracked"] is True


# ---------------------------------------------------------------------------
# Entropy Scorer Tests (zxcvbn Wrapper)
# ---------------------------------------------------------------------------

def test_score_entropy_common_weak_password():
    """Verify entropy scoring for common weak password 'password'."""
    res = score_entropy("password")
    assert res["zxcvbn_score"] == 0
    assert res["entropy_bits"] < 10.0
    assert "guesses" in res
    assert "crack_times_display" in res


def test_score_entropy_strong_complex_password():
    """Verify entropy scoring for complex password."""
    res = score_entropy("K9#mX2$vL!9pQz7w")
    assert res["zxcvbn_score"] >= 3
    assert res["entropy_bits"] > 40.0


def test_score_entropy_empty_password_edge_case():
    """Verify entropy scoring on empty string."""
    res = score_entropy("")
    assert res["zxcvbn_score"] == 0
    assert res["entropy_bits"] == 0.0


def test_score_entropy_unicode_password():
    """Verify entropy scoring on unicode & emoji input."""
    res = score_entropy("P@sswørd🔑123!")
    assert isinstance(res["zxcvbn_score"], int)
    assert res["entropy_bits"] > 0.0


def test_entropy_scorer_class_does_not_overwrite_tier_label():
    """Verify EntropyScorer wrapper returns supplementary ScoreResult without tier fields."""
    scorer = EntropyScorer()
    res = scorer.score("Tr0ub4dur&3", user_inputs=["user"])

    assert res.scorer_name == "zxcvbn Entropy Scorer"
    assert res.max_score == 4.0
    assert res.metadata["is_supplementary"] is True
    assert "tier_label" not in res.feedback
