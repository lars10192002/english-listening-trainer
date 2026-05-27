# Multiple Choice Practice：功能規格與實作狀態

## 一、功能概述

Multiple Choice Practice 是一個選擇題練習模式，讓使用者在聽完音檔後，透過四選一的方式測驗理解程度。目前已完成前後端的基礎架構，**UI 暫時隱藏**，等待題目資料來源實作後再開放。

---

## 二、已完成的實作

### 2.1 資料模型

**`backend/app/models.py`**

```python
class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    audio_id = Column(Integer, ForeignKey("audio_items.id"))
    segment_id = Column(Integer, ForeignKey("transcript_segments.id"), nullable=True)
    question_type = Column(String)       # "multiple_choice" | "fill_blank"
    question_text = Column(Text, nullable=True)
    correct_answer = Column(String)
    explanation = Column(Text, nullable=True)
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")

class QuestionOption(Base):
    __tablename__ = "question_options"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    option_label = Column(String)        # "A" | "B" | "C" | "D"
    option_text = Column(Text)
    is_correct = Column(Boolean, default=False)
```

---

### 2.2 後端 API

**`backend/app/routers/questions.py`**

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/questions` | 建立一題（含 options） |
| GET | `/api/questions/audio/{audio_id}` | 取得某音檔的所有題目 |
| GET | `/api/questions/{question_id}` | 取得單題 |
| PUT | `/api/questions/{question_id}` | 更新題目 |
| DELETE | `/api/questions/{question_id}` | 刪除題目 |

**`backend/app/routers/practice.py`**

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/practice/multiple-choice` | 提交答案，回傳是否正確與 explanation |

**`POST /api/practice/multiple-choice` 請求格式：**

```json
{
  "question_id": 1,
  "selected_option_id": 3
}
```

**回傳格式：**

```json
{
  "is_correct": false,
  "correct_option_id": 1,
  "explanation": "The dialogue focuses on checking into a hotel.",
  "practice_record_id": 42
}
```

---

### 2.3 前端元件

**`frontend/src/components/MultipleChoicePractice.tsx`**

Props：
```typescript
interface Props {
  audio: AudioItem;
  questions: Question[];   // 已過濾 question_type === 'multiple_choice'
}
```

每題的 state（per question_id）：
```typescript
interface QuestionState {
  selectedId: number | null;
  result: MultipleChoiceResult | null;
  loading: boolean;
}
```

互動流程：
1. 使用者點選任一選項 → 立即 disable 所有選項 + 呼叫 API
2. 回傳後，正確選項變綠色、選錯的變紅色、其餘淡化
3. 顯示 explanation（藍色左邊框卡片）
4. 題目右上角出現 ↺ 按鈕，點擊可重置該題

視覺狀態：

| 狀態 | 背景 | 邊框 |
|------|------|------|
| 預設 | `#313244` | `#45475a` |
| 載入中（選中） | `#3d3f56` | `#6c7086` |
| 正確答案 | `#1e3a2f` | `#a6e3a1` |
| 選錯（選中） | `#3a1e1e` | `#f38ba8` |
| 其他（淡化） | `#25253a` | `#313244` opacity 0.5 |

**`frontend/src/api/practiceApi.ts`**

```typescript
export const submitMultipleChoice = async (
  data: MultipleChoiceSubmit
): Promise<MultipleChoiceResult> => {
  const res = await client.post('/api/practice/multiple-choice', data);
  return res.data;
};
```

---

### 2.4 PracticePage 整合

**`frontend/src/pages/PracticePage.tsx`**

- `Mode` 型別已加入 `'multiple_choice'`
- `hasMCQ` 旗標：`questions.some(q => q.question_type === 'multiple_choice' && q.options.length > 0)`
- 渲染條件：`{mode === 'multiple_choice' && <MultipleChoicePractice ... />}`
- **UI 按鈕目前用 `false &&` 隱藏，等題目來源完成後移除**

---

## 三、暫停原因：題目資料來源未實作

目前沒有機制讓題目自動進入資料庫。手動用 API 建題目不實用，規模無法擴展。

### 評估過的來源方案

| 方案 | 可行性 | 說明 |
|------|--------|------|
| 手動建題 | 低 | 需要一題一題打 API，不適合日常使用 |
| 解析 EnglishPod PDF | 不可行 | PDF 只有 dialogue 和 vocabulary，無練習題 |
| AI 生成（Claude API） | **可行** | 根據 transcript 自動生成題目，需要 API key |

---

## 四、待實作：AI 生成 MCQ

### 4.1 流程設計

```
POST /api/questions/generate/{audio_id}
  ↓
1. 從 DB 撈 transcript_segments，拼成對話全文
2. 建構 prompt，呼叫 Claude API（claude-haiku-4-5）
3. 解析回傳 JSON
4. 寫入 questions + question_options
5. 回傳新建的題目列表
```

### 4.2 Prompt 設計

```
你是英語聽力測驗出題老師。根據以下對話，出 {n} 題四選一選擇題。

要求：
- 每題測驗對話中的關鍵資訊或主旨
- 四個選項中只有一個正確
- 錯誤選項要有干擾性，不能太明顯
- 用英文出題
- 回傳 JSON 格式

對話：
{transcript}

格式：
[
  {
    "question_text": "...",
    "correct_answer": "A",
    "explanation": "...",
    "options": [
      {"label": "A", "text": "..."},
      {"label": "B", "text": "..."},
      {"label": "C", "text": "..."},
      {"label": "D", "text": "..."}
    ]
  }
]
```

### 4.3 後端實作位置

建議新增：`backend/app/routers/questions.py`

```python
@router.post("/generate/{audio_id}", response_model=List[QuestionResponse])
def generate_questions(audio_id: int, count: int = 3, db: Session = Depends(get_db)):
    # 1. 撈 segments
    # 2. 呼叫 Claude API
    # 3. 存入 DB
    # 4. 回傳
```

環境變數需求：`ANTHROPIC_API_KEY`

### 4.4 前端觸發點

Library 頁面，音檔卡片加 **Generate MCQ** 按鈕（只在有 transcript 時顯示）：

```
✓ SRT 24 sentences   [Align Timestamps]  [Generate MCQ]
                                                ↓ 點擊
                                          Generating…（約 5–10 秒）
                                                ↓ 完成
                                          ✓ 3 questions added
```

---

## 五、開放 UI 的步驟

當 AI 生成功能完成後，移除 `PracticePage.tsx` 中的 `false &&`：

```typescript
// 目前（隱藏）
{false && hasMCQ && (
  <ModeBtn label="Multiple Choice" ... />
)}

// 開放後
{hasMCQ && (
  <ModeBtn label="Multiple Choice" ... />
)}
```

---

## 六、測試資料（暫存）

資料庫現有 2 筆測試用的假題目（audio_id=2，englishpod_C0003dg），內容為虛構的飯店對話題目，不對應實際音檔內容。可在正式實作後刪除：

```bash
sqlite3 backend/english_listening_trainer.db \
  "DELETE FROM questions WHERE audio_id=2 AND question_type='multiple_choice';"
```
