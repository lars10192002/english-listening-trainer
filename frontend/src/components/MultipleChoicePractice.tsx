import { useState } from 'react';
import type { AudioItem, Question, MultipleChoiceResult } from '../types';
import { submitMultipleChoice } from '../api/practiceApi';

interface QuestionState {
  selectedId: number | null;
  result: MultipleChoiceResult | null;
  loading: boolean;
}

interface Props {
  audio: AudioItem;
  questions: Question[];
}

export default function MultipleChoicePractice({ questions }: Props) {
  const [states, setStates] = useState<Record<number, QuestionState>>(() =>
    Object.fromEntries(questions.map(q => [q.id, { selectedId: null, result: null, loading: false }]))
  );

  const handleSelect = async (question: Question, optionId: number) => {
    const st = states[question.id];
    if (st.result || st.loading) return;

    setStates(prev => ({ ...prev, [question.id]: { ...prev[question.id], selectedId: optionId, loading: true } }));
    try {
      const res = await submitMultipleChoice({ question_id: question.id, selected_option_id: optionId });
      setStates(prev => ({ ...prev, [question.id]: { selectedId: optionId, result: res, loading: false } }));
    } catch {
      setStates(prev => ({ ...prev, [question.id]: { ...prev[question.id], loading: false } }));
    }
  };

  const handleReset = (questionId: number) => {
    setStates(prev => ({ ...prev, [questionId]: { selectedId: null, result: null, loading: false } }));
  };

  if (questions.length === 0) {
    return <div style={styles.empty}>No multiple choice questions for this audio.</div>;
  }

  return (
    <div style={styles.container}>
      {questions.map((q, idx) => {
        const st = states[q.id];
        const result = st.result;

        return (
          <div key={q.id} style={styles.questionBlock}>
            <div style={styles.questionHeader}>
              <span style={styles.qNum}>Q{idx + 1}</span>
              {result && (
                <button style={styles.retryBtn} onClick={() => handleReset(q.id)}>↺</button>
              )}
            </div>

            {q.question_text && (
              <div style={styles.questionText}>{q.question_text}</div>
            )}

            <div style={styles.optionList}>
              {q.options.map(opt => {
                const isSelected = st.selectedId === opt.id;
                const isCorrectOpt = result?.correct_option_id === opt.id;
                const isWrongSelected = result && isSelected && !result.is_correct;

                let optStyle = { ...styles.optionBtn };
                if (result) {
                  if (isCorrectOpt) optStyle = { ...optStyle, ...styles.optCorrect };
                  else if (isWrongSelected) optStyle = { ...optStyle, ...styles.optWrong };
                  else optStyle = { ...optStyle, ...styles.optDimmed };
                } else if (isSelected && st.loading) {
                  optStyle = { ...optStyle, ...styles.optLoading };
                }

                return (
                  <button
                    key={opt.id}
                    style={optStyle}
                    onClick={() => handleSelect(q, opt.id)}
                    disabled={!!result || st.loading}
                  >
                    <span style={styles.optLabel}>{opt.option_label}</span>
                    <span style={styles.optText}>{opt.option_text}</span>
                    {result && isCorrectOpt && <span style={styles.tick}>✓</span>}
                    {isWrongSelected && <span style={styles.cross}>✗</span>}
                  </button>
                );
              })}
            </div>

            {result?.explanation && (
              <div style={styles.explanation}>{result.explanation}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  empty: { color: '#6c7086', fontSize: 13, padding: '8px 0' },
  questionBlock: {
    background: '#181825', borderRadius: 8, padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  questionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { color: '#45475a', fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  retryBtn: {
    background: 'none', color: '#6c7086', border: 'none',
    cursor: 'pointer', fontSize: 16, padding: '0 4px',
  },
  questionText: { color: '#cdd6f4', fontSize: 14, lineHeight: 1.6 },
  optionList: { display: 'flex', flexDirection: 'column', gap: 6 },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#313244', border: '1px solid #45475a', borderRadius: 6,
    padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s',
  },
  optLoading: { background: '#3d3f56', borderColor: '#6c7086' },
  optCorrect: {
    background: '#1e3a2f', borderColor: '#a6e3a1', cursor: 'default',
  },
  optWrong: {
    background: '#3a1e1e', borderColor: '#f38ba8', cursor: 'default',
  },
  optDimmed: {
    background: '#25253a', borderColor: '#313244', cursor: 'default', opacity: 0.5,
  },
  optLabel: {
    color: '#cba6f7', fontWeight: 700, fontSize: 13,
    minWidth: 18, flexShrink: 0,
  },
  optText: { color: '#cdd6f4', fontSize: 13, flex: 1 },
  tick: { color: '#a6e3a1', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  cross: { color: '#f38ba8', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  explanation: {
    color: '#a6adc8', fontSize: 12, lineHeight: 1.6,
    background: '#1e1e2e', borderRadius: 6, padding: '8px 10px',
    borderLeft: '3px solid #89b4fa',
  },
};
