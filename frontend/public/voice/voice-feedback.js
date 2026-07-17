const STATUS_ID = 'voice-status';
const FLASH_CLASS = 'voice-flash';

function ensureStyles() {
  if (document.getElementById('voice-style')) return;
  const style = document.createElement('style');
  style.id = 'voice-style';
  style.textContent = `
    #${STATUS_ID} {
      position: fixed;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      padding: 8px 14px;
      border-radius: 999px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      pointer-events: none;
    }
    .${FLASH_CLASS} {
      outline: 3px solid #a5f3fc;
      outline-offset: 4px;
      transition: outline-color 0.4s ease-out;
    }
  `;
  document.head.appendChild(style);
}

export function mountFeedback() {
  ensureStyles();
  if (document.getElementById(STATUS_ID)) return;
  const el = document.createElement('div');
  el.id = STATUS_ID;
  el.setAttribute('role', 'status');
  el.textContent = 'Voice idle';
  document.body.appendChild(el);
}

export function updateStatus(message) {
  const el = document.getElementById(STATUS_ID);
  if (!el) return;
  // Avoid spamming the same status string, which can re-trigger screen readers.
  if (el.textContent === message) return;
  el.textContent = message;
}

export function flashInteraction(target) {
  if (!target) return;
  target.classList.add(FLASH_CLASS);
  setTimeout(() => target.classList.remove(FLASH_CLASS), 1200);
}

export function announceCommand(detail) {
  updateStatus(`Heard: ${detail.utterance || detail.type}`);
}
