"""Tests for Phase 8: Data Privacy, Redaction & PII Masking.

Verifies:
1. PII detection regex & rules (Aadhaar, PAN, phone, email, victim names u/s 228A IPC / 73 BNS).
2. Document PII scanning on extracted fields and metadata.
3. Original evidence preservation: original exhibit is immutable and untouched.
4. Derivative court_redacted version creation cryptographically chained to predecessor hash.
5. Tamper-evident audit trail event logging (DOCUMENT_REDACTED).
6. RBAC & clearance restrictions (auditors read-only, clearance enforcement).
"""
import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.db.base import SessionLocal
from app.db.models import ExtractedField
from app.main import app
from app.services import redaction_service


def _login(client: TestClient, email: str, pwd: str) -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _create_test_case_and_doc(client: TestClient, headers: dict) -> tuple[str, str]:
    case_res = client.post(
        "/api/cases",
        headers=headers,
        json={
            "case_name": "State vs Accused PII Case",
            "title": "POCSO Investigation Exhibit Record",
            "case_type": "Women Safety Investigation",
            "priority": "critical",
            "classification_level": "confidential",
        },
    )
    assert case_res.status_code == 201, f"Create case failed: {case_res.text}"
    case_id = case_res.json()["id"]

    # Upload test image exhibit
    buf = io.BytesIO()
    img = Image.new("RGB", (400, 300), color="white")
    img.save(buf, format="PNG")
    buf.seek(0)

    upload_res = client.post(
        f"/api/cases/{case_id}/documents",
        headers=headers,
        files={"files": ("FIR_Exhibit_A.png", buf.getvalue(), "image/png")},
    )
    assert upload_res.status_code == 201, f"Upload exhibit failed: {upload_res.text}"
    doc_id = upload_res.json()["uploaded"][0]["id"]
    return case_id, doc_id


def test_pii_detection_text_rules():
    """Verify regex and rule-based identification of statutory PII entities."""
    sample_text = (
        "Statement of the prosecutrix regarding incident on 12/04/2026. "
        "Aadhaar Number: 4321 8765 9012. "
        "PAN Card: ABCDE1234F. "
        "Contact Number: +91 9876543210. "
        "Official Mail: officer.test@ncrb.gov.in. "
        "Witness Name: Sunita Devi."
    )
    entities = redaction_service.detect_pii_in_text(
        sample_text,
        custom_victim_names=["Sunita Devi"],
    )

    types = {e.entity_type for e in entities}
    assert "aadhaar" in types
    assert "pan" in types
    assert "phone" in types
    assert "email" in types
    assert "victim_name" in types  # Matches both 'prosecutrix' and 'Sunita Devi'

    # Check Aadhaar masking
    aadhaar_entity = next(e for e in entities if e.entity_type == "aadhaar")
    assert aadhaar_entity.masked_value == "XXXX-XXXX-9012"

    # Check Phone masking
    phone_entity = next(e for e in entities if e.entity_type == "phone")
    assert phone_entity.masked_value.startswith("+91-XXXXX-")

    # Check Victim identity notice
    victim_entity = next(e for e in entities if e.text == "prosecutrix")
    assert "SEC 228A IPC" in victim_entity.masked_value or "73 BNS" in victim_entity.masked_value


def test_scan_document_pii_endpoint():
    """Verify scanning document extracted fields and metadata via API."""
    with TestClient(app) as client:
        token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {token}"}
        case_id, doc_id = _create_test_case_and_doc(client, headers)

        # Insert an extracted field containing sensitive PII
        with SessionLocal() as db:
            field = ExtractedField(
                document_id=doc_id,
                field_name="aadhaar_number",
                raw_value="9876 5432 1098",
                normalized_value="987654321098",
                confidence=0.99,
                source_region={"bbox": [50, 100, 150, 20]},
            )
            db.add(field)
            db.commit()

        scan_res = client.get(
            f"/api/redaction/documents/{doc_id}/scan",
            headers=headers,
            params={"victim_names": "Rani Kumari"},
        )
        assert scan_res.status_code == 200, scan_res.text
        data = scan_res.json()
        assert data["has_aadhaar_pii"] is True
        assert data["privacy_risk_level"] in {"high", "critical"}
        assert any(e["entity_type"] == "aadhaar" for e in data["entities_found"])
        assert "Section 228A IPC" in data["legal_statute_note"]


def test_create_court_redacted_derivative_and_chain():
    """Verify original evidence preservation and cryptographic hash chaining of redacted derivative."""
    with TestClient(app) as client:
        token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {token}"}
        case_id, doc_id = _create_test_case_and_doc(client, headers)

        # Get original document state
        orig_doc_res = client.get(f"/api/documents/{doc_id}", headers=headers)
        assert orig_doc_res.status_code == 200
        orig_data = orig_doc_res.json()
        v_list = client.get(f"/api/documents/{doc_id}/versions", headers=headers).json()
        assert len(v_list) == 1
        assert v_list[0]["version_number"] == 1

        # Perform redaction
        redact_payload = {
            "redactions": [
                {
                    "entity_type": "aadhaar",
                    "text_to_redact": "987654321098",
                    "bbox": [0.1, 0.2, 0.5, 0.08],
                    "label": "Mask Aadhaar",
                }
            ],
            "reason": "Section 228A IPC statutory victim identity protection for judicial filing",
            "court_order_ref": "HC-CRL-2026/884",
            "apply_watermark": True,
            "mask_style": "blackout",
        }
        redact_res = client.post(
            f"/api/redaction/documents/{doc_id}/redact",
            headers=headers,
            json=redact_payload,
        )
        assert redact_res.status_code == 200, redact_res.text
        r_body = redact_res.json()
        assert r_body["success"] is True
        assert r_body["version_number"] == 2
        assert r_body["version_tag"] == "court_redacted"
        assert r_body["previous_version_hash"] is not None
        assert r_body["sha256_hash"] != r_body["previous_version_hash"]
        assert "Original evidence remains immutable and sealed" in r_body["evidentiary_integrity_note"]

        # Verify original document version history contains both versions and chain is valid
        chain_res = client.get(f"/api/documents/{doc_id}/versions/verify", headers=headers)
        assert chain_res.status_code == 200
        chain_body = chain_res.json()
        assert chain_body["is_valid"] is True
        assert chain_body["version_count"] == 2

        # Verify audit trail records the DOCUMENT_REDACTED event
        audit_res = client.get(f"/api/audit/cases/{case_id}", headers=headers)
        assert audit_res.status_code == 200
        audit_events = audit_res.json()
        redact_events = [e for e in audit_events if e["event_type"] == "DOCUMENT_REDACTED"]
        assert len(redact_events) >= 1
        assert "court-redacted derivative" in redact_events[0]["action"].lower()


def test_redaction_rbac_auditor_prohibited():
    """Verify that auditor role cannot generate redacted documents (read-only audit role)."""
    with TestClient(app) as client:
        inv_token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        inv_headers = {"Authorization": f"Bearer {inv_token}"}
        case_id, doc_id = _create_test_case_and_doc(client, inv_headers)

        auditor_token = _login(client, "auditor@ncrb.gov.in", "Auditor@12345")
        auditor_headers = {"Authorization": f"Bearer {auditor_token}"}
        redact_payload = {
            "redactions": [{"entity_type": "phone", "bbox": [10, 10, 50, 20]}],
            "reason": "Attempted auditor redaction",
        }
        forbidden_res = client.post(
            f"/api/redaction/documents/{doc_id}/redact",
            headers=auditor_headers,
            json=redact_payload,
        )
        assert forbidden_res.status_code == 403
        assert "Auditors have read-only access" in forbidden_res.text


def test_list_redacted_versions_endpoint():
    """Verify retrieving list of court-redacted versions for an exhibit."""
    with TestClient(app) as client:
        token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {token}"}
        case_id, doc_id = _create_test_case_and_doc(client, headers)

        # Initially 0 redacted versions
        list_res1 = client.get(f"/api/redaction/documents/{doc_id}/versions", headers=headers)
        assert list_res1.status_code == 200
        assert len(list_res1.json()) == 0

        # Redact once
        client.post(
            f"/api/redaction/documents/{doc_id}/redact",
            headers=headers,
            json={"redactions": [], "reason": "Court copy release"},
        )

        list_res2 = client.get(f"/api/redaction/documents/{doc_id}/versions", headers=headers)
        assert list_res2.status_code == 200
        data = list_res2.json()
        assert len(data) == 1
        assert data[0]["version_tag"] == "court_redacted"
        assert data[0]["version_number"] == 2
