"""Comprehensive test suite for Phase 1: Core Security, Authentication, and RBAC."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password, verify_password
from app.db.base import SessionLocal, get_db, init_db
from app.db.models import User
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database is initialized and seeded before tests."""
    init_db()


def test_password_hashing():
    """Verify bcrypt hashing and verification functions."""
    plain = "Secr3tP@ssw0rd!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False


def test_seed_users_exist():
    """Verify that default role accounts were seeded into the database."""
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == "admin@ncrb.gov.in"))
        assert admin is not None
        assert admin.role == "admin"
        assert verify_password("Admin@12345", admin.password_hash) is True

        investigator = db.scalar(select(User).where(User.email == "investigator@ncrb.gov.in"))
        assert investigator is not None
        assert investigator.role == "investigator"
        assert verify_password("Investigator@12345", investigator.password_hash) is True


def test_login_success_and_role_retrieval():
    """Test login retrieves the backend-assigned role; user does NOT select role."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "investigator@ncrb.gov.in", "password": "Investigator@12345"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Role is strictly determined by backend record
    assert data["user"]["role"] == "investigator"
    assert data["user"]["email"] == "investigator@ncrb.gov.in"
    assert data["user"]["badge_number"] == "DL-8842"


def test_login_invalid_credentials():
    """Test that invalid password or non-existent user returns 401."""
    # Wrong password
    resp1 = client.post(
        "/api/auth/login",
        json={"email": "investigator@ncrb.gov.in", "password": "WrongPassword!"},
    )
    assert resp1.status_code == 401
    assert "Invalid email or password" in resp1.json()["detail"]

    # Non-existent user
    resp2 = client.post(
        "/api/auth/login",
        json={"email": "nonexistent@ncrb.gov.in", "password": "AnyPassword123"},
    )
    assert resp2.status_code == 401


def test_login_deactivated_user():
    """Test that deactivated accounts cannot log in."""
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "auditor@ncrb.gov.in"))
        assert user is not None
        user.is_active = False
        db.commit()

    try:
        resp = client.post(
            "/api/auth/login",
            json={"email": "auditor@ncrb.gov.in", "password": "Auditor@12345"},
        )
        assert resp.status_code == 403
        assert "deactivated" in resp.json()["detail"].lower()
    finally:
        # Re-activate for other tests
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == "auditor@ncrb.gov.in"))
            if user:
                user.is_active = True
                db.commit()


def test_authenticated_access_me():
    """Test that /api/auth/me returns current user profile with valid Bearer token."""
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "admin@ncrb.gov.in", "password": "Admin@12345"},
    )
    token = login_resp.json()["access_token"]

    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@ncrb.gov.in"
    assert resp.json()["role"] == "admin"


def test_unauthenticated_requests_rejected():
    """Test that protected endpoints reject unauthenticated requests with 401."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    resp_users = client.get("/api/users")
    assert resp_users.status_code == 401

    resp_create = client.post("/api/users", json={"name": "Test", "email": "t@t.com", "password": "123"})
    assert resp_create.status_code == 401


def test_role_based_authorization_user_creation():
    """Test that ONLY administrators can create new user accounts; investigators get 403."""
    # 1. Investigator login
    inv_token = client.post(
        "/api/auth/login",
        json={"email": "investigator@ncrb.gov.in", "password": "Investigator@12345"},
    ).json()["access_token"]

    # 2. Investigator tries to create a user -> 403 Forbidden
    create_payload = {
        "name": "Sub-Inspector Vikram",
        "email": "vikram.si@ncrb.gov.in",
        "password": "Password@123",
        "role": "investigator",
        "badge_number": "DL-9012",
        "department": "NCRB Crime Branch",
    }
    resp_forbidden = client.post(
        "/api/users",
        json=create_payload,
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert resp_forbidden.status_code == 403
    assert "forbidden" in resp_forbidden.json()["detail"].lower()

    # 3. Admin login
    admin_token = client.post(
        "/api/auth/login",
        json={"email": "admin@ncrb.gov.in", "password": "Admin@12345"},
    ).json()["access_token"]

    # 4. Admin creates the user -> 201 Created
    resp_success = client.post(
        "/api/users",
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_success.status_code in (201, 409)  # 201 or 409 if already created
    if resp_success.status_code == 201:
        created = resp_success.json()
        assert created["email"] == "vikram.si@ncrb.gov.in"
        assert created["role"] == "investigator"


def test_users_cannot_change_their_own_roles():
    """Test that users CANNOT change their own roles from investigator to admin."""
    # 1. Investigator login
    inv_token = client.post(
        "/api/auth/login",
        json={"email": "investigator@ncrb.gov.in", "password": "Investigator@12345"},
    ).json()["access_token"]

    # Get investigator user ID
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {inv_token}"})
    user_id = me_resp.json()["id"]

    # 2. Investigator attempts to elevate themselves to 'admin'
    hack_resp = client.patch(
        f"/api/users/{user_id}",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    assert hack_resp.status_code == 403
    assert "administrators can assign or alter roles" in hack_resp.json()["detail"]

    # Verify role was NOT changed
    verify_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {inv_token}"})
    assert verify_resp.json()["role"] == "investigator"


def test_admin_can_modify_roles():
    """Test that an administrator can modify user roles."""
    admin_token = client.post(
        "/api/auth/login",
        json={"email": "admin@ncrb.gov.in", "password": "Admin@12345"},
    ).json()["access_token"]

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "supervisor@ncrb.gov.in"))
        target_id = user.id

    resp = client.patch(
        f"/api/users/{target_id}",
        json={"department": "Special Oversight Unit"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["department"] == "Special Oversight Unit"
