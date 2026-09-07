"""Baseline Policy Rules Module.

Implements standard password checklist rule (Length < 8 hard fail, composition flags,
and common password substring detection).
"""

from typing import Any, List, Set
from backend.core.interfaces.policy_rule import PolicyRule, PolicyResult, PolicyViolation

# Bundled set of common passwords for baseline check
BUNDLED_COMMON_PASSWORDS: Set[str] = {
    "password", "123456", "12345678", "123456789", "12345", "1234567890",
    "qwerty", "welcome", "admin", "letmein", "monkey", "dragon", "baseball",
    "illinois", "sunshine", "trustno1", "password1", "abc123", "master"
}


class BaselineChecklistRule(PolicyRule):
    """Standard baseline checklist rule evaluating length, composition, and common words."""

    def __init__(self, common_passwords: Set[str] = None):
        self.common_passwords = common_passwords or BUNDLED_COMMON_PASSWORDS

    @property
    def rule_name(self) -> str:
        return "Baseline Checklist Rule"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        violations: List[PolicyViolation] = []
        passed_rules: List[str] = []
        is_hard_compliant = True

        # 1. Length Check (< 8 is a hard failure)
        if len(password) < 8:
            is_hard_compliant = False
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Minimum Length",
                    severity="high",
                    message=f"Password length ({len(password)}) is less than minimum 8 characters."
                )
            )
        else:
            passed_rules.append("Baseline Minimum Length")

        # 2. Composition Flags (informational flags, not hard fail)
        if not any(c.isupper() for c in password):
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Uppercase Check",
                    severity="info",
                    message="Password does not contain an uppercase letter."
                )
            )
        else:
            passed_rules.append("Baseline Uppercase Check")

        if not any(c.islower() for c in password):
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Lowercase Check",
                    severity="info",
                    message="Password does not contain a lowercase letter."
                )
            )
        else:
            passed_rules.append("Baseline Lowercase Check")

        if not any(c.isdigit() for c in password):
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Digit Check",
                    severity="info",
                    message="Password does not contain a digit."
                )
            )
        else:
            passed_rules.append("Baseline Digit Check")

        if not any(not c.isalnum() for c in password):
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Special Character Check",
                    severity="info",
                    message="Password does not contain a special character."
                )
            )
        else:
            passed_rules.append("Baseline Special Character Check")

        # 3. Common Passwords Substring Check (warning flag)
        lower_password = password.lower()
        matched_common = [word for word in self.common_passwords if word in lower_password]
        if matched_common:
            violations.append(
                PolicyViolation(
                    rule_name="Baseline Common Password Substring",
                    severity="medium",
                    message=f"Password contains common password substring: '{matched_common[0]}'."
                )
            )
        else:
            passed_rules.append("Baseline Common Password Substring")

        return PolicyResult(
            is_compliant=is_hard_compliant,
            violations=violations,
            passed_rules=passed_rules,
            metadata={"total_checks": 6, "common_matches": matched_common}
        )
