"""Test suite for verifying SOLID abstract base class interface enforcement."""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.interfaces.crack_engine import CrackEngine, CrackResult
from backend.core.interfaces.policy_rule import PolicyRule, PolicyResult
from backend.core.interfaces.scorer import Scorer, ScoreResult
from backend.core.cracking.hashcat_engine import HashcatEngine
from backend.core.cracking.john_engine import JohnEngine
from backend.core.scoring.strength_scorer import StrengthScorer
from backend.core.scoring.entropy_scorer import EntropyScorer


def test_cannot_instantiate_abstract_crack_engine():
    """Verify that direct instantiation of CrackEngine ABC raises TypeError."""
    with pytest.raises(TypeError):
        CrackEngine()  # type: ignore


def test_cannot_instantiate_abstract_policy_rule():
    """Verify that direct instantiation of PolicyRule ABC raises TypeError."""
    with pytest.raises(TypeError):
        PolicyRule()  # type: ignore


def test_cannot_instantiate_abstract_scorer():
    """Verify that direct instantiation of Scorer ABC raises TypeError."""
    with pytest.raises(TypeError):
        Scorer()  # type: ignore


def test_hashcat_engine_implements_crack_engine():
    """Verify HashcatEngine fulfills CrackEngine contract (LSP & OCP)."""
    engine = HashcatEngine()
    assert isinstance(engine, CrackEngine)
    assert engine.engine_name == "Hashcat Engine"
    result = engine.run("dummy.hash", "dummy.txt")
    assert isinstance(result, CrackResult)


def test_john_engine_implements_crack_engine():
    """Verify JohnEngine fulfills CrackEngine contract (LSP & OCP)."""
    engine = JohnEngine()
    assert isinstance(engine, CrackEngine)
    assert engine.engine_name == "John the Ripper Engine"
    result = engine.run("dummy.hash", "dummy.txt")
    assert isinstance(result, CrackResult)


def test_scorers_implement_scorer_interface():
    """Verify StrengthScorer and EntropyScorer fulfill Scorer contract."""
    zxcvbn_scorer = StrengthScorer()
    entropy_scorer = EntropyScorer()
    assert isinstance(zxcvbn_scorer, Scorer)
    assert isinstance(entropy_scorer, Scorer)
    assert isinstance(zxcvbn_scorer.score("password123"), ScoreResult)
    assert isinstance(entropy_scorer.score("password123"), ScoreResult)
