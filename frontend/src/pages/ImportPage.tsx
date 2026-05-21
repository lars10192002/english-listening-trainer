import { useState, useRef } from 'react';
import { uploadAudio } from '../api/audioApi';
import { createTranscript } from '../api/transcriptApi';
import type { AudioItem } from '../types';
import { useNavigate } from 'react-router-dom';

const EXAM_TYPES = ['custom', 'ielts', 'toeic', 'business', 'general'];
const DIFFICULTIES = ['', 'easy', 'medium', 'hard'];
const ACCENTS = ['', 'american', 'british', 'australian', 'canadian', 'mixed', 'unknown'];

export default function ImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [examType, setExamType] = useState('custom');
  const [title, setTitle] = useState('');
  const [ieltsSec, setIeltsSec] = useState('');
  const [toeicPart, setToeicPart] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [accent, setAccent] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<AudioItem | null>(null);

  const handleSubmit = async () => {
    if (!file) { setError('Please select an audio file.'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('exam_type', examType);
      if (title) fd.append('title', title);
      if (ieltsSec) fd.append('ielts_section', ieltsSec);
      if (toeicPart) fd.append('toeic_part', toeicPart);
      if (topic) fd.append('topic', topic);
      if (difficulty) fd.append('difficulty', difficulty);
      if (accent) fd.append('speaker_accent', accent);

      const audio = await uploadAudio(fd);
      setUploaded(audio);

      if (transcript.trim()) {
        await createTranscript({ audio_id: audio.id, content: transcript.trim() });
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (uploaded) {
    return (
      <div style={styles.page}>
        <div style={styles.success}>
          <div style={styles.successTitle}>✓ Uploaded successfully!</div>
          <div style={styles.successName}>{uploaded.title || uploaded.filename}</div>
          <div style={styles.btnRow}>
            <button style={styles.primaryBtn} onClick={() => navigate(`/practice/${uploaded.id}`)}>Start Practice</button>
            <button style={styles.secondaryBtn} onClick={() => { setUploaded(null); setFile(null); setTranscript(''); }}>Import Another</button>
            <button style={styles.secondaryBtn} onClick={() => navigate('/library')}>Go to Library</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Import Audio</h1>

      <div style={styles.form}>
        <Field label="Audio File *">
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,.flac"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={styles.fileRow}>
            <button style={styles.fileBtn} onClick={() => fileRef.current?.click()}>Choose File</button>
            <span style={styles.fileName}>{file?.name ?? 'No file selected'}</span>
          </div>
        </Field>

        <Field label="Title">
          <input style={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional title" />
        </Field>

        <Field label="Exam Type">
          <div style={styles.radioRow}>
            {EXAM_TYPES.map(t => (
              <label key={t} style={styles.radioLabel}>
                <input type="radio" value={t} checked={examType === t} onChange={() => setExamType(t)} />
                {t.toUpperCase()}
              </label>
            ))}
          </div>
        </Field>

        {examType === 'ielts' && (
          <Field label="IELTS Section">
            <div style={styles.radioRow}>
              {[1, 2, 3, 4].map(n => (
                <label key={n} style={styles.radioLabel}>
                  <input type="radio" value={n} checked={ieltsSec === String(n)} onChange={() => setIeltsSec(String(n))} />
                  Section {n}
                </label>
              ))}
            </div>
          </Field>
        )}

        {examType === 'toeic' && (
          <Field label="TOEIC Part">
            <div style={styles.radioRow}>
              {[1, 2, 3, 4].map(n => (
                <label key={n} style={styles.radioLabel}>
                  <input type="radio" value={n} checked={toeicPart === String(n)} onChange={() => setToeicPart(String(n))} />
                  Part {n}
                </label>
              ))}
            </div>
          </Field>
        )}

        <div style={styles.row2}>
          <Field label="Topic">
            <input style={styles.input} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. office, travel" />
          </Field>
          <Field label="Difficulty">
            <select style={styles.select} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d || '— select —'}</option>)}
            </select>
          </Field>
          <Field label="Speaker Accent">
            <select style={styles.select} value={accent} onChange={e => setAccent(e.target.value)}>
              {ACCENTS.map(a => <option key={a} value={a}>{a || '— select —'}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Transcript (optional)">
          <textarea
            style={styles.textarea}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Paste the transcript here..."
            rows={6}
          />
        </Field>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={loading || !file}>
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: '#a6adc8', fontSize: 13, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 700, margin: '0 auto' },
  h1: { color: '#cdd6f4', fontSize: 24, fontWeight: 700, marginBottom: 24 },
  form: { background: '#1e1e2e', border: '1px solid #313244', borderRadius: 10, padding: 24 },
  input: {
    width: '100%', background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '8px 10px',
    fontSize: 14, boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '8px 10px', fontSize: 14,
  },
  textarea: {
    width: '100%', background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '8px 10px',
    fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  radioRow: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  radioLabel: { color: '#cdd6f4', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  fileRow: { display: 'flex', alignItems: 'center', gap: 10 },
  fileBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13,
  },
  fileName: { color: '#a6adc8', fontSize: 13 },
  error: { color: '#f38ba8', fontSize: 13, marginBottom: 12 },
  primaryBtn: {
    background: '#89b4fa', color: '#1e1e2e', border: 'none',
    borderRadius: 6, padding: '10px 24px', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  },
  secondaryBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '10px 20px', cursor: 'pointer', fontSize: 14,
  },
  success: {
    background: '#1e1e2e', border: '1px solid #a6e3a1', borderRadius: 10,
    padding: 32, textAlign: 'center',
  },
  successTitle: { color: '#a6e3a1', fontSize: 20, fontWeight: 700, marginBottom: 8 },
  successName: { color: '#cdd6f4', fontSize: 16, marginBottom: 24 },
  btnRow: { display: 'flex', gap: 12, justifyContent: 'center' },
};
