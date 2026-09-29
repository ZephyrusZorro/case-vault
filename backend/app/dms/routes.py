"""Authenticated legal document management API."""
import hmac
from datetime import timedelta
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import get_db
from app.dms import audit, evidence
from app.dms import demo
from app.dms.access import can_edit, can_view, get_case, membership
from app.dms.models import AuditEvent, CaseFile, CaseMember, CaseNote, Document, DocumentSearchTerm, DocumentVersion, InstallationMeta, Review, SessionToken, User, now
from app.dms.schemas import AccountInput, CaseInput, CaseUpdate, LoginInput, MemberInput, NewUser, NoteInput, PasswordChange, ReviewDecision, ReviewInput
from app.dms.security import current_user, hash_password, issue_session, require_admin, revoke_session, setup_token, verify_password

router = APIRouter(prefix="/api")


def user_out(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "active": user.active}


def version_out(version: DocumentVersion) -> dict:
    return {"id": version.id, "number": version.number, "filename": version.filename, "mime_type": version.mime_type, "byte_size": version.byte_size, "sha256": version.sha256, "extraction_status": version.extraction_status, "created_at": version.created_at, "uploaded_by": version.uploaded_by}


def document_out(doc: Document, case: CaseFile | None = None) -> dict:
    latest = doc.versions[-1] if doc.versions else None
    return {"id": doc.id, "case_id": doc.case_id, "case_reference": case.reference if case else doc.case.reference, "title": doc.title, "kind": doc.kind, "classification": doc.classification, "created_at": doc.created_at, "created_by": doc.created_by, "latest": version_out(latest) if latest else None, "versions": [version_out(v) for v in reversed(doc.versions)]}


def case_out(db: Session, case: CaseFile, user: User, detailed: bool = False) -> dict:
    result = {"id": case.id, "reference": case.reference, "title": case.title, "description": case.description, "category": case.category, "classification": case.classification, "status": case.status, "legal_hold": case.legal_hold, "retention_until": case.retention_until, "lead_user_id": case.lead_user_id, "created_at": case.created_at, "updated_at": case.updated_at, "document_count": len(case.documents), "can_edit": case.status != "archived" and can_edit(db, case, user), "can_reopen": case.status == "archived" and (user.role == "admin" or case.lead_user_id == user.id)}
    if detailed:
        result["documents"] = [document_out(doc, case) for doc in sorted(case.documents, key=lambda d: d.created_at, reverse=True)]
        result["members"] = [{"user": user_out(m.user), "access": m.access} for m in case.members]
        notes = db.scalars(select(CaseNote).where(CaseNote.case_id == case.id).order_by(CaseNote.created_at.desc())).all()
        result["notes"] = [{"id": n.id, "body": n.body, "created_at": n.created_at, "author": user_out(n.author)} for n in notes]
        reviews = db.scalars(select(Review).where(Review.case_id == case.id).order_by(Review.created_at.desc())).all()
        result["reviews"] = [{"id": r.id, "status": r.status, "note": r.note, "assigned_to": r.assigned_to, "assigned_name": db.get(User, r.assigned_to).name if db.get(User, r.assigned_to) else "Unknown", "due_at": r.due_at, "created_at": r.created_at, "completed_at": r.completed_at} for r in reviews]
    return result


def visible_cases(db: Session, user: User):
    query = select(CaseFile)
    if user.role not in {"admin", "auditor"}:
        member_ids = select(CaseMember.case_id).where(CaseMember.user_id == user.id)
        query = query.where(or_(CaseFile.lead_user_id == user.id, CaseFile.id.in_(member_ids)))
    return query


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@router.get("/auth/state")
def auth_state(db: Session = Depends(get_db)) -> dict:
    return {"initialized": db.scalar(select(func.count()).select_from(User)) > 0}


@router.post("/auth/setup", status_code=201)
def setup(payload: AccountInput, x_setup_token: str = Header(default=""), db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(func.count()).select_from(User)):
        raise HTTPException(409, "Workspace is already initialized.")
    if not hmac.compare_digest(x_setup_token, setup_token()):
        raise HTTPException(403, "Invalid setup token. Check backend/data/casevault.setup-token or DMS_SETUP_TOKEN.")
    user = User(name=payload.name.strip(), email=payload.email.lower(), password_hash=hash_password(payload.password), role="admin")
    try:
        db.add(user)
        db.flush()
        db.add(InstallationMeta(key="admin_initialized", value=user.id))
        db.flush()
        audit.record(db, user.id, None, "workspace.initialized", user.id)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Workspace is already initialized.") from exc
    return {"token": issue_session(db, user), "user": user_out(user)}


@router.post("/auth/login")
def login(payload: LoginInput, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    invalid = HTTPException(401, "Invalid email or password.")
    if user is None or not user.active:
        raise invalid
    if user.locked_until and user.locked_until.replace(tzinfo=None) > now().replace(tzinfo=None):
        raise HTTPException(429, "Account temporarily locked. Try again later.")
    if not verify_password(payload.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = now() + timedelta(minutes=15)
            user.failed_attempts = 0
        db.commit()
        raise invalid
    user.failed_attempts = 0
    user.locked_until = None
    audit.record(db, user.id, None, "auth.login", user.id)
    db.commit()
    return {"token": issue_session(db, user), "user": user_out(user)}


@router.post("/auth/logout")
def logout(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    audit.record(db, user.id, None, "auth.logout", user.id)
    db.commit()
    revoke_session(db, request.headers["Authorization"][7:])
    return {"ok": True}


@router.get("/auth/me")
def me(user: User = Depends(current_user)) -> dict:
    return user_out(user)


@router.post("/auth/change-password")
def change_password(payload: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(403, "Current password is incorrect.")
    if payload.new_password == payload.current_password:
        raise HTTPException(422, "Choose a different password.")
    user.password_hash = hash_password(payload.new_password)
    db.execute(delete(SessionToken).where(SessionToken.user_id == user.id))
    audit.record(db, user.id, None, "auth.password_changed", user.id)
    db.commit()
    return {"token": issue_session(db, user)}


@router.get("/users")
def users(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    return [user_out(item) for item in db.scalars(select(User).where(User.active.is_(True)).order_by(User.name))]


@router.post("/users", status_code=201)
def create_user(payload: NewUser, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(409, "Email already exists.")
    user = User(name=payload.name.strip(), email=payload.email.lower(), password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.flush()
    audit.record(db, admin.id, None, "user.created", user.id, {"role": user.role})
    db.commit()
    return user_out(user)


@router.get("/summary")
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    cases = db.scalars(visible_cases(db, user).order_by(CaseFile.updated_at.desc())).all()
    ids = [case.id for case in cases]
    docs = db.scalars(select(Document).where(Document.case_id.in_(ids))).all() if ids else []
    pending = db.scalars(select(Review).where(Review.assigned_to == user.id, Review.status == "pending")).all()
    recent = db.scalars(select(AuditEvent).where(AuditEvent.case_id.in_(ids)).order_by(AuditEvent.id.desc()).limit(6)).all() if ids else []
    return {"total_cases": len(cases), "active_cases": sum(c.status in {"active", "under_review"} for c in cases), "documents": len(docs), "pending_reviews": len(pending), "legal_holds": sum(c.legal_hold for c in cases), "recent_cases": [case_out(db, c, user) for c in cases[:5]], "recent_activity": [audit_out(db, e) for e in recent]}


@router.get("/cases")
def list_cases(search: str = "", status: str = "all", limit: int = Query(100, ge=1, le=200), user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    query = visible_cases(db, user)
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(CaseFile.reference.ilike(term), CaseFile.title.ilike(term), CaseFile.description.ilike(term)))
    if status != "all":
        query = query.where(CaseFile.status == status)
    return [case_out(db, case, user) for case in db.scalars(query.order_by(CaseFile.updated_at.desc()).limit(limit))]


@router.post("/cases", status_code=201)
def create_case(payload: CaseInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if user.role == "auditor":
        raise HTTPException(403, "Auditors cannot create cases.")
    reference = payload.reference.upper()
    if db.scalar(select(CaseFile).where(CaseFile.reference == reference)):
        raise HTTPException(409, "Case reference already exists.")
    case = CaseFile(reference=reference, title=payload.title.strip(), description=payload.description.strip(), category=payload.category, classification=payload.classification, retention_until=payload.retention_until, lead_user_id=user.id)
    db.add(case)
    db.flush()
    db.add(CaseMember(case_id=case.id, user_id=user.id, access="editor"))
    audit.record(db, user.id, case.id, "case.created", case.id, {"reference": reference})
    db.commit()
    db.refresh(case)
    return case_out(db, case, user, True)


@router.get("/cases/{case_id}")
def case_detail(case_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return case_out(db, get_case(db, case_id, user), user, True)


@router.patch("/cases/{case_id}")
def update_case(case_id: str, payload: CaseUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user)
    if not can_edit(db, case, user):
        raise HTTPException(403, "You do not have edit access to this case.")
    changes = payload.model_dump(exclude_unset=True)
    if case.status == "archived" and (changes != {"status": "active"} or (user.role != "admin" and case.lead_user_id != user.id)):
        raise HTTPException(409, "Only the case lead or admin can reopen an archived case.")
    if "legal_hold" in changes and user.role != "admin" and case.lead_user_id != user.id:
        raise HTTPException(403, "Only the case lead or admin can change legal hold.")
    if changes.get("status") == "archived" and changes.get("legal_hold", case.legal_hold):
        raise HTTPException(409, "Release legal hold before archiving this case.")
    for key, value in changes.items():
        setattr(case, key, value)
    case.updated_at = now()
    audit.record(db, user.id, case.id, "case.updated", case.id, {"fields": list(changes), "status": case.status, "legal_hold": case.legal_hold})
    db.commit()
    return case_out(db, case, user, True)


@router.post("/cases/{case_id}/members")
def add_member(case_id: str, payload: MemberInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user, write=True)
    if user.role != "admin" and case.lead_user_id != user.id:
        raise HTTPException(403, "Only the case lead or admin can manage access.")
    target = db.get(User, payload.user_id)
    if target is None or not target.active:
        raise HTTPException(404, "User not found.")
    if target.role == "auditor" and payload.access == "editor":
        raise HTTPException(422, "Auditors cannot receive edit access.")
    member = membership(db, case_id, target.id)
    if member:
        member.access = payload.access
    else:
        db.add(CaseMember(case_id=case_id, user_id=target.id, access=payload.access))
    audit.record(db, user.id, case_id, "access.granted", target.id, {"access": payload.access})
    db.commit()
    return case_out(db, case, user, True)


@router.delete("/cases/{case_id}/members/{member_id}")
def remove_member(case_id: str, member_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user, write=True)
    if user.role != "admin" and case.lead_user_id != user.id:
        raise HTTPException(403, "Only the case lead or admin can manage access.")
    if member_id == case.lead_user_id:
        raise HTTPException(409, "Case lead access cannot be removed.")
    member = membership(db, case_id, member_id)
    if member is None:
        raise HTTPException(404, "Case member not found.")
    db.delete(member)
    audit.record(db, user.id, case_id, "access.revoked", member_id)
    db.commit()
    return case_out(db, case, user, True)


@router.post("/cases/{case_id}/notes", status_code=201)
def add_note(case_id: str, payload: NoteInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user, write=True)
    note = CaseNote(case_id=case_id, author_id=user.id, body=payload.body.strip())
    db.add(note)
    case.updated_at = now()
    db.flush()
    audit.record(db, user.id, case_id, "note.added", note.id)
    db.commit()
    return {"id": note.id, "body": note.body, "created_at": note.created_at, "author": user_out(user)}


@router.post("/cases/{case_id}/reviews", status_code=201)
def request_review(case_id: str, payload: ReviewInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user, write=True)
    assignee = db.get(User, payload.assigned_to)
    if assignee is None or not assignee.active or not can_view(db, case, assignee):
        raise HTTPException(422, "Reviewer must have access to this case.")
    review = Review(case_id=case_id, requested_by=user.id, assigned_to=assignee.id, due_at=payload.due_at, note=payload.note.strip())
    db.add(review)
    case.status = "under_review"
    case.updated_at = now()
    db.flush()
    audit.record(db, user.id, case_id, "review.requested", review.id, {"assigned_to": assignee.id})
    db.commit()
    return {"id": review.id, "status": review.status}


@router.patch("/reviews/{review_id}")
def decide_review(review_id: str, payload: ReviewDecision, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(404, "Review not found.")
    case = get_case(db, review.case_id, user)
    if case.status == "archived":
        raise HTTPException(409, "Archived cases are read only.")
    if review.assigned_to != user.id and user.role != "admin":
        raise HTTPException(403, "Only the assigned reviewer can decide.")
    if review.status != "pending":
        raise HTTPException(409, "Review has already been decided.")
    review.status = payload.status
    review.note = payload.note.strip()
    review.completed_at = now()
    case.status = "closed" if payload.status == "approved" else "active"
    case.updated_at = now()
    audit.record(db, user.id, case.id, "review.decided", review.id, {"decision": payload.status})
    db.commit()
    return {"id": review.id, "status": review.status, "case_status": case.status}


def _document(db: Session, document_id: str, user: User, write: bool = False) -> tuple[Document, CaseFile]:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(404, "Document not found.")
    return doc, get_case(db, doc.case_id, user, write=write)


async def _save_version(db: Session, doc: Document, user: User, upload: UploadFile) -> DocumentVersion:
    filename, mime, data, digest, text, extraction_status = await evidence.prepare(upload)
    next_number = max((v.number for v in doc.versions), default=0) + 1
    key = evidence.store(data)
    try:
        version = DocumentVersion(document_id=doc.id, number=next_number, filename=filename, mime_type=mime, byte_size=len(data), sha256=digest, storage_key=key, encrypted_text=evidence.encrypt_text(text), extraction_status=extraction_status, uploaded_by=user.id)
        db.add(version)
        db.flush()
        db.add_all(DocumentSearchTerm(version_id=version.id, token_hash=token) for token in evidence.search_tokens(text))
        audit.record(db, user.id, doc.case_id, "document.version_uploaded", version.id, {"document_id": doc.id, "version": next_number, "sha256": digest})
        db.commit()
        db.refresh(doc)
        return version
    except Exception:
        db.rollback()
        evidence.storage_path(key).unlink(missing_ok=True)
        raise


@router.post("/cases/{case_id}/documents", status_code=201)
async def upload_document(case_id: str, file: UploadFile = File(...), title: str = Form(""), kind: str = Form("other"), classification: str = Form("confidential"), user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    case = get_case(db, case_id, user, write=True)
    if classification not in {"internal", "confidential", "restricted"}:
        raise HTTPException(422, "Invalid classification.")
    if kind not in {"fir", "police_report", "witness_statement", "charge_sheet", "court_filing", "evidence", "forensic_report", "legal_notice", "judgment", "other"}:
        raise HTTPException(422, "Invalid document type.")
    clean_title = (title.strip() or file.filename or "Untitled document")[:240]
    doc = Document(case_id=case_id, title=clean_title, kind=kind, classification=classification, created_by=user.id)
    db.add(doc)
    db.flush()
    try:
        await _save_version(db, doc, user, file)
    except Exception:
        db.rollback()
        raise
    case.updated_at = now()
    audit.record(db, user.id, case_id, "document.created", doc.id, {"kind": kind})
    db.commit()
    return document_out(doc, case)


@router.post("/documents/{document_id}/versions", status_code=201)
async def upload_version(document_id: str, file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    doc, case = _document(db, document_id, user, write=True)
    await _save_version(db, doc, user, file)
    case.updated_at = now()
    db.commit()
    return document_out(doc, case)


@router.get("/documents")
def list_documents(search: str = "", kind: str = "all", limit: int = Query(100, ge=1, le=200), user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    ids = select(CaseFile.id).where(CaseFile.id.in_(visible_cases(db, user).with_only_columns(CaseFile.id)))
    query = select(Document).where(Document.case_id.in_(ids))
    if kind != "all":
        query = query.where(Document.kind == kind)
    if search.strip():
        term = f"%{search.strip()}%"
        tokens = evidence.search_tokens(search)
        matching_text_versions = select(DocumentSearchTerm.version_id).where(DocumentSearchTerm.token_hash.in_(tokens)).group_by(DocumentSearchTerm.version_id).having(func.count(DocumentSearchTerm.token_hash) == len(tokens)) if tokens else select(DocumentSearchTerm.version_id).where(False)
        matching_versions = select(DocumentVersion.document_id).where(or_(DocumentVersion.filename.ilike(term), DocumentVersion.id.in_(matching_text_versions)))
        query = query.where(or_(Document.title.ilike(term), Document.id.in_(matching_versions)))
    return [document_out(doc) for doc in db.scalars(query.order_by(Document.created_at.desc()).limit(limit))]


@router.get("/documents/{document_id}")
def document_detail(document_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    doc, case = _document(db, document_id, user)
    return document_out(doc, case)


def _version(db: Session, document_id: str, version_id: str, user: User) -> tuple[Document, DocumentVersion]:
    doc, _ = _document(db, document_id, user)
    version = db.get(DocumentVersion, version_id)
    if version is None or version.document_id != doc.id:
        raise HTTPException(404, "Version not found.")
    return doc, version


@router.get("/documents/{document_id}/versions/{version_id}/verify")
def verify_version(document_id: str, version_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    doc, version = _version(db, document_id, version_id, user)
    evidence.read(version)
    audit.record(db, user.id, doc.case_id, "document.verified", version.id)
    db.commit()
    return {"verified": True, "sha256": version.sha256, "version": version.number}


@router.get("/documents/{document_id}/versions/{version_id}/download")
def download_version(document_id: str, version_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    doc, version = _version(db, document_id, version_id, user)
    data = evidence.read(version)
    audit.record(db, user.id, doc.case_id, "document.downloaded", version.id)
    db.commit()
    return Response(data, media_type=version.mime_type, headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(version.filename)}", "Cache-Control": "no-store"})


def audit_out(db: Session, event: AuditEvent) -> dict:
    actor = db.get(User, event.actor_id) if event.actor_id else None
    return {"id": event.id, "case_id": event.case_id, "action": event.action, "target_id": event.target_id, "details": event.details, "actor_name": actor.name if actor else "System", "created_at": event.created_at, "event_hash": event.event_hash}


@router.get("/audit")
def audit_events(case_id: str | None = None, limit: int = Query(100, ge=1, le=300), user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    query = select(AuditEvent)
    if case_id:
        get_case(db, case_id, user)
        query = query.where(AuditEvent.case_id == case_id)
    elif user.role not in {"admin", "auditor"}:
        ids = visible_cases(db, user).with_only_columns(CaseFile.id)
        query = query.where(AuditEvent.case_id.in_(ids))
    return [audit_out(db, event) for event in db.scalars(query.order_by(AuditEvent.id.desc()).limit(limit))]


@router.get("/audit/verify")
def verify_audit(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if user.role not in {"admin", "auditor"}:
        raise HTTPException(403, "Audit verification requires admin or auditor access.")
    return audit.verify(db)


@router.post("/demo/seed")
def seed_demo(admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    created = demo.seed(db, admin)
    return {"created": created, "message": "Synthetic case files added." if created else "Sample files already exist."}
