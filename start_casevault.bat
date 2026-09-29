@echo off
setlocal
set "ROOT=%~dp0"
set "PY=%ROOT%.venv\Scripts\python.exe"
if not exist "%PY%" (
    echo [CaseVault] Python environment not found.
    echo Run: powershell -ExecutionPolicy Bypass -File "%ROOT%scripts\setup_offline.ps1"
    pause
    exit /b 1
)
echo [CaseVault] Serving http://localhost:8000
cd /d "%ROOT%backend"
start "" http://localhost:8000
"%PY%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
