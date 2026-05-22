import { useState } from 'react';
import type { AudioItem, TranscriptSegment, RolePlayResult } from '../types';
import { submitRolePlay } from '../api/practiceApi';

interface Props {
  audio: AudioItem;
  segments: TranscriptSegment[];
}

export default function RolePlayPractice({ audio, segments }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<RolePlayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const speakers = [...new Set(segments.map(s => s.speaker).filter(Boolean))].sort() as string[];

  const handleSubmit = async () => {
    if (!role) return;
    const mySegments = segments.filter(s => s.speaker === role);
    const answerList = mySegments.map(s => ({
      segment_id: s.id,
      user_input: answers[s.id] ?? '',
    }));
    setLoading(true);
    setError('');
    try {
      const res = await submitRolePlay({ audio_id: audio.id, role, answers: answerList });
      setResults(res);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setAnswers({});
  };

  if (!role) {
    return (
      <div style={styles.roleSelect}>
        <div style={styles.hint}>Pick the role you want to practice:</div>
        <div style={styles.roleBtns}>
          {speakers.map(s => (
            <button key={s} style={styles.roleBtn} onClick={() => setRole(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const resultMap = new Map(results?.results.map(r => [r.segment_id, r]));
  const scoreColor = (score: number) =>
    score >= 90 ? '#a6e3a1' : score >= 70 ? '#f9e2af' : '#f38ba8';

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.playingAs}>
          Playing as: <span style={styles.roleTag}>{role}</span>
        </div>
        {results && (
          <div style={styles.totalScore}>
            Total: <span style={{ color: scoreColor(results.total_score) }}>{results.total_score}%</span>
          </div>
        )}
        <button style={styles.switchBtn} onClick={() => { setRole(null); handleReset(); }}>
          Switch Role
        </button>
      </div>

      <div style={styles.dialogue}>
        {segments.map(seg => {
          const isMyLine = seg.speaker === role;
          const result = resultMap.get(seg.id);

          return (
            <div key={seg.id} style={{ ...styles.line, ...(isMyLine ? styles.myLine : {}) }}>
              <span style={{ ...styles.speaker, color: isMyLine ? '#89b4fa' : '#6c7086' }}>
                {seg.speaker}
              </span>

              {isMyLine ? (
                <div style={styles.inputWrapper}>
                  {results ? (
                    <>
                      <div style={styles.submittedInput}>{answers[seg.id] || <em style={{ color: '#45475a' }}>—</em>}</div>
                      {result && (
                        <div style={styles.resultRow}>
                          <span style={{ ...styles.scoreBadge, background: scoreColor(result.score) }}>
                            {result.score}%
                          </span>
                          {result.score < 100 && (
                            <span style={styles.correctText}>{result.correct_answer}</span>
                          )}
                        </div>
                      )}
                      {result && result.mistakes.length > 0 && (
                        <div style={styles.mistakeTags}>
                          {result.mistakes.map((m, i) => (
                            <span key={i} style={styles.mistakeTag}>{m.mistake_type}</span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <textarea
                      style={styles.textarea}
                      rows={2}
                      placeholder="Type what you hear…"
                      value={answers[seg.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [seg.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    />
                  )}
                </div>
              ) : (
                <span style={styles.contextText}>{seg.text}</span>
              )}
            </div>
          );
        })}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        {!results ? (
          <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        ) : (
          <button style={styles.resetBtn} onClick={handleReset}>Try Again</button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  roleSelect: { padding: '12px 0' },
  hint: { color: '#a6adc8', fontSize: 13, marginBottom: 12 },
  roleBtns: { display: 'flex', gap: 10 },
  roleBtn: {
    background: '#313244', color: '#89b4fa', border: '1px solid #45475a',
    borderRadius: 8, padding: '10px 28px', cursor: 'pointer',
    fontSize: 18, fontWeight: 700,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  playingAs: { color: '#a6adc8', fontSize: 13, flex: 1 },
  roleTag: {
    background: '#313244', color: '#89b4fa',
    borderRadius: 4, padding: '1px 8px', fontWeight: 700,
  },
  totalScore: { color: '#cdd6f4', fontSize: 15, fontWeight: 700 },
  switchBtn: {
    background: 'transparent', color: '#6c7086', border: '1px solid #45475a',
    borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
  },
  dialogue: { display: 'flex', flexDirection: 'column', gap: 10 },
  line: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '6px 0',
  },
  myLine: {
    background: '#181825', borderRadius: 8, padding: '8px 10px',
    border: '1px solid #313244',
  },
  speaker: {
    fontWeight: 700, fontSize: 13, minWidth: 20, flexShrink: 0, paddingTop: 4,
  },
  contextText: {
    color: '#6c7086', fontSize: 13, lineHeight: 1.6, flex: 1,
  },
  inputWrapper: { flex: 1 },
  textarea: {
    width: '100%', background: '#11111b', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '6px 8px',
    fontSize: 13, lineHeight: 1.5, resize: 'vertical',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },
  submittedInput: {
    color: '#cdd6f4', fontSize: 13, lineHeight: 1.6, marginBottom: 4,
  },
  resultRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  scoreBadge: {
    borderRadius: 4, padding: '1px 7px', fontSize: 11,
    fontWeight: 700, color: '#1e1e2e', flexShrink: 0,
  },
  correctText: {
    color: '#a6e3a1', fontSize: 12, fontStyle: 'italic',
  },
  mistakeTags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  mistakeTag: {
    background: '#45475a', color: '#f9e2af',
    borderRadius: 4, padding: '1px 6px', fontSize: 10,
  },
  error: { color: '#f38ba8', fontSize: 13, margin: '8px 0' },
  actions: { marginTop: 16 },
  submitBtn: {
    background: '#89b4fa', color: '#1e1e2e', border: 'none',
    borderRadius: 6, padding: '8px 24px', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  },
  resetBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontSize: 13,
  },
};
