import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAudio, getPdfContent } from '../api/audioApi';
import { getQuestionsByAudio } from '../api/questionApi';
import { getSegmentsByAudio } from '../api/transcriptApi';
import type { AudioItem, Question, PdfContent, VocabItem, TranscriptSegment } from '../types';
import AudioPlayer from '../components/AudioPlayer';
import DictationPractice from '../components/DictationPractice';
import FillBlankPractice from '../components/FillBlankPractice';
import RolePlayPractice from '../components/RolePlayPractice';

type Mode = 'dictation' | 'fill_blank' | 'role_play';

export default function PracticePage() {
  const { audioId } = useParams<{ audioId: string }>();
  const navigate = useNavigate();
  const [audio, setAudio] = useState<AudioItem | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<Mode>('dictation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfContent, setPdfContent] = useState<PdfContent | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  useEffect(() => {
    if (!audioId) return;
    const id = parseInt(audioId);
    Promise.all([getAudio(id), getQuestionsByAudio(id)])
      .then(([a, qs]) => {
        setAudio(a);
        setQuestions(qs);
        getPdfContent(id).then(pdf => setPdfContent(pdf)).catch(() => {});
        getSegmentsByAudio(id).then(segs => setSegments(segs)).catch(() => {});
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
  const audioSrc = `http://localhost:8000${audio.file_path}`;

  const epTrack = audio.filename.match(/^englishpod_[A-Z]\d+(pb|rv)\.mp3$/i)?.[1];
  const showPdf = pdfContent && !epTrack;
  const hasSegments = segments.length > 0;

  const allVocab: VocabItem[] = showPdf
    ? [...pdfContent.key_vocabulary, ...pdfContent.supplementary_vocabulary]
    : [];

  return (
    <div style={styles.page}>
      {/* Top nav */}
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
          {hasSegments && (
            <ModeBtn label="Role Play" active={mode === 'role_play'} onClick={() => setMode('role_play')} color="#cba6f7" />
          )}
        </div>
      </div>

      {/* 1. Play block */}
      <section style={styles.block}>
        <div style={styles.blockLabel}>PLAY</div>
        <AudioPlayer src={audioSrc} />
      </section>

      {/* 2. Type block */}
      <section style={styles.block}>
        <div style={styles.blockLabel}>PRACTICE</div>
        {mode === 'dictation' && <DictationPractice audio={audio} hidePlayer />}
        {mode === 'fill_blank' && <FillBlankPractice audio={audio} questions={questions} hidePlayer />}
        {mode === 'role_play' && <RolePlayPractice audio={audio} segments={segments} />}
      </section>

      {/* 3. Dialogue block */}
      {showPdf && (
        <section style={styles.block}>
          <div style={styles.blockLabel}>DIALOGUE</div>
          {pdfContent.title && <div style={styles.pdfTitle}>{pdfContent.title}</div>}
          <div style={styles.dialogue}>
            {pdfContent.dialogue || <em style={{ color: '#45475a' }}>No dialogue found</em>}
          </div>
        </section>
      )}

      {/* 4. Vocab block */}
      {allVocab.length > 0 && (
        <section style={styles.block}>
          <div style={styles.blockLabel}>VOCABULARY ({allVocab.length})</div>
          <div style={styles.vocabGrid}>
            {allVocab.map((v, i) => (
              <div key={i} style={styles.vocabCard}>
                <div style={styles.vocabWord}>{v.word}</div>
                <div style={styles.vocabPos}>{v.pos}</div>
                <div style={styles.vocabDef}>{v.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}
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
  page: { padding: 24, maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  topRow: { display: 'flex', alignItems: 'center', gap: 16 },
  modeRow: { display: 'flex', gap: 8 },
  backBtn: {
    background: '#313244', color: '#a6adc8', border: 'none',
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
  },
  block: {
    background: '#1e1e2e', border: '1px solid #313244',
    borderRadius: 10, padding: '16px 18px',
  },
  blockLabel: {
    color: '#45475a', fontSize: 10, fontWeight: 700,
    letterSpacing: 1.5, marginBottom: 12,
  },
  pdfTitle: {
    color: '#89b4fa', fontSize: 13, fontWeight: 600, marginBottom: 8,
  },
  dialogue: {
    color: '#a6adc8', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.8,
    maxHeight: 320, overflowY: 'auto',
  },
  vocabGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  vocabCard: {
    background: '#181825', borderRadius: 8, padding: '10px 12px',
  },
  vocabWord: { color: '#cdd6f4', fontWeight: 700, fontSize: 13, marginBottom: 2 },
  vocabPos: { color: '#cba6f7', fontSize: 11, marginBottom: 4 },
  vocabDef: { color: '#a6adc8', fontSize: 12, lineHeight: 1.4 },
  loading: {
    padding: 40, textAlign: 'center', color: '#a6adc8',
    display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
  },
};
