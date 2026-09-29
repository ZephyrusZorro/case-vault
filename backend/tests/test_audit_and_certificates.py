"""Test suite for Phase 7: Audit, Evidentiary Reports & Certificate Export."""
from __future__ import annotations

import io
from fastapi.testclient import TestClient

from app.db.base import get_db
from app.db.models import Case, Document
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


def test_evidentiary_certificate_generation():
    """Verify Section 65B-style evidentiary certificate contains mandatory legal, hash, and exhibit data."""
    with TestClient(app) as client:
        token = _login(client, "supervisor@ncrb.gov.in", "Supervisor@12345")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create case & document
        c_res = client.post(
            "/api/cases",
            json={
                "title": "Evidentiary Certificate Judicial Test Case",
                "case_type": "Women Safety Investigation",
                "department": "NCRB Women Safety Division",
            },
            headers=headers,
        )
        assert c_res.status_code == 201
        case_id = c_res.json()["id"]

        up_res = client.post(
            f"/api/cases/{case_id}/documents",
            files=[("files", ("complaint_memo.png", io.BytesIO(_make_png()), "image/png"))],
            headers=headers,
        )
        assert up_res.status_code == 201
        doc_id = up_res.json()["uploaded"][0]["id"]

        # Set exhibit metadata
        client.patch(
            f"/api/documents/{doc_id}/metadata",
            json={"exhibit_number": "EX-CMP-01", "legal_category": "FIR / Police Complaint"},
            headers=headers,
        )

        # 2. Fetch certificate JSON
        cert_res = client.get(f"/api/audit/cases/{case_id}/certificate", headers=headers)
        assert cert_res.status_code == 200
        cert = cert_res.json()

        assert cert["certificate_id"].startswith("CERT-NCRB-")
        assert "Ministry of Home Affairs" in cert["issuer"]
        assert cert["chain_integrity_verified"] is True
        assert cert["case_id"] != ""
        assert len(cert["root_hash"]) == 64
        assert len(cert["head_hash"]) == 64
        assert len(cert["certificate_signature_sha256"]) == 64

        # Verify Mandate #3 & #4 adherence in statement
        notice = cert["legal_notice"]
        assert "features supporting confidentiality, auditability, integrity and evidentiary traceability" in notice
        assert "ready for future permissioned blockchain integration" in notice
        assert not ("guarantees legal compliance" in notice)

        # Verify exhibit ledger entry
        assert "exhibits_ledger" in cert
        assert len(cert["exhibits_ledger"]) >= 1
        ex = cert["exhibits_ledger"][0]
        assert ex["exhibit_number"] == "EX-CMP-01"
        assert ex["legal_category"] == "FIR / Police Complaint"
        assert len(ex["sha256_hash"]) == 64


def test_evidentiary_certificate_html_view():
    """Verify court-admissible HTML certificate endpoint returns complete styled document."""
    with TestClient(app) as client:
        token = _login(client, "supervisor@ncrb.gov.in", "Supervisor@12345")
        headers = {"Authorization": f"Bearer {token}"}

        c_res = client.post(
            "/api/cases",
            json={"title": "Printable Certificate Test Case"},
            headers=headers,
        )
        case_id = c_res.json()["id"]

        r_html = client.get(f"/api/audit/cases/{case_id}/certificate/html", headers=headers)
        assert r_html.status_code == 200
        html = r_html.text

        assert "National Crime Records Bureau (NCRB)" in html
        assert "ELECTRONIC RECORD EVIDENTIARY TRACEABILITY CERTIFICATE" in html
        assert "EVIDENTIARY DECLARATION" in html
        assert "Print / Save as PDF" in html


def test_case_report_investigation_dossier():
    """Verify Case Report includes complete investigation dossier metadata and exhibit details."""
    with TestClient(app) as client:
        token = _login(client, "investigator@ncrb.gov.in", "Investigator@12345")
        headers = {"Authorization": f"Bearer {token}"}

        c_res = client.post(
            "/api/cases",
            json={
                "title": "Dossier Export Verification",
                "case_type": "Women Safety Investigation",
                "department": "NCRB Women Safety Division",
            },
            headers=headers,
        )
        case_id = c_res.json()["id"]

        up_res = client.post(
            f"/api/cases/{case_id}/documents",
            files=[("files", ("evidence_sample.png", io.BytesIO(_make_png()), "image/png"))],
            headers=headers,
        )
        doc_id = up_res.json()["uploaded"][0]["id"]
        client.patch(
            f"/api/documents/{doc_id}/metadata",
            json={"exhibit_number": "EX-SAMPLE-99", "legal_category": "Forensic Audit Certificate"},
            headers=headers,
        )

        r_report = client.get(f"/api/cases/{case_id}/report", headers=headers)
        assert r_report.status_code == 200
        rep = r_report.json()

        assert rep["case_id"] == case_id
        assert "CASE-2026-" in rep["formatted_case_id"]
        assert rep["title"] == "Dossier Export Verification"
        assert rep["department"] == "NCRB Women Safety Division"
        assert len(rep["documents"]) >= 1

        doc_item = rep["documents"][0]
        assert doc_item["exhibit_number"] == "EX-SAMPLE-99"
        assert doc_item["legal_category"] == "Forensic Audit Certificate"
        assert len(doc_item["file_hash"]) == 64

        # Verify Mandate #3 disclaimer compliance
        disclaimer = rep["disclaimer"]
        assert "features supporting confidentiality, auditability, integrity, and evidentiary traceability" in disclaimer
        assert not ("guarantees legal compliance" in disclaimer)
