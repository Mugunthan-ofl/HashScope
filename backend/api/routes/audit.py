"""Audit API Route Handlers.

Thin route handlers delegating pipeline orchestration and status retrieval to AuditService.
No business logic in routes.
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
from backend.api.schemas.audit import (
    AuditConfig,
    AuditStatusResponse,
    AuditReportResponse,
)
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit"])

# Global audit service instance for composition root / dependency injection
_audit_service_instance = AuditService()


def get_audit_service() -> AuditService:
    """Dependency provider for AuditService."""
    return _audit_service_instance


@router.get("/wordlists", response_model=List[str])
async def get_wordlists():
    """Retrieves available dictionary wordlists for cracking engine selection."""
    return ["rockyou.txt", "default.txt", "top1000.txt", "passwords.txt"]


@router.post("", response_model=AuditStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_audit(
    config: AuditConfig,
    background_tasks: BackgroundTasks,
    audit_service: AuditService = Depends(get_audit_service),
):
    """Triggers an asynchronous password audit pipeline job.

    Returns immediately with an audit_id and 'pending' status.
    """
    return audit_service.start_audit_job(config, background_tasks)


@router.get("/{audit_id}/status", response_model=AuditStatusResponse)
async def get_audit_status(
    audit_id: str,
    audit_service: AuditService = Depends(get_audit_service),
):
    """Polls running/completed state and progress for a long-running audit job."""
    status_res = audit_service.get_status(audit_id)
    if not status_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit job '{audit_id}' not found."
        )
    return status_res


@router.get("/{audit_id}", response_model=AuditReportResponse)
async def get_audit_report(
    audit_id: str,
    audit_service: AuditService = Depends(get_audit_service),
):
    """Retrieves full structured JSON audit report for a completed audit job."""
    status_res = audit_service.get_status(audit_id)
    if not status_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit job '{audit_id}' not found."
        )

    if status_res.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Audit job '{audit_id}' is currently '{status_res.status}'. Report not ready."
        )

    report_res = audit_service.get_report(audit_id)
    if not report_res:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report computation failed for audit '{audit_id}'."
        )

    return report_res
