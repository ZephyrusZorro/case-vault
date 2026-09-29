"""Pydantic schemas for user administration and provisioning."""
from pydantic import BaseModel, EmailStr, Field
from app.schemas.auth import UserOut


class UserCreate(BaseModel):
    """Schema for administrator provisioning of a new user account."""
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, description="Initial temporary password")
    role: str = Field(default="investigator", description="Assigned role: admin, investigator, reviewer, legal_officer, auditor")
    badge_number: str | None = None
    department: str | None = None


class UserUpdate(BaseModel):
    """Schema for administrator updating user attributes or changing roles."""
    name: str | None = None
    role: str | None = None
    badge_number: str | None = None
    department: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class UserProfileUpdate(BaseModel):
    """Self-service profile update: users CANNOT change their own role or active state."""
    name: str | None = None
    badge_number: str | None = None
    department: str | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6)
