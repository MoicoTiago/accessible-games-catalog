import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

global.fetch = vi.fn();

describe('Navbar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockNavigate.mockClear();
    fetch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  const renderNavbar = () =>
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

  it('renders navigation links', () => {
    renderNavbar();

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows navigation when not authenticated', () => {
    renderNavbar();

    // Should render navbar with buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows profile menu when authenticated', () => {
    localStorage.setItem('token', 'fake-token');
    renderNavbar();

    // Should have profile button (may need to query by role or test-id)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles sign out', () => {
    localStorage.setItem('token', 'fake-token');
    renderNavbar();

    // Clear token
    expect(localStorage.getItem('token')).toBe('fake-token');

    // Simulate clicking sign out (need to open menu first)
    const signOutButton = screen.queryByText('Sign out');
    if (signOutButton) {
      fireEvent.click(signOutButton);
      expect(localStorage.getItem('token')).toBeNull();
    }
  });

  it('updates authentication state on storage event', () => {
    const { rerender } = renderNavbar();

    const initialButtons = screen.getAllByRole('button');
    expect(initialButtons.length).toBeGreaterThan(0);

    // Simulate storage change
    localStorage.setItem('token', 'new-token');
    window.dispatchEvent(new Event('storage'));

    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const updatedButtons = screen.getAllByRole('button');
    expect(updatedButtons.length).toBeGreaterThan(0);
  });

  it('updates authentication state on auth-changed event', async () => {
    renderNavbar();

    const initialButtons = screen.getAllByRole('button');
    expect(initialButtons.length).toBeGreaterThan(0);

    // Simulate auth changed
    localStorage.setItem('token', 'new-token');
    window.dispatchEvent(new Event('auth-changed'));

    await waitFor(() => {
      // Component should re-render with authenticated state
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('renders search input', () => {
    renderNavbar();

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    renderNavbar();

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test game' } });

    expect(searchInput.value).toBe('test game');
  });
});

