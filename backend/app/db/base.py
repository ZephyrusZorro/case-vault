"""SQLAlchemy database setup (SQLite dev default, PostgreSQL-compatible)."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _make_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, future=True)


engine = _make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_schema(engine) -> None:
    """Ensure newly added columns are present in existing SQLite/SQL tables."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            # Check cases table columns
            res = conn.execute(text("PRAGMA table_info(cases)")).fetchall()
            cols = [row[1] for row in res] if res else []
            if cols:
                if "applicant_name" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN applicant_name VARCHAR(200)"))
                if "applicant_phone" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN applicant_phone VARCHAR(50)"))
                if "applicant_email" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN applicant_email VARCHAR(320)"))
                if "auto_notify_on_mismatch" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN auto_notify_on_mismatch BOOLEAN DEFAULT 0"))
                if "review_status" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN review_status VARCHAR(30) DEFAULT 'pending_review'"))
                if "reviewer_name" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN reviewer_name VARCHAR(120)"))
                if "reviewer_notes" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN reviewer_notes TEXT"))
                if "reviewed_at" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN reviewed_at TIMESTAMP"))
    except Exception:  # noqa: BLE001
        pass


def init_db() -> None:
    """Create tables and ensure runtime directories exist."""
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    if settings.database_url.startswith("sqlite"):
        # Ensure the SQLite parent directory exists (any path shape).
        from pathlib import Path

        db_file = settings.database_url.split("///", 1)[-1]
        if db_file and db_file != ":memory:":
            Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    from app.dms import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    from app.dms.installation import check_and_migrate
    check_and_migrate()
