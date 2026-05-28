import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from .database import engine
from . import models
from .routers import audio, transcripts, questions, practice, review, stats

models.Base.metadata.create_all(bind=engine)

# Migrations: add columns if they don't exist
_migrations = [
    "ALTER TABLE transcript_segments ADD COLUMN speaker TEXT",
    "ALTER TABLE transcript_segments ADD COLUMN original_start_time_seconds REAL",
    "ALTER TABLE transcript_segments ADD COLUMN original_end_time_seconds REAL",
]
with engine.connect() as _conn:
    for _sql in _migrations:
        try:
            _conn.execute(text(_sql))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(title="English Listening Trainer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(os.path.join(UPLOADS_DIR, "audio", "TOEIC"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(audio.router)
app.include_router(transcripts.router)
app.include_router(questions.router)
app.include_router(practice.router)
app.include_router(review.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"message": "English Listening Trainer API is running"}
