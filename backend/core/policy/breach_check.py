"""HIBP K-Anonymity Breach Check Policy Rule Module.

Performs password breach verification against HaveIBeenPwned API using k-Anonymity:
- SHA-1 hashes password locally.
- Transmits ONLY the 5-character SHA-1 prefix over HTTPS to https://api.pwnedpasswords.com/range/{prefix}.
- Compares the remaining 35-character suffix locally.
- Never transmits or logs full password or full SHA-1 hash.
- Features an offline fallback database of common breached hashes when network API calls fail or time out.
"""

import hashlib
import requests
from typing import Any, Dict, Optional
from backend.core.interfaces.policy_rule import PolicyRule, PolicyResult, PolicyViolation

# Bundled local fallback set of common breached SHA-1 hashes (uppercase) for offline operation
LOCAL_BREACH_FALLBACK_HASHES: Dict[str, int] = {
    # SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8": 9659365,
    # SHA-1("123456") = 7C4A8D09CA3762AF61E59520943DC26494F8941B
    "7C4A8D09CA3762AF61E59520943DC26494F8941B": 24233796,
    # SHA-1("admin") = 90B9AA7E25F80CF4F64E990B78A9FC5EBD6CECAD
    "90B9AA7E25F80CF4F64E990B78A9FC5EBD6CECAD": 352410,
    # SHA-1("qwerty") = B1B3773A05C0ED0176787A4F1574FF0075F7521E
    "B1B3773A05C0ED0176787A4F1574FF0075F7521E": 3959124,
    # SHA-1("12345678") = 7C222FB2927D828AF22F592134E8932480637C0D
    "7C222FB2927D828AF22F592134E8932480637C0D": 3201509,
    # SHA-1("welcome") = BD307A3EC329E10A2CFF8FB87480823DA114F8F4
    "BD307A3EC329E10A2CFF8FB87480823DA114F8F4": 128912,
}


class BreachCheckRule(PolicyRule):
    """HIBP k-anonymity breach check with automatic offline fallback."""

    def __init__(self, api_url: str = "https://api.pwnedpasswords.com/range/",
                 timeout_seconds: float = 3.0,
                 fallback_hashes: Optional[Dict[str, int]] = None):
        self.api_url = api_url
        self.timeout_seconds = timeout_seconds
        self.fallback_hashes = fallback_hashes or LOCAL_BREACH_FALLBACK_HASHES

    @property
    def rule_name(self) -> str:
        return "HIBP K-Anonymity Breach Check"

    def evaluate(self, password: str, **kwargs: Any) -> PolicyResult:
        if not password:
            return PolicyResult(
                is_compliant=True,
                passed_rules=[self.rule_name],
                metadata={"breach_count": 0, "source": "local"}
            )

        # 1. Local SHA-1 calculation
        full_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        prefix = full_hash[:5]
        suffix = full_hash[5:]

        breach_count = 0
        source = "api"
        fallback_used = False

        use_network = kwargs.get("use_network", True)

        if use_network:
            try:
                url = f"{self.api_url.rstrip('/')}/{prefix}"
                response = requests.get(url, timeout=self.timeout_seconds)
                if response.status_code == 200:
                    # Parse lines (format: SUFFIX:COUNT)
                    for line in response.text.splitlines():
                        line = line.strip()
                        if ":" in line:
                            line_suffix, count_str = line.split(":", 1)
                            if line_suffix.upper() == suffix:
                                breach_count = int(count_str)
                                break
                else:
                    fallback_used = True
            except requests.RequestException:
                fallback_used = True

        if not use_network or fallback_used:
            source = "local_fallback"
            breach_count = self.fallback_hashes.get(full_hash, 0)

        is_compliant = breach_count == 0
        violations = []

        if not is_compliant:
            violations.append(
                PolicyViolation(
                    rule_name=self.rule_name,
                    severity="critical",
                    message=f"Password was found in known breach database (seen {breach_count:,} times)."
                )
            )

        return PolicyResult(
            is_compliant=is_compliant,
            violations=violations,
            passed_rules=[self.rule_name] if is_compliant else [],
            metadata={
                "breach_count": breach_count,
                "prefix": prefix,
                "source": source,
                "fallback_used": fallback_used
            }
        )
