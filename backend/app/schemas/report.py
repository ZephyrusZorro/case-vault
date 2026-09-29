"""Final verification report schemas."""
from datetime import datetime

from pydantic import BaseModel


class ReportField(BaseModel):
    label: str
    value: str
    confidence: float | None


class ReportDocument(BaseModel):
    document_id: str
    file_name: str
    document_type: str | None
    type_confidence: float | None
    ocr_engine: str | None
    ocr_mean_confidence: float | None
    fields: list[ReportField]
    validation_overall: str | None = None
    exhibit_number: str | None = None
    legal_category: str | None = None
    classification_level: str | None = None
    current_version_number: int | None = None
    file_hash: str | None = None


class ScreeningSummaryItem(BaseModel):
    module: str
    outcome: str
    detail: str


class KeyFinding(BaseModel):
    level: str  # error | warning | info | success
    text: str


class CaseReport(BaseModel):
    case_id: str
    case_number: int
    case_name: str
    formatted_case_id: str | None = None
    title: str | None = None
    case_type: str | None = None
    department: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_investigators: list[str] = []
    generated_at: datetime
    disclaimer: str
    overall_risk: int | None
    band: str | None
    recommendation: str | None
    screening_summary: list[ScreeningSummaryItem]
    key_findings: list[KeyFinding]
    factors: list[dict]
    documents: list[ReportDocument]
