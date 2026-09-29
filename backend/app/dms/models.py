"""Persistent case, access, evidence, review and audit records."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def uid() -> str:
    return uuid.uuid4().hex


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "dms_users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(24), default="investigator")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class InstallationMeta(Base):
    __tablename__ = "dms_installation_meta"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(String(256))


class SessionToken(Base):
    __tablename__ = "dms_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("dms_users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CaseFile(Base):
    __tablename__ = "dms_cases"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    reference: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(240), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(40), default="investigation")
    classification: Mapped[str] = mapped_column(String(24), default="confidential")
    status: Mapped[str] = mapped_column(String(24), default="active")
    lead_user_id: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    retention_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    members: Mapped[list["CaseMember"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="case", cascade="all, delete-orphan")


class CaseMember(Base):
    __tablename__ = "dms_case_members"
    __table_args__ = (UniqueConstraint("case_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("dms_cases.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("dms_users.id"), index=True)
    access: Mapped[str] = mapped_column(String(16), default="viewer")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    case: Mapped[CaseFile] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class Document(Base):
    __tablename__ = "dms_documents"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("dms_cases.id"), index=True)
    title: Mapped[str] = mapped_column(String(240), index=True)
    kind: Mapped[str] = mapped_column(String(40), default="other")
    classification: Mapped[str] = mapped_column(String(24), default="confidential")
    created_by: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    case: Mapped[CaseFile] = relationship(back_populates="documents")
    versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="document", order_by="DocumentVersion.number", cascade="all, delete-orphan")


class DocumentVersion(Base):
    __tablename__ = "dms_document_versions"
    __table_args__ = (UniqueConstraint("document_id", "number"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    document_id: Mapped[str] = mapped_column(ForeignKey("dms_documents.id"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    filename: Mapped[str] = mapped_column(String(240))
    mime_type: Mapped[str] = mapped_column(String(120))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)
    encrypted_text: Mapped[str] = mapped_column("extracted_text", Text, default="")
    extraction_status: Mapped[str] = mapped_column(String(24), default="unavailable")
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    document: Mapped[Document] = relationship(back_populates="versions")


class DocumentSearchTerm(Base):
    __tablename__ = "dms_document_search_terms"
    __table_args__ = (UniqueConstraint("version_id", "token_hash"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    version_id: Mapped[str] = mapped_column(ForeignKey("dms_document_versions.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), index=True)


class CaseNote(Base):
    __tablename__ = "dms_notes"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("dms_cases.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    author: Mapped[User] = relationship()


class Review(Base):
    __tablename__ = "dms_reviews"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("dms_cases.id"), index=True)
    requested_by: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    assigned_to: Mapped[str] = mapped_column(ForeignKey("dms_users.id"))
    status: Mapped[str] = mapped_column(String(24), default="pending")
    note: Mapped[str] = mapped_column(Text, default="")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditEvent(Base):
    __tablename__ = "dms_audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("dms_users.id"), nullable=True)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("dms_cases.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    target_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    previous_hash: Mapped[str] = mapped_column(String(64))
    event_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditHead(Base):
    __tablename__ = "dms_audit_head"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_hash: Mapped[str] = mapped_column(String(64))
