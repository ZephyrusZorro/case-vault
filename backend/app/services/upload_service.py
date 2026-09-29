"""Document upload service — safe storage, hashing, DB records."""
import hashlib
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger, log_stage
from app.core.security import (
    UploadValidationError,
    sanitize_filename,
    validate_upload,
)
from app.db.models import Case, Document, DocumentVersion, User

log = get_logger("idshield.upload")

_CHUNK = 1024 * 1024


def _store_file(case_dir: Path, data: bytes, ext: str) -> tuple[str, str, int]:
    """Write bytes under the case directory. Returns (stored_name, sha256, size)."""
    stored_name = f"{uuid.uuid4().hex}{ext}"
    target = case_dir / stored_name
    digest = hashlib.sha256(data).hexdigest()
    target.write_bytes(data)
    return stored_name, digest, len(data)


async def save_upload(
    db: Session,
    case: Case,
    upload: UploadFile,
    current_user: User | None = None,
) -> Document:
    """Validate and persist one uploaded file for a case with initial version record."""
    display_name = sanitize_filename(upload.filename or "upload")

    # Read up to max+1 bytes so oversize files are rejected without buffering
    # unbounded content.
    data = await upload.read(settings.max_upload_bytes + 1)
    ext = validate_upload(display_name, upload.content_type, len(data), settings.max_upload_bytes)

    case_dir = settings.upload_dir / case.id
    case_dir.mkdir(parents=True, exist_ok=True)
    stored_name, file_hash, size = _store_file(case_dir, data, ext)
    stored_rel_path = str((case_dir / stored_name).relative_to(settings.upload_dir))

    doc = Document(
        case_id=case.id,
        file_name=display_name,
        stored_name=stored_name,
        mime_type=upload.content_type or "",
        file_size=size,
        original_path=stored_rel_path,
        file_hash=file_hash,
        processing_status="uploaded",
        current_version_number=1,
    )
    db.add(doc)
    db.flush()

    # Create Genesis version 1 in the exhibit chain
    v1 = DocumentVersion(
        document_id=doc.id,
        case_id=case.id,
        version_number=1,
        file_name=display_name,
        stored_path=stored_rel_path,
        file_size=size,
        mime_type=upload.content_type or "",
        sha256_hash=file_hash,
        previous_version_hash=None,
        version_tag="original_evidence",
        change_summary="Initial exhibit intake",
        uploaded_by_id=current_user.id if current_user else None,
        uploaded_by_name=current_user.name if current_user else None,
    )
    db.add(v1)
    db.commit()
    db.refresh(doc)

    log_stage(
        log,
        "DOCUMENT_UPLOADED",
        case_id=case.id,
        doc_id=doc.id,
        size=size,
        hash_prefix=file_hash[:12],
    )
    return doc


async def add_document_version(
    db: Session,
    doc: Document,
    upload: UploadFile,
    version_tag: str = "certified_copy",
    change_summary: str | None = None,
    current_user: User | None = None,
) -> DocumentVersion:
    """Safely store and cryptographically chain a new version of an existing exhibit."""
    display_name = sanitize_filename(upload.filename or doc.file_name)
    data = await upload.read(settings.max_upload_bytes + 1)
    ext = validate_upload(display_name, upload.content_type, len(data), settings.max_upload_bytes)

    case_dir = settings.upload_dir / doc.case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    stored_name, file_hash, size = _store_file(case_dir, data, ext)
    stored_rel_path = str((case_dir / stored_name).relative_to(settings.upload_dir))

    prev_hash = doc.file_hash
    next_version_num = (doc.current_version_number or 1) + 1

    version = DocumentVersion(
        document_id=doc.id,
        case_id=doc.case_id,
        version_number=next_version_num,
        file_name=display_name,
        stored_path=stored_rel_path,
        file_size=size,
        mime_type=upload.content_type or "",
        sha256_hash=file_hash,
        previous_version_hash=prev_hash,
        version_tag=version_tag,
        change_summary=change_summary,
        uploaded_by_id=current_user.id if current_user else None,
        uploaded_by_name=current_user.name if current_user else None,
    )
    db.add(version)

    # Update document current version pointers
    doc.current_version_number = next_version_num
    doc.file_hash = file_hash
    doc.file_name = display_name
    doc.file_size = size
    doc.original_path = stored_rel_path
    if upload.content_type:
        doc.mime_type = upload.content_type

    db.commit()
    db.refresh(version)

    log_stage(
        log,
        "DOCUMENT_VERSION_ADDED",
        doc_id=doc.id,
        version=next_version_num,
        sha256_prefix=file_hash[:12],
        tag=version_tag,
    )
    return version


def verify_document_chain(db: Session, doc: Document) -> dict:
    """Verify cryptographic hash integrity and sequence chaining across all exhibit versions."""
    from sqlalchemy import select
    from app.core.security import resolve_within

    versions = list(
        db.scalars(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == doc.id)
            .order_by(DocumentVersion.version_number.asc())
        ).all()
    )

    is_valid = True
    errors = []

    for i, v in enumerate(versions):
        # 1. Verify file on disk exists and matches sha256_hash
        try:
            p = resolve_within(settings.upload_dir, v.stored_path)
            if not p.is_file():
                is_valid = False
                errors.append(f"Version v{v.version_number}: Physical file missing on disk.")
            else:
                disk_bytes = p.read_bytes()
                computed_hash = hashlib.sha256(disk_bytes).hexdigest()
                if computed_hash != v.sha256_hash:
                    is_valid = False
                    errors.append(
                        f"Version v{v.version_number}: Tamper detected! "
                        f"Stored hash {v.sha256_hash[:12]} does not match disk hash {computed_hash[:12]}."
                    )
        except Exception as e:
            is_valid = False
            errors.append(f"Version v{v.version_number}: Error reading file: {str(e)}")

        # 2. Verify cryptographic linkage to previous version
        if i == 0:
            if v.previous_version_hash is not None:
                is_valid = False
                errors.append(f"Version v{v.version_number}: Genesis exhibit must not have predecessor hash.")
        else:
            prev = versions[i - 1]
            if v.previous_version_hash != prev.sha256_hash:
                is_valid = False
                errors.append(
                    f"Version v{v.version_number}: Broken chain! "
                    f"Expected previous hash {prev.sha256_hash[:12]} but got {str(v.previous_version_hash)[:12]}."
                )

    return {
        "document_id": doc.id,
        "is_valid": is_valid,
        "version_count": len(versions),
        "versions": versions,
        "errors": errors,
    }


def delete_document(db: Session, doc: Document) -> bool:
    """Remove a document record and its stored files (best effort)."""
    try:
        path = settings.upload_dir / doc.original_path
        if path.is_file():
            path.unlink()
        # Preprocessing derivative written by the pipeline (…_processed.png).
        processed = path.with_name(path.stem + "_processed.png")
        if processed.is_file():
            processed.unlink()
    except OSError:  # pragma: no cover - best effort cleanup
        log.warning("DOCUMENT_FILE_DELETE_FAILED | doc_id=%s", doc.id)
    db.delete(doc)
    db.commit()
    log_stage(log, "DOCUMENT_DELETED", doc_id=doc.id)
    return True


def get_document_file_path(doc: Document) -> Path:
    """Resolve a document's stored file inside the upload dir (traversal-safe)."""
    from app.core.security import resolve_within

    return resolve_within(settings.upload_dir, doc.original_path)


def get_version_file_path(version: DocumentVersion) -> Path:
    """Resolve a specific version's stored file (traversal-safe)."""
    from app.core.security import resolve_within

    return resolve_within(settings.upload_dir, version.stored_path)


__all__ = [
    "save_upload",
    "add_document_version",
    "verify_document_chain",
    "delete_document",
    "get_document_file_path",
    "get_version_file_path",
    "UploadValidationError",
]
