CASEVAULT — OFFLINE WINDOWS PACKAGE
Secure legal and investigation document workspace
=================================================

The package serves the React UI and FastAPI backend on one local port.
Uploaded evidence remains on this PC in an encrypted vault. No external API
or network is required after the software dependencies are installed.

First-time setup:
  powershell -ExecutionPolicy Bypass -File scripts\setup_offline.ps1

If a wheels\ directory is included:
  powershell -ExecutionPolicy Bypass -File scripts\setup_offline.ps1 -UseWheels

Start each day:
  Double-click start_casevault.bat
  Open http://localhost:8000

The first screen requires an administrator setup token. Run this from the
package root to display the generated token:
  .venv\Scripts\python.exe -c "from pathlib import Path; print(Path('backend/data/casevault.setup-token').read_bytes().hex())"

Back up backend\data\ together: the SQLite database, vault files, and key
are all required to restore stored evidence. Tesseract is optional for OCR
of scanned images. See README.md for supported workflows and limitations.
