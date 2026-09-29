"""API routes for Data Privacy, PII Scanning & Evidentiary Redaction.

Supports automated scanning for statutory PII (Aadhaar, PAN, phone, email, victim names under Sec 228A IPC / Sec 73 BNS),
and generating certified court-redacted copies while preserving original evidence immutability.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import (
    can_access_sealed_exhibit,
    get_current_user_optional,
    verify_document_read_access,
)
from app.db.base import get_db
from app.db.models import Document, User
from app.schemas.redaction import (
    PIIScanRequest,
    PIIScanResponse,
    RedactDocumentRequest,
    RedactDocumentResponse,
    RedactedVersionOut,
)
from app.services import redaction_service

router = APIRouter(prefix="/api/redaction", tags=["Data Privacy & Redaction"])


@router.post("/scan-text", response_model=PIIScanResponse)
def scan_raw_text(
    payload: PIIScanRequest,
    current_user: User | None = Depends(get_current_user_optional),
) -> PIIScanResponse:
    """Scan raw text buffer for statutory PII entities (Aadhaar, PAN, phone, email, victim markers)."""
    text = payload.text or ""
    entities = redaction_service.detect_pii_in_text(
        text,
        custom_victim_names=payload.custom_victim_names,
    )
    categories = sorted(list({e.entity_type for e in entities}))
    has_victim = "victim_name" in categories
    has_aadhaar = "aadhaar" in categories
    has_financial = any(c in categories for c in ["pan", "financial", "voter_id", "passport"])

    if has_victim:
        risk_level = "critical"
    elif has_aadhaar or has_financial:
        risk_level = "high"
    elif "phone" in categories or "email" in categories:
        risk_level = "medium"
    else:
        risk_level = "low" if entities else "none"

    statute_note = (
        "Pursuant to Section 228A IPC / Section 73 BNS, statutory non-disclosure protects victim and witness identities. "
        "Under the Digital Personal Data Protection (DPDP) Act 2023, Aadhaar and financial identifiers require redaction."
    )

    return PIIScanResponse(
        document_id=None,
        file_name="ad_hoc_text_buffer",
        entities_found=entities,
        total_pii_count=len(entities),
        categories=categories,
        has_victim_pii=has_victim,
        has_aadhaar_pii=has_aadhaar,
        has_financial_pii=has_financial,
        privacy_risk_level=risk_level,
        legal_statute_note=statute_note,
    )


@router.get("/documents/{document_id}/scan", response_model=PIIScanResponse)
def scan_document_for_pii(
    document_id: str,
    victim_names: str | None = Query(None, description="Comma-separated custom victim/protected names to search for"),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> PIIScanResponse:
    """Scan an exhibit's extracted structured fields and text for sensitive PII."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_read_access(current_user, doc)

    custom_names = [v.strip() for v in victim_names.split(",")] if victim_names else None

    try:
        return redaction_service.scan_document_pii(
            db=db,
            document_id=document_id,
            custom_victim_names=custom_names,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to scan exhibit PII: {exc}") from exc


@router.post("/documents/{document_id}/redact", response_model=RedactDocumentResponse)
def redact_document(
    document_id: str,
    payload: RedactDocumentRequest,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> RedactDocumentResponse:
    """Generate a certified court-redacted derivative document version.
    
    Evidentiary Guarantee: The original evidence remains immutable and sealed.
    A new DocumentVersion with version_tag='court_redacted' is created and cryptographically chained.
    """
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_read_access(current_user, doc)

    # Role check: Auditors cannot create redactions (read-only audit role)
    if current_user and (current_user.role or "").lower() == "auditor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Auditors have read-only access and cannot generate redacted document copies.",
        )

    # Sealed check: If sealed, only authorized supervisors/admins may generate court disclosure copies
    if getattr(doc, "is_sealed", False) and not can_access_sealed_exhibit(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot generate redacted copies from a sealed evidentiary exhibit without judicial supervisor authorization.",
        )

    ip_addr = request.client.host if request.client else None

    try:
        return redaction_service.create_redacted_derivative(
            db=db,
            document=doc,
            request=payload,
            current_user=current_user,
            ip_address=ip_addr,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Redaction failed: {exc}") from exc


@router.get("/documents/{document_id}/versions", response_model=list[RedactedVersionOut])
def get_redacted_versions(
    document_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> list[RedactedVersionOut]:
    """List all certified court-redacted historical versions of an exhibit."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_read_access(current_user, doc)
    return redaction_service.list_redacted_versions(db, document_id)
