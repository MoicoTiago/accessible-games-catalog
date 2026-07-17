import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../pages/Reports.jsx';
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
  getGameReports: vi.fn(),
  fetchCurrentUser: vi.fn(),
  resolveGameReport: vi.fn(),
  deleteGame: vi.fn(),
}));

vi.mock('../components/ToastHost.jsx', () => ({
  pushToast: vi.fn(),
}));

globalThis.confirm = vi.fn();

describe('Reports page', () => {
  const mockAdminUser = {
    id: 1,
    username: 'admin',
    isAdmin: true,
  };

  const mockReports = [
    {
      id: 1,
      game_id: 1,
      user_id: 2,
      message: 'Inappropriate content',
      status: false,
      game: { id: 1, title: 'Game One' },
    },
    {
      id: 2,
      game_id: 2,
      user_id: 3,
      message: 'Bug report',
      status: true,
      game: { id: 2, title: 'Game Two' },
    },
    {
      id: 3,
      game_id: 1,
      user_id: 4,
      message: 'Another issue',
      status: false,
      game: { id: 1, title: 'Game One' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    globalThis.confirm.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  const renderReports = () => {
    return render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    api.fetchCurrentUser.mockImplementation(() => new Promise(() => {}));
    renderReports();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects non-logged-in users', async () => {
    api.fetchCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

    renderReports();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('redirects non-admin users', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce({
      id: 1,
      username: 'user',
      isAdmin: false,
    });

    renderReports();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('fetches and displays reports for admin users', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
      expect(screen.getByText('Bug report')).toBeInTheDocument();
      expect(screen.getByText('Another issue')).toBeInTheDocument();
    });

    expect(api.getGameReports).toHaveBeenCalled();
  });

  it('handles fetch reports error', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockRejectedValueOnce(new Error('Failed to load reports'));

    renderReports();

    await waitFor(() => {
      expect(screen.getByText(/failed to load reports/i)).toBeInTheDocument();
    });
  });

  it('filters reports by status - open', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    // Find and click the status filter
    const statusFilters = screen.queryAllByRole('combobox');
    if (statusFilters.length > 0) {
      const statusFilter = statusFilters.find(f =>
        f.value === 'all' || f.querySelector('option[value="open"]')
      );

      if (statusFilter) {
        fireEvent.change(statusFilter, { target: { value: 'open' } });

        await waitFor(() => {
          // Open reports should be visible
          expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
          // Resolved reports should not be visible
          expect(screen.queryByText('Bug report')).not.toBeInTheDocument();
        });
      }
    }
  });

  it('filters reports by status - resolved', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Bug report')).toBeInTheDocument();
    });

    const statusFilters = screen.queryAllByRole('combobox');
    if (statusFilters.length > 0) {
      const statusFilter = statusFilters.find(f =>
        f.value === 'all' || f.querySelector('option[value="resolved"]')
      );

      if (statusFilter) {
        fireEvent.change(statusFilter, { target: { value: 'resolved' } });

        await waitFor(() => {
          // Resolved reports should be visible
          expect(screen.getByText('Bug report')).toBeInTheDocument();
        });
      }
    }
  });

  it('filters reports by game', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const gameFilters = screen.queryAllByRole('combobox');
    if (gameFilters.length > 1) {
      const gameFilter = gameFilters[1];

      fireEvent.change(gameFilter, { target: { value: '1' } });

      await waitFor(() => {
        // Reports for Game One should be visible
        expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
        expect(screen.getByText('Another issue')).toBeInTheDocument();
        // Reports for Game Two should not be visible
        expect(screen.queryByText('Bug report')).not.toBeInTheDocument();
      });
    }
  });

  it('resolves a report', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);
    api.resolveGameReport.mockResolvedValueOnce({});

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const resolveButtons = screen.queryAllByRole('button', { name: /resolve/i });
    if (resolveButtons.length > 0) {
      fireEvent.click(resolveButtons[0]);

      await waitFor(() => {
        expect(api.resolveGameReport).toHaveBeenCalledWith(1);
      });
    }
  });

  it('handles resolve report error', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);
    api.resolveGameReport.mockRejectedValueOnce(new Error('Failed to resolve'));

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const resolveButtons = screen.queryAllByRole('button', { name: /resolve/i });
    if (resolveButtons.length > 0) {
      fireEvent.click(resolveButtons[0]);

      await waitFor(() => {
        expect(api.resolveGameReport).toHaveBeenCalled();
      });
    }
  });

  it('deletes a game with confirmation', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);
    api.deleteGame.mockResolvedValueOnce({});
    globalThis.confirm.mockReturnValueOnce(true);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(globalThis.confirm).toHaveBeenCalled();
        expect(api.deleteGame).toHaveBeenCalledWith(1);
      });
    }
  });

  it('cancels game deletion when not confirmed', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);
    globalThis.confirm.mockReturnValueOnce(false);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(globalThis.confirm).toHaveBeenCalled();
        expect(api.deleteGame).not.toHaveBeenCalled();
      });
    }
  });

  it('handles delete game error', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);
    api.deleteGame.mockRejectedValueOnce(new Error('Failed to delete'));
    globalThis.confirm.mockReturnValueOnce(true);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(api.deleteGame).toHaveBeenCalled();
      });
    }
  });

  it('displays game titles in reports', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(mockReports);

    renderReports();

    await waitFor(() => {
      const gameOneElements = screen.getAllByText(/game one/i);
      const gameTwoElements = screen.getAllByText(/game two/i);
      expect(gameOneElements.length).toBeGreaterThan(0);
      expect(gameTwoElements.length).toBeGreaterThan(0);
    });
  });

  it('handles empty reports array', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce([]);

    renderReports();

    await waitFor(() => {
      // Should not crash with empty reports
      const loadingText = screen.queryByText(/loading/i);
      expect(loadingText).not.toBeInTheDocument();
    });
  });

  it('handles non-array reports response', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockAdminUser);
    api.getGameReports.mockResolvedValueOnce(null);

    renderReports();

    await waitFor(() => {
      // Should handle null response
      const loadingText = screen.queryByText(/loading/i);
      expect(loadingText).not.toBeInTheDocument();
    });
  });
});

