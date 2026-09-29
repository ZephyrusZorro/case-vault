"""Password, bearer-session and installation-secret primitives."""
import hashlib
import hmac
import os
import secrets
from datetime import timedelta
from pathlib import Path

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import get_db
from app.dms.models import SessionToken, User, now


def _secret_file(name: str, size: int) -> bytes:
    path = settings.upload_dir.parent / name
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        try:
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(secrets.token_bytes(size))
        except FileExistsError:
            pass
    return path.read_bytes()


def master_key() -> bytes:
    if settings.dms_master_key:
        try:
            key = bytes.fromhex(settings.dms_master_key)
        except ValueError as exc:
            raise RuntimeError("DMS_MASTER_KEY must be 64 hexadecimal characters") from exc
        if len(key) != 32:
            raise RuntimeError("DMS_MASTER_KEY must be 64 hexadecimal characters")
        return key
    key = _secret_file("casevault.key", 32)
    if len(key) != 32:
        raise RuntimeError("Installation encryption key is invalid")
    return key


def setup_token() -> str:
    if settings.dms_setup_token:
        return settings.dms_setup_token
    return _secret_file("casevault.setup-token", 24).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return f"pbkdf2_sha256$600000${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, count, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


def issue_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(40)
    db.add(SessionToken(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=now() + timedelta(hours=12)))
    db.commit()
    return token


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(401, "Sign in to continue.", headers={"WWW-Authenticate": "Bearer"})
    token_hash = hashlib.sha256(header[7:].encode()).hexdigest()
    session = db.get(SessionToken, token_hash)
    if session is None or session.expires_at.replace(tzinfo=None) < now().replace(tzinfo=None):
        raise HTTPException(401, "Your session has expired.")
    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise HTTPException(401, "Account unavailable.")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required.")
    return user


def revoke_session(db: Session, raw_token: str) -> None:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = db.get(SessionToken, token_hash)
    if record:
        db.delete(record)
        db.commit()
