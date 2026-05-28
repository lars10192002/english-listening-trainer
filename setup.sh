#!/bin/bash
# setup.sh — English Listening Trainer 一鍵環境設定 (Mac/Linux)
# 用法: 在專案根目錄執行: bash setup.sh

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=== English Listening Trainer Setup ==="
echo ""

# ── 1. 檢查 Python ────────────────────────────────────────────────────────────
echo "[1/4] 檢查 Python..."
if ! command -v python3 &>/dev/null; then
  echo "ERROR: 找不到 python3。請先安裝 Python 3.10+："
  echo "       Mac: brew install python"
  echo "       或至 https://www.python.org/downloads/"
  exit 1
fi
echo "      OK: $(python3 --version)"

# ── 2. 建立 venv 並安裝 Python 套件 ──────────────────────────────────────────
echo "[2/4] 設定 Python venv..."
VENV="$DIR/backend/venv"
if [ ! -d "$VENV" ]; then
  echo "      建立 venv..."
  python3 -m venv "$VENV"
else
  echo "      venv 已存在，略過建立"
fi

echo "      安裝 Python 套件..."
"$VENV/bin/pip" install -r "$DIR/backend/requirements.txt" --quiet
echo "      OK: Python 套件安裝完成"

# ── 3. 安裝 ffmpeg（系統依賴）────────────────────────────────────────────────
echo "[3/4] 檢查 ffmpeg..."
if command -v ffmpeg &>/dev/null; then
  echo "      OK: ffmpeg 已安裝 ($(which ffmpeg))"
else
  echo "      ffmpeg 未找到，嘗試用 brew 安裝..."
  if command -v brew &>/dev/null; then
    brew install ffmpeg
    echo "      OK: ffmpeg 安裝完成"
  else
    echo "WARNING: 未找到 Homebrew，請手動安裝 ffmpeg："
    echo "         /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "         brew install ffmpeg"
  fi
fi

# ── 4. 安裝 Node 套件 ─────────────────────────────────────────────────────────
echo "[4/4] 設定 Frontend..."
if ! command -v npm &>/dev/null; then
  echo "WARNING: 找不到 npm，請安裝 Node.js: https://nodejs.org/"
else
  (cd "$DIR/frontend" && npm install --silent)
  echo "      OK: Node 套件安裝完成"
fi

# ── 完成 ─────────────────────────────────────────────────────────────────────
echo ""
echo "=== 設定完成 ==="
echo ""
echo "啟動方式："
echo "  Mac: 雙擊 start.command"
echo "  或手動："
echo "    Backend:  cd backend && venv/bin/python -m uvicorn app.main:app --port 8000"
echo "    Frontend: cd frontend && npm run dev"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo ""
