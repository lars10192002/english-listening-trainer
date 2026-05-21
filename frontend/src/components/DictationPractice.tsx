import { useState } from 'react';
import type { AudioItem, DictationResult } from '../types';
import { submitDictation } from '../api/practiceApi';
import AudioPlayer from './AudioPlayer';
import ResultPanel from './ResultPanel';

interface Props {
  audio: AudioItem;
}

export default function DictationPractice({ audio }: Props) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<DictationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const audioSrc = `http://localhost:8000${audio.file_path}`;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await submitDictation({ audio_id: audio.id, user_input: input });
      setResult(res);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Submission failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setResult(null);
    setError('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.mode}>Dictation Mode</span>
        <span style={styles.examBadge}>{audio.exam_type?.toUpperCase()}</span>
      </div>

      <div style={styles.title}>{audio.title || audio.filename}</div>

      <div style={styles.playerWrap}>
        <AudioPlayer src={audioSrc} />
      </div>

      {!result ? (
        <>
          <div style={styles.label}>Type what you hear:</div>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type the full sentence(s) you hear..."
            rows={4}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
            }}
          />
          <div style={styles.hint}>Ctrl+Enter to submit</div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading || !input.trim()}>
            {loading ? 'Checking…' : 'Submit Answer'}
          </button>
        </>
      ) : (
        <>
          <ResultPanel
            score={result.score}
            correctAnswer={result.correct_answer}
            userInput={result.user_input}
            mistakes={result.mistakes}
          />
          <button style={styles.resetBtn} onClick={handleReset}>Try Again</button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', alignItems: 'center', gap: 10 },
  mode: { color: '#89b4fa', fontWeight: 700, fontSize: 14 },
  examBadge: {
    background: '#313244', color: '#a6adc8', borderRadius: 4,
    padding: '2px 8px', fontSize: 11, fontWeight: 700,
  },
  title: { color: '#cdd6f4', fontSize: 16, fontWeight: 600 },
  playerWrap: { marginBottom: 4 },
  label: { color: '#a6adc8', fontSize: 13, marginBottom: 4 },
  textarea: {
    width: '100%', background: '#1e1e2e', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: 10,
    fontSize: 15, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
  },
  hint: { color: '#6c7086', fontSize: 11 },
  error: { color: '#f38ba8', fontSize: 13 },
  submitBtn: {
    background: '#89b4fa', color: '#1e1e2e', border: 'none',
    borderRadius: 6, padding: '10px 24px', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, alignSelf: 'flex-start',
  },
  resetBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '8px 20px', cursor: 'pointer',
    fontSize: 14, marginTop: 8, alignSelf: 'flex-start',
  },
};
