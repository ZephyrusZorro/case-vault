# Security and production scope

## Implemented protections

- Passwords use salted PBKDF2-HMAC-SHA-256 with 600,000 iterations. Failed login attempts temporarily lock an account. Password changes revoke all previous sessions.
- Bearer session tokens are random; only their SHA-256 hashes are stored. They expire after 12 hours. The frontend keeps the token in session storage rather than persisting it across browser sessions.
- The first administrator requires a random one-time setup token. Setup is blocked once any user exists, with a database uniqueness check for concurrent attempts.
- Every case and document route enforces authorization. Case viewers cannot edit. Only case leads and administrators can change membership and legal hold.
- Evidence bytes and extracted text are encrypted with AES-256-GCM. Read operations verify the authentication tag and the original SHA-256 digest.
- Extracted document words are indexed as keyed HMAC tokens. Searches for text are exact word matches. Case titles, descriptions, filenames and other metadata remain plaintext in the database.
- Every version is preserved, and the API exposes no deletion operation. Legal hold prevents archiving a case.
- Audit events form a keyed hash chain with a stored head and a verification endpoint. Successful evidence downloads and integrity checks are included.
- API CORS is limited to configured origins; content sniffing, framing, referrer and browser permissions are restricted by headers.

## Operator obligations

For live sensitive documents, deploy behind TLS, use a managed secret store for `DMS_MASTER_KEY`, protect database and file backups, limit host and database privileges, monitor access, and test recovery. Back up the database and evidence vault together with the same encryption key. A changed key is rejected at startup for an existing installation.

The local generated key is a convenience for a single machine demo. Operating-system file permissions and full-disk encryption remain the operator's responsibility. A publicly reachable fresh instance should set `DMS_SETUP_TOKEN` before startup and complete setup promptly.

## Explicit gaps

This is a hackathon prototype, not a certified evidence repository. It does not provide malware scanning, document sanitization, qualified electronic signatures, timestamp authority, court filing integration, external blockchain anchoring, independent audit notarization, retention-driven purge, automatic backups, disaster recovery, multi-tenant isolation, formal accessibility audit, or jurisdiction-specific legal compliance. A SHA-256 digest or an HMAC receipt alone is not a legal digital signature. OCR text is only a search aid and may be incomplete or wrong.

Before production use, add schema migrations, deployment-specific authorization review, request rate limiting at the gateway, threat modeling, penetration testing, automated encrypted backups, retention policy governance and independent audit anchoring. PostgreSQL is recommended for concurrent multi-user operation.
