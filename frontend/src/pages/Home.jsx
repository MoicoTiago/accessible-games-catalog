import React, { useState, useEffect, useRef } from "react";
import { fetchGames, fetchCurrentUser, followGame } from "../api";
import { Link, useNavigate } from "react-router-dom";
import { pushToast } from "../components/ToastHost.jsx";

export default function Home() {
  const [games, setGames] = useState([]);
  const [advIndex, setAdvIndex] = useState(0);
  const [blindIndex, setBlindIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [hoveredAdv, setHoveredAdv] = useState(null);
  const [hoveredBlind, setHoveredBlind] = useState(null);
  const [hoveredVision, setHoveredVision] = useState(null);
  const [hoveredHearing, setHoveredHearing] = useState(null);
  const [hoveredMotor, setHoveredMotor] = useState(null);
  const [hoveredCognitive, setHoveredCognitive] = useState(null);

  const [accessibilityGames, setAccessibilityGames] = useState([]);
  const [visionIndex, setVisionIndex] = useState(0);
  const [hearingIndex, setHearingIndex] = useState(0);
  const [motorIndex, setMotorIndex] = useState(0);
  const [cognitiveIndex, setCognitiveIndex] = useState(0);
  const [commandsOpen, setCommandsOpen] = useState(false);

  const autoplayRef = useRef(null);
  const autoplayPausedRef = useRef(false);
  const featuredSectionRef = useRef(null);
  const homePageRef = useRef(null);
  const AUTOPLAY_MS = 5000;
  const navigate = useNavigate();

  const startAutoplay = (len) => {
    if (!len || autoplayPausedRef.current) return;
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % len);
    }, AUTOPLAY_MS);
  };

  const pauseAutoplay = () => {
    autoplayPausedRef.current = true;
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };

  const resumeAutoplay = (len) => {
    autoplayPausedRef.current = false;
    startAutoplay(len);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchGames();
        if (!alive) return;
        setGames(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        console.error("Failed to load games", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        const meRes = await fetch(
          `${import.meta.env.VITE_API_BASE || "http://localhost:5000/api"}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!meRes.ok) return;
        const me = await meRes.json();
        if (!me?.id) return;

        const recRes = await fetch(
          `${import.meta.env.VITE_API_BASE || "http://localhost:5000/api"}/users/${me.id}/recommended-games`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!recRes.ok) return;
        const data = await recRes.json();
        if (Array.isArray(data)) setAccessibilityGames(data);
      } catch (err) {
        console.error("Failed to fetch accessibility games", err);
      }
    })();
  }, []);

  const highlightedGame = games.find((g) => g.title && g.title.toLowerCase() === "blockfall classic");
  const rest = games.filter((g) => g !== highlightedGame);

  const featuredGames = [...(highlightedGame ? [highlightedGame] : []), ...rest]
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);
  const fg = featuredGames.length > 0 ? featuredGames[featuredIndex % featuredGames.length] : null;
  const featuredAnnouncement = fg
    ? `Featured game ${featuredIndex + 1} of ${featuredGames.length}: ${fg.title}. Platform ${fg.platform || "unknown"}. Rating ${(fg.rating || 0).toFixed(1)}. Tags ${(fg.tags || []).join(", ")}.`
    : "";

  const adventureGames = games.filter(
    (g) =>
      (g.category || "").toLowerCase().includes("adventure") ||
      (g.tags || []).some((t) => typeof t === "string" && t.toLowerCase() === "adventure")
  );

  const blindTagCandidates = new Set([
    "Vision",
    "Screen Reader Friendly",
    "High Contrast",
    "Large Text",
    "Colourblind Mode",
    "No Audio Needed",
    "Captions",
    "Visual Alerts",
  ]);

  const blindGames = games.filter((g) =>
    (g.tags || []).some((t) => typeof t === "string" && blindTagCandidates.has(t))
  );

  useEffect(() => {
    if (!featuredGames.length) return;
    startAutoplay(featuredGames.length);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [featuredGames.length]);

  useEffect(() => {
    const node = homePageRef.current;
    if (!node) return;
    const onFocusIn = () => pauseAutoplay();
    const onFocusOut = (e) => {
      if (!e.relatedTarget || node.contains(e.relatedTarget)) return;
      resumeAutoplay(featuredGames.length);
    };
    const onKeyDown = (e) => {
      if (e.key === "Tab") pauseAutoplay();
    };
    node.addEventListener("focusin", onFocusIn);
    node.addEventListener("focusout", onFocusOut);
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("focusin", onFocusIn);
      node.removeEventListener("focusout", onFocusOut);
      node.removeEventListener("keydown", onKeyDown);
    };
  }, [featuredGames.length]);

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e.detail || {};
      const { type, action, title } = detail;
      if (type === "commands") {
        e.preventDefault();
        if (action === "open") setCommandsOpen(true);
        if (action === "close") setCommandsOpen(false);
        return;
      }
      if (type === "home" && action === "open-featured" && fg?.id) {
        e.preventDefault?.();
        navigate(`/games/${fg.id}`);
        return;
      }
      if (type === "game-card" && action === "open" && title) {
        const match = findGameByTitle(title);
        if (match?.id) {
          e.preventDefault?.();
          navigate(`/games/${match.id}`);
        }
      }
    };
    window.addEventListener("voiceCommand", onVoice);
    return () => window.removeEventListener("voiceCommand", onVoice);
  }, [fg, navigate, games]);

  const prevAdv = () =>
    setAdvIndex((i) => (adventureGames.length ? (i - 1 + adventureGames.length) % adventureGames.length : 0));
  const nextAdv = () =>
    setAdvIndex((i) => (adventureGames.length ? (i + 1) % adventureGames.length : 0));

  const prevBlind = () =>
    setBlindIndex((i) => (blindGames.length ? (i - 1 + blindGames.length) % blindGames.length : 0));
  const nextBlind = () =>
    setBlindIndex((i) => (blindGames.length ? (i + 1) % blindGames.length : 0));

  const prevFeatured = () => {
    if (!featuredGames.length) return;
    setFeaturedIndex((i) => (i - 1 + featuredGames.length) % featuredGames.length);
    startAutoplay(featuredGames.length);
  };
  const nextFeatured = () => {
    if (!featuredGames.length) return;
    setFeaturedIndex((i) => (i + 1) % featuredGames.length);
    startAutoplay(featuredGames.length);
  };
  const goToFeatured = (i) => {
    if (!featuredGames.length) return;
    setFeaturedIndex(i);
    startAutoplay(featuredGames.length);
  };

  const featuredWindow = () => {
    if (!featuredGames.length) return [];
    const len = featuredGames.length;
    const prev = featuredGames[(featuredIndex - 1 + len) % len];
    const current = featuredGames[featuredIndex % len];
    const next = featuredGames[(featuredIndex + 1) % len];
    return [prev, current, next].filter(Boolean);
  };

  const VISIBLE = 5;
  const getWindow = (arr, start, size) =>
    Array.from({ length: Math.min(size, arr.length) }, (_, k) => arr[(start + k) % arr.length]);

  const normalize = (text) => (text || "").toString().toLowerCase().trim();
  const findGameByTitle = (title) => {
    const needle = normalize(title);
    return games.find((g) => {
      const hay = normalize(g.title);
      return hay === needle || hay.includes(needle) || needle.includes(hay);
    });
  };

  const renderStars = (rating) => {
    const active = "var(--accent)";
    const muted = "var(--text-muted)";
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={`star-${i}`}
        aria-hidden
        className="text-lg"
        style={{ color: i < Math.round(rating || 0) ? active : muted }}
      >
        ★
      </span>
    ));
  };

  const getImageUrl = (game) => {
    if (!game) return '/placeholder1.png';
    if (game.imageUrl) return game.imageUrl;
    if (Array.isArray(game.images) && game.images.length > 0) return game.images[0];
    if (Array.isArray(game.thumbImages) && game.thumbImages.length > 0) return game.thumbImages[0];
    return '/placeholder1.png';
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const hasTag = (game, tagName) => (game.tags || []).some((t) => (typeof t === "string" ? t : t.name) === tagName);

  const visionRecs = accessibilityGames.filter((g) => hasTag(g, "Vision"));
  const hearingRecs = accessibilityGames.filter((g) => hasTag(g, "Hearing"));
  const motorRecs = accessibilityGames.filter((g) => hasTag(g, "Motor"));
  const cognitiveRecs = accessibilityGames.filter((g) => hasTag(g, "Cognitive"));

  const prevVision = () => setVisionIndex((i) => (i > 0 ? i - 1 : Math.max(0, visionRecs.length - VISIBLE)));
  const nextVision = () => setVisionIndex((i) => (i < Math.max(0, visionRecs.length - VISIBLE) ? i + 1 : 0));
  const prevHearing = () => setHearingIndex((i) => (i > 0 ? i - 1 : Math.max(0, hearingRecs.length - VISIBLE)));
  const nextHearing = () => setHearingIndex((i) => (i < Math.max(0, hearingRecs.length - VISIBLE) ? i + 1 : 0));
  const prevMotor = () => setMotorIndex((i) => (i > 0 ? i - 1 : Math.max(0, motorRecs.length - VISIBLE)));
  const nextMotor = () => setMotorIndex((i) => (i < Math.max(0, motorRecs.length - VISIBLE) ? i + 1 : 0));
  const prevCognitive = () => setCognitiveIndex((i) => (i > 0 ? i - 1 : Math.max(0, cognitiveRecs.length - VISIBLE)));
  const nextCognitive = () => setCognitiveIndex((i) => (i < Math.max(0, cognitiveRecs.length - VISIBLE) ? i + 1 : 0));

  const hasAccessibilityRecs =
    visionRecs.length > 0 || hearingRecs.length > 0 || motorRecs.length > 0 || cognitiveRecs.length > 0;

  const shellTone = "theme-page";
  const cardTone = "theme-surface border theme-border rounded-2xl shadow-lg";
  const subtleCard = "theme-subtle border theme-border rounded-xl";
  const controlTone = "theme-surface border theme-border shadow hover:opacity-80";
  const smallMeta = "text-sm theme-muted";
  const voiceCommands = [
    { phrase: "Open commands", description: "Show this command list." },
    { phrase: "Close commands", description: "Hide this command list." },
    { phrase: "Open featured game", description: "Open the current featured card." },
    { phrase: "Open <game name>", description: "Open a specific game card by title." },
    { phrase: "Scroll down/up", description: "Scroll the page." },
  ];

  const renderTag = (text, idxKey) => (
    <span key={idxKey} className="theme-subtle border theme-border rounded-full px-3 py-1 text-xs font-semibold theme-text">
      {text}
    </span>
  );

  const CarouselButton = ({ onClick, label, children }) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-slate-900 shadow-lg border theme-border hover:opacity-90 leading-none text-lg font-semibold"
      style={{ zIndex: 20 }}
    >
      <span className="flex items-center justify-center leading-none">{children}</span>
    </button>
  );

  const CardHoverDetails = ({ game, tagsKey, tagsSlice }) => (
    <div className={`absolute left-0 top-full mt-1 w-full ${cardTone} p-3 space-y-1 text-xs z-20 pointer-events-none`}>
      <p className="text-sm font-semibold theme-text truncate" title={game.title}>
        {game.title}
      </p>
      <p className={smallMeta} title={`${game.developer || "N/A"} • ${game.category || "N/A"}`}>
        {game.developer || "N/A"} • {game.category || "N/A"}
      </p>
      <div className="flex items-center flex-wrap gap-tight text-[11px]">
        {renderStars(game.rating)}
        <span className="theme-text">{game.rating?.toFixed(1) || "0.0"}</span>
        <span className="theme-muted">({game.reviews?.length || 0})</span>
      </div>
      <div className="flex flex-wrap gap-1 pt-1">
        {(game.tags || []).slice(0, tagsSlice).map((t, idx) => renderTag(typeof t === "string" ? t : t.name || "", `${game.id}-${tagsKey}-${idx}`))}
      </div>
      <div className="sr-only" aria-live="polite">
        {`Rating ${(game.rating || 0).toFixed(1)}. Tags ${(game.tags || []).slice(0, tagsSlice).join(", ") || "none"}.`}
      </div>
    </div>
  );

  const HorizontalCarousel = ({
    title,
    gamesList,
    index,
    onPrev,
    onNext,
    hoveredId,
    setHovered,
    tagsKey,
    slice = 3,
    ariaLabel,
  }) => (
    <section className="space-y-6 mt-10" aria-label={ariaLabel || title}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold theme-text">{title}</h2>
      </div>
      <div className="flex items-center justify-center gap-4">
        <CarouselButton onClick={onPrev} label={`Previous ${title.toLowerCase()}`}>
          {"<"}
        </CarouselButton>
        <ul className="flex gap-4" role="list">
          {getWindow(gamesList, index, VISIBLE).map((g) => (
            <li key={g.id} className="list-none">
              <Link
                to={`/games/${g.id}`}
                aria-label={`${g.title}. Platform ${g.platform || "unknown"}. Rating ${(g.rating || 0).toFixed(1)}. Tags ${(g.tags || []).join(", ") || "none"}.`}
                title={`${g.title} • ${g.platform || "Unknown platform"} • Rating ${(g.rating || 0).toFixed(1)} • Tags: ${(g.tags || []).join(", ") || "none"}`}
                className={`relative block flex-none w-48 overflow-visible ${cardTone} hover:shadow-xl transition`}
                onMouseEnter={() => setHovered(g.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="overflow-hidden rounded-t-xl h-32">
                  {getImageUrl(g) ? (
                    <img
                      src={getImageUrl(g)}
                      alt={g.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                    />
                  ) : (
                    <div className="theme-subtle w-full h-full flex items-center justify-center theme-muted" aria-hidden>
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-semibold theme-text truncate">{g.title}</p>
                  <p className={smallMeta}>{g.platform || "Unknown platform"}</p>
                  <div className="flex items-center flex-wrap gap-tight text-[11px] max-w-full">
                    {renderStars(g.rating)}
                    <span className="theme-text">{g.rating?.toFixed(1) || "0.0"}</span>
                  </div>
                </div>
                {hoveredId === g.id && <CardHoverDetails game={g} tagsKey={tagsKey} tagsSlice={slice} />}
              </Link>
            </li>
          ))}
        </ul>
        <CarouselButton onClick={onNext} label={`Next ${title.toLowerCase()}`}>
          {">"}
        </CarouselButton>
      </div>
    </section>
  );

  const addToWishlist = async (game) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { pushToast('Please log in to use wishlist'); return; }
      const me = await fetchCurrentUser();
      const key = `wishlist:${me.id}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const item = { id: game.id, title: game.title || game.name, imageUrl: getImageUrl(game), rating: game.rating, tags: game.tags };
      if (list.find((g) => g.id === item.id)) {
        pushToast('Already in wishlist');
        return;
      }
      const next = [...list, item];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'wishlist', gameId: game.id } }));
      pushToast('Added to wishlist');
    } catch (e) {
      pushToast('Wishlist error');
      console.error(e);
    }
  };

  const addToFavourites = async (game) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { pushToast('Please log in to use favourites'); return; }
      const me = await fetchCurrentUser();
      const key = `favourites:${me.id}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const item = { id: game.id, title: game.title || game.name, imageUrl: getImageUrl(game), rating: game.rating, tags: game.tags };
      if (list.find((g) => g.id === item.id)) { pushToast('Already a favourite'); return; }
      const next = [...list, item];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('library:updated', { detail: { type: 'favourites', gameId: game.id } }));
      pushToast('Added to favourites');
    } catch (e) {
      pushToast('Favourites error');
      console.error(e);
    }
  };

  return (
    <div className={`home-page ${shellTone} min-h-screen`} ref={homePageRef}>
      <main className="page-shell max-w-6xl space-y-12 pb-16" id="page-content" role="main">
        <header className="space-y-3 pb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide theme-accent">Welcome</p>
              <h1 className="text-3xl font-bold sm:text-4xl theme-text">Discover accessible games</h1>
            </div>
            <div className="flex items-start gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCommandsOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border theme-border theme-surface px-4 py-2 text-sm font-semibold theme-text shadow-sm transition hover:-translate-y-[1px] hover:shadow focus-visible:translate-y-0"
                aria-expanded={commandsOpen}
                aria-controls="home-voice-commands"
              >
                {commandsOpen ? "Hide voice commands" : "Show voice commands"}
              </button>
            </div>
          </div>
          {commandsOpen && (
            <section
              id="home-voice-commands"
              className="rounded-xl border theme-border theme-surface px-4 py-3 text-sm theme-text"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold theme-text">Voice commands for Home</p>
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
        </header>

        {fg && (
          <section ref={featuredSectionRef} className={`${cardTone} p-4 sm:p-5 mt-4`} aria-label="Featured and newest games">
            <div className="sr-only" aria-live="polite">
              {featuredAnnouncement}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-col items-center justify-center lg:w-1/2 gap-3 max-w-3xl mx-auto">
                <div className="relative w-full flex items-center justify-center pb-8">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2 z-20 pointer-events-none">
                    <div className="pointer-events-auto">
                      <CarouselButton onClick={prevFeatured} label="Previous featured game">
                        {"<"}
                      </CarouselButton>
                    </div>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-20 pointer-events-none">
                    <div className="pointer-events-auto">
                      <CarouselButton onClick={nextFeatured} label="Next featured game">
                        {">"}
                      </CarouselButton>
                    </div>
                  </div>
                  <div className="overflow-hidden w-full flex items-center justify-center">
                    <div className="flex items-center justify-center">
                      {featuredWindow().map((g, idx, arr) => {
                        const isCenter = idx === 1 || arr.length === 1;
                        const maxWidth = isCenter ? "max-w-sm md:max-w-md" : "max-w-[6rem]";
                        const offset = !isCenter ? (idx === 0 ? -18 : 18) : 0;
                        const overlap = isCenter ? "mx-3 z-10" : "mx-[-18px] z-0";
                        const scale = isCenter ? 0.95 : 0.85;
                        return (
                          <div
                            key={g.id}
                            className={`transition duration-300 relative ${maxWidth} aspect-video rounded-xl overflow-hidden shadow-md border theme-border theme-subtle ${overlap}`}
                            style={{
                              opacity: isCenter ? 1 : 0.35,
                              transform: `translateX(${offset}px) scale(${scale})`,
                            }}
                            role="group"
                            aria-label={`Slide ${featuredIndex + 1} of ${featuredGames.length}: ${g.title}. Platform ${g.platform || "unknown"}. Rating ${(g.rating || 0).toFixed(1)}. Tags ${(g.tags || []).join(", ")}`}
                            tabIndex={isCenter ? 0 : -1}
                            aria-hidden={!isCenter}
                          >
                            {getImageUrl(g) ? (
                              <>
                                <img
                                  src={getImageUrl(g)}
                                  alt={isCenter ? g.title : ""}
                                  className="h-full w-full object-cover scale-110"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
                              </>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center theme-muted" aria-hidden>
                                No Image
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-2" aria-hidden="true">
                    {featuredGames.map((g, i) => (
                      <button
                        key={g.id}
                        tabIndex={-1}
                        aria-label={`Go to ${g.title}`}
                        onClick={() => goToFeatured(i)}
                        className={`h-3 w-8 rounded-full transition-colors ${i === featuredIndex ? "theme-btn" : "theme-subtle"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 flex flex-col justify-between space-y-3 min-h-[16rem]">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <h2 className="text-2xl font-semibold theme-text">{fg.title}</h2>
                    <p className={smallMeta}>
                      Release Date: <span className="theme-text font-semibold">{formatDate(fg.releaseDate)}</span>
                    </p>
                  </div>
                  <p className="theme-text">
                    <span className="font-semibold">Developer:</span> {fg.developer || "N/A"} • {fg.category || "N/A"}
                  </p>
                  <div className="flex items-center gap-2" aria-label={`Rating ${Math.round(fg.rating || 0)} of 5`}>
                    {renderStars(fg.rating)}
                    <span className="theme-text text-sm">
                      {fg.rating?.toFixed(1) || "0.0"} ({fg.reviews?.length || 0})
                    </span>
                  </div>
                  <div className="min-h-[9rem] flex gap-2 flex-wrap mt-2 items-start content-start">
                    {(fg.tags || []).map((tag, idx) => renderTag(tag, `${fg.id}-tag-${idx}`))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Link
                    to={`/games/${fg.id}`}
                    className="theme-btn-strong rounded-lg px-5 py-2 text-sm sm:text-base font-semibold inline-flex items-center justify-center text-center hover:opacity-90"
                  >
                    View details
                  </Link>
                  <button
                    className="theme-btn rounded-lg px-5 py-2 text-sm sm:text-base font-semibold inline-flex items-center justify-center hover:opacity-90"
                    type="button"
                    onClick={() => addToWishlist(fg)}
                  >
                    Add to wishlist
                  </button>
                  <button
                    className="theme-subtle border theme-border rounded-lg px-5 py-2 text-sm sm:text-base font-semibold inline-flex items-center justify-center hover:opacity-90"
                    type="button"
                    onClick={() => addToFavourites(fg)}
                  >
                    Add to favourites
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {hasAccessibilityRecs && (
          <div className={`space-y-10 ${subtleCard} p-4`}>
            <p className="text-sm font-semibold theme-muted">Recommended for your accessibility profile</p>
            {visionRecs.length > 0 && (
              <HorizontalCarousel
                title="Vision support"
                ariaLabel="Recommended games for vision accessibility"
                gamesList={visionRecs}
                index={visionIndex}
                onPrev={prevVision}
                onNext={nextVision}
                hoveredId={hoveredVision}
                setHovered={setHoveredVision}
                tagsKey="vision"
              />
            )}
            {hearingRecs.length > 0 && (
              <HorizontalCarousel
                title="Hearing support"
                ariaLabel="Recommended games for hearing accessibility"
                gamesList={hearingRecs}
                index={hearingIndex}
                onPrev={prevHearing}
                onNext={nextHearing}
                hoveredId={hoveredHearing}
                setHovered={setHoveredHearing}
                tagsKey="hearing"
              />
            )}
            {motorRecs.length > 0 && (
              <HorizontalCarousel
                title="Motor support"
                ariaLabel="Recommended games for motor accessibility"
                gamesList={motorRecs}
                index={motorIndex}
                onPrev={prevMotor}
                onNext={nextMotor}
                hoveredId={hoveredMotor}
                setHovered={setHoveredMotor}
                tagsKey="motor"
              />
            )}
            {cognitiveRecs.length > 0 && (
              <HorizontalCarousel
                title="Cognitive support"
                ariaLabel="Recommended games for cognitive accessibility"
                gamesList={cognitiveRecs}
                index={cognitiveIndex}
                onPrev={prevCognitive}
                onNext={nextCognitive}
                hoveredId={hoveredCognitive}
                setHovered={setHoveredCognitive}
                tagsKey="cognitive"
              />
            )}
          </div>
        )}

        {!hasAccessibilityRecs && adventureGames.length > 0 && (
          <HorizontalCarousel
            title="Adventure games"
            ariaLabel="Adventure games carousel"
            gamesList={adventureGames}
            index={advIndex}
            onPrev={prevAdv}
            onNext={nextAdv}
            hoveredId={hoveredAdv}
            setHovered={setHoveredAdv}
            tagsKey="adv"
          />
        )}

        {!hasAccessibilityRecs && blindGames.length > 0 && (
          <HorizontalCarousel
            title="Blind-friendly games"
            ariaLabel="Blind-friendly games carousel"
            gamesList={blindGames}
            index={blindIndex}
            onPrev={prevBlind}
            onNext={nextBlind}
            hoveredId={hoveredBlind}
            setHovered={setHoveredBlind}
            tagsKey="blind"
          />
        )}
      </main>
    </div>
  );
}
