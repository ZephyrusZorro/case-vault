# Security & Privacy Notes

> Legacy ID-SHIELD identity prototype reference. The current CaseVault security model is in [casevault-security.md](casevault-security.md).

Prototype-level controls appropriate for a hackathon build; listed honestly.

## Input handling (uploads are untrusted)

- Extension whitelist: JPG/JPEG/PNG/PDF only; declared MIME cross-checked.
- Size cap enforced while streaming (`MAX_UPLOAD_MB`, default 10 MB) — oversize
  files are rejected without buffering unbounded content.
- Display filenames sanitized (`core/security.sanitize_filename`); storage uses
  UUID names inside per-case UUID directories.
- Serving is traversal-guarded (`resolve_within` refuses paths outside the
  upload root); unknown document ids return 404.
- Decoding failures degrade gracefully — a corrupt "png" never crashes the
  pipeline; the case ends `unable_to_verify`.

## API / transport

- Pydantic validation on every request body; parameterized SQLAlchemy queries
  only (no string SQL).
- CORS restricted to configured origins (`CORS_ORIGINS`).
- Security headers on all responses: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- GZip compression for responses ≥1 KB.
- Single-origin production mode serves the built SPA from FastAPI; unknown
  non-API paths fall back to `index.html` with path-containment checks.

## Data protection

- SQLite dev default lives in `backend/data/` (gitignored). PostgreSQL-ready
  via `DATABASE_URL`.
- Originals and derivatives stored under `UPLOAD_DIR`, gitignored.
- Logs record stage outcomes, ids, sizes and hash **prefixes** — never full
  names, document numbers or addresses.
- Deletion: documents remove their stored file + rows; cases can be removed by
  clearing the database file in demo contexts.

## Secrets

- `.env` is gitignored; only `.env.example` ships. No secrets in source; no
  external API keys are required for the MVP (OCR/CV run locally).

## Honest gaps (documented, not hidden)

- Authentication/authorization is not implemented (single-operator prototype);
  the User entity and role column exist for future sessions.
- No rate limiting or CSRF strategy beyond SameSite defaults.
- SQLite lacks concurrent-writer hardening; switch `DATABASE_URL` to PostgreSQL
  for multi-user operation.
- Physical/report security (who can print reports) is an organizational control.
