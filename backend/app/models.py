from sqlalchemy import Column, Integer, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class AudioItem(Base):
    __tablename__ = "audio_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    title = Column(Text)
    exam_type = Column(Text, default="custom")
    category = Column(Text)
    ielts_section = Column(Integer)
    toeic_part = Column(Integer)
    topic = Column(Text)
    difficulty = Column(Text)
    speaker_accent = Column(Text)
    duration_seconds = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    transcripts = relationship("Transcript", back_populates="audio_item", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="audio_item", cascade="all, delete-orphan")
    practice_records = relationship("PracticeRecord", back_populates="audio_item", cascade="all, delete-orphan")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audio_id = Column(Integer, ForeignKey("audio_items.id"), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(Text, default="en")
    format = Column(Text, default="plain_text")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    audio_item = relationship("AudioItem", back_populates="transcripts")
    segments = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"), nullable=False)
    audio_id = Column(Integer, ForeignKey("audio_items.id"), nullable=False)
    segment_index = Column(Integer, nullable=False)
    speaker = Column(Text)
    start_time_seconds = Column(Float)
    end_time_seconds = Column(Float)
    original_start_time_seconds = Column(Float)
    original_end_time_seconds = Column(Float)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    transcript = relationship("Transcript", back_populates="segments")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audio_id = Column(Integer, ForeignKey("audio_items.id"), nullable=False)
    segment_id = Column(Integer, ForeignKey("transcript_segments.id"))
    question_type = Column(Text, nullable=False)
    question_text = Column(Text)
    correct_answer = Column(Text, nullable=False)
    answer_type = Column(Text)
    word_limit_type = Column(Text)
    explanation = Column(Text)
    paraphrase_note = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    audio_item = relationship("AudioItem", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    practice_records = relationship("PracticeRecord", back_populates="question")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_label = Column(Text, nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    question = relationship("Question", back_populates="options")


class PracticeRecord(Base):
    __tablename__ = "practice_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audio_id = Column(Integer, ForeignKey("audio_items.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"))
    mode = Column(Text, nullable=False)
    user_input = Column(Text)
    correct_answer = Column(Text)
    selected_option_id = Column(Integer, ForeignKey("question_options.id"))
    is_correct = Column(Boolean)
    score = Column(Float)
    word_error_rate = Column(Float)
    mistake_summary = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    audio_item = relationship("AudioItem", back_populates="practice_records")
    question = relationship("Question", back_populates="practice_records")
    mistakes = relationship("Mistake", back_populates="practice_record", cascade="all, delete-orphan")


class Mistake(Base):
    __tablename__ = "mistakes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practice_record_id = Column(Integer, ForeignKey("practice_records.id"), nullable=False)
    mistake_type = Column(Text, nullable=False)
    wrong_text = Column(Text)
    correct_text = Column(Text)
    explanation = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    practice_record = relationship("PracticeRecord", back_populates="mistakes")
