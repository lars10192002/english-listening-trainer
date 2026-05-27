# TOEIC Sentence Dictation 時間戳記對齊：問題分析與解法設計

## 一、問題描述

在 Sentence Dictation 練習模式中，TOEIC Part 1 每題有四個選項（A/B/C/D）。
用戶點擊 ▶ 播放時，B/C/D 選項一律播出錯誤的音檔內容，只有 A 有時正確。

---

## 二、排查過程

### 2.1 初始假設：前端 seek 問題

最初架構是共用一個 `<audio>` element，播放時用 `el.currentTime = seg.start_time_seconds` 跳到對應時間點。

懷疑方向：
- 瀏覽器 seek 事件非同步，`play()` 在 seek 完成前就執行
- `onSeeked` 事件順序問題

修正方式：改用 `new Audio(clipUrl)` per click，每次點擊建立全新的 `Audio` 物件，直接播放後端切好的 clip。

**結果：仍然錯誤。**

---

### 2.2 轉向：動態 clip endpoint

改為後端用 ffmpeg 即時切片：

```
GET /api/audio/{audio_id}/clip/{segment_id}
```

後端根據 DB 的 `start_time_seconds` / `end_time_seconds` 呼叫 ffmpeg：

```bash
ffmpeg -ss {start} -i audio.mp3 -t {duration} -c:a copy clip.mp3
```

結果：clip 檔案存在、大小正確、200 OK，但播出來內容仍然錯誤。

---

### 2.3 定位根本原因：ffmpeg 手動切片驗證

直接用 ffmpeg 切出 SRT 標記的 B 選項時間範圍（104.560s → 106.519s），聽出來是：

> "...a truck. B."

不是 B 的句子「He is lifting some furniture.」，而是 A 的句子結尾 + 字母 "B." 的發音。

這說明問題不在播放邏輯，而在 **SRT 的時間戳記本身就是錯的**。

---

### 2.4 TOEIC 音檔結構分析

TOEIC Part 1 的音檔結構：

```
[101.76s] narrator: "A."
[103.84s] narrator: "He is parking a truck."
[106.24s] narrator: "B."
[106.98s] narrator: "He is lifting some furniture."
[109.74s] narrator: "C."
[110.50s] narrator: "He is starting an engine."
[112.98s] narrator: "D."
[113.74s] narrator: "He is driving a car."
```

SRT 自動字幕工具把 `"A. He is parking a truck."` 當作一個 chunk，timestamp 記錄的是這個 chunk 的開頭，也就是 **narrator 念 "A." 的時刻**，而不是句子本身開始的時刻。

我們的 `import-srt` 只取了句子文字（`He is parking a truck.`），卻沿用了整個 chunk 的起始時間。

---

### 2.5 二分法實測確認

用 ffmpeg 手動切出不同時間範圍，聽出各選項的實際位置：

| 選項 | SRT 時間 | 實際音訊位置 | 偏移 |
|------|----------|-------------|------|
| A | 101.76–104.56s | ≈ 103.84–104.90s | +2.08s |
| B | 104.56–106.52s | ≈ 106.98–108.42s | +2.42s |
| C | 106.52–109.63s | ≈ 110.00–111.72s | +3.48s |
| D | 112.64–114.47s | ≈ 113.30–114.88s | +0.66s |

**結論：偏移量不固定（+0.66s 到 +3.48s），無法用全局 offset 解決。**

---

## 三、解法設計

### 3.1 選用工具：faster-whisper

既然問題是 SRT 時間點不準，需要一個能給出精確 word-level timestamps 的工具。

比較方案：

| 工具 | 類型 | 需要帳號 | 準確度 |
|------|------|---------|--------|
| WhisperX | 本地 | 需要 HF token（VAD 用 pyannote） | 極高 |
| faster-whisper | 本地 | 不需要 | 高 |
| OpenAI Whisper API | 雲端 | 需要付費 API key | 高 |

選擇 **faster-whisper**：
- 已作為 WhisperX 的依賴安裝，不需額外安裝
- 不需要任何帳號或 token
- 支援 word-level timestamps
- M1 CPU 跑 `base` model，速度夠快

驗證測試（100–120s 範圍）：

```
A.)  103.100–103.860
     "He is parking a truck."   → 103.860 – 105.200s  ✓
B.)  106.240–107.000
     "He is lifting some furniture."  → 107.000 – 108.500s  ✓
C.)  109.740–110.500
     "He is starting an engine."  → 110.500 – 111.820s  ✓
D.)  112.980–113.740
     "He is driving a car."  → 113.740 – 115.140s  ✓
```

---

### 3.2 對齊演算法

**核心思路：在 Whisper 的 word list 中，找到最符合 DB segment 文字的連續 word 區間。**

#### Step 1：文字正規化

SRT 文字與 Whisper 輸出有縮寫差異：

| SRT | Whisper |
|-----|---------|
| `He is parking` | `He is parking` ✓ |
| `She's inspecting` | `she is inspecting` |
| `There's a mobile` | `theres a mobile` |

正規化步驟：
1. 全部轉小寫
2. 展開常見縮寫（`he's → he is`、`she's → she is`...）
3. 去除標點符號

#### Step 2：滑窗比對

```python
for size in range(query_len - 4, query_len + 5):     # 容許字數差異
    for i in range(len(words) - size + 1):
        window = words[i : i + size]
        window_text = normalize(" ".join(w.word for w in window))
        score = SequenceMatcher(None, query_norm, window_text).ratio()
        if score > best_score:
            best_score = score
            best_start = window[0].start    # 第一個字的開始時間
            best_end   = window[-1].end     # 最後一個字的結束時間
```

#### Step 3：更新 DB + 清 cache

```python
seg.start_time_seconds = best_start
seg.end_time_seconds   = best_end
# 刪除該 segment 的舊 clip cache
glob.glob(f"uploads/cache/clips/seg_{audio_id}_{seg.id}_*.mp3")
```

---

### 3.3 DB 結構調整

新增兩個欄位保留 SRT 原始時間，以便日後對照或 reset：

```sql
ALTER TABLE transcript_segments ADD COLUMN original_start_time_seconds REAL;
ALTER TABLE transcript_segments ADD COLUMN original_end_time_seconds   REAL;
```

匯入時同步備份：

```python
original_start_time_seconds = start_time_seconds
original_end_time_seconds   = end_time_seconds
```

---

## 四、實作結構

### 4.1 CLI 腳本（開發/維護用）

```
backend/scripts/align_timestamps.py <audio_id> [--apply]
```

- 預設 preview 模式，印出每個 segment 的 before/after
- `--apply` 才寫入 DB 並清 cache
- 方便批次驗證、debug

### 4.2 API Endpoint（生產用）

```
POST /api/transcripts/align/{audio_id}
```

- 呼叫 faster-whisper base model（CPU，約 1–2 分鐘）
- 返回 `{ updated: N, total: M }`
- 前端 timeout 設 600 秒

### 4.3 前端 UI

Library 頁面，已匯入 SRT 的音檔旁顯示：

```
✓ SRT 24 sentences   [Align Timestamps]
                              ↓ 點擊後
                       Aligning…（約 1-2 分鐘）
                              ↓ 完成
                       ✓ Aligned 24
```

---

## 五、對齊結果（Test01 YBM 2022，24 segments）

全部 24 個 segment，`SequenceMatcher` score = 1.00，100% 完整比對成功。

偏移範圍：+0.66s 到 +5.22s，各 segment 差異顯著，印證不能用固定 offset 解決。

---

## 六、後續建議

1. **每次 import SRT 後**需手動點一次 "Align Timestamps"，或未來整合進 import 流程（背景非同步執行）
2. **其他 TOEIC 音檔**同樣有此問題，匯入後需對齊
3. **clip cache 自動失效**：對齊後舊 cache 自動刪除，下次播放時 ffmpeg 重新切片
4. **buffer 可考慮微調**：目前 clip endpoint 加了 `start - 0.0s`、`end + 0.5s`，視需要可調整
