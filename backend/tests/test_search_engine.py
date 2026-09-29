"""Test suite for Phase 6: Search & Retrieval Engine."""
from __future__ import annotations

import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import Case, Document, ExtractedField, User
from app.main import app


def _make_png():
    import cv2
    import numpy as np
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    _, enc = cv2.imencode(".png", img)
    return enc.tobytes()


def _login(client: TestClient, email: str, pwd: str) -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def test_search_cases_by_metadata():
    """Verify multi-keyword case retrieval by ID, title, and applicant."""
    with TestClient(app) as client:
        inv_token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {inv_token}"}

        # Create unique case
        c_res = client.post(
            "/api/cases",
            json={
                "title": "Operation Starlight Investigation",
                "applicant_name": "Kavita Devi",
                "department": "Cyber Crime Special Cell",
                "description": "Cross-border forensic inquiry into evidentiary forgery.",
            },
            headers=headers,
        )
        assert c_res.status_code == 201
        case_id = c_res.json()["id"]

        # Search by title keyword
        r1 = client.get("/api/search?q=Starlight", headers=headers)
        assert r1.status_code == 200
        data1 = r1.json()
        assert data1["cases_count"] >= 1
        assert any(item["case_id"] == case_id for item in data1["results"])

        # Search by applicant name
        r2 = client.get("/api/search?q=Kavita", headers=headers)
        assert r2.status_code == 200
        data2 = r2.json()
        assert any("Kavita Devi" in (item["match_snippet"] or "") for item in data2["results"])

        # Search by department
        r3 = client.get("/api/search?q=Special+Cell", headers=headers)
        assert r3.status_code == 200
        data3 = r3.json()
        assert any(item["case_id"] == case_id for item in data3["results"])


def test_search_documents_by_exhibit_hash_and_ocr():
    """Verify document search across exhibit ref, file hash, and OCR field values."""
    with TestClient(app) as client:
        inv_token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {inv_token}"}

        # Create case & doc
        c_res = client.post("/api/cases", json={"title": "Forensic Search Verification"}, headers=headers)
        case_id = c_res.json()["id"]

        up_res = client.post(
            f"/api/cases/{case_id}/documents",
            files=[("files", ("ballistics_report.png", io.BytesIO(_make_png()), "image/png"))],
            headers=headers,
        )
        doc_id = up_res.json()["uploaded"][0]["id"]
        doc_hash = up_res.json()["uploaded"][0]["sha256_hash"]

        # Set exhibit metadata
        client.patch(
            f"/api/documents/{doc_id}/metadata",
            json={"exhibit_number": "EX-BALLISTIC-404", "legal_category": "Hardware & Digital Seizure Memo"},
            headers=headers,
        )

        # Inject an extracted OCR field directly into DB for test verification
        from app.db.base import SessionLocal
        with SessionLocal() as db:
            db.add(
                ExtractedField(
                    document_id=doc_id,
                    field_name="serial_number",
                    raw_value="WEAPON-SER-998877",
                    normalized_value="WEAPON-SER-998877",
                    confidence=0.98,
                )
            )
            db.commit()

        # 1. Search by exhibit identifier
        r_ex = client.get("/api/search?q=BALLISTIC-404", headers=headers)
        assert r_ex.status_code == 200
        data_ex = r_ex.json()
        assert data_ex["documents_count"] >= 1
        assert any(item["id"] == doc_id for item in data_ex["results"])

        # 2. Search by SHA-256 hash prefix
        r_hash = client.get(f"/api/search?q={doc_hash[:10]}", headers=headers)
        assert r_hash.status_code == 200
        data_hash = r_hash.json()
        assert any(item["id"] == doc_id for item in data_hash["results"])

        # 3. Search by OCR extracted field value
        r_ocr = client.get("/api/search?q=998877", headers=headers)
        assert r_ocr.status_code == 200
        data_ocr = r_ocr.json()
        assert any("serial_number" in (item["match_field"] or "") for item in data_ocr["results"])


def test_clearance_filtering_in_search():
    """Verify that users without required clearance do NOT receive classified results."""
    with TestClient(app) as client:
        admin_token = _login(client, "admin@ncrb.gov.in", "Admin@12345")
        inv_token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")

        # Admin creates a case with top_secret document
        c_res = client.post(
            "/api/cases",
            json={"title": "Top Secret Black Ops Investigation"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        case_id = c_res.json()["id"]

        up_res = client.post(
            f"/api/cases/{case_id}/documents",
            files=[("files", ("covert_satellite_intel.png", io.BytesIO(_make_png()), "image/png"))],
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        doc_id = up_res.json()["uploaded"][0]["id"]

        # Mark document as secret classification
        client.patch(
            f"/api/documents/{doc_id}/metadata",
            json={"classification_level": "secret"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Investigator (clearance rank: confidential = 2) searches for covert intel
        r_inv = client.get("/api/search?q=covert_satellite", headers={"Authorization": f"Bearer {inv_token}"})
        assert r_inv.status_code == 200
        data_inv = r_inv.json()
        # Should NOT be returned to investigator
        assert not any(item["id"] == doc_id for item in data_inv["results"])

        # Admin (clearance rank: top_secret = 4) searches for same query
        r_admin = client.get("/api/search?q=covert_satellite", headers={"Authorization": f"Bearer {admin_token}"})
        assert r_admin.status_code == 200
        data_admin = r_admin.json()
        # MUST be returned to Admin
        assert any(item["id"] == doc_id for item in data_admin["results"])


def test_sealed_exhibit_filtering_in_search():
    """Verify that judicially sealed exhibits are hidden from unauthorized officers in search."""
    with TestClient(app) as client:
        sup_token = _login(client, "supervisor@ncrb.gov.in", "Supervisor@12345")
        inv_token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")

        # Supervisor creates case and document
        c_res = client.post(
            "/api/cases",
            json={"title": "Sealed Case Inquiry"},
            headers={"Authorization": f"Bearer {sup_token}"},
        )
        case_id = c_res.json()["id"]

        up_res = client.post(
            f"/api/cases/{case_id}/documents",
            files=[("files", ("witness_protect_depo.png", io.BytesIO(_make_png()), "image/png"))],
            headers={"Authorization": f"Bearer {sup_token}"},
        )
        doc_id = up_res.json()["uploaded"][0]["id"]

        # Seal the document
        client.post(
            f"/api/documents/{doc_id}/seal",
            json={"action": "seal", "reason": "Witness in Judicial Protection Program"},
            headers={"Authorization": f"Bearer {sup_token}"},
        )

        # Investigator searches for witness depo
        r_inv = client.get("/api/search?q=witness_protect", headers={"Authorization": f"Bearer {inv_token}"})
        assert r_inv.status_code == 200
        assert not any(item["id"] == doc_id for item in r_inv.json()["results"])

        # Supervisor searches for witness depo
        r_sup = client.get("/api/search?q=witness_protect", headers={"Authorization": f"Bearer {sup_token}"})
        assert r_sup.status_code == 200
        assert any(item["id"] == doc_id for item in r_sup.json()["results"])


def test_facet_and_legal_hold_filters():
    """Verify entity_type, legal_hold, and status filters work cleanly."""
    with TestClient(app) as client:
        admin_token = _login(client, "admin@ncrb.gov.in", "Admin@12345")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create case on legal hold
        c_res = client.post("/api/cases", json={"title": "Preserved Injunction Record"}, headers=headers)
        case_id = c_res.json()["id"]

        client.post(
            f"/api/cases/{case_id}/legal-hold",
            json={"action": "apply", "reason": "Supreme Court Injunction 2026"},
            headers=headers,
        )

        # Filter legal_hold=true
        r_hold = client.get("/api/search?legal_hold=true", headers=headers)
        assert r_hold.status_code == 200
        results = r_hold.json()["results"]
        assert any(item["id"] == case_id for item in results)
        assert all(item["legal_hold"] is True for item in results)

        # Filter entity_type="cases"
        r_cases = client.get("/api/search?entity_type=cases", headers=headers)
        assert r_cases.status_code == 200
        assert all(item["entity_type"] == "case" for item in r_cases.json()["results"])
