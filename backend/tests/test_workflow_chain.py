"""Tests for multi-role workflow approval chain and transition history."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base, get_db
from app.db.models import Case, User
from app.main import app


def _token_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client_and_db(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'test_wf.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSession()
    admin = User(
        email="admin_wf@gov.in",
        name="Admin Chief",
        password_hash="hash",
        role="admin",
        clearance_level="top_secret",
        is_active=True,
    )
    inv = User(
        email="investigator_wf@gov.in",
        name="Insp. Rajesh Kumar",
        password_hash="hash",
        role="investigator",
        clearance_level="secret",
        is_active=True,
    )
    sup = User(
        email="supervisor_wf@gov.in",
        name="SP Vikram Verma",
        password_hash="hash",
        role="supervisor",
        clearance_level="top_secret",
        is_active=True,
    )
    legal = User(
        email="legal_wf@gov.in",
        name="Adv. Meera Sen",
        password_hash="hash",
        role="legal_officer",
        clearance_level="secret",
        is_active=True,
    )
    db.add_all([admin, inv, sup, legal])
    db.commit()
    for u in [admin, inv, sup, legal]:
        db.refresh(u)

    with TestClient(app) as c:
        yield c, db, {"admin": admin, "investigator": inv, "supervisor": sup, "legal": legal}

    app.dependency_overrides.clear()


def test_workflow_lifecycle_full_chain(client_and_db):
    client, db, users = client_and_db

    # 1. Create a test case
    case = Case(
        case_number=101,
        case_name="Operation CyberShield Alpha",
        status="under_investigation",
        priority="high",
        classification_level="restricted",
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    inv = users["investigator"]
    sup = users["supervisor"]
    legal = users["legal"]

    # 2. Investigator submits for supervisor review
    res1 = client.post(
        f"/api/cases/{case.id}/workflow",
        headers=_token_headers(inv),
        json={"action": "submit_for_review", "remarks": "Primary forensic extraction complete."},
    )
    assert res1.status_code == 200, res1.text
    data1 = res1.json()
    assert data1["status"] == "pending_review"

    # 3. Investigator tries to supervisor_approve (should be FORBIDDEN 403)
    res_forbidden = client.post(
        f"/api/cases/{case.id}/workflow",
        headers=_token_headers(inv),
        json={"action": "supervisor_approve", "remarks": "I approve my own work"},
    )
    assert res_forbidden.status_code == 403

    # 4. Supervisor approves and forwards to legal review
    res2 = client.post(
        f"/api/cases/{case.id}/workflow",
        headers=_token_headers(sup),
        json={"action": "supervisor_approve", "remarks": "Evidence verified against NCRB standards."},
    )
    assert res2.status_code == 200, res2.text
    data2 = res2.json()
    assert data2["status"] == "pending_legal_review"
    assert data2["review_status"] == "approved"

    # 5. Legal Officer approves case to court_ready
    res3 = client.post(
        f"/api/cases/{case.id}/workflow",
        headers=_token_headers(legal),
        json={"action": "legal_approve", "remarks": "Compliant with Section 65B Indian Evidence Act."},
    )
    assert res3.status_code == 200, res3.text
    data3 = res3.json()
    assert data3["status"] == "court_ready"

    # 6. Check workflow history
    res_hist = client.get(
        f"/api/cases/{case.id}/workflow/history",
        headers=_token_headers(inv),
    )
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) >= 3
    actions = [h["action"] for h in history]
    assert "WORKFLOW_SUBMITTED_FOR_REVIEW" in actions
    assert "WORKFLOW_SUPERVISOR_APPROVED" in actions
    assert "WORKFLOW_LEGAL_APPROVED" in actions
