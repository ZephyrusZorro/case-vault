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

    app_name: str = "CaseVault"
    app_version: str = "1.0.0"
    app_tagline: str = "Secure legal and investigation document workspace"

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'casevault.db').as_posix()}"
    cors_origins: str = "http://localhost:5173"

    upload_dir: Path = BACKEND_DIR / "data" / "uploads"
    max_upload_mb: int = 25
    dms_master_key: str | None = None
    dms_setup_token: str | None = None

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
