/**
 * Dispatch a global cancellable event so pages can respond to voice commands.
 * If nothing handles it, we apply minimal fallbacks (nav/scroll).
 */

const FOCUS_CLASS = 'voice-focus-ring';

function ensureFocusStyle() {
  if (document.getElementById('voice-focus-style')) return;
  const style = document.createElement('style');
  style.id = 'voice-focus-style';
  style.textContent = `
    .${FOCUS_CLASS} {
      outline: 3px solid #a5f3fc;
      outline-offset: 3px;
      transition: outline-color 0.4s ease, outline-width 0.2s ease;
    }
  `;
  document.head.appendChild(style);
}

function flashFocus(el) {
  if (!el) return;
  ensureFocusStyle();
  el.classList.add(FOCUS_CLASS);
  setTimeout(() => el.classList.remove(FOCUS_CLASS), 900);
}

function clearFlash() {
  document.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => el.classList.remove(FOCUS_CLASS));
}

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFocusableElements() {
  return Array.from(
    document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]')
  ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && isVisible(el));
}

function moveFocus(delta) {
  const focusables = getFocusableElements();
  if (!focusables.length) return false;
  const active = document.activeElement;
  let idx = focusables.indexOf(active);
  if (idx === -1) idx = delta > 0 ? -1 : focusables.length;
  let next = focusables[idx + delta];
  if (!next) next = delta > 0 ? focusables[0] : focusables[focusables.length - 1];
  if (!next) return false;
  clearFlash();
  if (typeof next.focus === 'function') next.focus({ preventScroll: true });
  if (typeof next.scrollIntoView === 'function') next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashFocus(next);
  return true;
}

function activateFocused() {
  const target = document.activeElement || getFocusableElements()[0];
  if (!target) return false;
  if (typeof target.click === 'function') {
    target.click();
    flashFocus(target);
    return true;
  }
  return false;
}

export function dispatchVoiceCommand(detail) {
  const event = new CustomEvent('voiceCommand', {
    detail,
    cancelable: true
  });

  const handled = !window.dispatchEvent(event);
  if (handled) return true;

  switch (detail.type) {
    case 'navigate':
      if (detail.target === 'home') window.location.assign('/');
      if (detail.target === 'search') window.location.assign('/search');
      if (detail.target === 'settings') window.location.assign('/settings');
      if (detail.target === 'login') window.location.assign('/login');
      if (detail.target === 'signup') window.location.assign('/signup');
      if (detail.target === 'profile') window.location.assign('/profile');
      if (detail.target === 'back') window.history.back();
      if (detail.target === 'next-page') window.history.forward();
      break;
    case 'scroll':
      window.scrollBy({ top: detail.direction === 'up' ? -400 : 400, behavior: 'smooth' });
      break;
    case 'basic':
      if (detail.action === 'next') {
        if (!moveFocus(1)) window.scrollBy({ top: 300, behavior: 'smooth' });
        return true;
      }
      if (detail.action === 'previous') {
        if (!moveFocus(-1)) window.scrollBy({ top: -300, behavior: 'smooth' });
        return true;
      }
      if (detail.action === 'open' || detail.action === 'select') {
        if (!activateFocused() && moveFocus(1)) activateFocused();
        return true;
      }
      break;
    default:
      break;
  }
  return false;
}
