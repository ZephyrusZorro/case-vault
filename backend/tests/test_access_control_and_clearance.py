"""Test suite for Phase 5: Access Control, Clearance Levels, Sealing, and Legal Holds."""
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.auth import (
    CLEARANCE_RANKS,
    check_clearance,
    get_user_clearance,
    can_access_sealed_exhibit,
    verify_document_read_access,
    verify_document_modify_access,
    verify_document_delete_access,
)
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.models import Case, Document, User
from app.main import app


@pytest.fixture
def test_users(tmp_path):
    db_file = tmp_path / "test_access.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()

    users = {
        "admin": User(
            name="Admin User",
            email="admin_test@ncrb.gov.in",
            password_hash=hash_password("Pass@123"),
            role="admin",
            clearance_level="top_secret",
            is_active=True,
        ),
        "supervisor": User(
            name="Supervisor User",
            email="supervisor_test@ncrb.gov.in",
            password_hash=hash_password("Pass@123"),
            role="reviewer",
            clearance_level="secret",
            is_active=True,
        ),
        "investigator": User(
            name="Investigator User",
            email="investigator_test@ncrb.gov.in",
            password_hash=hash_password("Pass@123"),
            role="investigator",
            clearance_level="confidential",
            is_active=True,
        ),
        "legal": User(
            name="Legal Officer",
            email="legal_test@ncrb.gov.in",
            password_hash=hash_password("Pass@123"),
            role="legal_officer",
            clearance_level="confidential",
            is_active=True,
        ),
        "auditor": User(
            name="Auditor User",
            email="auditor_test@ncrb.gov.in",
            password_hash=hash_password("Pass@123"),
            role="auditor",
            clearance_level="secret",
            is_active=True,
        ),
    }
    for u in users.values():
        session.add(u)
    session.commit()
    try:
        yield users, session
    finally:
        session.close()


def test_clearance_level_evaluation(test_users):
    """Test clearance ranking hierarchy and evaluation."""
    users, _ = test_users

    admin = users["admin"]
    supervisor = users["supervisor"]
    investigator = users["investigator"]

    assert get_user_clearance(admin) == "top_secret"
    assert get_user_clearance(supervisor) == "secret"
    assert get_user_clearance(investigator) == "confidential"

    # Admin passes all clearances
    assert check_clearance(admin, "unrestricted") is True
    assert check_clearance(admin, "restricted") is True
    assert check_clearance(admin, "confidential") is True
    assert check_clearance(admin, "secret") is True
    assert check_clearance(admin, "top_secret") is True

    # Supervisor passes up to secret
    assert check_clearance(supervisor, "confidential") is True
    assert check_clearance(supervisor, "secret") is True
    assert check_clearance(supervisor, "top_secret") is False

    # Investigator passes up to confidential
    assert check_clearance(investigator, "restricted") is True
    assert check_clearance(investigator, "confidential") is True
    assert check_clearance(investigator, "secret") is False
    assert check_clearance(investigator, "top_secret") is False


def test_sealed_exhibit_access_restriction(test_users):
    """Test that sealed exhibits cannot be read by ordinary investigators."""
    from fastapi import HTTPException

    users, session = test_users
    investigator = users["investigator"]
    supervisor = users["supervisor"]
    admin = users["admin"]

    sealed_doc = Document(
        case_id="case123",
        file_name="sealed_affidavit.pdf",
        stored_name="sealed_affidavit.pdf",
        original_path="dummy/path",
        classification_level="confidential",
        is_sealed=True,
        sealed_reason="Judicial protective order under CrPC § 327",
    )

    # Investigator is blocked with 403
    with pytest.raises(HTTPException) as exc_info:
        verify_document_read_access(investigator, sealed_doc)
    assert exc_info.value.status_code == 403
    assert "sealed under judicial" in exc_info.value.detail

    # Supervisor and Admin are granted read access
    verify_document_read_access(supervisor, sealed_doc)
    verify_document_read_access(admin, sealed_doc)


def test_legal_hold_blocks_modification_and_deletion(test_users):
    """Test that active legal hold strictly prevents modification or deletion."""
    from fastapi import HTTPException

    users, _ = test_users
    investigator = users["investigator"]
    admin = users["admin"]

    doc_on_hold = Document(
        case_id="case123",
        file_name="tampered_contract.pdf",
        stored_name="tampered_contract.pdf",
        original_path="dummy/path",
        legal_hold=True,
        legal_hold_reason="Active civil writ petition in High Court",
    )

    # Modification blocked
    with pytest.raises(HTTPException) as exc_mod:
        verify_document_modify_access(admin, doc_on_hold)
    assert exc_mod.value.status_code == 403
    assert "legal hold" in exc_mod.value.detail

    # Deletion blocked even for admin
    with pytest.raises(HTTPException) as exc_del:
        verify_document_delete_access(admin, doc_on_hold)
    assert exc_del.value.status_code == 403
    assert "legal hold" in exc_del.value.detail


def test_seal_and_legal_hold_api_endpoints():
    """Test REST API routes for sealing exhibits and applying legal holds."""
    with TestClient(app) as client:
        # Login as Admin
        res_login = client.post(
            "/api/auth/login",
            json={"email": "admin@ncrb.gov.in", "password": "Admin@12345"},
        )
        assert res_login.status_code == 200
        admin_token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Fetch seed case
        res_cases = client.get("/api/cases", headers=headers)
        assert res_cases.status_code == 200
        first_case = res_cases.json()[0]
        case_id = first_case["id"]

        # 2. Apply legal hold on case
        res_hold = client.post(
            f"/api/cases/{case_id}/legal-hold",
            headers=headers,
            json={"action": "apply", "reason": "Statutory preservation notice from NHRC"},
        )
        assert res_hold.status_code == 200
        case_updated = res_hold.json()
        assert case_updated["legal_hold"] is True
        assert "NHRC" in case_updated["legal_hold_reason"]

        # 3. Lift legal hold on case
        res_lift = client.post(
            f"/api/cases/{case_id}/legal-hold",
            headers=headers,
            json={"action": "lift", "reason": "Preservation order resolved"},
        )
        assert res_lift.status_code == 200
        case_lifted = res_lift.json()
        assert case_lifted["legal_hold"] is False
