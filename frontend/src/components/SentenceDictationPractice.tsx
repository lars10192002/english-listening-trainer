import { useEffect, useRef, useState } from 'react';
import type { AudioItem, TranscriptSegment, DictationResult } from '../types';
import { submitDictation } from '../api/practiceApi';

interface SegmentState {
  input: string;
  result: DictationResult | null;
  loading: boolean;
}

interface Props {
  audio: AudioItem;
  segments: TranscriptSegment[];
}

function groupByQuestion(segments: TranscriptSegment[]): { qNum: number; segs: TranscriptSegment[] }[] {
  const groups: { qNum: number; segs: TranscriptSegment[] }[] = [];
  for (let i = 0; i < segments.length; i += 4) {
    groups.push({ qNum: Math.floor(i / 4) + 1, segs: segments.slice(i, i + 4) });
  }
  return groups;
}

export default function SentenceDictationPractice({ audio, segments }: Props) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [states, setStates] = useState<Record<number, SegmentState>>(() =>
    Object.fromEntries(segments.map(s => [s.id, { input: '', result: null, loading: false }]))
  );
  const [playingId, setPlayingId] = useState<number | null>(null);

  const groups = groupByQuestion(segments);

  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const playSentence = (seg: TranscriptSegment) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const clipUrl = `http://localhost:8000/api/audio/${audio.id}/clip/${seg.id}`;
    const el = new Audio(clipUrl);
    el.playbackRate = speed;
    el.addEventListener('ended', () => {
      setPlayingId(null);
      currentAudioRef.current = null;
    });
    currentAudioRef.current = el;
    setPlayingId(seg.id);
    el.play().catch(() => {});
  };

  const handleCheck = async (seg: TranscriptSegment) => {
    const st = states[seg.id];
    if (!st?.input.trim()) return;
    setStates(prev => ({ ...prev, [seg.id]: { ...prev[seg.id], loading: true } }));
    try {
      const res = await submitDictation({ audio_id: audio.id, segment_id: seg.id, user_input: st.input });
      setStates(prev => ({ ...prev, [seg.id]: { ...prev[seg.id], loading: false, result: res } }));
    } catch {
      setStates(prev => ({ ...prev, [seg.id]: { ...prev[seg.id], loading: false } }));
    }
  };

  const handleReset = (segId: number) => {
    setStates(prev => ({ ...prev, [segId]: { input: '', result: null, loading: false } }));
  };

  const SPEEDS = [0.75, 1.0, 1.25];

  return (
    <div style={styles.container}>
      {/* Speed control */}
      <div style={styles.speedRow}>
        <span style={styles.speedLabel}>Speed:</span>
        {SPEEDS.map(s => (
          <button key={s} style={{ ...styles.speedBtn, ...(speed === s ? styles.speedActive : {}) }}
            onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
      </div>

      {groups.map(({ qNum, segs }) => (
        <div key={qNum} style={styles.questionBlock}>
          <div style={styles.qLabel}>Q{qNum}</div>
          {segs.map(seg => {
            const st = states[seg.id];
            const isPlaying = playingId === seg.id;
            return (
              <div key={seg.id} style={styles.sentenceRow}>
                <div style={styles.optionLabel}>{seg.speaker}</div>

                <button style={{ ...styles.playBtn, ...(isPlaying ? styles.playBtnActive : {}) }}
                  onClick={() => playSentence(seg)}>
                  {isPlaying ? '▶▶' : '▶'}
                </button>

                {!st?.result ? (
                  <>
                    <input
                      style={styles.input}
                      value={st?.input ?? ''}
                      onChange={e => setStates(prev => ({ ...prev, [seg.id]: { ...prev[seg.id], input: e.target.value } }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleCheck(seg); }}
                      placeholder="Type what you hear…"
                      disabled={st?.loading}
                    />
                    <button style={styles.checkBtn} onClick={() => handleCheck(seg)} disabled={st?.loading || !st?.input.trim()}>
                      {st?.loading ? '…' : 'Check'}
                    </button>
                  </>
                ) : (
                  <div style={styles.resultRow}>
                    <span style={{ ...styles.score, color: (st.result.score ?? 0) >= 90 ? '#a6e3a1' : (st.result.score ?? 0) >= 60 ? '#f9e2af' : '#f38ba8' }}>
                      {Math.round(st.result.score ?? 0)}%
                    </span>
                    <div style={styles.resultTexts}>
                      <div style={styles.correctText}>✓ {st.result.correct_answer}</div>
                      {st.result.user_input !== st.result.correct_answer && (
                        <div style={styles.userText}>✗ {st.result.user_input}</div>
                      )}
                    </div>
                    <button style={styles.retryBtn} onClick={() => handleReset(seg.id)}>↺</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  speedRow: { display: 'flex', alignItems: 'center', gap: 6 },
  speedLabel: { color: '#6c7086', fontSize: 12 },
  speedBtn: {
    background: '#313244', color: '#a6adc8', border: '1px solid #45475a',
    borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12,
  },
  speedActive: { background: '#89b4fa', color: '#1e1e2e', borderColor: '#89b4fa', fontWeight: 700 },
  questionBlock: {
    background: '#181825', borderRadius: 8, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  qLabel: { color: '#45475a', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 2 },
  sentenceRow: { display: 'flex', alignItems: 'center', gap: 8 },
  optionLabel: {
    color: '#cba6f7', fontWeight: 700, fontSize: 14,
    width: 18, textAlign: 'center', flexShrink: 0,
  },
  playBtn: {
    background: '#313244', color: '#89b4fa', border: '1px solid #45475a',
    borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 12,
    flexShrink: 0, minWidth: 32,
  },
  playBtnActive: { background: '#89b4fa', color: '#1e1e2e' },
  input: {
    flex: 1, background: '#1e1e2e', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 5,
    padding: '5px 8px', fontSize: 13, fontFamily: 'inherit',
  },
  checkBtn: {
    background: '#a6e3a1', color: '#1e1e2e', border: 'none',
    borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  resultRow: { flex: 1, display: 'flex', alignItems: 'flex-start', gap: 8 },
  score: { fontSize: 13, fontWeight: 700, flexShrink: 0, minWidth: 36 },
  resultTexts: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  correctText: { color: '#a6e3a1', fontSize: 12 },
  userText: { color: '#f38ba8', fontSize: 12 },
  retryBtn: {
    background: 'none', color: '#6c7086', border: 'none',
    cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0,
  },
};
