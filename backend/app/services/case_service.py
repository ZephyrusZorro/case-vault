from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Case

CASE_NUMBER_START = 1000


def next_case_number(db: Session) -> int:
    current_max = db.scalar(select(func.max(Case.case_number)))
    return (current_max or CASE_NUMBER_START) + 1


def create_case(
    db: Session,
    case_name: str | None = None,
    title: str | None = None,
    case_id: str | None = None,
    case_type: str = "Women Safety Investigation",
    description: str | None = None,
    department: str = "NCRB Women Safety Division",
    priority: str = "medium",
    assigned_investigators: list[str] | None = None,
    status: str = "open",
    lead_officer_id: str | None = None,
    created_by_id: str | None = None,
    applicant_name: str | None = None,
    applicant_phone: str | None = None,
    applicant_email: str | None = None,
    auto_notify_on_mismatch: bool = False,
) -> Case:
    """Create a new investigation case dossier."""
    clean_title = (title or case_name or "Investigation Case").strip()
    invs = assigned_investigators or []

    # Retry on unique-constraint collisions so two concurrent creates
    # (same max number) cannot surface as an unhandled 500.
    for _ in range(5):
        num = next_case_number(db)
        cid = (case_id or f"CASE-2026-{num:05d}").strip()
        case = Case(
            case_number=num,
            case_id=cid,
            case_name=clean_title,
            title=clean_title,
            case_type=case_type.strip(),
            description=description.strip() if description else None,
            department=department.strip(),
            priority=priority.strip().lower(),
            assigned_investigators=invs,
            lead_officer_id=lead_officer_id,
            created_by_id=created_by_id,
            status=status.strip().lower(),
            applicant_name=applicant_name.strip() if applicant_name else None,
            applicant_phone=applicant_phone.strip() if applicant_phone else None,
            applicant_email=applicant_email.strip() if applicant_email else None,
            auto_notify_on_mismatch=auto_notify_on_mismatch,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(case)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(case)
        return case
    raise RuntimeError("Could not allocate a unique case identifier.")


def get_case(db: Session, case_id: str) -> Case | None:
    """Retrieve case by primary key UUID or human-readable case_id (e.g. CASE-2026-00124)."""
    # 1. Try primary key UUID
    case = db.get(Case, case_id)
    if case:
        return case
    # 2. Try case_id string match
    case = db.scalar(select(Case).where(Case.case_id == case_id))
    if case:
        return case
    # 3. Try integer case_number match if numeric
    if case_id.isdigit():
        return db.scalar(select(Case).where(Case.case_number == int(case_id)))
    return None


def update_case(
    db: Session,
    case: Case,
    title: str | None = None,
    case_type: str | None = None,
    description: str | None = None,
    department: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    assigned_investigators: list[str] | None = None,
) -> Case:
    """Update case parameters and update the timestamp."""
    if title is not None:
        case.title = title.strip()
        case.case_name = title.strip()
    if case_type is not None:
        case.case_type = case_type.strip()
    if description is not None:
        case.description = description.strip() or None
    if department is not None:
        case.department = department.strip()
    if priority is not None:
        case.priority = priority.strip().lower()
    if status is not None:
        case.status = status.strip().lower()
    if assigned_investigators is not None:
        case.assigned_investigators = assigned_investigators

    case.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)
    return case


def list_cases(db: Session, limit: int = 100) -> list[Case]:
    return list(
        db.scalars(select(Case).order_by(Case.case_number.desc()).limit(limit)).all()
    )
