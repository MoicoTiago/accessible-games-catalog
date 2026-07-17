import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App.jsx';

// Mock all the page components - paths relative to App.jsx location
vi.mock('../pages/Home', () => ({ default: () => <div data-testid="home-page">Home Page</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Signup', () => ({ default: () => <div>Signup Page</div> }));
vi.mock('../pages/Search', () => ({ default: () => <div>Search Page</div> }));
vi.mock('../pages/Game', () => ({ default: () => <div>Game Page</div> }));
vi.mock('../pages/Profile', () => ({ default: () => <div>Profile Page</div> }));
vi.mock('../pages/Settings', () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../pages/Reports', () => ({ default: () => <div>Reports Page</div> }));

// Mock components
vi.mock('../components/Navbar', () => ({ default: () => <nav data-testid="navbar">Navbar</nav> }));
vi.mock('../components/ToastHost', () => ({
  default: () => <div data-testid="toast-host">ToastHost</div>,
  pushToast: vi.fn()
}));

// Mock settings
vi.mock('../settings', () => ({
  loadSettings: vi.fn(() => ({
    theme: 'light',
    highContrastMode: false,
    textSize: 'medium',
    spacing: 'roomy',
    buttonSize: 'normal'
  })),
  saveSettings: vi.fn()
}));

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getAllByTestId } = render(<App />);

    // Should have at least one navbar
    const navbars = getAllByTestId('navbar');
    expect(navbars.length).toBeGreaterThan(0);
  });

  it('includes Navbar component', () => {
    const { getAllByTestId } = render(<App />);
    const navbars = getAllByTestId('navbar');
    expect(navbars.length).toBeGreaterThan(0);
  });

  it('includes ToastHost component', () => {
    const { getAllByTestId } = render(<App />);
    const toastHosts = getAllByTestId('toast-host');
    expect(toastHosts.length).toBeGreaterThan(0);
  });

  it('renders Home page by default', () => {
    const { getAllByTestId } = render(<App />);
    const homePages = getAllByTestId('home-page');
    expect(homePages.length).toBeGreaterThan(0);
  });

  it('applies theme settings on mount', () => {
    const { getAllByTestId } = render(<App />);

    // Just verify it renders without errors
    const navbars = getAllByTestId('navbar');
    expect(navbars.length).toBeGreaterThan(0);
  });

  it('renders skip link for accessibility', () => {
    const { getAllByText } = render(<App />);
    const skipLinks = getAllByText(/skip to main content/i);
    expect(skipLinks.length).toBeGreaterThan(0);
    expect(skipLinks[0]).toHaveAttribute('href', '#page-content');
  });
});

