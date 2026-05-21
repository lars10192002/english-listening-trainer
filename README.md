# English Listening Trainer

A local web application for practicing English listening with custom audio files. Supports TOEIC, IELTS, dictation, fill-in-the-blank exercises, mistake analysis, and practice history tracking.

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Features (MVP)

- Import MP3 / WAV / M4A audio files
- Paste or upload transcripts
- Classify by exam type: IELTS / TOEIC / Custom / Business / General
- **Dictation Mode**: Type what you hear, get score + mistake analysis
- **Fill-in-the-Blank Mode**: Create questions with word-limit checks
- Mistake categorization: spelling, plural, tense, article, preposition, missing/extra word
- Practice history & review page with filters
- Dashboard with stats

## Project Structure

```
english-listening-trainer/
  backend/
    app/
      main.py           # FastAPI entry point
      models.py         # SQLAlchemy models
      database.py       # SQLite setup
      schemas.py        # Pydantic schemas
      routers/          # API routes
      services/         # Text comparison & mistake analysis
    uploads/audio/      # Stored audio files
    requirements.txt
  frontend/
    src/
      pages/            # Dashboard, Import, Library, Practice, Review
      components/       # AudioPlayer, DictationPractice, FillBlankPractice, ResultPanel
      api/              # API client functions
      types/            # TypeScript types
```
