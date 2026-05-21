from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from ..database import get_db
from ..models import PracticeRecord, Mistake, AudioItem
from ..schemas import DashboardStats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())

    today_count = db.query(PracticeRecord).filter(
        PracticeRecord.created_at >= today_start
    ).count()

    avg_score = db.query(func.avg(PracticeRecord.score)).scalar() or 0.0

    # Count unique records with at least one mistake (pending review)
    pending_count = (
        db.query(PracticeRecord)
        .join(PracticeRecord.mistakes)
        .distinct()
        .count()
    )

    # Top mistake types
    mistake_rows = (
        db.query(Mistake.mistake_type, func.count(Mistake.id).label("cnt"))
        .group_by(Mistake.mistake_type)
        .order_by(func.count(Mistake.id).desc())
        .limit(5)
        .all()
    )
    recent_mistake_types = [{"type": r.mistake_type, "count": r.cnt} for r in mistake_rows]

    # Exam type distribution
    exam_rows = (
        db.query(AudioItem.exam_type, func.count(PracticeRecord.id).label("cnt"))
        .join(PracticeRecord, PracticeRecord.audio_id == AudioItem.id)
        .group_by(AudioItem.exam_type)
        .all()
    )
    exam_type_distribution = [{"exam_type": r.exam_type, "count": r.cnt} for r in exam_rows]

    return DashboardStats(
        today_practice_count=today_count,
        average_score=round(float(avg_score), 1),
        pending_review_count=pending_count,
        recent_mistake_types=recent_mistake_types,
        exam_type_distribution=exam_type_distribution,
    )
