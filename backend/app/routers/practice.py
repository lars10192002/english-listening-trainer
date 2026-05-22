import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import AudioItem, Question, QuestionOption, PracticeRecord, Mistake, Transcript, TranscriptSegment
from ..schemas import (
    DictationSubmit, DictationResult,
    FillBlankSubmit, FillBlankResult,
    MultipleChoiceSubmit, MultipleChoiceResult,
    RolePlaySubmit, RolePlayResult, RolePlayLineResult,
    PracticeRecordResponse,
)
from ..services.text_compare import normalize_text
from ..services.mistake_analyzer import analyze_mistakes, check_word_limit
from ..services.scoring import compute_score

router = APIRouter(prefix="/api/practice", tags=["practice"])


@router.get("/records/audio/{audio_id}", response_model=List[PracticeRecordResponse])
def get_records_by_audio(
    audio_id: int,
    mode: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = (
        db.query(PracticeRecord)
        .options(joinedload(PracticeRecord.mistakes), joinedload(PracticeRecord.audio_item))
        .filter(PracticeRecord.audio_id == audio_id)
    )
    if mode:
        q = q.filter(PracticeRecord.mode == mode)
    return (
        q.order_by(PracticeRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def _save_record(db, audio_id, question_id, mode, user_input, correct_answer,
                 score_data, mistakes_data, selected_option_id=None):
    record = PracticeRecord(
        audio_id=audio_id,
        question_id=question_id,
        mode=mode,
        user_input=user_input,
        correct_answer=correct_answer,
        selected_option_id=selected_option_id,
        is_correct=score_data["is_correct"],
        score=score_data["score"],
        word_error_rate=score_data["wer"],
        mistake_summary=json.dumps([m["mistake_type"] for m in mistakes_data]),
    )
    db.add(record)
    db.flush()
    for m in mistakes_data:
        db.add(Mistake(practice_record_id=record.id, **m))
    db.commit()
    db.refresh(record)
    return record


@router.post("/dictation/submit", response_model=DictationResult)
def submit_dictation(data: DictationSubmit, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == data.audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Get correct answer from transcript or segment
    correct_answer = None
    if data.segment_id:
        seg = db.query(TranscriptSegment).filter(TranscriptSegment.id == data.segment_id).first()
        if seg:
            correct_answer = seg.text
    if not correct_answer:
        transcript = (
            db.query(Transcript).filter(Transcript.audio_id == data.audio_id).first()
        )
        if not transcript:
            raise HTTPException(status_code=404, detail="No transcript found for this audio")
        correct_answer = transcript.content

    score_data = compute_score(correct_answer, data.user_input)
    mistakes_data = analyze_mistakes(correct_answer, data.user_input)

    record = _save_record(
        db, data.audio_id, None, "dictation",
        data.user_input, correct_answer, score_data, mistakes_data
    )

    return DictationResult(
        score=score_data["score"],
        word_error_rate=score_data["wer"],
        correct_answer=correct_answer,
        user_input=data.user_input,
        mistakes=mistakes_data,
        practice_record_id=record.id,
    )


@router.post("/fill-blank/submit", response_model=FillBlankResult)
def submit_fill_blank(data: FillBlankSubmit, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    extra_mistakes = []
    if q.word_limit_type and q.word_limit_type != "none":
        limit_check = check_word_limit(data.user_answer, q.word_limit_type)
        if limit_check.get("exceeded"):
            extra_mistakes.append({
                "mistake_type": "word_limit",
                "wrong_text": data.user_answer,
                "correct_text": None,
                "explanation": (
                    f"Answer exceeds word limit: {limit_check['word_count']} words "
                    f"(limit: {limit_check['limit']})."
                ),
            })

    score_data = compute_score(q.correct_answer, data.user_answer)
    mistakes_data = analyze_mistakes(q.correct_answer, data.user_answer)
    mistakes_data = extra_mistakes + mistakes_data

    record = _save_record(
        db, q.audio_id, q.id, "fill_blank",
        data.user_answer, q.correct_answer, score_data, mistakes_data
    )

    return FillBlankResult(
        is_correct=score_data["is_correct"],
        score=score_data["score"],
        correct_answer=q.correct_answer,
        user_answer=data.user_answer,
        mistakes=mistakes_data,
        practice_record_id=record.id,
    )


@router.post("/role-play/submit", response_model=RolePlayResult)
def submit_role_play(data: RolePlaySubmit, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == data.audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    line_results = []
    for answer in data.answers:
        seg = db.query(TranscriptSegment).filter(TranscriptSegment.id == answer.segment_id).first()
        if not seg:
            continue
        score_data = compute_score(seg.text, answer.user_input)
        mistakes_data = analyze_mistakes(seg.text, answer.user_input)
        record = _save_record(
            db, data.audio_id, None, "role_play",
            answer.user_input, seg.text, score_data, mistakes_data,
        )
        line_results.append(RolePlayLineResult(
            segment_id=seg.id,
            segment_index=seg.segment_index,
            score=score_data["score"],
            word_error_rate=score_data["wer"],
            correct_answer=seg.text,
            user_input=answer.user_input,
            mistakes=mistakes_data,
            practice_record_id=record.id,
        ))

    total_score = round(sum(r.score for r in line_results) / len(line_results), 1) if line_results else 0.0
    return RolePlayResult(total_score=total_score, role=data.role, results=line_results)


@router.post("/multiple-choice/submit", response_model=MultipleChoiceResult)
def submit_multiple_choice(data: MultipleChoiceSubmit, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    selected = db.query(QuestionOption).filter(QuestionOption.id == data.selected_option_id).first()
    if not selected or selected.question_id != q.id:
        raise HTTPException(status_code=400, detail="Invalid option")

    correct_option = db.query(QuestionOption).filter(
        QuestionOption.question_id == q.id,
        QuestionOption.is_correct == True,
    ).first()

    is_correct = selected.is_correct
    score_data = {"score": 100.0 if is_correct else 0.0, "wer": 0.0 if is_correct else 1.0,
                  "is_correct": is_correct}

    record = _save_record(
        db, q.audio_id, q.id, "multiple_choice",
        selected.option_text, q.correct_answer,
        score_data, [], selected_option_id=data.selected_option_id
    )

    return MultipleChoiceResult(
        is_correct=is_correct,
        correct_option_id=correct_option.id if correct_option else data.selected_option_id,
        explanation=q.explanation,
        practice_record_id=record.id,
    )
