import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Transcript, TranscriptSegment, AudioItem
from ..schemas import (
    TranscriptCreate, TranscriptResponse,
    TranscriptSegmentCreate, TranscriptSegmentResponse,
    TranscriptImportResponse,
)
from ..services.pdf_parser import find_pdf_for_audio, parse_pdf, parse_dialogue_segments

BASE_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))

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


@router.post("/import-pdf/{audio_id}", response_model=TranscriptImportResponse)
def import_pdf_transcript(audio_id: int, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    pdf_path = find_pdf_for_audio(audio.file_path, BASE_DIR)
    if not pdf_path:
        raise HTTPException(status_code=404, detail="No PDF found for this audio")

    try:
        parsed = parse_pdf(pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parse error: {e}")

    raw_segments = parse_dialogue_segments(parsed['dialogue'])
    if not raw_segments:
        raise HTTPException(status_code=422, detail="No dialogue segments found in PDF")

    # Remove existing transcript for this audio before re-importing
    existing = db.query(Transcript).filter(Transcript.audio_id == audio_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    transcript = Transcript(
        audio_id=audio_id,
        content=parsed['dialogue'],
        format='dialogue',
        language='en',
    )
    db.add(transcript)
    db.flush()

    db_segments = []
    for seg in raw_segments:
        s = TranscriptSegment(
            transcript_id=transcript.id,
            audio_id=audio_id,
            segment_index=seg['segment_index'],
            speaker=seg['speaker'],
            text=seg['text'],
        )
        db.add(s)
        db_segments.append(s)

    db.commit()
    db.refresh(transcript)
    for s in db_segments:
        db.refresh(s)

    speakers = sorted({s['speaker'] for s in raw_segments})

    return TranscriptImportResponse(
        transcript_id=transcript.id,
        audio_id=audio_id,
        segment_count=len(db_segments),
        speakers=speakers,
        segments=[TranscriptSegmentResponse.model_validate(s) for s in db_segments],
    )
