"""Authentication & Role-Based Access Control (RBAC) dependencies.

Roles supported for NCRB / Ministry of Home Affairs Secure DMS:
- admin: System Administrator (manage users, platform config, audit logs)
- investigator: Investigator / Police Officer (create/manage cases, upload docs/evidence)
- reviewer: Reviewer / Supervisor (case review, verify integrity, review dispositions)
- legal_officer: Legal Officer / Prosecution (view cases, review filings, share documents)
- auditor: Compliance & Oversight Auditor (read-only audit trails and chain of custody)
- verifier: Backward-compatible verification officer role
- viewer: General authorized viewer
- public: Read-only access
- other: Custom role
"""
from __future__ import annotations

from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.base import get_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Standard Role Specifications
ROLES_METADATA: dict[str, dict[str, str | list[str]]] = {
    "admin": {
        "label": "Administrator",
        "department": "National Crime Records Bureau - Central IT",
        "description": "Full administrative control, user provisioning, system audits, and role assignment.",
        "permissions": ["users:manage", "cases:view", "cases:manage", "docs:manage", "audit:view", "system:manage"],
    },
    "investigator": {
        "label": "Investigator / Police Officer",
        "department": "Women Safety Division / Law Enforcement",
        "description": "Create and manage assigned investigation cases, upload legal documents, register evidence.",
        "permissions": ["cases:create", "cases:manage", "docs:upload", "docs:view", "evidence:manage", "reports:generate"],
    },
    "reviewer": {
        "label": "Reviewer / Supervisor",
        "department": "Supervisory & Review Oversight Wing",
        "description": "Review cases, inspect integrity warnings, verify chain-of-custody, approve review dispositions.",
        "permissions": ["cases:review", "cases:view", "docs:view", "integrity:verify", "audit:view"],
    },
    "legal_officer": {
        "label": "Legal Officer",
        "department": "Prosecution & Legal Directorate",
        "description": "Access authorized investigation files, review chargesheets, witness statements, and court filings.",
        "permissions": ["cases:view", "docs:view", "docs:share", "reports:generate"],
    },
    "auditor": {
        "label": "Auditor",
        "department": "Compliance & Audit Division",
        "description": "Independent read-only verification of audit trails, document integrity, and chain of custody.",
        "permissions": ["audit:view", "integrity:verify", "chain:verify", "docs:view_readonly"],
    },
}


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Extract user from bearer token if present, returning None if absent or invalid."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Enforce valid authenticated session. Raises 401 if missing or invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided or are invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact the system administrator.",
        )

    return user


def require_roles(allowed_roles: list[str]) -> Callable[[User], User]:
    """Dependency factory checking that the authenticated user possesses one of the allowed roles."""
    def _role_checker(user: User = Depends(get_current_user)) -> User:
        user_role = (user.role or "").lower()
        allowed_normalized = {r.lower() for r in allowed_roles}
        if user_role != "admin" and user_role not in allowed_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access forbidden: requires role '{', '.join(allowed_roles)}'. "
                    f"Your assigned role is '{user.role}'."
                ),
            )
        return user

    return _role_checker


# ------------------------------------------------------------- Clearance & Access Control
CLEARANCE_RANKS: dict[str, int] = {
    "unrestricted": 0,
    "restricted": 1,
    "confidential": 2,
    "secret": 3,
    "top_secret": 4,
}

DEFAULT_ROLE_CLEARANCE: dict[str, str] = {
    "admin": "top_secret",
    "reviewer": "secret",
    "supervisor": "secret",
    "auditor": "secret",
    "investigator": "confidential",
    "legal_officer": "confidential",
    "verifier": "confidential",
    "viewer": "restricted",
    "public": "unrestricted",
}


def get_user_clearance(user: User | None) -> str:
    """Retrieve user clearance level, falling back to role-default if unassigned."""
    if user is None:
        return "unrestricted"
    if hasattr(user, "clearance_level") and user.clearance_level:
        return user.clearance_level.lower()
    return DEFAULT_ROLE_CLEARANCE.get((user.role or "").lower(), "restricted")


def check_clearance(user: User | None, required_classification: str) -> bool:
    """Check if user has adequate clearance rank to access a resource."""
    req_rank = CLEARANCE_RANKS.get(required_classification.lower(), 1)
    if req_rank <= 1 and user is None:
        return True
    user_clearance = get_user_clearance(user)
    user_rank = CLEARANCE_RANKS.get(user_clearance, 0)
    return user_rank >= req_rank


def can_access_sealed_exhibit(user: User | None) -> bool:
    """Check if user possesses authorization to inspect sealed legal exhibits."""
    if user is None:
        return False
    user_role = (user.role or "").lower()
    return user_role in {"admin", "reviewer", "supervisor"}


def verify_document_read_access(user: User | None, doc: Any) -> None:
    """Verify read access to a document exhibit. Raises HTTP 403 on violation."""
    # 1. Sealed exhibit check
    if getattr(doc, "is_sealed", False):
        if not can_access_sealed_exhibit(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Evidentiary exhibit is sealed under judicial or investigation order.",
            )

    # 2. Clearance check
    classification = getattr(doc, "classification_level", "restricted")
    if not check_clearance(user, classification):
        user_clearance = get_user_clearance(user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Forbidden: Insufficient security clearance to access {classification.upper()} exhibit. "
                f"Your clearance is {user_clearance.upper()}."
            ),
        )


def verify_document_modify_access(user: User | None, doc: Any) -> None:
    """Verify modification or version appending access to an exhibit. Raises HTTP 403 on violation."""
    if user and (user.role or "").lower() == "auditor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Auditors cannot upload or amend document versions (read-only audit role).",
        )

    if getattr(doc, "is_sealed", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot amend or add versions to a sealed evidentiary exhibit.",
        )

    if getattr(doc, "legal_hold", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Exhibit is under active legal hold ('{getattr(doc, 'legal_hold_reason', '')}').",
        )


def verify_document_delete_access(user: User | None, doc: Any) -> None:
    """Verify deletion permissions for an exhibit. Raises HTTP 403 on violation."""
    if user and (user.role or "").lower() in {"auditor", "legal_officer"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Your role does not permit deleting evidentiary files.",
        )

    if getattr(doc, "is_sealed", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot delete a sealed evidentiary exhibit.",
        )

    if getattr(doc, "legal_hold", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Cannot delete exhibit under active legal hold ('{getattr(doc, 'legal_hold_reason', '')}').",
        )


def verify_case_delete_access(user: User | None, case: Any) -> None:
    """Verify deletion permissions for a case. Raises HTTP 403 on violation."""
    if user and (user.role or "").lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only System Administrators can purge investigation containers.",
        )

    if getattr(case, "legal_hold", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Cannot purge case under active legal hold ('{getattr(case, 'legal_hold_reason', '')}').",
        )

