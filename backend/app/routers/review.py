from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from ..models import PracticeRecord, Mistake
from ..schemas import PracticeRecordResponse

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("", response_model=List[PracticeRecordResponse])
def list_records(
    exam_type: Optional[str] = None,
    mode: Optional[str] = None,
    mistake_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = (
        db.query(PracticeRecord)
        .options(joinedload(PracticeRecord.mistakes), joinedload(PracticeRecord.audio_item))
    )

    if exam_type:
        q = q.join(PracticeRecord.audio_item).filter_by(exam_type=exam_type)

    if mode:
        q = q.filter(PracticeRecord.mode == mode)

    if mistake_type:
        q = q.join(PracticeRecord.mistakes).filter(Mistake.mistake_type == mistake_type)

    return (
        q.order_by(PracticeRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
