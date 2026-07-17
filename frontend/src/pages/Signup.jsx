import { useEffect, useRef, useState } from 'react';
import { registerUser } from '../api.js';
import { pushToast } from '../components/ToastHost.jsx';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commandsOpen, setCommandsOpen] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef(null);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const voiceFieldRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { token } = await registerUser(username, email, password);
      if (token) {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('auth-changed'));
      }
      pushToast('successfully registered');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
      if (detail.form && detail.form !== 'signup') return;

      if (detail.action === 'set-field') {
        e.preventDefault();
        const value = detail.value || '';
        switch (detail.field) {
          case 'username':
            setUsername(value);
            usernameRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'username';
            break;
          case 'email':
          case 'identifier':
            setEmail(value);
            emailRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'email';
            break;
          case 'password':
            setPassword(value);
            passwordRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'password';
            break;
          case 'confirm':
            setConfirm(value);
            confirmRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'confirm';
            break;
          default:
            break;
        }
        return;
      }

      if (detail.action === 'focus') {
        e.preventDefault();
        switch (detail.field) {
          case 'username':
            usernameRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'username';
            break;
          case 'email':
          case 'identifier':
            emailRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'email';
            break;
          case 'password':
            passwordRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'password';
            break;
          case 'confirm':
            confirmRef.current?.focus({ preventScroll: true });
            voiceFieldRef.current = 'confirm';
            break;
          default:
            break;
        }
        return;
      }

      if (detail.action === 'type') {
        e.preventDefault();
        const value = detail.value || '';
        let target = voiceFieldRef.current;
        const active = document.activeElement;
        if (!target) {
          if (active === usernameRef.current) target = 'username';
          if (active === emailRef.current) target = 'email';
          if (active === passwordRef.current) target = 'password';
          if (active === confirmRef.current) target = 'confirm';
        }
        switch (target) {
          case 'username':
            setUsername(value);
            break;
          case 'email':
            setEmail(value);
            break;
          case 'password':
            setPassword(value);
            break;
          case 'confirm':
            setConfirm(value);
            break;
          default:
            break;
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
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirm('');
        setError('');
        voiceFieldRef.current = null;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, []);

  const applySpelling = (detail) => {
    const normalizeField = (field) => {
      const f = (field || '').toLowerCase();
      if (f.includes('user')) return 'username';
      if (f === 'identifier' || f === 'login') return 'email';
      if (f === 'password') return 'password';
      if (f === 'confirm') return 'confirm';
      return 'email';
    };
    const target = normalizeField(detail.field || voiceFieldRef.current);
    if (!target) return;
    const update = (current) => {
      let next = detail.clear ? '' : current;
      if (detail.backspaces) next = next.slice(0, Math.max(0, next.length - detail.backspaces));
      if (detail.value) next += detail.value;
      return next;
    };
    if (target === 'username') setUsername((prev) => update(prev));
    if (target === 'email') setEmail((prev) => update(prev));
    if (target === 'password') setPassword((prev) => update(prev));
    if (target === 'confirm') setConfirm((prev) => update(prev));
    voiceFieldRef.current = target;
    const focusMap = { username: usernameRef, email: emailRef, password: passwordRef, confirm: confirmRef };
    focusMap[target]?.current?.focus({ preventScroll: true });
  };

  const voiceCommands = [
    { phrase: 'Focus username/email/password/confirm', description: 'Moves focus to a specific field.' },
    { phrase: 'Type <text>', description: 'Dictate into the last focused field.' },
    { phrase: 'Spell username/email/password/confirm', description: 'Start spelling; say letters, “capital A”, “dot”, “backspace”, “stop spelling”.' },
    { phrase: 'Stop spelling', description: 'Exit spelling mode.' },
    { phrase: 'Submit sign up', description: 'Submit the signup form.' },
    { phrase: 'Clear sign up form', description: 'Reset all fields.' },
    { phrase: 'Open commands', description: 'Show this command list.' },
    { phrase: 'Close commands', description: 'Hide the command list.' }
  ];

  useEffect(() => {
    const onSpell = (e) => {
      const detail = e.detail || {};
      if (detail.type !== 'spell') return;
      if (detail.action === 'start') {
        const field = (detail.field || '').toLowerCase();
        if (field === 'username') {
          usernameRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'username';
        } else if (field === 'email' || field === 'identifier' || field === 'login') {
          emailRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'email';
        } else if (field === 'password') {
          passwordRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'password';
        } else if (field === 'confirm') {
          confirmRef.current?.focus({ preventScroll: true });
          voiceFieldRef.current = 'confirm';
        }
        if (detail.clear) {
          setUsername('');
          setEmail('');
          setPassword('');
          setConfirm('');
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
          <h1 className="text-xl font-semibold theme-text">Sign up</h1>
          <button
            type="button"
            onClick={() => setCommandsOpen((v) => !v)}
            className="text-xs font-semibold theme-text underline"
            aria-expanded={commandsOpen}
            aria-controls="signup-voice-commands"
          >
            {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
          </button>
        </div>
        {commandsOpen && (
          <section
            id="signup-voice-commands"
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
          <label className="block text-sm theme-text mb-1">Username</label>
          <input
            ref={usernameRef}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full theme-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm theme-text mb-1">Email</label>
          <input
            type="email"
            ref={emailRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full theme-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
        <div>
          <label className="block text-sm theme-text mb-1">Confirm password</label>
          <input
            type="password"
            ref={confirmRef}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full theme-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full theme-btn-strong rounded-md py-2 font-medium disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
