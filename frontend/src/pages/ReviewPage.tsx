import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReviewRecords } from '../api/practiceApi';
import type { PracticeRecord } from '../types';

const EXAM_TYPES = ['', 'ielts', 'toeic', 'custom', 'business', 'general'];
const MODES = ['', 'dictation', 'fill_blank', 'multiple_choice'];
const MISTAKE_TYPES = ['', 'spelling', 'plural', 'tense', 'article', 'preposition', 'missing_word', 'extra_word', 'wrong_word', 'word_limit'];

export default function ReviewPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [examType, setExamType] = useState('');
  const [mode, setMode] = useState('');
  const [mistakeType, setMistakeType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [examType, mode, mistakeType]);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (examType) params.exam_type = examType;
      if (mode) params.mode = mode;
      if (mistakeType) params.mistake_type = mistakeType;
      const data = await getReviewRecords(params);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s?: number) => {
    if (s == null) return '#a6adc8';
    if (s >= 90) return '#a6e3a1';
    if (s >= 70) return '#f9e2af';
    return '#f38ba8';
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Review</h1>

      <div style={styles.filters}>
        <FilterSelect label="Exam Type" value={examType} onChange={setExamType} options={EXAM_TYPES} />
        <FilterSelect label="Mode" value={mode} onChange={setMode} options={MODES} />
        <FilterSelect label="Mistake Type" value={mistakeType} onChange={setMistakeType} options={MISTAKE_TYPES} />
      </div>

      {loading && <div style={styles.loading}>Loading…</div>}

      {!loading && records.length === 0 && (
        <div style={styles.empty}>No records found. Start practicing to build your history.</div>
      )}

      <div style={styles.list}>
        {records.map(r => (
          <div key={r.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.cardLeft}>
                <span style={styles.modeBadge}>{r.mode}</span>
                {r.audio && (
                  <span style={styles.audioTitle}>{r.audio.title || r.audio.filename}</span>
                )}
                {r.audio && (
                  <span style={styles.examBadge}>{r.audio.exam_type?.toUpperCase()}</span>
                )}
              </div>
              <div style={styles.cardRight}>
                <span style={{ ...styles.score, color: scoreColor(r.score) }}>
                  {r.score != null ? `${r.score}%` : '—'}
                </span>
                <span style={styles.date}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
              </div>
            </div>

            {r.user_input && (
              <div style={styles.answerRow}>
                <span style={styles.label}>Your answer:</span>
                <span style={styles.answer}>{r.user_input}</span>
              </div>
            )}
            {r.correct_answer && (
              <div style={styles.answerRow}>
                <span style={styles.label}>Correct:</span>
                <span style={{ ...styles.answer, color: '#a6e3a1' }}>{r.correct_answer}</span>
              </div>
            )}

            {r.mistakes.length > 0 && (
              <div style={styles.mistakes}>
                {r.mistakes.map((m, i) => (
                  <span key={i} style={styles.mistakeTag}>{m.mistake_type}</span>
                ))}
              </div>
            )}

            {r.audio && (
              <button style={styles.retryBtn} onClick={() => navigate(`/practice/${r.audio_id}`)}>
                Practice Again
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 4 }}>{label}</label>
      <select style={styles.select} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
      </select>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 900, margin: '0 auto' },
  h1: { color: '#cdd6f4', fontSize: 24, fontWeight: 700, marginBottom: 20 },
  filters: { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  select: {
    background: '#1e1e2e', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '6px 10px', fontSize: 13,
  },
  loading: { color: '#a6adc8', padding: 20 },
  empty: { color: '#6c7086', padding: 20 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: '#1e1e2e', border: '1px solid #313244',
    borderRadius: 10, padding: '12px 16px',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  cardRight: { display: 'flex', alignItems: 'center', gap: 12 },
  modeBadge: {
    background: '#313244', color: '#89b4fa', borderRadius: 4,
    padding: '2px 8px', fontSize: 11, fontWeight: 700,
  },
  audioTitle: { color: '#cdd6f4', fontSize: 14 },
  examBadge: {
    background: '#45475a', color: '#a6adc8', borderRadius: 4,
    padding: '2px 6px', fontSize: 11,
  },
  score: { fontSize: 18, fontWeight: 700 },
  date: { color: '#6c7086', fontSize: 12 },
  answerRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  label: { color: '#6c7086', fontSize: 12, minWidth: 90, flexShrink: 0 },
  answer: { color: '#cdd6f4', fontSize: 13, fontFamily: 'monospace' },
  mistakes: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  mistakeTag: {
    background: '#45475a', color: '#f9e2af',
    borderRadius: 4, padding: '2px 8px', fontSize: 11,
  },
  retryBtn: {
    marginTop: 10, background: 'transparent', color: '#89b4fa',
    border: '1px solid #45475a', borderRadius: 6, padding: '5px 14px',
    cursor: 'pointer', fontSize: 12,
  },
};
