# API Reference

> Legacy ID-SHIELD identity prototype reference. The running CaseVault API is documented in [casevault-api.md](casevault-api.md).

Base URL (dev): `http://localhost:8000/api` — interactive docs at `/docs`.
All responses JSON; errors use standard HTTP codes with `{"detail": "..."}`.

## System

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + app metadata |

## Cases & documents

| Method | Path | Notes |
|---|---|---|
| POST | `/api/cases` | `{case_name}` → 201 `{id, case_number, ...}` |
| GET | `/api/cases` | History list. Query: `search`, `outcome=all\|valid\|review\|high_risk\|unable`, `sort=recent\|risk_desc\|risk_asc`, `limit` |
| GET | `/api/cases/{id}` | Case + documents (incl. `overall_risk`, `recommendation`) |
| POST | `/api/cases/{id}/documents` | multipart `files[]` (JPG/JPEG/PNG/PDF, size-capped). 422 with per-file errors on rejection |
| GET | `/api/documents/{id}` | Detail incl. extracted fields, OCR engine/confidence |
| GET | `/api/documents/{id}/file` | Stored original (preview) |
| DELETE | `/api/documents/{id}` | Removes record + stored file |

## Analysis pipeline

| Method | Path | Notes |
|---|---|---|
| POST | `/api/cases/{id}/analyze` | 202; runs stages in background |
| GET | `/api/cases/{id}/analysis` | Stage list: `stage_key, status(pending/running/done/warning/unavailable/error), detail, duration_ms` |

Stages in order: `preprocess → ocr → classify → fields → qrcode → forensics → duplicates → validate → consistency → risk`.

## Evidence endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/cases/{id}/comparison` | Per-field matrix: values per document with `agrees` flags, mismatch severity + explanation |
| GET | `/api/cases/{id}/validations` | Per-document checklist + `overall_status`: valid / review_required / unable_to_verify |
| GET | `/api/cases/{id}/forensics` | Suspicion score + findings (`region`, `bbox[x,y,w,h]`, `severity`, metric explanation) + disclaimer |
| GET | `/api/cases/{id}/risk` | Score, band, recommendation and the ± factor ledger |
| GET | `/api/cases/{id}/report` | Fused report: screening summary modules, ordered key findings, ledger, per-document details, disclaimer |

## Dashboard & demo

| Method | Path | Notes |
|---|---|---|
| GET | `/api/dashboard/summary` | Counts derived from stored recommendations (never hardcoded) |
| GET | `/api/dashboard/recent` | Recent screenings table feed |
| POST | `/api/demo/signature-case` | Creates the synthetic Rahul Sharma case and starts analysis |

## Conventions

- Uploads are untrusted: extension+MIME+size validated, filenames sanitized, storage names are UUIDs, serving is traversal-guarded.
- Long work never blocks the API thread — analysis is a background task polled via `/analysis`.
