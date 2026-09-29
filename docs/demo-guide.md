# Demo Guide

> Legacy ID-SHIELD identity prototype reference. In CaseVault, sign in as an administrator and use **Load sample cases** on the empty dashboard for fictional legal case files.

Total time: ~3 minutes. Everything runs locally; all data is synthetic.

## Preparation (once)

```bash
python -m venv .venv && .venv\Scripts\pip install -r backend\requirements.txt
cd frontend && npm install && cd ..
winget install UB-Mannheim.TesseractOCR        # or any Tesseract 5
copy .env.example .env
powershell -File run_dev.ps1                   # or bash run_dev.sh
```

Open **http://localhost:5173**.

## The 3-minute flow

1. **Landing** — *Get Started*.
2. **Screen Documents** → **Load Demo Case** (top-right).
   Creates the synthetic Rahul Sharma case through the real upload path:
   - Passport A + National ID B → DOB **2001-05-12**, MRZ checksums valid, QR payloads match.
   - PAN C → DOB **1999-05-12** and a **genuinely edited pixel strip** over the DOB row.
3. **Processing page** — live stage list fills in as the backend works
   (`preprocess → ocr → classify → fields → qrcode → forensics → duplicates → validate → consistency → risk`).
4. **View Evidence** → case workspace:
   - *Overview*: score **~72/100 HIGH**, recommendation **Manual Review Required**, ± ledger.
   - *Documents*: extracted fields with real OCR confidences (~85-95%).
   - *Validation*: passport number pattern ✓, MRZ ✓, mandatory fields ✓.
   - *Comparison*: **Date of Birth MISMATCH** — pan_C highlighted `<< DIFFERS`.
   - *Forensics*: red/amber box exactly over the tampered DOB strip on pan_C; clean documents show none.
   - *Report*: print-ready summary → **Print / Save PDF**.
5. Optional depth for judges:
   - `POST /api/demo/signature-case` again → resubmission now also trips **reuse detection** on both sides.
   - History page: search "rahul", filter by outcome, sort by risk.
   - Seed full dataset: `python -m demo.seed_cases` (6 cases) → dashboard populates from DB.

## Talking points

- *"OCR tells us what the documents say. ID-SHIELD asks whether the evidence makes sense together."*
- Every score point is cited — open any finding and read its explanation.
- Failure honesty: stop Tesseract and re-run → stages report **Unavailable** instead of pretending; corrupt files end as `unable_to_verify`.

## Reset

Delete `backend/data/` to start clean; rerun the seeder when wanted.
