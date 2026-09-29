"""User management and RBAC administration endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.logging import get_logger
from app.core.security import hash_password, verify_password
from app.db.base import get_db
from app.db.models import User
from app.schemas.auth import UserOut
from app.schemas.users import UserCreate, UserProfileUpdate, UserUpdate

router = APIRouter()
log = get_logger("idshield.users")

ALLOWED_ROLES = {"admin", "investigator", "reviewer", "legal_officer", "auditor", "verifier"}


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    """List all registered system personnel."""
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
) -> UserOut:
    """Administrator-only: provision a new personnel account with an assigned role."""
    clean_email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{clean_email}' already exists.",
        )

    clean_role = payload.role.strip().lower()
    if clean_role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{payload.role}'. Must be one of: {sorted(ALLOWED_ROLES)}",
        )

    new_user = User(
        name=payload.name.strip(),
        email=clean_email,
        password_hash=hash_password(payload.password),
        role=clean_role,
        badge_number=payload.badge_number.strip() if payload.badge_number else None,
        department=payload.department.strip() if payload.department else None,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log.info(
        "USER_CREATED | by=%s created_user_id=%s role=%s email=%s",
        current_user.id,
        new_user.id,
        new_user.role,
        new_user.email,
    )
    return UserOut.model_validate(new_user)


@router.get("/users/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    """Retrieve details for a specific personnel account."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    """Update user attributes.

    CRITICAL SECURITY RULE:
    Users CANNOT change their own role or other users' roles unless they possess the 'admin' role.
    """
    target_user = db.get(User, user_id)
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    is_admin = (current_user.role or "").lower() == "admin"

    # Only admins can edit other users
    if target_user.id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to modify other users' accounts.",
        )

    # Only admins can alter role or active status
    if payload.role is not None:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only administrators can assign or alter roles.",
            )
        clean_role = payload.role.strip().lower()
        if clean_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role '{payload.role}'. Must be one of: {sorted(ALLOWED_ROLES)}",
            )
        target_user.role = clean_role

    if payload.is_active is not None:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only administrators can activate or deactivate accounts.",
            )
        target_user.is_active = payload.is_active

    if payload.name is not None:
        target_user.name = payload.name.strip()
    if payload.badge_number is not None:
        target_user.badge_number = payload.badge_number.strip() or None
    if payload.department is not None:
        target_user.department = payload.department.strip() or None
    if payload.password is not None:
        # Either admin resetting password or user updating self
        target_user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(target_user)

    log.info(
        "USER_UPDATED | by=%s target_user_id=%s role=%s",
        current_user.id,
        target_user.id,
        target_user.role,
    )
    return UserOut.model_validate(target_user)
