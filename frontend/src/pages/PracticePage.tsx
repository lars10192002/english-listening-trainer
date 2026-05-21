import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAudio } from '../api/audioApi';
import { getQuestionsByAudio } from '../api/questionApi';
import type { AudioItem, Question } from '../types';
import DictationPractice from '../components/DictationPractice';
import FillBlankPractice from '../components/FillBlankPractice';

type Mode = 'dictation' | 'fill_blank';

export default function PracticePage() {
  const { audioId } = useParams<{ audioId: string }>();
  const navigate = useNavigate();
  const [audio, setAudio] = useState<AudioItem | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<Mode>('dictation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!audioId) return;
    const id = parseInt(audioId);
    Promise.all([getAudio(id), getQuestionsByAudio(id)])
      .then(([a, qs]) => {
        setAudio(a);
        setQuestions(qs);
      })
      .catch(() => setError('Could not load audio.'))
      .finally(() => setLoading(false));
  }, [audioId]);

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (error || !audio) return (
    <div style={styles.loading}>
      <div style={{ color: '#f38ba8' }}>{error || 'Audio not found.'}</div>
      <button style={styles.backBtn} onClick={() => navigate('/library')}>Back to Library</button>
    </div>
  );

  const hasFillBlanks = questions.some(q => q.question_type === 'fill_blank');

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <button style={styles.backBtn} onClick={() => navigate('/library')}>← Library</button>
        <div style={styles.modeRow}>
          <ModeBtn label="Dictation" active={mode === 'dictation'} onClick={() => setMode('dictation')} color="#89b4fa" />
          <ModeBtn
            label={`Fill-in-the-Blank${hasFillBlanks ? '' : ' (no questions)'}`}
            active={mode === 'fill_blank'}
            onClick={() => setMode('fill_blank')}
            color="#a6e3a1"
          />
        </div>
      </div>

      <div style={styles.content}>
        {mode === 'dictation' && <DictationPractice audio={audio} />}
        {mode === 'fill_blank' && <FillBlankPractice audio={audio} questions={questions} />}
      </div>
    </div>
  );
}

function ModeBtn({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      style={{
        background: active ? color : '#313244',
        color: active ? '#1e1e2e' : '#a6adc8',
        border: 'none', borderRadius: 6, padding: '7px 18px',
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 800, margin: '0 auto' },
  topRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  modeRow: { display: 'flex', gap: 8 },
  backBtn: {
    background: '#313244', color: '#a6adc8', border: 'none',
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
  },
  content: {},
  loading: { padding: 40, textAlign: 'center', color: '#a6adc8', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
};
