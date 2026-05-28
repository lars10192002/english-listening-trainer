# setup.ps1 — English Listening Trainer 一鍵環境設定
# 用法: 在專案根目錄以 PowerShell 執行: .\setup.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "=== English Listening Trainer Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. 檢查 Python ────────────────────────────────────────────────────────────
Write-Host "[1/4] 檢查 Python..." -ForegroundColor Yellow
try {
    $pyVersion = python --version 2>&1
    Write-Host "      OK: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: 找不到 Python。請先安裝 Python 3.10+，再執行此腳本。" -ForegroundColor Red
    Write-Host "       下載: https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# ── 2. 建立 venv 並安裝 Python 套件 ──────────────────────────────────────────
Write-Host "[2/4] 設定 Python venv..." -ForegroundColor Yellow
$venvPath = Join-Path $ProjectRoot "backend\venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "      建立 venv..." -ForegroundColor Gray
    python -m venv $venvPath
} else {
    Write-Host "      venv 已存在，略過建立" -ForegroundColor Gray
}

$pip = Join-Path $venvPath "Scripts\pip.exe"
$requirementsTxt = Join-Path $ProjectRoot "backend\requirements.txt"

Write-Host "      安裝 Python 套件..." -ForegroundColor Gray
& $pip install -r $requirementsTxt --quiet
Write-Host "      OK: Python 套件安裝完成" -ForegroundColor Green

# ── 3. 安裝 ffmpeg（系統依賴）────────────────────────────────────────────────
Write-Host "[3/4] 檢查 ffmpeg..." -ForegroundColor Yellow
$ffmpegFound = $null
try { $ffmpegFound = Get-Command ffmpeg -ErrorAction Stop } catch {}

if ($ffmpegFound) {
    Write-Host "      OK: ffmpeg 已安裝 ($($ffmpegFound.Source))" -ForegroundColor Green
} else {
    Write-Host "      ffmpeg 未找到，嘗試用 winget 安裝..." -ForegroundColor Gray
    try {
        winget install ffmpeg --accept-source-agreements --accept-package-agreements
        Write-Host "      OK: ffmpeg 安裝完成（請重新開啟 Terminal 讓 PATH 生效）" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: winget 安裝 ffmpeg 失敗，請手動安裝：" -ForegroundColor Yellow
        Write-Host "         winget install ffmpeg" -ForegroundColor Yellow
        Write-Host "         或至 https://ffmpeg.org/download.html 下載" -ForegroundColor Yellow
    }
}

# ── 4. 安裝 Node 套件 ─────────────────────────────────────────────────────────
Write-Host "[4/4] 設定 Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $ProjectRoot "frontend"
try {
    Push-Location $frontendPath
    npm install --silent
    Write-Host "      OK: Node 套件安裝完成" -ForegroundColor Green
} catch {
    Write-Host "WARNING: npm install 失敗，請確認已安裝 Node.js" -ForegroundColor Yellow
    Write-Host "         下載: https://nodejs.org/" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# ── 完成 ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== 設定完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "啟動方式：" -ForegroundColor White
Write-Host "  Windows: 雙擊 start.bat" -ForegroundColor Gray
Write-Host "  或手動："  -ForegroundColor Gray
Write-Host "    Backend:  cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --port 8000" -ForegroundColor Gray
Write-Host "    Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
