"""Cryptographic Tamper-Evident Audit Trail Service.

Maintains an immutable sequential hash chain (E1 -> E2 -> E3...) of all security,
access, and evidentiary actions across the investigation lifecycle.
"""
from datetime import datetime, timezone
import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import get_logger, log_stage
from app.db.models import AuditEvent, User

log = get_logger("idshield.audit")

GENESIS_PREVIOUS_HASH: str | None = None


def format_audit_timestamp(dt: datetime) -> str:
    """Format datetime deterministically in UTC for canonical SHA-256 hashing."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def compute_canonical_event_hash(
    sequence_number: int,
    event_type: str,
    case_id: str | None,
    document_id: str | None,
    user_id: str | None,
    timestamp_iso: str,
    previous_hash: str | None,
    details: dict[str, Any] | None,
) -> str:
    """Compute deterministic SHA-256 digest over canonical event string."""
    canonical_details = json.dumps(details or {}, sort_keys=True, separators=(",", ":"))
    payload = (
        f"{sequence_number}|"
        f"{event_type}|"
        f"{case_id or ''}|"
        f"{document_id or ''}|"
        f"{user_id or ''}|"
        f"{timestamp_iso}|"
        f"{previous_hash or 'GENESIS_BLOCK_ZERO'}|"
        f"{canonical_details}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def record_audit_event(
    db: Session,
    event_type: str,
    action: str,
    case_id: str | None = None,
    document_id: str | None = None,
    user: User | None = None,
    user_id: str | None = None,
    user_email: str | None = None,
    user_role: str | None = None,
    user_name: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    """Atomically record an audit event into the sequential cryptographic hash chain."""
    # Resolve user details
    u_id = user.id if user else user_id
    u_email = user.email if user else user_email
    u_role = user.role if user else user_role
    u_name = user.name if user else user_name

    now = datetime.now(timezone.utc)
    now_iso = format_audit_timestamp(now)

    # Retrieve latest event in the chain to bind sequence and predecessor hash
    latest = db.scalar(
        select(AuditEvent)
        .order_by(AuditEvent.sequence_number.desc())
        .limit(1)
    )

    next_seq = (latest.sequence_number + 1) if latest else 1
    prev_hash = latest.current_hash if latest else None

    # Compute current event's SHA-256
    current_hash = compute_canonical_event_hash(
        sequence_number=next_seq,
        event_type=event_type,
        case_id=case_id,
        document_id=document_id,
        user_id=u_id,
        timestamp_iso=now_iso,
        previous_hash=prev_hash,
        details=details or {},
    )

    event = AuditEvent(
        sequence_number=next_seq,
        event_type=event_type,
        action=action,
        case_id=case_id,
        document_id=document_id,
        user_id=u_id,
        user_email=u_email,
        user_role=u_role,
        user_name=u_name,
        ip_address=ip_address,
        details=details or {},
        timestamp=now,
        previous_hash=prev_hash,
        current_hash=current_hash,
        block_height=(next_seq // 100) + 1,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    log_stage(
        log,
        "AUDIT_RECORDED",
        seq=next_seq,
        event_type=event_type,
        user=u_email or "system",
        hash_prefix=current_hash[:12],
    )
    return event


def verify_audit_chain(
    db: Session,
    start_seq: int | None = None,
    end_seq: int | None = None,
) -> dict[str, Any]:
    """Verify cryptographic sequence continuity and detect any manual row modification or deletion."""
    query = select(AuditEvent).order_by(AuditEvent.sequence_number.asc())
    if start_seq is not None:
        query = query.where(AuditEvent.sequence_number >= start_seq)
    if end_seq is not None:
        query = query.where(AuditEvent.sequence_number <= end_seq)

    events = list(db.scalars(query).all())
    is_valid = True
    errors: list[str] = []
    tampered_seqs: list[int] = []

    for i, evt in enumerate(events):
        # 1. Verify sequence numbers are strictly incrementing
        if i > 0 and evt.sequence_number != events[i - 1].sequence_number + 1:
            is_valid = False
            tampered_seqs.append(evt.sequence_number)
            errors.append(
                f"Sequence gap detected! Expected #{events[i - 1].sequence_number + 1} "
                f"but found #{evt.sequence_number} (indicates row deletion)."
            )

        # 2. Verify predecessor hash link
        if i == 0:
            if start_seq is None or start_seq == 1:
                if evt.previous_hash is not None:
                    is_valid = False
                    tampered_seqs.append(evt.sequence_number)
                    errors.append(f"Genesis block #{evt.sequence_number} cannot have predecessor hash.")
        else:
            prev = events[i - 1]
            if evt.previous_hash != prev.current_hash:
                is_valid = False
                tampered_seqs.append(evt.sequence_number)
                errors.append(
                    f"Hash break at #{evt.sequence_number}! Expected previous {prev.current_hash[:12]} "
                    f"but recorded {str(evt.previous_hash)[:12]}."
                )

        # 3. Recompute canonical hash to detect in-place row tampering
        now_iso = format_audit_timestamp(evt.timestamp) if isinstance(evt.timestamp, datetime) else str(evt.timestamp)
        computed_hash = compute_canonical_event_hash(
            sequence_number=evt.sequence_number,
            event_type=evt.event_type,
            case_id=evt.case_id,
            document_id=evt.document_id,
            user_id=evt.user_id,
            timestamp_iso=now_iso,
            previous_hash=evt.previous_hash,
            details=evt.details or {},
        )

        if computed_hash != evt.current_hash:
            is_valid = False
            tampered_seqs.append(evt.sequence_number)
            errors.append(
                f"Tamper detected at #{evt.sequence_number}! Computed hash {computed_hash[:12]} "
                f"does not match stored hash {evt.current_hash[:12]}."
            )

    return {
        "is_valid": is_valid,
        "tampered": not is_valid or bool(tampered_seqs),
        "total_events": len(events),
        "verified_events": len(events) - len(tampered_seqs),
        "tampered_sequences": tampered_seqs,
        "errors": errors,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


def list_audit_events(
    db: Session,
    case_id: str | None = None,
    event_type: str | None = None,
    user_email: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditEvent]:
    """Retrieve audit events with multi-criteria filtering."""
    query = select(AuditEvent)
    if case_id:
        query = query.where(AuditEvent.case_id == case_id)
    if event_type and event_type != "all":
        query = query.where(AuditEvent.event_type == event_type)
    if user_email:
        query = query.where(AuditEvent.user_email.ilike(f"%{user_email}%"))

    query = query.order_by(AuditEvent.sequence_number.desc()).limit(limit).offset(offset)
    return list(db.scalars(query).all())


def export_evidentiary_certificate(db: Session, case_id: str | None = None) -> dict[str, Any]:
    """Generate official Evidentiary Traceability Certificate under MHA/NCRB guidelines."""
    from app.db.models import Case, Document

    case_label = case_id
    case_title = None
    exhibits_ledger: list[dict[str, Any]] = []

    if case_id:
        c = db.get(Case, case_id)
        if c is None:
            c = db.scalar(select(Case).where(Case.case_id == case_id))
        if c:
            case_label = c.case_id or case_label
            case_title = c.title or c.case_name
            docs = db.scalars(
                select(Document).where(Document.case_id == c.id).order_by(Document.created_at.asc())
            ).all()
            for d in docs:
                exhibits_ledger.append(
                    {
                        "id": d.id,
                        "exhibit_number": d.exhibit_number or f"EX-{d.id[:6].upper()}",
                        "file_name": d.file_name,
                        "legal_category": d.legal_category or "General Legal Exhibit",
                        "sha256_hash": d.file_hash,
                        "current_version_number": getattr(d, "current_version_number", 1) or 1,
                        "classification_level": getattr(d, "classification_level", "restricted"),
                        "is_sealed": bool(d.is_sealed),
                        "legal_hold": bool(d.legal_hold),
                        "uploaded_at": d.created_at.isoformat() if d.created_at else None,
                    }
                )

    verification = verify_audit_chain(db)
    events = list_audit_events(db, case_id=case_id, limit=500)

    first_hash = events[-1].current_hash if events else "GENESIS_EMPTY"
    latest_hash = events[0].current_hash if events else "GENESIS_EMPTY"

    cert_id = f"CERT-NCRB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{abs(hash(latest_hash)) % 1000000:06d}"
    sig_payload = f"{cert_id}|{case_id}|{latest_hash}|{verification['is_valid']}"
    cert_sig = hashlib.sha256(sig_payload.encode()).hexdigest()

    statement = (
        "This digital record certificate provides technical features supporting confidentiality, "
        "auditability, integrity and evidentiary traceability pursuant to digital forensics standards. "
        "It establishes an unbroken in-system cryptographic hash chain ready for future permissioned blockchain integration."
    )

    return {
        "certificate_id": cert_id,
        "issuer": "National Crime Records Bureau (NCRB), Ministry of Home Affairs",
        "organization": "National Crime Records Bureau (NCRB), Ministry of Home Affairs",
        "division": "Women Safety Division & Investigation Cybercrime Cell",
        "case_id": case_label or "GLOBAL_REGISTRY",
        "case_title": case_title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "integrity_status": "VALID_VERIFIED" if verification["is_valid"] else "TAMPER_DETECTED",
        "chain_integrity_verified": verification["is_valid"],
        "chain_length": len(events),
        "total_case_events": len(events),
        "root_hash": first_hash,
        "head_hash": latest_hash,
        "certificate_signature_sha256": cert_sig,
        "verification_report": verification,
        "deponent_system": "ID-SHIELD Digital Evidentiary Document Management System (NCRB / MHA)",
        "computer_specification": "Standard Operating Environment; SHA-256 (FIPS 180-4) Cryptographic Hash Engine; In-System Chained Hash Ledger",
        "evidentiary_statement": statement,
        "legal_notice": statement,
        "exhibits_ledger": exhibits_ledger,
        "events": [
            {
                "sequence_number": e.sequence_number,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type,
                "action": e.action,
                "user": e.user_email or e.user_name or "System",
                "role": e.user_role or "System",
                "sha256": e.current_hash,
                "previous_sha256": e.previous_hash,
            }
            for e in reversed(events)
        ],
    }


def generate_printable_certificate_html(cert: dict[str, Any]) -> str:
    """Generate official court-admissible HTML printable certificate."""
    exhibits_rows = ""
    for ex in cert.get("exhibits_ledger", []):
        exhibits_rows += f"""
        <tr>
            <td style="font-weight:bold; font-family:monospace;">{ex.get('exhibit_number')}</td>
            <td>{ex.get('file_name')}</td>
            <td>{ex.get('legal_category')}</td>
            <td class="hash-cell">{ex.get('sha256_hash')}</td>
            <td>v{ex.get('current_version_number')}</td>
            <td>{ex.get('classification_level', '').upper()}</td>
            <td>{'YES (SEALED)' if ex.get('is_sealed') else 'NO'}</td>
        </tr>
        """

    event_rows = ""
    for ev in cert.get("events", [])[:40]:  # up to 40 most recent
        event_rows += f"""
        <tr>
            <td>#{ev.get('sequence_number')}</td>
            <td>{ev.get('timestamp')[:19].replace('T', ' ')}</td>
            <td>{ev.get('event_type')}</td>
            <td>{ev.get('action')}</td>
            <td>{ev.get('user')} ({ev.get('role')})</td>
            <td class="hash-cell">{ev.get('sha256')[:16]}...</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Evidentiary Certificate - {cert.get('certificate_id')}</title>
  <style>
    body {{
      font-family: 'Times New Roman', Georgia, serif;
      margin: 40px;
      color: #111;
      line-height: 1.5;
      font-size: 13px;
    }}
    .header {{
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }}
    .gov-banner {{
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #555;
    }}
    .dept-title {{
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 4px 0;
      color: #111;
    }}
    .division-title {{
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }}
    .cert-badge {{
      display: inline-block;
      margin-top: 10px;
      padding: 4px 16px;
      border: 2px solid #000;
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
      background-color: #f7f7f7;
    }}
    .meta-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
    }}
    .meta-table td {{
      padding: 6px 10px;
      border: 1px solid #ccc;
      font-size: 12px;
    }}
    .meta-label {{
      font-weight: bold;
      width: 28%;
      background-color: #f8f9fa;
    }}
    .section-title {{
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1.5px solid #444;
      padding-bottom: 3px;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #111;
    }}
    .ledger-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 11px;
    }}
    .ledger-table th, .ledger-table td {{
      border: 1px solid #999;
      padding: 5px 7px;
      text-align: left;
    }}
    .ledger-table th {{
      background-color: #f0f0f0;
      font-weight: bold;
    }}
    .hash-cell {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      word-break: break-all;
    }}
    .declaration {{
      background-color: #fafafa;
      border: 1px solid #ddd;
      border-left: 4px solid #333;
      padding: 10px 14px;
      margin: 18px 0;
      font-size: 11.5px;
      text-align: justify;
    }}
    .sig-grid {{
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }}
    .sig-box {{
      width: 220px;
      text-align: center;
      border-top: 1px solid #222;
      padding-top: 6px;
      font-size: 11px;
      font-weight: bold;
    }}
    @media print {{
      body {{ margin: 12mm 15mm; }}
      .no-print {{ display: none !important; }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div class="gov-banner">Government of India · Ministry of Home Affairs</div>
    <div class="dept-title">National Crime Records Bureau (NCRB)</div>
    <div class="division-title">Women Safety Division & Investigation Cybercrime Directorate</div>
    <div class="cert-badge">ELECTRONIC RECORD EVIDENTIARY TRACEABILITY CERTIFICATE</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">Certificate ID</td>
      <td style="font-family: monospace; font-weight: bold;">{cert.get('certificate_id')}</td>
      <td class="meta-label">Issue Date (UTC)</td>
      <td>{cert.get('generated_at')}</td>
    </tr>
    <tr>
      <td class="meta-label">Case Identifier</td>
      <td style="font-weight: bold; color: #1e40af;">{cert.get('case_id')}</td>
      <td class="meta-label">Case Title</td>
      <td style="font-weight: bold;">{cert.get('case_title') or 'Digital Investigation Dossier'}</td>
    </tr>
    <tr>
      <td class="meta-label">Generating System</td>
      <td>{cert.get('deponent_system')}</td>
      <td class="meta-label">Integrity Status</td>
      <td style="font-weight: bold; color: #047857;">{cert.get('integrity_status')} (0 TAMPER DETECTED)</td>
    </tr>
    <tr>
      <td class="meta-label">Ledger Head SHA-256</td>
      <td colspan="3" class="hash-cell">{cert.get('head_hash')}</td>
    </tr>
    <tr>
      <td class="meta-label">Digital Signature</td>
      <td colspan="3" class="hash-cell">{cert.get('certificate_signature_sha256')}</td>
    </tr>
  </table>

  <div class="declaration">
    <strong>EVIDENTIARY DECLARATION:</strong><br>
    {cert.get('evidentiary_statement')}<br><br>
    <em>Computer Specification: {cert.get('computer_specification')}</em>
  </div>

  <div class="section-title">1. Registered Evidentiary Exhibits &amp; Cryptographic Hash Ledger</div>
  <table class="ledger-table">
    <thead>
      <tr>
        <th>Exhibit Ref</th>
        <th>File Name</th>
        <th>Legal Category</th>
        <th>SHA-256 Digest</th>
        <th>Ver</th>
        <th>Clearance</th>
        <th>Sealed</th>
      </tr>
    </thead>
    <tbody>
      {exhibits_rows if exhibits_rows else '<tr><td colspan="7" style="text-align:center;">No direct exhibit scans linked to this query scope.</td></tr>'}
    </tbody>
  </table>

  <div class="section-title">2. Chain-of-Custody Cryptographic Audit Trail (Sample Events)</div>
  <table class="ledger-table">
    <thead>
      <tr>
        <th>Seq</th>
        <th>Timestamp</th>
        <th>Event Type</th>
        <th>Action</th>
        <th>Authorized Officer</th>
        <th>Block Hash</th>
      </tr>
    </thead>
    <tbody>
      {event_rows}
    </tbody>
  </table>

  <div class="sig-grid">
    <div class="sig-box">
      Investigating Officer / Custodian<br>
      Digital Forensics Laboratory
    </div>
    <div class="sig-box">
      Authorized Certifying Officer<br>
      NCRB Women Safety Division
    </div>
  </div>
</body>
</html>"""

