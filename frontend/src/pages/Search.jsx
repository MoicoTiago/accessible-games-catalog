import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchGames, fetchTagGroups, searchGames } from '../api.js';
import { loadSettings } from '../settings.js';

const focusRing = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-lime-400 focus-visible:outline-offset-2';

export default function Search() {
  const settings = useMemo(() => loadSettings(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState('');

  const [selectedTags, setSelectedTags] = useState(() => new Set());
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [commandsOpen, setCommandsOpen] = useState(false);

  const [serverResults, setServerResults] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Refs for voice-driven focus/scroll
  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);
  const resultsRef = useRef(null);
  const genreSelectRef = useRef(null);
  const sortSelectRef = useRef(null);
  const timeoutsRef = useRef(new Set());

  // Category accordion open state
  const [openCategories, setOpenCategories] = useState(() => new Set());

  // Load tag groups
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { groups } = await fetchTagGroups();
        if (!alive) return;
        setGroups(groups || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load tag groups');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Init state from URL
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    const tags = (searchParams.get('tags') || '');
    const genre = searchParams.get('genre') || '';
    const sort = searchParams.get('sort') || '';
    if (q) setQuery(q);
    const t = new Set(tags.split(',').map(s => s.trim()).filter(Boolean));
    if (t.size) setSelectedTags(t);
    if (genre) setSelectedGenre(genre);
    if (['relevance','newest','rating','title'].includes(sort)) setSortBy(sort);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all games
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setGamesLoading(true);
        setGamesError('');
        const data = await fetchGames();
        if (!alive) return;
        setGames(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setGamesError(e?.message || 'Failed to load games');
      } finally {
        if (alive) setGamesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Keep URL in sync
  useEffect(() => {
    const next = {};
    if (query.trim()) next.q = query.trim();
    const t = Array.from(selectedTags);
    if (t.length) next.tags = t.join(',');
    if (selectedGenre) next.genre = selectedGenre;
    if (sortBy !== 'relevance') next.sort = sortBy;
    setSearchParams(next, { replace: true });
  }, [query, selectedTags, selectedGenre, sortBy, setSearchParams]);

  // Client-side filter
  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tags = Array.from(selectedTags);
    if (selectedGenre) tags.push(selectedGenre);
    return games.filter(g => {
      const mq = !q
        || g.title?.toLowerCase().includes(q)
        || (g.platform || '').toLowerCase().includes(q)
        || (g.tags || []).some(t => t.toLowerCase().includes(q));
      const mt = tags.length === 0 || tags.every(t => (g.tags || []).includes(t));
      return mq && mt;
    });
  }, [games, query, selectedTags, selectedGenre]);

  // Server-side search (debounced)
  useEffect(() => {
    let cancel = false;
    const timer = setTimeout(async () => {
      try {
        setServerLoading(true);
        setServerError('');
        const t = Array.from(selectedTags);
        if (selectedGenre) t.push(selectedGenre);
        const data = await searchGames({ q: query, tags: t });
        if (!cancel) setServerResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setServerError(e?.message || 'Search failed');
      } finally {
        if (!cancel) setServerLoading(false);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(timer); };
  }, [query, selectedTags, selectedGenre]);

  const haveFilters = Boolean(query.trim() || selectedTags.size || selectedGenre);
  const finalResults = (serverError || (serverResults.length === 0 && haveFilters))
    ? filteredGames
    : (haveFilters ? serverResults : filteredGames);

  // Ensure cards always show the full tag set from /api/games, even when
  // server-side search returns only the matched tags for performance.
  const fullTagsById = useMemo(() => {
    const map = new Map();
    games.forEach(g => {
      map.set(g.id, g.tags || []);
    });
    return map;
  }, [games]);

  const hydratedResults = useMemo(
    () => finalResults.map(r => ({
      ...r,
      tags: fullTagsById.get(r.id) || r.tags || []
    })),
    [finalResults, fullTagsById]
  );

  const sortedResults = useMemo(() => {
    const arr = [...hydratedResults];
    switch (sortBy) {
      case 'rating':
        return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'title':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case 'newest':
        return arr.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
      default:
        return arr;
    }
  }, [hydratedResults, sortBy]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const genreOptions = (() => {
    // Accept several shapes from API: { id:'genres', label:'Genres', tags:[...] }
    // or legacy { name:'Genres', tags:[...] } or { group:'Genres', items:[...] }
    const group = groups.find(g => g?.label === 'Genres' || g?.id === 'genres' || g?.name === 'Genres' || g?.group === 'Genres');
    if (!group) return [];
    const tags = group.tags || group.items || [];
    return Array.isArray(tags) ? tags : [];
  })();

  // Build Accessibility Category -> Tags mapping from backend groups
  const categories = useMemo(() => {
    const catGroup = groups.find(g => g?.label === 'Accessibility Categories' || g?.id === 'accessibility-categories');
    return Array.isArray(catGroup?.tags) ? catGroup.tags : [];
  }, [groups]);

  const tagsByCategory = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      const idGuess = String(cat || '').toLowerCase();
      const group = groups.find(g => g?.id === idGuess || g?.label === `${cat} Tags` || g?.name === `${cat} Tags`);
      const tags = group?.tags || [];
      map[cat] = Array.isArray(tags) ? tags : [];
    });
    return map;
  }, [groups, categories]);

  const allTags = useMemo(() => {
    const names = [];
    groups.forEach(g => {
      const t = g?.tags || g?.items;
      if (Array.isArray(t)) names.push(...t);
    });
    return names;
  }, [groups]);

  const toggleCategoryOpen = (cat) => {
    const key = categoryKey(cat);
    if (!key) return;
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const slugify = (s = '') => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Light highlight to show what was toggled via voice
  const flashClass = 'voice-flash';
  const normalizeText = (s = '') => s.toLowerCase().replace(/[.,!?]/g, '').trim();
  const tagSynonyms = {
    'colorblind mode': 'Colourblind Mode',
    'colourblind mode': 'Colourblind Mode',
    'colour blind mode': 'Colourblind Mode',
    'color blind mode': 'Colourblind Mode',
    'colour blind': 'Colourblind Mode',
    'color blind': 'Colourblind Mode',
    'no audio needed': 'No Audio Needed',
    'no audio': 'No Audio Needed',
    'no audio required': 'No Audio Needed',
    'no sound': 'No Audio Needed',
    'no voice required': 'No Voice Required',
    'no voice needed': 'No Voice Required',
    'one handed': 'One-Handed',
    'one hand': 'One-Handed',
    'screenreader friendly': 'Screen Reader Friendly',
    'screen reader friendly': 'Screen Reader Friendly'
  };
  const canonicalTagName = (name = '') => {
    const norm = normalizeText(name);
    return tagSynonyms[norm] || name;
  };

  const categorySynonyms = {
    vision: 'Vision',
    visual: 'Vision',
    seeing: 'Vision',
    hearing: 'Hearing',
    motor: 'Motor',
    movement: 'Motor',
    speech: 'Speech',
    voice: 'Speech',
    cognitive: 'Cognitive',
    cognition: 'Cognitive'
  };

  const voiceCommands = useMemo(() => [
    { phrase: 'Search for <term>', description: 'Fill the search box and jump to results.' },
    { phrase: 'Filter by <tag>', description: 'Toggle an accessibility tag, e.g., “filter by motor”.' },
    { phrase: 'Reset filters', description: 'Clear search, tags, and genre.' },
    { phrase: 'Open filters', description: 'Scroll to the filters panel.' },
    { phrase: 'Open genre dropdown', description: 'Focus the genre selector.' },
    { phrase: 'Sort by rating/newest/title', description: 'Change how results are ordered.' },
    { phrase: 'Open <game name>', description: 'Open a specific game card from results.' },
    { phrase: 'Scroll down/up', description: 'Scroll the results list.' },
    { phrase: 'Open commands', description: 'Show this command list.' },
    { phrase: 'Close commands', description: 'Hide the command list.' },
  ], []);

  const canonicalCategoryName = (name = '') => {
    const needle = normalizeText(name);
    const fromGroups = categories.find((c) => {
      const hay = normalizeText(c);
      return hay === needle || hay.includes(needle) || needle.includes(hay);
    });
    if (fromGroups) return String(fromGroups).trim();
    return categorySynonyms[needle] || String(name).trim();
  };

  const categoryKey = (name = '') => normalizeText(canonicalCategoryName(name));
  useEffect(() => {
    const styleId = 'voice-flash-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .${flashClass} {
        outline: 3px solid #a5f3fc;
        outline-offset: 3px;
        transition: outline-color 0.4s ease;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const clearTrackedTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
  };

  const trackTimeout = (fn, delay) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, delay);
    timeoutsRef.current.add(id);
    return id;
  };

  const focusAndFlash = (el) => {
    if (!el) return;
    if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    el.classList.add(flashClass);
    trackTimeout(() => el.classList.remove(flashClass), 1200);
  };

  const clickTagButton = (tag) => {
    const canonical = canonicalTagName(tag);
    const needle = normalizeText(canonical);
    const btn = Array.from(document.querySelectorAll('button[data-voice-tag]')).find((b) => {
      const attr = normalizeText(canonicalTagName(b.getAttribute('data-voice-tag')));
      const txt = normalizeText(canonicalTagName(b.textContent));
      return attr === needle || txt === needle || attr.includes(needle) || needle.includes(attr) || txt.includes(needle) || needle.includes(txt);
    });
    if (!btn) return false;

    const isActive = btn.getAttribute('aria-pressed') === 'true';
    // Only click if we need to toggle on
    if (!isActive) btn.click();
    focusAndFlash(btn);
    return true;
  };

  const setCategoryOpenByVoice = (name, shouldOpen = true) => {
    const targetCat = canonicalCategoryName(String(name || ''));
    const key = categoryKey(targetCat);
    if (!key) return false;
    const needle = normalizeText(targetCat);

    setOpenCategories(prev => {
      const next = new Set(prev);
      if (shouldOpen) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });

    // Try to click the actual accordion button so ARIA state is accurate.
    trackTimeout(() => {
      const btnCandidates = [
        document.querySelector(`[aria-label="${targetCat} dropdown"]`),
        document.getElementById(`cat-btn-${slugify(targetCat)}`),
        ...Array.from(document.querySelectorAll('button')).filter((b) => {
          const label = normalizeText(b.getAttribute('aria-label') || '');
          const txt = normalizeText(b.textContent || '');
          return label.includes(needle) || txt.includes(needle);
        })
      ].filter(Boolean);

      const btn = btnCandidates[0];
      if (btn) {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (shouldOpen && !expanded) btn.click();
        if (!shouldOpen && expanded) btn.click();
        focusAndFlash(btn);
      }
    }, 80);
    return true;
  };

  const setGenreByVoice = (genre) => {
    const select = genreSelectRef.current;
    if (!select) return false;
    const match = Array.from(select.options).find(
      opt => normalizeText(opt.value) === normalizeText(genre) || normalizeText(opt.textContent) === normalizeText(genre)
    );
    if (match) {
      select.value = match.value;
      setSelectedGenre(match.value);
      focusAndFlash(select);
      // Fire a change event to keep parity with user interaction
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  };

  const setSortByVoice = (value) => {
    const select = sortSelectRef.current;
    if (!select) return false;
    const target = normalizeText(value);
    const match = Array.from(select.options).find(opt => {
      const v = normalizeText(opt.value);
      const t = normalizeText(opt.textContent);
      return v === target || t === target || v.includes(target) || target.includes(v) || t.includes(target) || target.includes(t);
    });
    if (match) {
      select.value = match.value;
      setSortBy(match.value);
      focusAndFlash(select);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  };

  // Voice commands: search, filter, and open filters drawer.
  useEffect(() => {
    const matchGenre = (name = '') => {
      const needle = normalizeText(name);
      return genreOptions.find((g) => {
        const hay = g.toLowerCase();
        return hay === needle || hay.includes(needle) || needle.includes(hay);
      });
    };

    const matchTag = (name = '') => {
      const needle = normalizeText(canonicalTagName(name));
      return allTags.find((t) => {
        const hay = normalizeText(canonicalTagName(t));
        return hay === needle || hay.includes(needle) || needle.includes(hay);
      });
    };

    const onVoice = (e) => {
      const detail = e.detail || {};
      const type = detail.type;
      if (!type) return;
      console.info('[voice][search] command', detail);

      if (type === 'commands') {
        e.preventDefault();
        if (detail.action === 'close') setCommandsOpen(false);
        else setCommandsOpen(true);
        return;
      }

      if (type === 'search' && detail.query) {
        e.preventDefault();
        setQuery(detail.query);
        searchInputRef.current?.focus({ preventScroll: true });
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (type === 'filter' && (detail.tag || Array.isArray(detail.tags))) {
        e.preventDefault();
        const spokenList = Array.isArray(detail.tags) ? detail.tags : [detail.tag];
        spokenList.forEach((raw, idx) => {
          const spokenTag = canonicalTagName(raw);
          const genre = matchGenre(spokenTag);
          const tag = matchTag(spokenTag);
          const offset = 50 + idx * 120;

          // Expand relevant category accordion if we know where this tag lives
          const catEntry = Object.entries(tagsByCategory).find(
            ([, tags]) => Array.isArray(tags) && tags.some(t => normalizeText(canonicalTagName(t)) === normalizeText(spokenTag))
          );
          if (catEntry) {
            const [catName] = catEntry;
            setOpenCategories(prev => new Set(prev).add(catName));
          }

          if (genre) {
            setQuery('');
            trackTimeout(() => {
              setGenreByVoice(genre);
            }, offset);
          } else if (tag) {
            setQuery('');
            const attempt = () => clickTagButton(tag);
            trackTimeout(attempt, offset);
            trackTimeout(() => {
              const clicked = attempt();
              if (!clicked) setSelectedTags(prev => new Set([...prev, tag]));
            }, offset + 120);
          } else {
            toggleTag(spokenTag);
            console.info('[voice][search] fallback toggle for tag text', spokenTag);
            trackTimeout(() => {
              const btns = Array.from(document.querySelectorAll('button[data-voice-tag]'));
              const needle = normalizeText(spokenTag);
              const btn = btns.find(b => {
                const hay = normalizeText(canonicalTagName(b.getAttribute('data-voice-tag')));
                const txt = normalizeText(canonicalTagName(b.textContent));
                return hay === needle || txt === needle || hay.includes(needle) || needle.includes(hay) || txt.includes(needle) || needle.includes(txt);
              });
              if (btn) {
                btn.click();
                focusAndFlash(btn);
              }
            }, offset);
          }
        });
        filtersRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (type === 'reset-filters') {
        e.preventDefault();
        setQuery('');
        setSelectedTags(new Set());
        setSelectedGenre('');
        setSortBy('relevance');
        setOpenCategories(new Set());
        filtersRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (type === 'ui' && detail.target === 'filters') {
        e.preventDefault();
        filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (type === 'ui' && detail.target === 'category' && detail.value) {
        e.preventDefault();
        const shouldOpen = detail.action !== 'close';
        setCategoryOpenByVoice(detail.value, shouldOpen);
        filtersRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (type === 'ui' && detail.target === 'dropdown' && detail.value) {
        e.preventDefault();
        const target = normalizeText(detail.value);
        const select = target.startsWith('sort') ? sortSelectRef.current : genreSelectRef.current;
        if (select) {
          select.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth', block: 'center' });
          focusAndFlash(select);
          if (detail.action === 'close') {
            select.blur();
          } else {
            select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          }
        }
        return;
      }

      if (type === 'sort' && detail.value) {
        e.preventDefault();
        setSortByVoice(detail.value);
        return;
      }

      if (type === 'game-card' && detail.title) {
        e.preventDefault();
        const card = findGameCardByTitle(detail.title);
        if (card) {
          card.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth', block: 'center' });
          focusAndFlash(card);
          if (detail.action === 'open') {
            trackTimeout(() => card.click(), 120);
          }
        }
        return;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => {
      window.removeEventListener('voiceCommand', onVoice);
      clearTrackedTimeouts();
    };
  }, [genreOptions, allTags, tagsByCategory, categories]);

  useEffect(() => () => clearTrackedTimeouts(), []);

  const findGameCardByTitle = (title = '') => {
    const needle = normalizeText(title);
    const cards = Array.from(document.querySelectorAll('[data-voice-title]'));
    return cards.find(card => {
      const attr = normalizeText(card.getAttribute('data-voice-title') || '');
      const text = normalizeText(card.textContent || '');
      return attr === needle || text.includes(needle) || needle.includes(attr);
    });
  };

  const pageTone = settings.highContrastMode
    ? 'bg-slate-900 text-lime-50'
    : settings.theme === 'dark'
      ? 'bg-slate-900 text-slate-100'
      : 'bg-white text-slate-900';

  const panelTone = settings.highContrastMode
    ? 'border border-lime-300 bg-slate-950 text-lime-50 shadow-[0_0_0_1px_rgba(190,242,100,0.25)]'
    : settings.theme === 'dark'
      ? 'border border-slate-700 bg-slate-800 text-slate-100 shadow-sm shadow-black/20'
      : 'border border-slate-200 bg-white text-slate-900 shadow-sm';

  const sectionTone = settings.highContrastMode
    ? 'border border-lime-300/70 bg-slate-900 text-lime-50'
    : settings.theme === 'dark'
      ? 'border border-slate-700 bg-slate-800 text-slate-100'
      : 'border border-slate-200 bg-white text-slate-900';

  const inputTone = settings.highContrastMode
    ? 'border-lime-300 bg-slate-900 text-lime-50 placeholder-lime-200'
    : settings.theme === 'dark'
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400'
      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500';

  const textSizeClass = (() => {
    if (settings.textSize === 'small') return 'text-sm';
    if (settings.textSize === 'large') return 'text-lg';
    return 'text-base';
  })();
  const spacingGap = (() => {
    if (settings.spacing === 'snug') return 'gap-2';
    if (settings.spacing === 'airy') return 'gap-6';
    return 'gap-4';
  })();

  const focusVisible = settings.focusIndicator ? focusRing : '';
  const reduceMotion = settings.reduceMotion ? 'motion-reduce:transition-none motion-reduce:animate-none' : '';
  const headingTone = settings.highContrastMode ? 'text-lime-50' : settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const subTone = settings.highContrastMode ? 'text-lime-200' : settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-700';
  const labelTone = settings.highContrastMode ? 'text-lime-100' : settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-700';
  const platformTone = settings.highContrastMode ? 'text-lime-200' : settings.theme === 'dark' ? 'text-lime-300' : 'text-lime-700';
  const ratingMetaTone = settings.highContrastMode ? 'text-lime-200' : settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-500';
  const inputTextTone = settings.highContrastMode
    ? 'text-lime-50 placeholder-lime-200'
    : settings.theme === 'dark'
      ? 'text-slate-100 placeholder-slate-300'
      : 'text-slate-900 placeholder-slate-500';

  return (
    <div className={`min-h-screen ${pageTone} ${textSizeClass}`}>
      <main className="page-shell max-w-6xl py-8 sm:py-12">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h1 className="text-3xl font-bold sm:text-4xl">Search</h1>
            <button
              type="button"
              onClick={() => setCommandsOpen((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${focusVisible} ${
                settings.highContrastMode
                  ? 'border-lime-400 bg-slate-900 text-lime-100 hover:bg-slate-800'
                  : settings.theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              aria-expanded={commandsOpen}
              aria-controls="voice-commands-panel"
            >
              {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
            </button>
          </div>

          {commandsOpen && (
            <section
              id="voice-commands-panel"
              className={`rounded-xl border px-4 py-3 ${sectionTone}`}
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${headingTone}`}>Voice commands for this page</p>
                <button
                  type="button"
                  className={`text-xs font-semibold underline ${subTone} ${focusVisible}`}
                  onClick={() => setCommandsOpen(false)}
                >
                  Close
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {voiceCommands.map((cmd) => (
                  <li key={cmd.phrase} className={`${subTone}`}>
                    <span className="font-semibold text-lime-600 dark:text-lime-300">{cmd.phrase}</span>
                    <span className="ml-2 text-xs opacity-80">{cmd.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </header>

        {/* Search bar */}
        <div className={`mt-6 flex items-center gap-2 rounded-2xl border px-3 py-2 ${inputTone} ${focusVisible}`}>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-500">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="search-field"
            ref={searchInputRef}
            type="search"
            placeholder="Search games, genres, or accessibility tags..."
            className={`w-full bg-transparent px-2 py-2 ${textSizeClass} ${inputTextTone} focus:outline-none`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search games"
          />
        </div>

        <div className="mt-8 grid grid-cols-12 gap-6">
          {/* Sticky left drawer */}
          <aside className="col-span-12 self-start lg:col-span-4 lg:sticky lg:top-6">
            <fieldset ref={filtersRef} className={`rounded-2xl p-4 shadow-sm ${panelTone}`}>
              <legend className="sr-only">Filters</legend>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${headingTone}`}>Filters</h2>
                <button
                  type="button"
                  className={`rounded-md border px-3 py-1 text-sm font-semibold hover:bg-slate-50 ${focusVisible} ${settings.highContrastMode ? 'border-lime-400 bg-slate-900 text-lime-100 hover:bg-slate-800' : settings.theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-800'}`}
                  onClick={() => { setQuery(''); setSelectedTags(new Set()); setSelectedGenre(''); setSortBy('relevance'); }}
                >
                  Reset
                </button>
              </div>

              {/* Disability Categories (accordion to reveal specific tags) */}
              <section className="mt-4">
                <h3 className={`text-sm font-semibold ${subTone}`}>Disability Categories</h3>
                <div className={`mt-2 grid grid-cols-1 ${spacingGap}`}>
                  {categories.map(cat => {
                    const isOpen = openCategories.has(categoryKey(cat));
                    const slug = slugify(cat);
                    const btnId = `cat-btn-${slug}`;
                    const panelId = `cat-panel-${slug}`;
                    return (
                      <div key={cat} className="rounded-lg">
                        <button
                          id={btnId}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-semibold ${focusVisible} ${
                            settings.highContrastMode
                              ? 'border-lime-400 bg-slate-900 text-lime-100'
                              : settings.theme === 'dark'
                                ? 'border-slate-700 bg-slate-800 text-slate-100'
                                : 'border-slate-300 bg-white text-slate-800'
                          }`}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          aria-label={`${cat} dropdown`}
                          onClick={() => toggleCategoryOpen(cat)}
                        >
                          <span>{cat}</span>
                          <span aria-hidden className={`ml-2 ${settings.highContrastMode ? 'text-lime-200' : settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-500'}`}>{isOpen ? '▾' : '▸'}</span>
                        </button>
                        {isOpen && (
                          <div id={panelId} role="region" aria-labelledby={btnId} className={`border-t p-2 ${settings.highContrastMode ? 'border-lime-300/60 bg-slate-900' : settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                            <div className={`grid grid-cols-1 ${spacingGap}`}>
                              {(tagsByCategory[cat] || []).map(tag => {
                                const active = selectedTags.has(tag);
                                return (
                                  <button
                                    key={tag}
                                    data-voice-tag={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${focusVisible} ${
                                      active
                                        ? settings.highContrastMode
                                          ? 'border border-lime-500 bg-lime-900 text-lime-100'
                                          : settings.theme === 'dark'
                                            ? 'border border-lime-500 bg-slate-800 text-lime-100'
                                            : 'border border-lime-500 bg-lime-50 text-lime-800'
                                        : settings.highContrastMode
                                          ? 'border border-lime-300 bg-slate-900 text-lime-50'
                                          : settings.theme === 'dark'
                                            ? 'border border-slate-700 bg-slate-800 text-slate-100'
                                            : 'border border-slate-300 bg-white text-slate-800'
                                    }`}
                                    aria-pressed={active}
                                  >
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Genre dropdown */}
              <div className={`mt-5 rounded-xl p-3 ${sectionTone}`}>
                <label htmlFor="genre" className={`block text-sm font-semibold ${labelTone}`}>Genre</label>
                <select
                  id="genre"
                  ref={genreSelectRef}
                  aria-label="Genre dropdown"
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${focusVisible} ${inputTone}`}
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="">All</option>
                  {genreOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Sort dropdown */}
              <div className={`mt-4 rounded-xl p-3 ${sectionTone}`}>
                <label htmlFor="sort-by" className={`block text-sm font-semibold ${labelTone}`}>Sort By</label>
                <select
                  id="sort-by"
                  ref={sortSelectRef}
                  aria-label="Sort by dropdown"
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${focusVisible} ${inputTone}`}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="rating">Rating</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${focusVisible} ${reduceMotion} ${
                    settings.highContrastMode
                      ? 'border-lime-400 bg-lime-500/20 text-lime-100 hover:bg-lime-500/30'
                      : settings.theme === 'dark'
                        ? 'border-lime-400 bg-lime-400/15 text-lime-100 hover:bg-lime-400/25'
                        : 'border-lime-500 bg-lime-500/10 text-lime-800 hover:bg-lime-500/20'
                  }`}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${focusVisible} ${settings.highContrastMode ? 'border-lime-400 bg-slate-900 text-lime-100 hover:bg-slate-800' : settings.theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
                  onClick={() => { setQuery(''); setSelectedTags(new Set()); setSelectedGenre(''); setSortBy('relevance'); }}
                >
                  Reset
                </button>
              </div>
            </fieldset>
          </aside>

          {/* Results */}
          <section ref={resultsRef} className="col-span-12 space-y-4 lg:col-span-8">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <nav aria-label="Breadcrumbs" className={`${subTone} font-medium`}>Home › Search › {selectedGenre ? `Results for "${selectedGenre}"` : (query ? `Results for "${query}"` : 'All Results')}</nav>
              <span className={subTone}>Filters (open)</span>
            </div>

            {gamesLoading || serverLoading ? (
              <p className="text-slate-700" role="status" aria-live="polite">Loading games...</p>
            ) : gamesError ? (
              <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                settings.highContrastMode
                  ? 'border-rose-300 bg-rose-950 text-rose-100'
                  : settings.theme === 'dark'
                    ? 'border-rose-300/70 bg-rose-900 text-rose-100'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
                <span aria-hidden className="mt-0.5 text-lg">⚠️</span>
                <p className="font-semibold">Search error: <span className="font-normal">{gamesError}</span></p>
              </div>
            ) : sortedResults.length === 0 ? (
              <p className="text-slate-700">No games found.</p>
            ) : (
              <ul role="list" aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedResults.map(g => {
                  const tagCount = Array.isArray(g.tags) ? g.tags.length : 0;
                  const tagNames = tagCount ? g.tags.join(', ') : '';
                  const tagListId = tagCount ? `game-tags-${g.id}` : undefined;
                  const accessibleLabel = [
                    g.title || 'Game',
                    g.platform || '',
                    g.rating != null ? `rating ${Number(g.rating).toFixed(1)}` : 'not rated',
                    tagCount ? `${tagCount} tag${tagCount === 1 ? '' : 's'}` : 'no tags',
                    tagNames ? `tags: ${tagNames}` : ''
                  ].filter(Boolean).join(', ');
                  return (
                    <li key={g.id}>
                    <Link
                      to={`/games/${g.id}`}
                      data-voice-title={g.title || ''}
                      className={`block h-full ${focusVisible}`}
                      aria-label={accessibleLabel}
                      aria-describedby={tagListId}
                    >
                        <article className={`h-full overflow-hidden rounded-2xl border shadow-sm ${panelTone}`}>
                          {Array.isArray(g.images) && g.images.length > 0 ? (
                            <img
                              src={g.images[0]}
                              alt={`${g.title} cover`}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className={`${settings.highContrastMode ? 'bg-slate-800' : 'bg-slate-200'} h-32 w-full`} aria-hidden></div>
                          )}
                          <div className="p-4 space-y-3">
                            <header className="flex items-baseline justify-between gap-3">
                              <h3 className="text-lg font-bold">{g.title}</h3>
                              {g.platform && (
                                <span className={`text-xs font-semibold uppercase tracking-wide ${platformTone}`}>{g.platform}</span>
                              )}
                            </header>
                            {g.rating != null && (
                              <div className="flex items-center gap-2 text-sm">
                                <span aria-hidden className="text-amber-500">&#9733;</span>
                                <span className="font-semibold">{Number(g.rating).toFixed(1)}</span>
                                <span className={`text-xs ${ratingMetaTone}`}>(rating)</span>
                              </div>
                            )}
                            {Array.isArray(g.tags) && g.tags.length > 0 && (
                              <div className={`flex flex-wrap ${spacingGap}`} aria-label="Accessibility tags">
                                {g.tags.map(t => {
                                  const isActive = selectedTags.has(t) || (!!selectedGenre && selectedGenre === t);
                                  const baseClasses = 'rounded-full px-3 py-1 text-xs font-semibold';
                                  const activeClasses = settings.highContrastMode
                                    ? 'border border-lime-500 bg-lime-900 text-lime-100'
                                    : settings.theme === 'dark'
                                      ? 'border border-lime-500 bg-slate-800 text-lime-100'
                                      : 'border border-lime-600 bg-lime-50 text-lime-900';
                                  const inactiveClasses = settings.highContrastMode
                                    ? 'border border-lime-300 bg-slate-900 text-lime-50'
                                    : settings.theme === 'dark'
                                      ? 'border border-slate-700 bg-slate-800 text-slate-100'
                                      : 'border border-slate-300 bg-slate-50 text-slate-700';
                                  return (
                                    <span
                                      key={`${g.id}-${t}`}
                                      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                                    >
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {tagListId && (
                              <p id={tagListId} className="sr-only">Tags: {tagNames}</p>
                            )}
                          </div>
                        </article>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
