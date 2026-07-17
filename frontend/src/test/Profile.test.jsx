import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../pages/Profile.jsx';
import * as api from '../api.js';
import { pushToast } from '../components/ToastHost.jsx';

vi.mock('../api', () => ({
  fetchCurrentUser: vi.fn(),
  fetchUserReviews: vi.fn(),
  getAccessibilityPreferences: vi.fn(),
  updateAccessibilityPreferences: vi.fn(),
  getFollowedGames: vi.fn(),
  updateUserProfile: vi.fn(),
  changeUserPassword: vi.fn(),
  getHelpfulVotes: vi.fn(),
}));

vi.mock('../components/ToastHost.jsx', () => ({
  pushToast: vi.fn(),
}));

describe('Profile page', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderProfile = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

  it('renders loading state initially', () => {
    api.fetchCurrentUser.mockImplementation(() => new Promise(() => {}));
    renderProfile();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays user profile', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({
      visual: false,
      motor: false,
      cognitive: false,
      hearing: false,
    });
    api.getFollowedGames.mockResolvedValueOnce([]);

    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'testuser' })).toBeInTheDocument();
    });
  });

  it('handles fetch user error', async () => {
    api.fetchCurrentUser.mockRejectedValueOnce(new Error('Failed to load profile'));

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
    });
  });

  it('fetches user reviews', async () => {
    const mockReviews = [
      { id: 1, game_id: 1, rating: 5, comment: 'Great game!' },
    ];

    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce(mockReviews);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);

    renderProfile();

    await waitFor(() => {
      expect(api.fetchUserReviews).toHaveBeenCalledWith(1);
    });
  });

  it('handles fetch reviews error gracefully', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockRejectedValueOnce(new Error('Failed to load reviews'));
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);

    renderProfile();

    await waitFor(() => {
      expect(api.fetchUserReviews).toHaveBeenCalled();
    });
  });

  it('fetches accessibility preferences', async () => {
    const mockPrefs = {
      visual: true,
      motor: false,
      cognitive: true,
      hearing: false,
    };

    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce(mockPrefs);
    api.getFollowedGames.mockResolvedValueOnce([]);

    renderProfile();

    await waitFor(() => {
      expect(api.getAccessibilityPreferences).toHaveBeenCalledWith(1);
    });
  });

  it('handles fetch accessibility preferences error', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockRejectedValueOnce(
      new Error('Failed to load accessibility preferences')
    );
    api.getFollowedGames.mockResolvedValueOnce([]);

    renderProfile();

    await waitFor(() => {
      expect(api.getAccessibilityPreferences).toHaveBeenCalled();
    });
  });

  it('fetches followed games', async () => {
    const mockGames = [
      { id: 1, title: 'Game 1' },
      { id: 2, title: 'Game 2' },
    ];

    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce(mockGames);

    renderProfile();

    await waitFor(() => {
      expect(api.getFollowedGames).toHaveBeenCalledWith(1);
    });
  });

  it('handles fetch followed games error gracefully', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockRejectedValueOnce(new Error('Failed'));

    renderProfile();

    await waitFor(() => {
      expect(api.getFollowedGames).toHaveBeenCalled();
      // Should not crash - error is ignored
    });
  });

  it('saves accessibility preferences and shows toast', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({
      visual: false, motor: false, cognitive: false, hearing: false,
    });
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 2 });
    api.updateAccessibilityPreferences.mockResolvedValueOnce({
      visual: true, motor: false, cognitive: true, hearing: false,
    });

    renderProfile();

    await waitFor(() => expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/Visual Impairments/i));
    fireEvent.click(screen.getByLabelText(/Cognitive Support/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm preferences/i }));

    await waitFor(() => {
      expect(api.updateAccessibilityPreferences).toHaveBeenCalledWith(1, {
        visual: true, motor: false, cognitive: true, hearing: false,
      });
    });
    expect(pushToast).toHaveBeenCalledWith('Accessibility preferences updated');
  });

  it('shows error when saving accessibility preferences fails', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({
      visual: false, motor: false, cognitive: false, hearing: false,
    });
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 0 });
    api.updateAccessibilityPreferences.mockRejectedValueOnce(new Error('nope'));

    renderProfile();

    await waitFor(() => expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /confirm preferences/i }));

    await waitFor(() => expect(screen.getByText(/nope/i)).toBeInTheDocument());
  });

  it('updates profile via modal and closes on success', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 0 });
    api.updateUserProfile.mockResolvedValueOnce({ username: 'newuser', email: 'new@example.com' });

    renderProfile();

    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    const [usernameInput, emailInput] = screen.getAllByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /update profile/i }));

    await waitFor(() => expect(api.updateUserProfile).toHaveBeenCalledWith(1, { username: 'newuser', email: 'new@example.com' }));
    expect(pushToast).toHaveBeenCalledWith('Profile updated');
    await waitFor(() => expect(screen.queryByRole('button', { name: /update profile/i })).not.toBeInTheDocument());
    expect(screen.getAllByText(/newuser/i).length).toBeGreaterThan(0);
  });

  it('shows edit error when profile update fails', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 0 });
    api.updateUserProfile.mockRejectedValueOnce(new Error('bad update'));

    renderProfile();

    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);
    fireEvent.click(screen.getByRole('button', { name: /update profile/i }));

    await waitFor(() => expect(screen.getByText(/bad update/i)).toBeInTheDocument());
  });

  it('changes password and closes modal on success', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 0 });
    api.changeUserPassword.mockResolvedValueOnce({});

    renderProfile();

    const changePwdBtn = await screen.findByRole('button', { name: /change password/i });
    fireEvent.click(changePwdBtn);
    await screen.findByRole('heading', { name: /change password/i });
    const pwdInputs = document.querySelectorAll('input[type="password"]');
    expect(pwdInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(pwdInputs[0], { target: { value: 'oldpass' } });
    fireEvent.change(pwdInputs[1], { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(api.changeUserPassword).toHaveBeenCalledWith(1, 'oldpass', 'newpass'));
    expect(pushToast).toHaveBeenCalledWith('Password updated');
    await waitFor(() => expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument());
  });

  it('shows password error when change fails', async () => {
    api.fetchCurrentUser.mockResolvedValueOnce(mockUser);
    api.fetchUserReviews.mockResolvedValueOnce([]);
    api.getAccessibilityPreferences.mockResolvedValueOnce({});
    api.getFollowedGames.mockResolvedValueOnce([]);
    api.getHelpfulVotes.mockResolvedValueOnce({ helpfulVotes: 0 });
    api.changeUserPassword.mockRejectedValueOnce(new Error('bad pwd'));

    renderProfile();

    const changePwdBtn = await screen.findByRole('button', { name: /change password/i });
    fireEvent.click(changePwdBtn);
    await screen.findByRole('heading', { name: /change password/i });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(screen.getByText(/bad pwd/i)).toBeInTheDocument());
  });
});

