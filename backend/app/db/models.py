"""ID-SHIELD database entities (spec §38) + analysis stage tracking."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ----------------------------------------------------------------- User
class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(50), default="investigator")
    # Roles: admin | investigator | reviewer | legal_officer | auditor
    badge_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    clearance_level: Mapped[str] = mapped_column(String(30), default="confidential")
    # unrestricted | restricted | confidential | secret | top_secret
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ----------------------------------------------------------------- Case
class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_number: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    case_id: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    # e.g., CASE-2026-00124
    case_name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    case_type: Mapped[str] = mapped_column(String(80), default="Women Safety Investigation")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    department: Mapped[str] = mapped_column(String(120), default="NCRB Women Safety Division")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    # low | medium | high | critical
    assigned_investigators: Mapped[list] = mapped_column(JSON, default=list)
    lead_officer_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_by_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")
    # open | active | pending_review | closed | archived | draft | processing
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    overall_risk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(60), nullable=True)
    applicant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    applicant_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    applicant_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    auto_notify_on_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)
    review_status: Mapped[str] = mapped_column(String(30), default="pending_review")
    # pending_review | approved | rejected | needs_further_review
    reviewer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    legal_hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    legal_hold_applied_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    legal_hold_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    classification_level: Mapped[str] = mapped_column(String(30), default="restricted")
    # unrestricted | restricted | confidential | secret | top_secret

    documents: Mapped[list["Document"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["CaseNotification"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


# ------------------------------------------------------------- Document
class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100), default="")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    document_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    type_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    original_path: Mapped[str] = mapped_column(String(500))
    processed_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    perceptual_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(30), default="uploaded")
    # uploaded | processing | done | error
    ocr_engine: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ocr_mean_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_version_number: Mapped[int] = mapped_column(Integer, default=1)
    exhibit_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    legal_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    classification_level: Mapped[str] = mapped_column(String(30), default="restricted")
    is_sealed: Mapped[bool] = mapped_column(Boolean, default=False)
    sealed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    sealed_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    sealed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    legal_hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    legal_hold_applied_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    legal_hold_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retention_period_years: Mapped[int | None] = mapped_column(Integer, nullable=True)

    case: Mapped[Case] = relationship(back_populates="documents")
    fields: Mapped[list["ExtractedField"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    validation_results: Mapped[list["ValidationResult"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    forensic_findings: Mapped[list["ForensicFinding"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    versions: Mapped[list["DocumentVersion"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number"
    )


# ------------------------------------------------------ DocumentVersion
class DocumentVersion(Base, TimestampMixin):
    """Cryptographically chained document version exhibit."""

    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    file_name: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), default="")
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True)
    previous_version_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    version_tag: Mapped[str] = mapped_column(String(50), default="original_evidence")
    # original_evidence | certified_copy | forensic_exhibit | court_redacted | revised_translation
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    uploaded_by_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    document: Mapped[Document] = relationship(back_populates="versions")


# ------------------------------------------------------- ExtractedField
class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(80), index=True)
    raw_value: Mapped[str] = mapped_column(Text, default="")
    normalized_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_region: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    document: Mapped[Document] = relationship(back_populates="fields")


# ---------------------------------------------------- ValidationResult
class ValidationResult(Base):
    __tablename__ = "validation_results"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    check_type: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))  # pass | fail | warning | unavailable
    message: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    document: Mapped[Document] = relationship(back_populates="validation_results")


# ------------------------------------------------ CrossDocumentFinding
class CrossDocumentFinding(Base):
    __tablename__ = "cross_document_findings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(80))
    severity: Mapped[str] = mapped_column(String(20))  # info | low | medium | high
    documents_involved: Mapped[list] = mapped_column(JSON, default=list)
    values: Mapped[dict] = mapped_column(JSON, default=dict)
    explanation: Mapped[str] = mapped_column(Text, default="")


# ----------------------------------------------------- ForensicFinding
class ForensicFinding(Base):
    __tablename__ = "forensic_findings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    region: Mapped[str] = mapped_column(String(80))
    finding_type: Mapped[str] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(20))  # low | medium | high
    score: Mapped[float] = mapped_column(Float, default=0.0)
    bbox: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [x, y, w, h]
    explanation: Mapped[str] = mapped_column(Text, default="")

    document: Mapped[Document] = relationship(back_populates="forensic_findings")


# ---------------------------------------------------------- RiskFactor
class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    factor: Mapped[str] = mapped_column(String(120))
    score: Mapped[int] = mapped_column(Integer)  # signed contribution
    direction: Mapped[str] = mapped_column(String(12))  # increase | decrease
    explanation: Mapped[str] = mapped_column(Text, default="")


# ---------------------------------------------------------------- Report
class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    content: Mapped[dict] = mapped_column(JSON, default=dict)


# -------------------------------------------------------- AnalysisStage
class AnalysisStage(Base):
    """Live pipeline stage status, polled by the processing screen."""

    __tablename__ = "analysis_stages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)
    stage_key: Mapped[str] = mapped_column(String(60))
    stage_label: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | running | done | warning | unavailable | error
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


# ----------------------------------------------------- CaseNotification
class CaseNotification(Base, TimestampMixin):
    """Audit record of SMS / WhatsApp / Email discrepancy alerts sent."""

    __tablename__ = "case_notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    recipient: Mapped[str] = mapped_column(String(320))
    channel: Mapped[str] = mapped_column(String(30))  # sms | whatsapp | email | webhook
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    mismatch_fields: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="sent")  # sent | delivered | simulated | failed
    trigger_type: Mapped[str] = mapped_column(String(30), default="manual")  # manual | automatic
    provider_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    case: Mapped[Case] = relationship(back_populates="notifications")


# ----------------------------------------------------------- AuditEvent
class AuditEvent(Base):
    """Immutable, cryptographically chained audit log entry for chain-of-custody tracking."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    sequence_number: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    action: Mapped[str] = mapped_column(String(255))
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    user_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    previous_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    block_height: Mapped[int] = mapped_column(Integer, default=1)

    case: Mapped[Case | None] = relationship(back_populates="audit_events")

