# CaseVault feature map

The live app targets SIH 26190: secure digital document management for legal and investigation records. See [README.md](README.md) for setup and [docs/casevault-architecture.md](docs/casevault-architecture.md) for the data flow.

| Screen | Real workflow |
|---|---|
| Overview | Live case, document, review and legal-hold counts; recent cases and audit activity |
| Case files | Search, filter and create categorized cases with unique references |
| Case detail | Status, legal hold, notes, assigned reviews, document uploads, per-case access |
| Documents | Search authorized documents and extracted text, inspect immutable versions, preview, verify and download |
| Audit trail | Read case activity, verify the HMAC chain and export visible events |
| People & access | Create organization accounts, then grant case viewer/editor membership |
| Settings | Light/dark theme, account details and password rotation |

Files are encrypted with AES-256-GCM, checked with SHA-256, and never overwritten by a new version. Search tokens are keyed, while extracted text is encrypted. The demo seed creates fictional encrypted PDFs that exercise the same storage path as user files.

The dormant identity-forensics prototype is not exposed by the current backend or UI. Its old tests and modules remain only as reference material.
