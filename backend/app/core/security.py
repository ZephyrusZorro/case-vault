"""Upload security helpers. All uploaded files are treated as untrusted input."""
import re
import unicodedata
from pathlib import Path

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

# Extensions we accept mapped to plausible MIME types across browsers/platforms.
_ALLOWED_MIME = {
    ".jpg": {"image/jpeg", "image/jpg", "image/pjpeg", "application/octet-stream"},
    ".jpeg": {"image/jpeg", "image/jpg", "image/pjpeg", "application/octet-stream"},
    ".png": {"image/png", "image/x-png", "application/octet-stream"},
    ".pdf": {"application/pdf", "application/x-pdf", "application/acrobat", "applications/vnd.pdf", "text/pdf", "application/octet-stream"},
}


_UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._\- ]+")


class UploadValidationError(ValueError):
    """Raised when an uploaded file fails validation."""


def sanitize_filename(name: str) -> str:
    """Return a filesystem-safe display name derived from the upload name."""
    name = unicodedata.normalize("NFKC", name)
    name = name.replace("\\", "/")
    name = Path(name).name  # strip any path components
    name = _UNSAFE_CHARS.sub("_", name).strip(" ._")
    return name[:200] or "upload"


_MAGIC_SIGNATURES = {
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".pdf": (b"%PDF-",),
}


def validate_upload(
    filename: str,
    declared_mime: str | None,
    size_bytes: int,
    max_bytes: int,
) -> str:
    """Validate extension + declared MIME + size.

    Returns the normalized lowercase extension (with dot) on success.
    Raises UploadValidationError with a user-facing message on failure.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(
            f"Unsupported file type '{ext or filename}'. Allowed: JPG, JPEG, PNG, PDF."
        )
    if declared_mime is not None and declared_mime != "" and (
        declared_mime not in _ALLOWED_MIME[ext]
    ):
        raise UploadValidationError(
            f"File content type '{declared_mime}' does not match extension '{ext}'."
        )
    if size_bytes <= 0:
        raise UploadValidationError("Uploaded file is empty.")
    if size_bytes > max_bytes:
        limit_mb = max_bytes / (1024 * 1024)
        raise UploadValidationError(
            f"File exceeds the {limit_mb:g} MB upload limit."
        )
    return ext


def resolve_within(base_dir: Path, relative_name: str) -> Path:
    """Resolve a path under base_dir, refusing traversal outside it."""
    base = base_dir.resolve()
    candidate = (base / relative_name).resolve()
    if not candidate.is_relative_to(base):
        raise UploadValidationError("Invalid file path.")
    return candidate


# =====================================================================
# Cryptographic Password Hashing (Bcrypt) & JWT Access Tokens
# =====================================================================
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with a salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored bcrypt hash."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Validate and decode a signed JWT access token."""
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except (jwt.PyJWTError, Exception):
        return None
