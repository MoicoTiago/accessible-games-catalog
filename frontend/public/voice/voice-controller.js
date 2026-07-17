import { createVoiceListener } from './voice-listener.js';
import { parseCommand, getWakeWord } from './command-parser.js';
import { dispatchVoiceCommand } from './command-actions.js';
import { mountFeedback, updateStatus, announceCommand } from './voice-feedback.js';
import { interpretTranscriptRemote } from './voice-remote.js';

(() => {
  mountFeedback();

  const WAKE_WINDOW_MS = 2500; // brief window for a single follow-up utterance
  let awakeUntil = 0;
  let clearTimer;
  let spellSession = null; // { field: 'email' | 'password' | 'username' | 'confirm' | 'identifier' }

  const setStatus = (msg, ttlMs = 0) => {
    updateStatus(msg);
    if (clearTimer) clearTimeout(clearTimer);
    if (ttlMs > 0) {
      clearTimer = setTimeout(() => {
        updateStatus('Say "hey platform" to start listening');
      }, ttlMs);
    }
  };

  const WAKE_TOLERANCE_RATIO = 0.25; // allow mild slips like "hay platform"

  const normalize = (text = '') => String(text || '').toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();

  const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const v0 = new Array(b.length + 1).fill(0);
    const v1 = new Array(b.length + 1).fill(0);
    for (let i = 0; i < v0.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  };

  const looksLikeWakeWord = (raw, wakeWord) => {
    const norm = normalize(raw);
    const target = normalize(wakeWord);
    if (!target) return false;
    if (norm.includes(target)) return true;
    // Also tolerate leading "platform" without the "hey" prefix.
    const targetTail = target.split(' ').slice(1).join(' ').trim();
    if (targetTail && norm.startsWith(targetTail)) return true;
    const tolerance = Math.max(1, Math.ceil(target.length * WAKE_TOLERANCE_RATIO));
    const window = target.length + 2;
    for (let i = 0; i <= Math.max(0, norm.length - target.length); i++) {
      const slice = norm.slice(i, i + window);
      const dist = levenshtein(slice.slice(0, target.length), target);
      if (dist <= tolerance) return true;
    }
    return false;
  };

  const SPELL_MAP = {
    dot: '.',
    period: '.',
    point: '.',
    dash: '-',
    hyphen: '-',
    underscore: '_',
    space: ' ',
    blank: ' ',
    at: '@',
    'at-sign': '@',
    backspace: '<backspace>',
    delete: '<backspace>'
  };
  const LETTER_NAMES = {
    ay: 'a',
    bee: 'b',
    cee: 'c',
    see: 'c',
    sea: 'c',
    dee: 'd',
    e: 'e',
    ee: 'e',
    eff: 'f',
    ef: 'f',
    gee: 'g',
    jee: 'g',
    aitch: 'h',
    ache: 'h',
    jay: 'j',
    kay: 'k',
    el: 'l',
    ell: 'l',
    em: 'm',
    en: 'n',
    oh: 'o',
    owe: 'o',
    pea: 'p',
    pee: 'p',
    cue: 'q',
    queue: 'q',
    ar: 'r',
    are: 'r',
    ess: 's',
    es: 's',
    tee: 't',
    tea: 't',
    you: 'u',
    u: 'u',
    vee: 'v',
    vi: 'v',
    doubleu: 'w',
    doubleyou: 'w',
    ex: 'x',
    why: 'y',
    wy: 'y',
    zed: 'z',
    zee: 'z'
  };

  const parseSpellField = (text = '') => {
    const f = text.toLowerCase().replace(/e[-\s]?mail/g, 'email');
    if (f.includes('user')) return 'username';
    if (f.includes('identifier') || f.includes('login')) return 'identifier';
    if (f.includes('confirm')) return 'confirm';
    if (f.includes('email')) return 'email';
    return 'password';
  };

  function parseSpellInput(raw) {
    const wakeWord = getWakeWord().toLowerCase();
    const wakeParts = wakeWord.split(/\s+/).filter(Boolean);
    const lower = raw.toLowerCase().replace(/e[-\s]?mail/g, 'email').trim();
    if (!lower) return null;
    const startMatch = lower.match(/^spell\s+(email|password|username|user name|identifier|login|confirm(?:ed)? password|confirm)$/);
    if (startMatch) return { type: 'spell', action: 'start', field: parseSpellField(startMatch[1]) };
    if (/\b(stop spelling|end spelling|finish spelling|stop|done)\b/.test(lower)) return { type: 'spell', action: 'stop' };
    if (/\bclear\b/.test(lower)) return { type: 'spell', action: 'append', clear: true };

    const tokens = lower.split(/\s+/).filter(Boolean);
    const fillers = new Set(['hey', 'platform', ...wakeParts, 'type', 'write', 'enter', 'say', 'letter', 'letters', 'word', 'words', 'and', 'then', 'please']);
    const capitalOnce = new Set(['capital', 'cap', 'capitals', 'upper']);

    let value = '';
    let backspaces = 0;
    let capitalizeNext = false;
    for (const t of tokens) {
      const cleaned = t.replace(/[^a-z0-9-]/g, '');
      if (!cleaned) continue;
      if (fillers.has(cleaned)) continue;
      if (capitalOnce.has(cleaned)) {
        capitalizeNext = true;
        continue;
      }
      const mapped = SPELL_MAP[cleaned];
      if (mapped === '<backspace>') {
        backspaces += 1;
        continue;
      }
      if (typeof mapped === 'string') {
        const letter = capitalizeNext ? mapped.toUpperCase() : mapped;
        value += letter;
        capitalizeNext = false;
        continue;
      }
      const letterName = LETTER_NAMES[cleaned];
      if (letterName) {
        const letter = capitalizeNext ? letterName.toUpperCase() : letterName;
        value += letter;
        capitalizeNext = false;
        continue;
      }
      if (/^[a-z]$/.test(cleaned)) {
        const letter = capitalizeNext ? cleaned.toUpperCase() : cleaned;
        value += letter;
        capitalizeNext = false;
        continue;
      }
      if (/^[a-z]{2,}$/.test(cleaned)) {
        const word = capitalizeNext ? cleaned.toUpperCase() : cleaned;
        value += word;
        capitalizeNext = false;
        continue;
      }
      if (/^[0-9]$/.test(cleaned)) {
        value += cleaned;
        continue;
      }
      if (/^[0-9]{2,}$/.test(cleaned)) {
        value += cleaned;
      }
    }
    if (!value && !backspaces) return null;
    return { type: 'spell', action: 'append', value, backspaces };
  }

  const listener = createVoiceListener({
    onTranscript: handleTranscript,
    onStatus: updateStatus
  });

  // Try to start immediately, then fall back to first user interaction (gesture) to satisfy browser policies.
  listener.start();
  const startOnInteraction = () => {
    listener.start();
  };
  window.addEventListener('click', startOnInteraction, { once: true });
  window.addEventListener('keydown', startOnInteraction, { once: true });
  setStatus('Click or say your wake word to start listening');

  async function handleTranscript(raw) {
    const lower = raw.toLowerCase();
    const wakeWord = getWakeWord();
    const heardWake = looksLikeWakeWord(lower, wakeWord);
    const wakeIndex = heardWake ? lower.indexOf(normalize(wakeWord)) : -1;
    const trimmedRaw =
      heardWake && wakeIndex >= 0
        ? raw.slice(wakeIndex).trim()
        : raw;

    // If we're spelling, bypass the wake word gate so the user can keep dictating characters.
    if (spellSession) {
      const spellCmd = parseSpellInput(raw);
      if (spellCmd) {
        const field = spellCmd.field || spellSession.field;
        const detail = { ...spellCmd, field, utterance: raw };
        if (spellCmd.action === 'start') {
          spellSession = { field };
          setStatus(`Spelling ${field}. Say letters, "dot", "backspace", "stop spelling".`, 2500);
        } else if (spellCmd.action === 'stop') {
          spellSession = null;
          setStatus('Stopped spelling. Say your wake word for other commands.', 3000);
        }
        announceCommand(detail);
        dispatchVoiceCommand(detail);
      }
      return;
    }

    if (heardWake) {
      awakeUntil = Date.now() + WAKE_WINDOW_MS;
      setStatus('Wake word detected. Listening briefly...', WAKE_WINDOW_MS);
    }

    const isAwake = Date.now() < awakeUntil;
    if (!isAwake && !heardWake) {
      // Ignore chatter when not awake; do not surface transcripts.
      return;
    }

    let cmd = parseCommand(raw);
    // Allow follow-up commands within the wake window without repeating wake word
    if (!cmd && isAwake) {
      const wakePrefixed = trimmedRaw.startsWith(wakeWord) ? trimmedRaw : `${wakeWord} ${trimmedRaw}`;
      cmd = parseCommand(wakePrefixed);
    }
    let usedRemote = false;
    if (!cmd && isAwake) {
      cmd = await interpretTranscriptRemote(trimmedRaw);
      usedRemote = Boolean(cmd);
    }
    if (!cmd) {
      // Stay quiet until we recognise a command to avoid showing stray transcripts.
      return;
    }
    // Extend wake window on each recognised command
    awakeUntil = 0; // close window after handling a command
    setStatus(
      `Command: ${cmd.type}${cmd.query ? ` "${cmd.query}"` : ''}${cmd.tag ? ` "${cmd.tag}"` : ''}${
        Array.isArray(cmd.tags) ? ` [${cmd.tags.join(', ')}]` : ''
      }${usedRemote ? ' (remote)' : ''}`,
      2500
    );
    announceCommand(cmd);
    if (cmd.type === 'spell' && cmd.action === 'start') {
      spellSession = { field: cmd.field || 'email' };
      setStatus(`Spelling ${spellSession.field}. Say letters, "dot", "backspace", "stop spelling".`, 2500);
    }
    if (cmd.type === 'spell' && cmd.action === 'stop') {
      spellSession = null;
      setStatus('Stopped spelling. Say your wake word for other commands.', 3000);
    }
    dispatchVoiceCommand(cmd);
    // Reset the recognizer to avoid concatenating subsequent sentences.
    listener.stop();
    setTimeout(() => listener.start(), 200);
  }
})();
