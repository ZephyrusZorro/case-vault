# CaseVault first-time setup (offline-friendly).
#
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup_offline.ps1
#
# Fully-offline machines: pre-download Python wheels into .\wheels first
#   pip download -r backend\requirements.txt -d wheels
# then run:  powershell -ExecutionPolicy Bypass -File scripts\setup_offline.ps1 -UseWheels

param(
    [switch]$UseWheels,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== CaseVault setup ===" -ForegroundColor Cyan

# ---- 1. Python environment -------------------------------------------------
$Py = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Py)) {
    Write-Host "[1/4] Creating Python virtual environment..."
    $pyLauncher = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pyLauncher) { throw "Python 3.11+ is required (python not found in PATH)." }
    & python -m venv (Join-Path $Root ".venv") | Out-Null
} else {
    Write-Host "[1/4] Virtual environment already present."
}

Write-Host "[2/4] Installing backend dependencies..."
$PipArgs = @("-m", "pip", "install", "--disable-pip-version-check")
if ($UseWheels -and (Test-Path (Join-Path $Root "wheels"))) {
    Write-Host "      Using offline wheel bundle (.\\wheels)"
    $PipArgs += @("--no-index", "--find-links", (Join-Path $Root "wheels"))
}
$PipArgs += @("-r", (Join-Path $Root "backend\requirements.txt"))
& $Py @PipArgs
if ($LASTEXITCODE -ne 0) { throw "pip install failed." }

# ---- 3. Frontend build -----------------------------------------------------
$Dist = Join-Path $Root "frontend\dist"
if ($SkipFrontendBuild -and (Test-Path $Dist)) {
    Write-Host "[3/4] Skipping frontend build (prebuilt dist found)."
} else {
    Write-Host "[3/4] Building frontend (requires Node.js once)..."
    $Npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $Npm) { throw "frontend/dist missing and npm not found. Install Node.js or copy a prebuilt frontend/dist into this package." }
    Push-Location (Join-Path $Root "frontend")
    try {
        & npm ci --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
    } finally { Pop-Location }
}

# ---- 4. Tesseract OCR check ------------------------------------------------
Write-Host "[4/4] Checking Tesseract OCR..."
$TessPaths = @(
    "C:\Program Files\Tesseract-OCR\tesseract.exe",
    "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
)
$Tess = $TessPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Tess) {
    $where = Get-Command tesseract -ErrorAction SilentlyContinue
    if ($where) { $Tess = $where.Source }
}
if ($Tess) {
    Write-Host "      Found Tesseract: $Tess" -ForegroundColor Green
} else {
    Write-Warning "Tesseract NOT found - OCR will report 'Unavailable'."
    Write-Host  "      Install it with:  winget install UB-Mannheim.TesseractOCR"
    Write-Host  "      (For air-gapped machines, place the UB-Mannheim installer in this folder and run it.)"
}

Write-Host ""
Write-Host "Setup complete. Start CaseVault with:" -ForegroundColor Green
Write-Host "    double-click  start_casevault.bat"
Write-Host "or: $Py -m uvicorn app.main:app --port 8000  (from backend\\)"
