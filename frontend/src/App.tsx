import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import LibraryPage from './pages/LibraryPage';
import PracticePage from './pages/PracticePage';
import ReviewPage from './pages/ReviewPage';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/import', label: 'Import' },
  { to: '/library', label: 'Library' },
  { to: '/review', label: 'Review' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        <nav style={styles.nav}>
          <span style={styles.logo}>English Listening Trainer</span>
          <div style={styles.links}>
            {NAV_LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/practice/:audioId" element={<PracticePage />} />
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#11111b',
    color: '#cdd6f4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  nav: {
    background: '#1e1e2e',
    borderBottom: '1px solid #313244',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    height: 52,
    gap: 32,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    color: '#89b4fa',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  links: {
    display: 'flex',
    gap: 4,
  },
  link: {
    color: '#a6adc8',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 14,
  },
  linkActive: {
    background: '#313244',
    color: '#cdd6f4',
    fontWeight: 600,
  },
  main: {},
};
