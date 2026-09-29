"""Meaningful API checks for access control, evidence integrity and auditability."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base, get_db
from app.dms.models import AuditEvent, DocumentVersion
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    db_file = tmp_path / "casevault.db"
    engine = create_engine(f"sqlite:///{db_file.as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")
    monkeypatch.setattr(settings, "dms_master_key", "23" * 32)
    monkeypatch.setattr(settings, "dms_setup_token", "test-setup-token")

    def override():
        with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = override
    api = TestClient(app)
    yield api, sessions
    app.dependency_overrides.clear()
    engine.dispose()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_secure_case_evidence_workflow(client):
    api, sessions = client
    assert api.get("/api/cases").status_code == 401
    admin = {"name": "Case Admin", "email": "admin@example.org", "password": "correct horse battery staple"}
    assert api.post("/api/auth/setup", json=admin, headers={"X-Setup-Token": "wrong"}).status_code == 403
    result = api.post("/api/auth/setup", json=admin, headers={"X-Setup-Token": "test-setup-token"})
    assert result.status_code == 201, result.text
    token = result.json()["token"]
    assert api.post("/api/auth/setup", json=admin, headers={"X-Setup-Token": "test-setup-token"}).status_code == 409
    assert api.post("/api/auth/login", json={"email": admin["email"], "password": "wrong"}).status_code == 401

    case = api.post("/api/cases", json={"reference": "FIR/2026/0001", "title": "Harbor incident", "classification": "restricted"}, headers=auth(token))
    assert case.status_code == 201, case.text
    case_id = case.json()["id"]
    user = api.post("/api/users", json={"name": "Legal Reviewer", "email": "legal@example.org", "password": "secure legal password", "role": "legal"}, headers=auth(token))
    assert user.status_code == 201, user.text
    reviewer_id = user.json()["id"]
    reviewer_token = api.post("/api/auth/login", json={"email": "legal@example.org", "password": "secure legal password"}).json()["token"]
    assert api.get(f"/api/cases/{case_id}", headers=auth(reviewer_token)).status_code == 404
    assert api.post(f"/api/cases/{case_id}/documents", files={"file": ("report.txt", b"Sensitive report", "text/plain")}, headers=auth(reviewer_token)).status_code == 404
    assert api.post(f"/api/cases/{case_id}/members", json={"user_id": reviewer_id, "access": "viewer"}, headers=auth(token)).status_code == 200
    assert api.get(f"/api/cases/{case_id}", headers=auth(reviewer_token)).status_code == 200
    assert api.post(f"/api/cases/{case_id}/documents", files={"file": ("report.txt", b"Sensitive report", "text/plain")}, headers=auth(reviewer_token)).status_code == 403

    uploaded = api.post(f"/api/cases/{case_id}/documents", data={"title": "Incident report", "kind": "police_report"}, files={"file": ("report.txt", b"Harbor incident statement. Witness A saw a car.", "text/plain")}, headers=auth(token))
    assert uploaded.status_code == 201, uploaded.text
    doc = uploaded.json()
    assert doc["latest"]["number"] == 1
    doc_id, first_version = doc["id"], doc["latest"]["id"]
    assert any(item["id"] == doc_id for item in api.get("/api/documents?search=Witness", headers=auth(reviewer_token)).json())
    assert api.get(f"/api/documents/{doc_id}/versions/{first_version}/download", headers=auth(reviewer_token)).content == b"Harbor incident statement. Witness A saw a car."
    assert api.get(f"/api/documents/{doc_id}/versions/{first_version}/verify", headers=auth(token)).json()["verified"]
    with sessions() as session:
        assert "Harbor incident" not in session.get(DocumentVersion, first_version).encrypted_text
    second = api.post(f"/api/documents/{doc_id}/versions", files={"file": ("revised.txt", b"Revised witness statement", "text/plain")}, headers=auth(token))
    assert second.status_code == 201, second.text
    assert [version["number"] for version in second.json()["versions"]] == [2, 1]
    assert api.get(f"/api/documents/{doc_id}/versions/{first_version}/download", headers=auth(token)).content.startswith(b"Harbor incident")
    assert api.patch(f"/api/cases/{case_id}", json={"legal_hold": True}, headers=auth(token)).status_code == 200
    assert api.patch(f"/api/cases/{case_id}", json={"status": "archived"}, headers=auth(token)).status_code == 409
    review = api.post(f"/api/cases/{case_id}/reviews", json={"assigned_to": reviewer_id, "note": "Please review evidence"}, headers=auth(token))
    assert review.status_code == 201, review.text
    decision = api.patch(f"/api/reviews/{review.json()['id']}", json={"status": "approved", "note": "Reviewed available evidence."}, headers=auth(reviewer_token))
    assert decision.status_code == 200, decision.text
    assert api.get("/api/audit/verify", headers=auth(token)).json()["valid"]
    assert api.get("/api/audit/verify", headers=auth(reviewer_token)).status_code == 403
    assert api.patch(f"/api/cases/{case_id}", json={"legal_hold": False}, headers=auth(token)).status_code == 200
    archived = api.patch(f"/api/cases/{case_id}", json={"status": "archived"}, headers=auth(token))
    assert archived.status_code == 200 and not archived.json()["can_edit"]
    assert api.post(f"/api/documents/{doc_id}/versions", files={"file": ("late.txt", b"Late change", "text/plain")}, headers=auth(token)).status_code == 409
    assert api.patch(f"/api/cases/{case_id}", json={"status": "active"}, headers=auth(token)).status_code == 200

    with sessions() as session:
        version = session.get(DocumentVersion, first_version)
        stored = settings.upload_dir / "vault" / version.storage_key
        content = bytearray(stored.read_bytes())
        content[-1] ^= 1
        stored.write_bytes(content)
    assert api.get(f"/api/documents/{doc_id}/versions/{first_version}/download", headers=auth(token)).status_code == 409
    with sessions() as session:
        event = session.query(AuditEvent).order_by(AuditEvent.id).first()
        event.action = "case.removed"
        session.commit()
    assert not api.get("/api/audit/verify", headers=auth(token)).json()["valid"]


def test_password_rotation_invalidates_other_sessions(client):
    api, sessions = client
    admin = {"name": "Case Admin", "email": "admin@example.org", "password": "correct horse battery staple"}
    first = api.post("/api/auth/setup", json=admin, headers={"X-Setup-Token": "test-setup-token"}).json()["token"]
    second = api.post("/api/auth/login", json={"email": admin["email"], "password": admin["password"]}).json()["token"]
    changed = api.post("/api/auth/change-password", json={"current_password": admin["password"], "new_password": "an even longer new password"}, headers=auth(first))
    assert changed.status_code == 200, changed.text
    assert api.get("/api/auth/me", headers=auth(first)).status_code == 401
    assert api.get("/api/auth/me", headers=auth(second)).status_code == 401
    assert api.get("/api/auth/me", headers=auth(changed.json()["token"])).status_code == 200
    assert api.post("/api/auth/login", json={"email": admin["email"], "password": admin["password"]}).status_code == 401
    with sessions() as session:
        last = session.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
        session.delete(last)
        session.commit()
    assert not api.get("/api/audit/verify", headers=auth(changed.json()["token"])).json()["valid"]
