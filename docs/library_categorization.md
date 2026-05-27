# Library 音檔分類機制：現況分析與改善建議

## 一、現有分類邏輯

### 1.1 兩層獨立分類

Library 頁面的音檔分類由兩個完全獨立的機制組成，互不影響。

---

#### 第一層：前端 filename pattern（決定顯示分組）

```js
const EP_PATTERN = /^englishpod_[A-Z]?(\d+)(dg|pb|rv)\.mp3$/i;
```

位置：`frontend/src/pages/LibraryPage.tsx` → `groupEnglishpod()`

邏輯：
- 符合 pattern → 歸入 **EnglishPod** section，依 episode 號分 card，以 dg/pb/rv 分 track
- 不符合 pattern → 歸入 **Others** section，flat list 顯示

這個分類是**硬編碼在前端**，後端完全不參與。

---

#### 第二層：後端 DB `exam_type` 欄位（決定篩選行為）

位置：`backend/app/models.py` → `AudioItem.exam_type`

| 來源 | 預設值 | 可用值 |
|------|--------|--------|
| 上傳（ImportPage） | 使用者指定，預設 `custom` | ielts / toeic / custom / business / general |
| Scan 自動掃描 | 固定 `custom` | — |

`exam_type` 只用於 Library 頁頂部的 dropdown 篩選，不影響 EnglishPod vs Others 的顯示分組。

---

### 1.2 問題：TOEIC 音檔落入 Others

TOEIC 音檔（例：`Test01 (YBM 2022).mp3`）：
- 不符合 `EP_PATTERN` → 前端歸入 Others
- 由 Scan 匯入，`exam_type='custom'`（非 `'toeic'`）

兩個條件都讓它沒有任何分類識別，混在 Others 裡。

---

## 二、後端更新 API 現況

目前 `backend/app/routers/audio.py` 沒有 `PATCH` 或 `PUT` endpoint，**無法從前端修改已存在音檔的 metadata**。

現有 endpoints：
- `POST /api/audio/upload` — 上傳時指定 exam_type
- `GET /api/audio` — 列表，可 filter by exam_type
- `GET /api/audio/{id}` — 單筆
- `POST /api/audio/scan` — 掃描，exam_type 固定為 custom
- `DELETE /api/audio/{id}` — 刪除

---

## 三、改善方案

### 方案 A：inline 手動編輯 exam_type（最小改動）

**後端**
新增 `PATCH /api/audio/{id}` endpoint，接受可更新的欄位：

```python
@router.patch("/{audio_id}", response_model=AudioItemResponse)
def update_audio(audio_id: int, data: AudioItemUpdate, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
```

可更新欄位（schema `AudioItemUpdate`）：
- `exam_type`
- `title`
- `topic`
- `difficulty`

**前端**
在 Others section 的 card 展開區加 exam_type 下拉選單，變更時呼叫 PATCH API，更新後 reload list。

---

### 方案 B：Scan 自動推斷 exam_type（根據資料夾名稱）

**後端 scan_folder 邏輯修改：**

```python
def infer_exam_type(rel_path: str) -> str:
    parts = rel_path.lower().split("/")
    if any("toeic" in p for p in parts):
        return "toeic"
    if any("ielts" in p for p in parts):
        return "ielts"
    if any("englishpod" in p for p in parts):
        return "custom"  # EnglishPod 靠 filename pattern 識別，不需改 exam_type
    return "custom"
```

效果：`uploads/TOEIC/Test01.mp3` → `exam_type='toeic'`

---

### 方案 C：Library 加 TOEIC 專屬 section（最完整）

在 Library 頁面新增第三個 section，專門顯示 `exam_type='toeic'` 的音檔：

```
[ EnglishPod ]  ← 現有，filename pattern 判斷
[ TOEIC ]       ← 新增，exam_type='toeic'
[ Others ]      ← 剩餘
```

TOEIC section 可以用類似 Others 的 card 樣式，但加上 TOEIC 專屬操作（Import SRT、Align Timestamps）。

---

## 四、建議實作順序

1. **方案 A**（必做）：加 PATCH endpoint + inline edit
   - 讓使用者能手動改 exam_type，解決燃眉之急
   - 工作量小，改動集中

2. **方案 B**（建議）：Scan 自動推斷
   - 避免每次 Scan 後都要手動改
   - 只改後端 scan_folder 邏輯，不動前端

3. **方案 C**（未來）：Library TOEIC section
   - 等 TOEIC 音檔數量增加後再做
   - 需要一定 UI 設計

---

## 五、相關檔案

| 檔案 | 角色 |
|------|------|
| `frontend/src/pages/LibraryPage.tsx` | EnglishPod/Others 分組邏輯、UI |
| `frontend/src/api/audioApi.ts` | 音檔 API（目前無 updateAudio） |
| `backend/app/routers/audio.py` | 音檔 endpoints（目前無 PATCH） |
| `backend/app/models.py` | `AudioItem.exam_type`、`AudioItem.category` |
| `backend/app/schemas.py` | AudioItem schema（需新增 AudioItemUpdate） |
