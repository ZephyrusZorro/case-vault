# CaseVault architecture

## Domain boundaries

- `app.dms.models`: users, expiring sessions, case files, membership, documents and immutable versions, notes, reviews, installation metadata, search terms and audit events.
- `app.dms.security`: password hashing, random bearer tokens stored only as SHA-256 hashes, local installation secrets and current-user dependency.
- `app.dms.access`: the case-level policy used before reads, writes, downloads and verification.
- `app.dms.evidence`: file validation, bounded reads, text extraction, AES-256-GCM storage, keyed search terms, retrieval checks.
- `app.dms.audit`: keyed hash chain and chain verification.
- `app.dms.installation`: startup key fingerprint check and migration of early plaintext extracted-text records.
- `app.dms.routes`: validated FastAPI commands and queries. Legacy identity endpoints are not mounted.
- `frontend/src/dms`: typed API client, pages and visual system. All displayed metrics come from live API data.

## Evidence path

1. A case editor submits one PDF, DOCX, TXT, PNG or JPEG (maximum 25 MB by default).
2. The API checks extension and file signature, then extracts text where supported. Image OCR depends on a local Tesseract installation; unavailable extraction is marked as such.
3. The exact bytes receive a SHA-256 digest. A fresh 96-bit nonce and the installation key encrypt them with AES-256-GCM. Only ciphertext is written to a random vault filename.
4. Extracted text is separately encrypted. HMAC-SHA-256 word tokens support exact-word search without a plaintext full-text index. Case metadata and filenames remain searchable in the database.
5. A new immutable version and its keyed search terms are inserted. The activity is added to the audit chain in the same database transaction. If insertion fails, the new ciphertext file is removed.
6. Downloads decrypt, authenticate and recalculate SHA-256 before returning bytes. A successful access is audited.

Version bytes are not modified or overwritten by the API. There is deliberately no evidence deletion endpoint.

## Access rules

| Role | Organization scope | Case scope |
|---|---|---|
| Administrator | All cases, audit verification, user creation | Edit, grant access, retrieve evidence |
| Investigator / legal | Cases they lead or have membership in | Viewer reads; editor writes and uploads |
| Auditor | Organization-wide visibility and audit verification | Read only |

The case lead may manage membership and legal hold. The API applies these checks on every route, including file download and integrity verification. Review decisions require the assigned reviewer or an administrator.

## Audit chain

Each event stores the previous event hash and an HMAC over its actor, case, action, target, details and timestamp. A separate head record is updated with each append. Verification recomputes all hashes and checks the head. This detects ordinary in-database changes or accidental truncation when the key and head are intact. It is **not a blockchain** and does not provide independent proof against a privileged actor who can alter both the database and key. An external trusted anchor is the next step for adversarial evidence guarantees.

## Scale path

SQLite is intended for a single local process. PostgreSQL is supported through SQLAlchemy and `psycopg`, with row locking on the audit head during append. Larger deployments should use schema migrations, a managed object store with encryption and retention policies, a job queue for OCR, malware scanning, explicit pagination, and a database search strategy appropriate to the data volume. Those integrations are not asserted as complete here.
