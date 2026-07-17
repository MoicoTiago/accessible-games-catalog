import User from '../models/User.js';

// We only use build() and setDataValue/getDataValue, so we don't need to sync or touch the real DB

describe('User model accessibilityPreferences getter/setter (real model)', () => {
  it('returns default preferences when unset', () => {
    const user = User.build({ username: 'u1', email: 'e@example.com', password: 'pw' });
    expect(user.accessibilityPreferences).toEqual({
      visual: false,
      motor: false,
      cognitive: false,
      hearing: false,
    });
  });

  it('normalizes booleans on set and persists as JSON', () => {
    const user = User.build({ username: 'u2', email: 'e2@example.com', password: 'pw' });
    user.accessibilityPreferences = { visual: 1, motor: 0, cognitive: 'yes', hearing: '' };

    const raw = user.getDataValue('accessibilityPreferences');
    expect(typeof raw).toBe('string');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({
      visual: true,
      motor: false,
      cognitive: true,
      hearing: false,
    });

    expect(user.accessibilityPreferences).toEqual(parsed);
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    const user = User.build({ username: 'u3', email: 'e3@example.com', password: 'pw' });
    user.setDataValue('accessibilityPreferences', 'not-json');

    expect(user.accessibilityPreferences).toEqual({
      visual: false,
      motor: false,
      cognitive: false,
      hearing: false,
    });
  });
});
