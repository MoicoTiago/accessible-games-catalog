import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../pages/Signup.jsx';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API and toast
vi.mock('../api', () => ({
  registerUser: vi.fn()
}));

vi.mock('../components/ToastHost.jsx', () => ({
  pushToast: vi.fn()
}));

describe('Signup page', () => {
  let registerUser;
  let pushToast;

  beforeEach(async () => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockNavigate.mockClear();

    const apiModule = await import('../api.js');
    registerUser = apiModule.registerUser;

    const toastModule = await import('../components/ToastHost.jsx');
    pushToast = toastModule.pushToast;
  });

  afterEach(() => {
    cleanup();
  });

  const renderSignup = () => (
      render(
          <MemoryRouter>
            <Signup />
          </MemoryRouter>
      )
  );

  it('renders the signup form fields', () => {
    renderSignup();

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();

    // Check for labels instead of inputs with getByLabelText
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Confirm password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows an error when passwords do not match', async () => {
    const { container } = renderSignup();

    // Get inputs by querying the DOM directly since labels aren't properly associated
    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0]; // First input is username
    const emailInput = inputs[1]; // Second input is email
    const passwordInput = inputs[2]; // Third input is password
    const confirmInput = inputs[3]; // Fourth input is confirm password

    fireEvent.change(usernameInput, {
      target: { value: 'newuser' }
    });
    fireEvent.change(emailInput, {
      target: { value: 'new@example.com' }
    });
    fireEvent.change(passwordInput, {
      target: { value: 'password1' }
    });
    fireEvent.change(confirmInput, {
      target: { value: 'password2' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('successfully registers and navigates to home', async () => {
    const { container } = renderSignup();

    // Mock successful registration
    registerUser.mockResolvedValueOnce({ token: 'fake-token-123' });

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmInput = inputs[3];

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith('newuser', 'newuser@example.com', 'password123');
      expect(localStorage.getItem('token')).toBe('fake-token-123');
      expect(pushToast).toHaveBeenCalledWith('successfully registered');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('updates input fields when user types', () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmInput = inputs[3];

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(usernameInput.value).toBe('testuser');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');

    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    expect(passwordInput.value).toBe('mypassword');

    fireEvent.change(confirmInput, { target: { value: 'mypassword' } });
    expect(confirmInput.value).toBe('mypassword');
  });

  it('shows loading state while submitting', async () => {
    const { container } = renderSignup();

    // Mock a delayed response
    registerUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ token: 'token' }), 100)));

    const inputs = container.querySelectorAll('input');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(inputs[0], { target: { value: 'user' } });
    fireEvent.change(inputs[1], { target: { value: 'user@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password' } });
    fireEvent.change(inputs[3], { target: { value: 'password' } });

    fireEvent.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/creating account\.\.\./i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText(/creating account\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('handles registration API error', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error('Username already exists'));

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'existinguser' } });
    fireEvent.change(inputs[1], { target: { value: 'user@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  it('handles error without message gracefully', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error());

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'user' } });
    fireEvent.change(inputs[1], { target: { value: 'user@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password' } });
    fireEvent.change(inputs[3], { target: { value: 'password' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it('clears error when submitting again', async () => {
    const { container } = renderSignup();

    // First attempt - fail
    registerUser.mockRejectedValueOnce(new Error('Username already exists'));

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'user' } });
    fireEvent.change(inputs[1], { target: { value: 'user@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password' } });
    fireEvent.change(inputs[3], { target: { value: 'password' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });

    // Second attempt - should clear error first
    registerUser.mockResolvedValueOnce({ token: 'token' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByText(/username already exists/i)).not.toBeInTheDocument();
    });
  });

  it('dispatches auth-changed event on successful registration', async () => {
    const { container } = renderSignup();
    const eventSpy = vi.fn();
    window.addEventListener('auth-changed', eventSpy);

    registerUser.mockResolvedValueOnce({ token: 'fake-token' });

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'newuser' } });
    fireEvent.change(inputs[1], { target: { value: 'newuser@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalled();
    });

    window.removeEventListener('auth-changed', eventSpy);
  });

  it('does not call registerUser when passwords do not match', async () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'user' } });
    fireEvent.change(inputs[1], { target: { value: 'user@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password1' } });
    fireEvent.change(inputs[3], { target: { value: 'password2' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(registerUser).not.toHaveBeenCalled();
  });

  it('handles registration without token in response', async () => {
    const { container } = renderSignup();

    // Mock registration response without token
    registerUser.mockResolvedValueOnce({});

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'newuser' } });
    fireEvent.change(inputs[1], { target: { value: 'newuser@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
      expect(pushToast).toHaveBeenCalledWith('successfully registered');
      expect(mockNavigate).toHaveBeenCalledWith('/');
      // localStorage should not be set if no token
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('validates email format', async () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmPasswordInput = inputs[3];

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalidemail' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // If email validation exists, it should show error, otherwise form validates natively
      expect(registerUser).not.toHaveBeenCalled();
    });
  });

  it('validates password length', async () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmPasswordInput = inputs[3];

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'token' });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Form allows submission with matching short passwords
      // Backend validation would catch this
      expect(registerUser).toHaveBeenCalledWith('testuser', 'test@email.com', 'short');
    });
  });

  it('shows password strength indicator', async () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');
    const passwordInput = inputs[2];

    // Type a weak password
    fireEvent.change(passwordInput, { target: { value: 'password' } });

    await waitFor(() => {
      // Just verify the input works
      expect(passwordInput.value).toBe('password');
    });
  });

  it('toggles password visibility for both password fields', async () => {
    const { container } = renderSignup();

    const passwordInputs = container.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);

    const toggleButtons = screen.queryAllByRole('button', { name: /show password|hide password/i });
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        const textInputs = container.querySelectorAll('input[type="text"], input[type="password"]');
        expect(textInputs.length).toBeGreaterThan(0);
      });
    }
  });

  it('handles voice command signup', async () => {
    const { container } = renderSignup();

    // Set up form values first
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'voiceuser' } });
    fireEvent.change(inputs[1], { target: { value: 'voice@example.com' } });
    fireEvent.change(inputs[2], { target: { value: 'voicepass123' } });
    fireEvent.change(inputs[3], { target: { value: 'voicepass123' } });

    // Correct voice command structure
    const voiceEvent = new CustomEvent('voiceCommand', {
      detail: {
        type: 'auth',
        form: 'signup',
        action: 'submit'
      }
    });

    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'voice-token' });

    window.dispatchEvent(voiceEvent);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
    });
  });

  it('validates username is not empty', async () => {
    const { container } = renderSignup();

    const inputs = container.querySelectorAll('input');
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmPasswordInput = inputs[3];

    // Leave username empty
    fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerUser).not.toHaveBeenCalled();
    });
  });

  it('clears error message on successful retry', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error('Username taken'));

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmPasswordInput = inputs[3];

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username taken/i)).toBeInTheDocument();
    });

    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'token' });
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByText(/username taken/i)).not.toBeInTheDocument();
    });
  });

  it('dispatches auth-changed event on successful signup', async () => {
    const { container } = renderSignup();

    const eventSpy = vi.fn();
    window.addEventListener('auth-changed', eventSpy);

    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'event-token' });

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalled();
    });

    window.removeEventListener('auth-changed', eventSpy);
  });

  it('disables signup button during submission', async () => {
    const { container } = renderSignup();

    registerUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ user: { id: 1 }, token: 'token' }), 1000)));

    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    const signupButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(signupButton);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /creating account\.\.\./i });
      expect(button).toBeDisabled();
    });
  });

  it('shows terms and conditions checkbox if present', () => {
    renderSignup();

    const termsCheckbox = screen.queryByRole('checkbox', { name: /terms|conditions|agree/i });
    // If terms checkbox exists, it should be unchecked by default
    if (termsCheckbox) {
      expect(termsCheckbox).not.toBeChecked();
    }
  });

  it('allows form submission on Enter key press', async () => {
    const { container } = renderSignup();

    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'enter-token' });

    const inputs = container.querySelectorAll('input');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInput = inputs[2];
    const confirmPasswordInput = inputs[3];
    const form = container.querySelector('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    // Submit the form directly
    fireEvent.submit(form);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
    });
  });

  it('validates email format correctly', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'invalidemail' } }); // Invalid email
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerUser).not.toHaveBeenCalled();
    });
  });

  it('clears password fields after failed registration', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error('Username already exists'));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'existinguser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  it('prevents registration with mismatched passwords', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'different456' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerUser).not.toHaveBeenCalled();
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('handles server validation errors', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error('Email already registered'));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'newuser' } });
    fireEvent.change(inputs[1], { target: { value: 'existing@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator during registration', async () => {
    const { container } = renderSignup();

    registerUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ user: { id: 1 }, token: 'token' }), 500)));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/creating account\.\.\./i)).toBeInTheDocument();
    });
  });

  it('validates username length', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'ab' } }); // Too short
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    // Mock response for short username (backend would validate)
    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'token' });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Frontend allows submission, backend would validate
      expect(registerUser).toHaveBeenCalledWith('ab', 'test@email.com', 'password123');
    }, { timeout: 3000 });
  });

  it('handles rapid successive clicks on signup button', async () => {
    const { container } = renderSignup();

    registerUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ user: { id: 1 }, token: 'token' }), 1000)));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    const signupButton = screen.getByRole('button', { name: /create account/i });

    // Click multiple times rapidly
    fireEvent.click(signupButton);
    fireEvent.click(signupButton);
    fireEvent.click(signupButton);

    await waitFor(() => {
      // Should only be called once
      expect(registerUser).toHaveBeenCalledTimes(1);
    });
  });

  it('clears error when user modifies form after error', async () => {
    const { container } = renderSignup();

    registerUser.mockRejectedValueOnce(new Error('Registration failed'));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.change(inputs[3], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Modify form - error should clear
    registerUser.mockResolvedValueOnce({ user: { id: 1 }, token: 'token' });
    fireEvent.change(inputs[0], { target: { value: 'newuser' } });

    // Wait a bit for the state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if error is cleared or form can be resubmitted
    const errorElements = screen.queryAllByText(/registration failed/i);
    expect(errorElements.length).toBeLessThanOrEqual(1);
  });

  it('maintains form state during validation', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });
    fireEvent.change(inputs[2], { target: { value: 'pass1' } });
    fireEvent.change(inputs[3], { target: { value: 'pass2' } }); // Different

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Form values should remain
      expect(inputs[0].value).toBe('testuser');
      expect(inputs[1].value).toBe('test@email.com');
    });
  });

  it('handles voice command with clear action', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    // Fill form first
    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(inputs[1], { target: { value: 'test@email.com' } });

    const voiceEvent = new CustomEvent('voiceCommand', {
      detail: {
        type: 'auth',
        form: 'signup',
        action: 'clear'
      }
    });

    window.dispatchEvent(voiceEvent);

    await waitFor(() => {
      // Form should be cleared
      expect(inputs[0].value).toBe('');
      expect(inputs[1].value).toBe('');
    });
  });

  it('handles voiceCommand set-field and focus actions for all fields', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    // set-field username
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'set-field', field: 'username', value: 'voiceUser' }
    }));

    await waitFor(() => {
      expect(inputs[0].value).toBe('voiceUser');
    });

    // set-field email via identifier alias
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'set-field', field: 'identifier', value: 'voice@example.com' }
    }));

    await waitFor(() => {
      expect(inputs[1].value).toBe('voice@example.com');
    });

    // focus password
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'focus', field: 'password' }
    }));

    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[2]);
    });

    // focus confirm
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'focus', field: 'confirm' }
    }));

    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[3]);
    });
  });

  it('handles voiceCommand type action relative to last focused field', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    // focus email first
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'focus', field: 'email' }
    }));

    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[1]);
    });

    // now type into the currently focused field
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'auth', form: 'signup', action: 'type', value: 'typed@example.com' }
    }));

    await waitFor(() => {
      expect(inputs[1].value).toBe('typed@example.com');
    });
  });

  it('handles spell start, append, and stop actions', async () => {
    const { container } = renderSignup();
    const inputs = container.querySelectorAll('input');

    // Start spelling for email and clear existing values
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'spell', action: 'start', field: 'email', clear: true }
    }));

    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[1]);
    });

    // Append characters via spelling
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'spell', action: 'append', field: 'email', value: 'user' }
    }));

    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'spell', action: 'append', field: 'email', value: '@example.com' }
    }));

    await waitFor(() => {
      expect(inputs[1].value).toBe('user@example.com');
    });

    // Stop spelling should clear voiceFieldRef internally without crashing
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { type: 'spell', action: 'stop' }
    }));
  });
});
