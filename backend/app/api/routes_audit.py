"""Audit trail and cryptographic chain verification REST endpoints."""
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_optional, require_roles
from app.db.base import get_db
from app.db.models import User
from app.schemas.audit import (
    AuditChainVerificationOut,
    AuditEventOut,
    EvidentiaryCertificateOut,
)
from app.services import audit_service, case_service

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventOut])
def list_audit_trail(
    case_id: str | None = None,
    event_type: str | None = None,
    user_email: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    """Retrieve immutable audit ledger records with multi-criteria filtering."""
    events = audit_service.list_audit_events(
        db=db,
        case_id=case_id,
        event_type=event_type,
        user_email=user_email,
        limit=limit,
        offset=offset,
    )
    return [AuditEventOut.from_model(e) for e in events]


@router.get("/verify", response_model=AuditChainVerificationOut)
def verify_audit_ledger_integrity(
    start_seq: int | None = None,
    end_seq: int | None = None,
    request: Request = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> AuditChainVerificationOut:
    """Verify cryptographic hash chaining and sequence continuity across all audit records."""
    report = audit_service.verify_audit_chain(db=db, start_seq=start_seq, end_seq=end_seq)

    # Record that an audit ledger verification check was performed
    client_ip = request.client.host if request and request.client else None
    audit_service.record_audit_event(
        db=db,
        event_type="AUDIT_VERIFIED",
        action="Audit ledger cryptographic integrity check executed",
        user=current_user,
        ip_address=client_ip,
        details={
            "is_valid": report["is_valid"],
            "total_events_checked": report["total_events"],
            "errors_count": len(report["errors"]),
        },
    )

    return AuditChainVerificationOut(
        is_valid=report["is_valid"],
        total_events=report["total_events"],
        verified_events=report["verified_events"],
        tampered_sequences=report["tampered_sequences"],
        errors=report["errors"],
        verified_at=report["verified_at"],
    )


@router.get("/certificate", response_model=EvidentiaryCertificateOut)
def get_global_evidentiary_certificate(
    request: Request = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> EvidentiaryCertificateOut:
    """Generate official global Evidentiary Traceability Certificate under MHA/NCRB guidelines."""
    client_ip = request.client.host if request and request.client else None
    cert = audit_service.export_evidentiary_certificate(db=db, case_id=None)

    audit_service.record_audit_event(
        db=db,
        event_type="CERTIFICATE_GENERATED",
        action="Global evidentiary traceability certificate generated",
        user=current_user,
        ip_address=client_ip,
        details={"certificate_id": cert["certificate_id"], "head_hash": cert["head_hash"]},
    )

    return EvidentiaryCertificateOut(**cert)


@router.get("/cases/{case_id}", response_model=list[AuditEventOut])
def get_case_audit_trail(
    case_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    """Retrieve case-specific evidentiary audit history."""
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    events = audit_service.list_audit_events(db=db, case_id=case.id, limit=limit)
    return [AuditEventOut.from_model(e) for e in events]


@router.get("/cases/{case_id}/certificate", response_model=EvidentiaryCertificateOut)
def get_evidentiary_certificate(
    case_id: str,
    request: Request = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> EvidentiaryCertificateOut:
    """Generate official Evidentiary Traceability Certificate under MHA/NCRB guidelines."""
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    client_ip = request.client.host if request and request.client else None
    cert = audit_service.export_evidentiary_certificate(db=db, case_id=case.id)

    audit_service.record_audit_event(
        db=db,
        event_type="CERTIFICATE_GENERATED",
        action="Evidentiary traceability certificate generated",
        case_id=case.id,
        user=current_user,
        ip_address=client_ip,
        details={"certificate_id": cert["certificate_id"], "head_hash": cert["head_hash"]},
    )

    return EvidentiaryCertificateOut(**cert)


@router.post("/cases/{case_id}/note", status_code=201)
def add_case_diary_note(
    case_id: str,
    request: Request = None,
    note: str = Body(..., embed=True, min_length=1, max_length=5000),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Record a timestamped officer note into the immutable case audit chain (Investigation Case Diary)."""
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    client_ip = request.client.host if request and request.client else None
    audit_service.record_audit_event(
        db=db,
        event_type="CASE_NOTE",
        action=note,
        case_id=case.id,
        user=current_user,
        ip_address=client_ip,
        details={"note": note, "case_id": case.id},
    )
    return {"status": "recorded", "case_id": case.id}


@router.get("/cases/{case_id}/certificate/html")
def get_evidentiary_certificate_html(
    case_id: str,
    request: Request = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Serve court-admissible HTML printable certificate for direct printing or saving as PDF."""
    from fastapi.responses import HTMLResponse

    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    cert = audit_service.export_evidentiary_certificate(db=db, case_id=case.id)
    html_content = audit_service.generate_printable_certificate_html(cert)
    return HTMLResponse(content=html_content)
