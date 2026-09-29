"""Search and retrieval service for legal investigation cases, exhibits, and audit trail."""
from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any

from sqlalchemy import select, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.core.auth import check_clearance, can_access_sealed_exhibit
from app.db.models import Case, Document, ExtractedField, DocumentVersion, AuditEvent, User
from app.schemas.search import SearchResultItem, SearchResultsResponse


def _format_date(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def search_entities(
    db: Session,
    q: str = "",
    entity_type: str = "all",
    classification: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    legal_hold: bool | None = None,
    is_sealed: bool | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User | None = None,
) -> SearchResultsResponse:
    """Execute multi-facet search across cases, document exhibits, and cryptographic audit events."""
    start_time = time.perf_counter()
    q_str = (q or "").strip()
    q_lower = q_str.lower()
    terms = [t for t in q_lower.split() if t]

    entity_type = (entity_type or "all").lower()
    include_cases = entity_type in {"all", "cases", "case"}
    include_documents = entity_type in {"all", "documents", "document", "exhibits", "exhibit"}
    include_audit = entity_type in {"all", "audit", "audit_events", "audit_event", "events"}

    results: list[SearchResultItem] = []
    cases_hits = 0
    docs_hits = 0
    audit_hits = 0

    # Parse date filters if provided
    dt_from: datetime | None = None
    dt_to: datetime | None = None
    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except Exception:
            dt_from = None
    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except Exception:
            dt_to = None

    # -------------------------------------------------------------------------
    # 1. SEARCH CASES
    # -------------------------------------------------------------------------
    if include_cases:
        query_cases = select(Case).order_by(desc(Case.created_at))
        all_cases = db.scalars(query_cases).all()

        for case in all_cases:
            # Clearance check
            case_classification = getattr(case, "classification_level", "restricted")
            if not check_clearance(current_user, case_classification):
                continue

            # Facet filters
            if classification and case_classification.lower() != classification.lower():
                continue
            if status and status.lower() != "all" and (case.status or "").lower() != status.lower():
                continue
            if priority and priority.lower() != "all" and (case.priority or "").lower() != priority.lower():
                continue
            if legal_hold is not None and bool(case.legal_hold) != legal_hold:
                continue
            if dt_from and case.created_at and case.created_at < dt_from:
                continue
            if dt_to and case.created_at and case.created_at > dt_to:
                continue

            # Query match check
            matched_field: str | None = None
            snippet: str | None = None

            if not terms:
                matched_field = "Directory Listing"
                snippet = case.description or f"Case container {case.case_id or case.case_number}"
            else:
                c_id = (case.case_id or "").lower()
                c_num = str(case.case_number or "")
                c_title = (case.title or "").lower()
                c_name = (case.case_name or "").lower()
                c_desc = (case.description or "").lower()
                c_app = (case.applicant_name or "").lower()
                c_dept = (case.department or "").lower()
                c_type = (case.case_type or "").lower()
                c_inv = " ".join(case.assigned_investigators or []).lower()

                if any(t in c_id or t in c_num for t in terms):
                    matched_field = "Case Identifier"
                    snippet = f"Identifier match: {case.case_id or f'CASE-2026-{c_num}'}"
                elif any(t in c_title or t in c_name for t in terms):
                    matched_field = "Case Title"
                    snippet = case.title or case.case_name
                elif any(t in c_app for t in terms):
                    matched_field = "Applicant / Subject"
                    snippet = f"Applicant/Subject of interest: {case.applicant_name}"
                elif any(t in c_inv for t in terms):
                    matched_field = "Assigned Investigator"
                    snippet = f"Assigned: {', '.join(case.assigned_investigators or [])}"
                elif any(t in c_dept or t in c_type for t in terms):
                    matched_field = "Department / Category"
                    snippet = f"{case.department or 'NCRB'} · {case.case_type or 'General'}"
                elif any(t in c_desc for t in terms):
                    matched_field = "Case Description"
                    snippet = case.description[:200] if case.description else ""

            if matched_field:
                cases_hits += 1
                results.append(
                    SearchResultItem(
                        entity_type="case",
                        id=case.id,
                        title=case.title or case.case_name,
                        subtitle=case.case_id or f"CASE-2026-{str(case.case_number).zfill(5) if hasattr(case, 'case_number') else case.id[:8]}",
                        case_id=case.id,
                        case_title=case.title or case.case_name,
                        match_field=matched_field,
                        match_snippet=snippet,
                        classification_level=case_classification,
                        is_sealed=False,
                        legal_hold=bool(case.legal_hold),
                        status=case.status,
                        priority=case.priority,
                        timestamp=_format_date(case.created_at),
                        metadata={
                            "case_type": case.case_type,
                            "department": case.department,
                            "applicant_name": case.applicant_name,
                            "assigned_investigators": case.assigned_investigators,
                            "legal_hold_reason": case.legal_hold_reason,
                        },
                    )
                )

    # -------------------------------------------------------------------------
    # 2. SEARCH DOCUMENTS & EXHIBITS (INCLUDING OCR CONTENT & VERSIONS)
    # -------------------------------------------------------------------------
    if include_documents:
        query_docs = (
            select(Document)
            .options(
                joinedload(Document.case),
                joinedload(Document.fields),
                joinedload(Document.versions),
            )
            .order_by(desc(Document.created_at))
        )
        all_docs = db.scalars(query_docs).unique().all()

        for doc in all_docs:
            doc_class = getattr(doc, "classification_level", "restricted")
            # Clearance check
            if not check_clearance(current_user, doc_class):
                continue
            # Sealed exhibit check
            if getattr(doc, "is_sealed", False) and not can_access_sealed_exhibit(current_user):
                continue

            # Facet filters
            if classification and doc_class.lower() != classification.lower():
                continue
            if is_sealed is not None and bool(doc.is_sealed) != is_sealed:
                continue
            if legal_hold is not None and bool(doc.legal_hold) != legal_hold:
                continue
            if dt_from and doc.created_at and doc.created_at < dt_from:
                continue
            if dt_to and doc.created_at and doc.created_at > dt_to:
                continue

            matched_field: str | None = None
            snippet: str | None = None

            if not terms:
                matched_field = "Exhibit Index"
                snippet = f"{doc.legal_category or 'Legal Exhibit'} · {doc.file_name}"
            else:
                d_name = (doc.file_name or "").lower()
                d_ex = (doc.exhibit_number or "").lower()
                d_cat = (doc.legal_category or "").lower()
                d_hash = (doc.file_hash or "").lower()

                if any(t in d_ex for t in terms) and d_ex:
                    matched_field = "Exhibit Reference"
                    snippet = f"Exhibit Ref: {doc.exhibit_number}"
                elif any(t in d_name for t in terms):
                    matched_field = "File Name"
                    snippet = f"File: {doc.file_name}"
                elif any(t in d_cat for t in terms):
                    matched_field = "Legal Category"
                    snippet = f"Category: {doc.legal_category}"
                elif any(t in d_hash for t in terms) and d_hash:
                    matched_field = "Cryptographic SHA-256 Hash"
                    snippet = f"SHA-256: {doc.file_hash}"
                else:
                    # Check version chain hashes & summaries
                    for ver in doc.versions:
                        v_hash = (ver.sha256_hash or "").lower()
                        v_summary = (ver.change_summary or "").lower()
                        v_name = (ver.file_name or "").lower()
                        if any(t in v_hash for t in terms):
                            matched_field = f"Version v{ver.version_number} Hash"
                            snippet = f"Linked version {ver.version_number} SHA-256: {ver.sha256_hash}"
                            break
                        if any(t in v_summary for t in terms) and v_summary:
                            matched_field = f"Version v{ver.version_number} Note"
                            snippet = f"Change note: {ver.change_summary}"
                            break
                        if any(t in v_name for t in terms):
                            matched_field = f"Version v{ver.version_number} File"
                            snippet = f"Version {ver.version_number} file: {ver.file_name}"
                            break

                    # Check extracted OCR fields
                    if not matched_field:
                        for field in doc.fields:
                            f_raw = (field.raw_value or "").lower()
                            f_norm = (field.normalized_value or "").lower()
                            f_name = (field.field_name or "").lower()
                            if any(t in f_raw or t in f_norm for t in terms):
                                matched_field = f"OCR Field [{field.field_name}]"
                                snippet = f"Extracted value: '{field.normalized_value or field.raw_value}' (Confidence: {int((field.confidence or 0)*100)}%)"
                                break

            if matched_field:
                docs_hits += 1
                case_name = doc.case.title or doc.case.case_name if doc.case else None
                results.append(
                    SearchResultItem(
                        entity_type="document",
                        id=doc.id,
                        title=doc.file_name,
                        subtitle=doc.exhibit_number or f"Exhibit v{doc.current_version_number or 1}",
                        case_id=doc.case_id,
                        case_title=case_name,
                        match_field=matched_field,
                        match_snippet=snippet,
                        classification_level=doc_class,
                        is_sealed=bool(doc.is_sealed),
                        legal_hold=bool(doc.legal_hold),
                        timestamp=_format_date(doc.created_at),
                        metadata={
                            "exhibit_number": doc.exhibit_number,
                            "legal_category": doc.legal_category,
                            "version_count": len(doc.versions),
                            "current_version": doc.current_version_number or 1,
                            "file_hash_prefix": (doc.file_hash[:12] if doc.file_hash else None),
                            "is_sealed": doc.is_sealed,
                            "sealed_reason": doc.sealed_reason,
                            "legal_hold_reason": doc.legal_hold_reason,
                        },
                    )
                )

    # -------------------------------------------------------------------------
    # 3. SEARCH CRYPTOGRAPHIC AUDIT EVENTS
    # -------------------------------------------------------------------------
    if include_audit and legal_hold is None and is_sealed is None and not status and not priority:
        query_audit = select(AuditEvent).options(joinedload(AuditEvent.case)).order_by(desc(AuditEvent.sequence_number))
        all_audit = db.scalars(query_audit).all()

        for ev in all_audit:
            # Audit events can be searched by officers; if tied to a case, respect case clearance
            if ev.case:
                ev_class = getattr(ev.case, "classification_level", "restricted")
                if not check_clearance(current_user, ev_class):
                    continue

            if dt_from and ev.timestamp and ev.timestamp < dt_from:
                continue
            if dt_to and ev.timestamp and ev.timestamp > dt_to:
                continue

            matched_field: str | None = None
            snippet: str | None = None

            if not terms:
                matched_field = "Audit Ledger Event"
                snippet = f"Seq #{ev.sequence_number} · {ev.action} by {ev.user_name or ev.user_email or 'system'}"
            else:
                a_action = (ev.action or "").lower()
                a_type = (ev.event_type or "").lower()
                a_actor = f"{ev.user_name or ''} {ev.user_email or ''}".lower()
                a_hash = (ev.current_hash or "").lower()
                a_seq = str(ev.sequence_number)
                a_details = json.dumps(ev.details or {}).lower()

                if any(t in a_seq for t in terms):
                    matched_field = "Sequence Number"
                    snippet = f"Ledger Sequence #{ev.sequence_number} · Block {ev.block_height}"
                elif any(t in a_action or t in a_type for t in terms):
                    matched_field = "Action / Event Type"
                    snippet = f"Event: {ev.event_type} — Action: {ev.action}"
                elif any(t in a_actor for t in terms):
                    matched_field = "Actor / Officer"
                    snippet = f"Officer: {ev.user_name or 'Unknown'} ({ev.user_email or ev.user_role or 'System'})"
                elif any(t in a_hash for t in terms):
                    matched_field = "Cryptographic Block Hash"
                    snippet = f"Hash Digest: {ev.current_hash}"
                elif any(t in a_details for t in terms):
                    matched_field = "Audit Event Details"
                    snippet = f"Detail payload: {json.dumps(ev.details)[:160]}"

            if matched_field:
                audit_hits += 1
                case_title = ev.case.title or ev.case.case_name if ev.case else None
                results.append(
                    SearchResultItem(
                        entity_type="audit_event",
                        id=ev.id,
                        title=f"#{ev.sequence_number} {ev.action.replace('_', ' ')}",
                        subtitle=f"Block {ev.block_height} · {ev.event_type}",
                        case_id=ev.case_id,
                        case_title=case_title,
                        match_field=matched_field,
                        match_snippet=snippet,
                        classification_level=getattr(ev.case, "classification_level", "restricted") if ev.case else "restricted",
                        is_sealed=False,
                        legal_hold=False,
                        timestamp=_format_date(ev.timestamp),
                        metadata={
                            "sequence_number": ev.sequence_number,
                            "event_type": ev.event_type,
                            "action": ev.action,
                            "actor": ev.user_name or ev.user_email or "System",
                            "user_role": ev.user_role,
                            "current_hash": ev.current_hash,
                            "block_height": ev.block_height,
                        },
                    )
                )

    total_hits = len(results)
    # Apply pagination
    paginated_results = results[offset : offset + limit]

    took_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return SearchResultsResponse(
        query=q_str,
        total_hits=total_hits,
        cases_count=cases_hits,
        documents_count=docs_hits,
        audit_count=audit_hits,
        results=paginated_results,
        took_ms=took_ms,
    )
