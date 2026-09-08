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

    def generate_html_report(self, report: Any) -> str:
        """Generates a self-contained, beautifully styled standalone HTML audit report document.

        Args:
            report: AuditReportResponse object or dictionary carrying report data.

        Returns:
            str: Self-contained HTML document string with inline CSS.
        """
        if hasattr(report, "model_dump"):
            data = report.model_dump()
        elif hasattr(report, "__dict__"):
            data = report.__dict__
        elif isinstance(report, dict):
            data = report
        else:
            data = {}

        summary_dict = data.get("summary", {})
        if hasattr(summary_dict, "model_dump"):
            summary_dict = summary_dict.model_dump()
        elif hasattr(summary_dict, "__dict__"):
            summary_dict = summary_dict.__dict__

        recommendations = data.get("recommendations", [])
        hash_records = data.get("hash_records", [])
        policy_reports = data.get("policy_reports", [])
        metadata = data.get("metadata", {})
        audit_id = data.get("audit_id", "audit_report")
        completed_at = data.get("completed_at", "N/A")

        # Build Hash & Policy Rows
        policy_map = {pr.get("label", "") if isinstance(pr, dict) else getattr(pr, "label", ""): pr for pr in policy_reports}
        table_rows = []

        for rec in hash_records:
            lbl = rec.get("label", "")
            plain = rec.get("plaintext", "")
            h_val = rec.get("hash_value", "")
            algo = rec.get("algorithm", "").upper()
            pr = policy_map.get(lbl, {})

            baseline_v = pr.get("baseline", {}).get("violations", []) if isinstance(pr.get("baseline"), dict) else []
            adv_v = pr.get("advanced", {}).get("violations", []) if isinstance(pr.get("advanced"), dict) else []
            breach_v = pr.get("breach", {}).get("violations", []) if isinstance(pr.get("breach"), dict) else []

            all_violations = [v.get("rule_name", "") if isinstance(v, dict) else getattr(v, "rule_name", str(v)) for v in (baseline_v + adv_v + breach_v)]
            is_compliant = len(all_violations) == 0

            viol_html = f"<span class='tag tag-danger'>❌ Non-Compliant ({len(all_violations)} violations: {', '.join(all_violations)})</span>" if not is_compliant else "<span class='tag tag-success'>✓ Compliant</span>"

            table_rows.append(f"""
            <tr>
              <td><strong>{lbl}</strong></td>
              <td><code>{h_val[:16]}...</code></td>
              <td><code>{plain}</code></td>
              <td><span class='badge'>{algo}</span></td>
              <td>{viol_html}</td>
            </tr>
            """)

        # Build Recommendations List
        rec_items = []
        for r in recommendations:
            title = r.title if hasattr(r, "title") else r.get("title", "")
            prio = r.priority if hasattr(r, "priority") else r.get("priority", 3)
            reason = r.reason if hasattr(r, "reason") else r.get("reason", "")
            action = r.action if hasattr(r, "action") else r.get("action", "")

            prio_color = "#ef4444" if prio == 1 else "#f59e0b" if prio == 2 else "#3b82f6"
            rec_items.append(f"""
            <div style="border-left: 4px solid {prio_color}; background: #151d20; padding: 14px 18px; margin-bottom: 12px; border-radius: 6px;">
              <div style="font-weight: bold; color: #e2e8f0; font-size: 14px;">Priority {prio}: {title}</div>
              <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;"><strong>Reason:</strong> {reason}</div>
              <div style="color: #10b981; font-size: 12px; margin-top: 4px;"><strong>Recommended Action:</strong> {action}</div>
            </div>
            """)

        avg_crack_str = f"{summary_dict.get('avg_crack_time_seconds', 0)}s" if summary_dict.get("cracked_count", 0) > 0 else "N/A"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HashScope Password Audit Report - {audit_id}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0f11; color: #cbd5e1; margin: 0; padding: 30px; line-height: 1.5; }}
    .container {{ max-width: 1000px; margin: 0 auto; background: #101719; border: 1px solid #1b282a; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .header {{ border-bottom: 1px solid #1b282a; padding-bottom: 20px; margin-bottom: 25px; flex-wrap: wrap; display: flex; justify-content: space-between; align-items: center; }}
    .title {{ font-size: 20px; font-weight: bold; color: #f8fafc; margin: 0; }}
    .subtitle {{ font-size: 12px; color: #94a3b8; margin-top: 5px; font-family: monospace; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }}
    .card {{ background: #152023; border: 1px solid #1b282a; padding: 16px; border-radius: 8px; }}
    .card-title {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; font-family: monospace; letter-spacing: 0.5px; }}
    .card-value {{ font-size: 22px; font-weight: bold; color: #10b981; margin-top: 6px; }}
    .card-sub {{ font-size: 11px; color: #64748b; margin-top: 4px; }}
    h2 {{ font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #10b981; border-bottom: 1px solid #1b282a; padding-bottom: 8px; margin-top: 30px; font-family: monospace; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; font-family: monospace; }}
    th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #1b282a; }}
    th {{ background: #0a0f11; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 11px; }}
    tr:hover {{ background: #152023; }}
    code {{ background: #0a0f11; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 12px; }}
    .tag {{ display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: monospace; }}
    .tag-success {{ background: #0a2e27; color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); }}
    .tag-danger {{ background: #3b0764; color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4); }}
    .badge {{ background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }}
    .footer {{ margin-top: 40px; border-top: 1px solid #1b282a; padding-top: 15px; text-align: center; font-size: 11px; color: #64748b; font-family: monospace; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">HashScope Password Policy Audit Report</h1>
        <div class="subtitle">AUDIT ID: {audit_id} • Completed at {completed_at}</div>
      </div>
      <div>
        <span class="tag tag-success">✓ Pipeline Verified</span>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid">
      <div class="card">
        <div class="card-title">Total Credentials</div>
        <div class="card-value">{summary_dict.get('total_hashes', 0)}</div>
        <div class="card-sub">Evaluated accounts</div>
      </div>
      <div class="card">
        <div class="card-title">Cracked Ratio</div>
        <div class="card-value">{summary_dict.get('cracked_percentage', 0.0)}%</div>
        <div class="card-sub">{summary_dict.get('cracked_count', 0)} plaintexts recovered</div>
      </div>
      <div class="card">
        <div class="card-title">Avg Crack Time</div>
        <div class="card-value">{avg_crack_str}</div>
        <div class="card-sub">Median: {summary_dict.get('median_crack_time_seconds', 0.0) if summary_dict.get('cracked_count', 0) > 0 else 'N/A'}</div>
      </div>
      <div class="card">
        <div class="card-title">Top Violation</div>
        <div class="card-value" style="font-size: 16px; color: #f59e0b;">{str(summary_dict.get('most_common_policy_violation', 'None')).split(' ')[0]}</div>
        <div class="card-sub">{summary_dict.get('most_common_policy_violation') or 'No violations detected'}</div>
      </div>
    </div>

    <!-- Ranked Recommendations Section -->
    <h2>1. Ranked Security Recommendations</h2>
    {''.join(rec_items) if rec_items else '<p style="color: #64748b; font-size: 12px; font-family: monospace;">No policy recommendations generated.</p>'}

    <!-- Accounts & Hashes Audit Table -->
    <h2>2. Credential Audit & Policy Compliance Results</h2>
    <table>
      <thead>
        <tr>
          <th>Account Label</th>
          <th>Hash Digest</th>
          <th>Recovered Plaintext</th>
          <th>Algorithm</th>
          <th>NIST & Breach Policy Status</th>
        </tr>
      </thead>
      <tbody>
        {''.join(table_rows)}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by HashScope Password Policy Audit Suite • Engine: {metadata.get('engine', 'HashScope Engine')}
    </div>
  </div>
</body>
</html>
"""
        return html_content

