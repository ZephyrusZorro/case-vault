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
                if "case_id" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN case_id VARCHAR(50)"))
                if "title" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN title VARCHAR(255)"))
                if "case_type" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN case_type VARCHAR(80) DEFAULT 'Women Safety Investigation'"))
                if "description" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN description TEXT"))
                if "department" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN department VARCHAR(120) DEFAULT 'NCRB Women Safety Division'"))
                if "priority" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'"))
                if "assigned_investigators" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN assigned_investigators JSON"))
                if "lead_officer_id" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN lead_officer_id VARCHAR(32)"))
                if "created_by_id" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN created_by_id VARCHAR(32)"))
                if "updated_at" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP"))
                if "legal_hold" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN legal_hold BOOLEAN DEFAULT 0"))
                if "legal_hold_reason" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN legal_hold_reason TEXT"))
                if "legal_hold_applied_by" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN legal_hold_applied_by VARCHAR(150)"))
                if "legal_hold_applied_at" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN legal_hold_applied_at TIMESTAMP"))
                if "classification_level" not in cols:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN classification_level VARCHAR(30) DEFAULT 'restricted'"))

                # Backfill case_id and title where null
                conn.execute(text(
                    "UPDATE cases SET case_id = 'CASE-2026-' || printf('%05d', case_number) WHERE case_id IS NULL"
                ))
                conn.execute(text(
                    "UPDATE cases SET title = case_name WHERE title IS NULL"
                ))

            # Check users table columns
            u_res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            u_cols = [row[1] for row in u_res] if u_res else []
            if u_cols:
                if "password_hash" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT ''"))
                if "role" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'investigator'"))
                if "badge_number" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN badge_number VARCHAR(50)"))
                if "department" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(120)"))
                if "clearance_level" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN clearance_level VARCHAR(30) DEFAULT 'confidential'"))
                if "is_active" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                if "last_login" not in u_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP"))
            # Check documents table columns
            d_res = conn.execute(text("PRAGMA table_info(documents)")).fetchall()
            d_cols = [row[1] for row in d_res] if d_res else []
            if d_cols:
                if "current_version_number" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN current_version_number INTEGER DEFAULT 1"))
                if "exhibit_number" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN exhibit_number VARCHAR(50)"))
                if "legal_category" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN legal_category VARCHAR(100)"))
                if "classification_level" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN classification_level VARCHAR(30) DEFAULT 'restricted'"))
                if "is_sealed" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN is_sealed BOOLEAN DEFAULT 0"))
                if "sealed_reason" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN sealed_reason TEXT"))
                if "sealed_by" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN sealed_by VARCHAR(150)"))
                if "sealed_at" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN sealed_at TIMESTAMP"))
                if "legal_hold" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN legal_hold BOOLEAN DEFAULT 0"))
                if "legal_hold_reason" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN legal_hold_reason TEXT"))
                if "legal_hold_applied_by" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN legal_hold_applied_by VARCHAR(150)"))
                if "legal_hold_applied_at" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN legal_hold_applied_at TIMESTAMP"))
                if "retention_period_years" not in d_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN retention_period_years INTEGER"))

            # Ensure document_versions table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_versions (
                    id VARCHAR(32) PRIMARY KEY,
                    document_id VARCHAR(32) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    case_id VARCHAR(32) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                    version_number INTEGER DEFAULT 1,
                    file_name VARCHAR(255) NOT NULL,
                    stored_path VARCHAR(500) NOT NULL,
                    file_size INTEGER DEFAULT 0,
                    mime_type VARCHAR(100) DEFAULT '',
                    sha256_hash VARCHAR(64) NOT NULL,
                    previous_version_hash VARCHAR(64),
                    version_tag VARCHAR(50) DEFAULT 'original_evidence',
                    change_summary TEXT,
                    uploaded_by_id VARCHAR(36) REFERENCES users(id),
                    uploaded_by_name VARCHAR(150),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Ensure audit_events table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    id VARCHAR(32) PRIMARY KEY,
                    sequence_number INTEGER NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    case_id VARCHAR(32) REFERENCES cases(id) ON DELETE SET NULL,
                    document_id VARCHAR(32) REFERENCES documents(id) ON DELETE SET NULL,
                    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                    user_email VARCHAR(255),
                    user_role VARCHAR(50),
                    details JSON,
                    ip_address VARCHAR(45),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    previous_hash VARCHAR(64) NOT NULL,
                    current_hash VARCHAR(64) NOT NULL,
                    block_height INTEGER DEFAULT 0
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_seq ON audit_events (sequence_number)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_hash ON audit_events (current_hash)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_case ON audit_events (case_id)"))

            # Backfill version 1 for documents that lack a document_versions entry
            conn.execute(text("""
                INSERT INTO document_versions (
                    id, document_id, case_id, version_number, file_name,
                    stored_path, file_size, mime_type, sha256_hash, previous_version_hash,
                    version_tag, change_summary, created_at
                )
                SELECT
                    lower(hex(randomblob(16))),
                    d.id,
                    d.case_id,
                    1,
                    d.file_name,
                    d.original_path,
                    d.file_size,
                    d.mime_type,
                    COALESCE(d.file_hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
                    NULL,
                    'original_evidence',
                    'Initial exhibit intake',
                    COALESCE(d.created_at, CURRENT_TIMESTAMP)
                FROM documents d
                WHERE NOT EXISTS (
                    SELECT 1 FROM document_versions dv WHERE dv.document_id = d.id
                )
            """))
    except Exception:  # noqa: BLE001
        pass


def seed_default_users(db: Session) -> None:
    """Seed initial role accounts if they do not already exist."""
    from sqlalchemy import select
    from app.core.security import hash_password
    from app.db.models import User

    default_accounts = [
        {
            "name": "System Administrator",
            "email": "admin@ncrb.gov.in",
            "password": "Admin@12345",
            "role": "admin",
            "clearance_level": "top_secret",
            "badge_number": "NCRB-ADMIN-01",
            "department": "National Crime Records Bureau - Central IT",
        },
        {
            "name": "Inspector Rajesh Sharma",
            "email": "investigator@ncrb.gov.in",
            "password": "Investigator@12345",
            "role": "investigator",
            "clearance_level": "confidential",
            "badge_number": "DL-8842",
            "department": "NCRB Women Safety Division",
        },
        {
            "name": "ACP Sunita Sen",
            "email": "supervisor@ncrb.gov.in",
            "password": "Supervisor@12345",
            "role": "reviewer",
            "clearance_level": "secret",
            "badge_number": "DL-4019",
            "department": "Supervisory & Review Oversight Wing",
        },
        {
            "name": "Advocate Meera Varma",
            "email": "legal@ncrb.gov.in",
            "password": "Legal@12345",
            "role": "legal_officer",
            "clearance_level": "confidential",
            "badge_number": "BAR-DL-9921",
            "department": "Prosecution & Legal Directorate",
        },
        {
            "name": "Pranav Joshi",
            "email": "auditor@ncrb.gov.in",
            "password": "Auditor@12345",
            "role": "auditor",
            "clearance_level": "secret",
            "badge_number": "AUD-108",
            "department": "Compliance & Audit Division",
        },
    ]

    for acc in default_accounts:
        existing = db.scalar(select(User).where(User.email == acc["email"]))
        if not existing:
            user = User(
                name=acc["name"],
                email=acc["email"],
                password_hash=hash_password(acc["password"]),
                role=acc["role"],
                clearance_level=acc["clearance_level"],
                badge_number=acc["badge_number"],
                department=acc["department"],
                is_active=True,
            )
            db.add(user)
        else:
            # If account exists, synchronize role and clearance level
            if not existing.password_hash:
                existing.password_hash = hash_password(acc["password"])
            existing.role = acc["role"]
            existing.clearance_level = acc["clearance_level"]
            existing.badge_number = acc["badge_number"]
            existing.department = acc["department"]

    db.commit()


def seed_demo_cases(db: Session) -> None:
    """Seed prototype investigation cases if cases table is empty."""
    from sqlalchemy import select
    from app.db.models import Case

    existing = db.scalar(select(Case).where(Case.case_id == "CASE-2026-00124"))
    if not existing:
        case = Case(
            case_number=124,
            case_id="CASE-2026-00124",
            case_name="Investigation regarding Targeted Online Harassment and Document Tampering",
            title="Investigation regarding Targeted Online Harassment and Document Tampering",
            case_type="Women Safety Investigation",
            description="Comprehensive investigation into fabricated legal notices, altered court filings, and cyber-harassment targeted against female public officials.",
            department="NCRB Women Safety Division",
            priority="high",
            assigned_investigators=[
                "Inspector Rajesh Sharma (DL-8842)",
                "ACP Sunita Sen (DL-4019)",
            ],
            status="active",
            applicant_name="Dr. Ananya Sen",
            applicant_phone="+91-9876543210",
            applicant_email="ananya.sen@univ.edu.in",
        )
        db.add(case)
        db.commit()


def init_db() -> None:
    """Create tables and ensure runtime directories exist."""
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    if settings.database_url.startswith("sqlite"):
        # Ensure the SQLite parent directory exists (any path shape).
        from pathlib import Path

        db_file = settings.database_url.split("///", 1)[-1]
        if db_file and db_file != ":memory:":
            Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    from app.db import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    _migrate_schema(engine)

    # Seed default personnel accounts and prototype cases
    with SessionLocal() as db:
        seed_default_users(db)
        seed_demo_cases(db)
