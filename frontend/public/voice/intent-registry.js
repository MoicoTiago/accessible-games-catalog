/**
 * Central registry for spoken utterances -> command intents.
 * Add new entries here (no code changes needed elsewhere).
 */
export const navigationIntents = [
  {
    utterances: ['go to search', 'open search'],
    intent: { type: 'navigate', target: 'search' }
  },
  {
    utterances: ['go home', 'go to home', 'home'],
    intent: { type: 'navigate', target: 'home' }
  },
  {
    utterances: ['back', 'go back'],
    intent: { type: 'navigate', target: 'back' }
  },
  {
    utterances: ['next page', 'forward'],
    intent: { type: 'navigate', target: 'next-page' }
  }
];

export const settingsIntents = [
  { utterances: ['go to settings', 'open settings'], intent: { type: 'navigate', target: 'settings' } },
  { utterances: ['enable high contrast mode', 'turn on high contrast'], intent: { type: 'settings', action: 'set-high-contrast-mode', value: true } },
  { utterances: ['disable high contrast mode', 'turn off high contrast'], intent: { type: 'settings', action: 'set-high-contrast-mode', value: false } },
  { utterances: ['set theme light', 'switch to light mode', 'use light mode'], intent: { type: 'settings', action: 'set-theme', value: 'light' } },
  { utterances: ['set theme dark', 'switch to dark mode', 'use dark mode'], intent: { type: 'settings', action: 'set-theme', value: 'dark' } },
  { utterances: ['set theme high contrast', 'switch to high contrast theme'], intent: { type: 'settings', action: 'set-theme', value: 'high-contrast' } },
  { utterances: ['enable wake word', 'turn on wake word'], intent: { type: 'settings', action: 'set-wake-word-enabled', value: true } },
  { utterances: ['disable wake word', 'turn off wake word'], intent: { type: 'settings', action: 'set-wake-word-enabled', value: false } },
  { utterances: ['set wake word to voyager', 'wake word voyager'], intent: { type: 'settings', action: 'set-wake-word', value: 'voyager' } },
  { utterances: ['set wake word to astra', 'wake word astra'], intent: { type: 'settings', action: 'set-wake-word', value: 'astra' } },
  { utterances: ['sort by relevance'], intent: { type: 'sort', value: 'relevance' } },
  { utterances: ['sort by newest', 'sort by latest'], intent: { type: 'sort', value: 'newest' } },
  { utterances: ['sort by rating', 'sort by top rated', 'sort by top rating'], intent: { type: 'sort', value: 'rating' } },
  { utterances: ['sort by title', 'sort by name', 'sort by a to z'], intent: { type: 'sort', value: 'title' } },
  { utterances: ['increase text size', 'make text bigger'], intent: { type: 'settings', action: 'set-text-size', value: 'large' } },
  { utterances: ['decrease text size', 'make text smaller'], intent: { type: 'settings', action: 'set-text-size', value: 'small' } },
  { utterances: ['set text size medium', 'set text size to medium'], intent: { type: 'settings', action: 'set-text-size', value: 'medium' } },
  { utterances: ['set text size to large'], intent: { type: 'settings', action: 'set-text-size', value: 'large' } },
  { utterances: ['set text size to small'], intent: { type: 'settings', action: 'set-text-size', value: 'small' } },
  { utterances: ['enable reduce animation', 'reduce animation', 'turn on reduce motion'], intent: { type: 'settings', action: 'set-reduce-motion', value: true } },
  { utterances: ['disable reduce animation', 'turn off reduce motion'], intent: { type: 'settings', action: 'set-reduce-motion', value: false } },
  { utterances: ['enable captions', 'turn on captions', 'show captions', 'turn on subtitles'], intent: { type: 'settings', action: 'set-captions', value: true } },
  { utterances: ['disable captions', 'turn off captions', 'hide captions', 'turn off subtitles'], intent: { type: 'settings', action: 'set-captions', value: false } },
  { utterances: ['enable visual alerts', 'turn on visual alerts', 'turn on visual indicators', 'use visual alerts'], intent: { type: 'settings', action: 'set-visual-alerts', value: true } },
  { utterances: ['disable visual alerts', 'turn off visual alerts', 'turn off visual indicators', 'stop visual alerts'], intent: { type: 'settings', action: 'set-visual-alerts', value: false } },
  { utterances: ['set button size normal', 'set buttons to normal'], intent: { type: 'settings', action: 'set-button-size', value: 'normal' } },
  { utterances: ['set button size large', 'make buttons larger', 'make buttons big'], intent: { type: 'settings', action: 'set-button-size', value: 'large' } },
  { utterances: ['set button size extra large', 'make buttons extra large'], intent: { type: 'settings', action: 'set-button-size', value: 'xlarge' } },
  { utterances: ['set spacing tight', 'tighten spacing'], intent: { type: 'settings', action: 'set-spacing', value: 'snug' } },
  { utterances: ['set spacing roomy', 'normal spacing'], intent: { type: 'settings', action: 'set-spacing', value: 'roomy' } },
  { utterances: ['set spacing extra room', 'wider spacing', 'more spacing'], intent: { type: 'settings', action: 'set-spacing', value: 'airy' } }
];

export default {
  navigationIntents,
  settingsIntents
};
