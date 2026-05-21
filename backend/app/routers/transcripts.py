from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Transcript, TranscriptSegment, AudioItem
from ..schemas import (
    TranscriptCreate, TranscriptResponse,
    TranscriptSegmentCreate, TranscriptSegmentResponse,
)

router = APIRouter(prefix="/api/transcripts", tags=["transcripts"])


@router.post("", response_model=TranscriptResponse)
def create_transcript(data: TranscriptCreate, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == data.audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    t = Transcript(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/audio/{audio_id}", response_model=List[TranscriptResponse])
def get_transcripts_by_audio(audio_id: int, db: Session = Depends(get_db)):
    return db.query(Transcript).filter(Transcript.audio_id == audio_id).all()


@router.get("/{transcript_id}", response_model=TranscriptResponse)
def get_transcript(transcript_id: int, db: Session = Depends(get_db)):
    t = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return t


@router.put("/{transcript_id}", response_model=TranscriptResponse)
def update_transcript(transcript_id: int, data: TranscriptCreate, db: Session = Depends(get_db)):
    t = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found")
    t.content = data.content
    t.format = data.format
    t.language = data.language
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{transcript_id}")
def delete_transcript(transcript_id: int, db: Session = Depends(get_db)):
    t = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found")
    db.delete(t)
    db.commit()
    return {"detail": "Deleted"}


@router.post("/{transcript_id}/segments", response_model=TranscriptSegmentResponse)
def create_segment(transcript_id: int, data: TranscriptSegmentCreate, db: Session = Depends(get_db)):
    t = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found")
    seg = TranscriptSegment(transcript_id=transcript_id, **data.model_dump())
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.get("/{transcript_id}/segments", response_model=List[TranscriptSegmentResponse])
def list_segments(transcript_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript_id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )
