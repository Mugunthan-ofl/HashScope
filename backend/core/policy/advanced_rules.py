"""Advanced Policy Rules Module (NIST 800-63B Aligned Upgrade Layer).

Independent, composable policy rules covering tiered length scoring, sequential/keyboard walk
detection, repeated character sequences, and context-word substring collisions.
"""

import re
from typing import Any, List, Optional
from backend.core.interfaces.policy_rule import PolicyRule, PolicyResult, PolicyViolation

KEYBOARD_PATTERNS = [
    "qwertyuiop", "asdfghjkl", "zxcvbnm",
    "1234567890", "0987654321",
    "poiuytrewq", "lkjhgfdsa", "mnbvcxz"
]


class NistTieredLengthRule(PolicyRule):
    """NIST 800-63B Tiered Length Evaluation (<8 fail, below configured threshold warn/fail)."""

    def __init__(self, min_length: int = 12):
        self.min_length = min_length

    @property
    def rule_name(self) -> str:
        return "NIST Tiered Length Rule"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        violations: List[PolicyViolation] = []
        passed_rules: List[str] = []
        pwd_len = len(password)
        min_length = kwargs.get("min_length", self.min_length)

        if pwd_len < 8:
            is_compliant = False
            violations.append(
                PolicyViolation(
                    rule_name=self.rule_name,
                    severity="high",
                    message=f"Password length ({pwd_len} chars) fails NIST minimum (requires 8+ characters)."
                )
            )
        elif pwd_len < min_length:
            is_compliant = False
            violations.append(
                PolicyViolation(
                    rule_name=self.rule_name,
                    severity="medium",
                    message=f"Length is {pwd_len} chars, but the configured threshold requires {min_length}+ characters."
                )
            )
        else:
            is_compliant = True
            passed_rules.append(self.rule_name)

        return PolicyResult(
            is_compliant=is_compliant,
            violations=violations,
            passed_rules=passed_rules,
            metadata={"length": pwd_len, "configured_threshold": min_length, "tier": f"<{min_length}" if pwd_len < min_length else f"{min_length}+"}
        )


class SequentialPatternRule(PolicyRule):
    """Detects sequential numbers/letters and spatial keyboard walks (e.g. 1234, abcd, qwerty)."""

    @property
    def rule_name(self) -> str:
        return "Sequential Pattern & Keyboard Walk Rule"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        violations: List[PolicyViolation] = []
        lower_pwd = password.lower()
        detected_patterns: List[str] = []

        # 1. Check keyboard walks
        for pat in KEYBOARD_PATTERNS:
            for sub_len in range(4, len(pat) + 1):
                sub = pat[:sub_len]
                if sub in lower_pwd:
                    detected_patterns.append(sub)

        # 2. Check ascending/descending alphabetical or numerical runs of length >= 4
        for i in range(len(lower_pwd) - 3):
            window = lower_pwd[i:i + 4]
            # Check numerical sequence (e.g., 1234 or 4321)
            if window.isdigit():
                diffs = [int(window[j + 1]) - int(window[j]) for j in range(3)]
                if diffs == [1, 1, 1] or diffs == [-1, -1, -1]:
                    detected_patterns.append(window)
            # Check alphabetical sequence (e.g., abcd or dcba)
            elif window.isalpha():
                diffs = [ord(window[j + 1]) - ord(window[j]) for j in range(3)]
                if diffs == [1, 1, 1] or diffs == [-1, -1, -1]:
                    detected_patterns.append(window)

        # Remove duplicate matches preserving order
        unique_patterns = list(dict.fromkeys(detected_patterns))

        if unique_patterns:
            for pat in unique_patterns[:3]:
                violations.append(
                    PolicyViolation(
                        rule_name=self.rule_name,
                        severity="medium",
                        message=f"Contains sequential or keyboard-walk pattern: '{pat}'."
                    )
                )

        is_compliant = len(violations) == 0
        return PolicyResult(
            is_compliant=is_compliant,
            violations=violations,
            passed_rules=[self.rule_name] if is_compliant else [],
            metadata={"detected_patterns": unique_patterns}
        )


class RepeatedCharacterRule(PolicyRule):
    """Detects repeated character runs of 3 or more identical consecutive characters (e.g. aaaa, 1111)."""

    def __init__(self, max_allowed: int = 2):
        self.max_allowed = max_allowed

    @property
    def rule_name(self) -> str:
        return "Repeated Character Rule"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        violations: List[PolicyViolation] = []

        # Match any character repeated 3 or more times (e.g. "aaa", "1111")
        pattern = re.compile(r"(.)\1{" + str(self.max_allowed) + r",}")
        matches = [m.group(0) for m in pattern.finditer(password)]

        if matches:
            for m in matches:
                violations.append(
                    PolicyViolation(
                        rule_name=self.rule_name,
                        severity="medium",
                        message=f"Contains repeated character run: '{m}'."
                    )
                )

        is_compliant = len(violations) == 0
        return PolicyResult(
            is_compliant=is_compliant,
            violations=violations,
            passed_rules=[self.rule_name] if is_compliant else [],
            metadata={"repeated_sequences": matches}
        )


class ContextWordRule(PolicyRule):
    """Flags if password contains context words (username, company, app name) as substrings."""

    def __init__(self, context_words: Optional[List[str]] = None):
        self.context_words = context_words or []

    @property
    def rule_name(self) -> str:
        return "Context Word Substring Rule"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        violations: List[PolicyViolation] = []
        words = kwargs.get("context_words", self.context_words) or []
        lower_pwd = password.lower()
        matched_words: List[str] = []

        for word in words:
            word_clean = word.strip().lower()
            if len(word_clean) >= 3 and word_clean in lower_pwd:
                matched_words.append(word)
                violations.append(
                    PolicyViolation(
                        rule_name=self.rule_name,
                        severity="high",
                        message=f"Contains contextual term substring: '{word}'."
                    )
                )

        is_compliant = len(violations) == 0
        return PolicyResult(
            is_compliant=is_compliant,
            violations=violations,
            passed_rules=[self.rule_name] if is_compliant else [],
            metadata={"matched_context_words": matched_words}
        )
