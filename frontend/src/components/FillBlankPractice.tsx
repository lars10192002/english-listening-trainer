import { useState } from 'react';
import type { AudioItem, Question, FillBlankResult } from '../types';
import { submitFillBlank } from '../api/practiceApi';
import AudioPlayer from './AudioPlayer';
import ResultPanel from './ResultPanel';

interface Props {
  audio: AudioItem;
  questions: Question[];
  hidePlayer?: boolean;
}

export default function FillBlankPractice({ audio, questions, hidePlayer = false }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, FillBlankResult>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const audioSrc = `http://localhost:8000${audio.file_path}`;

  const fillBlanks = questions.filter(q => q.question_type === 'fill_blank');

  const handleSubmit = async (q: Question) => {
    const answer = answers[q.id]?.trim() ?? '';
    if (!answer) return;
    setLoading(prev => ({ ...prev, [q.id]: true }));
    try {
      const res = await submitFillBlank({ question_id: q.id, user_answer: answer });
      setResults(prev => ({ ...prev, [q.id]: res }));
    } finally {
      setLoading(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleReset = (qid: number) => {
    setAnswers(prev => ({ ...prev, [qid]: '' }));
    setResults(prev => { const n = { ...prev }; delete n[qid]; return n; });
  };

  if (fillBlanks.length === 0) {
    return <div style={styles.empty}>No fill-in-the-blank questions for this audio. Create some in the Library.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.mode}>Fill-in-the-Blank Mode</span>
        <span style={styles.examBadge}>{audio.exam_type?.toUpperCase()}</span>
      </div>
      <div style={styles.title}>{audio.title || audio.filename}</div>

      {!hidePlayer && (
        <div style={styles.playerWrap}>
          <AudioPlayer src={audioSrc} />
        </div>
      )}

      <div style={styles.questionList}>
        {fillBlanks.map((q, idx) => (
          <div key={q.id} style={styles.questionCard}>
            <div style={styles.qHeader}>
              <span style={styles.qNum}>Q{idx + 1}</span>
              {q.word_limit_type && q.word_limit_type !== 'none' && (
                <span style={styles.limitBadge}>
                  {q.word_limit_type.replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
            </div>
            {q.question_text && <div style={styles.qText}>{q.question_text}</div>}

            {!results[q.id] ? (
              <div style={styles.answerRow}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Your answer…"
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(q); }}
                />
                <button
                  style={styles.submitBtn}
                  onClick={() => handleSubmit(q)}
                  disabled={loading[q.id] || !answers[q.id]?.trim()}
                >
                  {loading[q.id] ? '…' : 'Check'}
                </button>
              </div>
            ) : (
              <>
                <ResultPanel
                  score={results[q.id].score}
                  correctAnswer={results[q.id].correct_answer}
                  userInput={results[q.id].user_answer}
                  mistakes={results[q.id].mistakes}
                  isCorrect={results[q.id].is_correct}
                />
                {q.explanation && (
                  <div style={styles.explanation}><strong>Note:</strong> {q.explanation}</div>
                )}
                <button style={styles.resetBtn} onClick={() => handleReset(q.id)}>Try Again</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', alignItems: 'center', gap: 10 },
  mode: { color: '#a6e3a1', fontWeight: 700, fontSize: 14 },
  examBadge: {
    background: '#313244', color: '#a6adc8', borderRadius: 4,
    padding: '2px 8px', fontSize: 11, fontWeight: 700,
  },
  title: { color: '#cdd6f4', fontSize: 16, fontWeight: 600 },
  playerWrap: { marginBottom: 4 },
  questionList: { display: 'flex', flexDirection: 'column', gap: 16 },
  questionCard: {
    background: '#1e1e2e', border: '1px solid #313244',
    borderRadius: 8, padding: 14,
  },
  qHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  qNum: { color: '#89b4fa', fontWeight: 700, fontSize: 14 },
  limitBadge: {
    background: '#45475a', color: '#f9e2af', borderRadius: 4,
    padding: '2px 6px', fontSize: 10, fontWeight: 700,
  },
  qText: { color: '#cdd6f4', fontSize: 15, marginBottom: 10 },
  answerRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '8px 10px',
    fontSize: 14, fontFamily: 'monospace',
  },
  submitBtn: {
    background: '#a6e3a1', color: '#1e1e2e', border: 'none',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
    fontSize: 13, fontWeight: 700,
  },
  resetBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
    fontSize: 13, marginTop: 8,
  },
  explanation: {
    color: '#a6adc8', fontSize: 13, marginTop: 8,
    background: '#181825', borderRadius: 6, padding: '6px 10px',
  },
  empty: { color: '#6c7086', fontSize: 14, padding: 20 },
};
