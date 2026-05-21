import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/practiceApi';
import type { DashboardStats } from '../types';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Could not load stats. Make sure the backend is running.'));
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Dashboard</h1>

      {error && <div style={styles.error}>{error}</div>}

      {stats && (
        <>
          <div style={styles.grid}>
            <StatCard label="Today's Sessions" value={stats.today_practice_count} color="#89b4fa" />
            <StatCard label="Average Score" value={`${stats.average_score}%`} color="#a6e3a1" />
            <StatCard label="Pending Review" value={stats.pending_review_count} color="#f9e2af" />
          </div>

          <div style={styles.row}>
            <Section title="Mistake Types">
              {stats.recent_mistake_types.length === 0
                ? <div style={styles.empty}>No mistakes yet — great!</div>
                : stats.recent_mistake_types.map(m => (
                  <div key={m.type} style={styles.barRow}>
                    <span style={styles.barLabel}>{m.type}</span>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.bar, width: `${Math.min(100, m.count * 10)}%` }} />
                    </div>
                    <span style={styles.barCount}>{m.count}</span>
                  </div>
                ))}
            </Section>

            <Section title="Practice by Exam Type">
              {stats.exam_type_distribution.length === 0
                ? <div style={styles.empty}>No records yet.</div>
                : stats.exam_type_distribution.map(e => (
                  <div key={e.exam_type} style={styles.barRow}>
                    <span style={styles.barLabel}>{e.exam_type}</span>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.bar, background: '#cba6f7', width: `${Math.min(100, e.count * 10)}%` }} />
                    </div>
                    <span style={styles.barCount}>{e.count}</span>
                  </div>
                ))}
            </Section>
          </div>
        </>
      )}

      <div style={styles.quickLinks}>
        <Link to="/import" style={styles.link}>+ Import Audio</Link>
        <Link to="/library" style={styles.link}>Library</Link>
        <Link to="/review" style={styles.link}>Review Mistakes</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardValue, color }}>{value}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.h3}>{title}</h3>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 900, margin: '0 auto' },
  h1: { color: '#cdd6f4', fontSize: 26, fontWeight: 700, marginBottom: 24 },
  h3: { color: '#a6adc8', fontSize: 14, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  error: { color: '#f38ba8', background: '#1e1e2e', borderRadius: 6, padding: '10px 14px', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  card: {
    background: '#1e1e2e', border: '1px solid #313244', borderRadius: 10,
    padding: '20px 24px', textAlign: 'center',
  },
  cardValue: { fontSize: 32, fontWeight: 700, marginBottom: 4 },
  cardLabel: { color: '#6c7086', fontSize: 13 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  section: {
    background: '#1e1e2e', border: '1px solid #313244',
    borderRadius: 10, padding: '16px 20px',
  },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { color: '#cdd6f4', fontSize: 13, width: 120, flexShrink: 0 },
  barTrack: { flex: 1, background: '#313244', borderRadius: 4, height: 8 },
  bar: { background: '#89b4fa', borderRadius: 4, height: 8, minWidth: 4, transition: 'width 0.3s' },
  barCount: { color: '#6c7086', fontSize: 12, width: 24, textAlign: 'right' },
  empty: { color: '#6c7086', fontSize: 13 },
  quickLinks: { display: 'flex', gap: 12 },
  link: {
    background: '#313244', color: '#89b4fa', borderRadius: 6,
    padding: '8px 18px', textDecoration: 'none', fontSize: 14, fontWeight: 600,
  },
};
