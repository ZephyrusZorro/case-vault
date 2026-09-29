# Builds a self-contained CaseVault offline package (zip).
#
#   powershell -ExecutionPolicy Bypass -File scripts\make_offline_package.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\make_offline_package.ps1 -IncludeWheels
#
# -IncludeWheels vendors every Python dependency (~150-250 MB) so the target
# machine needs NO internet for installation. Without it, the target still
# needs internet for pip unless wheels are supplied another way.
#
# The package never includes: node_modules, .venv, data/, .git, secrets.

param([switch]$IncludeWheels)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Stage = Join-Path $env:TEMP ("casevault_pkg_" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$PkgName = "CaseVault_Offline"
$Dest = Join-Path $Root "$PkgName.zip"

Write-Host "=== Building offline package ===" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $Root "frontend\dist\index.html"))) {
    throw "frontend/dist is missing. Run scripts\setup_offline.ps1 first (builds the UI once)."
}

$dirs = @(
    @{ src = "backend\app";      dst = "backend\app" },
    @{ src = "frontend\dist";    dst = "frontend\dist" },
    @{ src = "scripts";          dst = "scripts" },
    @{ src = "docs";             dst = "docs" }
)
$files = @(
    "backend\requirements.txt",
    ".env.example",
    "start_casevault.bat",
    "README-OFFLINE.txt"
)

New-Item -ItemType Directory -Path $Stage | Out-Null
foreach ($d in $dirs) {
    $src = Join-Path $Root $d.src
    $dst = Join-Path $Stage $d.dst
    New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
    robocopy $src $dst /E /XD __pycache__ /NFL /NDL /NJH /NJS | Out-Null
}
foreach ($f in $files) {
    $src = Join-Path $Root $f
    if (Test-Path $src) {
        $dst = Join-Path $Stage $f
        New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
        Copy-Item $src $dst
    }
}

if ($IncludeWheels) {
    Write-Host "Downloading Python wheels for offline install..."
    & (Join-Path $Root ".venv\Scripts\python.exe") -m pip download `
        -r (Join-Path $Root "backend\requirements.txt") `
        -d (Join-Path $Stage "wheels")
    if ($LASTEXITCODE -ne 0) { throw "pip download failed." }
}

Write-Host "Compressing..."
if (Test-Path $Dest) { Remove-Item $Dest }
Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $Dest
Remove-Item $Stage -Recurse -Force

$sizeMb = [math]::Round((Get-Item $Dest).Length / 1MB, 1)
Write-Host ""
Write-Host "Package ready: $Dest ($sizeMb MB)" -ForegroundColor Green
