import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Search from '../pages/Search';
import { loadSettings } from '../settings';

vi.mock('../api', () => ({
  fetchGames: vi.fn(() => Promise.resolve([])),
  fetchTagGroups: vi.fn(() => Promise.resolve({ groups: [] })),
  searchGames: vi.fn(() => Promise.resolve([]))
}));

// Helper to mock settings
const mockSettings = (overrides = {}) => ({
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
  reduceMotion: false,
  ...overrides
});

vi.mock('../settings', () => ({
  loadSettings: vi.fn(() => mockSettings())
}));

describe('Search theming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSettings.mockImplementation(() => mockSettings());
  });

  it('applies dark mode class to page root', () => {
    loadSettings.mockImplementation(() => mockSettings({ theme: 'dark' }));
    render(<MemoryRouter><Search /></MemoryRouter>);
    const root = screen.getByRole('main').parentElement;
    expect(root.className).toContain('bg-slate-900');
  });

  it('applies high contrast to filters and tags', async () => {
    loadSettings.mockImplementation(() => mockSettings({ highContrastMode: true }));
    render(<MemoryRouter><Search /></MemoryRouter>);
    const filters = await screen.findAllByRole('group', { name: /filters/i });
    const anyLime = filters.some(node => /border-lime/i.test(node.className));
    expect(anyLime).toBe(true);
  });

  it('applies spacing choice to tag chips', () => {
    loadSettings.mockImplementation(() => mockSettings({ spacing: 'airy' }));
    render(<MemoryRouter><Search /></MemoryRouter>);
    const headings = screen.getAllByText(/Disability Categories/i);
    const containers = headings
      .map(h => h.parentElement?.querySelector('div.mt-2'))
      .filter(Boolean);
    const hasAiryGap = containers.some(node => (node.className || '').includes('gap-6'));
    expect(hasAiryGap).toBe(true);
  });
});
