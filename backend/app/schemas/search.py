from typing import Any
from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    """Unified search hit representation across cases, documents, and audit events."""

    entity_type: str = Field(..., description="'case', 'document', or 'audit_event'")
    id: str = Field(..., description="Unique entity identifier")
    title: str = Field(..., description="Primary title or label")
    subtitle: str | None = Field(None, description="Secondary reference (e.g., case_id, exhibit_number)")
    case_id: str | None = Field(None, description="Associated case identifier for navigation")
    case_title: str | None = Field(None, description="Title of the parent case")
    match_field: str = Field(..., description="Name of the attribute or context that matched")
    match_snippet: str | None = Field(None, description="Excerpt highlighting the matching query context")
    classification_level: str = Field("restricted", description="Security classification level")
    is_sealed: bool = Field(False, description="Whether exhibit or case is judicially sealed")
    legal_hold: bool = Field(False, description="Whether entity is subject to active legal hold")
    status: str | None = Field(None, description="Lifecycle status (for cases)")
    priority: str | None = Field(None, description="Priority rating (for cases)")
    timestamp: str | None = Field(None, description="Creation or occurrence ISO-8601 timestamp")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional context attributes")


class SearchResultsResponse(BaseModel):
    """Aggregated search result payload with multi-facet counters."""

    query: str
    total_hits: int
    cases_count: int
    documents_count: int
    audit_count: int
    results: list[SearchResultItem]
    took_ms: float
