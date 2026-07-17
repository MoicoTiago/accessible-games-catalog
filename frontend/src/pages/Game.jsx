import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGame, createReviewForGame, getReviewsForGame, followGame, unfollowGame, getFollowedGames, reportGame } from '../api';
import { fetchCurrentUser } from '../api';
import { pushToast } from '../components/ToastHost.jsx';
import { getAccessibilityPreferences } from '../api.js';
import { loadSettings } from '../settings.js';

const focusRing = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-lime-400 focus-visible:outline-offset-2';

function RatingStars({ value, tone = 'text-amber-500' }) {
  const v = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${v} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${i < v ? tone : 'text-slate-400 dark:text-slate-500'}`}
          fill="currentColor"
        >
          <path d="M12 2.5 9.24 8.26 3 9.27l4.5 4.38L6.82 20.5 12 17.77 17.18 20.5l-0.68-6.85L21 9.27l-6.24-1.01Z" />
        </svg>
      ))}
    </div>
  );
}

export default function Game() {
  const { id } = useParams();
  const [settings, setSettings] = useState(() => loadSettings());
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [addIndex, setAddIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSubmitError, setReportSubmitError] = useState(null);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [announce, setAnnounce] = useState('');

  const heroVideoRef = useRef(null);
  const heroTrackRef = useRef(null);
  const followBtnRef = useRef(null);
  const reviewBtnRef = useRef(null);
  const reviewRatingRef = useRef(null);
  const reviewCommentRef = useRef(null);
  const reviewSubmitRef = useRef(null);
  const reportTextareaRef = useRef(null);
  const reportSubmitRef = useRef(null);
  const heroRef = useRef(null);
  const addCarouselRef = useRef(null);
  const favouriteBtnRef = useRef(null);
  const wishlistBtnRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const commandsBtnRef = useRef(null);

  const flashClass = 'voice-flash';
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

  const focusAndFlash = (el) => {
    if (!el) return;
    if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    el.classList.add(flashClass);
    setTimeout(() => el.classList.remove(flashClass), 1000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [gameData, reviews] = await Promise.all([getGame(id), getReviewsForGame(id)]);
        if (cancelled) return;
        setGame({ ...gameData, reviews });
      } catch (e) {
        if (cancelled) return;
        setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { fetchCurrentUser().then(setCurrentUser).catch(() => {}); }, []);

  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener('settings:changed', handler);
    window.addEventListener('settings-changed', handler);
    return () => {
      window.removeEventListener('settings:changed', handler);
      window.removeEventListener('settings-changed', handler);
    };
  }, []);

  useEffect(() => {
    setCaptionsEnabled(Boolean(settings?.captionsAlways));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      if (!currentUser) return;
      try {
        const prefs = await getAccessibilityPreferences(currentUser.id);
        if (!cancelled) {
          const fromBackend = !!prefs?.hearing;
          const fromSettings = Boolean(loadSettings()?.captionsAlways);
          setCaptionsEnabled(fromSettings || fromBackend);
        }
      } catch {
        try {
          setCaptionsEnabled(Boolean(loadSettings()?.captionsAlways));
        } catch { /* ignore */ }
      }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    async function checkFollow() {
      if (!currentUser || !game) return;
      try {
        const list = await getFollowedGames(currentUser.id);
        if (!cancelled) setIsFollowed(list.some(g => g.id === game.id));
      } catch { /* ignore */ }
    }
    checkFollow();
    return () => { cancelled = true; };
  }, [currentUser, game]);

  useEffect(() => {
    if (!currentUser || !game) return;
    const safeParse = (raw) => {
      try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    };
    const favRaw = safeParse(localStorage.getItem(`favourites:${currentUser.id}`));
    const wlRaw = safeParse(localStorage.getItem(`wishlist:${currentUser.id}`));
    const hasFav = favRaw.some((g) => (g?.id ?? g) === game.id);
    const hasWl = wlRaw.some((g) => (g?.id ?? g) === game.id);
    setIsFavourite(hasFav);
    setIsWishlisted(hasWl);
  }, [currentUser, game]);

  useEffect(() => {
    const vid = heroVideoRef.current;
    const trackEl = heroTrackRef.current;
    if (!vid) return;

    const setTrackModes = () => {
      try {
        const list = vid.textTracks;
        if (!list || list.length === 0) return;
        let chosen = null;
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          const isCaptionLike = t.kind === 'captions' || t.kind === 'subtitles';
          if (!isCaptionLike) { t.mode = 'disabled'; continue; }
          const isEn = (t.language || '').toLowerCase() === 'en';
          if (!chosen && isCaptionLike) chosen = t;
          if (isEn) chosen = t;
        }
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          const isCaptionLike = t.kind === 'captions' || t.kind === 'subtitles';
          t.mode = captionsEnabled && isCaptionLike && t === chosen ? 'showing' : 'disabled';
        }
      } catch { /* ignore */ }
    };

    setTrackModes();
    const onMeta = () => setTrackModes();
    const onData = () => setTrackModes();
    const onAdd = () => setTimeout(setTrackModes, 0);
    const onTrackLoad = () => setTrackModes();

    vid.addEventListener('loadedmetadata', onMeta);
    vid.addEventListener('loadeddata', onData);
    if (vid.textTracks && typeof vid.textTracks.addEventListener === 'function') {
      vid.textTracks.addEventListener('addtrack', onAdd);
    }
    if (trackEl && typeof trackEl.addEventListener === 'function') {
      trackEl.addEventListener('load', onTrackLoad);
    }

    return () => {
      vid.removeEventListener('loadedmetadata', onMeta);
      vid.removeEventListener('loadeddata', onData);
      if (vid.textTracks && typeof vid.textTracks.removeEventListener === 'function') {
        vid.textTracks.removeEventListener('addtrack', onAdd);
      }
      if (trackEl && typeof trackEl.removeEventListener === 'function') {
        trackEl.removeEventListener('load', onTrackLoad);
      }
    };
  }, [captionsEnabled, heroIndex]);

  useEffect(() => {
    const onSettings = (e) => {
      const s = (e && e.detail) || loadSettings();
      if (typeof s?.captionsAlways === 'boolean') {
        setCaptionsEnabled(Boolean(s.captionsAlways));
      }
    };
    window.addEventListener('settings:changed', onSettings);
    window.addEventListener('settings-changed', onSettings);
    return () => {
      window.removeEventListener('settings:changed', onSettings);
      window.removeEventListener('settings-changed', onSettings);
    };
  }, []);

  useEffect(() => {
    if (showReviewModal) {
      setTimeout(() => {
        const el = reviewRatingRef.current || reviewCommentRef.current;
        el?.focus({ preventScroll: true });
      }, 30);
    }
  }, [showReviewModal]);

  useEffect(() => {
    if (showReportModal) {
      setTimeout(() => reportTextareaRef.current?.focus({ preventScroll: true }), 30);
    }
  }, [showReportModal]);

  const voiceCommands = useMemo(() => [
    { phrase: 'Open commands', description: 'Show this voice help panel' },
    { phrase: 'Follow game / Unfollow game', description: 'Toggle follow status' },
    { phrase: 'Add to favourites / Add to wishlist', description: 'Save the game to a list' },
    { phrase: 'Next image / Previous image', description: 'Move the main gallery' },
    { phrase: 'Next media strip / Previous media strip', description: 'Move the media row' },
    { phrase: 'Write review / Submit review', description: 'Open and post a review' },
    { phrase: 'Set review rating to four', description: 'Update the rating dropdown' },
    { phrase: 'Report game', description: 'Open the report form' },
    { phrase: 'Scroll down / Scroll up', description: 'Navigate the page' }
  ], []);

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e.detail || {};
      if (detail.type === 'commands') {
        e.preventDefault?.();
        const shouldOpen = detail.action !== 'close';
        setCommandsOpen(shouldOpen);
        setTimeout(() => {
          if (shouldOpen && commandsBtnRef.current) focusAndFlash(commandsBtnRef.current);
        }, 30);
        return;
      }
      if (detail.type !== 'game') return;
      switch (detail.action) {
        case 'follow':
        case 'unfollow':
          if (followBtnRef.current) {
            followBtnRef.current.click();
            focusAndFlash(followBtnRef.current);
          }
          break;
        case 'write-review':
          e.preventDefault?.();
          openReviewModal();
          setTimeout(() => focusAndFlash(reviewCommentRef.current || document.querySelector('textarea')), 50);
          break;
        case 'open-reviews':
          e.preventDefault?.();
          openReviewModal();
          setTimeout(() => focusAndFlash(reviewRatingRef.current), 50);
          break;
        case 'download':
          pushToast('Download action not implemented yet');
          focusAndFlash(downloadBtnRef.current);
          break;
        case 'wishlist':
          e.preventDefault?.();
          handleWishlist();
          focusAndFlash(wishlistBtnRef.current);
          break;
        case 'favourites':
          e.preventDefault?.();
          handleFavourite();
          focusAndFlash(favouriteBtnRef.current);
          break;
        case 'report':
          if (!currentUser) {
            pushToast('Please log in to report this game');
            break;
          }
          if (!showReportModal) openReportModal();
          setTimeout(() => focusAndFlash(reportTextareaRef.current || document.querySelector('[data-voice-report-textarea]')), 50);
          break;
        case 'set-review-rating':
          if (!showReviewModal) openReviewModal();
          setReviewRating(detail.value || 5);
          focusAndFlash(reviewRatingRef.current);
          break;
        case 'focus-review-comment':
          if (!showReviewModal) openReviewModal();
          setTimeout(() => focusAndFlash(reviewCommentRef.current), 30);
          break;
        case 'set-review-comment':
          if (!showReviewModal) openReviewModal();
          setReviewComment(detail.value || '');
          setTimeout(() => focusAndFlash(reviewCommentRef.current), 30);
          break;
        case 'submit-review': {
          if (!showReviewModal) openReviewModal({ preserve: true });
          const clickSubmit = () => {
            const btn = reviewSubmitRef.current || document.querySelector('[data-voice-review-submit]');
            if (btn && !submittingReview) {
              btn.click();
              focusAndFlash(btn);
              return true;
            }
            return false;
          };
          setTimeout(() => {
            if (clickSubmit()) return;
            setTimeout(() => {
              if (clickSubmit()) return;
              setTimeout(clickSubmit, 120);
            }, 80);
          }, 120);
          break;
        }
        case 'cancel-review':
          if (showReviewModal) closeReviewModal();
          break;
        case 'next-image':
          nextHero();
          focusAndFlash(heroRef.current);
          break;
        case 'prev-image':
          prevHero();
          focusAndFlash(heroRef.current);
          break;
        case 'next-additional':
          nextAdditional();
          focusAndFlash(addCarouselRef.current);
          break;
        case 'prev-additional':
          prevAdditional();
          focusAndFlash(addCarouselRef.current);
          break;
        default:
          break;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, [currentUser, game, showReviewModal, submittingReview, showReportModal]);

  const openReviewModal = (opts = {}) => {
    const preserve = opts.preserve === true;
    if (!preserve) {
      setReviewRating(5);
      setReviewComment('');
      setSubmitError(null);
    }
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (submittingReview) return;
    setShowReviewModal(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setSubmitError('Please provide a comment');
      return;
    }
    try {
      setSubmittingReview(true);
      setSubmitError(null);

      await createReviewForGame(id, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });

      const [updatedGame, updatedReviews] = await Promise.all([getGame(id), getReviewsForGame(id)]);
      setGame({ ...updatedGame, reviews: updatedReviews });
      setShowReviewModal(false);
      setAnnounce('Review submitted');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReportModal = (opts = {}) => {
    const preserve = opts.preserve === true;
    if (!currentUser) {
      pushToast('Please log in to report this game');
      return;
    }
    if (!preserve) {
      setReportMessage('');
      setReportError(null);
      setReportSubmitError(null);
    }
    setShowReportModal(true);
    setTimeout(() => reportTextareaRef.current?.focus({ preventScroll: true }), 0);
  };

  const closeReportModal = () => {
    if (submittingReport) return;
    setShowReportModal(false);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    const msg = (reportMessage || '').trim();
    if (!msg) {
      setReportError('Please describe why you are reporting this game');
      focusAndFlash(reportTextareaRef.current);
      return;
    }
    try {
      setSubmittingReport(true);
      setReportError(null);
      setReportSubmitError(null);
      await reportGame(id, msg);
      pushToast('Report submitted. Thank you for your feedback.');
      setAnnounce('Report submitted');
      setShowReportModal(false);
      setReportMessage('');
    } catch (err) {
      setReportSubmitError(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleWishlist = () => {
    try {
      if (!currentUser) { pushToast('Log in to add to wishlist'); return; }
      const key = `wishlist:${currentUser.id}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const item = { id: game.id, title: game.name, imageUrl: (Array.isArray(game.images) && game.images[0]) || '/placeholder1.png', rating: game.rating, tags: (game.tags || []).map(t => (t.name || t)) };
      const exists = list.find(g => (g?.id ?? g) === item.id);
      if (!exists) {
        localStorage.setItem(key, JSON.stringify([...list, item]));
        window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'wishlist', gameId: game.id } }));
        pushToast('Added to wishlist');
        setAnnounce('Added to wishlist');
      } else {
        pushToast('Already in wishlist');
      }
      setIsWishlisted(true);
    } catch {
      pushToast('Wishlist error');
    }
  };

  const handleFavourite = () => {
    try {
      if (!currentUser) { pushToast('Log in to add favourites'); return; }
      const key = `favourites:${currentUser.id}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const item = { id: game.id, title: game.name, imageUrl: (Array.isArray(game.images) && game.images[0]) || '/placeholder1.png', rating: game.rating, tags: (game.tags || []).map(t => (t.name || t)) };
      const exists = list.find(g => (g?.id ?? g) === item.id);
      if (!exists) {
        localStorage.setItem(key, JSON.stringify([...list, item]));
        window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'favourites', gameId: game.id } }));
        pushToast('Added to favourites');
        setAnnounce('Added to favourites');
      } else {
        pushToast('Already a favourite');
      }
      setIsFavourite(true);
    } catch {
      pushToast('Favourites error');
    }
  };

  const applyReviewVoteLocally = (reviewId, desiredVote) => {
    setGame((prev) => {
      if (!prev?.reviews) return prev;
      const updated = prev.reviews.map((r) => {
        if (r.id !== reviewId) return r;
        const currentVote = Number(r.myVote) || 0;
        let likes = Number(r.likes) || 0;
        let dislikes = Number(r.dislikes) || 0;

        if (desiredVote === 1) {
          likes += currentVote === 1 ? -1 : 1;
          if (currentVote === -1) dislikes = Math.max(0, dislikes - 1);
        } else if (desiredVote === -1) {
          dislikes += currentVote === -1 ? -1 : 1;
          if (currentVote === 1) likes = Math.max(0, likes - 1);
        } else {
          if (currentVote === 1) likes = Math.max(0, likes - 1);
          if (currentVote === -1) dislikes = Math.max(0, dislikes - 1);
        }

        return { ...r, likes, dislikes, myVote: desiredVote };
      });
      return { ...prev, reviews: updated };
    });
  };

  const handleReviewVote = async (reviewId, desiredVote) => {
    if (!currentUser) {
      pushToast('Log in to vote on reviews');
      return;
    }
    const previousReview = game?.reviews?.find((r) => r.id === reviewId);
    applyReviewVoteLocally(reviewId, desiredVote);
    try {
      await voteOnReview(reviewId, desiredVote);
      if (desiredVote === 1) setAnnounce('Marked review as helpful');
      else if (desiredVote === -1) setAnnounce('Marked review as not helpful');
      else setAnnounce('Cleared vote on review');
    } catch (err) {
      pushToast(err.message || 'Could not record vote');
      if (previousReview) {
        setGame((prev) => {
          if (!prev?.reviews) return prev;
          return {
            ...prev,
            reviews: prev.reviews.map((r) => (r.id === reviewId ? previousReview : r)),
          };
        });
      }
    }
  };

  const reviews = game?.reviews || [];
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating - 1]++;
  });
  const ratingDist = [...ratingCounts].reverse();

  const date = game?.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'N/A';
  const images = Array.isArray(game?.images) && game.images.length
    ? game.images
    : ['/placeholder1.png', '/placeholder2.png', '/placeholder3.png'];
  const trailerUrl = (game?.name === 'Aurora Quest') ? '/AuroraQuestTrailer.mp4' : null;
  const media = trailerUrl ? [trailerUrl, ...images] : images;
  const currentHero = media[heroIndex % media.length];

  const ADD_VISIBLE = 3;
  const addWindow = media.slice(addIndex, addIndex + ADD_VISIBLE).length === ADD_VISIBLE
    ? media.slice(addIndex, addIndex + ADD_VISIBLE)
    : [...media.slice(addIndex), ...media.slice(0, (addIndex + ADD_VISIBLE) % media.length)];

  const prevHero = () => setHeroIndex((i) => (i - 1 + media.length) % media.length);
  const nextHero = () => setHeroIndex((i) => (i + 1) % media.length);
  const prevAdditional = () => setAddIndex(i => (i - 1 + media.length) % media.length);
  const nextAdditional = () => setAddIndex(i => (i + 1) % media.length);

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
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-300'
      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500';

  const textSizeClass = settings.textSize === 'small' ? 'text-sm' : settings.textSize === 'large' ? 'text-lg' : 'text-base';
  const spacingGap = settings.spacing === 'snug' ? 'gap-3' : settings.spacing === 'airy' ? 'gap-6' : 'gap-4';
  const focusVisible = settings.focusIndicator ? focusRing : '';
  const reduceMotion = settings.reduceMotion ? 'motion-reduce:transition-none motion-reduce:animate-none' : '';
  const headingTone = settings.highContrastMode ? 'text-lime-50' : settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const subTone = settings.highContrastMode ? 'text-lime-200' : settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-600';

  if (loading) {
    return (
      <div className={`min-h-screen ${pageTone} ${textSizeClass}`}>
        <main className="page-shell max-w-6xl py-10">
          <p role="status" aria-live="polite" className="text-sm">Loading game details...</p>
        </main>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className={`min-h-screen ${pageTone} ${textSizeClass}`}>
        <main className="page-shell max-w-6xl py-10">
          <div className={`rounded-xl border px-4 py-3 text-sm ${sectionTone}`} role="alert">
            <p className="font-semibold">Could not load this game.</p>
            <p className="text-xs mt-1">{error || 'Not found'}</p>
            <Link to="/search" className="mt-3 inline-flex items-center text-sm font-semibold underline">Return to search</Link>
          </div>
        </main>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
    : (Number(game.rating) || 0);
  const maxRatingCount = Math.max(...ratingDist, 1);
  const tags = (game.tags || []).map(t => (typeof t === 'string' ? t : (t.name || t.label || ''))).filter(Boolean);
  const gameTitle = game.name || game.title || 'Game';
  const metaId = `game-meta-${id}`;
  const tagsId = `game-tags-${id}`;
  const srMeta = `${game.developer || 'Unknown developer'}; ${game.category || 'Category'}; Average rating ${avgRating.toFixed(1)} from ${reviews.length} review${reviews.length === 1 ? '' : 's'}.`;
  const srTags = tags.length ? tags.join(', ') : 'No tags listed';

  const actionBtnBase = `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold ${focusVisible} ${reduceMotion}`;
  const voteBtnBase = `inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold ${focusVisible} ${reduceMotion}`;
  const quietBtnTone = 'theme-btn';
  const primaryBtnTone = 'theme-btn-strong';
  const dangerBtnTone = settings.highContrastMode
    ? 'border border-red-300 bg-red-500 text-slate-900 hover:bg-red-400'
    : settings.theme === 'dark'
      ? 'border border-red-500 bg-red-600 text-white hover:bg-red-500'
      : 'border border-red-500 bg-red-500 text-white hover:bg-red-600';
  const favouriteActiveTone = 'theme-btn-strong';
  const reportBtnStyle = settings.highContrastMode
    ? { backgroundColor: '#ef4444', color: '#0f172a', borderColor: '#fca5a5' }
    : settings.theme === 'dark'
      ? { backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' }
      : { backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' };

  return (
    <div className={`min-h-screen ${pageTone} ${textSizeClass}`}>
      <a
        href="#game-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:text-black focus:shadow-lg"
      >
        Skip to main content
      </a>
      <main id="game-main" className="page-shell max-w-6xl py-8 sm:py-12 space-y-6" tabIndex={-1}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className={`text-xs uppercase tracking-wide ${subTone}`}>Game details</p>
            <h1 className="text-3xl font-bold sm:text-4xl">{gameTitle}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              ref={commandsBtnRef}
              onClick={() => setCommandsOpen(v => !v)}
              className="inline-flex items-center gap-2 rounded-md border theme-border theme-surface px-4 py-2 text-sm font-semibold theme-text shadow-sm transition hover:-translate-y-[1px] hover:shadow focus-visible:translate-y-0"
              aria-expanded={commandsOpen}
              aria-controls="voice-commands-panel"
            >
              {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
            </button>
          </div>
        </div>

        {commandsOpen && (
          <section
            id="voice-commands-panel"
            className={`rounded-2xl border px-4 py-3 ${panelTone}`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${headingTone}`}>Voice commands for this page</p>
              <button
                type="button"
                onClick={() => setCommandsOpen(false)}
                className={`text-xs font-semibold underline ${subTone} ${focusVisible}`}
              >
                Close
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {voiceCommands.map((cmd) => (
                <li key={cmd.phrase} className={subTone}>
                  <span className="font-semibold text-lime-600 dark:text-lime-300">{cmd.phrase}</span>
                  <span className="ml-2 text-xs opacity-80">{cmd.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-12 ${spacingGap}`}>
          <section
            role="region"
            aria-label="Game overview and actions"
            aria-labelledby="game-summary-heading"
            aria-describedby={`${metaId} ${tagsId}`}
            className="order-1 lg:order-2 lg:col-span-5 space-y-4"
            tabIndex={-1}
          >
            <div className={`rounded-2xl border ${panelTone} p-4 space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p id="game-summary-heading" className={`text-sm font-semibold ${headingTone}`}>Game summary</p>
                  <p className={`text-xs ${subTone}`}>
                    {game.developer || 'Unknown developer'} - {game.category || 'Category'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <RatingStars value={avgRating} />
                    <span className={`text-sm font-semibold ${headingTone}`}>{avgRating.toFixed(1)}</span>
                  </div>
                  <p className={`text-xs ${subTone}`}>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                </div>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Accessibility and genre tags">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${settings.highContrastMode ? 'border-lime-400 bg-lime-900 text-lime-100' : settings.theme === 'dark' ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-slate-50 text-slate-700'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="sr-only" id={tagsId}>Tags: {srTags}</p>
              <p className="sr-only" id={metaId}>{srMeta}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Quick actions">
                <button
                  type="button"
                  ref={downloadBtnRef}
                  className={`${actionBtnBase} ${primaryBtnTone}`}
                  onClick={() => pushToast('Download action not implemented yet')}
                >
                  Download
                </button>
                <button
                  type="button"
                  ref={followBtnRef}
                  disabled={followBusy}
                  onClick={async () => {
                    if (!currentUser) { pushToast('Please log in to follow'); return; }
                    setFollowBusy(true);
                    try {
                      if (isFollowed) {
                        await unfollowGame(currentUser.id, game.id);
                        setIsFollowed(false);
                        pushToast('Game unfollowed');
                        setAnnounce('Game unfollowed');
                      } else {
                        await followGame(currentUser.id, game.id);
                        setIsFollowed(true);
                        pushToast('Game followed');
                        setAnnounce('Game followed');
                      }
                    } catch (e) {
                      pushToast(e.message || 'Follow action failed');
                    } finally {
                      setFollowBusy(false);
                    }
                  }}
                  aria-pressed={isFollowed}
                  className={`${actionBtnBase} ${quietBtnTone} disabled:opacity-50`}
                >
                  {followBusy ? (isFollowed ? 'Unfollowing...' : 'Following...') : (isFollowed ? 'Unfollow game' : 'Follow game')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Save game actions">
                <button
                  type="button"
                  ref={wishlistBtnRef}
                  onClick={handleWishlist}
                  aria-pressed={isWishlisted}
                  className={`${actionBtnBase} ${quietBtnTone} ${isWishlisted ? 'ring-2 ring-lime-400' : ''}`}
                >
                  {isWishlisted ? 'In wishlist' : 'Add to wishlist'}
                </button>
                <button
                  type="button"
                  ref={favouriteBtnRef}
                  onClick={handleFavourite}
                  aria-pressed={isFavourite}
                  className={`${actionBtnBase} ${isFavourite ? favouriteActiveTone : quietBtnTone}`}
                >
                  {isFavourite ? 'Added to favourites' : 'Add to favourites'}
                </button>
                <button
                  type="button"
                  onClick={openReportModal}
                  className={`${actionBtnBase} ${dangerBtnTone}`}
                  style={reportBtnStyle}
                >
                  Report game
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={subTone}>Release date</span>
                <span className={`font-semibold ${headingTone}`}>{date}</span>
              </div>
            </div>
          </section>
          <section
            ref={heroRef}
            className={`order-2 lg:order-1 lg:col-span-7 rounded-2xl border ${panelTone} overflow-hidden`}
            aria-roledescription="carousel"
            aria-label="Game media gallery"
          >
            <div className="relative w-full h-56 sm:h-64 overflow-hidden rounded-2xl">
              {String(currentHero).toLowerCase().endsWith('.mp4') ? (
                <video
                  key={currentHero}
                  ref={heroVideoRef}
                  src={currentHero}
                  controls
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover bg-black"
                >
                  {currentHero === '/AuroraQuestTrailer.mp4' ? (
                    <track
                      key={`captions-${captionsEnabled}`}
                      ref={heroTrackRef}
                      kind="subtitles"
                      src="/AuroraQuestTrailer.vtt"
                      srclang="en"
                      label="English"
                      default={captionsEnabled}
                    />
                  ) : null}
                </video>
              ) : (
                <img
                  src={currentHero}
                  alt={`${gameTitle} media`}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <button
                  type="button"
                  onClick={prevHero}
                  className={`${actionBtnBase} ${quietBtnTone} bg-opacity-80`}
                  aria-label="Previous media item"
                >
                  {'<'}
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="button"
                  onClick={nextHero}
                  className={`${actionBtnBase} ${quietBtnTone} bg-opacity-80`}
                  aria-label="Next media item"
                >
                  {'>'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-3">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Show media item ${i + 1}`}
                  aria-pressed={i === heroIndex}
                  className={`h-2.5 w-2.5 rounded-full ${i === heroIndex ? 'bg-lime-500' : 'bg-slate-400/70'} ${focusVisible}`}
                />
              ))}
            </div>
          </section>
        </div>

        <section className={`rounded-2xl border ${panelTone} p-4 space-y-3`} aria-label="About this game">
          <h2 className={`text-lg font-semibold ${headingTone}`}>About this game</h2>
          <p className={`leading-relaxed ${subTone}`}>
            {game.description || 'No description available.'}
          </p>
        </section>

        <section className={`rounded-2xl border ${panelTone} p-4 space-y-4`} aria-label="Additional media">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${headingTone}`}>More media</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevAdditional}
                className={`${actionBtnBase} ${quietBtnTone}`}
                aria-label="Previous media items"
              >
                {'<'}
              </button>
              <button
                type="button"
                onClick={nextAdditional}
                className={`${actionBtnBase} ${quietBtnTone}`}
                aria-label="Next media items"
              >
                {'>'}
              </button>
            </div>
          </div>
          <div ref={addCarouselRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="list">
            {addWindow.map((url, i) => {
              const isVideo = String(url).toLowerCase().endsWith('.mp4');
              return (
                <div key={`${url}-${i}`} role="listitem" className="overflow-hidden rounded-xl border border-slate-200 bg-black/70">
                  {isVideo ? (
                    <video
                      key={url}
                      src={url}
                      muted
                      loop
                      playsInline
                      className="h-32 w-full object-cover"
                    >
                      {url === '/AuroraQuestTrailer.mp4' ? (
                        <track kind="subtitles" src="/AuroraQuestTrailer.vtt" srclang="en" label="English" default={captionsEnabled} />
                      ) : null}
                    </video>
                  ) : (
                    <img src={url} alt={`Additional media ${i + 1}`} className="h-32 w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={`rounded-2xl border ${panelTone} p-4 space-y-4`} aria-label="User reviews">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={`text-lg font-semibold ${headingTone}`}>User reviews</h2>
              <p className={`text-xs ${subTone}`}>Share your experience to help other players.</p>
            </div>
              <button
                type="button"
                ref={reviewBtnRef}
                onClick={openReviewModal}
                className={`${actionBtnBase} ${primaryBtnTone}`}
              >
                Write a review
              </button>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              {ratingDist.map((count, idx) => {
                const star = 5 - idx;
                const width = `${Math.min(100, (count / maxRatingCount) * 100)}%`;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-right font-semibold">{star}★</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-lime-500" style={{ width }} />
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="md:col-span-2 space-y-3">
              {reviews.length === 0 && (
                <p className={`text-sm ${subTone}`}>No reviews yet. Be the first to share feedback.</p>
              )}
              {reviews.map((r) => (
                <article key={r.id} className={`rounded-xl border ${sectionTone} p-3`}>
                  <header className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{r.user?.username || 'Anonymous'}</p>
                      <p className={`text-xs ${subTone}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <RatingStars value={r.rating} tone="text-lime-400" />
                  </header>
                  <p className="mt-2 text-sm">{r.comment || 'No comment provided.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewVote(r.id, Number(r.myVote) === 1 ? 0 : 1)}
                      aria-pressed={Number(r.myVote) === 1}
                      className={`${voteBtnBase} ${Number(r.myVote) === 1 ? primaryBtnTone : quietBtnTone}`}
                    >
                      <span aria-hidden>👍</span>
                      <span className="text-xs">{r.likes ?? 0}</span>
                      <span className="sr-only">Mark review helpful</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewVote(r.id, Number(r.myVote) === -1 ? 0 : -1)}
                      aria-pressed={Number(r.myVote) === -1}
                      className={`${voteBtnBase} ${Number(r.myVote) === -1 ? primaryBtnTone : quietBtnTone}`}
                    >
                      <span aria-hidden>👎</span>
                      <span className="text-xs">{r.dislikes ?? 0}</span>
                      <span className="sr-only">Mark review not helpful</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="sr-only" role="status" aria-live="polite">{announce}</div>
      </main>

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className={`w-full max-w-lg rounded-2xl border ${panelTone}`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 id="review-modal-title" className="text-lg font-semibold">Write a review</h3>
              <button
                onClick={closeReviewModal}
                className={`${focusVisible} ${subTone}`}
                disabled={submittingReview}
                aria-label="Close review form"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="space-y-4 px-4 py-4">
              {submitError && <p className="text-sm text-red-600" role="alert" id="review-submit-error">{submitError}</p>}
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="review-rating">Rating (1-5)</label>
                <select
                  id="review-rating"
                  value={reviewRating}
                  ref={reviewRatingRef}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${focusVisible} ${inputTone}`}
                  required
                  aria-describedby={submitError ? 'review-submit-error' : undefined}
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="review-comment">Comment</label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  ref={reviewCommentRef}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${focusVisible} ${inputTone}`}
                  required
                  rows={4}
                  aria-describedby={submitError ? 'review-submit-error' : undefined}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className={`${actionBtnBase} ${quietBtnTone}`}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  ref={reviewSubmitRef}
                  data-voice-review-submit
                  className={`${actionBtnBase} ${primaryBtnTone} disabled:opacity-50`}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
          <div className={`w-full max-w-lg rounded-2xl border ${panelTone}`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 id="report-modal-title" className="text-lg font-semibold">Report this game</h3>
              <button
                onClick={closeReportModal}
                className={`${focusVisible} ${subTone}`}
                disabled={submittingReport}
                aria-label="Close report form"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-4 px-4 py-4">
              {reportSubmitError && <p className="text-sm text-red-600" role="alert" id="report-submit-error">{reportSubmitError}</p>}
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="report-message">
                  Why are you reporting this game?
                </label>
                <textarea
                  id="report-message"
                  ref={reportTextareaRef}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${focusVisible} ${inputTone}`}
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  aria-invalid={!!reportError}
                  aria-describedby={`${reportSubmitError ? 'report-submit-error ' : ''}${reportError ? 'report-error' : ''}`.trim() || undefined}
                  data-voice-report-textarea
                  rows={4}
                />
                {reportError && <p className="text-xs text-red-600 mt-1" id="report-error" role="alert">{reportError}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeReportModal}
                  className={`${actionBtnBase} ${quietBtnTone}`}
                  disabled={submittingReport}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  ref={reportSubmitRef}
                  data-voice-report-submit
                  className={`${actionBtnBase} ${dangerBtnTone} disabled:opacity-50`}
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Submitting...' : 'Submit report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
