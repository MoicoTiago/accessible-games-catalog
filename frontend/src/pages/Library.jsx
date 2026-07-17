import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '../api.js';
import { getGame } from '../api.js';

export default function Library() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('favourites');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedTags, setSelectedTags] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const commandsBtnRef = useRef(null);

  const [favourites, setFavourites] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const navigate = useNavigate();

  // voice feedback style
  const flashClass = 'voice-flash';
  useEffect(() => {
    const styleId = 'voice-flash-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `.${flashClass}{outline:3px solid #a5f3fc;outline-offset:3px;transition: outline-color .4s ease}`;
    document.head.appendChild(style);
  }, []);
  const focusAndFlash = (el) => { if (!el) return; try { el.focus?.({ preventScroll: true }); } catch {} el.classList.add(flashClass); setTimeout(()=>el.classList.remove(flashClass), 1000); };
  const normalizeText = (s = '') => s.toLowerCase().replace(/[.,!?]/g, '').trim();

  // voice command handling
  useEffect(() => {
    const onVoice = (e) => {
      const detail = e.detail || {};
      const { type } = detail;
      if (!type) return;

      if (type === 'commands') {
        e.preventDefault?.();
        const shouldOpen = detail.action !== 'close';
        setCommandsOpen(shouldOpen);
        setTimeout(() => {
          const btn = commandsBtnRef.current || document.querySelector('[aria-controls="library-voice-commands"]');
          focusAndFlash(btn);
        }, 30);
        return;
      }

      // query for searching
      if (type === 'search' && detail.query != null) {
        setQuery(String(detail.query));
        const input = document.querySelector('input[placeholder="Search"]');
        focusAndFlash(input);
        return;
      }
      // query for filters
      if (type === 'filter') {
        const tags = detail.tags || (detail.tag ? [detail.tag] : []);
        if (tags.length === 0) return;
        // Map incoming tags to canonical availableTags by case-insensitive match
        const canon = (raw) => {
          const needle = normalizeText(String(raw));
          const match = availableTags.find(t => normalizeText(t) === needle || normalizeText(t).includes(needle) || needle.includes(normalizeText(t)));
          return match || raw;
        };
        setSelectedTags(prev => {
          const next = new Set(prev);
          tags.map(canon).forEach(t => next.add(t));
          return next;
        });
        setFiltersOpen(true);
        const panel = document.getElementById('lib-filters');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusAndFlash(panel);
        return;
      }
      // resetting filters
      if (type === 'reset-filters') {
        setSelectedTags(new Set());
        const panel = document.getElementById('lib-filters');
        focusAndFlash(panel);
        return;
      }
      // Sort by value
      if (type === 'sort' && detail.value) {
        const target = normalizeText(detail.value);
        const options = ['relevance','rating','title'];
        const match = options.find(o => normalizeText(o) === target || normalizeText(o).includes(target) || target.includes(normalizeText(o)));
        if (match) {
          setSortBy(match);
          const select = document.querySelector('select[aria-label="Sort by"]');
          if (select) { select.value = match; focusAndFlash(select); select.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        return;
      }
      // this will navigate tabs
      if (type === 'navigate' && detail.target) {
        const t = normalizeText(detail.target);
        const desired = t.includes('wishlist') ? 'wishlist' : (t.includes('favourites') || t.includes('favorites')) ? 'favourites' : null;
        if (!desired) return;
        //  will ignore if already on desired tab
        if (tab === desired) return;
        // debounce rapid repeats
        if (window.__libTabDebounce) return;
        window.__libTabDebounce = true;
        setTab(desired);
        setTimeout(() => { window.__libTabDebounce = false; }, 300);
        return;
      }
      // this will open a specific game card
      if (type === 'game-card' && detail.title) {
        const needle = normalizeText(detail.title);
        const cards = Array.from(document.querySelectorAll('[data-voice-title]'));
        const card = cards.find(c => {
          const attr = normalizeText(c.getAttribute('data-voice-title') || '');
          const text = normalizeText(c.textContent || '');
          return attr === needle || text.includes(needle) || needle.includes(attr);
        });
        if (card) {
          e.preventDefault?.();
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          focusAndFlash(card);
          if (detail.action === 'open') setTimeout(()=>card.querySelector('a,button')?.click(), 120);
        }
        return;
      }
      // this will scroll
      if (type === 'scroll') {
        const dir = detail.direction;
        window.scrollBy({ top: dir === 'up' ? -400 : 400, behavior: 'smooth' });
        return;
      }
      // operation to remove games by title from library
      if (type === 'library' && detail.action === 'remove' && detail.title) {
        const titleNeedle = normalizeText(detail.title);
        const which = (detail.list === 'wishlist') ? 'wishlist' : 'favourites';
        const list = which === 'wishlist' ? wishlist : favourites;
        const match = list.find(g => normalizeText(g.title || g.name || '') === titleNeedle || normalizeText(g.title || g.name || '').includes(titleNeedle) || titleNeedle.includes(normalizeText(g.title || g.name || '')));
        if (match) {
          e.preventDefault?.();
          const card = document.querySelector(`[data-voice-title="${match.title || match.name}"]`);
          focusAndFlash(card);
          if (which === 'wishlist') {
            removeFromWishlist(match.id);
          } else {
            removeFromFavourites(match.id);
          }
          window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: which, gameId: match.id } }));
        }
        return;
      }
      // Library operations: move between favourites and wishlist by title
      if (type === 'library' && detail.action === 'move' && detail.title && detail.list) {
        const titleNeedle = normalizeText(detail.title);
        const targetList = detail.list === 'wishlist' ? 'wishlist' : 'favourites';
        // Try to find in either list
        const inFav = favourites.find(g => normalizeText(g.title || g.name || '') === titleNeedle || normalizeText(g.title || g.name || '').includes(titleNeedle));
        const inWl = wishlist.find(g => normalizeText(g.title || g.name || '') === titleNeedle || normalizeText(g.title || g.name || '').includes(titleNeedle));
        const match = inFav || inWl;
        if (match) {
          e.preventDefault?.();
          // Perform the move immediately
          if (targetList === 'wishlist') {
            moveToWishlist(match);
          } else {
            moveToFavourites(match);
          }
          // Visual feedback: flash if card is present
          const card = document.querySelector(`[data-voice-title="${match.title || match.name}"]`);
          focusAndFlash(card);
        } else {
          // Not found; optionally switch to likely source tab to help user
          if (targetList === 'wishlist' && tab !== 'favourites') setTab('favourites');
          if (targetList === 'favourites' && tab !== 'wishlist') setTab('wishlist');
        }
        return;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, [wishlist, favourites, tab]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const me = await fetchCurrentUser();
        setUser(me);
        const favRaw = localStorage.getItem(`favourites:${me.id}`);
        const wlRaw = localStorage.getItem(`wishlist:${me.id}`);
        const favIds = favRaw ? JSON.parse(favRaw) : [];
        const wlIds = wlRaw ? JSON.parse(wlRaw) : [];
        const enrich = async (items) => {
          const ids = items.map(i => i.id != null ? i.id : i);
          const results = await Promise.all(ids.map(async (id) => {
            try { return await getGame(id); } catch { return null; }
          }));
          return results.filter(Boolean).map(g => ({
            id: g.id,
            title: g.name || g.title,
            developer: g.developer,
            category: g.category,
            rating: g.rating,
            reviews: g.reviews || [],
            tags: (g.tags || []).map(t => (t.name || t)),
            images: g.images || [],
          }));
        };
        const [favFull, wlFull] = await Promise.all([enrich(favIds), enrich(wlIds)]);
        setFavourites(favFull);
        setWishlist(wlFull);
      } catch (e) {
        setError(e.message || 'Failed to load library');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    const handler = async () => {
      if (!user) return;
      const favRaw = localStorage.getItem(`favourites:${user.id}`);
      const wlRaw = localStorage.getItem(`wishlist:${user.id}`);
      const favIds = favRaw ? JSON.parse(favRaw) : [];
      const wlIds = wlRaw ? JSON.parse(wlRaw) : [];
      const enrich = async (items) => {
        const ids = items.map(i => i.id != null ? i.id : i);
        const results = await Promise.all(ids.map(async (id) => {
          try { return await getGame(id); } catch { return null; }
        }));
        return results.filter(Boolean).map(g => ({
          id: g.id,
          title: g.name || g.title,
          developer: g.developer,
          category: g.category,
          rating: g.rating,
          reviews: g.reviews || [],
          tags: (g.tags || []).map(t => (t.name || t)),
          images: g.images || [],
        }));
      };
      const [favFull, wlFull] = await Promise.all([enrich(favIds), enrich(wlIds)]);
      setFavourites(favFull);
      setWishlist(wlFull);
    };
    window.addEventListener('library:updated', handler);
    return () => window.removeEventListener('library:updated', handler);
  }, [user]);

  const persist = (key, items) => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  };
  const saveFavourites = (items) => {
    if (!user) return;
    setFavourites(items);
    persist(`favourites:${user.id}`, items);
  };
  const saveWishlist = (items) => {
    if (!user) return;
    setWishlist(items);
    persist(`wishlist:${user.id}`, items);
  };

  const removeFromWishlist = (gameId) => saveWishlist(wishlist.filter(g => g.id !== gameId));
  const removeFromFavourites = (gameId) => saveFavourites(favourites.filter(g => g.id !== gameId));

  const moveToWishlist = (game) => {
    if (!user) return;
    const favNext = favourites.filter(g => g.id !== game.id);
    const wlExists = wishlist.some(g => g.id === game.id);
    const wlNext = wlExists ? wishlist : [...wishlist, game];
    saveFavourites(favNext);
    saveWishlist(wlNext);
    window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'wishlist', gameId: game.id } }));
  };

  const moveToFavourites = (game) => {
    if (!user) return;
    const wlNext = wishlist.filter(g => g.id !== game.id);
    const favExists = favourites.some(g => g.id === game.id);
    const favNext = favExists ? favourites : [...favourites, game];
    saveWishlist(wlNext);
    saveFavourites(favNext);
    window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'favourites', gameId: game.id } }));
  };

  const getImageUrl = (game) => {
    if (!game) return '/placeholder1.png';
    if (game.imageUrl) return game.imageUrl;
    if (Array.isArray(game.images) && game.images.length) return game.images[0];
    return '/placeholder1.png';
  };

  const availableTags = useMemo(() => {
    const set = new Set();
    const source = [...favourites, ...wishlist];
    source.forEach(g => (g.tags || []).forEach(t => set.add(typeof t === 'string' ? t : (t?.name || ''))));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [favourites, wishlist]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const applyFilters = (list) => {
    const q = query.trim().toLowerCase();
    const tags = Array.from(selectedTags);
    const filtered = list.filter(g => {
      const mq = !q || (g.title || '').toLowerCase().includes(q);
      // Case-insensitive tag matching
      const gameTags = (g.tags || []).map(x => normalizeText(typeof x === 'string' ? x : (x?.name || '')));
      const mt = tags.length === 0 || tags.every(t => gameTags.includes(normalizeText(t)));
      return mq && mt;
    });
    const arr = [...filtered];
    switch (sortBy) {
      case 'rating':
        return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'title':
        return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return arr;
    }
  };

  const filteredFav = useMemo(() => applyFilters(favourites), [favourites, query, selectedTags, sortBy]);
  const filteredWish = useMemo(() => applyFilters(wishlist), [wishlist, query, selectedTags, sortBy]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!user) return null;

  // this uses tone tokens already used across the other pages
  const shellTone = 'theme-page';
  const cardTone = 'theme-surface border theme-border rounded-2xl shadow-lg';
  const subtleCard = 'theme-subtle border theme-border rounded-xl';
  const smallMeta = 'text-sm theme-muted';
  const voiceCommands = [
    { phrase: 'Open commands / Close commands', description: 'Show or hide this help panel' },
    { phrase: 'Show favourites / Show wishlist', description: 'Switch between library tabs' },
    { phrase: 'Search for "<game>"', description: 'Fill the search box with your query' },
    { phrase: 'Filter by <tag>', description: 'Add one or more tags to the filters' },
    { phrase: 'Reset filters', description: 'Clear all selected tags' },
    { phrase: 'Sort by rating / title / relevance', description: 'Change the sort order' },
    { phrase: 'Open <game>', description: 'Focus and open a game card' },
    { phrase: 'Move <game> to wishlist / favourites', description: 'Move a game between lists' },
    { phrase: 'Remove <game> from favourites / wishlist', description: 'Delete a game from a list' },
    { phrase: 'Scroll up / Scroll down', description: 'Scroll the page view' },
  ];

  const renderCard = (g) => (
    <div key={g.id} className={`relative flex items-start gap-4 ${cardTone} p-4`} data-voice-title={g.title || g.name}>
      <div className="overflow-hidden rounded-xl">
        <img src={getImageUrl(g)} alt={g.title} className="w-28 h-20 object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold theme-text truncate">{g.title || g.name}</h3>
        <p className={`${smallMeta}`}>
          {g.developer || 'Developer'} • {g.category || 'Category'}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-yellow-500 text-sm">★★★★★</span>
          <span className="theme-muted text-xs">{g.rating?.toFixed?.(1) || '—'} ({g.reviews?.length || 0})</span>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {(g.tags || []).slice(0, 3).map((t, i) => (
            <span key={i} className="theme-subtle border theme-border px-2 py-[2px] rounded-full text-[10px] leading-none theme-text">
              {typeof t === 'string' ? t : t?.name || ''}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-3 top-3 flex gap-2">
        {tab === 'favourites' ? (
          <button onClick={() => moveToWishlist(g)} className="theme-btn px-3 py-1 rounded-md" aria-label="Move to wishlist">♥</button>
        ) : (
          <button onClick={() => moveToFavourites(g)} className="theme-btn px-3 py-1 rounded-md" aria-label="Move to favourites">★</button>
        )}
        <button
          className="theme-subtle border theme-border px-3 py-1 rounded-md"
          aria-label="Delete"
          onClick={() => (tab === 'favourites' ? removeFromFavourites(g.id) : removeFromWishlist(g.id))}
        >X</button>
      </div>
      <div className="absolute right-3 bottom-3">
        <Link to={`/games/${g.id}`} className="theme-btn px-3 py-1 rounded-md text-sm">View details</Link>
      </div>
    </div>
  );

  return (
    <div className={`${shellTone} min-h-screen flex justify-center py-10 lg:pb-20`}>
      <main className="page-shell w-full max-w-6xl space-y-8">
        <section className={`${cardTone} p-6`}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <h1 className="text-2xl font-bold theme-text">My favourites / wishlist</h1>
            <button
              type="button"
              onClick={() => setCommandsOpen((v) => !v)}
              ref={commandsBtnRef}
              className="inline-flex items-center gap-2 rounded-md border theme-border theme-surface px-4 py-2 text-sm font-semibold theme-text shadow-sm transition hover:-translate-y-[1px] hover:shadow focus-visible:translate-y-0"
              aria-expanded={commandsOpen}
              aria-controls="library-voice-commands"
            >
              {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
            </button>
          </div>

          {commandsOpen && (
            <section
              id="library-voice-commands"
              className="rounded-xl border theme-border theme-surface px-4 py-3 text-sm theme-text mb-4"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold theme-text">Voice commands for Library</p>
                <button
                  type="button"
                  className="text-xs font-semibold underline theme-muted"
                  onClick={() => setCommandsOpen(false)}
                >
                  Close
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {voiceCommands.map((cmd) => (
                  <li key={cmd.phrase}>
                    <span className="font-semibold">{cmd.phrase}</span>
                    <span className="ml-2 text-xs theme-muted">{cmd.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('favourites')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${tab === 'favourites' ? 'theme-btn' : 'theme-subtle border theme-border'}`}>Favourites</button>
            <button onClick={() => setTab('wishlist')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${tab === 'wishlist' ? 'theme-btn' : 'theme-subtle border theme-border'}`}>Wishlist</button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="flex-1 rounded-md theme-input py-2 px-3" />
            <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-md theme-input px-3 py-2">
              <option value="relevance">Relevance</option>
              <option value="rating">Rating</option>
              <option value="title">Title</option>
            </select>
            <button className="rounded-md theme-subtle px-3 py-2 border theme-border" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} aria-controls="lib-filters">Filter ▾</button>
          </div>

          {filtersOpen && (
            <div id="lib-filters" className={`${subtleCard} p-3 mb-4`}>
              <div className="flex flex-wrap gap-2">
                {availableTags.length === 0 && <span className="text-sm theme-muted">No tags available</span>}
                {availableTags.map(tag => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded-full text-xs border ${active ? 'theme-btn' : 'theme-subtle theme-border'}`}
                      aria-pressed={active}
                      data-voice-tag={tag}
                    >{tag}</button>
                  );
                })}
              </div>
              {selectedTags.size > 0 && (
                <div className="mt-3 flex gap-2">
                  <button className="theme-subtle border theme-border px-3 py-1 rounded-md text-xs" onClick={() => setSelectedTags(new Set())}>Clear filters</button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {(tab === 'favourites' ? filteredFav : filteredWish).map(renderCard)}
            {(tab === 'favourites' ? filteredFav : filteredWish).length === 0 && (
              <div className={`${subtleCard} p-6 text-center text-sm`}>No games yet. Browse the <Link to="/Search" className="text-sky-600">Search</Link> page and add some!</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
