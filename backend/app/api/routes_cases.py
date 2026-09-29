from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security import UploadValidationError
from app.db.base import get_db
from app.core.auth import (
    get_current_user_optional,
    require_roles,
    can_access_sealed_exhibit,
    check_clearance,
    get_user_clearance,
    verify_document_read_access,
    verify_document_modify_access,
    verify_document_delete_access,
    verify_case_delete_access,
)
from app.db.models import Case, Document, User
from app.schemas.cases import (
    CaseCreate,
    CaseCreated,
    CaseOut,
    CaseReviewRequest,
    CaseUpdate,
    DeleteResult,
    DocumentChainVerificationOut,
    DocumentMetadataUpdate,
    DocumentOut,
    DocumentVersionOut,
    LegalHoldRequest,
    SealExhibitRequest,
    UploadResult,
)
from app.schemas.documents import DocumentTypeUpdate
from app.services import case_service, upload_service
from app.services.audit_service import record_audit_event


router = APIRouter()


@router.post("/cases", response_model=CaseCreated, status_code=201)
def create_case(
    payload: CaseCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CaseCreated:
    """Create a new investigation case container."""
    # Check permissions if authenticated
    if current_user and current_user.role == "auditor":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Auditors have read-only access and cannot create cases.",
        )

    # Automatically associate the logged-in investigator if not specified
    investigators = list(payload.assigned_investigators)
    if current_user and not investigators:
        label = f"{current_user.name}"
        if current_user.badge_number:
            label += f" ({current_user.badge_number})"
        investigators.append(label)

    case = case_service.create_case(
        db=db,
        case_name=payload.case_name or payload.title,
        title=payload.title or payload.case_name,
        case_id=payload.case_id,
        case_type=payload.case_type,
        description=payload.description,
        department=payload.department,
        priority=payload.priority,
        assigned_investigators=investigators,
        status="open",
        lead_officer_id=current_user.id if current_user else None,
        created_by_id=current_user.id if current_user else None,
        applicant_name=payload.applicant_name,
        applicant_phone=payload.applicant_phone,
        applicant_email=payload.applicant_email,
        auto_notify_on_mismatch=payload.auto_notify_on_mismatch,
    )
    record_audit_event(
        db=db,
        event_type="CASE",
        action="CASE_CREATED",
        case_id=case.id,
        user=current_user,
        details={
            "case_id": case.case_id,
            "title": case.title,
            "case_type": case.case_type,
            "priority": case.priority,
            "department": case.department,
        },
    )
    return CaseCreated(
        id=case.id,
        case_number=case.case_number,
        case_id=case.case_id or f"CASE-2026-{case.case_number:05d}",
        case_name=case.case_name,
        title=case.title or case.case_name,
        case_type=case.case_type,
        department=case.department,
        priority=case.priority,
        assigned_investigators=case.assigned_investigators or [],
        status=case.status,
        applicant_name=case.applicant_name,
        applicant_phone=case.applicant_phone,
        applicant_email=case.applicant_email,
        auto_notify_on_mismatch=case.auto_notify_on_mismatch,
    )


@router.get("/cases", response_model=list[CaseOut])
def list_cases(
    search: str | None = None,
    case_type: str | None = None,
    department: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    outcome: str | None = None,
    sort: str = "recent",
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list[CaseOut]:
    """List investigation cases with multi-facet filters and sorting."""
    cases = case_service.list_cases(db, limit=500)

    def _person(c) -> str | None:
        return next(
            (
                f.raw_value
                for d in c.documents
                for f in d.fields
                if f.field_name == "full_name"
            ),
            None,
        )

    if search:
        q = search.strip().lower()
        def _matches(c) -> bool:
            cid = (c.case_id or "").lower()
            cname = (c.case_name or "").lower()
            ctitle = (c.title or "").lower()
            cdept = (c.department or "").lower()
            ctype = (c.case_type or "").lower()
            person = (_person(c) or c.applicant_name or "").lower()
            return (
                q in cid
                or q in cname
                or q in ctitle
                or q in cdept
                or q in ctype
                or q in person
                or q == f"#{c.case_number}"
            )
        cases = [c for c in cases if _matches(c)]

    if case_type and case_type != "all":
        cases = [c for c in cases if (c.case_type or "").lower() == case_type.lower()]

    if department and department != "all":
        cases = [c for c in cases if department.lower() in (c.department or "").lower()]

    if priority and priority != "all":
        cases = [c for c in cases if (c.priority or "").lower() == priority.lower()]

    if status and status != "all":
        cases = [c for c in cases if (c.status or "").lower() == status.lower()]

    if outcome and outcome != "all":
        mapping = {
            "valid": {"verification_passed"},
            "review": {"review_recommended"},
            "high_risk": {"manual_review_required"},
            "unable": {"unable_to_verify"},
        }
        allowed = mapping.get(outcome)
        if allowed:
            cases = [c for c in cases if c.recommendation in allowed]

    if sort == "priority":
        prio_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        cases.sort(key=lambda c: prio_order.get((c.priority or "medium").lower(), 9))
    elif sort == "risk_desc":
        cases.sort(key=lambda c: c.overall_risk if c.overall_risk is not None else -1, reverse=True)
    elif sort == "risk_asc":
        cases.sort(key=lambda c: c.overall_risk if c.overall_risk is not None else 999)
    else:  # recent = descending case number
        cases.sort(key=lambda c: c.case_number, reverse=True)

    cases = cases[: max(1, min(limit, 500))]
    return [CaseOut.from_model(c, person_name=_person(c), include_documents=False) for c in cases]


@router.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)) -> CaseOut:
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return CaseOut.from_model(case)


@router.patch("/cases/{case_id}", response_model=CaseOut)
def update_case_metadata(
    case_id: str,
    payload: CaseUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CaseOut:
    """Update case status, priority, department, description, or assigned officers."""
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    if current_user and current_user.role == "auditor":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Auditors cannot modify case records.",
        )

    updated = case_service.update_case(
        db=db,
        case=case,
        title=payload.title,
        case_type=payload.case_type,
        description=payload.description,
        department=payload.department,
        priority=payload.priority,
        status=payload.status,
        assigned_investigators=payload.assigned_investigators,
    )
    record_audit_event(
        db=db,
        event_type="CASE",
        action="CASE_UPDATED",
        case_id=case.id,
        user=current_user,
        details={
            "status": updated.status,
            "priority": updated.priority,
            "title": updated.title,
        },
    )
    return CaseOut.from_model(updated)


@router.post(
    "/cases/{case_id}/documents",
    response_model=UploadResult,
    status_code=201,
)
async def upload_documents(
    case_id: str,
    files: list[UploadFile] = File(...),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> UploadResult:
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    if current_user and current_user.role == "auditor":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Auditors cannot upload documents.",
        )

    uploaded: list[DocumentOut] = []
    failed: list[dict] = []
    for upload in files:
        try:
            doc = await upload_service.save_upload(db, case, upload, current_user=current_user)
            uploaded.append(DocumentOut.from_model(doc))
            record_audit_event(
                db=db,
                event_type="DOCUMENT",
                action="DOCUMENT_UPLOADED",
                case_id=case.id,
                document_id=doc.id,
                user=current_user,
                details={
                    "file_name": doc.file_name,
                    "sha256_hash": doc.file_hash,
                    "file_size": doc.file_size,
                    "document_type": doc.document_type,
                    "exhibit_number": doc.exhibit_number,
                },
            )
        except UploadValidationError as exc:
            failed.append({"file_name": upload.filename, "error": str(exc)})
        finally:
            await upload.close()

    if not uploaded and failed:
        raise HTTPException(status_code=422, detail={"failed": failed})
    return UploadResult(case_id=case.id, uploaded=uploaded, failed=failed)


@router.get("/documents/{document_id}/file")
def get_document_file(
    document_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> FileResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_read_access(current_user, doc)

    try:
        path = upload_service.get_document_file_path(doc)
    except UploadValidationError:
        raise HTTPException(status_code=400, detail="Invalid file path.") from None
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file is missing.")
    return FileResponse(path, media_type=doc.mime_type or "application/octet-stream")


@router.post("/documents/{document_id}/versions", response_model=DocumentVersionOut, status_code=201)
async def upload_document_version(
    document_id: str,
    file: UploadFile = File(...),
    version_tag: str = Form("certified_copy"),
    change_summary: str | None = Form(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> DocumentVersionOut:
    """Upload and append a new cryptographically chained version of an exhibit."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_modify_access(current_user, doc)

    try:
        version = await upload_service.add_document_version(
            db=db,
            doc=doc,
            upload=file,
            version_tag=version_tag,
            change_summary=change_summary,
            current_user=current_user,
        )
        record_audit_event(
            db=db,
            event_type="DOCUMENT_VERSION",
            action="DOCUMENT_VERSION_ADDED",
            case_id=doc.case_id,
            document_id=doc.id,
            user=current_user,
            details={
                "version_number": version.version_number,
                "sha256_hash": version.sha256_hash,
                "previous_version_hash": version.previous_version_hash,
                "version_tag": version.version_tag,
                "change_summary": version.change_summary,
            },
        )
        return DocumentVersionOut.from_model(version)
    except UploadValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    finally:
        await file.close()


@router.get("/documents/{document_id}/versions", response_model=list[DocumentVersionOut])
def list_document_versions(
    document_id: str,
    db: Session = Depends(get_db),
) -> list[DocumentVersionOut]:
    """Retrieve full version history and cryptographic predecessor hashes for an exhibit."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    from sqlalchemy import select
    from app.db.models import DocumentVersion

    versions = list(
        db.scalars(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == doc.id)
            .order_by(DocumentVersion.version_number.asc())
        ).all()
    )
    return [DocumentVersionOut.from_model(v) for v in versions]


@router.get("/documents/{document_id}/versions/verify", response_model=DocumentChainVerificationOut)
def verify_document_version_chain(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentChainVerificationOut:
    """Verify cryptographic sequence integrity and on-disk SHA-256 hashes of all versions."""
    from datetime import datetime, timezone

    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    report = upload_service.verify_document_chain(db, doc)
    return DocumentChainVerificationOut(
        document_id=doc.id,
        is_valid=report["is_valid"],
        version_count=report["version_count"],
        chain=[DocumentVersionOut.from_model(v) for v in report["versions"]],
        errors=report["errors"],
        verified_at=datetime.now(timezone.utc),
    )


@router.get("/documents/{document_id}/versions/{version_number}/file")
def get_document_version_file(
    document_id: str,
    version_number: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download/view a specific historical version of an exhibit."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_read_access(current_user, doc)

    from sqlalchemy import select
    from app.db.models import DocumentVersion

    version = db.scalar(
        select(DocumentVersion)
        .where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number,
        )
    )
    if version is None:
        raise HTTPException(status_code=404, detail=f"Version v{version_number} not found.")

    try:
        path = upload_service.get_version_file_path(version)
    except UploadValidationError:
        raise HTTPException(status_code=400, detail="Invalid version file path.") from None

    if not path.is_file():
        raise HTTPException(status_code=404, detail="Version file is missing on storage.")

    return FileResponse(
        path,
        media_type=version.mime_type or "application/octet-stream",
        filename=version.file_name,
    )


@router.patch("/documents/{document_id}/metadata", response_model=DocumentOut)
def update_document_metadata(
    document_id: str,
    payload: DocumentMetadataUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Update legal exhibit categorization, classification level, exhibit number, or seal status."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_modify_access(current_user, doc)

    if payload.exhibit_number is not None:
        doc.exhibit_number = payload.exhibit_number.strip() or None
    if payload.legal_category is not None:
        doc.legal_category = payload.legal_category.strip() or None
    if payload.classification_level is not None:
        doc.classification_level = payload.classification_level.strip().lower()
    if payload.is_sealed is not None:
        # Only admins or supervisors can seal / unseal an exhibit
        if current_user and current_user.role not in {"admin", "supervisor", "reviewer"}:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Only administrators or supervisors can seal/unseal legal exhibits.",
            )
        doc.is_sealed = payload.is_sealed
    if payload.retention_period_years is not None:
        doc.retention_period_years = payload.retention_period_years

    db.commit()
    db.refresh(doc)
    record_audit_event(
        db=db,
        event_type="DOCUMENT_METADATA",
        action="EXHIBIT_METADATA_UPDATED",
        case_id=doc.case_id,
        document_id=doc.id,
        user=current_user,
        details={
            "exhibit_number": doc.exhibit_number,
            "legal_category": doc.legal_category,
            "classification_level": doc.classification_level,
            "is_sealed": doc.is_sealed,
            "retention_period_years": doc.retention_period_years,
        },
    )
    return DocumentOut.from_model(doc)


@router.delete("/documents/{document_id}", response_model=DeleteResult)
def delete_document(
    document_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> DeleteResult:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    verify_document_delete_access(current_user, doc)

    case_id = doc.case_id
    doc_id = doc.id
    file_name = doc.file_name
    upload_service.delete_document(db, doc)

    record_audit_event(
        db=db,
        event_type="DOCUMENT",
        action="DOCUMENT_DELETED",
        case_id=case_id,
        document_id=doc_id,
        user=current_user,
        details={"file_name": file_name},
    )
    return DeleteResult(deleted=True)


@router.patch("/documents/{document_id}/type", response_model=DocumentOut)
@router.patch("/cases/{case_id}/documents/{document_id}/type", response_model=DocumentOut)
def update_document_type(
    document_id: str,
    payload: DocumentTypeUpdate,
    case_id: str | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Allow user/system to correct or override document type."""
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if case_id and doc.case_id != case_id:
        raise HTTPException(status_code=404, detail="Document does not belong to specified case.")

    clean_type = payload.document_type.strip().lower().replace(" ", "_")
    doc.document_type = clean_type
    doc.type_confidence = 1.0  # Explicit manual override
    db.commit()
    db.refresh(doc)

    record_audit_event(
        db=db,
        event_type="DOCUMENT",
        action="DOCUMENT_TYPE_UPDATED",
        case_id=doc.case_id,
        document_id=doc.id,
        user=current_user,
        details={"document_type": clean_type},
    )
    return DocumentOut.from_model(doc)


@router.post("/cases/{case_id}/review", response_model=CaseOut)
def submit_case_review(
    case_id: str,
    payload: CaseReviewRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> CaseOut:
    """Record an official human verifier decision (approved, rejected, needs_further_review)."""
    from datetime import datetime, timezone
    from app.core.logging import get_logger
    log = get_logger("idshield.cases")

    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    valid_decisions = {"approved", "rejected", "needs_further_review", "pending_review"}
    clean_decision = payload.decision.strip().lower()
    if clean_decision not in valid_decisions:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid decision '{payload.decision}'. Must be one of: {sorted(valid_decisions)}",
        )

    case.review_status = clean_decision
    case.reviewer_name = payload.reviewer_name or (current_user.name if current_user else "Verification Officer")
    case.reviewer_notes = payload.notes or ""
    case.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)

    record_audit_event(
        db=db,
        event_type="CASE_REVIEW",
        action="CASE_REVIEWED",
        case_id=case.id,
        user=current_user,
        details={
            "decision": clean_decision,
            "reviewer_name": case.reviewer_name,
            "notes": case.reviewer_notes,
        },
    )

    log.info(
        "CASE_REVIEW_RECORDED | case_id=%s decision=%s reviewer=%s",
        case.id, clean_decision, case.reviewer_name,
    )
    return CaseOut.from_model(case)


@router.post("/documents/{document_id}/seal", response_model=DocumentOut)
def seal_or_unseal_document(
    document_id: str,
    payload: SealExhibitRequest,
    current_user: User = Depends(require_roles(["admin", "supervisor", "reviewer"])),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Seal or unseal a legal exhibit under judicial or investigation order."""
    from datetime import datetime, timezone
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_sealing = payload.action.lower() == "seal"
    doc.is_sealed = is_sealing
    doc.sealed_reason = payload.reason
    doc.sealed_by = f"{current_user.name} ({current_user.badge_number or current_user.role})"
    doc.sealed_at = datetime.now(timezone.utc) if is_sealing else None

    db.commit()
    db.refresh(doc)

    record_audit_event(
        db=db,
        event_type="EXHIBIT_SEAL",
        action="EXHIBIT_SEALED" if is_sealing else "EXHIBIT_UNSEALED",
        case_id=doc.case_id,
        document_id=doc.id,
        user=current_user,
        details={
            "action": payload.action,
            "reason": payload.reason,
            "officer": doc.sealed_by,
        },
    )
    return DocumentOut.from_model(doc)


@router.post("/documents/{document_id}/legal-hold", response_model=DocumentOut)
def document_legal_hold_toggle(
    document_id: str,
    payload: LegalHoldRequest,
    current_user: User = Depends(require_roles(["admin", "supervisor", "reviewer", "legal_officer"])),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Apply or lift evidentiary retention legal hold on an exhibit."""
    from datetime import datetime, timezone
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_applying = payload.action.lower() == "apply"
    doc.legal_hold = is_applying
    doc.legal_hold_reason = payload.reason if is_applying else None
    doc.legal_hold_applied_by = f"{current_user.name} ({current_user.badge_number or current_user.role})" if is_applying else None
    doc.legal_hold_applied_at = datetime.now(timezone.utc) if is_applying else None

    db.commit()
    db.refresh(doc)

    record_audit_event(
        db=db,
        event_type="LEGAL_HOLD",
        action="LEGAL_HOLD_APPLIED" if is_applying else "LEGAL_HOLD_LIFTED",
        case_id=doc.case_id,
        document_id=doc.id,
        user=current_user,
        details={
            "action": payload.action,
            "reason": payload.reason,
            "officer": f"{current_user.name} ({current_user.role})",
        },
    )
    return DocumentOut.from_model(doc)


@router.post("/cases/{case_id}/legal-hold", response_model=CaseOut)
def case_legal_hold_toggle(
    case_id: str,
    payload: LegalHoldRequest,
    current_user: User = Depends(require_roles(["admin", "supervisor", "reviewer", "legal_officer"])),
    db: Session = Depends(get_db),
) -> CaseOut:
    """Apply or lift formal legal hold across an entire investigation case container."""
    from datetime import datetime, timezone
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    is_applying = payload.action.lower() == "apply"
    case.legal_hold = is_applying
    case.legal_hold_reason = payload.reason if is_applying else None
    case.legal_hold_applied_by = f"{current_user.name} ({current_user.badge_number or current_user.role})" if is_applying else None
    case.legal_hold_applied_at = datetime.now(timezone.utc) if is_applying else None

    db.commit()
    db.refresh(case)

    record_audit_event(
        db=db,
        event_type="LEGAL_HOLD",
        action="CASE_LEGAL_HOLD_APPLIED" if is_applying else "CASE_LEGAL_HOLD_LIFTED",
        case_id=case.id,
        user=current_user,
        details={
            "action": payload.action,
            "reason": payload.reason,
            "officer": f"{current_user.name} ({current_user.role})",
        },
    )
    return CaseOut.from_model(case)


# ---------------------------------------------------------------- Workflow Approval Chain
WORKFLOW_TRANSITIONS: dict[str, dict] = {
    "submit_for_review": {
        "roles": ["admin", "investigator"],
        "from": ["open", "under_investigation"],
        "next": "pending_review",
        "audit": "WORKFLOW_SUBMITTED_FOR_REVIEW",
        "label": "Submitted for Supervisor Review",
    },
    "supervisor_approve": {
        "roles": ["admin", "supervisor"],
        "from": ["pending_review"],
        "next": "pending_legal_review",
        "audit": "WORKFLOW_SUPERVISOR_APPROVED",
        "label": "Supervisor Approved — Forwarded for Legal Review",
    },
    "supervisor_reject": {
        "roles": ["admin", "supervisor"],
        "from": ["pending_review"],
        "next": "under_investigation",
        "audit": "WORKFLOW_SUPERVISOR_REJECTED",
        "label": "Supervisor Rejected — Returned to Investigator",
    },
    "legal_approve": {
        "roles": ["admin", "legal_officer", "supervisor"],
        "from": ["pending_legal_review"],
        "next": "court_ready",
        "audit": "WORKFLOW_LEGAL_APPROVED",
        "label": "Legal Officer Approved — Case Marked Court Ready",
    },
    "legal_reject": {
        "roles": ["admin", "legal_officer", "supervisor"],
        "from": ["pending_legal_review"],
        "next": "pending_review",
        "audit": "WORKFLOW_LEGAL_REJECTED",
        "label": "Legal Officer Rejected — Returned for Supervisor Re-Review",
    },
    "reopen": {
        "roles": ["admin", "supervisor"],
        "from": ["closed", "court_ready", "archived"],
        "next": "under_investigation",
        "audit": "WORKFLOW_REOPENED",
        "label": "Case Reopened for Further Investigation",
    },
    "close": {
        "roles": ["admin", "supervisor", "legal_officer"],
        "from": ["court_ready", "pending_review", "pending_legal_review", "under_investigation", "open"],
        "next": "closed",
        "audit": "WORKFLOW_CLOSED",
        "label": "Case Closed",
    },
    "archive": {
        "roles": ["admin", "supervisor"],
        "from": ["closed"],
        "next": "archived",
        "audit": "WORKFLOW_ARCHIVED",
        "label": "Case Archived",
    },
}


from pydantic import BaseModel as _BaseModel

class WorkflowActionRequest(_BaseModel):
    action: str
    remarks: str | None = None


@router.post("/cases/{case_id}/workflow", response_model=CaseOut)
def advance_case_workflow(
    case_id: str,
    payload: WorkflowActionRequest,
    current_user: User = Depends(require_roles(["admin", "investigator", "supervisor", "legal_officer"])),
    db: Session = Depends(get_db),
):
    """Advance the investigation case through the multi-role approval workflow chain."""
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    transition = WORKFLOW_TRANSITIONS.get(payload.action)
    if not transition:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown workflow action '{payload.action}'. Valid: {list(WORKFLOW_TRANSITIONS.keys())}",
        )

    if current_user.role not in transition["roles"]:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{current_user.role}' cannot perform '{payload.action}'. Required: {transition['roles']}",
        )

    if case.status not in transition["from"]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot perform '{payload.action}' when case is in status '{case.status}'. Expected: {transition['from']}",
        )

    from datetime import datetime, timezone
    prev_status = case.status
    case.status = transition["next"]

    if payload.action in ("supervisor_approve", "supervisor_reject", "legal_approve", "legal_reject"):
        case.reviewer_name = f"{current_user.name} ({current_user.badge_number or current_user.role})"
        case.reviewer_notes = payload.remarks or ""
        case.reviewed_at = datetime.now(timezone.utc)
        case.review_status = "approved" if "approve" in payload.action else "rejected"

    case.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)

    record_audit_event(
        db=db,
        event_type="WORKFLOW",
        action=transition["audit"],
        case_id=case.id,
        user=current_user,
        details={
            "action": payload.action,
            "prev_status": prev_status,
            "new_status": case.status,
            "officer": f"{current_user.name} ({current_user.role})",
            "remarks": payload.remarks or "",
            "label": transition["label"],
        },
    )
    return CaseOut.from_model(case)


@router.get("/cases/{case_id}/workflow/history")
def get_workflow_history(
    case_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Return workflow transition history from the audit chain."""
    from app.services import audit_service as _audit
    case = case_service.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    events = _audit.list_audit_events(db=db, case_id=case.id, limit=200)
    return [
        {
            "id": e.id,
            "sequence": e.sequence_number,
            "event_type": e.event_type,
            "action": e.action,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "user_name": e.user_name,
            "user_role": e.user_role,
            "details": e.details or {},
            "hash_prefix": (e.current_hash or "")[:12],
        }
        for e in events
        if e.event_type in ("WORKFLOW", "CASE")
    ]
