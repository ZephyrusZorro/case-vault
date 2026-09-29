# CaseVault development launcher (Windows)
# Starts backend (:8000) + frontend dev server (:5173) and stops both on exit.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "CaseVault dev launcher" -ForegroundColor Cyan

$backend = Start-Process -FilePath "$root\.venv\Scripts\python.exe" `
    -ArgumentList "-m","uvicorn","app.main:app","--reload","--port","8000" `
    -WorkingDirectory "$root\backend" -PassThru -WindowStyle Hidden

$frontend = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm run dev" `
    -WorkingDirectory "$root\frontend" -PassThru -WindowStyle Hidden

Write-Host "Backend : http://localhost:8000  (pid $($backend.Id))"
Write-Host "Frontend: http://localhost:5173  (pid $($frontend.Id))"
Write-Host "Press Ctrl+C to stop both..."
try { Wait-Process -Id $frontend.Id } finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
