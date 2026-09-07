"""Unit tests for Password Policy Rules & PolicyReport Aggregator.

Tests every policy rule in isolation, including HIBP k-anonymity API with mocked network calls and offline fallback.
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.core.policy.baseline_rules import BaselineChecklistRule
from backend.core.policy.advanced_rules import (
    NistTieredLengthRule,
    SequentialPatternRule,
    RepeatedCharacterRule,
    ContextWordRule,
)
from backend.core.policy.breach_check import BreachCheckRule
from backend.core.policy.policy_report import PolicyEvaluator, PolicyReport


# ---------------------------------------------------------------------------
# 1. Baseline Checklist Rule Tests
# ---------------------------------------------------------------------------

def test_baseline_rule_short_password_fails():
    """Verify password shorter than 8 characters fails baseline compliance."""
    rule = BaselineChecklistRule()
    res = rule.evaluate("short")

    assert res.is_compliant is False
    assert any(v.rule_name == "Baseline Minimum Length" and v.severity == "high" for v in res.violations)


def test_baseline_rule_composition_flags_and_common_substring():
    """Verify composition flags (info) and common password warning (medium)."""
    rule = BaselineChecklistRule()
    res = rule.evaluate("password")  # len 8, all lower, common password

    # Length >= 8 so hard compliance is True
    assert res.is_compliant is True

    # Informational flags for missing upper, digit, symbol
    violation_names = [v.rule_name for v in res.violations]
    assert "Baseline Uppercase Check" in violation_names
    assert "Baseline Digit Check" in violation_names
    assert "Baseline Special Character Check" in violation_names

    # Common password warning
    assert "Baseline Common Password Substring" in violation_names


# ---------------------------------------------------------------------------
# 2. NIST Tiered Length Rule Tests
# ---------------------------------------------------------------------------

def test_nist_tiered_length_rule():
    """Verify NIST length tiers (<8 fail, below threshold fail/warn, threshold+ pass)."""
    rule = NistTieredLengthRule(min_length=12)

    # Tier < 8 -> Fail
    res_short = rule.evaluate("1234567")
    assert res_short.is_compliant is False
    assert res_short.metadata["tier"] == "<12"

    # Below threshold -> Non-compliant with dynamic threshold message
    res_medium = rule.evaluate("Pass1234")
    assert res_medium.is_compliant is False
    assert len(res_medium.violations) == 1
    assert "configured threshold requires 12+ characters" in res_medium.violations[0].message

    # Tier 12+ -> Compliant, no violations
    res_long = rule.evaluate("SuperSecretPass2026!")
    assert res_long.is_compliant is True
    assert len(res_long.violations) == 0
    assert res_long.metadata["tier"] == "12+"


def test_nist_tiered_length_rule_dynamic_threshold():
    """Verify length rule message dynamically reflects user-configured thresholds (15, 20)."""
    rule = NistTieredLengthRule()
    pwd_13_chars = "SamplePass123"  # 13 characters

    # Audit with threshold = 15
    res_15 = rule.evaluate(pwd_13_chars, min_length=15)
    assert res_15.is_compliant is False
    assert len(res_15.violations) == 1
    assert "configured threshold requires 15+ characters" in res_15.violations[0].message
    assert "Length is 13 chars" in res_15.violations[0].message

    # Audit with threshold = 20
    res_20 = rule.evaluate(pwd_13_chars, min_length=20)
    assert res_20.is_compliant is False
    assert len(res_20.violations) == 1
    assert "configured threshold requires 20+ characters" in res_20.violations[0].message
    assert "Length is 13 chars" in res_20.violations[0].message

    # Audit with threshold = 12 (13 >= 12 -> pass)
    res_12 = rule.evaluate(pwd_13_chars, min_length=12)
    assert res_12.is_compliant is True
    assert len(res_12.violations) == 0


# ---------------------------------------------------------------------------
# 3. Sequential Pattern & Keyboard Walk Rule Tests
# ---------------------------------------------------------------------------

def test_sequential_pattern_rule():
    """Verify keyboard walk and sequential run detection."""
    rule = SequentialPatternRule()

    # Contains 'qwerty' and '1234'
    res_pattern = rule.evaluate("qwerty1234!P@ss")
    assert res_pattern.is_compliant is False
    assert len(res_pattern.violations) >= 1
    detected = res_pattern.metadata["detected_patterns"]
    assert "qwerty" in detected or "1234" in detected

    # Random password without sequential patterns
    res_clean = rule.evaluate("x9$mQ2!pL9#v")
    assert res_clean.is_compliant is True
    assert len(res_clean.violations) == 0


# ---------------------------------------------------------------------------
# 4. Repeated Character Rule Tests
# ---------------------------------------------------------------------------

def test_repeated_character_rule():
    """Verify detection of repeated character runs (aaaa, 1111)."""
    rule = RepeatedCharacterRule()

    res_repeated = rule.evaluate("P@ssaaaa1111word")
    assert res_repeated.is_compliant is False
    assert len(res_repeated.violations) >= 1
    assert "aaaa" in res_repeated.metadata["repeated_sequences"]

    res_clean = rule.evaluate("AbCdEfGh1234!")
    assert res_clean.is_compliant is True


# ---------------------------------------------------------------------------
# 5. Context Word Substring Rule Tests
# ---------------------------------------------------------------------------

def test_context_word_rule():
    """Verify contextual word substring detection."""
    rule = ContextWordRule()
    context = ["AcmeCorp", "john_doe"]

    # Match case-insensitive
    res_match = rule.evaluate("SecretAcmeCorp2026!", context_words=context)
    assert res_match.is_compliant is False
    assert "AcmeCorp" in res_match.metadata["matched_context_words"]

    # Clean password
    res_clean = rule.evaluate("UnrelatedSecret9876!", context_words=context)
    assert res_clean.is_compliant is True


# ---------------------------------------------------------------------------
# 6. HIBP Breach Check Rule Tests (Mocked API & Offline Fallback)
# ---------------------------------------------------------------------------

@patch("backend.core.policy.breach_check.requests.get")
def test_breach_check_mocked_api_hit(mock_get):
    """Verify HIBP k-anonymity check when API returns a matching hash suffix."""
    # SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    # Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = (
        "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
        "1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\n"
        "00D0FB92152E07373809623D70B9206A8FA:2\r\n"
    )
    mock_get.return_value = mock_response

    rule = BreachCheckRule()
    res = rule.evaluate("password", use_network=True)

    assert res.is_compliant is False
    assert res.metadata["breach_count"] == 9659365
    assert res.metadata["source"] == "api"
    assert res.violations[0].severity == "critical"
    # Verify ONLY 5-character prefix was sent over the network
    mock_get.assert_called_once_with("https://api.pwnedpasswords.com/range/5BAA6", timeout=3.0)


@patch("backend.core.policy.breach_check.requests.get")
def test_breach_check_mocked_api_clean(mock_get):
    """Verify HIBP k-anonymity check when API returns no matching hash suffix."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
    mock_get.return_value = mock_response

    rule = BreachCheckRule()
    res = rule.evaluate("UniqueSecretPassword98765!", use_network=True)

    assert res.is_compliant is True
    assert res.metadata["breach_count"] == 0


@patch("backend.core.policy.breach_check.requests.get")
def test_breach_check_offline_fallback_on_network_error(mock_get):
    """Verify automatic fallback to local database when network request fails."""
    mock_get.side_effect = requests.RequestException("Connection timeout")

    rule = BreachCheckRule()
    # "123456" is in local fallback database
    res = rule.evaluate("123456", use_network=True)

    assert res.is_compliant is False
    assert res.metadata["source"] == "local_fallback"
    assert res.metadata["fallback_used"] is True
    assert res.metadata["breach_count"] > 0


# ---------------------------------------------------------------------------
# 7. PolicyReport Aggregator Tests
# ---------------------------------------------------------------------------

def test_policy_report_distinct_sections():
    """Verify PolicyEvaluator produces a single PolicyReport with separate labeled sections."""
    evaluator = PolicyEvaluator()
    report = evaluator.evaluate(
        password="password",
        context_words=["password"],
        password_label="user_pass_01",
        use_network=False  # Use local fallback for test speed
    )

    assert isinstance(report, PolicyReport)
    assert report.password_label == "user_pass_01"

    # Separate labeled sections exist
    assert hasattr(report, "baseline_section")
    assert hasattr(report, "advanced_section")
    assert hasattr(report, "breach_section")

    # Baseline section has violations (composition checks: missing uppercase, digit, symbol)
    assert report.baseline_section.is_compliant is False
    assert len(report.baseline_section.violations) > 0

    # Advanced section caught context word violation
    assert report.advanced_section.is_compliant is False
    assert len(report.advanced_section.violations) > 0

    # Breach section checked fallback database ("password" is in fallback DB)
    assert report.breach_section.is_compliant is False
    assert len(report.breach_section.violations) > 0

    # Overall compliance is False due to section failures
    assert report.overall_compliant is False


def test_category_status_derived_from_violations():
    """Verify category-level is_compliant status is derived strictly from whether violations exist."""
    evaluator = PolicyEvaluator()

    # 1. Non-compliant password with violations in all categories
    report_dirty = evaluator.evaluate(
        password="password",
        context_words=["password"],
        password_label="user_dirty",
        use_network=False
    )

    # Single source of truth assertions: is_compliant MUST equal (len(violations) == 0)
    assert report_dirty.baseline_section.is_compliant == (len(report_dirty.baseline_section.violations) == 0)
    assert report_dirty.advanced_section.is_compliant == (len(report_dirty.advanced_section.violations) == 0)
    assert report_dirty.breach_section.is_compliant == (len(report_dirty.breach_section.violations) == 0)

    assert report_dirty.baseline_section.is_compliant is False
    assert report_dirty.advanced_section.is_compliant is False
    assert report_dirty.breach_section.is_compliant is False
    assert report_dirty.overall_compliant is False

    # 2. Fully compliant strong password
    report_clean = evaluator.evaluate(
        password="X9$mQ2!pL9#v8Z_K",
        context_words=["unrelated"],
        password_label="user_clean",
        use_network=False,
        min_password_length=15
    )

    assert report_clean.baseline_section.is_compliant is True
    assert len(report_clean.baseline_section.violations) == 0

    assert report_clean.advanced_section.is_compliant is True
    assert len(report_clean.advanced_section.violations) == 0

    assert report_clean.breach_section.is_compliant is True
    assert len(report_clean.breach_section.violations) == 0

    assert report_clean.overall_compliant is True
