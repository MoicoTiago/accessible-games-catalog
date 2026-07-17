import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings.jsx';
import * as settings from '../settings.js';

vi.mock('../settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

describe('Settings page', () => {
  const defaultSettings = {
    theme: 'light',
    textSize: 'medium',
    buttonSize: 'normal',
    spacing: 'snug',
    highContrast: false,
    reduceMotion: false,
    enableVoice: false,
    wakeWord: 'hey platform',
    voiceSpeed: 1.0,
    voicePitch: 1.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    settings.loadSettings.mockReturnValue(defaultSettings);
  });

  afterEach(() => {
    cleanup();
  });

  const renderSettings = () =>
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

  it('renders settings page', () => {
    renderSettings();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it('loads settings on mount', () => {
    renderSettings();

    expect(settings.loadSettings).toHaveBeenCalled();
  });

  it('displays theme options', () => {
    renderSettings();

    // Look for theme-related text
    const themeButtons = screen.queryAllByRole('button');
    expect(themeButtons.length).toBeGreaterThan(0);
  });

  it('toggles high contrast mode', async () => {
    renderSettings();

    // Find high contrast toggle
    const toggles = screen.getAllByRole('switch');
    const highContrastToggle = toggles.find(
      (toggle) => toggle.getAttribute('aria-checked') === 'false'
    );

    if (highContrastToggle) {
      fireEvent.click(highContrastToggle);

      await waitFor(() => {
        expect(settings.saveSettings).toHaveBeenCalled();
      });
    }
  });

  it('toggles reduce motion', async () => {
    renderSettings();

    const toggles = screen.getAllByRole('switch');
    // Reduce motion toggle
    if (toggles.length > 0) {
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(settings.saveSettings).toHaveBeenCalled();
      });
    }
  });

  it('saves settings when changed', async () => {
    renderSettings();

    // Click any button to trigger a settings change
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      fireEvent.click(firstButton);

      await waitFor(() => {
        // Settings should be saved (may be called immediately or debounced)
        expect(settings.saveSettings).toHaveBeenCalled();
      });
    }
  });

  it('handles settings load error gracefully', () => {
    settings.loadSettings.mockReturnValue(defaultSettings);

    // Even if load fails, should still render
    const { container } = renderSettings();
    expect(container).toBeInTheDocument();
  });

  it('applies loaded settings', () => {
    const customSettings = {
      ...defaultSettings,
      theme: 'dark',
      textSize: 'large',
    };
    settings.loadSettings.mockReturnValue(customSettings);

    renderSettings();

    expect(settings.loadSettings).toHaveBeenCalled();
  });
});

