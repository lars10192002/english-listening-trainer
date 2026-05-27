import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAudio, deleteAudio, scanAudio, updateAudio } from '../api/audioApi';
import { getTranscriptsByAudio, createTranscript, updateTranscript, importPdfTranscript, importSrtTranscript, alignTimestamps } from '../api/transcriptApi';
import { getQuestionsByAudio, createQuestion, deleteQuestion } from '../api/questionApi';
import type { AudioItem, Transcript, Question } from '../types';

const EXAM_TYPES = ['', 'ielts', 'toeic', 'custom', 'business', 'general'];

// englishpod_B0001dg.mp3 → episode "0001", track "dg"
const EP_PATTERN = /^englishpod_[A-Z]?(\d+)(dg|pb|rv)\.mp3$/i;
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
  const [activeTab, setActiveTab] = useState<'englishpod' | 'toeic' | 'other'>('englishpod');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [transcripts, setTranscripts] = useState<Record<number, Transcript[]>>({});
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [srtStatus, setSrtStatus] = useState<Record<number, { loading: boolean; count?: number; error?: string }>>({});
  const [alignStatus, setAlignStatus] = useState<Record<number, { loading: boolean; updated?: number; error?: string }>>({});
  const [importStatus, setImportStatus] = useState<Record<number, { loading: boolean; segmentCount?: number; speakers?: string[]; error?: string }>>({});
  const [newTranscript, setNewTranscript] = useState('');
  const [addingTranscript, setAddingTranscript] = useState<number | null>(null);
  const [addingQuestion, setAddingQuestion] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState({ question_text: '', correct_answer: '', word_limit_type: 'none', explanation: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await listAudio();
    setItems(data);
    const preloaded: Record<number, { loading: boolean; segmentCount?: number }> = {};
    for (const item of data) {
      if (item.segment_count > 0) {
        preloaded[item.id] = { loading: false, segmentCount: item.segment_count };
      }
    }
    setImportStatus(prev => ({ ...prev, ...preloaded }));
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

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const added = await scanAudio();
      setScanResult(added.length > 0 ? `Found ${added.length} new file(s).` : 'No new files found.');
      await load();
    } catch {
      setScanResult('Scan failed.');
    } finally {
      setScanning(false);
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

  const handleImportPdf = async (audioId: number) => {
    setImportStatus(prev => ({ ...prev, [audioId]: { loading: true } }));
    try {
      const result = await importPdfTranscript(audioId);
      setImportStatus(prev => ({
        ...prev,
        [audioId]: { loading: false, segmentCount: result.segment_count, speakers: result.speakers },
      }));
    } catch {
      setImportStatus(prev => ({ ...prev, [audioId]: { loading: false, error: 'Import failed' } }));
    }
  };

  const handleImportSrt = async (audioId: number) => {
    setSrtStatus(prev => ({ ...prev, [audioId]: { loading: true } }));
    try {
      const result = await importSrtTranscript(audioId);
      setSrtStatus(prev => ({ ...prev, [audioId]: { loading: false, count: result.segment_count } }));
      await load();
    } catch {
      setSrtStatus(prev => ({ ...prev, [audioId]: { loading: false, error: 'No SRT found or parse failed' } }));
    }
  };

  const handleAlign = async (audioId: number) => {
    setAlignStatus(prev => ({ ...prev, [audioId]: { loading: true } }));
    try {
      const result = await alignTimestamps(audioId);
      setAlignStatus(prev => ({ ...prev, [audioId]: { loading: false, updated: result.updated } }));
    } catch {
      setAlignStatus(prev => ({ ...prev, [audioId]: { loading: false, error: 'Align failed' } }));
    }
  };

  const handleUpdateExamType = async (item: AudioItem, newExamType: string) => {
    if (newExamType === item.exam_type) return;
    await updateAudio(item.id, { exam_type: newExamType });
    await load();
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
  const toeicItems = others.filter(i => i.exam_type === 'toeic');
  const remainingOthers = others.filter(i => i.exam_type !== 'toeic');

  const q = searchQuery.toLowerCase().replace(/\s/g, '');
  const filteredGroups = q
    ? groups.filter(g => g.ep.includes(q) || parseInt(g.ep, 10).toString().includes(q))
    : groups;
  const filteredToeic = q
    ? toeicItems.filter(i => (i.title ?? i.filename).toLowerCase().includes(q))
    : toeicItems;
  const filteredOthers = q
    ? remainingOthers.filter(i => (i.title ?? i.filename).toLowerCase().includes(q))
    : remainingOthers;

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.h1}>Library</h1>
        <button style={styles.scanBtn} onClick={handleScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan Folder'}
        </button>
        {scanResult && <span style={styles.scanResult}>{scanResult}</span>}
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {([
          { key: 'englishpod', label: 'EnglishPod', count: groups.length },
          { key: 'toeic',      label: 'TOEIC',      count: toeicItems.length },
          { key: 'other',      label: 'Other',       count: remainingOthers.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(activeTab === key ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab(key); setSearchQuery(''); }}
          >
            {label}
            <span style={styles.tabCount}>{count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input
          style={styles.searchInput}
          placeholder={activeTab === 'englishpod' ? 'Search episode…' : 'Search…'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {activeTab === 'englishpod' && (
          <button
            style={styles.viewToggle}
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
        )}
      </div>

      {items.length === 0 && (
        <div style={styles.empty}>No audio files yet. <a href="/import" style={{ color: '#89b4fa' }}>Import one.</a></div>
      )}

      {/* EnglishPod tab */}
      {activeTab === 'englishpod' && (
        <div style={styles.section}>
          {filteredGroups.length === 0 && <div style={styles.empty}>No episodes found.</div>}

          {/* Grid mode */}
          {viewMode === 'grid' && (
            <div style={styles.epGrid}>
              {filteredGroups.map(({ ep, tracks }) => (
                <div key={ep} style={styles.epCard}>
                  <div style={styles.epTitle}>Ep. {parseInt(ep, 10)}</div>
                  <div style={styles.trackList}>
                    {(['dg', 'pb', 'rv'] as const).map(t => {
                      const item = tracks[t];
                      const imp = item ? importStatus[item.id] : undefined;
                      return (
                        <div key={t} style={styles.trackRow}>
                          <span style={{ ...styles.trackBadge, background: TRACK_COLOR[t], color: '#1e1e2e' }}>
                            {TRACK_LABEL[t]}
                          </span>
                          {item ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button style={styles.practiceBtn} onClick={() => navigate(`/practice/${item.id}`)}>
                                Practice
                              </button>
                              {t === 'dg' && (
                                imp?.segmentCount != null ? (
                                  <span style={styles.importedBadge}>✓ {imp.segmentCount} lines</span>
                                ) : (
                                  <button style={styles.importBtn} disabled={imp?.loading} onClick={() => handleImportPdf(item.id)}>
                                    {imp?.loading ? '…' : imp?.error ? 'Retry' : 'Import PDF'}
                                  </button>
                                )
                              )}
                            </div>
                          ) : (
                            <span style={styles.missing}>—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List mode */}
          {viewMode === 'list' && (
            <div style={styles.epListContainer}>
              {filteredGroups.map(({ ep, tracks }) => (
                <div key={ep} style={styles.epListRow}>
                  <span style={styles.epListNum}>Ep. {parseInt(ep, 10)}</span>
                  {(['dg', 'pb', 'rv'] as const).map(t => {
                    const item = tracks[t];
                    const imp = item ? importStatus[item.id] : undefined;
                    return (
                      <div key={t} style={styles.epListTrack}>
                        <span style={{ ...styles.trackBadge, background: item ? TRACK_COLOR[t] : '#313244', color: item ? '#1e1e2e' : '#45475a' }}>
                          {TRACK_LABEL[t]}
                        </span>
                        {item ? (
                          <>
                            <button style={styles.practiceBtn} onClick={() => navigate(`/practice/${item.id}`)}>▶</button>
                            {t === 'dg' && (
                              imp?.segmentCount != null
                                ? <span style={styles.importedBadge}>✓</span>
                                : <button style={styles.importBtn} disabled={imp?.loading} onClick={() => handleImportPdf(item.id)}>
                                    {imp?.loading ? '…' : 'PDF'}
                                  </button>
                            )}
                          </>
                        ) : (
                          <span style={styles.missing}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TOEIC tab */}
      {activeTab === 'toeic' && (
        <div style={styles.section}>
          {filteredToeic.length === 0 && <div style={styles.empty}>No TOEIC files found.</div>}
          <div style={styles.list}>
            {filteredToeic.map(item => {
              const s = srtStatus[item.id];
              const al = alignStatus[item.id];
              const segCount = s?.count ?? (item.segment_count > 0 ? item.segment_count : null);
              return (
                <div key={item.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardMain}>
                      <select
                        style={{ ...styles.examSelect, background: examBadgeColor['toeic'] }}
                        value={item.exam_type ?? 'toeic'}
                        onChange={e => handleUpdateExamType(item, e.target.value)}
                      >
                        {['ielts', 'toeic', 'custom', 'business', 'general'].map(t => (
                          <option key={t} value={t}>{t.toUpperCase()}</option>
                        ))}
                      </select>
                      <span style={styles.cardTitle}>{item.title || item.filename}</span>
                    </div>
                    <div style={styles.cardActions}>
                      <button style={styles.actionBtn} onClick={() => navigate(`/practice/${item.id}`)}>Practice</button>
                      {segCount != null ? (
                        <>
                          <span style={styles.importedBadge}>✓ SRT {segCount}</span>
                          <button style={styles.alignBtn} disabled={al?.loading} onClick={() => handleAlign(item.id)}>
                            {al?.loading ? 'Aligning…' : al?.updated != null ? `✓ Aligned ${al.updated}` : al?.error ? 'Retry Align' : 'Align Timestamps'}
                          </button>
                        </>
                      ) : (
                        <button style={styles.importBtn} disabled={s?.loading} onClick={() => handleImportSrt(item.id)}>
                          {s?.loading ? '…' : s?.error ? 'Retry' : 'Import SRT'}
                        </button>
                      )}
                      <button style={{ ...styles.actionBtn, color: '#f38ba8' }} onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other tab */}
      {activeTab === 'other' && (
        <div style={styles.section}>
          {filteredOthers.length === 0 && <div style={styles.empty}>No files found.</div>}
          <div style={styles.list}>
            {filteredOthers.map(item => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardMain}>
                    <select
                      style={{ ...styles.examSelect, background: examBadgeColor[item.exam_type] ?? '#45475a' }}
                      value={item.exam_type ?? 'custom'}
                      onChange={e => handleUpdateExamType(item, e.target.value)}
                    >
                      {['ielts', 'toeic', 'custom', 'business', 'general'].map(t => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ ...styles.sectionTitle, marginBottom: 0 }}>Transcripts</div>
                      {(() => {
                        const s = srtStatus[item.id];
                        const al = alignStatus[item.id];
                        const segCount = s?.count ?? (item.segment_count > 0 ? item.segment_count : null);
                        if (segCount != null) return (
                          <>
                            <span style={styles.importedBadge}>✓ SRT {segCount} sentences</span>
                            <button style={styles.alignBtn} disabled={al?.loading} onClick={() => handleAlign(item.id)}>
                              {al?.loading ? 'Aligning…' : al?.updated != null ? `✓ Aligned ${al.updated}` : al?.error ? 'Retry Align' : 'Align Timestamps'}
                            </button>
                          </>
                        );
                        return (
                          <button style={styles.importBtn} disabled={s?.loading} onClick={() => handleImportSrt(item.id)}>
                            {s?.loading ? '…' : s?.error ? s.error : 'Import SRT'}
                          </button>
                        );
                      })()}
                    </div>
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
  headerRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 },
  h1: { color: '#cdd6f4', fontSize: 24, fontWeight: 700, flex: 1 },
  select: {
    background: '#1e1e2e', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '6px 10px', fontSize: 13,
  },
  tabBar: {
    display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16,
    borderBottom: '1px solid #313244', paddingBottom: 8,
  },
  tab: {
    background: 'none', border: 'none', color: '#6c7086',
    padding: '6px 14px', cursor: 'pointer', fontSize: 13, borderRadius: 6,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  tabActive: { background: '#313244', color: '#cdd6f4', fontWeight: 700 },
  tabCount: {
    background: '#45475a', color: '#a6adc8', borderRadius: 10,
    padding: '1px 7px', fontSize: 11,
  },
  searchInput: {
    background: '#1e1e2e', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '5px 10px', fontSize: 13, width: 180,
  },
  viewToggle: {
    background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 16,
  },
  epListContainer: { display: 'flex', flexDirection: 'column', gap: 2 },
  epListRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '5px 10px', borderRadius: 6,
    background: '#1e1e2e', border: '1px solid #313244',
  },
  epListNum: { color: '#a6adc8', fontSize: 13, minWidth: 52, fontVariantNumeric: 'tabular-nums' },
  epListTrack: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
  empty: { color: '#6c7086', padding: 20 },
  scanBtn: {
    background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
  },
  scanResult: { color: '#a6e3a1', fontSize: 13 },
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
  importBtn: {
    background: 'transparent', color: '#f9e2af', border: '1px solid #45475a',
    borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: 11,
  },
  importedBadge: {
    color: '#a6e3a1', fontSize: 11, fontWeight: 600,
  },
  alignBtn: {
    background: 'transparent', color: '#89b4fa', border: '1px solid #45475a',
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11,
  },
  // Flat list (others)
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#1e1e2e', border: '1px solid #313244', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 },
  cardMain: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  examSelect: {
    color: '#1e1e2e', border: 'none', borderRadius: 4,
    padding: '2px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  },
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
