import os
import shutil
import subprocess
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..database import get_db
from ..models import AudioItem, TranscriptSegment
from ..schemas import AudioItemResponse, AudioItemUpdate, PdfContentResponse
from ..services.pdf_parser import find_pdf_for_audio, parse_pdf

BASE_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _with_segment_count(items: list, db: Session) -> list:
    if not items:
        return []
    counts = dict(
        db.query(TranscriptSegment.audio_id, func.count(TranscriptSegment.id))
        .filter(TranscriptSegment.audio_id.in_([i.id for i in items]))
        .group_by(TranscriptSegment.audio_id)
        .all()
    )
    result = []
    for item in items:
        r = AudioItemResponse.model_validate(item)
        r.segment_count = counts.get(item.id, 0)
        result.append(r)
    return result

router = APIRouter(prefix="/api/audio", tags=["audio"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "audio")
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}


@router.post("/upload", response_model=AudioItemResponse)
async def upload_audio(
    file: UploadFile = File(...),
    exam_type: str = Form("custom"),
    title: Optional[str] = Form(None),
    ielts_section: Optional[int] = Form(None),
    toeic_part: Optional[int] = Form(None),
    topic: Optional[str] = Form(None),
    difficulty: Optional[str] = Form(None),
    speaker_accent: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(UPLOAD_DIR, file.filename)

    # Avoid overwriting: append index if file exists
    base, extension = os.path.splitext(file.filename)
    counter = 1
    while os.path.exists(dest_path):
        dest_path = os.path.join(UPLOAD_DIR, f"{base}_{counter}{extension}")
        counter += 1

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    saved_filename = os.path.basename(dest_path)
    relative_path = f"/uploads/audio/{saved_filename}"

    item = AudioItem(
        filename=saved_filename,
        file_path=relative_path,
        title=title or base,
        exam_type=exam_type,
        ielts_section=ielts_section,
        toeic_part=toeic_part,
        topic=topic,
        difficulty=difficulty,
        speaker_accent=speaker_accent,
        category=category,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=List[AudioItemResponse])
def list_audio(
    exam_type: Optional[str] = None,
    ielts_section: Optional[int] = None,
    toeic_part: Optional[int] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AudioItem)
    if exam_type:
        q = q.filter(AudioItem.exam_type == exam_type)
    if ielts_section is not None:
        q = q.filter(AudioItem.ielts_section == ielts_section)
    if toeic_part is not None:
        q = q.filter(AudioItem.toeic_part == toeic_part)
    if difficulty:
        q = q.filter(AudioItem.difficulty == difficulty)
    if topic:
        q = q.filter(AudioItem.topic == topic)
    return _with_segment_count(q.order_by(AudioItem.created_at.desc()).all(), db)


@router.get("/{audio_id}", response_model=AudioItemResponse)
def get_audio(audio_id: int, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    return _with_segment_count([item], db)[0]


@router.get("/{audio_id}/pdf", response_model=PdfContentResponse)
def get_pdf_content(audio_id: int, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    pdf_path = find_pdf_for_audio(item.file_path, BASE_DIR)
    if not pdf_path:
        raise HTTPException(status_code=404, detail="No PDF found for this audio")
    try:
        return parse_pdf(pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parse error: {e}")


def _infer_exam_type(rel_path: str) -> str:
    parts = rel_path.lower().replace("\\", "/").split("/")
    for part in parts:
        if "toeic" in part:
            return "toeic"
        if "ielts" in part:
            return "ielts"
        if "business" in part:
            return "business"
    return "custom"


@router.post("/scan", response_model=List[AudioItemResponse])
def scan_folder(db: Session = Depends(get_db)):
    """Register any audio files in uploads/ (recursively) that aren't yet in the database."""
    uploads_root = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(uploads_root, exist_ok=True)
    os.makedirs(os.path.join(uploads_root, "audio", "TOEIC"), exist_ok=True)

    existing_paths = {row.file_path for row in db.query(AudioItem.file_path).all()}
    added = []
    for dirpath, dirnames, filenames in os.walk(uploads_root):
        dirnames[:] = [d for d in dirnames if d != 'cache']
        for fname in filenames:
            if fname.startswith("."):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue
            full_path = os.path.join(dirpath, fname)
            rel = os.path.relpath(full_path, uploads_root).replace("\\", "/")
            relative_path = f"/uploads/{rel}"
            if relative_path in existing_paths:
                continue
            base = os.path.splitext(fname)[0]
            item = AudioItem(
                filename=fname,
                file_path=relative_path,
                title=base,
                exam_type=_infer_exam_type(rel),
            )
            db.add(item)
            added.append(item)
    db.commit()
    for item in added:
        db.refresh(item)
    return _with_segment_count(added, db)


CLIP_CACHE_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "cache", "clips"))


@router.get("/{audio_id}/clip/{segment_id}")
def get_clip(audio_id: int, segment_id: int, db: Session = Depends(get_db)):
    audio = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    seg = db.query(TranscriptSegment).filter(
        TranscriptSegment.id == segment_id,
        TranscriptSegment.audio_id == audio_id,
    ).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    if seg.start_time_seconds is None or seg.end_time_seconds is None:
        raise HTTPException(status_code=422, detail="Segment has no timestamps")

    os.makedirs(CLIP_CACHE_DIR, exist_ok=True)

    start_ms = int(seg.start_time_seconds * 1000)
    end_ms = int(seg.end_time_seconds * 1000)
    cache_file = os.path.join(CLIP_CACHE_DIR, f"seg_{audio_id}_{segment_id}_{start_ms}_{end_ms}.mp3")

    if not os.path.exists(cache_file):
        audio_path = os.path.normpath(os.path.join(BASE_DIR, audio.file_path.lstrip("/")))
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="Audio file not found on disk")

        start = seg.start_time_seconds
        duration = seg.end_time_seconds - start + 0.50

        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-i", audio_path,
            "-t", str(duration),
            "-c:a", "copy",
            "-vn",
            cache_file,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=30)
            if result.returncode != 0 or not os.path.exists(cache_file):
                raise HTTPException(status_code=500, detail="ffmpeg clip failed")
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="ffmpeg timeout")

    return FileResponse(cache_file, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@router.patch("/{audio_id}", response_model=AudioItemResponse)
def update_audio(audio_id: int, data: AudioItemUpdate, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _with_segment_count([item], db)[0]


@router.delete("/{audio_id}")
def delete_audio(audio_id: int, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    # Remove file from disk
    full_path = os.path.join(os.path.dirname(__file__), "..", "..", item.file_path.lstrip("/"))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}
