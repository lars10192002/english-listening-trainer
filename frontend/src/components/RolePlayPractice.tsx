import { useState } from 'react';
import type { AudioItem, TranscriptSegment, RolePlayLineResult } from '../types';
import { submitRolePlay } from '../api/practiceApi';

interface Props {
  audio: AudioItem;
  segments: TranscriptSegment[];
}

const scoreColor = (score: number) =>
  score >= 90 ? '#a6e3a1' : score >= 70 ? '#f9e2af' : '#f38ba8';

export default function RolePlayPractice({ audio, segments }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [lineResults, setLineResults] = useState<Record<number, RolePlayLineResult>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recheckingLines, setRecheckingLines] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const speakers = [...new Set(segments.map(s => s.speaker).filter(Boolean))].sort() as string[];
  const mySegments = segments.filter(s => s.speaker === role);

  const totalScore = () => {
    const scored = Object.values(lineResults);
    if (!scored.length) return null;
    return Math.round(scored.reduce((acc, r) => acc + r.score, 0) / scored.length * 10) / 10;
  };

  const handleSubmitAll = async () => {
    if (!role) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitRolePlay({
        audio_id: audio.id,
        role,
        answers: mySegments.map(s => ({ segment_id: s.id, user_input: answers[s.id] ?? '' })),
      });
      const map: Record<number, RolePlayLineResult> = {};
      for (const r of res.results) map[r.segment_id] = r;
      setLineResults(map);
      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheckLine = async (segId: number) => {
    if (!role) return;
    setRecheckingLines(prev => new Set(prev).add(segId));
    try {
      const res = await submitRolePlay({
        audio_id: audio.id,
        role,
        answers: [{ segment_id: segId, user_input: answers[segId] ?? '' }],
      });
      if (res.results[0]) {
        setLineResults(prev => ({ ...prev, [segId]: res.results[0] }));
      }
    } catch {
      setError('Re-check failed.');
    } finally {
      setRecheckingLines(prev => { const s = new Set(prev); s.delete(segId); return s; });
    }
  };

  if (!role) {
    return (
      <div style={styles.roleSelect}>
        <div style={styles.hint}>Pick the role you want to practice:</div>
        <div style={styles.roleBtns}>
          {speakers.map(s => (
            <button key={s} style={styles.roleBtn} onClick={() => setRole(s)}>{s}</button>
          ))}
        </div>
      </div>
    );
  }

  const total = totalScore();

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.playingAs}>
          Playing as: <span style={styles.roleTag}>{role}</span>
        </div>
        {total !== null && (
          <div style={styles.totalScore}>
            Total: <span style={{ color: scoreColor(total) }}>{total}%</span>
          </div>
        )}
        <button style={styles.switchBtn} onClick={() => {
          setRole(null); setAnswers({}); setLineResults({}); setSubmitted(false);
        }}>
          Switch Role
        </button>
      </div>

      <div style={styles.dialogue}>
        {segments.map(seg => {
          const isMyLine = seg.speaker === role;
          const result = lineResults[seg.id];
          const isRechecking = recheckingLines.has(seg.id);

          return (
            <div key={seg.id} style={{ ...styles.line, ...(isMyLine ? styles.myLine : {}) }}>
              <span style={{ ...styles.speaker, color: isMyLine ? '#89b4fa' : '#585b70' }}>
                {seg.speaker}
              </span>

              {isMyLine ? (
                <div style={styles.inputWrapper}>
                  <div style={styles.inputRow}>
                    <textarea
                      style={styles.textarea}
                      rows={2}
                      placeholder="Type what you hear…"
                      value={answers[seg.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [seg.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitAll(); }
                      }}
                    />
                    {submitted && (
                      <button
                        style={styles.recheckBtn}
                        disabled={isRechecking}
                        onClick={() => handleRecheckLine(seg.id)}
                        title="Re-check this line"
                      >
                        {isRechecking ? '…' : '↺'}
                      </button>
                    )}
                  </div>

                  {result && (
                    <div style={styles.resultBlock}>
                      <div style={styles.resultRow}>
                        <span style={{ ...styles.scoreBadge, background: scoreColor(result.score) }}>
                          {result.score}%
                        </span>
                        {result.score < 100 && (
                          <span style={styles.correctText}>{result.correct_answer}</span>
                        )}
                      </div>
                      {result.mistakes.length > 0 && (
                        <div style={styles.mistakeTags}>
                          {result.mistakes.map((m, i) => (
                            <span key={i} style={styles.mistakeTag}>{m.mistake_type}</span>
                          ))}
                        </div>
                      )}
                    </div>
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
        <button style={styles.submitBtn} onClick={handleSubmitAll} disabled={submitting}>
          {submitting ? 'Submitting…' : submitted ? 'Re-submit All' : 'Submit'}
        </button>
        {submitted && (
          <button style={styles.resetBtn} onClick={() => {
            setAnswers({}); setLineResults({}); setSubmitted(false);
          }}>
            Clear
          </button>
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
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
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
  dialogue: { display: 'flex', flexDirection: 'column', gap: 8 },
  line: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' },
  myLine: {
    background: '#181825', borderRadius: 8, padding: '8px 10px',
    border: '1px solid #313244',
  },
  speaker: { fontWeight: 700, fontSize: 13, minWidth: 20, flexShrink: 0, paddingTop: 6 },
  contextText: { color: '#585b70', fontSize: 13, lineHeight: 1.6, flex: 1 },
  inputWrapper: { flex: 1 },
  inputRow: { display: 'flex', gap: 6, alignItems: 'flex-start' },
  textarea: {
    flex: 1, background: '#11111b', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '6px 8px',
    fontSize: 13, lineHeight: 1.5, resize: 'vertical',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },
  recheckBtn: {
    background: '#313244', color: '#89b4fa', border: '1px solid #45475a',
    borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
    fontSize: 14, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1,
  },
  resultBlock: { marginTop: 6 },
  resultRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  scoreBadge: {
    borderRadius: 4, padding: '1px 7px', fontSize: 11,
    fontWeight: 700, color: '#1e1e2e', flexShrink: 0,
  },
  correctText: { color: '#a6e3a1', fontSize: 12, fontStyle: 'italic' },
  mistakeTags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  mistakeTag: {
    background: '#45475a', color: '#f9e2af',
    borderRadius: 4, padding: '1px 6px', fontSize: 10,
  },
  error: { color: '#f38ba8', fontSize: 13, margin: '8px 0' },
  actions: { marginTop: 16, display: 'flex', gap: 10 },
  submitBtn: {
    background: '#89b4fa', color: '#1e1e2e', border: 'none',
    borderRadius: 6, padding: '8px 24px', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  },
  resetBtn: {
    background: '#313244', color: '#a6adc8', border: 'none',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
  },
};
