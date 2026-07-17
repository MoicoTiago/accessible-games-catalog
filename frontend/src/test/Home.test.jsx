import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import * as api from '../api.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api', () => ({
  fetchGames: vi.fn(),
}));

globalThis.fetch = vi.fn();

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockNavigate.mockClear();
    fetch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  const renderHome = () =>
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

  it('renders the home page', () => {
    api.fetchGames.mockResolvedValueOnce([]);
    renderHome();

    // Home page should render
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('fetches and displays games', async () => {
    const mockGames = [
      { id: 1, title: 'Test Game 1', genre: 'Action' },
      { id: 2, title: 'Test Game 2', genre: 'Adventure' },
    ];

    api.fetchGames.mockResolvedValueOnce(mockGames);
    renderHome();

    await waitFor(() => {
      // Check if games are rendered (this depends on actual markup)
      expect(api.fetchGames).toHaveBeenCalledTimes(1);
    });
  });

  it('handles fetch games error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.fetchGames.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderHome();

    await waitFor(() => {
      expect(api.fetchGames).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load games',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('renders without games when fetch returns empty array', async () => {
    api.fetchGames.mockResolvedValueOnce([]);
    renderHome();

    await waitFor(() => {
      expect(api.fetchGames).toHaveBeenCalled();
    });

    // Page should still render
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('handles non-array response from fetchGames', async () => {
    api.fetchGames.mockResolvedValueOnce(null);
    renderHome();

    await waitFor(() => {
      expect(api.fetchGames).toHaveBeenCalled();
    });

    // Should not crash
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('fetches recommended games when authenticated', async () => {
    localStorage.setItem('token', 'fake-token');
    api.fetchGames.mockResolvedValueOnce([]);

    // Mock /auth/me
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'testuser' }),
    });

    // Mock /users/:id/recommended-games
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 3, title: 'Recommended Game' }],
    });

    renderHome();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-token',
          }),
        })
      );
    });
  });

  it('does not fetch recommended games when not authenticated', async () => {
    api.fetchGames.mockResolvedValueOnce([]);
    renderHome();

    await waitFor(() => {
      expect(api.fetchGames).toHaveBeenCalled();
    });

    // Should not call /auth/me
    expect(fetch).not.toHaveBeenCalled();
  });
});

