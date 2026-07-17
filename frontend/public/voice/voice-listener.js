import { getWakeWord } from './command-parser.js';

/**
 * Lightweight wrapper for the Web Speech API to keep the mic alive
 * and stream transcripts to callbacks.
 */
export function createVoiceListener({ onTranscript, onStatus }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onStatus?.('SpeechRecognition not supported');
    console.warn('[voice] SpeechRecognition not supported');
    return {
      start: () => {},
      stop: () => {}
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  let running = false;
  let blocked = false;

  recognition.onstart = () => {
    running = true;
    blocked = false;
    const wakeWord = getWakeWord();
    onStatus?.(`Listening... say "${wakeWord}"`);
    console.info('[voice] mic started');
  };

  recognition.onend = () => {
    running = false;
    if (blocked) {
      return;
    }
    onStatus?.('Reconnecting mic...');
    console.info('[voice] mic stopped, restarting');
    setTimeout(() => {
      if (!running) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[voice] restart failed', e?.message || e);
        }
      }
    }, 400);
  };

  recognition.onerror = (e) => {
    if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed' || e?.error === 'aborted') {
      blocked = true;
      running = false;
      onStatus?.('Mic blocked. Enable microphone access to use voice.');
      console.warn('[voice] mic blocked or permission denied', e);
      return;
    }
    onStatus?.(`Mic error: ${e.error}`);
    console.error('[voice] mic error', e);
  };

  recognition.onresult = (event) => {
    // Only take the most recent phrase, not the entire session backlog.
    const last = event.results[event.results.length - 1];
    const transcript = Array.from(last || [])
      .map((r) => r?.transcript || '')
      .join(' ')
      .trim();
    if (transcript) {
      onTranscript?.(transcript);
    }
  };

  return {
    start() {
      if (blocked) {
        onStatus?.('Mic blocked. Enable microphone access to use voice.');
        return;
      }
      if (running) return;
      try {
        recognition.start();
        onStatus?.('Starting mic...');
      } catch (e) {
        if (e && e.name === 'NotAllowedError') {
          blocked = true;
          onStatus?.('Mic blocked. Enable microphone access to use voice.');
          return;
        }
        onStatus?.(`Unable to start mic: ${e.message}`);
      }
    },
    stop() {
      if (!running) return;
      recognition.stop();
    }
  };
}
