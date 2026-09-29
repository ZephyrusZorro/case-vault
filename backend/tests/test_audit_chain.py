"""Tests for tamper-evident audit trail & cryptographic hash chain (Phase 4)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes_audit import router as audit_router
from app.api.routes_cases import router as cases_router
from app.db.base import Base
from app.db.models import AuditEvent, Case, User
from app.main import app
from app.services.audit_service import (
    GENESIS_PREVIOUS_HASH,
    compute_canonical_event_hash,
    export_evidentiary_certificate,
    list_audit_events,
    record_audit_event,
    verify_audit_chain,
)


@pytest.fixture
def db_session(tmp_path):
    db_file = tmp_path / "test_audit.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


def test_audit_event_genesis_and_chaining(db_session):
    """Test that event 1 uses genesis hash and subsequent events chain hashes."""
    ev1 = record_audit_event(
        db=db_session,
        event_type="CASE",
        action="CASE_CREATED",
        details={"case_id": "CASE-2026-00001"},
    )
    assert ev1.sequence_number == 1
    assert ev1.previous_hash == GENESIS_PREVIOUS_HASH
    assert len(ev1.current_hash) == 64

    ev2 = record_audit_event(
        db=db_session,
        event_type="DOCUMENT",
        action="DOCUMENT_UPLOADED",
        details={"file_name": "affidavit.pdf"},
    )
    assert ev2.sequence_number == 2
    assert ev2.previous_hash == ev1.current_hash
    assert len(ev2.current_hash) == 64
    assert ev2.current_hash != ev1.current_hash

    # Verification passes
    verification = verify_audit_chain(db_session)
    assert verification["is_valid"] is True
    assert verification["tampered"] is False
    assert verification["total_events"] == 2
    assert verification["errors"] == []


def test_audit_chain_detects_data_tampering(db_session):
    """Test that mutating an audit event payload invalidates the cryptographic hash."""
    ev1 = record_audit_event(
        db=db_session,
        event_type="AUTH",
        action="USER_LOGIN",
        details={"ip": "127.0.0.1"},
    )
    ev2 = record_audit_event(
        db=db_session,
        event_type="CASE",
        action="CASE_UPDATED",
        details={"status": "active"},
    )

    # Verify pristine state
    assert verify_audit_chain(db_session)["is_valid"] is True

    # Malicious actor changes details in database without updating hash
    ev1.details = {"ip": "10.0.0.99", "tampered": True}
    db_session.commit()

    # Chain verification should now fail
    result = verify_audit_chain(db_session)
    assert result["is_valid"] is False
    assert result["tampered"] is True
    assert any("Tamper detected" in err for err in result["errors"])


def test_audit_chain_detects_broken_linkage(db_session):
    """Test that modifying a previous_hash pointer breaks the chain."""
    ev1 = record_audit_event(
        db=db_session,
        event_type="CASE",
        action="CASE_CREATED",
    )
    ev2 = record_audit_event(
        db=db_session,
        event_type="DOCUMENT",
        action="DOCUMENT_UPLOADED",
    )

    # Malicious actor tampers with previous_hash pointer
    ev2.previous_hash = "0" * 64
    db_session.commit()

    result = verify_audit_chain(db_session)
    assert result["is_valid"] is False
    assert result["tampered"] is True
    assert any("Hash break" in err for err in result["errors"])


def test_audit_chain_detects_deleted_event(db_session):
    """Test that deleting an intermediate event creates a sequence gap."""
    ev1 = record_audit_event(db=db_session, event_type="CASE", action="E1")
    ev2 = record_audit_event(db=db_session, event_type="CASE", action="E2")
    ev3 = record_audit_event(db=db_session, event_type="CASE", action="E3")

    # Delete intermediate event
    db_session.delete(ev2)
    db_session.commit()

    result = verify_audit_chain(db_session)
    assert result["is_valid"] is False
    assert result["tampered"] is True
    assert any("Sequence gap" in err for err in result["errors"])


def test_evidentiary_certificate_generation(db_session):
    """Test generating a formal evidentiary certificate for court presentation."""
    # Create case
    case = Case(
        case_number=101,
        case_id="CASE-2026-00101",
        case_name="Cyber Tampering Inquiry",
        title="Cyber Tampering Inquiry",
        department="NCRB Women Safety Division",
    )
    db_session.add(case)
    db_session.commit()

    # Record 3 events
    record_audit_event(
        db=db_session,
        event_type="CASE",
        action="CASE_CREATED",
        case_id=case.id,
        details={"case_name": case.case_name},
    )
    record_audit_event(
        db=db_session,
        event_type="DOCUMENT",
        action="DOCUMENT_UPLOADED",
        case_id=case.id,
        details={"file_name": "chat_logs.pdf"},
    )

    cert = export_evidentiary_certificate(db_session, case.id)
    assert cert["case_id"] == "CASE-2026-00101"
    assert cert["total_case_events"] == 2
    assert cert["chain_integrity_verified"] is True
    assert "CERT-" in cert["certificate_id"]
    assert "Ministry of Home Affairs" in cert["issuer"]
    assert len(cert["certificate_signature_sha256"]) == 64


def test_audit_api_endpoints():
    """Test REST API routes for audit query, verification, and certificate."""
    with TestClient(app) as client:
        # 1. Verification endpoint
        res_verify = client.get("/api/audit/verify")
        assert res_verify.status_code == 200
        data_verify = res_verify.json()
        assert "is_valid" in data_verify
        assert "total_events" in data_verify

        # 2. List audit events
        res_list = client.get("/api/audit?limit=10")
        assert res_list.status_code == 200
        events = res_list.json()
        assert isinstance(events, list)

        # 3. Case-specific audit & certificate (using seed case)
        res_cases = client.get("/api/cases")
        if res_cases.status_code == 200 and res_cases.json():
            first_case_id = res_cases.json()[0]["id"]
            res_case_audit = client.get(f"/api/audit/cases/{first_case_id}")
            assert res_case_audit.status_code == 200
            assert isinstance(res_case_audit.json(), list)

            res_cert = client.get(f"/api/audit/cases/{first_case_id}/certificate")
            assert res_cert.status_code == 200
            cert = res_cert.json()
            assert "certificate_id" in cert
            assert cert["chain_integrity_verified"] is True

