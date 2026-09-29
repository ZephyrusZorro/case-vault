"""Final verification report — evidence-fused, human-auditable."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import (
    Case,
    CrossDocumentFinding,
    Document,
    ExtractedField,
    ForensicFinding,
    RiskFactor,
    ValidationResult,
)
from app.schemas.report import (
    CaseReport,
    KeyFinding,
    ReportDocument,
    ReportField,
    ScreeningSummaryItem,
)
from app.services.consistency_service import _FIELD_LABELS
from app.services.risk_engine import _band_for, load_config
from app.services.validation_service import overall_status as doc_overall_status
from app.services.validation_service import ValidationDraft

router = APIRouter()

_DISCLAIMER = (
    "This report provides technical features supporting confidentiality, "
    "auditability, integrity, and evidentiary traceability to assist legal and "
    "investigative analysis. Final evidentiary conclusions and decisions must "
    "be evaluated by authorized investigating officers and judicial authorities."
)


def _report_label(field_name: str) -> str:
    pretty = {
        "full_name": "Name",
        "document_number": "Document Number",
        "date_of_birth": "Date of Birth",
        "expiry_date": "Date of Expiry",
        "issue_date": "Date of Issue",
    }
    return pretty.get(field_name) or field_name.replace("_", " ").title()


@router.get("/cases/{case_id}/report", response_model=CaseReport)
def get_case_report(case_id: str, db: Session = Depends(get_db)) -> CaseReport:
    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    docs = db.scalars(
        select(Document).where(Document.case_id == case_id).order_by(Document.created_at)
    ).all()
    conflicts = db.scalars(
        select(CrossDocumentFinding).where(CrossDocumentFinding.case_id == case_id)
    ).all()
    forensics = db.scalars(
        select(ForensicFinding).where(ForensicFinding.document_id.in_([d.id for d in docs] or [""]))
    ).all()
    validations = db.scalars(
        select(ValidationResult).where(ValidationResult.document_id.in_([d.id for d in docs] or [""]))
    ).all()

    key_findings: list[KeyFinding] = []
    summary_items: list[ScreeningSummaryItem] = []

    # ---- consistency -----------------------------------------------------
    hard_conflicts = [c for c in conflicts if c.severity in ("medium", "high")]
    for c in hard_conflicts:
        label = _FIELD_LABELS.get(c.field_name, c.field_name.replace("_", " ").title())
        key_findings.append(KeyFinding(level="error", text=c.explanation))
    consistent = [c for c in conflicts if c.severity == "info"]
    summary_items.append(
        ScreeningSummaryItem(
            module="Consistency check",
            outcome=(
                "mismatch" if hard_conflicts else ("consistent" if consistent else "not_applicable")
            ),
            detail=(
                f"{len(hard_conflicts)} conflicting field(s)"
                if hard_conflicts
                else f"{len(consistent)} shared field(s) consistent"
            ),
        )
    )

    # ---- forensics -------------------------------------------------------
    flagged_docs = {f.document_id for f in forensics if f.severity in ("medium", "high")}
    for f in sorted(forensics, key=lambda x: x.score, reverse=True):
        if f.severity == "high":
            key_findings.append(
                KeyFinding(level="error", text=f"High-suspicion region in the {f.region} (score {int(f.score*100)}/100).")
            )
        elif f.severity == "medium":
            key_findings.append(
                KeyFinding(level="warning", text=f"Suspicious indicators in the {f.region} (score {int(f.score*100)}/100).")
            )
    doc_names = {d.id: d.file_name for d in docs}
    summary_items.append(
        ScreeningSummaryItem(
            module="Tampering detection",
            outcome=("suspicious" if flagged_docs else "clear"),
            detail=(
                "Indicators in: " + ", ".join(sorted(doc_names[i] for i in flagged_docs))
                if flagged_docs
                else "No significant indicators"
            ),
        )
    )

    # ---- validation ------------------------------------------------------
    fails = [v for v in validations if v.status == "fail"]
    warns = [v for v in validations if v.status == "warning"]
    for v in fails:
        key_findings.append(KeyFinding(level="error", text=v.message))
    for v in warns:
        if v.check_type in ("Expiration status", "Duplicate / reuse", "QR payload vs name"):
            key_findings.append(KeyFinding(level="warning", text=v.message))
    mrz_pass = any(v.check_type == "MRZ checksum" and v.status == "pass" for v in validations)
    if mrz_pass:
        key_findings.append(KeyFinding(level="success", text="MRZ checksum verification passed."))
    summary_items.append(
        ScreeningSummaryItem(
            module="Document validation & MRZ",
            outcome=("issues" if fails else ("warnings" if warns else "passed")),
            detail=f"{len(fails)} failed, {len(warns)} warning check(s)",
        )
    )

    # ---- duplicates ------------------------------------------------------
    dup_rows = [v for v in validations if v.check_type == "Duplicate / reuse"]
    if dup_rows:
        for v in dup_rows:
            key_findings.append(KeyFinding(level="warning", text=v.message))
    summary_items.append(
        ScreeningSummaryItem(
            module="Reuse / duplicate scan",
            outcome=("reuse_detected" if dup_rows else "clear"),
            detail=f"{len(dup_rows)} document(s) matched earlier submissions" if dup_rows else "No earlier matches",
        )
    )

    # ---- facial cross-matching -------------------------------------------
    face_conflicts = [c for c in conflicts if c.field_name == "facial_photo" and c.severity in ("medium", "high")]
    face_matches = [c for c in conflicts if c.field_name == "facial_photo" and c.severity == "info"]
    face_extractions = [v for v in validations if v.check_type == "Face photo extraction"]
    if face_conflicts:
        summary_items.append(
            ScreeningSummaryItem(
                module="Facial cross-matching",
                outcome="mismatch",
                detail=f"{len(face_conflicts)} photo mismatch detected across documents",
            )
        )
    elif face_matches:
        summary_items.append(
            ScreeningSummaryItem(
                module="Facial cross-matching",
                outcome="matched",
                detail=f"Consistent facial photos across {len(face_extractions)} documents",
            )
        )
    elif face_extractions:
        summary_items.append(
            ScreeningSummaryItem(
                module="Facial cross-matching",
                outcome="single_source",
                detail=f"{len(face_extractions)} facial photo extracted",
            )
        )

    # ---- OCR -------------------------------------------------------------
    ocr_ok = sum(1 for d in docs if d.ocr_mean_confidence is not None)
    summary_items.append(
        ScreeningSummaryItem(
            module="OCR extraction",
            outcome=("ok" if ocr_ok == len(docs) and docs else ("partial" if ocr_ok else "unavailable")),
            detail=(
                f"{ocr_ok}/{len(docs)} document(s); engines: "
                + ", ".join(sorted({d.ocr_engine or "?" for d in docs}))
                if docs
                else "no documents"
            ),
        )
    )

    # ---- face verification (stubbed module) ------------------------------
    from app.core.config import settings as app_settings

    summary_items.append(
        ScreeningSummaryItem(
            module="Face verification",
            outcome="unavailable",
            detail=(
                "Enabled" if app_settings.face_verification_enabled
                else "Not available in this configuration; other evidence was still evaluated"
            ),
        )
    )

    # ---- positives at the end -------------------------------------------
    for c in consistent:
        label = _FIELD_LABELS.get(c.field_name, c.field_name.replace("_", " ").title())
        key_findings.append(KeyFinding(level="success", text=c.explanation))

    # ---- per-document details --------------------------------------------
    val_by_doc: dict[str, list[ValidationResult]] = {}
    for v in validations:
        val_by_doc.setdefault(v.document_id, []).append(v)

    report_docs: list[ReportDocument] = []
    for d in docs:
        fields = db.scalars(
            select(ExtractedField).where(ExtractedField.document_id == d.id)
        ).all()
        order = {"full_name": 0, "document_number": 1, "date_of_birth": 2}
        fields_sorted = sorted(fields, key=lambda f: (order.get(f.field_name, 9), f.field_name))
        drafts = [
            ValidationDraft(v.check_type, v.status, v.message) for v in val_by_doc.get(d.id, [])
        ]
        has_fields = bool(fields)
        report_docs.append(
            ReportDocument(
                document_id=d.id,
                file_name=d.file_name,
                document_type=d.document_type,
                type_confidence=d.type_confidence,
                ocr_engine=d.ocr_engine,
                ocr_mean_confidence=d.ocr_mean_confidence,
                fields=[
                    ReportField(
                        label=_report_label(f.field_name),
                        value=(f.normalized_value or f.raw_value),
                        confidence=f.confidence,
                    )
                    for f in fields_sorted
                ],
                validation_overall=doc_overall_status(drafts, has_fields),
                exhibit_number=getattr(d, "exhibit_number", None),
                legal_category=getattr(d, "legal_category", None),
                classification_level=getattr(d, "classification_level", "restricted"),
                current_version_number=getattr(d, "current_version_number", 1) or 1,
                file_hash=getattr(d, "file_hash", None),
            )
        )

    band = None
    if case.overall_risk is not None:
        band = _band_for(load_config(), case.overall_risk)[0]

    factors_payload: list[dict] = [
        {
            "factor": f.factor,
            "score": f.score,
            "direction": f.direction,
            "explanation": f.explanation,
        }
        for f in db.scalars(
            select(RiskFactor).where(RiskFactor.case_id == case_id).order_by(RiskFactor.score.desc())
        ).all()
    ]

    return CaseReport(
        case_id=case.id,
        case_number=case.case_number,
        case_name=case.case_name,
        formatted_case_id=case.case_id or f"CASE-2026-{str(case.case_number).zfill(5)}",
        title=case.title or case.case_name,
        case_type=case.case_type or "Women Safety Investigation",
        department=case.department or "NCRB Women Safety Division",
        priority=case.priority or "medium",
        status=case.status or "open",
        assigned_investigators=case.assigned_investigators or [],
        generated_at=datetime.now(timezone.utc),
        disclaimer=_DISCLAIMER,
        overall_risk=case.overall_risk,
        band=band,
        recommendation=case.recommendation,
        screening_summary=summary_items,
        key_findings=key_findings,
        factors=factors_payload,
        documents=report_docs,
    )
