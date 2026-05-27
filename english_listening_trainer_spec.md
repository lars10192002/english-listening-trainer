# English Listening Trainer 系統設計規格書

> 目的：建立一套可以使用使用者自備英文音源檔、逐字稿、題目與答案的聽力訓練系統。  
> 本文件主要給 Claude Code / 開發者使用，請依照此規格開始施工。  
> 第一版以 **本地端 Web App** 為主，不需上架、不需雲端服務。  
> 專案不限定 IELTS，也要能支援 TOEIC、一般英文聽寫、商務英文、口音訓練與其他考試聽力。

---

## 0. Project Naming

### Project Name

```txt
English Listening Trainer
```

### Repository / Folder Name

```txt
english-listening-trainer
```

### App Display Name

```txt
English Listening Trainer
```

### Product Description

```txt
English Listening Trainer is a local web application for practicing English listening with custom audio files. It supports TOEIC, IELTS, dictation, fill-in-the-blank exercises, spelling checks, plural checks, paraphrase analysis, mistake review, and practice history tracking.
```

---

## 1. 專案定位

本系統不是單純的音檔播放器，而是一個：

> **English Listening Practice Platform + Dictation Trainer + Exam Listening Trainer**

核心目標是幫助使用者用自己的音檔建立練習資料庫，並透過反覆播放、聽寫、填空、答案比對與錯題複習，提升英文聽力精準度。

系統要支援多種訓練方向：

1. IELTS Listening 填空與答案格式訓練
2. TOEIC Part 1 / 2 / 3 / 4 聽力練習
3. 一般英文精準聽寫 dictation
4. 商務英文聽力
5. 數字、日期、地址、金額、姓名拼字訓練
6. 單複數、時態、介系詞、冠詞辨識
7. 同義改寫 paraphrase / synonym training
8. 錯題複習與弱點分析
9. 個人音檔素材庫管理

---

## 2. 設計改進重點

原本若只設計成 IELTS 系統會太窄。請把系統改成「通用英文聽力訓練平台」，並用 `source_type` / `exam_type` / `mode` 來決定不同考試或練習模式。

### 2.1 必須改進的地方

1. **專案名稱改成 English Listening Trainer**
   - 不要把 repo、資料表、API、UI 名稱寫死成 IELTS。

2. **新增 Exam Profile 概念**
   - 支援 IELTS、TOEIC、Custom。
   - 未來可再擴充 TOEFL、Cambridge、Business English。

3. **題型設計要通用**
   - 不只 `FillBlankQuestion`，也要有通用 `questions` table。
   - 題型可以是 dictation、fill_blank、multiple_choice、short_answer、number_drill、paraphrase。

4. **Transcript 要支援分段**
   - 第一版可以貼純文字。
   - 建議資料結構預留 `transcript_segments`，未來可支援 SRT、VTT、逐句播放、A-B repeat。

5. **音檔 metadata 不要只用 IELTS section**
   - 要同時支援 IELTS section、TOEIC part、custom category。

6. **錯誤分析要分成共通錯誤與考試專用錯誤**
   - 共通：spelling、missing_word、extra_word、wrong_word、plural、tense、article、preposition。
   - IELTS：word_limit、number_format、date_format。
   - TOEIC：option_trap、keyword_mismatch、distractor。

7. **練習模式要可擴充**
   - 不要寫死只有 IELTS Fill-in-the-Blank。
   - UI 要允許選擇 Mode + Exam Type。

---

## 3. 使用情境

使用者會準備一批音檔，例如：

```txt
/audio/
  toeic_part2_001.mp3
  toeic_part3_001.mp3
  ielts_section1_001.mp3
  ielts_section4_001.mp3
  business_meeting_001.mp3
```

每個音檔可以對應一份 transcript，例如：

```txt
/transcripts/
  toeic_part2_001.txt
  toeic_part3_001.txt
  ielts_section1_001.txt
  business_meeting_001.txt
```

之後使用者可以在 Web App 中：

1. 匯入音檔
2. 貼上或上傳逐字稿
3. 標記資料來源：TOEIC / IELTS / Custom
4. 選擇練習模式
5. 播放音檔
6. 輸入答案或聽寫內容
7. 系統比對正確答案
8. 系統分析錯誤原因
9. 儲存練習紀錄
10. 之後進行錯題複習

---

## 4. 技術架構建議

### 4.1 前端

建議使用：

```txt
React + TypeScript + Vite
```

功能：

- 音檔清單 UI
- 音訊播放器
- 音檔匯入頁
- transcript 管理頁
- Dictation 聽寫輸入區
- Fill-in-the-Blank 填空練習區
- Multiple Choice 選擇題練習區
- 比對結果顯示
- 錯題複習頁
- 統計儀表板
- 設定頁

---

### 4.2 後端

建議使用：

```txt
Python FastAPI
```

功能：

- 音檔上傳與管理
- transcript 上傳與管理
- transcript 分段管理
- 建立練習題
- 文字比對
- 錯誤分類
- 儲存練習紀錄
- 提供 API 給前端使用

---

### 4.3 資料庫

第一版使用：

```txt
SQLite
```

未來可升級：

```txt
PostgreSQL
```

---

### 4.4 專案資料夾結構

建議：

```txt
english-listening-trainer/
  backend/
    app/
      main.py
      models.py
      database.py
      schemas.py
      routers/
        audio.py
        transcripts.py
        questions.py
        practice.py
        review.py
        stats.py
      services/
        text_compare.py
        mistake_analyzer.py
        question_generator.py
        transcript_parser.py
        scoring.py
    uploads/
      audio/
      transcripts/
    requirements.txt

  frontend/
    src/
      main.tsx
      App.tsx
      components/
        AudioPlayer.tsx
        AudioList.tsx
        DictationPractice.tsx
        FillBlankPractice.tsx
        MultipleChoicePractice.tsx
        ResultPanel.tsx
        MistakeList.tsx
        ModeSelector.tsx
        ExamTypeSelector.tsx
      pages/
        DashboardPage.tsx
        ImportPage.tsx
        LibraryPage.tsx
        PracticePage.tsx
        ReviewPage.tsx
        SettingsPage.tsx
      api/
        client.ts
        audioApi.ts
        transcriptApi.ts
        questionApi.ts
        practiceApi.ts
      types/
        audio.ts
        transcript.ts
        question.ts
        practice.ts
    package.json

  README.md
```

---

## 5. 第一版 MVP 功能

第一版先不要做太複雜，目標是「可以真的練習」。

### 5.1 MVP 必做功能

1. 匯入 MP3 / WAV / M4A 音檔
2. 上傳或貼上 transcript
3. 音檔播放
4. 播放 / 暫停
5. 倒退 3 秒
6. 前進 3 秒
7. 調整播放速度：0.75x / 1.0x / 1.25x
8. 音檔分類：IELTS / TOEIC / Custom
9. 精準聽寫模式 Dictation Mode
10. 填空模式 Fill-in-the-Blank Mode
11. 答案比對
12. 顯示正確率
13. 顯示錯字、漏字、多字
14. 儲存練習紀錄
15. 錯題複習頁

### 5.2 MVP 可先不做

以下功能可放第二版：

1. AI 自動出題
2. AI 自動講解錯誤
3. 音檔自動切句
4. SRT / VTT 完整時間軸編輯器
5. TOEIC 選項陷阱分析
6. 手機 App
7. 雲端同步

---

## 6. Exam Profile 設計

系統要用 `exam_type` 或 `source_type` 來處理不同練習資料。

```txt
exam_type:
  - ielts
  - toeic
  - custom
  - business
  - general
```

### 6.1 IELTS Profile

支援欄位：

```txt
ielts_section: 1 | 2 | 3 | 4
word_limit_type:
  - one_word
  - two_words
  - three_words
  - two_words_or_number
  - custom
answer_type:
  - word
  - phrase
  - number
  - date
  - time
  - price
  - address
  - postcode
  - name
```

IELTS 重點：

1. 填空答案
2. 拼字正確
3. 單複數
4. 字數限制
5. 數字、日期、地址格式
6. 同義改寫

---

### 6.2 TOEIC Profile

支援欄位：

```txt
toeic_part: 1 | 2 | 3 | 4
question_type:
  - picture_description
  - question_response
  - conversation
  - short_talk
```

TOEIC 重點：

1. Part 1 圖片描述句
2. Part 2 問答反應
3. Part 3 對話理解
4. Part 4 短篇獨白
5. 選項關鍵字陷阱
6. distractor 干擾選項
7. paraphrase / synonym

第一版可以先用 TOEIC 音檔做 dictation，不必馬上做完整選擇題。

---

### 6.3 Custom / General Profile

適合：

1. 一般英文聽寫
2. 商務會議錄音
3. YouTube 英文片段
4. 口音訓練
5. 自己整理的單句音檔

支援欄位：

```txt
category
speaker_accent
topic
difficulty
```

---

## 7. 練習模式設計

---

## 7.1 模式一：精準聽寫模式 Dictation Mode

### 目的

訓練使用者完整聽出句子內容，適合改善：

- 連音
- 單複數
- 時態
- 被動語態
- 介系詞
- 冠詞
- 拼字

### 使用流程

1. 使用者選擇一個音檔
2. 系統顯示播放器
3. 使用者播放音檔
4. 使用者在文字框輸入聽到的英文
5. 使用者提交答案
6. 系統顯示比對結果
7. 系統儲存練習紀錄

### UI 範例

```txt
現在練習：business_meeting_001.mp3

Exam Type: Custom
Mode: Dictation

[播放] [暫停] [倒退 3 秒] [前進 3 秒] [速度 0.75x / 1.0x / 1.25x]

請輸入你聽到的內容：

__________________________________________________

[提交答案]
```

### 結果顯示範例

```txt
正確率：82%

你的答案：
The course is design for beginner.

正確答案：
The course is designed for beginners.

錯誤分析：
1. design → designed
   類型：tense / past participle

2. beginner → beginners
   類型：plural
```

---

## 7.2 模式二：填空模式 Fill-in-the-Blank Mode

### 目的

支援 IELTS / 一般英文填空訓練。使用者不需要寫完整句子，只需要抓答案。

### 使用流程

1. 系統或使用者建立填空題
2. 使用者先看到題目
3. 使用者播放音檔
4. 使用者填入答案
5. 系統檢查答案是否正確
6. 系統檢查拼字、單複數、字數限制

### UI 範例

```txt
Question 1
The library is located next to the __________ building.

Answer: __________________

[播放] [倒退 3 秒] [提交]
```

### 答案檢查重點

- 完全正確
- 拼字錯誤
- 單複數錯誤
- 多寫冠詞
- 少寫冠詞
- 超過字數限制
- 大小寫不敏感

---

## 7.3 模式三：數字 / 日期 / 地址專項模式 Number Drill Mode

### 目的

專門訓練聽力考試常見細節：

- 電話號碼
- 地址
- 郵遞區號
- 日期
- 時間
- 價格
- 姓名拼字

### 題型範例

```txt
Phone number: __________
Date of appointment: __________
Address: 42 __________ Road
Price: £__________
Postcode: __________
```

### 系統需要支援的答案類型

```txt
number
phone
date
time
price
address
postcode
name
```

---

## 7.4 模式四：同義改寫模式 Paraphrase Mode

### 目的

IELTS 與 TOEIC 都常出現 paraphrase，不一定直接照題目文字念。

### 範例

題目：

```txt
The class is suitable for people with no experience.
```

音檔原文：

```txt
This course is designed for complete beginners.
```

系統顯示：

```txt
同義改寫：
people with no experience = complete beginners
suitable for = designed for
```

### 第一版處理方式

第一版可以先讓使用者手動輸入 paraphrase note。  
第二版再加入 AI 自動分析。

---

## 7.5 模式五：Role Play Mode

### 目的

針對對話型音檔（如 EnglishPod Dialogue track），讓使用者扮演某個角色（A 或 B），填入自己角色的台詞，其他角色的台詞顯示為參考文字。

### 前置條件

- 音檔必須已透過「Import PDF」匯入對話 segments
- Segments 需有 `speaker` 欄位

### 使用流程

1. 使用者進入 PracticePage，點選 Role Play 模式
2. 系統顯示角色選擇畫面（A / B / C…）
3. 使用者選擇要扮演的角色
4. 系統顯示完整對話：
   - 自己的角色：顯示輸入框
   - 對方的角色：顯示原文作為參考
5. 使用者填入自己角色的所有台詞
6. 點擊 Submit，系統逐行評分
7. 每行顯示分數、正確答案、錯誤分析
8. 可針對單行點擊 ↺ 重新評分，不需重新提交全部
9. 可點擊 Re-submit All 重新提交全部

### UI 元素

```txt
Playing as: [A]                              Total: 87.5%  [Switch Role]

A:  [_____________________________________ ]  ↺
    ✓ 92%  Correct: Good evening. My name is Fabio...

B:  No, I'm still working on it.

A:  [_____________________________________ ]  ↺
    ✗ 75%  Correct: For you sir, I would recommend...

[Re-submit All]  [Clear]
```

---

## 7.6 模式六：TOEIC Multiple Choice Mode

### 目的

支援 TOEIC Part 2 / 3 / 4 題型。

### 第一版建議

MVP 可以先建立資料結構，但 UI 可先簡單：

1. 顯示問題
2. 顯示 A / B / C / D 選項
3. 播放音檔
4. 使用者選答案
5. 顯示正確答案與解釋

### 題型範例

```txt
Question: What does the man suggest?

A. Calling the supplier
B. Rescheduling the meeting
C. Sending an invoice
D. Visiting the warehouse
```

---

## 8. 資料庫設計

---

## 8.1 audio_items

```sql
CREATE TABLE audio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  title TEXT,
  exam_type TEXT DEFAULT 'custom',
  category TEXT,
  ielts_section INTEGER,
  toeic_part INTEGER,
  topic TEXT,
  difficulty TEXT,
  speaker_accent TEXT,
  duration_seconds REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

欄位說明：

```txt
exam_type: ielts / toeic / custom / business / general
ielts_section: IELTS Section 1-4
toeic_part: TOEIC Part 1-4
difficulty: easy / medium / hard
speaker_accent: american / british / australian / canadian / mixed / unknown
```

---

## 8.2 transcripts

```sql
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audio_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  format TEXT DEFAULT 'plain_text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(audio_id) REFERENCES audio_items(id)
);
```

format 建議：

```txt
plain_text
srt
vtt
json
```

第一版只需要支援 `plain_text`。

---

## 8.3 transcript_segments

這是改進點。即使 MVP 不做完整 UI，也建議先預留資料表。

```sql
CREATE TABLE transcript_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcript_id INTEGER NOT NULL,
  audio_id INTEGER NOT NULL,
  segment_index INTEGER NOT NULL,
  speaker TEXT,
  start_time_seconds REAL,
  end_time_seconds REAL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transcript_id) REFERENCES transcripts(id),
  FOREIGN KEY(audio_id) REFERENCES audio_items(id)
);
```

`speaker` 欄位用於對話型音檔（如 EnglishPod），記錄每個 segment 是哪個角色說的（A、B、C…）。

用途：

1. 逐句聽寫
2. A-B repeat
3. SRT / VTT 字幕時間軸
4. 只重播錯誤句子
5. Role Play 角色扮演練習
6. 未來自動切句

MVP 可以先把整份 transcript 當成一個 segment。

---

## 8.4 questions

通用題目表，不要只設計 IELTS fill blank。

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audio_id INTEGER NOT NULL,
  segment_id INTEGER,
  question_type TEXT NOT NULL,
  question_text TEXT,
  correct_answer TEXT NOT NULL,
  answer_type TEXT,
  word_limit_type TEXT,
  explanation TEXT,
  paraphrase_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(audio_id) REFERENCES audio_items(id),
  FOREIGN KEY(segment_id) REFERENCES transcript_segments(id)
);
```

question_type 建議：

```txt
dictation
fill_blank
multiple_choice
short_answer
number_drill
paraphrase
```

answer_type 建議：

```txt
word
phrase
number
phone
date
time
price
address
postcode
name
sentence
```

word_limit_type 建議：

```txt
none
one_word
two_words
three_words
two_words_or_number
custom
```

---

## 8.5 question_options

支援 TOEIC Multiple Choice。

```sql
CREATE TABLE question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  option_label TEXT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(question_id) REFERENCES questions(id)
);
```

---

## 8.6 practice_records

```sql
CREATE TABLE practice_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audio_id INTEGER NOT NULL,
  question_id INTEGER,
  mode TEXT NOT NULL,
  user_input TEXT,
  correct_answer TEXT,
  selected_option_id INTEGER,
  is_correct BOOLEAN,
  score REAL,
  word_error_rate REAL,
  mistake_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(audio_id) REFERENCES audio_items(id),
  FOREIGN KEY(question_id) REFERENCES questions(id),
  FOREIGN KEY(selected_option_id) REFERENCES question_options(id)
);
```

mode 可為：

```txt
dictation
fill_blank
number_drill
paraphrase
multiple_choice
role_play
```

---

## 8.7 mistakes

```sql
CREATE TABLE mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  practice_record_id INTEGER NOT NULL,
  mistake_type TEXT NOT NULL,
  wrong_text TEXT,
  correct_text TEXT,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(practice_record_id) REFERENCES practice_records(id)
);
```

mistake_type 建議：

```txt
spelling
missing_word
extra_word
wrong_word
plural
tense
preposition
article
number
date
word_limit
format_error
paraphrase
option_trap
distractor
```

---

## 9. API 設計

---

## 9.1 Audio API

### Upload audio

```http
POST /api/audio/upload
Content-Type: multipart/form-data
```

Request:

```txt
file: audio file
exam_type: ielts / toeic / custom / business / general
title: optional
ielts_section: optional
toeic_part: optional
topic: optional
difficulty: optional
speaker_accent: optional
```

Response:

```json
{
  "id": 1,
  "filename": "toeic_part2_001.mp3",
  "file_path": "/uploads/audio/toeic_part2_001.mp3",
  "exam_type": "toeic",
  "toeic_part": 2
}
```

---

### Get audio list

```http
GET /api/audio?exam_type=toeic&toeic_part=2
```

Response:

```json
[
  {
    "id": 1,
    "filename": "toeic_part2_001.mp3",
    "title": "TOEIC Part 2 Practice 001",
    "exam_type": "toeic",
    "toeic_part": 2,
    "topic": "office",
    "difficulty": "medium"
  }
]
```

---

## 9.2 Transcript API

### Create transcript

```http
POST /api/transcripts
```

Request:

```json
{
  "audio_id": 1,
  "content": "The course is designed for complete beginners.",
  "format": "plain_text"
}
```

Response:

```json
{
  "id": 1,
  "audio_id": 1,
  "content": "The course is designed for complete beginners.",
  "format": "plain_text"
}
```

---

### Get transcript by audio id

```http
GET /api/transcripts/audio/{audio_id}
```

---

### Import PDF transcript (EnglishPod)

```http
POST /api/transcripts/import-pdf/{audio_id}
```

自動從音檔同資料夾尋找對應 PDF（例如 `englishpod_B0001dg.mp3` → `englishpod_B0001.pdf`），解析對話段落並儲存為 transcript + segments。

Response:

```json
{
  "transcript_id": 12,
  "audio_id": 5,
  "segment_count": 10,
  "speakers": ["A", "B"],
  "segments": [...]
}
```

---

### Get segments by audio id

```http
GET /api/transcripts/audio/{audio_id}/segments
```

Response:

```json
[
  {
    "id": 80,
    "transcript_id": 12,
    "audio_id": 5,
    "segment_index": 0,
    "speaker": "A",
    "start_time_seconds": null,
    "end_time_seconds": null,
    "text": "Good evening. My name is Fabio, I'll be your waiter for tonight."
  }
]
```

---

### Create transcript segment

```http
POST /api/transcripts/{transcript_id}/segments
```

Request:

```json
{
  "audio_id": 1,
  "segment_index": 1,
  "start_time_seconds": 0,
  "end_time_seconds": 6.5,
  "text": "The course is designed for complete beginners."
}
```

---

## 9.3 Question API

### Create question

```http
POST /api/questions
```

Request:

```json
{
  "audio_id": 1,
  "question_type": "fill_blank",
  "question_text": "The course is designed for complete __________.",
  "correct_answer": "beginners",
  "answer_type": "word",
  "word_limit_type": "one_word",
  "explanation": "The answer is plural."
}
```

---

### Get questions by audio id

```http
GET /api/questions/audio/{audio_id}
```

---

## 9.4 Practice API

### Submit dictation answer

```http
POST /api/practice/dictation/submit
```

Request:

```json
{
  "audio_id": 1,
  "segment_id": 1,
  "user_input": "The course is design for beginner."
}
```

Response:

```json
{
  "score": 82.0,
  "word_error_rate": 0.18,
  "correct_answer": "The course is designed for beginners.",
  "user_input": "The course is design for beginner.",
  "mistakes": [
    {
      "mistake_type": "tense",
      "wrong_text": "design",
      "correct_text": "designed",
      "explanation": "You missed the past participle form."
    },
    {
      "mistake_type": "plural",
      "wrong_text": "beginner",
      "correct_text": "beginners",
      "explanation": "You missed the plural -s."
    }
  ]
}
```

---

### Submit fill blank answer

```http
POST /api/practice/fill-blank/submit
```

Request:

```json
{
  "question_id": 1,
  "user_answer": "student service"
}
```

Response:

```json
{
  "is_correct": false,
  "score": 50,
  "correct_answer": "student services",
  "user_answer": "student service",
  "mistakes": [
    {
      "mistake_type": "plural",
      "wrong_text": "service",
      "correct_text": "services",
      "explanation": "The correct answer requires the plural form."
    }
  ]
}
```

---

### Submit role play answers

```http
POST /api/practice/role-play/submit
```

Request:

```json
{
  "audio_id": 5,
  "role": "A",
  "answers": [
    { "segment_id": 80, "user_input": "Good evening. My name is Fabio." },
    { "segment_id": 82, "user_input": "I would recommend the spaghetti." }
  ]
}
```

Response:

```json
{
  "total_score": 85.0,
  "role": "A",
  "results": [
    {
      "segment_id": 80,
      "segment_index": 0,
      "score": 90.0,
      "word_error_rate": 0.10,
      "correct_answer": "Good evening. My name is Fabio, I'll be your waiter for tonight.",
      "user_input": "Good evening. My name is Fabio.",
      "mistakes": [],
      "practice_record_id": 26
    }
  ]
}
```

---

### Submit multiple choice answer

```http
POST /api/practice/multiple-choice/submit
```

Request:

```json
{
  "question_id": 1,
  "selected_option_id": 3
}
```

Response:

```json
{
  "is_correct": true,
  "correct_option_id": 3,
  "explanation": "The speaker suggests rescheduling the meeting."
}
```

---

## 10. 文字比對邏輯

---

## 10.1 Normalize function

比對前先 normalize：

1. 轉小寫
2. 去除前後空白
3. 移除多餘空格
4. 可選擇移除標點符號
5. 保留數字、英文字母與 apostrophe
6. 大小寫預設不敏感

Python pseudo code:

```python
import re

def normalize_text(text: str, ignore_punctuation: bool = True) -> str:
    text = text.lower().strip()
    if ignore_punctuation:
        text = re.sub(r"[^a-z0-9\s']", "", text)
    text = re.sub(r"\s+", " ", text)
    return text
```

---

## 10.2 Word Error Rate

計算：

```txt
WER = (Substitutions + Deletions + Insertions) / Total Words In Correct Answer
```

Score:

```txt
score = max(0, 100 * (1 - WER))
```

---

## 10.3 錯誤分類邏輯

第一版可以用規則判斷。

### plural

```txt
correct = beginners
wrong = beginner
=> plural error
```

判斷方式：

```txt
correct.endswith('s') and correct[:-1] == wrong
```

### spelling

```txt
correct = auditorium
wrong = auditerium
=> spelling error
```

判斷方式：

```txt
Levenshtein distance <= 2
```

### missing word

```txt
correct has word, user does not have word
```

### extra word

```txt
user has extra word not in correct answer
```

### tense

簡單規則：

```txt
design vs designed
move vs moved
schedule vs scheduled
```

### article

```txt
a / an / the
```

### preposition

```txt
in / on / at / for / to / from / with / by
```

---

## 10.4 IELTS 字數限制檢查

IELTS 常見題目限制：

```txt
NO MORE THAN ONE WORD
NO MORE THAN TWO WORDS
NO MORE THAN THREE WORDS
NO MORE THAN TWO WORDS AND/OR A NUMBER
```

系統需要檢查：

1. 使用者答案是否超過字數限制
2. 數字是否允許
3. 答案是否含多餘冠詞
4. 答案大小寫不影響正確性

---

## 10.5 TOEIC 選項分析預留

TOEIC 第二版可加入：

1. 正確選項關鍵字
2. 干擾選項原因
3. 題目與音檔 paraphrase 對應
4. 為什麼 A / B / C / D 錯

第一版只需要保存 `explanation`。

---

## 11. 前端頁面設計

---

## 11.1 DashboardPage

用途：顯示學習總覽。

內容：

```txt
今日練習次數
平均正確率
最近錯誤類型
待複習錯題數
最近練習音檔
TOEIC / IELTS / Custom 練習比例
```

---

## 11.2 ImportPage

用途：匯入音檔與 transcript。

UI：

```txt
[選擇音檔]
[選擇 transcript txt]

Exam Type: IELTS / TOEIC / Custom / Business / General
IELTS Section: 1 / 2 / 3 / 4
TOEIC Part: 1 / 2 / 3 / 4
Topic: __________
Difficulty: Easy / Medium / Hard
Speaker Accent: American / British / Australian / Unknown

[上傳]
```

---

## 11.3 LibraryPage

用途：管理音檔與 transcript。

內容：

```txt
音檔列表
依 exam_type 篩選
依 topic 篩選
依 difficulty 篩選
查看 transcript
建立問題
開始練習
```

---

## 11.4 PracticePage

用途：主要練習頁。

目前實作的版面（Block Layout）：

```txt
[← Library]  [Dictation] [Fill-in-the-Blank] [Role Play]  ← Mode 選擇

┌─────────────────────────────────┐
│ PLAY                            │
│  [播放器]                        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ PRACTICE                        │
│  根據 Mode 顯示對應練習元件       │
└─────────────────────────────────┘

┌─────────────────────────────────┐  ← 只有 dg track 且有 PDF 才顯示
│ DIALOGUE                        │
│  PDF 對話原文                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐  ← 只有有 vocab 才顯示
│ VOCABULARY (N)                  │
│  單字卡片 Grid                   │
└─────────────────────────────────┘
```

Role Play 按鈕只在音檔有 segments（已 Import PDF）時才顯示。

---

## 11.5 ReviewPage

用途：錯題複習。

內容：

```txt
錯題列表
錯誤類型 filter
Exam Type filter
重新播放音檔
重新作答
查看正確答案與解釋
```

---

## 11.6 SettingsPage

用途：設定。

內容：

```txt
預設播放速度
是否自動忽略大小寫
是否忽略標點符號
倒退秒數設定
IELTS 字數限制預設值
預設練習模式
預設 Exam Type
```

---

## 12. 音訊播放器需求

AudioPlayer component 需要支援：

1. 播放
2. 暫停
3. 倒退 3 秒
4. 前進 3 秒
5. 播放速度調整
6. 顯示目前時間
7. 顯示總長度
8. 可拖曳進度條
9. A-B repeat 可作為第二版功能
10. Segment replay 可作為第二版功能

TypeScript props 範例：

```ts
interface AudioPlayerProps {
  src: string;
  defaultSpeed?: number;
  rewindSeconds?: number;
  startTimeSeconds?: number;
  endTimeSeconds?: number;
}
```

---

## 13. 第一版開發順序

請按照以下順序施工。

### Phase 1：基本專案架構

1. 建立 frontend React + Vite + TypeScript
2. 建立 backend FastAPI
3. 建立 SQLite database
4. 建立基本 API client
5. 建立基本 routing

---

### Phase 2：音檔與 transcript 管理

1. 音檔上傳 API
2. transcript 儲存 API
3. 音檔列表 API
4. 前端匯入頁
5. 前端音檔清單
6. exam_type / ielts_section / toeic_part metadata

---

### Phase 3：播放器與聽寫模式

1. AudioPlayer component
2. DictationPractice component
3. Submit dictation API
4. 文字比對 service
5. 錯誤分類 service
6. 結果顯示 ResultPanel
7. PracticeRecord 儲存

---

### Phase 4：通用題目與填空模式

1. questions table
2. question_options table
3. 建立題目 API
4. FillBlankPractice component
5. 字數限制檢查
6. 單複數 / 拼字錯誤提示

---

### Phase 5：錯題複習與統計

1. Mistake table
2. ReviewPage
3. DashboardPage
4. 依錯誤類型篩選
5. 依 exam_type 篩選

---

## 14. 第二版可加功能

第二版再加入：

1. A-B repeat 區段循環播放
2. 音檔自動切句
3. SRT / VTT transcript 匯入
4. AI 自動產生 IELTS 填空題
5. AI 同義改寫分析
6. AI TOEIC 選項陷阱分析
7. 每日練習計畫
8. 弱點報告
9. 匯出錯題 CSV
10. 支援 TOEIC Part 1 / 2 / 3 / 4 完整題型
11. 支援 shadowing mode
12. 支援自訂單字本
13. 支援音檔批次匯入

---

## 15. EnglishPod 音檔結構

### 音檔命名規則

EnglishPod 音檔統一放在：

```txt
backend/uploads/audio/englishpod/{batch}/{episode}/
```

範例：

```txt
backend/uploads/audio/englishpod/1-30/0001/
  englishpod_B0001dg.mp3   ← Dialogue（主對話）
  englishpod_B0001pb.mp3   ← Phrasebook（片語解說）
  englishpod_B0001rv.mp3   ← Review（複習）
  englishpod_B0001.pdf     ← 對應的 PDF 教材
```

### Track 類型

| 後綴 | 說明 | Import PDF | Dialogue/Vocab 區塊 | Role Play |
|------|------|-----------|---------------------|-----------|
| `dg` | Dialogue，主對話 | ✓ | ✓ | ✓（有 segments 後）|
| `pb` | Phrasebook，片語 | ✗ | ✗ | ✗ |
| `rv` | Review，複習 | ✗ | ✗ | ✗ |

### PDF 解析邏輯

- 使用 PyMuPDF 讀取 PDF
- 只擷取 "Elementary" 區塊的對話
- 角色標籤格式：`A:` 或 `B:` 獨立一行
- 處理 PDF 常見問題：
  - Unicode 連字符（fi / fl / ff 等）
  - 花體引號（`'` `'` `"` `"`）→ 標準 ASCII
  - 連字符換行（`compli-\nmentary` → `complimentary`）

### PDF 尋找規則

`find_pdf_for_audio()` 依音檔路徑自動尋找同資料夾的 PDF：

```txt
englishpod_B0001dg.mp3 → englishpod_B0001.pdf（同資料夾）
```

---

## 16. 開發注意事項

1. 第一版優先能用，不追求華麗 UI。
2. 音檔先存在本地 `backend/uploads/audio/`。
3. Transcript 先用純文字，不需要一開始就支援 SRT。
4. 比對邏輯先用規則，不需要一開始接 AI。
5. 所有練習紀錄都要存 database。
6. 前端 UI 要適合長時間練習，避免太花俏。
7. 優先支援桌面瀏覽器，之後再優化手機 RWD。
8. 不要把程式名稱、API、資料表寫死成 IELTS。
9. 所有考試差異都用 `exam_type` 與 metadata 控制。
10. 使用者音檔只做本地練習管理，不要預設上傳雲端。

---

## 17. MVP 完成標準

完成後，使用者應該可以：

1. 開啟本地端 Web App
2. 上傳 TOEIC / IELTS / Custom 音檔
3. 貼上 transcript
4. 選擇 exam_type
5. 選擇 dictation mode
6. 播放音檔
7. 輸入聽到的句子
8. 提交答案
9. 看到正確率與錯誤分析
10. 建立填空題
11. 練習填空答案
12. 查看錯題紀錄
13. 依 TOEIC / IELTS / Custom 篩選練習紀錄

---

## 18. README 啟動指令建議

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

預設：

```txt
Frontend: http://localhost:5173
Backend: http://localhost:8000
```

---

## 19. 給 Claude Code 的施工指令

請你依照本規格建立一個本地端 English Listening Trainer。

專案名稱：

```txt
English Listening Trainer
```

Repo / folder name：

```txt
english-listening-trainer
```

請優先完成 MVP：

1. React + TypeScript + Vite 前端
2. FastAPI 後端
3. SQLite database
4. 音檔上傳
5. transcript 儲存
6. 音檔播放
7. exam_type metadata：IELTS / TOEIC / Custom
8. dictation answer submit
9. text comparison
10. mistake analysis
11. practice record storage
12. basic review page
13. fill-in-the-blank question creation and practice

請避免一次做太多 AI 功能。  
請先讓系統可以穩定練習，再逐步加上進階功能。

---

## 20. 最終系統方向

這個系統的長期方向不是單一 IELTS 工具，而是：

> 使用者可以把任何英文音檔變成可練習、可評分、可複習的聽力訓練材料。

核心價值：

1. 把被動聽音檔變成主動練習
2. 把聽不懂的地方變成可追蹤錯誤
3. 把 TOEIC / IELTS / 一般英文素材統一管理
4. 用錯題複習提升精準聽力
5. 未來可加入 AI 講解與自動出題

---

## 21. 已實作功能狀態（截至 2026-05）

### 21.1 已完成

| 功能 | 說明 |
|------|------|
| Mac 一鍵啟動 | `start.command` — 用 osascript 開兩個 Terminal 視窗分別跑 backend / frontend |
| Scan Folder | 掃描 `uploads/` 全目錄，自動新增 MP3 到 DB |
| EnglishPod PDF Import | 解析同資料夾 PDF，提取對話 segments，存入 `transcript_segments` |
| Role Play Mode | 選角色 → 填台詞 → 逐行評分 → 可單行重試 |
| TOEIC Part 1 SRT Import | 解析 `uploads/textfile/{stem}.srt`，提取 Part 1 A/B/C/D 句子，存入 segments（含時間戳記）|
| Sentence Dictation Mode | TOEIC Part 1 每選項獨立聽寫，按題組 (Q1~Q6) 分組顯示 |
| segment_count 持久化 | AudioItemResponse 透過 GROUP BY 計算 segment_count，Library 頁重整後仍顯示 ✓ N lines |
| Import PDF 狀態顯示 | Library 展開後顯示目前 segment 數量，已匯入顯示 ✓，未匯入顯示 Import PDF 按鈕 |
| Import SRT 狀態顯示 | 同上，TOEIC SRT 匯入後顯示 ✓ N lines |

### 21.2 未完成

| 功能 | 狀態 | 備註 |
|------|------|------|
| Sentence Dictation 音檔播放（B/C/D）| ❌ 有 bug | 見 §22 |
| SettingsPage | 未開始 | 設定頁面 |
| MultipleChoicePractice UI | 未開始 | 後端 API 已有，前端元件尚未做 |
| DashboardPage 統計 | 基本已有 | 可再擴充 |
| ReviewPage | 已有基本頁面 | 可再強化篩選與重做功能 |

---

## 22. TOEIC Part 1 SRT Import 設計

### 22.1 SRT 檔案位置

```txt
uploads/
  textfile/
    {audio_stem}.srt    ← 例如 Test01 (YBM 2022).srt
```

`find_srt_for_audio()` 依音檔 basename（去副檔名）比對 `uploads/textfile/` 目錄。

### 22.2 SRT 解析邏輯

由 `backend/app/services/srt_parser_toeic.py` 處理：

1. `parse_srt(content)` — 把 SRT 內容切成 entries：`{ start, end, text }`
2. `extract_part1_sentences(entries)` — 找到 "Part 1 will begin" 與 "Part 2...direction" 之間的 entries，擷取符合 `^([A-D])\.\s+(.+)$` 的行，記錄 `start/end` 時間戳記

每個 Part 1 segment 存入 `transcript_segments`：

```txt
speaker: "A" / "B" / "C" / "D"
start_time_seconds: 來自 SRT 時間戳記（秒數）
end_time_seconds: 來自 SRT 時間戳記（秒數）
text: 選項句子內容
```

### 22.3 Import SRT API

```http
POST /api/transcripts/import-srt/{audio_id}
```

- 自動尋找對應 SRT
- 清除既有 transcript（同一音檔只保留最新一份）
- 回傳 `TranscriptImportResponse`（含 segments 清單）

### 22.4 PracticePage 路由邏輯

```txt
hasSegments && !hasTimedSegments  →  顯示 Role Play 按鈕
hasTimedSegments                  →  顯示 Sentence Dictation 按鈕
```

`hasTimedSegments = segments.some(s => s.start_time_seconds != null)`

---

## 23. Sentence Dictation Mode 設計

### 23.1 UI 結構

```txt
Speed: [0.75x] [1.0x] [1.25x]

Q1
  A  [▶]  [___________________________]  [Check]
  B  [▶]  [___________________________]  [Check]
  C  [▶]  [___________________________]  [Check]
  D  [▶]  [___________________________]  [Check]

Q2
  ...
```

每題 4 個選項（groupByQuestion，每 4 個 segment = 1 題）。

### 23.2 元件：SentenceDictationPractice.tsx

- 共用一個 `<audio>` element，透過 seek 控制播放位置
- `activeSegRef`：目前正在播的 segment
- `handleTimeUpdate`：用 `el.seeking` 防止 seek 過程中誤判結束
- `playSentence(seg)`：
  - `el.pause()`
  - `el.currentTime = seg.start_time_seconds`
  - `el.play()` — 直接在 click handler 內呼叫（保持 user gesture context）
- 每個選項有獨立 input / result state，Check 後顯示分數與正確答案

### 23.3 已知問題：B/C/D 不播放

- **症狀**：每題只有 A 選項能播到正確音檔，B/C/D 播不出來
- **排查確認**：
  - DB 時間戳記正確（A: 101.76, B: 104.56, C: 106.519, D: 112.64）
  - 瀏覽器 console 確認 `seeked` 事件有觸發，`currentTime` 正確
  - 後端 check API 邏輯正確（`segment_id` → `seg.text` as `correct_answer`）
  - 音檔為 CBR 128kbps，`accept-ranges: bytes` 支援 range request
- **目前狀態**：`el.play()` 直接在 click handler 內呼叫（已排除 autoplay policy 問題），但問題仍在排查中

### 23.4 計畫中的解決方案：預先切片

改成把每個 segment 切成獨立小 MP3 clip，直接播放，不需要 seek。

**後端：`POST /api/transcripts/audio/{audio_id}/extract-clips`**

- 用 `ffmpeg` 依 `start_time_seconds` / `end_time_seconds` 切片
- 儲存到 `uploads/clips/{audio_id}/seg_{segment_id}.mp3`
- 在 `TranscriptSegment` response 新增 `clip_path` 欄位

**前端：SentenceDictationPractice**

- 每個 segment row 用獨立 `<audio src={clipPath}>` 或 `new Audio()`
- 直接 `play()` 從頭播，不需要 seek
- 不需要共享 audio element，無 seek 問題

**DB 欄位（新增）**：

```sql
ALTER TABLE transcript_segments ADD COLUMN clip_path TEXT;
```

**目錄結構**：

```txt
uploads/
  clips/
    1004/
      seg_457.mp3   ← Q1-A
      seg_458.mp3   ← Q1-B
      seg_459.mp3   ← Q1-C
      seg_460.mp3   ← Q1-D
      ...
```

**clip 大小估算**：每個 clip 約 2-4 秒 × 128kbps = ~32-64KB；24 個 clip ≈ 1MB 以內。
