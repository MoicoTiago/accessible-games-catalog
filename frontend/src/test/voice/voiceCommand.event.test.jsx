import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/react';

describe('voiceCommand event dispatch/handling', () => {
  let handler;

  beforeEach(() => {
    handler = vi.fn((e) => e.preventDefault());
    window.addEventListener('voiceCommand', handler);
  });

  afterEach(() => {
    window.removeEventListener('voiceCommand', handler);
  });

  it('delivers detail payload to listeners', () => {
    const detail = { type: 'filter', tag: 'Puzzle' };
    const event = new CustomEvent('voiceCommand', { detail, cancelable: true });
    const prevented = !window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    const callEvent = handler.mock.calls[0][0];
    expect(callEvent.detail).toEqual(detail);
    expect(prevented).toBe(true);
  });
});
