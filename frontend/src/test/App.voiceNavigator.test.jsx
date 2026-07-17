import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('../pages/Home', () => ({ default: () => <div>Home Page</div> }));
vi.mock('../pages/Search', () => ({ default: () => <div>Search Page</div> }));
vi.mock('../pages/Game', () => ({ default: () => <div>Game Page</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Signup', () => ({ default: () => <div>Signup Page</div> }));
vi.mock('../pages/Settings', () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../pages/Profile', () => ({ default: () => <div>Profile Page</div> }));
vi.mock('../pages/Reports', () => ({ default: () => <div>Reports Page</div> }));
vi.mock('../pages/Library', () => ({ default: () => <div>Library Page</div> }));
vi.mock('../components/Navbar', () => ({ default: () => <nav>Navbar</nav> }));
vi.mock('../components/ToastHost', () => ({ default: () => <div>ToastHost</div>, pushToast: vi.fn() }));
vi.mock('../settings', () => ({
  loadSettings: vi.fn(() => ({})),
}));

const mockSearchGames = vi.fn().mockResolvedValue([{ id: 42, title: 'Puzzle Quest' }]);
vi.mock('../api.js', () => ({
  searchGames: (...args) => mockSearchGames(...args),
}));

import App from '../App.jsx';

describe('App VoiceNavigator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderApp = () => render(<App />);

  it('navigates to library on voice navigate event', async () => {
    renderApp();
    window.dispatchEvent(new CustomEvent('voiceCommand', { detail: { type: 'navigate', target: 'library' } }));
    expect(window.location.pathname).toBe('/library');
  });

  it('navigates to wishlist via voice and dispatches tab switch', async () => {
    renderApp();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    window.dispatchEvent(new CustomEvent('voiceCommand', { detail: { type: 'navigate', target: 'wishlist', utterance: 'go to wishlist' } }));
    expect(window.location.pathname).toBe('/library');
    // should dispatch a navigate event to switch tab after a timeout
    vi.runAllTimers();
    await vi.waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'voiceCommand',
        detail: expect.objectContaining({ type: 'navigate', target: 'wishlist' }),
      }));
    });
    dispatchSpy.mockRestore();
  });

  it('opens game from voice game-card action using searchGames fallback', async () => {
    renderApp();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    window.dispatchEvent(new CustomEvent('voiceCommand', { detail: { type: 'game-card', action: 'open', title: 'Puzzle Quest' } }));
    await vi.waitFor(() => expect(mockSearchGames).toHaveBeenCalled());
    expect(window.location.pathname).toBe('/games/42');
    dispatchSpy.mockRestore();
  });
});
