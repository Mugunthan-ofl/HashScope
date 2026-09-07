"""Policy Report Module.

Aggregates baseline checklist, NIST advanced upgrade rules, and HIBP breach check outputs
into a single `PolicyReport` object containing distinct labeled sections.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from backend.core.interfaces.policy_rule import PolicyResult, PolicyViolation
from backend.core.policy.baseline_rules import BaselineChecklistRule
from backend.core.policy.advanced_rules import (
    NistTieredLengthRule,
    SequentialPatternRule,
    RepeatedCharacterRule,
    ContextWordRule,
)
from backend.core.policy.breach_check import BreachCheckRule


@dataclass
class PolicyReport:
    """Consolidated policy audit report containing distinct baseline, advanced, and breach sections."""
    password_label: str
    baseline_section: PolicyResult
    advanced_section: PolicyResult
    breach_section: PolicyResult
    overall_compliant: bool
    metadata: Dict[str, Any] = field(default_factory=dict)


class PolicyEvaluator:
    """Orchestrator class evaluating passwords against baseline and advanced policy layers."""

    def __init__(
        self,
        baseline_rule: Optional[BaselineChecklistRule] = None,
        nist_rule: Optional[NistTieredLengthRule] = None,
        seq_rule: Optional[SequentialPatternRule] = None,
        repeat_rule: Optional[RepeatedCharacterRule] = None,
        context_rule: Optional[ContextWordRule] = None,
        breach_rule: Optional[BreachCheckRule] = None,
    ):
        self.baseline_rule = baseline_rule or BaselineChecklistRule()
        self.nist_rule = nist_rule or NistTieredLengthRule()
        self.seq_rule = seq_rule or SequentialPatternRule()
        self.repeat_rule = repeat_rule or RepeatedCharacterRule()
        self.context_rule = context_rule or ContextWordRule()
        self.breach_rule = breach_rule or BreachCheckRule()

    def evaluate(
        self,
        password: str,
        context_words: Optional[List[str]] = None,
        password_label: str = "target_password",
        use_network: bool = True,
        min_password_length: int = 12,
    ) -> PolicyReport:
        """Evaluates a password and builds a multi-section PolicyReport.

        Args:
            password (str): Plaintext password to evaluate.
            context_words (Optional[List[str]]): Domain or user context words.
            password_label (str): Synthetic or descriptive label.
            use_network (bool): Whether to attempt HIBP network API lookup.
            min_password_length (int): Minimum length threshold configured by user.

        Returns:
            PolicyReport: Structured report with distinct baseline, advanced, and breach sections.
        """
        # 1. Baseline Section Evaluation
        raw_baseline_res = self.baseline_rule.evaluate(password)
        baseline_compliant = len(raw_baseline_res.violations) == 0
        baseline_section = PolicyResult(
            is_compliant=baseline_compliant,
            violations=raw_baseline_res.violations,
            passed_rules=raw_baseline_res.passed_rules,
            metadata=raw_baseline_res.metadata,
        )

        # 2. Advanced Section Evaluation (NIST length + sequential + repeated + context words)
        adv_violations: List[PolicyViolation] = []
        adv_passed: List[str] = []

        nist_res = self.nist_rule.evaluate(password, min_length=min_password_length)
        adv_violations.extend(nist_res.violations)
        adv_passed.extend(nist_res.passed_rules)

        seq_res = self.seq_rule.evaluate(password)
        adv_violations.extend(seq_res.violations)
        adv_passed.extend(seq_res.passed_rules)

        repeat_res = self.repeat_rule.evaluate(password)
        adv_violations.extend(repeat_res.violations)
        adv_passed.extend(repeat_res.passed_rules)

        context_res = self.context_rule.evaluate(password, context_words=context_words)
        adv_violations.extend(context_res.violations)
        adv_passed.extend(context_res.passed_rules)

        advanced_compliant = len(adv_violations) == 0

        advanced_section = PolicyResult(
            is_compliant=advanced_compliant,
            violations=adv_violations,
            passed_rules=adv_passed,
            metadata={"total_advanced_checks": 4, "configured_threshold": min_password_length}
        )

        # 3. Breach Section Evaluation
        raw_breach_res = self.breach_rule.evaluate(password, use_network=use_network)
        breach_compliant = len(raw_breach_res.violations) == 0
        breach_section = PolicyResult(
            is_compliant=breach_compliant,
            violations=raw_breach_res.violations,
            passed_rules=raw_breach_res.passed_rules,
            metadata=raw_breach_res.metadata,
        )

        # Overall compliance requires ZERO violations across all 3 policy sections
        overall_compliant = baseline_compliant and advanced_compliant and breach_compliant

        return PolicyReport(
            password_label=password_label,
            baseline_section=baseline_section,
            advanced_section=advanced_section,
            breach_section=breach_section,
            overall_compliant=overall_compliant,
            metadata={"length": len(password), "configured_threshold": min_password_length}
        )
