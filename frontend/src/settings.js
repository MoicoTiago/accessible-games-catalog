const SETTINGS_KEY = 'appSettings';

const defaultSettings = {
  textSize: 'medium',
  highContrastText: false,
  captionsAlways: true,
  visualAlerts: true,
  keyboardNav: true,
  focusIndicator: true,
  buttonSize: 'large',
  spacing: 'roomy',
  reducePrecision: true,
  wakeWordEnabled: true,
  wakeWord: 'Astra',
  theme: 'light',
  highContrastMode: false,
  reduceMotion: false
};

export function loadSettings() {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) || {};
    const theme = parsed.theme || defaultSettings.theme;
    const highContrastMode = Boolean(parsed.highContrastMode) || theme === 'high-contrast';
    return { ...defaultSettings, ...parsed, theme, highContrastMode };
  } catch (e) {
    console.warn('[settings] failed to parse, using defaults', e);
    return { ...defaultSettings };
  }
}

export function saveSettings(next = {}) {
  if (typeof window === 'undefined') return;
  try {
    const merged = { ...loadSettings(), ...next };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    try {
      window.dispatchEvent(new CustomEvent('settings:changed', { detail: merged }));
    } catch {}
    return merged;
  } catch (e) {
    console.warn('[settings] failed to save', e);
  }
}

export { defaultSettings, SETTINGS_KEY };
