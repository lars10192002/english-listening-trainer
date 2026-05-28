# Bug Analysis — 2026-05-28

本文件記錄 2026-05-28 發現的四個問題、根本原因、以及修復方式，供日後維護參考。

---

## 問題一：TOEIC 音檔資料夾不存在

### 現象
使用者需要手動建立 `backend/uploads/audio/TOEIC/` 才能放入音檔。

### 根本原因
`backend/app/routers/audio.py` 的 `UPLOAD_DIR` 只定義了 `uploads/audio/`，沒有預先建立任何子目錄。使用者不知道要自己建資料夾。

### 修復
在 `backend/app/main.py` 啟動時自動建立：

```python
UPLOADS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(os.path.join(UPLOADS_DIR, "audio", "TOEIC"), exist_ok=True)
```

`os.makedirs(..., exist_ok=True)` 確保資料夾已存在時不會重複建立或報錯。

另外，`backend/app/routers/audio.py` 的 `scan_folder` 也同步加上，確保 scan 時也會建立：

```python
os.makedirs(os.path.join(uploads_root, "audio", "TOEIC"), exist_ok=True)
```

---

## 問題二：faster-whisper 套件未安裝

### 現象
呼叫 `POST /api/transcripts/transcribe-toeic/{id}` 回傳：
```
{"detail": "Whisper error: No module named 'faster_whisper'"}
```

### 根本原因
`faster-whisper` 沒有被安裝進 venv。可能是因為當初建立環境時沒有安裝，或 `requirements.txt` 沒有記錄此套件。

另外，後端以 `--reload` 啟動時，uvicorn 的 reloader 會用系統 PATH 的 Python 啟動 worker subprocess，而不是 venv 的 Python，導致即使安裝了也找不到。

### 修復

```bash
# 安裝套件
backend/venv/Scripts/pip install faster-whisper

# 啟動時不使用 --reload，改用 venv Python 直接執行
backend/venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

**注意**：`requirements.txt` 應補上 `faster-whisper`，避免下次建立環境時再次遺漏。

---

## 問題三：資料庫欄位缺失（SQLAlchemy schema drift）

### 現象
呼叫 `POST /api/transcripts/transcribe-toeic/{id}` 回傳：
```
{"detail": "DB error: (sqlite3.OperationalError) no such column: transcript_segments.original_start_time_seconds"}
```

### 根本原因

**問題核心：SQLAlchemy 的 `create_all` 只建表，不補欄位。**

形成過程：

1. 初次啟動時，`create_all` 依照 model 建立了 `transcript_segments` table。
2. 後續新增 timestamp alignment 功能，`TranscriptSegment` model 加了兩個新欄位：
   ```python
   original_start_time_seconds = Column(Float)
   original_end_time_seconds = Column(Float)
   ```
3. 再次啟動時，`create_all` 偵測到 table 已存在，**不做任何修改**，新欄位只存在於 Python model，不存在於實體 SQLite table。
4. `transcribe_toeic` 執行 `db.refresh(seg)` 時，SQLAlchemy 發出完整的 `SELECT *` 查詢，試圖讀取 model 上所有欄位，包括 `original_start_time_seconds`，導致報錯。

同樣的問題之前也發生過（`speaker` 欄位），當時有手動補上 migration，但 `original_*` 兩個欄位沒有一起補。

### 修復

在 `backend/app/main.py` 統一管理 migration list：

```python
_migrations = [
    "ALTER TABLE transcript_segments ADD COLUMN speaker TEXT",
    "ALTER TABLE transcript_segments ADD COLUMN original_start_time_seconds REAL",
    "ALTER TABLE transcript_segments ADD COLUMN original_end_time_seconds REAL",
]
with engine.connect() as _conn:
    for _sql in _migrations:
        try:
            _conn.execute(text(_sql))
            _conn.commit()
        except Exception:
            pass  # 欄位已存在時 SQLite 會報錯，直接忽略
```

### 長期建議
引入 **Alembic** 做正式的 schema migration 管理，或至少建立 checklist：
> 新增 model 欄位 → 必須同步在 `main.py` 的 `_migrations` list 補上 `ALTER TABLE`。

---

## 問題四：ffmpeg 未安裝，clip 音檔無法播放

### 現象
`SentenceDictationPractice` 點擊播放按鈕，呼叫：
```
GET /api/audio/{id}/clip/{segment_id}
```
回傳 `500 Internal Server Error`，server log 顯示：
```
FileNotFoundError: [WinError 2] 找不到指定的檔案
```

### 根本原因
`backend/app/routers/audio.py` 的 `get_clip` 端點使用 `subprocess.run(["ffmpeg", ...])` 來切割音檔片段，但 Windows 環境中沒有安裝 ffmpeg，也不在 PATH 裡。

```python
cmd = ["ffmpeg", "-y", "-ss", str(start), "-i", audio_path, ...]
result = subprocess.run(cmd, capture_output=True, timeout=30)
```

### 修復
使用 winget 安裝 ffmpeg：

```
winget install ffmpeg --accept-source-agreements --accept-package-agreements
```

安裝路徑：
```
C:\Users\{USER}\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\bin\ffmpeg.exe
```

**注意**：winget 安裝後需要重新啟動 shell，PATH 才會自動包含 ffmpeg。若在現有 session 啟動 server，需手動帶入 PATH：

```bash
PATH="$PATH:/c/Users/.../ffmpeg-x.x.x-full_build/bin" \
  venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

或將啟動腳本加進新的 terminal session，讓 Windows 環境變數自動生效。

---

## 整體觀察

| 問題 | 類型 | 嚴重度 |
|------|------|--------|
| TOEIC 資料夾不存在 | 使用者體驗 | 低（只是需要手動建資料夾） |
| faster-whisper 未安裝 | 環境設定 | 高（功能完全無法使用） |
| DB schema drift | 資料層 Bug | 高（呼叫即崩潰） |
| ffmpeg 未安裝 | 環境設定 | 高（片段播放全部失效） |

**共同根因**：環境依賴（ffmpeg、faster-whisper）沒有文件化，schema migration 沒有正式流程。建議補充 `README` 或 `SETUP.md` 說明環境需求。
