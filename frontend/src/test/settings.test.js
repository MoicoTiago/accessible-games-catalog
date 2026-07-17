import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, defaultSettings } from '../settings';

// Simple localStorage stub per test
beforeEach(() => {
  const store = new Map();
  global.localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
});

describe('settings persistence', () => {
  it('returns defaults when storage is empty', () => {
    const loaded = loadSettings();
    expect(loaded).toEqual(defaultSettings);
  });

  it('saves and merges settings with defaults', () => {
    const firstSave = saveSettings({ theme: 'dark', spacing: 'airy' });
    expect(JSON.parse(localStorage.getItem('appSettings'))).toEqual(firstSave);

    const loaded = loadSettings();
    expect(loaded.theme).toBe('dark');
    expect(loaded.spacing).toBe('airy');
    // untouched values fall back to defaults
    expect(loaded.textSize).toBe(defaultSettings.textSize);
  });
});
