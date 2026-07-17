import { useEffect } from 'react';
import './App.css';
import './theme.css';
import Home from "./pages/Home";
import Search from "./pages/Search";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Game from "./pages/Game.jsx";
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ToastHost from './components/ToastHost.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import ReportsPage from './pages/Reports.jsx';
import { loadSettings } from './settings';
import Library from './pages/Library.jsx';
import { searchGames } from './api.js';

const applyThemeFromSettings = (settings) => {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const isHighContrast = settings?.theme === 'high-contrast' || !!settings?.highContrastMode;
  const theme = settings?.theme === 'dark' ? 'dark' : isHighContrast ? 'dark' : 'light';
  const textSize = ['small', 'large', 'medium'].includes(settings?.textSize) ? settings.textSize : 'medium';
  const spacing = ['snug', 'roomy', 'airy'].includes(settings?.spacing) ? settings.spacing : 'roomy';
  const buttonSize = ['normal', 'large', 'xlarge'].includes(settings?.buttonSize) ? settings.buttonSize : 'normal';
  body.dataset.theme = theme;
  body.dataset.hc = isHighContrast ? 'true' : 'false';
  body.dataset.textSize = textSize;
  body.dataset.spacing = spacing;
  body.dataset.buttonSize = buttonSize;
  // Helps form controls and scrollbars pick the right default colors.
  body.style.colorScheme = (theme === 'dark' || isHighContrast) ? 'dark' : 'light';
  body.style.fontSize = textSize === 'small' ? '14px' : textSize === 'large' ? '18px' : '16px';
};

// Apply theme immediately on first load to avoid white flash before React mounts.
if (typeof window !== 'undefined') {
  applyThemeFromSettings(loadSettings());
}

// Global listener to route voice navigation commands (library tabs, opening games) to the appropriate pages.
function VoiceNavigator() {
  const navigate = useNavigate();
  useEffect(() => {
    const normalize = (s = '') => String(s).toLowerCase().replace(/[.,!?]/g, '').trim();
    let alive = true;
    const timeouts = new Set();
    const trackTimeout = (fn, delay) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        if (alive) fn();
      }, delay);
      timeouts.add(id);
      return id;
    };
    const clearTrackedTimeouts = () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
    const onVoice = (e) => {
      const detail = e.detail || {};
      const type = detail?.type;
      if (type === 'navigate') {
        const target = normalize(detail.target || '');
        if (target === 'library') {
          e.preventDefault?.();
          navigate('/library');
          return;
        }
        if (target === 'wishlist' || target === 'favourites' || target === 'favorites') {
          e.preventDefault?.();
          const utter = String(detail.utterance || '');
          // Detect an add command and dispatch to game first, without navigation
          const mAdd = utter.match(/^(?:add|save|put)\s+(?:this|the)?\s*(?:game|it)?\s*to\s+(favourites|favorites|wishlist)\b/i);
          if (mAdd) {
            const listRaw = mAdd[1].toLowerCase();
            const action = listRaw === 'wishlist' ? 'wishlist' : 'favourites';
            const evtAddGame = new CustomEvent('voiceCommand', { detail: { type: 'game', action } });
            window.dispatchEvent(evtAddGame);
            return; // do not navigate
          }
          // Default behaviour: just navigate and switch tabs, with remove/move bridging
          navigate('/library');
          trackTimeout(() => {
            // this prevents duplicate tab switching dispatches
            if (window.__voiceTabSwitching) return;
            window.__voiceTabSwitching = true;
            // First switch tab
            const evtTab = new CustomEvent('voiceCommand', { detail: { type: 'navigate', target } });
            window.dispatchEvent(evtTab);
            const utter = String(detail.utterance || '');
            // If the original utterance asked to remove/delete, extract title and invoke remove
            const mRemove = utter.match(/(?:remove|delete)\s+(.+?)\s+from\s+(favourites|favorites|wishlist)/i);
            if (mRemove) {
              const title = mRemove[1].trim();
              const listRaw = mRemove[2].toLowerCase();
              const list = listRaw === 'wishlist' ? 'wishlist' : 'favourites';
              const evtRemove = new CustomEvent('voiceCommand', { detail: { type: 'library', action: 'remove', list, title } });
              // slight delay to allow Library to render list
              trackTimeout(() => window.dispatchEvent(evtRemove), 150);
            }
            // If the original utterance asked to move, extract title and target list and invoke move
            const mMove = utter.match(/(?:move|transfer|shift)\s+(.+?)\s+to\s+(favourites|favorites|wishlist)/i);
            if (mMove) {
              const title = mMove[1].trim();
              const listRaw = mMove[2].toLowerCase();
              const list = listRaw === 'wishlist' ? 'wishlist' : 'favourites';
              const evtMove = new CustomEvent('voiceCommand', { detail: { type: 'library', action: 'move', list, title } });
              trackTimeout(() => window.dispatchEvent(evtMove), 180);
            }
            // clear guard after a short debounce window
            trackTimeout(() => { window.__voiceTabSwitching = false; }, 500);
          }, 150);
          return;
        }
      }
      // Handle opening specific games globally
      if (type === 'game-card' && detail?.action === 'open' && detail.title) {
        const title = normalize(detail.title || '');
        if (title === 'library' || title === 'my library') {
          e.preventDefault?.();
          navigate('/library');
          return;
        }
        e.preventDefault?.();
        (async () => {
          try {
            const results = await searchGames({ q: detail.title });
            if (!alive) return;
            if (!results || results.length === 0) return;
            const needle = title;
            const match =
              results.find(g => normalize(g.name || g.title) === needle) ||
              results.find(g => normalize(g.name || g.title).includes(needle)) ||
              results[0];
            if (match && match.id != null) navigate(`/games/${match.id}`);
          } catch {}
        })();
        return;
      }
      // fallback, some controllers emit game-card for "open library"
      if (type === 'game-card' && detail?.action === 'open') {
        const title = normalize(detail.title || '');
        if (title === 'library' || title === 'my library') {
          e.preventDefault?.();
          navigate('/library');
          return;
        }
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => {
      alive = false;
      window.removeEventListener('voiceCommand', onVoice);
      clearTrackedTimeouts();
    };
  }, [navigate]);
  return null;
}

function App() {
  useEffect(() => {
    const apply = (detail) => applyThemeFromSettings(detail || loadSettings());
    apply();
    const onSettings = (e) => apply(e.detail);
    const onStorage = () => apply();
    // Support both legacy and current event names.
    window.addEventListener('settings-changed', onSettings);
    window.addEventListener('settings:changed', onSettings);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('settings-changed', onSettings);
      window.removeEventListener('settings:changed', onSettings);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <Router>
      <VoiceNavigator />
      <a href="#page-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <div id="page-content" tabIndex="-1" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/games/:id" element={<Game />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/admin"
          element={<AdminRedirect />}
        />
      </Routes>
      <ToastHost />
    </Router>
  );
}

function AdminRedirect() {
  useEffect(() => {
    pushToast('You are not allowed to access /admin. Redirected to home.');
  }, []);
  return <Home />;
}

export default App;
