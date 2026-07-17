import { navigationIntents, settingsIntents } from './intent-registry.js';

const DEFAULT_WAKE_WORD = 'hey platform';
const SETTINGS_KEY = 'appSettings';
const ratingWords = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const normaliseTag = (text = '') => text.trim().replace(/\b\w/g, (c) => c.toUpperCase());
const normaliseField = (text = '') => {
  const f = String(text || '').toLowerCase().replace(/e[-\s]?mail/g, 'email');
  if (f.includes('user')) return 'username';
  if (f.includes('identifier') || f.includes('login')) return 'identifier';
  if (f.includes('email')) return 'email';
  if (f.includes('confirm')) return 'confirm';
  return 'password';
};

const navigation = [
  [/^go( to)? home$/, () => ({ type: 'navigate', target: 'home' })],
  [/^(open )?(filters|filter panel)$/, () => ({ type: 'ui', target: 'filters', action: 'open' })],
  [/^(open )?favourites?$/, () => ({ type: 'navigate', target: 'favourites' })],
  [/^(go to|open) search$/, () => ({ type: 'navigate', target: 'search' })],
  [/^(open|show) (commands|voice commands)$/, () => ({ type: 'commands', action: 'open' })],
  [/^(close|hide) (commands|voice commands)$/, () => ({ type: 'commands', action: 'close' })],
  [/^(go to|open) profile$/, () => ({ type: 'navigate', target: 'profile' })],
  [/^(go to|open|show) login$/, () => ({ type: 'navigate', target: 'login' })],
  [/^(go to|open|show) (sign up|signup|register)$/, () => ({ type: 'navigate', target: 'signup' })],
  [/^next page$/, () => ({ type: 'navigate', target: 'next-page' })],
  [/^back$/, () => ({ type: 'navigate', target: 'back' })],
  [/^open settings$/, () => ({ type: 'navigate', target: 'settings' })]
];

const searches = [
  [/^(search for |search )(.+)/, (q) => ({ type: 'search', query: q })],
  [/^(find )(.+)/, (q) => ({ type: 'search', query: q })],
  [/^look for (.+)/, (q) => ({ type: 'search', query: q })]
];

const home = [
  [/^(open|view|show)( the)? (current|featured|main) game$/, () => ({ type: 'home', action: 'open-featured' })]
];

const filters = [
  [/^filter by hearing$/, () => ({ type: 'filter', tag: 'Hearing' })],
  [/^filter by motor$/, () => ({ type: 'filter', tag: 'Motor' })],
  [/^filter by vision$/, () => ({ type: 'filter', tag: 'Vision' })],
  [/^filter by speech$/, () => ({ type: 'filter', tag: 'Speech' })],
  [/^filter by cognitive$/, () => ({ type: 'filter', tag: 'Cognitive' })],
  [/^show only one[- ]handed games$/, () => ({ type: 'filter', tag: 'One-Handed' })],
  [/^(reset|clear) (all )?(filters|filter)$/, () => ({ type: 'reset-filters' })],
  // Generic filter capture: "apply filter puzzle", "filter by action", "apply filters hearing"
  [/^(apply (the )?filters?|filter by|filter)\s+(.+)/, (tagText) => {
    const cleaned = String(tagText || '').replace(/[.,!?]/g, ' ').trim();
    if (!cleaned) return null;
    // Support multiple tags: split on commas or " and "
    const parts = cleaned
      .split(/(?:\band\b|,)/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) return { type: 'filter', tags: parts };
    return { type: 'filter', tag: parts[0] };
  }]
];

const uiOpeners = [
  [
    /^(open|expand)\s+(?:the\s+)?(vision|hearing|motor|speech|cognitive)(?:\s+(?:category|filter|filters|dropdown|panel))?$/i,
    (cat) => ({
      type: 'ui',
      target: 'category',
      action: 'open',
      value: String(cat || '').trim()
    })
  ],
  [
    /^(close|collapse)\s+(?:the\s+)?(vision|hearing|motor|speech|cognitive)(?:\s+(?:category|filter|filters|dropdown|panel))?$/i,
    (cat) => ({
      type: 'ui',
      target: 'category',
      action: 'close',
      value: String(cat || '').trim()
    })
  ],
  [/^(open|show)\s+(?:the\s+)?(genre)(?:\s+(?:dropdown|menu|selector))?$/i, () => ({ type: 'ui', target: 'dropdown', action: 'open', value: 'genre' })],
  [/^(open|show)\s+(?:the\s+)?(sort|sort by)(?:\s+(?:dropdown|menu|selector))?$/i, () => ({ type: 'ui', target: 'dropdown', action: 'open', value: 'sort' })],
  [/^(close|hide)\s+(?:the\s+)?(genre)(?:\s+(?:dropdown|menu|selector))?$/i, () => ({ type: 'ui', target: 'dropdown', action: 'close', value: 'genre' })],
  [/^(close|hide)\s+(?:the\s+)?(sort|sort by)(?:\s+(?:dropdown|menu|selector))?$/i, () => ({ type: 'ui', target: 'dropdown', action: 'close', value: 'sort' })]
];

const sorters = [
  [/^sort by (relevance|relevant)$/, () => ({ type: 'sort', value: 'relevance' })],
  [/^sort by (newest|latest)$/, () => ({ type: 'sort', value: 'newest' })],
  [/^sort by (rating|top rating|top rated)$/, () => ({ type: 'sort', value: 'rating' })],
  [/^sort by (title|name|a to z|a-z|alphabetical)$/, () => ({ type: 'sort', value: 'title' })]
];

const gameCards = [
  // e.g., "select game aurora quest", "focus aurora quest"
  [/^(select|focus) (?:the )?(?:game|title|card )?(.*)/, (title) => {
    const cleaned = (title || '').trim();
    if (!cleaned) return null;
    return { type: 'game-card', action: 'focus', title: cleaned };
  }],
  [/^(open|launch|show) (?:the )?(?:game|title|card )?(.*)/, (title) => {
    const cleaned = (title || '').trim();
    if (!cleaned) return null;
    return { type: 'game-card', action: 'open', title: cleaned };
  }]
];

const gameActions = [
  [/^add to watchlist$/, () => ({ type: 'game', action: 'add-to-watchlist' })],
  [/^(open )?reviews$/, () => ({ type: 'game', action: 'open-reviews' })],
  [/^(open|show) (a )?review$/, () => ({ type: 'game', action: 'write-review' })],
  [/^scroll down$/, () => ({ type: 'scroll', direction: 'down' })],
  [/^scroll up$/, () => ({ type: 'scroll', direction: 'up' })],
  [/^follow( game)?$/, () => ({ type: 'game', action: 'follow' })],
  [/^unfollow( game)?$/, () => ({ type: 'game', action: 'unfollow' })],
  [/^(write|add|leave|start) (a )?review$/, () => ({ type: 'game', action: 'write-review' })],
  [/^(open|show) review$/, () => ({ type: 'game', action: 'write-review' })],
  [/^(set|change) (a|the )?(rating|score)( to)? ([1-5])(?:\\b.*)?$/, (value) => ({ type: 'game', action: 'set-review-rating', value: Number(value) })],
  [/^(rating|score) ([1-5])$/, (value) => ({ type: 'game', action: 'set-review-rating', value: Number(value) })],
  [/^(set|change) (a|the )?(rating|score)( to)? (one|two|three|four|five)(?:\\b.*)?$/, (word) => {
    const w = (word || '').toLowerCase();
    const val = ratingWords[w];
    return val ? { type: 'game', action: 'set-review-rating', value: val } : null;
  }],
  [/^(comment|write|type)[, ]+(?:this )?(.+)$/, (text) => {
    const body = (text || '').trim();
    if (!body) return null;
    return { type: 'game', action: 'set-review-comment', value: body };
  }],
  [/^(right|write|type) comment[, ]+(?:this )?(.+)$/, (text) => {
    const body = (text || '').trim();
    if (!body) return null;
    return { type: 'game', action: 'set-review-comment', value: body };
  }],
  [/^focus (the )?(comment|textarea)$/, () => ({ type: 'game', action: 'focus-review-comment' })],
  [/^(submit|post) review$/, () => ({ type: 'game', action: 'submit-review' })],
  [/^(cancel|close) review$/, () => ({ type: 'game', action: 'cancel-review' })],
  [/^download( game)?$/, () => ({ type: 'game', action: 'download' })],
  [/^(add to )?wishlist$/, () => ({ type: 'game', action: 'wishlist' })],
  [/^report( game)?$/, () => ({ type: 'game', action: 'report' })],
  [/^(next|forward) (image|screenshot|slide)$/, () => ({ type: 'game', action: 'next-image' })],
  [/^(previous|prev|back) (image|screenshot|slide)$/, () => ({ type: 'game', action: 'prev-image' })],
  [/^(next|forward) (gallery|carousel)$/, () => ({ type: 'game', action: 'next-additional' })],
  [/^(previous|prev|back) (gallery|carousel)$/, () => ({ type: 'game', action: 'prev-additional' })]
];

const passwordActions = [
  [/^(confirm|submit|update)\s+password$/, () => ({ type: 'profile', action: 'submit-password' })],
  [/^(confirm|submit|update)\s+change\s+password$/, () => ({ type: 'profile', action: 'submit-password' })],
  [/^(cancel|close)\s+(?:password|change\s+password)$/i, () => ({ type: 'profile', action: 'cancel-password' })],
];

const authActions = [
  // Navigation aliases
  [/^(log in|login|sign in)$/, () => ({ type: 'navigate', target: 'login' })],
  [/^(sign up|signup|register)$/, () => ({ type: 'navigate', target: 'signup' })],
  [/^spell (e-?mail|email|password|username|user name|login|identifier|confirm(?:ed)? password|confirm|repeat password)$/, (_, field) => ({
    type: 'spell',
    action: 'start',
    field: normaliseField(field)
  })],
  [/^(stop|end|finish) spelling$/, () => ({ type: 'spell', action: 'stop' })],
  // Focus a specific field before dictation
  [/^(focus|select|go to)\s+(username|user name)$/, () => ({ type: 'auth', action: 'focus', field: 'username', form: 'signup' })],
  [/^(focus|select|go to)\s+(email|email address)$/, () => ({ type: 'auth', action: 'focus', field: 'email' })],
  [/^(focus|select|go to)\s+(identifier|login|login field)$/, () => ({ type: 'auth', action: 'focus', field: 'identifier', form: 'login' })],
  [/^(focus|select|go to)\s+(password)$/, () => ({ type: 'auth', action: 'focus', field: 'password' })],
  [/^(focus|select|go to)\s+(confirm|confirm password|repeat password)$/, () => ({
    type: 'auth',
    action: 'focus',
    field: 'confirm',
    form: 'signup'
  })],
  // Dictate into the last focused field
  [/^(type|enter|dictate|write|fill in)\s+(.+)/, (_, value) => ({ type: 'auth', action: 'type', value: (value || '').trim() })],
  // Field setting
  [/^(set|fill|enter|type)\s+(email address|email|username|user name|identifier)\s+(.+)/, (_, field, value) => {
    const normField = field.includes('user') || field === 'username' ? 'username' : field.includes('identifier') ? 'identifier' : 'email';
    const form = normField === 'username' ? 'signup' : undefined;
    const raw = (value || '').trim();
    const cleaned = raw.replace(/^to\s+/i, '').trim();
    return { type: 'auth', action: 'set-field', field: normField === 'email' ? 'email' : normField, value: cleaned, form };
  }],
  [/^(set|fill|enter|type)\s+password\s+(.+)/, (_, value) => ({ type: 'auth', action: 'set-field', field: 'password', value: (value || '').trim() })],
  [/^(set|fill|enter|type)\s+(confirm|confirm password|repeat password)\s+(.+)/, (_, __, value) => ({
    type: 'auth',
    action: 'set-field',
    field: 'confirm',
    value: (value || '').trim(),
    form: 'signup'
  })],
  // Submit / clear
  [/^(submit|send|confirm)\s+(login|log in|sign in)$/, () => ({ type: 'auth', action: 'submit', form: 'login' })],
  [/^(submit|send|confirm)\s+(sign up|signup|register|registration)$/, () => ({ type: 'auth', action: 'submit', form: 'signup' })],
  [/^(clear|reset)\s+(form|login|sign up|signup|register)$/, (_, target) => ({
    type: 'auth',
    action: 'clear',
    form: target.includes('login') ? 'login' : target.includes('sign') || target.includes('register') ? 'signup' : undefined
  })]
];

// Forgiving keyword map to recover a filter intent from noisy phrases
const KEYWORD_FILTERS = [
  { keywords: ['hearing'], tag: 'Hearing' },
  { keywords: ['motor'], tag: 'Motor' },
  { keywords: ['vision', 'visual'], tag: 'Vision' },
  { keywords: ['speech', 'voice'], tag: 'Speech' },
  { keywords: ['cognitive', 'cognition'], tag: 'Cognitive' },
  { keywords: ['colorblind', 'colourblind', 'color blind', 'colour blind'], tag: 'Colourblind Mode' },
  { keywords: ['high contrast'], tag: 'High Contrast' },
  { keywords: ['large text'], tag: 'Large Text' },
  { keywords: ['screen reader'], tag: 'Screen Reader Friendly' },
  { keywords: ['no audio', 'no sound'], tag: 'No Audio Needed' },
  { keywords: ['no voice'], tag: 'No Voice Required' },
  { keywords: ['one handed', 'one hand'], tag: 'One-Handed' },
  // Genres
  { keywords: ['puzzle'], tag: 'Puzzle' },
  { keywords: ['action'], tag: 'Action' },
  { keywords: ['rpg'], tag: 'RPG' },
  { keywords: ['platformer'], tag: 'Platformer' },
  { keywords: ['strategy'], tag: 'Strategy' },
  { keywords: ['casual'], tag: 'Casual' },
  { keywords: ['adventure'], tag: 'Adventure' }
];

function forgivingFilterMatch(command) {
  const hasFilterWord = /\b(filter|filters|apply)\b/.test(command);
  if (!hasFilterWord) return null;
  for (const entry of KEYWORD_FILTERS) {
    if (entry.keywords.some((k) => command.includes(k))) {
      return { type: 'filter', tag: entry.tag };
    }
  }
  return null;
}

function getWakeWord() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_WAKE_WORD;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.wakeWordEnabled === false) return DEFAULT_WAKE_WORD;
    const ww = (parsed && parsed.wakeWord) ? String(parsed.wakeWord).trim() : '';
    return ww ? ww.toLowerCase() : DEFAULT_WAKE_WORD;
  } catch (e) {
    console.warn('[voice] failed to read wake word, using default', e);
    return DEFAULT_WAKE_WORD;
  }
}

function stripWakeWord(input = '') {
  // Normalise punctuation so variants like "hey, platform. ..." are accepted.
  const wakeWord = getWakeWord();
  const normalised = input.toLowerCase().replace(/[.,!?]/g, '').trim();
  if (!normalised.startsWith(wakeWord)) return null;
  return normalised.slice(wakeWord.length).trim();
}

function levenshtein(a, b) {
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
}

function stripWakeWordLoose(input = '') {
  const wakeWord = getWakeWord();
  const normalised = input.toLowerCase().replace(/[.,!?]/g, '').trim();
  // Allow a few mistakes (e.g., "hay plaform") based on wake word length
  const tolerance = Math.max(2, Math.ceil(wakeWord.length * 0.25));
  const slice = normalised.slice(0, wakeWord.length + tolerance);
  const distance = levenshtein(slice.slice(0, wakeWord.length), wakeWord);
  if (distance <= tolerance) return normalised.slice(wakeWord.length).trim();
  return null;
}

function match(command, matchers) {
  for (const [regex, build] of matchers) {
    const m = command.match(regex);
    if (m) {
      const captures = m.slice(1).filter(Boolean);
      const primary = captures.length ? captures[captures.length - 1] : command;
      const result = build(primary, m);
      if (result) return result;
    }
  }
  return null;
}

function matchRegisteredIntents(command, registry) {
  const normalised = command.toLowerCase().trim();
  for (const entry of registry) {
    for (const utterance of entry.utterances) {
      if (normalised === utterance.toLowerCase().trim()) {
        return { ...entry.intent, utterance: command };
      }
    }
  }
  return null;
}

function fuzzyRegistryMatch(command, registry) {
  const target = command.toLowerCase().trim();
  let best = null;
  for (const entry of registry) {
    for (const utterance of entry.utterances) {
      const candidate = utterance.toLowerCase().trim();
      const dist = levenshtein(target, candidate);
      const tolerance = Math.max(2, Math.ceil(candidate.length * 0.25));
      if (dist <= tolerance) {
        if (!best || dist < best.dist) {
          best = { dist, intent: { ...entry.intent, utterance: command } };
        }
      }
    }
  }
  return best ? best.intent : null;
}

function fuzzyPhraseMatch(command, entries) {
  const normalized = command.toLowerCase().trim();
  let best = null;

  for (const entry of entries) {
    for (const phrase of entry.phrases) {
      const target = phrase.toLowerCase().trim();
      const slice = normalized.slice(0, target.length);
      const dist = levenshtein(slice, target);
      const tolerance = Math.max(1, Math.ceil(target.length * (entry.tolerance || 0.25)));
      if (dist <= tolerance) {
        if (!best || dist < best.dist) {
          best = { dist, phrase: target, entry };
        }
      }
    }
  }

  if (!best) return null;
  return best.entry.build(best.phrase, command);
}

function ratingFallback(command) {
  const lowered = command.toLowerCase();
  if (!/\brating\b|\bscore\b/.test(lowered)) return null;
  const digit = lowered.match(/\b([1-5])\b/);
  if (digit) return { type: 'game', action: 'set-review-rating', value: Number(digit[1]) };
  const word = lowered.match(/\b(one|two|three|four|five)\b/);
  if (word) {
    const val = ratingWords[word[1]];
    if (val) return { type: 'game', action: 'set-review-rating', value: val };
  }
  return null;
}

function basicFallback(command) {
  const c = command.toLowerCase().trim();
  if (c === 'next') return { type: 'basic', action: 'next' };
  if (c === 'previous' || c === 'prev') return { type: 'basic', action: 'previous' };
  if (c === 'scroll down' || c === 'down') return { type: 'scroll', direction: 'down' };
  if (c === 'scroll up' || c === 'up') return { type: 'scroll', direction: 'up' };
  if (c === 'go back') return { type: 'navigate', target: 'back' };
  if (c === 'open') return { type: 'basic', action: 'open' };
  if (c === 'select') return { type: 'basic', action: 'select' };
  return null;
}

function textSizeFallback(command) {
  // Catch noisy phrases like "can you set text size maybe medium"
  const sizeHit = command.match(/\b(text size|font size).*\b(small|medium|large)\b/);
  if (sizeHit) {
    return { type: 'settings', action: 'set-text-size', value: sizeHit[2] };
  }
  return null;
}

function buttonSizeFallback(command) {
  // e.g., "make the buttons extra large", "set button size normal"
  const lower = command.toLowerCase();
  if (lower.includes('extra large') || lower.includes('extra-large') || lower.includes('xlarge')) {
    return { type: 'settings', action: 'set-button-size', value: 'xlarge' };
  }
  const hit = command.match(/\b(buttons?|button size)\b.*\b(normal|large)\b/);
  if (!hit) return null;
  const raw = hit[2];
  const value = raw === 'normal' ? 'normal' : 'large';
  return { type: 'settings', action: 'set-button-size', value };
}

function spacingFallback(command) {
  // e.g., "set spacing to extra room", "make spacing tighter"
  const hit = command.match(/\bspacing\b.*\b(tight|snug|roomy|roomie|normal|extra[ -]?room|wide|wider)\b/);
  if (!hit) return null;
  const raw = hit[1];
  if (raw.includes('extra room')) return { type: 'settings', action: 'set-spacing', value: 'airy' };
  if (raw === 'tight' || raw === 'snug' || raw === 'wider') return { type: 'settings', action: 'set-spacing', value: 'snug' };
  if (raw === 'roomy' || raw === 'roomie' || raw === 'normal' || raw === 'wide') return { type: 'settings', action: 'set-spacing', value: 'roomy' };
  return { type: 'settings', action: 'set-spacing', value: 'airy' };
}

function wakeWordFallback(command) {
  // e.g., "change wake word to astra", "set wakeword voyager"
  const hit = command.match(/\bwake ?word\b.*\b(?:to )?([a-z0-9\s'-]{2,20})$/i);
  if (!hit) return null;
  const raw = hit[1].trim();
  if (!raw) return null;
  const word = raw.split(/\s+/).join(' ').toLowerCase();
  return { type: 'settings', action: 'set-wake-word', value: word };
}

// Curated phrases for page-level commands to allow tolerant matching without heavy overlap.
const FUZZY_COMMANDS = [
  { phrase: 'follow game', intent: { type: 'game', action: 'follow' } },
  { phrase: 'unfollow game', intent: { type: 'game', action: 'unfollow' } },
  { phrase: 'add to wishlist', intent: { type: 'game', action: 'wishlist' } },
  { phrase: 'open reviews', intent: { type: 'game', action: 'open-reviews' } },
  { phrase: 'write review', intent: { type: 'game', action: 'write-review' } },
  { phrase: 'submit review', intent: { type: 'game', action: 'submit-review' } },
  { phrase: 'cancel review', intent: { type: 'game', action: 'cancel-review' } },
  { phrase: 'report game', intent: { type: 'game', action: 'report' } },
  { phrase: 'next image', intent: { type: 'game', action: 'next-image' } },
  { phrase: 'previous image', intent: { type: 'game', action: 'prev-image' } },
  { phrase: 'next gallery', intent: { type: 'game', action: 'next-additional' } },
  { phrase: 'previous gallery', intent: { type: 'game', action: 'prev-additional' } },
  { phrase: 'edit profile', intent: { type: 'profile', action: 'edit-profile' } },
  { phrase: 'change password', intent: { type: 'profile', action: 'change-password' } },
  { phrase: 'save preferences', intent: { type: 'profile', action: 'save-preferences' } },
  { phrase: 'update profile', intent: { type: 'profile', action: 'update-profile' } },
  { phrase: 'cancel edit', intent: { type: 'profile', action: 'cancel-edit' } },
  { phrase: 'cancel password', intent: { type: 'profile', action: 'cancel-password' } },
  { phrase: 'focus stats', intent: { type: 'profile', action: 'focus', target: 'stats' } },
  { phrase: 'focus reviews', intent: { type: 'profile', action: 'focus', target: 'reviews' } },
  { phrase: 'focus followed games', intent: { type: 'profile', action: 'focus', target: 'followed' } },
  { phrase: 'show voice commands', intent: { type: 'commands', action: 'open' } },
  { phrase: 'hide voice commands', intent: { type: 'commands', action: 'close' } }
];

function fuzzyCommandMatch(command) {
  const normalized = command.toLowerCase().trim();
  let best = null;
  for (const entry of FUZZY_COMMANDS) {
    const target = entry.phrase.toLowerCase().trim();
    const tolerance = Math.max(1, Math.ceil(target.length * 0.25));
    const slice = normalized.slice(0, target.length + tolerance);
    const dist = levenshtein(slice.slice(0, target.length), target);
    if (dist <= tolerance) {
      if (!best || dist < best.dist) {
        best = { dist, intent: { ...entry.intent, utterance: command } };
      }
    }
  }
  return best ? best.intent : null;
}

export function parseCommand(rawTranscript) {
  let command = stripWakeWord(rawTranscript);
  if (!command) command = stripWakeWordLoose(rawTranscript);
  if (!command) return null;

  // Handle UI openers early and prefer ones that explicitly mention dropdown/panel/filter.
  const uiMatchEarly = match(command, uiOpeners);
  if (uiMatchEarly) return { ...uiMatchEarly, utterance: command };

  const registryMatch = matchRegisteredIntents(command, [...navigationIntents, ...settingsIntents]);
  if (registryMatch) return registryMatch;

  const fuzzyRegistry = fuzzyRegistryMatch(command, [...navigationIntents, ...settingsIntents]);
  if (fuzzyRegistry) return fuzzyRegistry;

  const result =
    match(command, navigation) ||
    match(command, searches) ||
    match(command, home) ||
    match(command, filters) ||
    match(command, uiOpeners) ||
    match(command, sorters) ||
    match(command, gameActions) ||
    match(command, gameCards) ||
    ratingFallback(command) ||
    basicFallback(command) ||
    match(command, passwordActions) ||
    match(command, authActions) ||
    textSizeFallback(command) ||
    buttonSizeFallback(command) ||
    spacingFallback(command) ||
    wakeWordFallback(command) ||
    forgivingFilterMatch(command) ||
    fuzzyCommandMatch(command);

  if (result) return { ...result, utterance: command };

  const fuzzyIntent = fuzzyPhraseMatch(command, [
    {
      phrases: ['search for', 'search', 'find', 'look for', 'show', 'show me'],
      build: (phrase, cmd) => {
        const remainder = cmd.replace(new RegExp(`^${phrase}\\s*`, 'i'), '').trim();
        return { type: 'search', query: remainder || cmd };
      }
    },
    {
      phrases: ['filter by', 'apply filter', 'apply filters', 'filter'],
      build: (phrase, cmd) => {
        const remainder = cmd.replace(new RegExp(`^${phrase}\\s*`, 'i'), '').trim();
        if (!remainder) return { type: 'filter', tags: [] };
        const parts = remainder
          .split(/(?:\band\b|,)/i)
          .map((p) => p.trim())
          .filter(Boolean)
          .map(normaliseTag);
        if (!parts.length) return { type: 'filter', tags: [] };
        if (parts.length > 1) return { type: 'filter', tags: parts };
        return { type: 'filter', tag: parts[0] };
      }
    },
    {
      phrases: ['reset filters', 'clear filters', 'reset filter', 'clear filter'],
      build: () => ({ type: 'reset-filters' })
    },
    {
      phrases: ['scroll down', 'scroll up', 'page down', 'page up'],
      build: (phrase) => ({ type: 'scroll', direction: phrase.includes('up') ? 'up' : 'down' })
    },
    {
      phrases: ['open filters', 'filter panel', 'filters panel'],
      build: () => ({ type: 'ui', target: 'filters', action: 'open' })
    },
    {
      phrases: ['focus username', 'focus user name'],
      build: () => ({ type: 'auth', action: 'focus', field: 'username', form: 'signup' })
    },
    {
      phrases: ['focus email', 'focus email address'],
      build: () => ({ type: 'auth', action: 'focus', field: 'email' })
    },
    {
      phrases: ['focus login', 'focus identifier'],
      build: () => ({ type: 'auth', action: 'focus', field: 'identifier', form: 'login' })
    },
    {
      phrases: ['focus password'],
      build: () => ({ type: 'auth', action: 'focus', field: 'password' })
    },
    {
      phrases: ['focus confirm', 'focus confirm password', 'focus repeat password'],
      build: () => ({ type: 'auth', action: 'focus', field: 'confirm', form: 'signup' })
    },
    {
      phrases: ['type', 'enter', 'dictate', 'write'],
      tolerance: 0.3,
      build: (phrase, cmd) => {
        const remainder = cmd.replace(new RegExp(`^${phrase}\\s*`, 'i'), '').trim();
        if (!remainder) return null;
        return { type: 'auth', action: 'type', value: remainder };
      }
    },
    {
      phrases: ['log in', 'login', 'sign in'],
      build: () => ({ type: 'navigate', target: 'login' })
    },
    {
      phrases: ['sign up', 'signup', 'register'],
      build: () => ({ type: 'navigate', target: 'signup' })
    },
    {
      phrases: ['submit login', 'submit log in', 'submit sign in', 'send login'],
      build: (_, cmd) => {
        if (/\breview\b/.test(cmd)) return null; // avoid hijacking game review submissions
        return { type: 'auth', action: 'submit', form: 'login' };
      }
    },
    {
      phrases: ['submit signup', 'submit sign up', 'submit register', 'send sign up'],
      build: (_, cmd) => {
        if (/\breview\b/.test(cmd)) return null;
        return { type: 'auth', action: 'submit', form: 'signup' };
      }
    },
    {
      phrases: [
        'sort by relevance',
        'sort by newest',
        'sort by latest',
        'sort by rating',
        'sort by title',
        'sort by name',
        'sort by a to z'
      ],
      build: (phrase) => {
        if (phrase.includes('relevance')) return { type: 'sort', value: 'relevance' };
        if (phrase.includes('newest') || phrase.includes('latest')) return { type: 'sort', value: 'newest' };
        if (phrase.includes('rating')) return { type: 'sort', value: 'rating' };
        return { type: 'sort', value: 'title' };
      }
    }
  ]);
  return fuzzyIntent ? { ...fuzzyIntent, utterance: command } : null;
}

export { DEFAULT_WAKE_WORD, getWakeWord };
