import os
import re
import glob
import difflib
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
from ..services.srt_parser_toeic import find_srt_for_audio, parse_srt, extract_part1_sentences

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


@router.get("/audio/{audio_id}/segments", response_model=List[TranscriptSegmentResponse])
def get_segments_by_audio(audio_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.audio_id == audio_id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )


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


@router.post("/import-srt/{audio_id}", response_model=TranscriptImportResponse)
def import_srt_transcript(audio_id: int, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    srt_path = find_srt_for_audio(audio.file_path, BASE_DIR)
    if not srt_path:
        raise HTTPException(status_code=404, detail="No SRT file found for this audio")

    with open(srt_path, encoding='utf-8') as f:
        content = f.read()

    entries = parse_srt(content)
    sentences = extract_part1_sentences(entries)
    if not sentences:
        raise HTTPException(status_code=422, detail="No Part 1 sentences found in SRT")

    existing = db.query(Transcript).filter(Transcript.audio_id == audio_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    full_text = '\n'.join(f"{s['option']}. {s['text']}" for s in sentences)
    transcript = Transcript(audio_id=audio_id, content=full_text, format='toeic_part1', language='en')
    db.add(transcript)
    db.flush()

    db_segments = []
    for s in sentences:
        seg = TranscriptSegment(
            transcript_id=transcript.id,
            audio_id=audio_id,
            segment_index=s['segment_index'],
            speaker=s['option'],
            start_time_seconds=s['start'],
            end_time_seconds=s['end'],
            text=s['text'],
        )
        db.add(seg)
        db_segments.append(seg)

    db.commit()
    db.refresh(transcript)
    for seg in db_segments:
        db.refresh(seg)

    return TranscriptImportResponse(
        transcript_id=transcript.id,
        audio_id=audio_id,
        segment_count=len(db_segments),
        speakers=['A', 'B', 'C', 'D'],
        segments=[TranscriptSegmentResponse.model_validate(s) for s in db_segments],
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


CLIP_CACHE_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "cache", "clips"))


def _normalize(text: str) -> str:
    text = text.lower()
    for a, b in [("he's", "he is"), ("she's", "she is"), ("it's", "it is"),
                 ("they're", "they are"), ("there's", "there is"), ("i'm", "i am"),
                 ("we're", "we are"), ("isn't", "is not"), ("aren't", "are not")]:
        text = text.replace(a, b)
    return re.sub(r"[^\w\s]", "", text).strip()


def _find_best_match(query: str, words: list):
    query_norm = _normalize(query).split()
    n = len(query_norm)
    if not n or not words:
        return None, None, 0.0
    best_score, best_start, best_end = 0.0, None, None
    for size in range(max(1, n - 4), n + 5):
        for i in range(len(words) - size + 1):
            window = words[i:i + size]
            window_text = " ".join(_normalize(w.word) for w in window)
            score = difflib.SequenceMatcher(None, " ".join(query_norm), window_text).ratio()
            if score > best_score:
                best_score = score
                best_start = window[0].start
                best_end = window[-1].end
    return best_start, best_end, best_score


@router.post("/align/{audio_id}")
def align_timestamps(audio_id: int, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    audio_path = os.path.normpath(os.path.join(BASE_DIR, audio.file_path.lstrip("/")))
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.audio_id == audio_id)
        .order_by(TranscriptSegment.segment_index)
        .all()
    )
    if not segments:
        raise HTTPException(status_code=422, detail="No segments to align")

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu", compute_type="int8")
        whisper_segments, _ = model.transcribe(audio_path, word_timestamps=True, language="en")
        words = [w for seg in whisper_segments for w in (seg.words or [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper error: {e}")

    updated = 0
    for seg in segments:
        new_start, new_end, score = _find_best_match(seg.text, words)
        if new_start is None or score < 0.5:
            continue
        seg.start_time_seconds = new_start
        seg.end_time_seconds = new_end
        for f in glob.glob(os.path.join(CLIP_CACHE_DIR, f"seg_{audio_id}_{seg.id}_*.mp3")):
            os.remove(f)
        updated += 1

    db.commit()
    return {"updated": updated, "total": len(segments)}
