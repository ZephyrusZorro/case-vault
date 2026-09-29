"""Application configuration loaded from environment / .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Secure Digital DMS"
    app_version: str = "1.0.0"
    app_tagline: str = "Secure Legal & Investigation Document Management Platform - NCRB"

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'idshield.db').as_posix()}"
    cors_origins: str = "http://localhost:5173"

    # JWT Authentication & RBAC
    jwt_secret_key: str = "ncrb-secure-digital-dms-jwt-secret-key-2026-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480  # 8 hours session

    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    max_upload_mb: int = 10

    face_verification_enabled: bool = False

    log_level: str = "INFO"

    # Live Notification Providers
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_from: str | None = None

    fast2sms_api_key: str | None = None

    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
