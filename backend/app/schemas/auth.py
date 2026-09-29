"""Pydantic schemas for authentication and RBAC sessions."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """User credentials submitted at login. Role is NOT selectable here — it is strictly backend-assigned."""
    email: EmailStr
    password: str = Field(min_length=1, description="Account password")


class UserOut(BaseModel):
    """Safe public user representation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: str
    badge_number: str | None = None
    department: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    last_login: datetime | None = None


class TokenResponse(BaseModel):
    """Access token payload returned upon successful login."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RoleInfo(BaseModel):
    """Metadata regarding a defined security role."""
    role: str
    label: str
    department: str
    description: str
    permissions: list[str]
