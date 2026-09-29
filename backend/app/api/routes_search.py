"""Unified Search & Retrieval API endpoints for investigation cases, exhibits, and audit trail."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_optional
from app.db.base import get_db
from app.db.models import User
from app.schemas.search import SearchResultsResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResultsResponse)
def search_system(
    q: str = Query("", description="Keywords matching titles, IDs, hashes, OCR fields, or actors"),
    entity_type: str = Query("all", description="Entity category: 'all', 'cases', 'documents', or 'audit'"),
    classification: str | None = Query(None, description="Filter by security classification level"),
    status: str | None = Query(None, description="Filter by case lifecycle status"),
    priority: str | None = Query(None, description="Filter by case priority"),
    legal_hold: bool | None = Query(None, description="Filter by active legal hold status"),
    is_sealed: bool | None = Query(None, description="Filter by judicial sealing status"),
    from_date: str | None = Query(None, description="ISO-8601 start timestamp filter"),
    to_date: str | None = Query(None, description="ISO-8601 end timestamp filter"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> SearchResultsResponse:
    """Execute clearance-aware, multi-facet query across all investigation records."""
    return search_service.search_entities(
        db=db,
        q=q,
        entity_type=entity_type,
        classification=classification,
        status=status,
        priority=priority,
        legal_hold=legal_hold,
        is_sealed=is_sealed,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
        current_user=current_user,
    )
