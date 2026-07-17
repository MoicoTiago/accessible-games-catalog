import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import ToastHost, { pushToast } from './ToastHost.jsx';

describe('ToastHost component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing initially', () => {
    const { container } = render(<ToastHost />);
    expect(container.querySelector('.fixed')).not.toBeInTheDocument();
  });

  it('displays toast message when pushToast is called', async () => {
    render(<ToastHost />);

    act(() => {
      pushToast('Test message');
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('updates message when pushToast is called again', async () => {
    render(<ToastHost />);

    act(() => {
      pushToast('First message');
    });

    expect(screen.getByText('First message')).toBeInTheDocument();

    act(() => {
      pushToast('Second message');
    });

    expect(screen.queryByText('First message')).not.toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<ToastHost />);

    act(() => {
      pushToast('Message before unmount');
    });

    expect(screen.getByText('Message before unmount')).toBeInTheDocument();

    unmount();

    // After unmount, pushToast should not crash but may not work
    act(() => {
      pushToast('Message after unmount');
    });
  });
});

