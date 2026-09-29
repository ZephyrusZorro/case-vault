from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class PIIEntity(BaseModel):
    entity_type: str = Field(..., description="aadhaar | pan | phone | email | victim_name | voter_id | passport | financial | address")
    text: str = Field(..., description="Matched sensitive text")
    masked_value: str = Field(..., description="Suggested masked replacement")
    start_char: int | None = Field(None, description="Start index in text if available")
    end_char: int | None = Field(None, description="End index in text if available")
    confidence: float = Field(0.9, ge=0.0, le=1.0)
    bbox: list[float] | None = Field(None, description="Optional bounding box [x, y, w, h]")
    recommendation: str = Field("", description="Legal/privacy guideline recommendation")


class PIIScanRequest(BaseModel):
    text: str | None = None
    custom_victim_names: list[str] = Field(default_factory=list)


class PIIScanResponse(BaseModel):
    document_id: str | None = None
    file_name: str | None = None
    entities_found: list[PIIEntity] = Field(default_factory=list)
    total_pii_count: int = 0
    categories: list[str] = Field(default_factory=list)
    has_victim_pii: bool = False
    has_aadhaar_pii: bool = False
    has_financial_pii: bool = False
    privacy_risk_level: str = "low"  # low | medium | high | critical
    legal_statute_note: str = ""


class RedactionItem(BaseModel):
    entity_type: str = "general"
    text_to_redact: str | None = None
    bbox: list[float] | None = None  # [x, y, w, h] normalized 0-1 or pixel coords
    label: str | None = None


class RedactDocumentRequest(BaseModel):
    redactions: list[RedactionItem] = Field(default_factory=list)
    reason: str = Field(..., min_length=3, description="Legal or investigative justification for court/public disclosure")
    court_order_ref: str | None = Field(None, description="Court case or judicial order reference number")
    apply_watermark: bool = Field(True, description="Add certified court-redacted watermark banner")
    mask_style: str = Field("blackout", description="blackout | masked_text")
    custom_victim_names: list[str] = Field(default_factory=list)


class RedactedVersionOut(BaseModel):
    version_id: str
    document_id: str
    version_number: int
    version_tag: str
    file_name: str
    sha256_hash: str
    previous_version_hash: str | None
    change_summary: str | None
    uploaded_by_name: str | None
    created_at: datetime
    file_url: str


class RedactDocumentResponse(BaseModel):
    success: bool = True
    message: str
    document_id: str
    version_id: str
    version_number: int
    version_tag: str
    file_name: str
    sha256_hash: str
    previous_version_hash: str | None
    items_redacted_count: int
    change_summary: str
    audit_event_id: str | None = None
    created_at: datetime
    evidentiary_integrity_note: str
