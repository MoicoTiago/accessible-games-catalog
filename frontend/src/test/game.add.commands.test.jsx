// filepath: frontend/src/__tests__/game.add.commands.test.jsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock Toasts
vi.mock('../../components/ToastHost.jsx', () => ({ pushToast: (msg) => { console.log('[toast]', msg); } }));

// Mock API
vi.mock('../api', () => ({
  getGame: async (id) => ({ id: Number(id), name: 'Trailblazer Kids', developer: 'Dev', category: 'Kids', rating: 4, reviews: [], tags: [{ name: 'Kids' }], images: [] }),
  getReviewsForGame: async () => [],
  fetchCurrentUser: async () => ({ id: 1, name: 'U' }),
  getAccessibilityPreferences: async () => ({}),
  getFollowedGames: async () => ([]),
}));

function dispatchVoice(detail) {
  const evt = new CustomEvent('voiceCommand', { detail });
  window.dispatchEvent(evt);
}

it('adds current game to wishlist via voice and does not navigate', async () => {
  localStorage.clear();
  localStorage.setItem('token', 't');
  const { default: GamePage } = await import('../pages/Game.jsx');
  render(
    <MemoryRouter initialEntries={[{ pathname: '/games/7' }] }>
      <Routes>
        <Route path="/games/:id" element={<GamePage />} />
      </Routes>
    </MemoryRouter>
  );

  await act(async () => { await new Promise(r => setTimeout(r, 80)); });

  await act(async () => {
    dispatchVoice({ type: 'game', action: 'wishlist' });
    await new Promise(r => setTimeout(r, 80));
  });

  const stored = JSON.parse(localStorage.getItem('wishlist:1')) || [];
  expect(stored.some(g => (g?.id ?? g) === 7)).toBe(true);
});
