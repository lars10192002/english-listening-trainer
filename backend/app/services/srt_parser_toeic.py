import re
import os
from typing import Optional


def _parse_time(timestr: str) -> float:
    h, m, rest = timestr.split(':')
    s, ms = rest.split(',')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def parse_srt(content: str) -> list:
    blocks = re.split(r'\n\n+', content.strip())
    entries = []
    for block in blocks:
        lines = [l.strip() for l in block.strip().split('\n') if l.strip()]
        if len(lines) < 3:
            continue
        try:
            int(lines[0])
            m = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', lines[1])
            if not m:
                continue
            start = _parse_time(m.group(1))
            end = _parse_time(m.group(2))
            text = ' '.join(lines[2:]).strip()
            entries.append({'start': start, 'end': end, 'text': text})
        except (ValueError, IndexError):
            continue
    return entries


def find_srt_for_audio(file_path: str, base_dir: str) -> Optional[str]:
    filename = os.path.basename(file_path)
    base = os.path.splitext(filename)[0]
    textfile_dir = os.path.join(base_dir, 'uploads', 'textfile')
    if not os.path.isdir(textfile_dir):
        return None
    for fname in os.listdir(textfile_dir):
        if fname.lower().endswith('.srt') and os.path.splitext(fname)[0].lower() == base.lower():
            return os.path.join(textfile_dir, fname)
    return None


def extract_part1_sentences(entries: list) -> list:
    """Extract Part 1 A/B/C/D option sentences with timestamps."""
    # Find Part 1 range
    part1_start = None
    part1_end = len(entries)

    for i, e in enumerate(entries):
        t = e['text'].lower()
        if part1_start is None and ('part 1 will begin' in t or 'part one will begin' in t):
            part1_start = i + 1
        elif part1_start is not None and 'part 2' in t and 'direction' in t:
            part1_end = i
            break

    if part1_start is None:
        return []

    option_re = re.compile(r'^([A-D])\.\s+(.+)$', re.IGNORECASE)
    question_re = re.compile(r'Number\s+(\d+)', re.IGNORECASE)

    sentences = []
    current_q = 0
    seg_idx = 0

    for e in entries[part1_start:part1_end]:
        q_match = question_re.search(e['text'])
        opt_match = option_re.match(e['text'])

        if q_match and not opt_match:
            current_q = int(q_match.group(1))
            continue

        if opt_match:
            sentences.append({
                'question_num': current_q,
                'option': opt_match.group(1).upper(),
                'text': opt_match.group(2).strip(),
                'start': e['start'],
                'end': e['end'],
                'segment_index': seg_idx,
            })
            seg_idx += 1

    return sentences
