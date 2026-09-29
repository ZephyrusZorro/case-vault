"""Case-scoped access policy, enforced by every document endpoint."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dms.models import CaseFile, CaseMember, User


def membership(db: Session, case_id: str, user_id: str) -> CaseMember | None:
    return db.scalar(select(CaseMember).where(CaseMember.case_id == case_id, CaseMember.user_id == user_id))


def can_view(db: Session, case: CaseFile, user: User) -> bool:
    return user.role in {"admin", "auditor"} or case.lead_user_id == user.id or membership(db, case.id, user.id) is not None


def can_edit(db: Session, case: CaseFile, user: User) -> bool:
    if user.role == "auditor":
        return False
    if user.role == "admin" or case.lead_user_id == user.id:
        return True
    member = membership(db, case.id, user.id)
    return member is not None and member.access == "editor"


def get_case(db: Session, case_id: str, user: User, write: bool = False) -> CaseFile:
    case = db.get(CaseFile, case_id)
    if case is None or not can_view(db, case, user):
        raise HTTPException(404, "Case not found.")
    if write and not can_edit(db, case, user):
        raise HTTPException(403, "You do not have edit access to this case.")
    if write and case.status == "archived":
        raise HTTPException(409, "Archived cases are read only. Reopen the case first.")
    return case
