import { useEffect, useMemo, useState } from 'react';
import { loadSettings, saveSettings } from '../settings.js';

const focusRing = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-lime-400 focus-visible:outline-offset-2';

const textSizePreview = {
  small: 'text-base',
  medium: 'text-lg',
  large: 'text-xl'
};

const buttonSizes = {
  normal: 'px-4 py-2 text-sm',
  large: 'px-5 py-3 text-base',
  xlarge: 'px-6 py-3.5 text-lg'
};
const fallbackWakeWord = 'hey platform';

const flashClass = 'voice-flash';

function ensureFlashStyle() {
  if (document.getElementById('voice-flash-style')) return;
  const style = document.createElement('style');
  style.id = 'voice-flash-style';
  style.textContent = `
    .${flashClass} {
      outline: 3px solid #a5f3fc;
      outline-offset: 3px;
      transition: outline-color 0.4s ease;
    }
  `;
  document.head.appendChild(style);
}

function flashInteraction(el) {
  if (!el) return;
  ensureFlashStyle();
  if (typeof el.focus === 'function') el.focus({ preventScroll: true });
  el.classList.add(flashClass);
  setTimeout(() => el.classList.remove(flashClass), 800);
}

const spacingGaps = {
  snug: 'gap-2',
  roomy: 'gap-4',
  airy: 'gap-6'
};

const ToggleRow = ({ label, description, active, onToggle, styles }) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    onClick={onToggle}
    className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition ${active ? styles.active : styles.inactive} ${focusRing}`}
  >
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {description && <p className={`mt-1 text-sm ${styles.subdued}`}>{description}</p>}
    </div>
    <span
      aria-hidden
      className={`ml-4 inline-flex h-6 w-10 items-center rounded-full transition ${active ? styles.trackActive : styles.trackInactive}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition ${active ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </span>
  </button>
);

const PillOption = ({ label, active, onClick, ariaLabel, styles }) => (
  <button
    type="button"
    aria-label={ariaLabel || label}
    aria-pressed={active}
    onClick={onClick}
    className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${active ? styles.active : styles.inactive} ${focusRing}`}
  >
    {label}
  </button>
);

export default function Settings() {
  const defaults = useMemo(() => loadSettings(), []);
  const [textSize, setTextSize] = useState(defaults.textSize);
  const [highContrastText, setHighContrastText] = useState(defaults.highContrastText);
  const [captionsAlways, setCaptionsAlways] = useState(defaults.captionsAlways);
  const [visualAlerts, setVisualAlerts] = useState(defaults.visualAlerts);
  const [buttonSize, setButtonSize] = useState(defaults.buttonSize);
  const [spacing, setSpacing] = useState(defaults.spacing);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(defaults.wakeWordEnabled);
  const [wakeWord, setWakeWord] = useState(defaults.wakeWord);
  const [theme, setTheme] = useState(defaults.theme === 'high-contrast' ? 'high-contrast' : defaults.theme);
  const [highContrastMode, setHighContrastMode] = useState(defaults.highContrastMode || defaults.theme === 'high-contrast');
  const [reduceMotion, setReduceMotion] = useState(defaults.reduceMotion);
  const [commandsOpen, setCommandsOpen] = useState(false);

  useEffect(() => {
    setHighContrastMode(theme === 'high-contrast');
  }, [theme]);

  const applyVoiceSettings = (detail) => {
    switch (detail.action) {
      case 'set-high-contrast-mode':
        if (detail.value) {
          setTheme('high-contrast');
          setHighContrastMode(true);
        } else {
          setTheme('light');
          setHighContrastMode(false);
        }
        break;
      case 'set-theme': {
        const val = String(detail.value || '').toLowerCase();
        if (val === 'light') {
          setTheme('light');
          setHighContrastMode(false);
        } else if (val === 'dark') {
          setTheme('dark');
          setHighContrastMode(false);
        } else if (val === 'high-contrast' || val === 'high contrast') {
          setTheme('high-contrast');
          setHighContrastMode(true);
        }
        break;
      }
      case 'set-wake-word-enabled':
        if (detail.value === false) {
          setWakeWordEnabled(false);
          setWakeWord(fallbackWakeWord);
        } else {
          setWakeWordEnabled(true);
        }
        break;
      case 'set-wake-word':
        setWakeWordEnabled(true);
        if (detail.value) setWakeWord(detail.value);
        break;
      case 'set-text-size':
        if (['small','medium','large'].includes(detail.value)) setTextSize(detail.value);
        break;
      case 'set-reduce-motion':
        setReduceMotion(Boolean(detail.value));
        break;
      case 'set-captions':
        setCaptionsAlways(Boolean(detail.value));
        break;
      case 'set-visual-alerts':
        setVisualAlerts(Boolean(detail.value));
        break;
      case 'set-button-size':
        if (['normal','large','xlarge'].includes(detail.value)) setButtonSize(detail.value);
        break;
      case 'set-spacing':
        if (['snug','roomy','airy'].includes(detail.value)) setSpacing(detail.value);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    saveSettings({
      textSize,
      highContrastText,
      captionsAlways,
      visualAlerts,
      buttonSize,
      spacing,
      wakeWordEnabled,
      wakeWord,
      theme,
      highContrastMode: theme === 'high-contrast' ? true : highContrastMode,
      reduceMotion
    });
  }, [
    textSize,
    highContrastText,
    captionsAlways,
    visualAlerts,
    buttonSize,
    spacing,
    wakeWordEnabled,
    wakeWord,
    theme,
    highContrastMode,
    reduceMotion
  ]);

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e.detail || {};
      if (detail.type === 'commands') {
        e.preventDefault();
        if (detail.action === 'open') setCommandsOpen(true);
        if (detail.action === 'close') setCommandsOpen(false);
        return;
      }
      if (detail.type !== 'settings') return;
      e.preventDefault();
      applyVoiceSettings(detail);
      flashInteraction(document.querySelector('main'));
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, []);

  const sampleTextClasses = useMemo(() => {
    const sizeClass = textSizePreview[textSize] || textSizePreview.medium;
    if (highContrastText) return `${sizeClass} bg-slate-900 text-lime-100`;
    if (theme === 'dark') return `${sizeClass} bg-slate-800 text-slate-100`;
    return `${sizeClass} bg-slate-50 text-slate-900`;
  }, [textSize, highContrastText, theme]);

  const spacingClass = spacingGaps[spacing] || spacingGaps.roomy;
  const sampleButtonClass = buttonSizes[buttonSize] || buttonSizes.normal;
  const pageTone = useMemo(() => {
    if (highContrastMode) return 'bg-slate-900 text-lime-50';
    if (theme === 'dark') return 'bg-slate-900 text-slate-50';
    return 'bg-white text-slate-900';
  }, [highContrastMode, theme]);

  const cardTone = useMemo(() => {
    if (highContrastMode) return 'border border-lime-300 bg-slate-950 text-lime-50 shadow-[0_0_0_1px_rgba(190,242,100,0.25)]';
    if (theme === 'dark') return 'border border-slate-700 bg-slate-800 text-slate-50 shadow-sm shadow-black/20';
    return 'border border-slate-200 bg-white text-slate-900 shadow-sm';
  }, [highContrastMode, theme]);

  const softCardTone = useMemo(() => {
    if (highContrastMode) return 'border border-lime-300/70 bg-slate-900 text-lime-50';
    if (theme === 'dark') return 'border border-slate-700 bg-slate-800 text-slate-50';
    return 'border border-slate-200 bg-white text-slate-900';
  }, [highContrastMode, theme]);

  const sampleSurfaceTone = useMemo(() => {
    if (highContrastMode) return 'border border-lime-300/70 bg-slate-900 text-lime-50';
    if (theme === 'dark') return 'border border-slate-700 bg-slate-800 text-slate-50';
    return 'border border-slate-300 bg-slate-50 text-slate-900';
  }, [highContrastMode, theme]);

  const dashedTone = useMemo(() => {
    if (highContrastMode) return 'border-dashed border-lime-300/70 bg-slate-800 text-lime-50';
    if (theme === 'dark') return 'border-dashed border-slate-600 bg-slate-800 text-slate-50';
    return 'border-dashed border-slate-300 bg-slate-50 text-slate-900';
  }, [highContrastMode, theme]);

  const pillStyles = useMemo(() => {
    if (highContrastMode) return {
      active: 'border-lime-500 bg-lime-900 text-lime-100',
      inactive: 'border-lime-300 bg-slate-900 text-lime-50'
    };
    if (theme === 'dark') return {
      active: 'border-lime-500 bg-slate-800 text-lime-100',
      inactive: 'border-slate-600 bg-slate-800 text-slate-100'
    };
    return {
      active: 'border-lime-500 bg-lime-50 text-lime-900',
      inactive: 'border-slate-300 bg-white text-slate-800'
    };
  }, [highContrastMode, theme]);

  const toggleStyles = useMemo(() => {
    if (highContrastMode) return {
      active: 'border-lime-500 bg-lime-900 text-lime-100',
      inactive: 'border-lime-300 bg-slate-900 text-lime-50',
      trackActive: 'bg-lime-500',
      trackInactive: 'bg-lime-300/80',
      subdued: 'text-lime-200'
    };
    if (theme === 'dark') return {
      active: 'border-lime-500 bg-slate-800 text-lime-100',
      inactive: 'border-slate-600 bg-slate-800 text-slate-100',
      trackActive: 'bg-lime-500',
      trackInactive: 'bg-slate-500',
      subdued: 'text-slate-300'
    };
    return {
      active: 'border-lime-500 bg-lime-50 text-slate-900',
      inactive: 'border-slate-300 bg-white text-slate-900',
      trackActive: 'bg-lime-500',
      trackInactive: 'bg-slate-300',
      subdued: 'text-slate-600'
    };
  }, [highContrastMode, theme]);

  const headingTone = highContrastMode ? 'text-lime-50' : (theme === 'dark' ? 'text-slate-50' : 'text-slate-800');
  const subTone = highContrastMode ? 'text-lime-200' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-600');
  const bodyTone = highContrastMode ? 'text-lime-100' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700');
  const inputToneEnabled = useMemo(() => {
    if (highContrastMode) return 'border-lime-300 bg-slate-900 text-lime-100 placeholder-lime-200';
    if (theme === 'dark') return 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400';
    return 'border-slate-300 bg-white text-slate-900 placeholder-slate-500';
  }, [highContrastMode, theme]);
  const inputToneDisabled = useMemo(() => {
    if (highContrastMode) return 'border-lime-400/60 bg-slate-800 text-lime-200';
    if (theme === 'dark') return 'border-slate-700 bg-slate-800 text-slate-500';
    return 'border-slate-200 bg-slate-100 text-slate-500';
  }, [highContrastMode, theme]);

  const accentTone = highContrastMode ? 'text-lime-200' : (theme === 'dark' ? 'text-lime-300' : 'text-lime-700');

  const voiceCommands = useMemo(() => [
    { phrase: 'Open settings', description: 'Navigate to this page.' },
    { phrase: 'Enable high contrast mode', description: 'Switch to the high-contrast theme.' },
    { phrase: 'Set theme light / dark', description: 'Switch between light and dark themes.' },
    { phrase: 'Enable/disable wake word', description: 'Toggle the wake word listener.' },
    { phrase: 'Set wake word to <word>', description: 'Change the wake word text.' },
    { phrase: 'Increase/decrease text size', description: 'Set text size to small/medium/large.' },
    { phrase: 'Enable captions / visual alerts', description: 'Toggle hearing-friendly defaults.' },
    { phrase: 'Set button size large', description: 'Adjust control sizing.' },
    { phrase: 'Set spacing airy', description: 'Adjust spacing between elements.' },
    { phrase: 'Enable reduce animation', description: 'Reduce motion across the UI.' },
    { phrase: 'Open commands', description: 'Show this command list.' },
    { phrase: 'Close commands', description: 'Hide the command list.' }
  ], []);

  return (
    <div className={`min-h-screen ${pageTone}`}>
      <main className="page-shell max-w-6xl py-8 sm:py-12">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-wide ${accentTone}`}>Settings</p>
              <h1 className={`text-3xl font-bold sm:text-4xl ${headingTone}`}>Accessibility first</h1>
            </div>
            <button
              type="button"
              onClick={() => setCommandsOpen((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${focusRing} ${
                highContrastMode
                  ? 'border-lime-400 bg-slate-900 text-lime-100 hover:bg-slate-800'
                  : theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              aria-expanded={commandsOpen}
              aria-controls="settings-voice-commands"
            >
              {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
            </button>
          </div>
          {commandsOpen && (
            <section
              id="settings-voice-commands"
              className={`rounded-xl border px-4 py-3 ${softCardTone}`}
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${headingTone}`}>Voice commands for Settings</p>
                <button
                  type="button"
                  className={`text-xs font-semibold underline ${subTone} ${focusRing}`}
                  onClick={() => setCommandsOpen(false)}
                >
                  Close
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {voiceCommands.map((cmd) => (
                  <li key={cmd.phrase} className={subTone}>
                    <span className="font-semibold text-lime-700 dark:text-lime-300">{cmd.phrase}</span>
                    <span className="ml-2 text-xs opacity-80">{cmd.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </header>

        <div className="mt-10">
          <section className={`rounded-2xl ${cardTone} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${headingTone}`}>Accessibility</h2>
              </div>
              <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime-800">Priority</span>
            </div>

            <div className="mt-4 space-y-4">
              <fieldset className={`rounded-xl ${sampleSurfaceTone} p-4`} aria-label="Text size options">
                <legend className={`text-sm font-semibold ${headingTone}`}>Text size</legend>
                <div className="flex flex-wrap items-center gap-2 mt-2" role="group" aria-label="Choose text size">
                  {['small', 'medium', 'large'].map(size => (
                    <PillOption
                      key={size}
                      label={size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large'}
                      active={textSize === size}
                      onClick={() => setTextSize(size)}
                      styles={pillStyles}
                      ariaLabel={`Text size ${size}`}
                    />
                  ))}
                </div>
                <div className={`mt-3 rounded-xl border px-4 py-3 ${dashedTone} ${sampleTextClasses}`} aria-live="polite">
                  “Sample text stays readable. Adjust size and contrast to taste.”
                </div>
              </fieldset>

              <div className={`rounded-xl ${softCardTone} p-4 shadow-sm`}>
                <h3 className={`text-sm font-semibold ${headingTone}`}>Captions & visual feedback</h3>
                <div className="mt-3 space-y-3">
                  <ToggleRow
                    label="Always show captions for videos"
                    description="Hearing-impaired safe default."
                    active={captionsAlways}
                    onToggle={() => setCaptionsAlways(v => !v)}
                    styles={toggleStyles}
                  />
                  {/* <ToggleRow
                    label="Replace audio alerts with visual indicators"
                    description="Flash banners or subtle pulses instead of sounds."
                    active={visualAlerts}
                    onToggle={() => setVisualAlerts(v => !v)}
                    styles={toggleStyles}
                  /> */}
                </div>
              </div>

              <div className={`rounded-xl ${softCardTone} p-4 shadow-sm`}>
                <h3 className={`text-sm font-semibold ${headingTone}`}>Motor accessibility</h3>
                <div className="mt-3 space-y-3">
                  <fieldset>
                    <legend className={`text-sm font-semibold ${headingTone}`}>Button size</legend>
                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose button size">
                      {[
                        { id: 'normal', label: 'Normal' },
                        { id: 'large', label: 'Large' },
                        { id: 'xlarge', label: 'Extra Large' }
                      ].map(opt => (
                        <PillOption
                          key={opt.id}
                          label={opt.label}
                          active={buttonSize === opt.id}
                          onClick={() => setButtonSize(opt.id)}
                          styles={pillStyles}
                          ariaLabel={`Button size ${opt.label}`}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className={`text-sm font-semibold ${headingTone}`}>Spacing between elements</legend>
                    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose spacing">
                      {[
                        { id: 'snug', label: 'Tight' },
                        { id: 'roomy', label: 'Roomy' },
                        { id: 'airy', label: 'Extra room' }
                      ].map(opt => (
                        <PillOption
                          key={opt.id}
                          label={opt.label}
                          active={spacing === opt.id}
                          onClick={() => setSpacing(opt.id)}
                          styles={pillStyles}
                          ariaLabel={`Spacing ${opt.label}`}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div className={`rounded-xl border ${dashedTone} p-4 ${spacingClass}`} aria-hidden tabIndex={-1}>
                    <button type="button" tabIndex={-1} className={`rounded-lg bg-lime-700 font-semibold text-white shadow-sm transition hover:bg-lime-800 ${sampleButtonClass}`}>Tap</button>
                    <button type="button" tabIndex={-1} className={`rounded-lg bg-slate-900 font-semibold text-white shadow-sm transition hover:bg-slate-800 ${sampleButtonClass}`}>Confirm</button>
                    <button type="button" tabIndex={-1} className={`rounded-lg bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 ${sampleButtonClass}`}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`mt-6 rounded-2xl ${cardTone} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${headingTone}`}>Voice control</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Voice</span>
            </div>

            <div className="mt-4 space-y-4">
              <ToggleRow
                label="Wake word enabled"
                description="Keeps the mic primed for hands-free navigation."
                active={wakeWordEnabled}
                onToggle={() => setWakeWordEnabled(v => !v)}
                styles={toggleStyles}
              />
              <label className={`block text-sm font-semibold ${headingTone}`}>
                Change wake word (optional)
                <input
                  type="text"
                  value={wakeWord}
                  onChange={(e) => setWakeWord(e.target.value)}
                  disabled={!wakeWordEnabled}
                  placeholder="e.g., Voyager"
                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${focusRing} ${wakeWordEnabled ? inputToneEnabled : inputToneDisabled}`}
                />
                <p className={`mt-1 text-sm ${subTone}`}>Default: "Astra". Pick a word with softer consonants to reduce false triggers.</p>
              </label>
            </div>
          </section>

          <section className={`mt-6 rounded-2xl ${cardTone} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${headingTone}`}>UI personalisation</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Visual</span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className={`text-sm font-semibold ${headingTone}`}>Mode</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'high-contrast', label: 'High contrast' }
                  ].map(opt => (
                    <PillOption
                      key={opt.id}
                      label={opt.label}
                      active={theme === opt.id}
                      onClick={() => {
                        setTheme(opt.id);
                        setHighContrastMode(opt.id === 'high-contrast');
                      }}
                      styles={pillStyles}
                    />
                  ))}
                </div>
              </div>

              <ToggleRow
                label="Reduce animation"
                description="Minimise motion for attention and cognitive needs."
                active={reduceMotion}
                onToggle={() => setReduceMotion(v => !v)}
                styles={toggleStyles}
              />
            </div>
          </section>

          <section className={`mt-6 rounded-2xl ${cardTone} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${headingTone}`}>About & accessibility statement</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Info</span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <p className={`font-semibold ${headingTone}`}>About</p>
              <p className={bodyTone}>Accessible Games Hub focuses on discoverability for players with hearing, vision, and motor needs.</p>
              <p className={`font-semibold ${headingTone}`}>Accessibility Statement</p>
              <ul className={`list-disc space-y-1 pl-5 ${bodyTone}`}>
                <li>WCAG 2.1 AA intent; captions and visual alerts default on.</li>
                <li>Supports screen readers, keyboard-only navigation, and voice with wake word.</li>
                <li>Contact: <a href="mailto:accessibility@team13.games" className={`${accentTone} underline`}>accessibility@team13.games</a> for issues.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
