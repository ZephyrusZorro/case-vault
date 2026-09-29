"""Clearly fictional, removable-by-database-reset demonstration records."""
import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dms import audit, evidence
from app.dms.models import CaseFile, CaseMember, Document, DocumentSearchTerm, DocumentVersion, User


SAMPLES = [
    ("DEMO/FIR/2026-0412", "Harbor Road incident", "investigation", "active", "Initial incident file and witness evidence for a fictional investigation.", [("First information report", "fir", "FIR recorded 12 September 2026. Fictional incident at Harbor Road. Officer notes: two witness interviews pending."), ("Witness statement — A. Rao", "witness_statement", "Statement recorded 13 September 2026. Witness reports a blue vehicle near the scene at 21:10.")]),
    ("DEMO/CR/2026-0188", "State v. Mehra", "litigation", "under_review", "Fictional prosecution bundle awaiting legal review.", [("Charge sheet", "charge_sheet", "Charge sheet filed for a fictional matter. Exhibits E1 and E2 submitted for review."), ("Forensic examination", "forensic_report", "Laboratory examination: sample seals received intact. Findings require human interpretation.")]),
    ("DEMO/CY/2026-0073", "Digital payment inquiry", "investigation", "active", "Fictional cyber complaint with digital evidence records.", [("Digital evidence inventory", "evidence", "Evidence inventory: device image D1, payment ledger P1, and chain of custody form C1.")]),
    ("DEMO/LC/2026-0021", "Records access petition", "legal_notice", "closed", "Fictional legal notice and court direction retained under hold.", [("Court direction", "judgment", "Court direction in a fictional records access petition. Retain all case records until further order.")]),
]


def _pdf(title: str, body: str) -> bytes:
    import pymupdf

    pdf = pymupdf.open()
    page = pdf.new_page(width=595, height=842)
    page.insert_text((48, 54), "CASEVAULT · SYNTHETIC DEMONSTRATION", fontsize=11, color=(0.11, 0.31, 0.38))
    page.insert_text((48, 100), title, fontsize=20)
    text_box = pymupdf.Rect(48, 135, 548, 750)
    page.insert_textbox(text_box, body + "\n\nThis document is fictional and has no legal effect.", fontsize=12, lineheight=1.4)
    data = pdf.tobytes()
    pdf.close()
    return data


def seed(db: Session, actor: User) -> int:
    created = 0
    for reference, title, category, status, description, documents in SAMPLES:
        if db.scalar(select(CaseFile).where(CaseFile.reference == reference)):
            continue
        case = CaseFile(reference=reference, title=title, category=category, status=status, description=description, classification="confidential", lead_user_id=actor.id, legal_hold=reference.endswith("0021"))
        db.add(case)
        db.flush()
        db.add(CaseMember(case_id=case.id, user_id=actor.id, access="editor"))
        audit.record(db, actor.id, case.id, "case.created", case.id, {"reference": reference, "synthetic": True})
        for doc_title, kind, body in documents:
            doc = Document(case_id=case.id, title=doc_title, kind=kind, classification="confidential", created_by=actor.id)
            db.add(doc)
            db.flush()
            data = _pdf(doc_title, body)
            version = DocumentVersion(document_id=doc.id, number=1, filename=doc_title.lower().replace(" ", "-").replace("—", "-") + ".pdf", mime_type="application/pdf", byte_size=len(data), sha256=hashlib.sha256(data).hexdigest(), storage_key=evidence.store(data), encrypted_text=evidence.encrypt_text(body), extraction_status="extracted", uploaded_by=actor.id)
            db.add(version)
            db.flush()
            db.add_all(DocumentSearchTerm(version_id=version.id, token_hash=token) for token in evidence.search_tokens(body))
            audit.record(db, actor.id, case.id, "document.version_uploaded", version.id, {"document_id": doc.id, "version": 1, "sha256": version.sha256, "synthetic": True})
        created += 1
    db.commit()
    return created
