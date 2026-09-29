"""Dashboard summary — always derived from stored cases, never hardcoded."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.db.base import get_db
from app.db.models import Case, Document, AuditEvent
from app.schemas.common import (
    DashboardSummary,
    RecentScreeningItem,
    RecentScreeningsResponse,
)

router = APIRouter()

# Recommendation values used to bucket case outcomes.
_VALID = {"verification_passed", "low_risk"}
_REVIEW = {"review_recommended", "manual_review_required", "unable_to_verify"}


def _bucket(recommendation: str | None, overall_risk: int | None) -> str:
    if recommendation is None or overall_risk is None:
        return "pending"
    rec = recommendation.strip().lower()
    if rec in _VALID:
        return "valid"
    if rec in _REVIEW and overall_risk >= 60:
        return "high_risk"
    if rec in _REVIEW:
        return "under_review"
    return "pending"


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    total = db.scalar(select(func.count(Case.id))) or 0
    all_cases = db.scalars(select(Case)).all()

    buckets = {"valid": 0, "under_review": 0, "high_risk": 0}
    workflow_counts: dict[str, int] = {
        "open": 0,
        "under_investigation": 0,
        "pending_review": 0,
        "pending_legal_review": 0,
        "court_ready": 0,
        "closed": 0,
    }
    priority_counts: dict[str, int] = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
    }
    legal_hold_count = 0
    risk_values: list[int] = []

    for case in all_cases:
        b = _bucket(case.recommendation, case.overall_risk)
        if b in buckets:
            buckets[b] += 1
        if case.overall_risk is not None:
            risk_values.append(case.overall_risk)

        st = case.status or "open"
        workflow_counts[st] = workflow_counts.get(st, 0) + 1

        prio = case.priority or "medium"
        priority_counts[prio] = priority_counts.get(prio, 0) + 1

        if case.legal_hold:
            legal_hold_count += 1

    total_exhibits = db.scalar(select(func.count(Document.id))) or 0
    audit_events_count = db.scalar(select(func.count(AuditEvent.id))) or 0

    avg = round(sum(risk_values) / len(risk_values), 1) if risk_values else None
    return DashboardSummary(
        total_screened=total,
        valid=buckets["valid"],
        under_review=buckets["under_review"],
        high_risk=buckets["high_risk"],
        average_risk_score=avg,
        workflow_counts=workflow_counts,
        priority_counts=priority_counts,
        legal_hold_count=legal_hold_count,
        total_exhibits=total_exhibits,
        audit_events_count=audit_events_count,
    )


@router.get("/dashboard/recent", response_model=RecentScreeningsResponse)
def recent_screenings(limit: int = 8, db: Session = Depends(get_db)) -> RecentScreeningsResponse:
    cases = (
        db.scalars(select(Case).order_by(Case.case_number.desc()).limit(limit))
        .all()
    )
    items: list[RecentScreeningItem] = []
    for case in cases:
        doc_type = next(
            (d.document_type for d in case.documents if d.document_type), None
        )
        person = next(
            (
                f.raw_value
                for d in case.documents
                for f in d.fields
                if f.field_name == "full_name"
            ),
            None,
        )
        status = "processing" if case.status != "completed" else _bucket(
            case.recommendation, case.overall_risk
        )
        items.append(
            RecentScreeningItem(
                case_id=case.id,
                case_number=case.case_number,
                case_name=case.case_name,
                document_type=doc_type,
                person_name=person,
                risk_score=case.overall_risk,
                status=status,
                created_at=case.created_at,
            )
        )
    return RecentScreeningsResponse(items=items)
