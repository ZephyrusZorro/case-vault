"""Authentication REST endpoints."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import ROLES_METADATA, get_current_user
from app.core.logging import get_logger
from app.core.security import create_access_token, verify_password
from app.db.base import get_db
from app.db.models import User
from app.schemas.auth import LoginRequest, RoleInfo, TokenResponse, UserOut
from app.services.audit_service import record_audit_event

router = APIRouter()
log = get_logger("idshield.auth")


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate with email and password.

    Role is strictly retrieved from the database as assigned by the administrator.
    Users cannot choose or submit their role at login.
    """
    clean_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else None
    user = db.scalar(select(User).where(User.email == clean_email))

    if user is None or not verify_password(payload.password, user.password_hash):
        log.warning("AUTH_LOGIN_FAILED | email=%s reason=invalid_credentials", clean_email)
        record_audit_event(
            db=db,
            event_type="AUTHENTICATION",
            action="LOGIN_FAILED",
            user=None,
            details={"attempted_email": clean_email, "reason": "invalid_credentials"},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log.warning("AUTH_LOGIN_REJECTED | user_id=%s reason=inactive_account", user.id)
        record_audit_event(
            db=db,
            event_type="AUTHENTICATION",
            action="LOGIN_REJECTED",
            user=user,
            details={"reason": "account_deactivated"},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact the administrator.",
        )

    # Record last login timestamp
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Issue signed JWT containing user ID and assigned role
    token_payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
    }
    access_token = create_access_token(token_payload)

    # Record tamper-evident audit event
    record_audit_event(
        db=db,
        event_type="AUTHENTICATION",
        action="USER_LOGIN",
        user=user,
        details={
            "role": user.role,
            "badge_number": user.badge_number,
            "department": user.department,
        },
        ip_address=client_ip,
    )

    log.info(
        "AUTH_LOGIN_SUCCESS | user_id=%s role=%s email=%s",
        user.id,
        user.role,
        user.email,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/auth/me", response_model=UserOut)
def get_current_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> UserOut:
    """Retrieve the currently authenticated user's profile and assigned role."""
    return UserOut.model_validate(current_user)


@router.get("/auth/roles", response_model=list[RoleInfo])
def get_system_roles() -> list[RoleInfo]:
    """Retrieve all defined system roles and their permission capabilities."""
    return [
        RoleInfo(
            role=k,
            label=str(v["label"]),
            department=str(v["department"]),
            description=str(v["description"]),
            permissions=list(v["permissions"]),
        )
        for k, v in ROLES_METADATA.items()
    ]


@router.post("/auth/logout")
def logout(current_user: User = Depends(get_current_user)) -> dict:
    """Log out of the current session."""
    log.info("AUTH_LOGOUT | user_id=%s", current_user.id)
    return {"message": "Session terminated successfully."}
