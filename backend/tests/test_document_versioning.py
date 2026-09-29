"""Test suite for Phase 3: Document Management, Versioning, and Cryptographic Hash Chaining."""
import io
import pytest
from fastapi.testclient import TestClient

from app.db.base import init_db
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def _make_png(color: tuple[int, int, int] = (40, 80, 160), size: int = 64) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (size, size), color).save(buf, format="PNG")
    return buf.getvalue()


def _login(email: str = "investigator@ncrb.gov.in", password: str = "Investigator@12345") -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def test_initial_upload_creates_genesis_version():
    """Verify that uploading a document creates Genesis version 1 in the hash chain."""
    token = _login()
    # 1. Create a case
    case_resp = client.post(
        "/api/cases",
        json={"title": "Forensic Exhibit Chaining Test Case"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert case_resp.status_code == 201
    case_id = case_resp.json()["id"]

    # 2. Upload initial document
    png_bytes = _make_png(color=(50, 100, 150))
    upload_resp = client.post(
        f"/api/cases/{case_id}/documents",
        files=[("files", ("exhibit_v1.png", io.BytesIO(png_bytes), "image/png"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload_resp.status_code == 201
    uploaded_docs = upload_resp.json()["uploaded"]
    assert len(uploaded_docs) == 1
    doc_id = uploaded_docs[0]["id"]
    assert uploaded_docs[0]["current_version_number"] == 1

    # 3. Retrieve version chain
    v_resp = client.get(f"/api/documents/{doc_id}/versions")
    assert v_resp.status_code == 200
    versions = v_resp.json()
    assert len(versions) == 1
    v1 = versions[0]
    assert v1["version_number"] == 1
    assert v1["previous_version_hash"] is None
    assert len(v1["sha256_hash"]) == 64
    assert v1["version_tag"] == "original_evidence"


def test_upload_new_version_chains_cryptographically():
    """Verify that uploading v2 links to v1's SHA-256 hash."""
    token = _login()
    case_resp = client.post(
        "/api/cases",
        json={"title": "Chaining Sequence Verification Case"},
        headers={"Authorization": f"Bearer {token}"},
    )
    case_id = case_resp.json()["id"]

    # Upload v1
    v1_bytes = _make_png(color=(10, 20, 30))
    upload_resp = client.post(
        f"/api/cases/{case_id}/documents",
        files=[("files", ("petition_original.png", io.BytesIO(v1_bytes), "image/png"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = upload_resp.json()["uploaded"][0]["id"]

    # Upload v2 with redactions
    v2_bytes = _make_png(color=(200, 210, 220))
    v2_resp = client.post(
        f"/api/documents/{doc_id}/versions",
        data={"version_tag": "court_redacted", "change_summary": "Redacted victim PII per court order"},
        files={"file": ("petition_redacted.png", io.BytesIO(v2_bytes), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert v2_resp.status_code == 201, v2_resp.text
    v2_data = v2_resp.json()
    assert v2_data["version_number"] == 2
    assert v2_data["version_tag"] == "court_redacted"
    assert v2_data["change_summary"] == "Redacted victim PII per court order"

    # Verify chain
    chain_resp = client.get(f"/api/documents/{doc_id}/versions")
    assert chain_resp.status_code == 200
    versions = chain_resp.json()
    assert len(versions) == 2
    assert versions[1]["previous_version_hash"] == versions[0]["sha256_hash"]
    assert versions[1]["sha256_hash"] != versions[0]["sha256_hash"]

    # Check verification endpoint
    verify_resp = client.get(f"/api/documents/{doc_id}/versions/verify")
    assert verify_resp.status_code == 200
    report = verify_resp.json()
    assert report["is_valid"] is True
    assert report["version_count"] == 2
    assert report["errors"] == []


def test_download_historical_versions():
    """Verify downloading each specific historical version file."""
    token = _login()
    case_resp = client.post(
        "/api/cases",
        json={"title": "Download Version Test Case"},
        headers={"Authorization": f"Bearer {token}"},
    )
    case_id = case_resp.json()["id"]

    v1_bytes = _make_png(color=(11, 22, 33))
    v2_bytes = _make_png(color=(44, 55, 66))

    up_resp = client.post(
        f"/api/cases/{case_id}/documents",
        files=[("files", ("exhibit_alpha.png", io.BytesIO(v1_bytes), "image/png"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up_resp.json()["uploaded"][0]["id"]

    client.post(
        f"/api/documents/{doc_id}/versions",
        data={"version_tag": "certified_copy", "change_summary": "High resolution certified copy"},
        files={"file": ("exhibit_alpha_hd.png", io.BytesIO(v2_bytes), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Download v1
    r_v1 = client.get(f"/api/documents/{doc_id}/versions/1/file")
    assert r_v1.status_code == 200
    assert r_v1.content == v1_bytes

    # Download v2
    r_v2 = client.get(f"/api/documents/{doc_id}/versions/2/file")
    assert r_v2.status_code == 200
    assert r_v2.content == v2_bytes


def test_document_metadata_and_sealing():
    """Verify setting exhibit number, legal category, and sealing exhibits."""
    token = _login()
    supervisor_token = _login("supervisor@ncrb.gov.in", "Supervisor@12345")

    case_resp = client.post(
        "/api/cases",
        json={"title": "Sealed Exhibit Test Case"},
        headers={"Authorization": f"Bearer {token}"},
    )
    case_id = case_resp.json()["id"]

    up_resp = client.post(
        f"/api/cases/{case_id}/documents",
        files=[("files", ("confidential_report.png", io.BytesIO(_make_png()), "image/png"))],
        headers={"Authorization": f"Bearer {token}"},
    )
    doc_id = up_resp.json()["uploaded"][0]["id"]

    # Update metadata
    patch_resp = client.patch(
        f"/api/documents/{doc_id}/metadata",
        json={
            "exhibit_number": "EX-FIR-04",
            "legal_category": "Forensic Audit Certificate",
            "classification_level": "secret",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_resp.status_code == 200
    meta = patch_resp.json()
    assert meta["exhibit_number"] == "EX-FIR-04"
    assert meta["legal_category"] == "Forensic Audit Certificate"
    assert meta["classification_level"] == "secret"
    assert meta["is_sealed"] is False

    # Seal the document (requires supervisor / admin)
    seal_resp = client.patch(
        f"/api/documents/{doc_id}/metadata",
        json={"is_sealed": True},
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert seal_resp.status_code == 200
    assert seal_resp.json()["is_sealed"] is True

    # Attempting to upload new version to a sealed document is forbidden (403)
    attempt_resp = client.post(
        f"/api/documents/{doc_id}/versions",
        data={"version_tag": "court_redacted"},
        files={"file": ("tamper_attempt.png", io.BytesIO(_make_png()), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert attempt_resp.status_code == 403
    assert "sealed evidentiary exhibit" in attempt_resp.json()["detail"]


def test_auditor_cannot_add_document_version():
    """Verify that auditors cannot upload new versions (403 Forbidden)."""
    inv_token = _login("investigator@ncrb.gov.in", "Investigator@12345")
    auditor_token = _login("auditor@ncrb.gov.in", "Auditor@12345")

    case_resp = client.post(
        "/api/cases",
        json={"title": "Auditor Test Case"},
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    case_id = case_resp.json()["id"]

    up_resp = client.post(
        f"/api/cases/{case_id}/documents",
        files=[("files", ("evidence.png", io.BytesIO(_make_png()), "image/png"))],
        headers={"Authorization": f"Bearer {inv_token}"},
    )
    doc_id = up_resp.json()["uploaded"][0]["id"]

    # Auditor tries to add a version
    r = client.post(
        f"/api/documents/{doc_id}/versions",
        data={"version_tag": "certified_copy"},
        files={"file": ("auditor_copy.png", io.BytesIO(_make_png()), "image/png")},
        headers={"Authorization": f"Bearer {auditor_token}"},
    )
    assert r.status_code == 403
    assert "Auditors cannot upload or amend" in r.json()["detail"]
