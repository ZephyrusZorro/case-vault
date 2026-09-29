# CaseVault API

All paths are under `/api`. The FastAPI OpenAPI schema is at `/docs` when the backend is running. Except for health and initial auth, send `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/auth/state` | Whether first setup is complete |
| POST | `/auth/setup` | Create first admin; `X-Setup-Token` required |
| POST | `/auth/login` | Get 12-hour session |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/change-password` | Rotate password and revoke other sessions |
| GET, POST | `/users` | Directory; admin creates accounts |
| GET | `/summary` | Live dashboard counts and recent work |
| GET, POST | `/cases` | Search/list visible cases, create a case |
| GET, PATCH | `/cases/{id}` | Case detail and lifecycle update |
| POST, DELETE | `/cases/{id}/members[/{user_id}]` | Grant, change or revoke access |
| POST | `/cases/{id}/notes` | Add collaboration note |
| POST | `/cases/{id}/reviews` | Request assigned human review |
| PATCH | `/reviews/{id}` | Record reviewer decision |
| POST | `/cases/{id}/documents` | Multipart evidence upload |
| GET | `/documents` | Search visible documents |
| GET | `/documents/{id}` | Document and version history |
| POST | `/documents/{id}/versions` | Add an immutable version |
| GET | `/documents/{id}/versions/{version_id}/verify` | Decrypt and compare SHA-256 |
| GET | `/documents/{id}/versions/{version_id}/download` | Verified evidence download |
| GET | `/audit` | Visible audit events, optionally by case |
| GET | `/audit/verify` | Verify entire chain; admin/auditor |
| POST | `/demo/seed` | Idempotent fictional sample cases; admin |

Examples:

```json
POST /api/cases
{
  "reference": "FIR/2026/0042",
  "title": "Harbor Road incident",
  "description": "Initial case file",
  "category": "investigation",
  "classification": "confidential"
}
```

Upload fields are `file`, optional `title`, `kind` and `classification`. Supported kinds are `fir`, `police_report`, `witness_statement`, `charge_sheet`, `court_filing`, `evidence`, `forensic_report`, `legal_notice`, `judgment` and `other`.

The API returns `401` for absent or expired sessions, `403` for insufficient permission, `404` when a case is unavailable to that user, `409` for conflicting state or failed evidence integrity, and `422` for invalid input.
