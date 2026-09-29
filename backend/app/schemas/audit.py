"""Audit and evidentiary chain schemas."""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class AuditEventOut(BaseModel):
    id: str
    sequence_number: int
    event_type: str
    action: str
    case_id: str | None = None
    document_id: str | None = None
    user_id: str | None = None
    user_email: str | None = None
    user_role: str | None = None
    user_name: str | None = None
    ip_address: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime
    previous_hash: str | None = None
    current_hash: str
    block_height: int = 1

    @classmethod
    def from_model(cls, evt) -> "AuditEventOut":
        return cls(
            id=evt.id,
            sequence_number=evt.sequence_number,
            event_type=evt.event_type,
            action=evt.action,
            case_id=evt.case_id,
            document_id=evt.document_id,
            user_id=evt.user_id,
            user_email=evt.user_email,
            user_role=evt.user_role,
            user_name=evt.user_name,
            ip_address=evt.ip_address,
            details=evt.details or {},
            timestamp=evt.timestamp,
            previous_hash=evt.previous_hash,
            current_hash=evt.current_hash,
            block_height=evt.block_height,
        )


class AuditChainVerificationOut(BaseModel):
    is_valid: bool
    tampered: bool = False
    total_events: int
    verified_events: int
    tampered_sequences: list[int] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    verified_at: str


class EvidentiaryCertificateOut(BaseModel):
    certificate_id: str
    issuer: str
    organization: str
    division: str
    case_id: str
    generated_at: str
    integrity_status: str
    chain_integrity_verified: bool = True
    chain_length: int
    root_hash: str
    head_hash: str
    certificate_signature_sha256: str
    legal_notice: str = ""
    case_title: str | None = None
    deponent_system: str | None = None
    computer_specification: str | None = None
    evidentiary_statement: str | None = None
    exhibits_ledger: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)

