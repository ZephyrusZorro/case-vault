"""Case and document API schemas."""
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class CaseCreate(BaseModel):
    case_name: str | None = None
    title: str | None = None
    case_id: str | None = None
    case_type: str = "Women Safety Investigation"
    description: str | None = None
    department: str = "NCRB Women Safety Division"
    priority: str = "medium"
    assigned_investigators: list[str] = Field(default_factory=list)
    applicant_name: str | None = None
    applicant_phone: str | None = None
    applicant_email: str | None = None
    auto_notify_on_mismatch: bool = False

    @model_validator(mode="after")
    def validate_name_or_title(self) -> "CaseCreate":
        name = (self.title or self.case_name or "").strip()
        if not name:
            raise ValueError("Case name or title must not be empty.")
        return self


class CaseUpdate(BaseModel):
    title: str | None = None
    case_type: str | None = None
    description: str | None = None
    department: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_investigators: list[str] | None = None


class DocumentOut(BaseModel):
    id: str
    file_name: str
    mime_type: str
    file_size: int
    document_type: str | None
    type_confidence: float | None
    document_type_label: str | None = None
    processing_status: str
    has_preview: bool
    current_version_number: int = 1
    exhibit_number: str | None = None
    legal_category: str | None = None
    classification_level: str = "restricted"
    is_sealed: bool = False
    sealed_reason: str | None = None
    sealed_by: str | None = None
    sealed_at: datetime | None = None
    legal_hold: bool = False
    legal_hold_reason: str | None = None
    legal_hold_applied_by: str | None = None
    legal_hold_applied_at: datetime | None = None
    retention_period_years: int | None = None
    sha256_hash: str | None = None
    version_count: int = 1

    @classmethod
    def from_model(cls, doc) -> "DocumentOut":
        from app.services.classifier_service import get_document_label

        v_count = len(doc.versions) if hasattr(doc, "versions") and doc.versions else 1
        return cls(
            id=doc.id,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            file_size=doc.file_size,
            document_type=doc.document_type,
            type_confidence=doc.type_confidence,
            document_type_label=get_document_label(doc.document_type) if doc.document_type else None,
            processing_status=doc.processing_status,
            has_preview=doc.mime_type.startswith("image/"),
            current_version_number=getattr(doc, "current_version_number", 1) or 1,
            exhibit_number=getattr(doc, "exhibit_number", None),
            legal_category=getattr(doc, "legal_category", None),
            classification_level=getattr(doc, "classification_level", "restricted") or "restricted",
            is_sealed=bool(getattr(doc, "is_sealed", False)),
            sealed_reason=getattr(doc, "sealed_reason", None),
            sealed_by=getattr(doc, "sealed_by", None),
            sealed_at=getattr(doc, "sealed_at", None),
            legal_hold=bool(getattr(doc, "legal_hold", False)),
            legal_hold_reason=getattr(doc, "legal_hold_reason", None),
            legal_hold_applied_by=getattr(doc, "legal_hold_applied_by", None),
            legal_hold_applied_at=getattr(doc, "legal_hold_applied_at", None),
            retention_period_years=getattr(doc, "retention_period_years", None),
            sha256_hash=getattr(doc, "file_hash", None),
            version_count=v_count,
        )


class DocumentVersionOut(BaseModel):
    id: str
    document_id: str
    case_id: str
    version_number: int
    file_name: str
    file_size: int
    mime_type: str
    sha256_hash: str
    previous_version_hash: str | None = None
    version_tag: str
    change_summary: str | None = None
    uploaded_by_id: str | None = None
    uploaded_by_name: str | None = None
    created_at: datetime

    @classmethod
    def from_model(cls, v) -> "DocumentVersionOut":
        return cls(
            id=v.id,
            document_id=v.document_id,
            case_id=v.case_id,
            version_number=v.version_number,
            file_name=v.file_name,
            file_size=v.file_size,
            mime_type=v.mime_type,
            sha256_hash=v.sha256_hash,
            previous_version_hash=v.previous_version_hash,
            version_tag=v.version_tag,
            change_summary=v.change_summary,
            uploaded_by_id=v.uploaded_by_id,
            uploaded_by_name=v.uploaded_by_name,
            created_at=v.created_at,
        )


class DocumentChainVerificationOut(BaseModel):
    document_id: str
    is_valid: bool
    version_count: int
    chain: list[DocumentVersionOut]
    errors: list[str] = Field(default_factory=list)
    verified_at: datetime


class DocumentMetadataUpdate(BaseModel):
    exhibit_number: str | None = None
    legal_category: str | None = None
    classification_level: str | None = None
    is_sealed: bool | None = None
    retention_period_years: int | None = None


class CaseOut(BaseModel):
    id: str
    case_number: int
    case_id: str
    case_name: str
    title: str
    case_type: str
    description: str | None = None
    department: str
    priority: str
    assigned_investigators: list[str] = Field(default_factory=list)
    status: str
    overall_risk: int | None = None
    recommendation: str | None = None
    person_name: str | None = None
    applicant_name: str | None = None
    applicant_phone: str | None = None
    applicant_email: str | None = None
    auto_notify_on_mismatch: bool = False
    review_status: str | None = "pending_review"
    reviewer_name: str | None = None
    reviewer_notes: str | None = None
    reviewed_at: datetime | None = None
    legal_hold: bool = False
    legal_hold_reason: str | None = None
    legal_hold_applied_by: str | None = None
    legal_hold_applied_at: datetime | None = None
    classification_level: str = "restricted"
    document_count: int
    evidence_count: int = 0
    audit_event_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    documents: list[DocumentOut] | None = None

    @classmethod
    def from_model(cls, case, person_name: str | None = None, include_documents: bool = True) -> "CaseOut":
        cid = getattr(case, "case_id", None) or f"CASE-2026-{case.case_number:05d}"
        t = getattr(case, "title", None) or case.case_name
        ctype = getattr(case, "case_type", None) or "Women Safety Investigation"
        dept = getattr(case, "department", None) or "NCRB Women Safety Division"
        prio = getattr(case, "priority", None) or "medium"
        invs = getattr(case, "assigned_investigators", None) or []
        if isinstance(invs, str):
            import json
            try:
                invs = json.loads(invs)
            except Exception:
                invs = [invs]

        return cls(
            id=case.id,
            case_number=case.case_number,
            case_id=cid,
            case_name=case.case_name,
            title=t,
            case_type=ctype,
            description=getattr(case, "description", None),
            department=dept,
            priority=prio,
            assigned_investigators=invs,
            status=case.status,
            overall_risk=case.overall_risk,
            recommendation=case.recommendation,
            person_name=person_name or getattr(case, "applicant_name", None),
            applicant_name=getattr(case, "applicant_name", None),
            applicant_phone=getattr(case, "applicant_phone", None),
            applicant_email=getattr(case, "applicant_email", None),
            auto_notify_on_mismatch=bool(getattr(case, "auto_notify_on_mismatch", False)),
            review_status=getattr(case, "review_status", "pending_review") or "pending_review",
            reviewer_name=getattr(case, "reviewer_name", None),
            reviewer_notes=getattr(case, "reviewer_notes", None),
            reviewed_at=getattr(case, "reviewed_at", None),
            legal_hold=bool(getattr(case, "legal_hold", False)),
            legal_hold_reason=getattr(case, "legal_hold_reason", None),
            legal_hold_applied_by=getattr(case, "legal_hold_applied_by", None),
            legal_hold_applied_at=getattr(case, "legal_hold_applied_at", None),
            classification_level=getattr(case, "classification_level", "restricted") or "restricted",
            document_count=len(case.documents),
            evidence_count=0,
            audit_event_count=len(getattr(case, "audit_events", [])) if hasattr(case, "audit_events") else 0,
            created_at=case.created_at,
            updated_at=getattr(case, "updated_at", case.created_at),
            documents=[DocumentOut.from_model(d) for d in case.documents] if include_documents else None,
        )


class SealExhibitRequest(BaseModel):
    action: str = Field(default="seal", pattern="^(seal|unseal)$")
    reason: str = Field(min_length=3, max_length=500)


class LegalHoldRequest(BaseModel):
    action: str = Field(default="apply", pattern="^(apply|lift)$")
    reason: str = Field(min_length=3, max_length=500)


class CaseCreated(BaseModel):
    id: str
    case_number: int
    case_id: str
    case_name: str
    title: str
    case_type: str
    department: str
    priority: str
    assigned_investigators: list[str] = Field(default_factory=list)
    status: str
    applicant_name: str | None = None
    applicant_phone: str | None = None
    applicant_email: str | None = None
    auto_notify_on_mismatch: bool = False


class CaseReviewRequest(BaseModel):
    decision: str = Field(description="approved | rejected | needs_further_review")
    notes: str | None = None
    reviewer_name: str | None = None


class UploadResult(BaseModel):
    case_id: str
    uploaded: list[DocumentOut]
    failed: list[dict]


class DeleteResult(BaseModel):
    deleted: bool

