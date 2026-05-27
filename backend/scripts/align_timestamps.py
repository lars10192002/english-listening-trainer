#!/usr/bin/env python3
"""
Align transcript segment timestamps using faster-whisper word-level output.

Usage:
    python align_timestamps.py <audio_id>           # preview only
    python align_timestamps.py <audio_id> --apply   # write to DB + clear clip cache
"""

import sys
import os
import re
import glob
import difflib
import argparse

# Run from backend/ so relative DB path resolves correctly
os.chdir(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import AudioItem, TranscriptSegment

CLIP_CACHE_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "uploads", "cache", "clips")
)


def normalize(text: str) -> str:
    """Lowercase, expand common contractions, strip punctuation."""
    text = text.lower()
    text = text.replace("he's", "he is").replace("she's", "she is")
    text = text.replace("they're", "they are").replace("it's", "it is")
    text = text.replace("isn't", "is not").replace("aren't", "are not")
    text = text.replace("i'm", "i am").replace("we're", "we are")
    text = re.sub(r"[^\w\s]", "", text)
    return text.strip()


def words_from_segments(whisper_segments) -> list:
    """Flatten all words from faster-whisper segments into a single list."""
    words = []
    for seg in whisper_segments:
        if seg.words:
            words.extend(seg.words)
    return words


def find_best_match(query_text: str, words: list, window_slack: int = 4):
    """
    Slide a window over `words` to find the span that best matches `query_text`.
    Returns (start_time, end_time, score, matched_text).
    """
    query_norm = normalize(query_text).split()
    query_len = len(query_norm)
    if not query_len or not words:
        return None

    best_score = 0.0
    best_start_time = None
    best_end_time = None
    best_text = ""

    # Try window sizes from query_len-slack to query_len+slack
    for size in range(max(1, query_len - window_slack), query_len + window_slack + 1):
        for i in range(len(words) - size + 1):
            window = words[i : i + size]
            window_text = " ".join(normalize(w.word) for w in window)
            score = difflib.SequenceMatcher(
                None, " ".join(query_norm), window_text
            ).ratio()
            if score > best_score:
                best_score = score
                best_start_time = window[0].start
                best_end_time = window[-1].end
                best_text = window_text

    return best_start_time, best_end_time, best_score, best_text


def clear_clip_cache(audio_id: int, seg_id: int):
    pattern = os.path.join(CLIP_CACHE_DIR, f"seg_{audio_id}_{seg_id}_*.mp3")
    for f in glob.glob(pattern):
        os.remove(f)
        print(f"  deleted cache: {os.path.basename(f)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_id", type=int)
    parser.add_argument("--apply", action="store_true", help="Write changes to DB")
    parser.add_argument(
        "--model", default="base", help="Whisper model size (tiny/base/small)"
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        audio = db.query(AudioItem).filter(AudioItem.id == args.audio_id).first()
        if not audio:
            print(f"Audio {args.audio_id} not found in DB")
            sys.exit(1)

        audio_path = os.path.normpath(
            os.path.join(
                os.path.dirname(__file__), "..", audio.file_path.lstrip("/")
            )
        )
        if not os.path.exists(audio_path):
            print(f"Audio file not found: {audio_path}")
            sys.exit(1)

        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.audio_id == args.audio_id)
            .order_by(TranscriptSegment.segment_index)
            .all()
        )
        if not segments:
            print("No segments found for this audio.")
            sys.exit(1)

        print(f"\nAudio: {audio.title} ({len(segments)} segments)")
        print(f"Model: {args.model}  |  Mode: {'APPLY' if args.apply else 'PREVIEW'}")
        print(f"File:  {audio_path}\n")

        # Run faster-whisper
        print("Running faster-whisper transcription...")
        from faster_whisper import WhisperModel

        model = WhisperModel(args.model, device="cpu", compute_type="int8")
        whisper_segments, _ = model.transcribe(
            audio_path, word_timestamps=True, language="en"
        )
        all_words = words_from_segments(whisper_segments)
        print(f"Got {len(all_words)} words from Whisper.\n")

        # Match each segment
        results = []
        for seg in segments:
            match = find_best_match(seg.text, all_words)
            if match is None:
                print(f"[seg {seg.id}] {seg.speaker}  '{seg.text}' — NO MATCH")
                continue
            new_start, new_end, score, matched = match
            delta_start = new_start - (seg.start_time_seconds or 0)
            print(
                f"[seg {seg.id}] {seg.speaker or '?'}  \"{seg.text}\""
            )
            print(
                f"  SRT:     {seg.start_time_seconds:.3f} → {seg.end_time_seconds:.3f}"
            )
            print(
                f"  Whisper: {new_start:.3f} → {new_end:.3f}  "
                f"(Δstart {delta_start:+.2f}s)  score={score:.2f}"
            )
            print(f"  matched: \"{matched}\"")
            print()
            results.append((seg, new_start, new_end, score))

        if not args.apply:
            print("Preview only — run with --apply to write to DB.")
            return

        # Confirm
        ans = input("Apply changes to DB? [y/N] ").strip().lower()
        if ans != "y":
            print("Aborted.")
            return

        for seg, new_start, new_end, score in results:
            seg.start_time_seconds = new_start
            seg.end_time_seconds = new_end
            clear_clip_cache(args.audio_id, seg.id)

        db.commit()
        print(f"\nUpdated {len(results)} segments.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
