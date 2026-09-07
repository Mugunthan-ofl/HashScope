"""Audit Service Layer Module.

Orchestrates asynchronous password audit background jobs (hash generation -> cracking ->
scoring -> policy evaluation -> summary & recommendations compilation).
"""

import uuid
from datetime import datetime
import tempfile
import os
from typing import Dict, Any, Optional, List
from fastapi import BackgroundTasks

from backend.api.schemas.audit import (
    AuditConfig,
    AuditStatusResponse,
    AuditReportResponse,
    SummaryStatsSchema,
    RecommendationSchema,
)
from backend.core.hashing.hash_generator import generate_test_hashes, HashRecord
from backend.core.interfaces.crack_engine import CrackEngine, CrackResult, CrackedHash
from backend.core.cracking.hashcat_engine import HashcatEngine
from backend.core.cracking.john_engine import JohnEngine
from backend.core.scoring.strength_scorer import StrengthScorer
from backend.core.scoring.entropy_scorer import EntropyScorer
from backend.core.policy.policy_report import PolicyEvaluator, PolicyReport
from backend.core.reporting.report_service import ReportService


class MockCrackEngine(CrackEngine):
    """Mock CrackEngine for fast integration testing without external CLI binaries."""

    @property
    def engine_name(self) -> str:
        return "Mock Crack Engine"

    def run(self, hash_file: str, wordlist: str, **kwargs: Any) -> CrackResult:
        # Simulate cracking passwords present in mock wordlist or common set
        hash_records: List[HashRecord] = kwargs.get("hash_records", [])
        cracked_items: List[CrackedHash] = []

        for rec in hash_records:
            # Simulate fast cracking for weak or common passwords (< 8 chars or common words)
            if len(rec.plaintext) < 8 or rec.plaintext.lower() in ["password", "123456", "admin", "qwerty"]:
                cracked_items.append(
                    CrackedHash(
                        hash_value=rec.hash_value,
                        cracked=True,
                        plaintext=rec.plaintext,
                        crack_time_seconds=1.5,  # Cracked fast under 60s
                        hash_type=rec.algorithm
                    )
                )

        return CrackResult(
            engine_name=self.engine_name,
            total_hashes=len(hash_records),
            cracked_count=len(cracked_items),
            cracked_hashes=cracked_items,
            execution_time_seconds=2.0,
            status="success"
        )


class AuditService:
    """Service class managing audit job lifecycle and background execution pipeline."""

    def __init__(self):
        # In-memory audit run store
        self._audit_store: Dict[str, Dict[str, Any]] = {}
        self._report_service = ReportService()
        self._policy_evaluator = PolicyEvaluator()
        self._strength_scorer = StrengthScorer()
        self._entropy_scorer = EntropyScorer()

    def start_audit_job(self, config: AuditConfig, background_tasks: BackgroundTasks) -> AuditStatusResponse:
        """Assigns audit_id, initializes audit state, and schedules pipeline execution in background."""
        audit_id = f"audit_{uuid.uuid4().hex[:8]}"
        now_str = datetime.utcnow().isoformat()

        self._audit_store[audit_id] = {
            "audit_id": audit_id,
            "status": "pending",
            "progress_percent": 0.0,
            "created_at": now_str,
            "completed_at": None,
            "error_message": None,
            "config": config.model_dump(),
            "report_response": None,
        }

        # Schedule background processing task
        background_tasks.add_task(self.run_pipeline, audit_id, config)

        return AuditStatusResponse(
            audit_id=audit_id,
            status="pending",
            progress_percent=0.0,
            created_at=now_str
        )

    def run_pipeline(self, audit_id: str, config: AuditConfig) -> None:
        """Executes full audit pipeline in background."""
        if audit_id not in self._audit_store:
            return

        job = self._audit_store[audit_id]
        job["status"] = "running"
        job["progress_percent"] = 10.0

        try:
            # 1. Hash Generation
            hash_records = generate_test_hashes(config.passwords, config.algorithm)
            job["progress_percent"] = 30.0

            # 2. Select & Run Cracking Engine
            crack_engine: CrackEngine
            if config.engine == "mock":
                crack_engine = MockCrackEngine()
                crack_result = crack_engine.run(
                    hash_file="mock.hash",
                    wordlist=config.wordlist_name,
                    hash_records=hash_records
                )
            elif config.engine == "john":
                crack_engine = JohnEngine()
                # Create temporary hash file for John
                with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".hash") as tf:
                    for rec in hash_records:
                        tf.write(f"{rec.hash_value}\n")
                    temp_hash_path = tf.name

                try:
                    crack_result = crack_engine.run(
                        hash_file=temp_hash_path,
                        wordlist=config.wordlist_name,
                        algorithm=config.algorithm
                    )
                finally:
                    if os.path.exists(temp_hash_path):
                        os.remove(temp_hash_path)
            else:
                # Default to Hashcat
                crack_engine = HashcatEngine()
                with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".hash") as tf:
                    for rec in hash_records:
                        tf.write(f"{rec.hash_value}\n")
                    temp_hash_path = tf.name

                try:
                    crack_result = crack_engine.run(
                        hash_file=temp_hash_path,
                        wordlist=config.wordlist_name,
                        algorithm=config.algorithm
                    )
                finally:
                    if os.path.exists(temp_hash_path):
                        os.remove(temp_hash_path)

            job["progress_percent"] = 60.0

            # Map cracked plaintexts for quick lookup
            cracked_map: Dict[str, float] = {
                ch.hash_value: ch.crack_time_seconds for ch in crack_result.cracked_hashes
            }

            # 3. Strength & Entropy Scoring
            strength_scores = []
            for rec in hash_records:
                is_cracked = rec.hash_value in cracked_map
                crack_time = cracked_map.get(rec.hash_value, None)
                score_res = self._strength_scorer.score(
                    rec.plaintext,
                    cracked=is_cracked,
                    crack_time_seconds=crack_time
                )
                strength_scores.append(score_res)

            job["progress_percent"] = 80.0

            # 4. Policy Evaluation
            policy_reports: List[PolicyReport] = []
            for rec in hash_records:
                report = self._policy_evaluator.evaluate(
                    password=rec.plaintext,
                    context_words=config.context_words,
                    password_label=rec.label,
                    use_network=False,  # Use local fallback for pipeline consistency
                    min_password_length=config.min_password_length,
                )
                policy_reports.append(report)

            job["progress_percent"] = 90.0

            # 5. Summary Statistics & Recommendations Compilation
            summary_stats = self._report_service.compute_summary_statistics(
                hash_records=hash_records,
                crack_results=[crack_result],
                strength_scores=strength_scores,
                policy_reports=policy_reports
            )
            recommendations = self._report_service.generate_recommendations(summary_stats)

            now_completed = datetime.utcnow().isoformat()

            # Build final AuditReportResponse object
            report_response = AuditReportResponse(
                audit_id=audit_id,
                status="completed",
                created_at=job["created_at"],
                completed_at=now_completed,
                summary=SummaryStatsSchema(
                    total_hashes=summary_stats.total_hashes,
                    cracked_count=summary_stats.cracked_count,
                    cracked_percentage=summary_stats.cracked_percentage,
                    cracked_under_60s_percentage=summary_stats.cracked_under_60s_percentage,
                    avg_crack_time_seconds=summary_stats.avg_crack_time_seconds,
                    median_crack_time_seconds=summary_stats.median_crack_time_seconds,
                    strength_distribution=summary_stats.strength_distribution,
                    most_common_policy_violation=summary_stats.most_common_policy_violation
                ),
                recommendations=[
                    RecommendationSchema(
                        priority=r.priority,
                        title=r.title,
                        reason=r.reason,
                        action=r.action
                    ) for r in recommendations
                ],
                hash_records=[rec.__dict__ for rec in hash_records],
                policy_reports=[
                    {
                        "label": pr.password_label,
                        "overall_compliant": pr.overall_compliant,
                        "baseline": pr.baseline_section.__dict__,
                        "advanced": pr.advanced_section.__dict__,
                        "breach": pr.breach_section.__dict__,
                    } for pr in policy_reports
                ],
                metadata={"engine": crack_engine.engine_name}
            )

            job["status"] = "completed"
            job["progress_percent"] = 100.0
            job["completed_at"] = now_completed
            job["report_response"] = report_response

        except Exception as e:
            job["status"] = "failed"
            job["error_message"] = str(e)

    def get_status(self, audit_id: str) -> Optional[AuditStatusResponse]:
        """Retrieves current job status."""
        job = self._audit_store.get(audit_id)
        if not job:
            return None

        return AuditStatusResponse(
            audit_id=audit_id,
            status=job["status"],
            progress_percent=job["progress_percent"],
            created_at=job["created_at"],
            completed_at=job["completed_at"],
            error_message=job["error_message"]
        )

    def get_report(self, audit_id: str) -> Optional[AuditReportResponse]:
        """Retrieves compiled audit report response."""
        job = self._audit_store.get(audit_id)
        if not job:
            return None
        return job.get("report_response")
