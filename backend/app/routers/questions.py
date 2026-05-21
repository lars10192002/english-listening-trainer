from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Question, QuestionOption, AudioItem
from ..schemas import QuestionCreate, QuestionResponse

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.post("", response_model=QuestionResponse)
def create_question(data: QuestionCreate, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == data.audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    options_data = data.options or []
    question_data = data.model_dump(exclude={"options"})
    q = Question(**question_data)
    db.add(q)
    db.flush()

    for opt in options_data:
        db.add(QuestionOption(question_id=q.id, **opt.model_dump()))

    db.commit()
    db.refresh(q)
    return q


@router.get("/audio/{audio_id}", response_model=List[QuestionResponse])
def get_questions_by_audio(audio_id: int, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.audio_id == audio_id).all()


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(question_id: int, data: QuestionCreate, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, value in data.model_dump(exclude={"options"}).items():
        setattr(q, field, value)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"detail": "Deleted"}
