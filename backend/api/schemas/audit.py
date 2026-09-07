"""Pydantic Request and Response Schemas for Audit API endpoints."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class HashInput(BaseModel):
    """Input representation for individual password hash entries."""
    hash_value: str = Field(..., description="Hash string or hash file line")
    hash_type: str = Field("md5", description="Target hash algorithm/type identifier")


class AuditConfig(BaseModel):
    """Request payload for triggering an audit job."""
    algorithm: str = Field("md5", description="Target hash algorithm (md5, sha256, ntlm, bcrypt)")
    engine: str = Field("hashcat", description="Cracking engine choice ('hashcat', 'john', or 'mock')")
    passwords: List[str] = Field(..., description="List of plaintext passwords to audit & crack")
    wordlist_name: str = Field("rockyou.txt", description="Dictionary wordlist identifier")
    context_words: List[str] = Field(default_factory=list, description="Company/domain context words")
    min_password_length: int = Field(12, description="Target policy minimum length threshold")


class AuditStatusResponse(BaseModel):
    """Status polling response for long-running audit jobs."""
    audit_id: str
    status: str = Field(..., description="Current status: pending, running, completed, failed")
    progress_percent: float = Field(0.0, description="Audit progress percentage (0.0 to 100.0)")
    created_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


class SummaryStatsSchema(BaseModel):
    """Summary statistics report metrics."""
    total_hashes: int
    cracked_count: int
    cracked_percentage: float
    cracked_under_60s_percentage: float
    avg_crack_time_seconds: float
    median_crack_time_seconds: float
    strength_distribution: Dict[str, Dict[str, Any]]
    most_common_policy_violation: Optional[str] = None


class RecommendationSchema(BaseModel):
    """Ranked security recommendation."""
    priority: int
    title: str
    reason: str
    action: str


class AuditReportResponse(BaseModel):
    """Full structured JSON audit report response."""
    audit_id: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    summary: SummaryStatsSchema
    recommendations: List[RecommendationSchema]
    hash_records: List[Dict[str, Any]]
    policy_reports: List[Dict[str, Any]]
    metadata: Dict[str, Any] = {}
