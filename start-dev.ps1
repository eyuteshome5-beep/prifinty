# ============================================================
# Prifinity - Local Development Startup Script (PowerShell)
# ============================================================
# This script sets up and starts both the backend (Flask)
# and frontend (Next.js) for local development.
#
# Prerequisites:
#   - Python 3.11+ installed and in PATH
#   - Node.js 18+ installed and in PATH
#   - Internet access (for MongoDB Atlas connection)
#
# Usage:
#   Right-click > "Run with PowerShell"  OR  run in terminal:
#   .\start-dev.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = $RootDir

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   PRIFINITY - Local Development Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────
# 1. Check Python
# ─────────────────────────────────────────────
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
try {
    $pyVersion = python --version 2>&1
    Write-Host "      $pyVersion found." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found. Please install Python 3.11+ from https://python.org" -ForegroundColor Red
    exit 1
}

# ─────────────────────────────────────────────
# 2. Backend: Create virtualenv & install deps
# ─────────────────────────────────────────────
Write-Host "[2/5] Setting up Python virtual environment..." -ForegroundColor Yellow
$VenvDir = Join-Path $BackendDir "venv"
if (-Not (Test-Path $VenvDir)) {
    python -m venv $VenvDir
    Write-Host "      Virtual environment created at: $VenvDir" -ForegroundColor Green
} else {
    Write-Host "      Virtual environment already exists." -ForegroundColor Green
}

$PipExe = Join-Path $VenvDir "Scripts\pip.exe"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
$ReqFile = Join-Path $BackendDir "requirements.txt"

Write-Host "[3/5] Installing backend Python dependencies..." -ForegroundColor Yellow
& $PipExe install -r $ReqFile --quiet
Write-Host "      Dependencies installed." -ForegroundColor Green

# ─────────────────────────────────────────────
# 3. Frontend: npm install
# ─────────────────────────────────────────────
Write-Host "[4/5] Installing frontend Node.js dependencies..." -ForegroundColor Yellow
$NodeModules = Join-Path $FrontendDir "node_modules"
if (-Not (Test-Path $NodeModules)) {
    Set-Location $FrontendDir
    npm install --legacy-peer-deps
    Write-Host "      Node modules installed." -ForegroundColor Green
} else {
    Write-Host "      Node modules already installed." -ForegroundColor Green
}

# ─────────────────────────────────────────────
# 4. Launch Backend (Flask) in a new window
# ─────────────────────────────────────────────
Write-Host "[5/5] Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Launch Flask backend in new terminal window
$BackendCmd = "Set-Location '$BackendDir'; & '$PythonExe' run.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# Launch Next.js frontend in new terminal window
$FrontendCmd = "Set-Location '$FrontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd -WindowStyle Normal

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Both servers are starting in new windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend (Next.js):  http://localhost:3000" -ForegroundColor Magenta
Write-Host "  Backend  (Flask API): http://localhost:5000" -ForegroundColor Magenta
Write-Host "  API Health Check:    http://localhost:5000/api/health" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Database: MongoDB Atlas (cloud)" -ForegroundColor DarkGray
Write-Host "            Connected as: eyuel @ cluster0.ihjnshd.mongodb.net" -ForegroundColor DarkGray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
