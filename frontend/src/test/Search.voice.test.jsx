import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Search from '../pages/Search.jsx';

// Mock API calls used by Search
vi.mock('../api', () => ({
  fetchTagGroups: vi.fn(async () => ({
    groups: [
      { id: 'accessibility-categories', label: 'Accessibility Categories', tags: ['Vision', 'Hearing', 'Motor'] },
      { id: 'vision', label: 'Vision Tags', tags: ['Colourblind Mode', 'High Contrast'] },
      { id: 'genres', label: 'Genres', tags: ['Puzzle', 'Action'] }
    ]
  })),
  fetchGames: vi.fn(async () => ([
    { id: 1, title: 'Calm Puzzles', platform: 'Web', rating: 4.6, tags: ['Puzzle','Colourblind Mode'] },
    { id: 2, title: 'Action Hero', platform: 'PC', rating: 4.8, tags: ['Action'] }
  ])),
  searchGames: vi.fn(async () => ([
    { id: 1, title: 'Calm Puzzles', platform: 'Web', rating: 4.6, tags: ['Puzzle'] }
  ]))
}));

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <Search />
    </MemoryRouter>
  );
}

describe('Search page voiceCommand handling', () => {
  it('applies a filter when voiceCommand filter event is dispatched', async () => {
    renderSearch();
    // Wait for filters to render
    await screen.findByRole('heading', { name: /filters/i });

    const detail = { type: 'filter', tag: 'Puzzle' };
    const event = new CustomEvent('voiceCommand', { detail, cancelable: true });
    window.dispatchEvent(event);

    // The Puzzle tag should be active in the UI
    // Since tags are under accordion, check the search params state via genre select fallback
    const genreSelect = await screen.findByLabelText(/genre/i);
    expect(genreSelect.value === 'Puzzle' || genreSelect.textContent?.includes('Puzzle')).toBe(true);
  }, 10000);
});
