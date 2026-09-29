"""Validated commands for the CaseVault API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Role = Literal["admin", "investigator", "legal", "auditor"]
Classification = Literal["internal", "confidential", "restricted"]
CaseStatus = Literal["active", "under_review", "closed", "archived"]


class AccountInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=12, max_length=128)


class NewUser(AccountInput):
    role: Role = "investigator"


class LoginInput(BaseModel):
    email: str = Field(max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=128)


class CaseInput(BaseModel):
    reference: str = Field(min_length=3, max_length=60, pattern=r"^[A-Za-z0-9][A-Za-z0-9/._-]*$")
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(default="", max_length=5000)
    category: Literal["investigation", "litigation", "evidence", "legal_notice", "other"] = "investigation"
    classification: Classification = "confidential"
    retention_until: datetime | None = None


class CaseUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=5000)
    status: CaseStatus | None = None
    classification: Classification | None = None
    legal_hold: bool | None = None
    retention_until: datetime | None = None


class MemberInput(BaseModel):
    user_id: str
    access: Literal["viewer", "editor"] = "viewer"


class NoteInput(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class ReviewInput(BaseModel):
    assigned_to: str
    due_at: datetime | None = None
    note: str = Field(default="", max_length=2000)


class ReviewDecision(BaseModel):
    status: Literal["approved", "changes_requested", "rejected"]
    note: str = Field(min_length=3, max_length=2000)
