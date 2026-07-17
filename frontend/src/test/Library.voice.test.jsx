import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api.js', () => ({
  fetchCurrentUser: vi.fn(),
  getGame: vi.fn(),
}));

import Library from '../pages/Library.jsx';
import { fetchCurrentUser, getGame } from '../api.js';

describe('Library voice interactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    // Default user and game responses
    fetchCurrentUser.mockResolvedValue({ id: 1, username: 'alice' });
    getGame.mockImplementation(async (id) => ({
      id,
      name: id === 101 ? 'Fav Game' : 'Wish Game',
      title: id === 101 ? 'Fav Game' : 'Wish Game',
      rating: 4.2,
      tags: id === 101 ? ['Puzzle'] : ['Action'],
      images: [],
      reviews: [],
    }));
    localStorage.setItem('token', 'fake');
    localStorage.setItem('favourites:1', JSON.stringify([{ id: 101 }]));
    localStorage.setItem('wishlist:1', JSON.stringify([{ id: 202 }]));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const renderLibrary = () =>
    render(
      <MemoryRouter initialEntries={['/library']}>
        <Library />
      </MemoryRouter>
    );

  it('switches tabs via voice navigate and shows wishlist items', async () => {
    renderLibrary();
    await waitFor(() => expect(screen.getByText('Fav Game')).toBeInTheDocument());

    window.dispatchEvent(new CustomEvent('voiceCommand', { detail: { type: 'navigate', target: 'wishlist' } }));

    await waitFor(() => {
      expect(screen.getByText('Wish Game')).toBeInTheDocument();
      expect(screen.queryByText('Fav Game')).not.toBeInTheDocument();
    });
  });

  it('opens filters and adds tag via voice filter command', async () => {
    renderLibrary();
    await waitFor(() => expect(screen.getByText('Fav Game')).toBeInTheDocument());

    window.dispatchEvent(new CustomEvent('voiceCommand', { detail: { type: 'filter', tags: ['Puzzle'] } }));

    await waitFor(() => {
      const filtersPanel = document.getElementById('lib-filters');
      expect(filtersPanel).toBeInTheDocument();
      const tagBtn = screen.getByRole('button', { name: 'Puzzle' });
      expect(tagBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('removes item from wishlist via voice remove command', async () => {
    renderLibrary();
    await waitFor(() => expect(screen.getByText('Fav Game')).toBeInTheDocument());

    // Switch to wishlist first via click to avoid debounce interference
    screen.getByText('Wishlist').click();
    await waitFor(() => expect(screen.getByText('Wish Game')).toBeInTheDocument());

    window.dispatchEvent(
      new CustomEvent('voiceCommand', {
        detail: { type: 'library', action: 'remove', list: 'wishlist', title: 'Wish Game' },
      })
    );

    await waitFor(() => expect(screen.queryByText('Wish Game')).not.toBeInTheDocument());
  });
});
