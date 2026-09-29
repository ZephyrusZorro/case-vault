# ID-SHIELD — Production Readiness Report

> Legacy ID-SHIELD identity prototype report. See the current CaseVault [security and production scope](casevault-security.md).

**Date:** 2026-08-26 · **Phase:** Demo (SIH26188) · **Verified build:** post-enhancement

---

## Verdict

| Context | Ready? | Notes |
|---|---|---|
| **Demo / evaluation deployment** | ✅ YES | Deployed and verified end-to-end on this machine |
| **Public internet with real documents** | ⚠️ NOT YET | Needs auth + TLS + hardening first (see gaps) |

---

## 1. Analysis performed (full project structure)

### Backend (`backend/app`)
- 9 API routers mounted under `/api` in `main.py`; SPA static hosting when `frontend/dist` exists
- 14 services forming the pipeline: preprocess → OCR → classify → fields → QR → forensics → duplicates → validate → consistency → risk
- SQLAlchemy 2 models (Case, Document, ExtractedField, ValidationResult, CrossDocumentFinding, ForensicFinding, RiskFactor, AnalysisStage), SQLite default / PostgreSQL-ready URL
- 75 tests covering pipeline, validation/MRZ, consistency, risk engine, forensics, duplicate detection, upload security, API shapes

### Frontend (`frontend/src`)
- 31 files: 9 pages, 5 document tabs/components, layout shell w/ sidebar + drawer + ApiStatus pill, typed API layer (`services/api.ts`), generic `useApi` hook
- React 18 + Vite 5 + TS strict mode (typecheck gates the build) + Tailwind + Recharts

---

## 2. Bugs found & FIXED this session

### Backend — critical
1. **Risk stage ran once per document instead of once per case** (`pipeline.py:_stage_risk`, former lines 431–492). On multi-document cases the risk ledger rows were inserted N times and the score recomputed N times against partial evidence. Rewritten so field-counting completes first, then a single evaluation runs per case.
2. **Phantom `case.updated_at` assignment** (`pipeline.py:612`) — attribute was never a mapped column; silent no-op removed.
3. **Orphaned `_processed.png` files on document delete** (`upload_service.py`) — derivative cleanup added.
4. **Case-number race condition → unhandled 500** (`case_service.py:create_case`) — now retries on unique-constraint IntegrityError.
5. **Concurrent re-analysis hazard** (`routes_analysis.py`) — `POST /analyze` while status = `processing` now returns HTTP 409.

### Backend — hygiene
6. Mojibake docstring repaired in `forensic_service.py`; UTF-8 normalized (BOM removed).
7. Regression test added: `tests/test_pipeline.py::test_risk_ledger_written_once_for_multi_document_case`.

### Frontend — functional
8. **Stale-response race in `useApi`** — request-sequence guard added; out-of-order responses can no longer overwrite newer data (visible flake in History search).
9. **Search fired one API request per keystroke** (`HistoryPage.tsx`) — 300 ms debounce added.
10. **ProcessingPage polled forever on backend loss** — retry cap (8 consecutive errors) + explicit "Retry / Back" failure state.
11. **Object-URL leak in NewCasePage** — preview URLs revoked on unmount via `filesRef`.
12. **DocImage stuck fallback state** — failed-src tracking so switching documents resets it.
13. **ApiStatus ignored `VITE_API_BASE`** — health poll now honors the configured base.
14. **Header title vanished on `/screen/processing/*`** — route meta added.
15. **React duplicate-key warnings** fixed in CaseDetail fields table, ValidationTab items, ReportTab fields.
16. **FastAPI error blobs leaked raw JSON into UI banners** — `api.ts` now parses `{detail}` (string or array) into short messages.
17. **Dashboard hid recent-list failures as empty state** — `recent.error` now surfaced.

## 3. Verification results

- ✅ `pytest backend/tests` → **75 passed**
- ✅ `tsc --noEmit` → clean (strict)
- ✅ `npm run build` → production bundle built
- ✅ Seed data: 6 synthetic cases loaded through the real pipeline
- ✅ Production server running: `uvicorn app.main:app --port 8000` serving UI + API on one port
- ✅ E2E checks from a fresh HTTP client:
  - `GET /` → 200 HTML · `GET /history` → 200 (SPA fallback OK)
  - `GET /api/dashboard/summary` → totals derived from stored cases only
  - `POST /api/demo/signature-case` → case created, all 10 stages recorded, completed
  - Signature case result: **score 72/100, HIGH band, manual_review_required**, forensics warning + DOB mismatch flagged → matches the documented demo expectation
  - Report payload verified: `factors` + `key_findings` populated, disclaimer present

---

## 4. How it's currently deployed

```powershell
# Production-style single process (UI served by the API):
cd frontend && npm run build && cd ..
cd backend && ..\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Server is **running now**: http://localhost:8000
- Container path (untested this session but config reviewed): `docker compose up --build`
- One-click offline launcher for demo machines: `start_idshield.bat`

---

## 5. Remaining gaps before REAL production use (prioritized)

| # | Gap | Severity | Where |
|---|---|---|---|
| 1 | **No authentication/authorization** — any visitor sees every case | Blocking for public | `User` model exists but unused; no auth router |
| 2 | **No TLS termination guidance baked in** — must sit behind HTTPS proxy/platform | Blocking for public | Deployment docs cover Render/Fly which provide TLS |
| 3 | No rate limiting on uploads/analyze | High | `main.py` middleware |
| 4 | No CSP header; security headers are minimal (XCTO, XFO, Referrer-Policy only) | Medium | `main.py` |
| 5 | SQLite by default; no migrations tool (Alembic absent, schema via `create_all`) | Medium | `db/base.py` |
| 6 | Upload MIME validated from declared header only — no content sniffing | Medium | `core/security.py` |
| 7 | Dashboard/list endpoints load whole tables (fine at demo scale, degrades later); some N+1 patterns | Low→Medium | `routes_dashboard.py`, `routes_cases.py`, `routes_report.py` |
| 8 | No automated backups / no monitoring beyond `/api/health` | Medium | ops |
| 9 | Dead code kept intentionally: unused `User`, `Report` tables | Nit | `models.py` |
| 10 | Four sidebar pages are stubs (Reports list / Analytics / Users / Settings) — acceptable pre-demo, hide or build before review week | Low | `navItems.ts` |
| 11 | Frontend has no ESLint setup (typecheck is the enforced gate) | Low | package.json |

### Recommended order after the demo
1. Session auth (single admin role is enough initially) + hide stubs (#1, #10)
2. Deploy behind platform TLS (Render/Fly free tiers work out of the box) (#2)
3. Add slowapi-style rate limits + CSP (#3, #4)
4. Alembic if you migrate off SQLite (#5)

---

## 6. Honest limitations already documented (by design)

Heuristic forensics are *indicators*, not proof · OCR depends on scan quality · no liveness/face match (flagged P2, stubbed behind `FACE_VERIFICATION_ENABLED`) · no government-database connections · all bundled persons/documents are synthetic and labeled.

> ID-SHIELD remains an **assistive** verification prototype; final decisions belong to authorized human reviewers.
