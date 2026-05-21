import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import AudioItem
from ..schemas import AudioItemResponse, PdfContentResponse
from ..services.pdf_parser import find_pdf_for_audio, parse_pdf

BASE_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))

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
    return q.order_by(AudioItem.created_at.desc()).all()


@router.get("/{audio_id}", response_model=AudioItemResponse)
def get_audio(audio_id: int, db: Session = Depends(get_db)):
    item = db.query(AudioItem).filter(AudioItem.id == audio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audio not found")
    return item


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


@router.post("/scan", response_model=List[AudioItemResponse])
def scan_folder(db: Session = Depends(get_db)):
    """Register any audio files in uploads/audio/ (recursively) that aren't yet in the database."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Fix any existing records that have the wrong path prefix (/audio/... → /uploads/audio/...)
    for item in db.query(AudioItem).all():
        if item.file_path and item.file_path.startswith("/audio/"):
            item.file_path = "/uploads" + item.file_path
    db.commit()

    existing_paths = {row.file_path for row in db.query(AudioItem.file_path).all()}
    added = []
    for dirpath, _dirnames, filenames in os.walk(UPLOAD_DIR):
        for fname in filenames:
            if fname.startswith("."):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue
            full_path = os.path.join(dirpath, fname)
            rel = os.path.relpath(full_path, UPLOAD_DIR).replace("\\", "/")
            relative_path = f"/uploads/audio/{rel}"
            if relative_path in existing_paths:
                continue
            base = os.path.splitext(fname)[0]
            item = AudioItem(
                filename=fname,
                file_path=relative_path,
                title=base,
                exam_type="custom",
            )
            db.add(item)
            added.append(item)
    db.commit()
    for item in added:
        db.refresh(item)
    return added


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
