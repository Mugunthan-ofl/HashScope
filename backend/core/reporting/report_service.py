"""Report Service & Recommendation Engine Module.

Computes summary statistics (% cracked, avg/median crack time, strength distribution,
most common policy violation) and evaluates declarative threshold rules for ranked recommendations.
"""

from dataclasses import dataclass, field
import statistics
from typing import Dict, Any, List, Optional, Callable
import pandas as pd

from backend.core.hashing.hash_generator import HashRecord
from backend.core.interfaces.crack_engine import CrackResult, CrackedHash
from backend.core.interfaces.scorer import ScoreResult
from backend.core.policy.policy_report import PolicyReport


@dataclass
class Recommendation:
    """Represents a ranked security recommendation generated from audit findings."""
    priority: int  # 1 (Highest) to 5
    title: str
    reason: str
    action: str


@dataclass
class SummaryStatistics:
    """Aggregated audit statistics."""
    total_hashes: int
    cracked_count: int
    cracked_percentage: float
    cracked_under_60s_percentage: float
    avg_crack_time_seconds: float
    median_crack_time_seconds: float
    strength_distribution: Dict[str, Dict[str, Any]]
    most_common_policy_violation: Optional[str]
    violation_counts: Dict[str, int]


# Declarative Recommendation Rules
# Each rule is a tuple: (rule_id, priority, condition_func, title, reason_func, action)
RECOMMENDATION_RULES: List[tuple] = [
    (
        "fast_cracking",
        1,
        lambda stats: stats.cracked_under_60s_percentage > 30.0,
        "Enforce 12+ Character Minimum Length & Mandate MFA",
        lambda stats: f"{stats.cracked_under_60s_percentage:.1f}% of hashes were cracked in under 60 seconds.",
        "Update password policy to require a minimum of 12 characters and enforce Multi-Factor Authentication (MFA) across all user accounts."
    ),
    (
        "high_weak_percentage",
        2,
        lambda stats: stats.strength_distribution.get("Very Weak", {}).get("percentage", 0.0) > 20.0,
        "Implement Real-Time Weak Password Screening",
        lambda stats: f"{stats.strength_distribution.get('Very Weak', {}).get('percentage', 0.0):.1f}% of evaluated passwords were categorized as Very Weak.",
        "Deploy real-time zxcvbn / entropy screening during password creation or change to prevent high-risk passwords."
    ),
    (
        "known_breached_credentials",
        3,
        lambda stats: stats.violation_counts.get("HIBP K-Anonymity Breach Check", 0) > 0,
        "Force Immediate Reset for Breached Credentials",
        lambda stats: f"{stats.violation_counts.get('HIBP K-Anonymity Breach Check', 0)} user credential(s) were found in known breach databases.",
        "Issue mandatory password reset notifications for accounts with breached credentials and restrict reuse of known breached passwords."
    ),
    (
        "common_passwords",
        4,
        lambda stats: stats.violation_counts.get("Baseline Common Password Substring", 0) > 0,
        "Block Top Common Dictionary Passwords",
        lambda stats: f"{stats.violation_counts.get('Baseline Common Password Substring', 0)} password(s) matched top common dictionary entries.",
        "Integrate an automated blacklist blocking the top 100,000 common passwords."
    ),
    (
        "sequential_patterns",
        5,
        lambda stats: stats.violation_counts.get("Sequential Pattern & Keyboard Walk Rule", 0) > 0,
        "Disallow Sequential & Keyboard Walk Patterns",
        lambda stats: f"{stats.violation_counts.get('Sequential Pattern & Keyboard Walk Rule', 0)} password(s) contained sequential runs or keyboard walks.",
        "Update validation rules to reject spatial keyboard walks (qwerty, asdf) and sequential sequences (1234, abcd)."
    ),
]


class ReportService:
    """Service class compiling audit summaries and generating ranked recommendations."""

    def compute_summary_statistics(
        self,
        hash_records: List[HashRecord],
        crack_results: List[CrackResult],
        strength_scores: List[ScoreResult],
        policy_reports: List[PolicyReport],
    ) -> SummaryStatistics:
        """Computes comprehensive summary metrics from audit pipeline components."""
        total_hashes = len(hash_records)
        cracked_items: List[CrackedHash] = []
        for cr in crack_results:
            cracked_items.extend(cr.cracked_hashes)

        cracked_count = len(cracked_items)
        cracked_percentage = round((cracked_count / total_hashes * 100.0), 2) if total_hashes > 0 else 0.0

        crack_times = [item.crack_time_seconds for item in cracked_items]
        under_60s_count = sum(1 for t in crack_times if t < 60.0)
        cracked_under_60s_pct = round((under_60s_count / total_hashes * 100.0), 2) if total_hashes > 0 else 0.0

        avg_crack_time = round(statistics.mean(crack_times), 2) if crack_times else 0.0
        median_crack_time = round(statistics.median(crack_times), 2) if crack_times else 0.0

        # Strength Distribution Calculation
        strength_counts: Dict[str, int] = {"Very Weak": 0, "Weak": 0, "Medium": 0, "Uncracked": 0}
        for score_res in strength_scores:
            label = score_res.feedback.get("tier_label", "Uncracked")
            strength_counts[label] = strength_counts.get(label, 0) + 1

        strength_distribution: Dict[str, Dict[str, Any]] = {}
        for tier, count in strength_counts.items():
            pct = round((count / total_hashes * 100.0), 2) if total_hashes > 0 else 0.0
            strength_distribution[tier] = {"count": count, "percentage": pct}

        # Policy Violation Frequency Counting using pandas Series
        violation_list: List[str] = []
        for pr in policy_reports:
            for v in pr.baseline_section.violations:
                violation_list.append(v.rule_name)
            for v in pr.advanced_section.violations:
                violation_list.append(v.rule_name)
            for v in pr.breach_section.violations:
                violation_list.append(v.rule_name)

        violation_counts: Dict[str, int] = {}
        most_common_violation = None

        if violation_list:
            v_series = pd.Series(violation_list)
            v_counts_series = v_series.value_counts()
            violation_counts = v_counts_series.to_dict()
            most_common_violation = v_counts_series.index[0]

        return SummaryStatistics(
            total_hashes=total_hashes,
            cracked_count=cracked_count,
            cracked_percentage=cracked_percentage,
            cracked_under_60s_percentage=cracked_under_60s_pct,
            avg_crack_time_seconds=avg_crack_time,
            median_crack_time_seconds=median_crack_time,
            strength_distribution=strength_distribution,
            most_common_policy_violation=most_common_violation,
            violation_counts=violation_counts,
        )

    def generate_recommendations(self, stats: SummaryStatistics) -> List[Recommendation]:
        """Evaluates declarative threshold rules and returns ranked recommendations sorted by priority."""
        recommendations: List[Recommendation] = []

        # Evaluate each rule condition in declarative list (one line per condition rule)
        for _, priority, condition_fn, title, reason_fn, action in RECOMMENDATION_RULES:
            if condition_fn(stats):
                recommendations.append(
                    Recommendation(
                        priority=priority,
                        title=title,
                        reason=reason_fn(stats),
                        action=action,
                    )
                )

        # Sort recommendations by priority (1 is highest priority)
        recommendations.sort(key=lambda r: r.priority)
        return recommendations
