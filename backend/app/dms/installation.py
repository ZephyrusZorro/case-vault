"""Verify installation key and upgrade early prototype search records."""
import hashlib

from sqlalchemy import func, select

from app.db.base import SessionLocal
from app.dms import audit, evidence
from app.dms.models import AuditEvent, AuditHead, DocumentSearchTerm, DocumentVersion, InstallationMeta
from app.dms.security import master_key


def check_and_migrate() -> None:
    fingerprint = hashlib.sha256(master_key()).hexdigest()
    with SessionLocal() as db:
        meta = db.get(InstallationMeta, "master_key_fingerprint")
        if meta and meta.value != fingerprint:
            raise RuntimeError("The CaseVault encryption key does not match this database. Restore the original key before starting.")
        if not meta:
            db.add(InstallationMeta(key="master_key_fingerprint", value=fingerprint))
            db.commit()
        if db.get(AuditHead, 1) is None:
            last = db.scalar(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1))
            db.add(AuditHead(id=1, event_hash=last.event_hash if last else "0" * 64))
            db.commit()
        for version in db.scalars(select(DocumentVersion)).all():
            value = version.encrypted_text or ""
            if not value:
                continue
            plaintext = evidence.decrypt_text(value) if value.startswith("enc:v1:") else value
            count = db.scalar(select(func.count()).select_from(DocumentSearchTerm).where(DocumentSearchTerm.version_id == version.id))
            if not count:
                db.add_all(DocumentSearchTerm(version_id=version.id, token_hash=token) for token in evidence.search_tokens(plaintext))
            if not value.startswith("enc:v1:"):
                version.encrypted_text = evidence.encrypt_text(plaintext)
                audit.record(db, None, version.document.case_id, "system.text_encrypted", version.id)
        db.commit()
