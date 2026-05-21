import type { MistakeDetail } from '../types';

interface ResultPanelProps {
  score: number;
  correctAnswer: string;
  userInput: string;
  mistakes: MistakeDetail[];
  isCorrect?: boolean;
}

const MISTAKE_COLORS: Record<string, string> = {
  spelling: '#fab387',
  plural: '#a6e3a1',
  tense: '#89dceb',
  article: '#f9e2af',
  preposition: '#cba6f7',
  missing_word: '#f38ba8',
  extra_word: '#eba0ac',
  wrong_word: '#f2cdcd',
  word_limit: '#f38ba8',
  format_error: '#fab387',
};

export default function ResultPanel({ score, correctAnswer, userInput, mistakes, isCorrect }: ResultPanelProps) {
  const color = score >= 90 ? '#a6e3a1' : score >= 70 ? '#f9e2af' : '#f38ba8';

  return (
    <div style={styles.container}>
      <div style={styles.scoreRow}>
        <span style={{ ...styles.score, color }}>
          {isCorrect !== undefined ? (isCorrect ? '✓ Correct' : '✗ Incorrect') : `Score: ${score}%`}
        </span>
        {isCorrect === undefined && (
          <span style={styles.wer}>WER: {((1 - score / 100)).toFixed(2)}</span>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Your answer:</div>
        <div style={styles.answer}>{userInput || <em style={{ color: '#6c7086' }}>No input</em>}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Correct answer:</div>
        <div style={{ ...styles.answer, color: '#a6e3a1' }}>{correctAnswer}</div>
      </div>

      {mistakes.length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Mistake analysis ({mistakes.length}):</div>
          <div style={styles.mistakeList}>
            {mistakes.map((m, i) => (
              <div key={i} style={styles.mistakeItem}>
                <span
                  style={{
                    ...styles.tag,
                    background: MISTAKE_COLORS[m.mistake_type] ?? '#89b4fa',
                    color: '#1e1e2e',
                  }}
                >
                  {m.mistake_type}
                </span>
                <span style={styles.mistakeText}>
                  {m.wrong_text && <><s style={{ color: '#f38ba8' }}>{m.wrong_text}</s> → </>}
                  {m.correct_text && <strong style={{ color: '#a6e3a1' }}>{m.correct_text}</strong>}
                </span>
                {m.explanation && <div style={styles.explanation}>{m.explanation}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#181825',
    border: '1px solid #313244',
    borderRadius: 8,
    padding: 16,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  score: {
    fontSize: 22,
    fontWeight: 700,
  },
  wer: {
    color: '#6c7086',
    fontSize: 13,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    color: '#6c7086',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  answer: {
    color: '#cdd6f4',
    fontFamily: 'monospace',
    fontSize: 15,
    background: '#1e1e2e',
    padding: '8px 10px',
    borderRadius: 6,
  },
  mistakeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  mistakeItem: {
    background: '#1e1e2e',
    borderRadius: 6,
    padding: '8px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  mistakeText: {
    color: '#cdd6f4',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  explanation: {
    color: '#a6adc8',
    fontSize: 12,
    width: '100%',
    marginTop: 2,
  },
};
