# English Listening Trainer

A local web application for practicing English listening with custom audio files. Supports TOEIC, IELTS, dictation, fill-in-the-blank exercises, mistake analysis, and practice history tracking.

## Prerequisites

在開始之前，請確認以下環境已安裝：

| 依賴 | 版本 | 用途 | 下載 |
|------|------|------|------|
| Python | 3.10+ | Backend | https://www.python.org/downloads/ |
| Node.js | 18+ | Frontend | https://nodejs.org/ |
| ffmpeg | 任意版本 | 音檔片段切割 | 見下方說明 |

**安裝 ffmpeg：**
```bash
# Mac
brew install ffmpeg

# Windows
winget install ffmpeg
```

> ffmpeg 是系統層級依賴，pip 裝不到，必須獨立安裝。

## 快速開始（新電腦第一次設定）

**Mac：**
```bash
bash setup.sh
```

**Windows：**
```powershell
.\setup.ps1
```

腳本會自動完成：建立 Python venv → 安裝所有 Python 套件（含 faster-whisper）→ 檢查並安裝 ffmpeg → 安裝 Node 套件。

設定完成後，重新開啟 Terminal（讓 ffmpeg PATH 生效），再啟動。

## 啟動

| 平台 | 方式 |
|------|------|
| Mac | 雙擊 `start.command` |
| Windows | 雙擊 `start.bat` |

或手動分兩個 Terminal：

```bash
# Backend
cd backend

# Mac
venv/bin/python -m uvicorn app.main:app --port 8000

# Windows
venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

```bash
# Frontend（Mac / Windows 相同）
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Features

- Import MP3 / WAV / M4A audio files
- Classify by exam type: TOEIC / IELTS / Custom / Business / General
- **Dictation Mode**: Type what you hear, get score + mistake analysis
- **Sentence Dictation**: Per-sentence playback and dictation (TOEIC Part 1)
- **Fill-in-the-Blank Mode**: Create questions with word-limit checks
- **Role Play Mode**: Segment-by-segment dialogue practice
- Whisper-based transcription for TOEIC audio
- Mistake categorization: spelling, plural, tense, article, preposition, missing/extra word
- Practice history & review page with filters
- Dashboard with stats

## Project Structure

```
english-listening-trainer/
  setup.sh              # 一鍵環境設定（Mac）
  setup.ps1             # 一鍵環境設定（Windows）
  start.command         # 啟動 Backend + Frontend（Mac）
  start.bat             # 啟動 Backend + Frontend（Windows）
  backend/
    app/
      main.py           # FastAPI entry point + DB migration
      models.py         # SQLAlchemy models
      database.py       # SQLite setup
      schemas.py        # Pydantic schemas
      routers/          # API routes (audio, transcripts, practice...)
      services/         # Text comparison & mistake analysis
    uploads/
      audio/
        TOEIC/          # 放 TOEIC 音檔（啟動時自動建立）
        englishpod/     # EnglishPod 音檔
    requirements.txt    # Python 依賴（含版本鎖定）
  frontend/
    src/
      pages/            # Dashboard, Import, Library, Practice, Review
      components/       # AudioPlayer, DictationPractice, SentenceDictation...
      api/              # API client functions
      types/            # TypeScript types
  docs/                 # 開發文件與問題分析
```

## 常見問題

### `No module named 'faster_whisper'`
用 `--reload` 啟動時，uvicorn 的 reloader 會用系統 Python 而非 venv Python。
請用 `start.command` / `start.bat` 啟動，或手動指定 venv Python：
```bash
# Mac
venv/bin/python -m uvicorn app.main:app --port 8000
# Windows
venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

### clip 音檔播放失敗（500 Error）
ffmpeg 未安裝或不在 PATH。安裝後重新開啟 Terminal：
```bash
# Mac
brew install ffmpeg
# Windows
winget install ffmpeg
```

### DB schema 錯誤（`no such column`）
重啟 Backend 即可，`main.py` 啟動時會自動執行 migration。
