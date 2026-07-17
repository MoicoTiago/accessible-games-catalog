import { useEffect, useRef, useState } from 'react';
import { loginUser } from '../api.js';
import { pushToast } from '../components/ToastHost.jsx';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commandsOpen, setCommandsOpen] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef(null);
  const identifierRef = useRef(null);
  const passwordRef = useRef(null);
  const voiceFieldRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await loginUser(identifier, password);
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('auth-changed'));
      pushToast('successfully logged in');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e.detail || {};
      if (detail.type === 'commands') {
        e.preventDefault();
        if (detail.action === 'open') setCommandsOpen(true);
        if (detail.action === 'close') setCommandsOpen(false);
        return;
      }
      if (detail.type !== 'auth') return;
      if (detail.form && detail.form !== 'login') return;

      if (detail.action === 'set-field') {
        e.preventDefault();
        const value = detail.value || '';
        if (['identifier', 'email', 'username'].includes(detail.field)) {
          setIdentifier(value);
          identifierRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'identifier';
        }
        if (detail.field === 'password') {
          setPassword(value);
          passwordRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'password';
        }
        return;
      }

      if (detail.action === 'focus') {
        e.preventDefault();
        if (detail.field === 'identifier' || detail.field === 'email' || detail.field === 'username') {
          identifierRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'identifier';
        }
        if (detail.field === 'password') {
          passwordRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'password';
        }
        return;
      }

      if (detail.action === 'type') {
        e.preventDefault();
        const value = detail.value || '';
        const active = document.activeElement;
        let target = voiceFieldRef.current;
        if (!target) {
          if (active === identifierRef.current) target = 'identifier';
          if (active === passwordRef.current) target = 'password';
        }
        if (target === 'identifier') {
          setIdentifier(value);
        }
        if (target === 'password') {
          setPassword(value);
        }
        return;
      }

      if (detail.action === 'submit') {
        e.preventDefault();
        if (formRef.current?.requestSubmit) {
          formRef.current.requestSubmit();
        } else {
          onSubmit({ preventDefault: () => {} });
        }
        return;
      }

      if (detail.action === 'clear') {
        e.preventDefault();
        setIdentifier('');
        setPassword('');
        setError('');
        voiceFieldRef.current = null;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, []);

  const voiceCommands = [
    { phrase: 'Focus login field', description: 'Moves focus to the email/username field.' },
    { phrase: 'Focus password', description: 'Moves focus to the password field.' },
    { phrase: 'Type <text>', description: 'Dictate into the last focused field.' },
    { phrase: 'Spell email', description: 'Start spelling; say letters, “capital A”, “dot”, “backspace”, “stop spelling”.' },
    { phrase: 'Spell password', description: 'Start spelling; say letters, “capital A”, “dot”, “backspace”, “stop spelling”.' },
    { phrase: 'Stop spelling', description: 'Exit spelling mode.' },
    { phrase: 'Submit login', description: 'Submit the form.' },
    { phrase: 'Clear login form', description: 'Reset all fields.' },
    { phrase: 'Open commands', description: 'Show this command list.' },
    { phrase: 'Close commands', description: 'Hide the command list.' }
  ];

  const applySpelling = (detail) => {
    const normalizeField = (field) => {
      const f = (field || '').toLowerCase();
      if (f === 'identifier' || f === 'login') return 'identifier';
      if (f === 'password') return 'password';
      return 'identifier';
    };
    const target = normalizeField(detail.field || voiceFieldRef.current);
    if (!target) return;
    const update = (current) => {
      let next = detail.clear ? '' : current;
      if (detail.backspaces) next = next.slice(0, Math.max(0, next.length - detail.backspaces));
      if (detail.value) next += detail.value;
      return next;
    };
    if (target === 'identifier') setIdentifier((prev) => update(prev));
    if (target === 'password') setPassword((prev) => update(prev));
    voiceFieldRef.current = target;
    if (target === 'identifier') identifierRef.current?.focus({ preventScroll: true });
    if (target === 'password') passwordRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const onSpell = (e) => {
      const detail = e.detail || {};
      if (detail.type !== 'spell') return;
      if (detail.action === 'start') {
        const field = (detail.field || '').toLowerCase();
        if (field === 'identifier' || field === 'email' || field === 'login' || field === 'username') {
          identifierRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'identifier';
        }
        if (field === 'password') {
          passwordRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'password';
        }
        if (detail.clear) {
          setIdentifier('');
          setPassword('');
        }
        return;
      }
      if (detail.action === 'stop') {
        voiceFieldRef.current = null;
        return;
      }
      if (detail.action === 'append' || detail.action === 'clear') {
        applySpelling(detail);
      }
    };
    window.addEventListener('voiceCommand', onSpell);
    return () => window.removeEventListener('voiceCommand', onSpell);
  }, []);

  return (
    <div className="min-h-screen theme-page flex items-center justify-center p-6">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="w-full max-w-sm theme-surface border theme-border rounded-xl shadow p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold theme-text">Log in</h1>
          <button
            type="button"
            onClick={() => setCommandsOpen((v) => !v)}
            className="text-xs font-semibold theme-text underline"
            aria-expanded={commandsOpen}
            aria-controls="login-voice-commands"
          >
            {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
          </button>
        </div>
        {commandsOpen && (
          <section
            id="login-voice-commands"
            className="rounded-md border theme-border bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-sm theme-text"
            aria-live="polite"
          >
            <ul className="space-y-1">
              {voiceCommands.map((cmd) => (
                <li key={cmd.phrase}>
                  <span className="font-semibold">{cmd.phrase}</span>
                  <span className="ml-2 text-xs theme-muted">{cmd.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <label className="block text-sm theme-text mb-1">Email or Username</label>
          <input
            ref={identifierRef}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full theme-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="you@example.com or username"
            required
          />
        </div>
        <div>
          <label className="block text-sm theme-text mb-1">Password</label>
          <input
            type="password"
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full theme-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full theme-btn-strong rounded-md py-2 font-medium disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
