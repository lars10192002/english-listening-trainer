from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Audio ──────────────────────────────────────────────────────────────────

class AudioItemBase(BaseModel):
    title: Optional[str] = None
    exam_type: Optional[str] = "custom"
    category: Optional[str] = None
    ielts_section: Optional[int] = None
    toeic_part: Optional[int] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    speaker_accent: Optional[str] = None


class AudioItemCreate(AudioItemBase):
    filename: str
    file_path: str


class AudioItemUpdate(BaseModel):
    title: Optional[str] = None
    exam_type: Optional[str] = None
    category: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class AudioItemResponse(AudioItemBase):
    id: int
    filename: str
    file_path: str
    duration_seconds: Optional[float] = None
    created_at: Optional[datetime] = None
    segment_count: int = 0

    model_config = {"from_attributes": True}


# ── PDF Content ────────────────────────────────────────────────────────────

class VocabItem(BaseModel):
    word: str
    pos: str
    definition: str


class PdfContentResponse(BaseModel):
    title: str
    dialogue: str
    key_vocabulary: List[VocabItem]
    supplementary_vocabulary: List[VocabItem]


# ── Transcript ─────────────────────────────────────────────────────────────

class TranscriptCreate(BaseModel):
    audio_id: int
    content: str
    language: Optional[str] = "en"
    format: Optional[str] = "plain_text"


class TranscriptResponse(BaseModel):
    id: int
    audio_id: int
    content: str
    language: str
    format: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TranscriptSegmentCreate(BaseModel):
    audio_id: int
    segment_index: int
    speaker: Optional[str] = None
    start_time_seconds: Optional[float] = None
    end_time_seconds: Optional[float] = None
    text: str


class TranscriptSegmentResponse(BaseModel):
    id: int
    transcript_id: int
    audio_id: int
    segment_index: int
    speaker: Optional[str] = None
    start_time_seconds: Optional[float] = None
    end_time_seconds: Optional[float] = None
    text: str

    model_config = {"from_attributes": True}


class TranscriptImportResponse(BaseModel):
    transcript_id: int
    audio_id: int
    segment_count: int
    speakers: List[str]
    segments: List[TranscriptSegmentResponse]


# ── Question ───────────────────────────────────────────────────────────────

class QuestionOptionCreate(BaseModel):
    option_label: str
    option_text: str
    is_correct: bool = False


class QuestionOptionResponse(BaseModel):
    id: int
    question_id: int
    option_label: str
    option_text: str
    is_correct: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    audio_id: int
    segment_id: Optional[int] = None
    question_type: str
    question_text: Optional[str] = None
    correct_answer: str
    answer_type: Optional[str] = None
    word_limit_type: Optional[str] = None
    explanation: Optional[str] = None
    paraphrase_note: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionResponse(BaseModel):
    id: int
    audio_id: int
    segment_id: Optional[int] = None
    question_type: str
    question_text: Optional[str] = None
    correct_answer: str
    answer_type: Optional[str] = None
    word_limit_type: Optional[str] = None
    explanation: Optional[str] = None
    paraphrase_note: Optional[str] = None
    options: List[QuestionOptionResponse] = []

    model_config = {"from_attributes": True}


# ── Practice ───────────────────────────────────────────────────────────────

class MistakeDetail(BaseModel):
    mistake_type: str
    wrong_text: Optional[str] = None
    correct_text: Optional[str] = None
    explanation: Optional[str] = None


class DictationSubmit(BaseModel):
    audio_id: int
    segment_id: Optional[int] = None
    user_input: str


class DictationResult(BaseModel):
    score: float
    word_error_rate: float
    correct_answer: str
    user_input: str
    mistakes: List[MistakeDetail]
    practice_record_id: int


class FillBlankSubmit(BaseModel):
    question_id: int
    user_answer: str


class FillBlankResult(BaseModel):
    is_correct: bool
    score: float
    correct_answer: str
    user_answer: str
    mistakes: List[MistakeDetail]
    practice_record_id: int


class MultipleChoiceSubmit(BaseModel):
    question_id: int
    selected_option_id: int


class MultipleChoiceResult(BaseModel):
    is_correct: bool
    correct_option_id: int
    explanation: Optional[str] = None
    practice_record_id: int


# ── Review / Stats ─────────────────────────────────────────────────────────

class MistakeResponse(BaseModel):
    id: int
    practice_record_id: int
    mistake_type: str
    wrong_text: Optional[str] = None
    correct_text: Optional[str] = None
    explanation: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PracticeRecordResponse(BaseModel):
    id: int
    audio_id: int
    question_id: Optional[int] = None
    mode: str
    user_input: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    score: Optional[float] = None
    word_error_rate: Optional[float] = None
    mistake_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    mistakes: List[MistakeResponse] = []
    audio: Optional[AudioItemResponse] = None

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    today_practice_count: int
    average_score: float
    pending_review_count: int
    recent_mistake_types: List[dict]
    exam_type_distribution: List[dict]


# ── Role Play ──────────────────────────────────────────────────────────────

class RolePlayAnswer(BaseModel):
    segment_id: int
    user_input: str


class RolePlaySubmit(BaseModel):
    audio_id: int
    role: str
    answers: List[RolePlayAnswer]


class RolePlayLineResult(BaseModel):
    segment_id: int
    segment_index: int
    score: float
    word_error_rate: float
    correct_answer: str
    user_input: str
    mistakes: List[MistakeDetail]
    practice_record_id: int


class RolePlayResult(BaseModel):
    total_score: float
    role: str
    results: List[RolePlayLineResult]
