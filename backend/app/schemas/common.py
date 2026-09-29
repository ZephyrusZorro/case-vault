"""Shared response schemas."""
from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    tagline: str
    time: datetime


class DashboardSummary(BaseModel):
    total_screened: int
    valid: int
    under_review: int
    high_risk: int
    average_risk_score: float | None = None
    workflow_counts: dict[str, int] = {}
    priority_counts: dict[str, int] = {}
    legal_hold_count: int = 0
    total_exhibits: int = 0
    audit_events_count: int = 0


class RecentScreeningItem(BaseModel):
    case_id: str
    case_number: int
    case_name: str
    document_type: str | None
    person_name: str | None
    risk_score: int | None
    status: str
    created_at: datetime


class RecentScreeningsResponse(BaseModel):
    items: list[RecentScreeningItem]
