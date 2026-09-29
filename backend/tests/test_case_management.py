"""Test suite for Phase 2: Case Management Layer."""
import pytest
from fastapi.testclient import TestClient

from app.db.base import init_db
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_seed_demo_case_exists():
    """Verify that CASE-2026-00124 exists with correct investigation metadata."""
    resp = client.get("/api/cases/CASE-2026-00124")
    assert resp.status_code == 200, resp.text
    case = resp.json()
    assert case["case_id"] == "CASE-2026-00124"
    assert "Harassment" in case["title"]
    assert case["department"] == "NCRB Women Safety Division"
    assert case["priority"] in {"high", "critical"}
    assert case["status"] in {"active", "open", "pending_review"}
    assert len(case["assigned_investigators"]) >= 2


def test_create_investigation_case():
    """Test creating an investigation case with full legal/investigation parameters."""
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "investigator@ncrb.gov.in", "password": "Investigator@12345"},
    )
    token = login_resp.json()["access_token"]

    payload = {
        "title": "Investigation into Fabricated FIR and Judicial Forgery",
        "case_type": "Financial & Economic Offenses",
        "description": "Cross-border forged stamp papers and manipulated court documents.",
        "department": "Economic Offenses Wing",
        "priority": "critical",
        "assigned_investigators": [
            "Inspector Rajesh Sharma (DL-8842)",
            "Advocate Meera Varma (BAR-DL-9921)",
        ],
    }

    resp = client.post(
        "/api/cases",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["case_id"].startswith("CASE-2026-")
    assert created["title"] == payload["title"]
    assert created["case_type"] == payload["case_type"]
    assert created["department"] == payload["department"]
    assert created["priority"] == "critical"
    assert len(created["assigned_investigators"]) == 2


def test_update_case_metadata():
    """Test updating case status, priority, and assigned officers via PATCH."""
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "supervisor@ncrb.gov.in", "password": "Supervisor@12345"},
    )
    token = login_resp.json()["access_token"]

    update_payload = {
        "priority": "critical",
        "status": "pending_review",
        "description": "Updated following forensic verification of exhibit E-01.",
    }

    resp = client.patch(
        "/api/cases/CASE-2026-00124",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["priority"] == "critical"
    assert updated["status"] == "pending_review"
    assert updated["description"] == update_payload["description"]


def test_auditor_cannot_create_or_modify_case():
    """Test that auditors have read-only access and cannot create or modify cases."""
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "auditor@ncrb.gov.in", "password": "Auditor@12345"},
    )
    token = login_resp.json()["access_token"]

    # Try create case -> 403 Forbidden
    resp_create = client.post(
        "/api/cases",
        json={"title": "Auditor Test Case"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_create.status_code == 403
    assert "Auditors have read-only access" in resp_create.json()["detail"]

    # Try patch case -> 403 Forbidden
    resp_patch = client.patch(
        "/api/cases/CASE-2026-00124",
        json={"priority": "low"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_patch.status_code == 403
    assert "Auditors cannot modify case records" in resp_patch.json()["detail"]


def test_case_list_filtering():
    """Test listing cases with case_type, priority, and search filters."""
    # 1. Search by case_id
    r1 = client.get("/api/cases?search=00124")
    assert r1.status_code == 200
    cases1 = r1.json()
    assert any(c["case_id"] == "CASE-2026-00124" for c in cases1)

    # 2. Filter by priority
    r2 = client.get("/api/cases?priority=critical")
    assert r2.status_code == 200
    cases2 = r2.json()
    for c in cases2:
        assert c["priority"] == "critical"

    # 3. Sort by priority
    r3 = client.get("/api/cases?sort=priority")
    assert r3.status_code == 200
    cases3 = r3.json()
    assert len(cases3) > 0
