import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAudio, deleteAudio, getPdfContent } from '../api/audioApi';
import { getTranscriptsByAudio, createTranscript, updateTranscript } from '../api/transcriptApi';
import { getQuestionsByAudio, createQuestion, deleteQuestion } from '../api/questionApi';
import type { AudioItem, Transcript, Question, PdfContent, VocabItem } from '../types';

const EXAM_TYPES = ['', 'ielts', 'toeic', 'custom', 'business', 'general'];

// englishpod_B0001dg.mp3 → episode "0001", track "dg"
const EP_PATTERN = /^englishpod_[A-Z](\d+)(dg|pb|rv)\.mp3$/i;
const TRACK_LABEL: Record<string, string> = { dg: 'Dialogue', pb: 'Phrasebook', rv: 'Review' };
const TRACK_COLOR: Record<string, string> = { dg: '#89b4fa', pb: '#a6e3a1', rv: '#cba6f7' };

interface EpisodeGroup {
  ep: string;       // "0001"
  tracks: Partial<Record<'dg' | 'pb' | 'rv', AudioItem>>;
}

function groupEnglishpod(items: AudioItem[]): { groups: EpisodeGroup[]; others: AudioItem[] } {
  const map = new Map<string, Partial<Record<'dg' | 'pb' | 'rv', AudioItem>>>();
  const others: AudioItem[] = [];

  for (const item of items) {
    const m = item.filename.match(EP_PATTERN);
    if (m) {
      const ep = m[1];
      const track = m[2] as 'dg' | 'pb' | 'rv';
      if (!map.has(ep)) map.set(ep, {});
      map.get(ep)![track] = item;
    } else {
      others.push(item);
    }
  }

  const groups = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ep, tracks]) => ({ ep, tracks }));

  return { groups, others };
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AudioItem[]>([]);
  const [filterExam, setFilterExam] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [transcripts, setTranscripts] = useState<Record<number, Transcript[]>>({});
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [newTranscript, setNewTranscript] = useState('');
  const [addingTranscript, setAddingTranscript] = useState<number | null>(null);
  const [addingQuestion, setAddingQuestion] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState({ question_text: '', correct_answer: '', word_limit_type: 'none', explanation: '' });
  const [pdfData, setPdfData] = useState<Record<number, PdfContent>>({});
  const [pdfOpenEp, setPdfOpenEp] = useState<string | null>(null);

  useEffect(() => { load(); }, [filterExam]);

  const load = async () => {
    const params = filterExam ? { exam_type: filterExam } : undefined;
    const data = await listAudio(params);
    setItems(data);
  };

  const expand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!transcripts[id]) {
      const ts = await getTranscriptsByAudio(id);
      setTranscripts(prev => ({ ...prev, [id]: ts }));
    }
    if (!questions[id]) {
      const qs = await getQuestionsByAudio(id);
      setQuestions(prev => ({ ...prev, [id]: qs }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this audio and all associated data?')) return;
    await deleteAudio(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAddTranscript = async (audioId: number) => {
    if (!newTranscript.trim()) return;
    const ts = await createTranscript({ audio_id: audioId, content: newTranscript.trim() });
    setTranscripts(prev => ({ ...prev, [audioId]: [...(prev[audioId] ?? []), ts] }));
    setNewTranscript('');
    setAddingTranscript(null);
  };

  const handleUpdateTranscript = async (audioId: number, t: Transcript, newContent: string) => {
    const updated = await updateTranscript(t.id, { audio_id: audioId, content: newContent });
    setTranscripts(prev => ({
      ...prev,
      [audioId]: prev[audioId].map(x => x.id === updated.id ? updated : x),
    }));
  };

  const handleAddQuestion = async (audioId: number) => {
    if (!newQuestion.correct_answer.trim()) return;
    const q = await createQuestion({ audio_id: audioId, question_type: 'fill_blank', ...newQuestion });
    setQuestions(prev => ({ ...prev, [audioId]: [...(prev[audioId] ?? []), q] }));
    setNewQuestion({ question_text: '', correct_answer: '', word_limit_type: 'none', explanation: '' });
    setAddingQuestion(null);
  };

  const handleStudyEp = async (ep: string, dgItem: AudioItem) => {
    if (pdfOpenEp === ep) { setPdfOpenEp(null); return; }
    setPdfOpenEp(ep);
    if (!pdfData[dgItem.id]) {
      try {
        const data = await getPdfContent(dgItem.id);
        setPdfData(prev => ({ ...prev, [dgItem.id]: data }));
      } catch { /* no PDF available */ }
    }
  };

  const handleDeleteQuestion = async (audioId: number, qid: number) => {
    await deleteQuestion(qid);
    setQuestions(prev => ({ ...prev, [audioId]: prev[audioId].filter(q => q.id !== qid) }));
  };

  const examBadgeColor: Record<string, string> = {
    ielts: '#89b4fa', toeic: '#a6e3a1', custom: '#cba6f7',
    business: '#f9e2af', general: '#89dceb',
  };

  const { groups, others } = groupEnglishpod(items);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.h1}>Library</h1>
        <select style={styles.select} value={filterExam} onChange={e => setFilterExam(e.target.value)}>
          {EXAM_TYPES.map(t => <option key={t} value={t}>{t ? t.toUpperCase() : 'All Types'}</option>)}
        </select>
      </div>

      {items.length === 0 && (
        <div style={styles.empty}>No audio files yet. <a href="/import" style={{ color: '#89b4fa' }}>Import one.</a></div>
      )}

      {/* EnglishPod grouped section */}
      {groups.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>EnglishPod</span>
            <span style={styles.sectionCount}>{groups.length} episodes</span>
          </div>
          <div style={styles.epGrid}>
            {groups.map(({ ep, tracks }) => (
              <div key={ep} style={styles.epCard}>
                <div style={styles.epTitle}>Ep. {parseInt(ep, 10)}</div>
                <div style={styles.trackList}>
                  {(['dg', 'pb', 'rv'] as const).map(t => {
                    const item = tracks[t];
                    return (
                      <div key={t} style={styles.trackRow}>
                        <span style={{ ...styles.trackBadge, background: TRACK_COLOR[t], color: '#1e1e2e' }}>
                          {TRACK_LABEL[t]}
                        </span>
                        {item ? (
                          <button
                            style={styles.practiceBtn}
                            onClick={() => navigate(`/practice/${item.id}`)}
                          >
                            Practice
                          </button>
                        ) : (
                          <span style={styles.missing}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {tracks.dg && (
                  <button
                    style={{ ...styles.studyBtn, background: pdfOpenEp === ep ? '#313244' : 'transparent' }}
                    onClick={() => handleStudyEp(ep, tracks.dg!)}
                  >
                    {pdfOpenEp === ep ? 'Close' : 'Study PDF'}
                  </button>
                )}
                {pdfOpenEp === ep && tracks.dg && pdfData[tracks.dg.id] && (
                  <PdfPanel content={pdfData[tracks.dg.id]} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other audio files flat list */}
      {others.length > 0 && (
        <div style={styles.section}>
          {groups.length > 0 && (
            <div style={styles.sectionHeader}>
              <span style={styles.sectionLabel}>Other</span>
              <span style={styles.sectionCount}>{others.length} files</span>
            </div>
          )}
          <div style={styles.list}>
            {others.map(item => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardMain}>
                    <span style={{ ...styles.badge, background: examBadgeColor[item.exam_type] ?? '#45475a', color: '#1e1e2e' }}>
                      {item.exam_type?.toUpperCase()}
                    </span>
                    <span style={styles.cardTitle}>{item.title || item.filename}</span>
                    {item.difficulty && <span style={styles.diffBadge}>{item.difficulty}</span>}
                    {item.topic && <span style={styles.topic}>{item.topic}</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.actionBtn} onClick={() => navigate(`/practice/${item.id}`)}>Practice</button>
                    <button style={styles.actionBtn} onClick={() => expand(item.id)}>
                      {expanded === item.id ? 'Collapse' : 'Manage'}
                    </button>
                    <button style={{ ...styles.actionBtn, color: '#f38ba8' }} onClick={() => handleDelete(item.id)}>Delete</button>
                  </div>
                </div>

                {expanded === item.id && (
                  <div style={styles.expanded}>
                    <div style={styles.sectionTitle}>Transcripts</div>
                    {(transcripts[item.id] ?? []).map(t => (
                      <EditableTranscript
                        key={t.id}
                        transcript={t}
                        onSave={newContent => handleUpdateTranscript(item.id, t, newContent)}
                      />
                    ))}
                    {addingTranscript === item.id ? (
                      <div>
                        <textarea
                          style={styles.textarea}
                          rows={4}
                          value={newTranscript}
                          onChange={e => setNewTranscript(e.target.value)}
                          placeholder="Paste transcript content…"
                        />
                        <div style={styles.btnRow}>
                          <button style={styles.saveBtn} onClick={() => handleAddTranscript(item.id)}>Save</button>
                          <button style={styles.cancelBtn} onClick={() => setAddingTranscript(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button style={styles.addBtn} onClick={() => setAddingTranscript(item.id)}>+ Add Transcript</button>
                    )}

                    <div style={{ ...styles.sectionTitle, marginTop: 16 }}>Fill-in-the-Blank Questions</div>
                    {(questions[item.id] ?? []).filter(q => q.question_type === 'fill_blank').map(q => (
                      <div key={q.id} style={styles.questionRow}>
                        <div style={styles.qText}>{q.question_text || <em style={{ color: '#6c7086' }}>No question text</em>}</div>
                        <div style={styles.qAnswer}>Answer: <strong style={{ color: '#a6e3a1' }}>{q.correct_answer}</strong></div>
                        <button style={styles.delBtn} onClick={() => handleDeleteQuestion(item.id, q.id)}>✕</button>
                      </div>
                    ))}
                    {addingQuestion === item.id ? (
                      <div style={styles.newQuestionForm}>
                        <input style={styles.input} placeholder="Question text (optional)"
                          value={newQuestion.question_text}
                          onChange={e => setNewQuestion(p => ({ ...p, question_text: e.target.value }))} />
                        <input style={styles.input} placeholder="Correct answer *"
                          value={newQuestion.correct_answer}
                          onChange={e => setNewQuestion(p => ({ ...p, correct_answer: e.target.value }))} />
                        <select style={styles.select} value={newQuestion.word_limit_type}
                          onChange={e => setNewQuestion(p => ({ ...p, word_limit_type: e.target.value }))}>
                          {['none', 'one_word', 'two_words', 'three_words', 'two_words_or_number'].map(v =>
                            <option key={v} value={v}>{v}</option>
                          )}
                        </select>
                        <input style={styles.input} placeholder="Explanation (optional)"
                          value={newQuestion.explanation}
                          onChange={e => setNewQuestion(p => ({ ...p, explanation: e.target.value }))} />
                        <div style={styles.btnRow}>
                          <button style={styles.saveBtn} onClick={() => handleAddQuestion(item.id)}>Save</button>
                          <button style={styles.cancelBtn} onClick={() => setAddingQuestion(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button style={styles.addBtn} onClick={() => setAddingQuestion(item.id)}>+ Add Question</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PdfPanel({ content }: { content: PdfContent }) {
  const [tab, setTab] = useState<'dialogue' | 'vocab'>('dialogue');
  const allVocab: VocabItem[] = [...content.key_vocabulary, ...content.supplementary_vocabulary];
  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: active ? '#89b4fa' : '#313244',
    color: active ? '#1e1e2e' : '#cdd6f4',
    border: 'none', borderRadius: 4, padding: '3px 10px',
    cursor: 'pointer', fontSize: 11, fontWeight: 700,
  });
  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #313244', paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button style={tabBtn(tab === 'dialogue')} onClick={() => setTab('dialogue')}>Dialogue</button>
        <button style={tabBtn(tab === 'vocab')} onClick={() => setTab('vocab')}>
          Vocab ({allVocab.length})
        </button>
      </div>
      {tab === 'dialogue' && (
        <div style={{ color: '#a6adc8', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', lineHeight: 1.6 }}>
          {content.dialogue || <em style={{ color: '#45475a' }}>No dialogue found</em>}
        </div>
      )}
      {tab === 'vocab' && (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {allVocab.length === 0
            ? <em style={{ color: '#45475a', fontSize: 12 }}>No vocabulary found</em>
            : allVocab.map((v, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <span style={{ color: '#cdd6f4', fontWeight: 700, fontSize: 12 }}>{v.word}</span>
                <span style={{ color: '#cba6f7', fontSize: 11, marginLeft: 6 }}>{v.pos}</span>
                <div style={{ color: '#a6adc8', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{v.definition}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function EditableTranscript({ transcript, onSave }: { transcript: Transcript; onSave: (c: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(transcript.content);
  return (
    <div style={{ marginBottom: 8 }}>
      {editing ? (
        <>
          <textarea
            style={{ width: '100%', background: '#181825', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 6, padding: 8, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
            rows={4} value={val} onChange={e => setVal(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={{ background: '#a6e3a1', color: '#1e1e2e', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              onClick={() => { onSave(val); setEditing(false); }}>Save</button>
            <button style={{ background: '#313244', color: '#cdd6f4', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
              onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <div style={{ background: '#181825', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, color: '#a6adc8', fontSize: 13, whiteSpace: 'pre-wrap' }}>{transcript.content}</div>
          <button style={{ background: '#45475a', color: '#cdd6f4', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
            onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  h1: { color: '#cdd6f4', fontSize: 24, fontWeight: 700, flex: 1 },
  select: {
    background: '#1e1e2e', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '6px 10px', fontSize: 13,
  },
  empty: { color: '#6c7086', padding: 20 },
  section: { marginBottom: 28 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionLabel: { color: '#cdd6f4', fontSize: 16, fontWeight: 700 },
  sectionCount: { color: '#6c7086', fontSize: 13 },

  // EnglishPod grid
  epGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  epCard: {
    background: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: 10,
    padding: '12px 14px',
  },
  epTitle: {
    color: '#cdd6f4',
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
  },
  trackList: { display: 'flex', flexDirection: 'column', gap: 6 },
  trackRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trackBadge: {
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 72,
    textAlign: 'center',
  },
  practiceBtn: {
    background: '#313244',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 5,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },
  missing: { color: '#45475a', fontSize: 13 },
  studyBtn: {
    color: '#89b4fa', border: '1px dashed #45475a',
    borderRadius: 5, padding: '4px 0', cursor: 'pointer',
    fontSize: 11, marginTop: 10, width: '100%',
  },

  // Flat list (others)
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#1e1e2e', border: '1px solid #313244', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 },
  cardMain: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  cardTitle: { color: '#cdd6f4', fontSize: 15, fontWeight: 600 },
  diffBadge: { background: '#45475a', color: '#a6adc8', borderRadius: 4, padding: '2px 6px', fontSize: 11 },
  topic: { color: '#6c7086', fontSize: 13 },
  cardActions: { display: 'flex', gap: 8 },
  actionBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12,
  },
  expanded: { borderTop: '1px solid #313244', padding: '14px 16px', background: '#181825' },
  sectionTitle: { color: '#a6adc8', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' },
  textarea: {
    width: '100%', background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: 8,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  input: {
    width: '100%', background: '#181825', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 6, padding: '6px 8px',
    fontSize: 13, boxSizing: 'border-box',
  },
  btnRow: { display: 'flex', gap: 8, marginTop: 6 },
  saveBtn: {
    background: '#a6e3a1', color: '#1e1e2e', border: 'none',
    borderRadius: 4, padding: '4px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
  cancelBtn: {
    background: '#313244', color: '#cdd6f4', border: 'none',
    borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
  },
  addBtn: {
    background: 'transparent', color: '#89b4fa', border: '1px dashed #45475a',
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, marginTop: 6,
  },
  questionRow: {
    background: '#1e1e2e', borderRadius: 6, padding: '8px 12px',
    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10,
  },
  qText: { flex: 1, color: '#cdd6f4', fontSize: 13 },
  qAnswer: { color: '#a6adc8', fontSize: 12 },
  delBtn: { background: 'none', color: '#f38ba8', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 4px' },
  newQuestionForm: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' },
};
