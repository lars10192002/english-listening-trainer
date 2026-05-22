import os
import re
import fitz  # PyMuPDF

POS_WORDS = {
    'noun', 'verb', 'adjective', 'adverb', 'phrase', 'idiom',
    'expression', 'preposition', 'conjunction', 'pronoun', 'article',
    'exclamation', 'interjection', 'abbreviation',
}

FOOTER_PATTERNS = [
    re.compile(r'^Visit the Online', re.I),
    re.compile(r'^c.{0,3}20\d\d\s+Praxis', re.I),
    re.compile(r'Praxis Language Ltd', re.I),
]

# Normalise ligatures and common OCR artefacts
_LIGATURES = str.maketrans({'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', '©': '©', '’': "'", '‘': "'", '“': '"', '”': '"'})


def _clean(text: str) -> str:
    return text.translate(_LIGATURES)


def _is_footer(line: str) -> bool:
    return any(p.match(line) for p in FOOTER_PATTERNS)


def _parse_vocab(lines: list[str]) -> list[dict]:
    """Parse vocabulary lines into list of {word, pos, definition}."""
    cleaned = [l for l in lines if l and not _is_footer(l)]

    # Find indices where a line is a POS word
    pos_indices = [i for i, l in enumerate(cleaned) if l.lower() in POS_WORDS]

    items = []
    for j, pi in enumerate(pos_indices):
        if pi == 0:
            continue
        word = cleaned[pi - 1]
        pos = cleaned[pi]

        end = pos_indices[j + 1] - 1 if j + 1 < len(pos_indices) else len(cleaned)
        definition = ' '.join(cleaned[pi + 1: end])

        items.append({'word': word, 'pos': pos, 'definition': definition})

    return items


def parse_pdf(pdf_path: str) -> dict:
    doc = fitz.open(pdf_path)
    full_text = _clean('\n'.join(page.get_text() for page in doc))

    # Split into sections
    kv_split = re.split(r'\nKey Vocabulary\n', full_text, maxsplit=1)
    dialogue_raw = kv_split[0]
    rest = kv_split[1] if len(kv_split) > 1 else ''

    sv_split = re.split(r'\nSupplementary Vocabulary\n', rest, maxsplit=1)
    key_vocab_raw = sv_split[0]
    supp_vocab_raw = sv_split[1] if len(sv_split) > 1 else ''

    # Title: first non-empty line
    dialogue_lines = [l.strip() for l in dialogue_raw.splitlines()]
    title = next((l for l in dialogue_lines if l), '')
    dialogue_body_lines = [l for l in dialogue_lines[1:] if l and not _is_footer(l)]
    dialogue = '\n'.join(dialogue_body_lines)

    key_vocab = _parse_vocab([l.strip() for l in key_vocab_raw.splitlines()])
    supp_vocab = _parse_vocab([l.strip() for l in supp_vocab_raw.splitlines()])

    return {
        'title': title,
        'dialogue': dialogue,
        'key_vocabulary': key_vocab,
        'supplementary_vocabulary': supp_vocab,
    }


_SPEAKER_LINE = re.compile(r'^([A-Z]):$')


def _join_lines(lines: list[str]) -> str:
    """Join lines, merging hyphenated line-breaks (PDF layout artefact)."""
    result = ''
    for line in lines:
        if result.endswith('-'):
            result = result[:-1] + line
        elif result:
            result += ' ' + line
        else:
            result = line
    return result


def parse_dialogue_segments(dialogue: str) -> list[dict]:
    """Split dialogue text into per-speaker segments.
    Returns list of {speaker, text, segment_index}.
    """
    lines = [l.strip() for l in dialogue.splitlines() if l.strip()]
    segments = []
    current_speaker: str | None = None
    current_lines: list[str] = []

    for line in lines:
        m = _SPEAKER_LINE.match(line)
        if m:
            if current_speaker is not None and current_lines:
                segments.append({
                    'speaker': current_speaker,
                    'text': _join_lines(current_lines),
                    'segment_index': len(segments),
                })
            current_speaker = m.group(1)
            current_lines = []
        else:
            if current_speaker is not None:
                current_lines.append(line)

    if current_speaker is not None and current_lines:
        segments.append({
            'speaker': current_speaker,
            'text': _join_lines(current_lines),
            'segment_index': len(segments),
        })

    return segments


def find_pdf_for_audio(file_path: str, base_dir: str) -> str | None:
    """Given a relative file_path like /uploads/audio/englishpod/.../file.mp3,
    return the absolute path of the PDF in the same folder, or None."""
    rel = file_path.lstrip('/')
    abs_audio = os.path.join(base_dir, rel)
    folder = os.path.dirname(abs_audio)
    for fname in os.listdir(folder):
        if fname.lower().endswith('.pdf'):
            return os.path.join(folder, fname)
    return None
