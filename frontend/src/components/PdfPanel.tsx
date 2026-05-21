import { useState } from 'react';
import type { PdfContent, VocabItem } from '../types';

export default function PdfPanel({ content }: { content: PdfContent }) {
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
