import profile from '../assets/profile.jpg';
import { useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, fetchUserReviews, getAccessibilityPreferences, updateAccessibilityPreferences, getFollowedGames, updateUserProfile, changeUserPassword, getHelpfulVotes } from '../api.js';
import { pushToast } from '../components/ToastHost.jsx';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [revError, setRevError] = useState('');
  const [revLoading, setRevLoading] = useState(false);
  const [prefs, setPrefs] = useState({ visual: false, motor: false, cognitive: false, hearing: false });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [followedGames, setFollowedGames] = useState([]);
  const [fgIndex, setFgIndex] = useState(0); // carousel index
  const [helpfulVotes, setHelpfulVotes] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [wlCount, setWlCount] = useState(0);
  const [commandsOpen, setCommandsOpen] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', email: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // for carousel display
  const VISIBLE = 5;
  const getWindow = (arr, start, size) => Array.from({ length: Math.min(size, arr.length) }, (_, k) => arr[(start + k) % arr.length]);

  // voice feedback style and helper
  const flashClass = 'voice-flash';
  useEffect(() => {
    const styleId = 'voice-flash-style-profile';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `.${flashClass}{outline:3px solid #a5f3fc;outline-offset:3px;transition: outline-color .4s ease}`;
    document.head.appendChild(style);
  }, []);
  const focusAndFlash = (el) => { if (!el) return; try { el.focus?.({ preventScroll: true }); } catch {} el.classList.add(flashClass); setTimeout(()=>el.classList.remove(flashClass), 1000); };
  const norm = (s='') => String(s).toLowerCase().replace(/[.,!?]/g,'').trim();
  const voiceCommands = useMemo(() => [
    { phrase: 'Show commands', description: 'Open this voice help panel' },
    { phrase: 'Edit profile', description: 'Open the edit profile form' },
    { phrase: 'Change password', description: 'Open the change password form' },
    { phrase: 'Save preferences', description: 'Save accessibility preferences' },
    { phrase: 'Set password field to ...', description: 'Dictate current or new password' },
    { phrase: 'Set username/email to ...', description: 'Fill profile fields before saving' },
    { phrase: 'Focus reviews / Focus stats', description: 'Scroll to a section' },
    { phrase: 'Scroll up / Scroll down', description: 'Move the page' }
  ], []);

  // Voice commands for the Profile page
  useEffect(() => {
    const onVoice = (e) => {
      const d = e.detail || {};
      const type = d.type;
      if (!type) return;

      // Open edit profile modal
      if (type === 'profile' && d.action === 'edit-profile') {
        e.preventDefault?.();
        setShowEdit(true);
        setTimeout(() => focusAndFlash(document.querySelector('input[type="text"]')), 50);
        return;
      }
      // Open change password modal
      if (type === 'profile' && d.action === 'change-password') {
        e.preventDefault?.();
        setShowPwd(true);
        setTimeout(() => focusAndFlash(document.querySelector('input[type="password"]')), 50);
        return;
      }
      // Set password fields via voice
      if (type === 'profile' && d.action === 'set-password-field' && d.field && typeof d.value === 'string') {
        e.preventDefault?.();
        if (!showPwd) setShowPwd(true);
        const field = d.field;
        if (field === 'currentPassword' || field === 'newPassword') {
          setPwdForm(p => ({ ...p, [field]: d.value }));
          setTimeout(() => {
            const selector = field === 'currentPassword' ? 'input[type="password"]' : 'input[type="password"]:nth-of-type(2)';
            const el = document.querySelector(selector);
            if (el) { try { el.value = d.value; } catch {} focusAndFlash(el); }
          }, 60);
        }
        return;
      }
      // Submit change password
      if (type === 'profile' && d.action === 'submit-password') {
        e.preventDefault?.();
        if (!showPwd) setShowPwd(true);
        setTimeout(() => {
          // Prefer submitting the form element
          const modal = document.querySelector('.fixed.inset-0');
          const form = modal ? modal.querySelector('form') : document.querySelector('form');
          if (form && typeof form.requestSubmit === 'function') {
            focusAndFlash(form.querySelector('button[type="submit"]'));
            form.requestSubmit();
            return;
          }
          // Fallback: click the submit button
          const btn = Array.from(document.querySelectorAll('button')).find(b => /change password|update|submit/i.test(b.textContent || ''))
            || document.querySelector('button[type="submit"]');
          if (btn) { focusAndFlash(btn); btn.click(); }
        }, 80);
        return;
      }
      // Cancel change password
      if (type === 'profile' && d.action === 'cancel-password') {
        e.preventDefault?.();
        setShowPwd(false);
        return;
      }
      // Save accessibility preferences
      if (type === 'profile' && d.action === 'save-preferences') {
        e.preventDefault?.();
        const btn = document.querySelector('button[type="submit"]');
        focusAndFlash(btn);
        btn?.click();
        return;
      }
      // Toggle a specific accessibility pref: { area: 'visual'|'motor'|'cognitive'|'hearing', value?: boolean }
      if (type === 'profile' && d.action === 'set-pref' && d.area) {
        const area = norm(d.area);
        const val = d.value;
        if (['visual','motor','cognitive','hearing'].includes(area)) {
          e.preventDefault?.();
          if (typeof val === 'boolean') {
            setPrefs(p => ({ ...p, [area]: val }));
          } else {
            // toggle if value not provided
            setPrefs(p => ({ ...p, [area]: !p[area] }));
          }
          const chk = document.getElementById(`pref-${area}`);
          focusAndFlash(chk);
        }
        return;
      }
      // Set profile fields (username/email) and open edit modal if needed
      if (type === 'profile' && d.action === 'set-field' && d.field && typeof d.value === 'string') {
        e.preventDefault?.();
        const field = d.field === 'user name' ? 'username' : d.field;
        if (field === 'username' || field === 'email') {
          if (!showEdit) setShowEdit(true);
          setEditForm(f => ({ ...f, [field]: d.value }));
          setTimeout(() => {
            const selector = field === 'username' ? 'input[type="text"]' : 'input[type="email"]';
            const el = document.querySelector(selector);
            if (el) {
              try { el.value = d.value; } catch {}
              focusAndFlash(el);
            }
          }, 60);
        }
        return;
      }
      // Update profile (submit edit form)
      if (type === 'profile' && d.action === 'update-profile') {
        e.preventDefault?.();
        if (!showEdit) setShowEdit(true);
        setTimeout(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => /update profile/i.test(b.textContent || ''));
          if (btn) { focusAndFlash(btn); btn.click(); }
        }, 80);
        return;
      }
      // Cancel edit profile
      if (type === 'profile' && d.action === 'cancel-edit') {
        e.preventDefault?.();
        if (showEdit) setShowEdit(false);
        return;
      }
      // Focus sections
      if (type === 'profile' && d.action === 'focus' && d.target) {
        const t = norm(d.target);
        const sel = t.includes('reviews') ? '[aria-label="User reviews list"]' : t.includes('followed') ? 'h3:text("Followed Games")' : t.includes('stats') ? '[aria-label="User statistics"]' : null;
        if (sel) {
          const el = document.querySelector('[aria-label="User reviews list"]') || document.querySelector('[aria-label="User statistics"]');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          focusAndFlash(el);
        }
        return;
      }
      // Page scroll
      if (type === 'scroll') {
        const dir = d.direction;
        window.scrollBy({ top: dir === 'up' ? -400 : 400, behavior: 'smooth' });
        return;
      }
    };
    window.addEventListener('voiceCommand', onVoice);
    return () => window.removeEventListener('voiceCommand', onVoice);
  }, [setShowEdit, setShowPwd, setPrefs, showEdit, editForm, showPwd]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchCurrentUser();
        if (!mounted) return;
        setUser(data);
        setEditForm({ username: data.username || '', email: data.email || '' });
        // load accessibility prefs
        setPrefsLoading(true);
        try {
          const loaded = await getAccessibilityPreferences(data.id);
          if (mounted) setPrefs({
            visual: !!loaded.visual,
            motor: !!loaded.motor,
            cognitive: !!loaded.cognitive,
            hearing: !!loaded.hearing
          });
        } catch (e) {
          if (mounted) setPrefsError(e.message || 'Failed to load accessibility preferences');
        } finally {
          if (mounted) setPrefsLoading(false);
        }
        // fetching recent reviews after user loads
        setRevLoading(true);
        try {
          const revs = await fetchUserReviews(data.id);
          if (mounted) setReviews(revs);
        } catch (e) {
          if (mounted) setRevError(e.message || 'Failed to load reviews');
        } finally {
          if (mounted) setRevLoading(false);
        }
        // fetching followed games after user loads
        try {
          const games = await getFollowedGames(data.id);
          if (mounted) setFollowedGames(games);
        } catch { /* ignore */ }
        // load helpful votes
        try {
          const hv = await getHelpfulVotes(data.id);
          if (mounted) setHelpfulVotes(Number(hv.helpfulVotes || 0));
        } catch { /* ignore */ }
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function parseList(raw) {
      try {
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
    function recalcCounts(u) {
      if (!u?.id) { setFavCount(0); setWlCount(0); return; }
      const favRaw = localStorage.getItem(`favourites:${u.id}`);
      const wlRaw = localStorage.getItem(`wishlist:${u.id}`);
      const favs = parseList(favRaw);
      const wls = parseList(wlRaw);
      setFavCount(favs.length);
      setWlCount(wls.length);
    }
    recalcCounts(user);
    const onLibUpdated = (e) => { recalcCounts(user); };
    const onStorage = (e) => {
      if (!user?.id) return;
      if (e && typeof e.key === 'string' && (e.key === `favourites:${user.id}` || e.key === `wishlist:${user.id}`)) {
        recalcCounts(user);
      }
    };
    window.addEventListener('library:updated', onLibUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('library:updated', onLibUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [user]);

  // resetting carousel index when list changes
  useEffect(() => { setFgIndex(0); }, [followedGames]);

  function handleSavePrefs(e) {
    e.preventDefault();
    if (!user) return;
    setSavingPrefs(true);
    updateAccessibilityPreferences(user.id, prefs)
      .then(saved => { setPrefs(saved); pushToast('Accessibility preferences updated'); })
      .catch(err => { setPrefsError(err.message || 'Failed to save preferences'); })
      .finally(() => setSavingPrefs(false));
  }

  function onOpenEdit() { setEditError(''); setShowEdit(true); }
  function onOpenPwd() { setPwdError(''); setShowPwd(true); }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!user) return;
    setSavingEdit(true);
    try {
      const updated = await updateUserProfile(user.id, { username: editForm.username, email: editForm.email });
      setUser(u => ({ ...u, username: updated.username, email: updated.email }));
      pushToast('Profile updated');
      setShowEdit(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile');
    } finally { setSavingEdit(false); }
  }

  async function handleSavePwd(e) {
    e.preventDefault();
    if (!user) return;
    setSavingPwd(true);
    try {
      await changeUserPassword(user.id, pwdForm.currentPassword, pwdForm.newPassword);
      pushToast('Password updated');
      setShowPwd(false);
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwdError(err.message || 'Failed to change password');
    } finally { setSavingPwd(false); }
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen theme-page flex justify-center py-10">
      <div className="w-full max-w-6xl theme-surface border theme-border rounded-2xl shadow-lg p-8">
        {loading && <p className="theme-text">Loading profile…</p>}
        {!loading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!loading && !error && user && (
          <div className="theme-text">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-bold leading-tight">Profile</h1>
                <p className="text-xs theme-muted">Use voice to update your details and preferences.</p>
              </div>
              <button
                type="button"
                onClick={() => setCommandsOpen(v => !v)}
                aria-expanded={commandsOpen}
                aria-controls="profile-voice-commands"
                className="inline-flex items-center gap-2 rounded-md border theme-border theme-surface px-4 py-2 text-sm font-semibold theme-text shadow-sm transition hover:-translate-y-[1px] hover:shadow focus-visible:translate-y-0"
              >
                {commandsOpen ? 'Hide voice commands' : 'Show voice commands'}
              </button>
            </div>

            {commandsOpen && (
              <section
                id="profile-voice-commands"
                className="rounded-xl border theme-border theme-surface shadow-sm p-4 mb-6"
                aria-live="polite"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Voice commands for this page</p>
                  <button
                    type="button"
                    onClick={() => setCommandsOpen(false)}
                    className="text-xs font-semibold underline theme-muted"
                  >
                    Close
                  </button>
                </div>
                <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {voiceCommands.map((cmd) => (
                    <li key={cmd.phrase} className="flex flex-col">
                      <span className="font-semibold text-lime-600 dark:text-lime-300">{cmd.phrase}</span>
                      <span className="text-xs theme-muted">{cmd.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Top row containing user information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Avatar + main user info */}
              <div className="theme-surface border theme-border rounded-xl shadow p-4 flex gap-4 items-center lg:col-span-2">
                <div className="flex items-center justify-center w-24 h-24 rounded-full theme-subtle border theme-border overflow-hidden flex-shrink-0">
                  <img src={profile} alt="User avatar" className="w-20 h-20 object-cover rounded-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold theme-text">{user.username}</h1>
                  <p className="text-sm theme-muted">{user.email}</p>
                  {memberSince && (
                    <p className="text-xs theme-muted mt-2">Member Since <span className="font-medium theme-text">{memberSince}</span></p>
                  )}
                </div>
              </div>

              {/* Basic information box */}
              <div className="theme-surface border theme-border rounded-xl shadow p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-semibold theme-text mb-2">Basic Information</h2>
                  <div className="space-y-1 text-sm theme-text">
                    <div><span className="font-medium">Username:</span> {user.username}</div>
                    <div><span className="font-medium">Email:</span> {user.email}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button className="flex-1 theme-btn-strong text-sm font-medium py-2 rounded-md hover:opacity-90" onClick={onOpenEdit}>
                    Edit Profile
                  </button>
                  <button className="flex-1 theme-btn text-sm font-medium py-2 rounded-md hover:opacity-90" onClick={onOpenPwd}>
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Main lower grid: left (stats + accessibility), right (reviews), then followed games full width */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left side (stats + accessibility) */}
              <div className="lg:col-span-2 flex flex-col">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" aria-label="User statistics">
                  <StatBox label="Favourites" value={favCount} />
                  <StatBox label="Watchlist" value={wlCount} />
                  <StatBox label="Reviews" value={reviews.length} />
                  <StatBox label="Helpful Votes" value={helpfulVotes} />
                </div>                {/* Accessibility needs (auto height) */}
                <div className="theme-surface border theme-border rounded-xl shadow p-4 flex flex-col">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">My Accessibility Needs</h3>
                    {prefsLoading && <p className="text-xs theme-muted">Loading preferences…</p>}
                    {prefsError && <p className="text-xs text-red-600 mb-2">{prefsError}</p>}
                    <form onSubmit={handleSavePrefs} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Checkbox id="pref-visual" label="Visual Impairments" desc="Recommend games with visual accessibility" checked={prefs.visual} onChange={(v) => setPrefs(p => ({ ...p, visual: v }))} />
                        <Checkbox id="pref-cognitive" label="Cognitive Support" desc="Recommend games with cognitive support" checked={prefs.cognitive} onChange={(v) => setPrefs(p => ({ ...p, cognitive: v }))} />
                        <Checkbox id="pref-motor" label="Motor Impairments" desc="Recommend games with motor accessibility" checked={prefs.motor} onChange={(v) => setPrefs(p => ({ ...p, motor: v }))} />
                        <Checkbox id="pref-hearing" label="Hearing Impairments" desc="Recommend games with hearing accessibility" checked={prefs.hearing} onChange={(v) => setPrefs(p => ({ ...p, hearing: v }))} />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={savingPrefs} className="px-3 py-1 rounded-md text-xs font-medium theme-btn-strong disabled:opacity-50 hover:opacity-90">
                          {savingPrefs ? 'Saving…' : 'Confirm Preferences'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Recent Reviews (fixed laptop height, scaled up on larger screens) */}
              <div className="theme-surface border theme-border rounded-xl shadow p-4 lg:col-span-1 flex flex-col h-[307px] lg:h-[360px] xl:h-[307px] 2xl:h-[387px]">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold">Recent Reviews</h3>
                  {revLoading && <span className="text-xs theme-muted">Loading…</span>}
                </div>
                {revError && <p className="text-xs text-red-600 mb-2">{revError}</p>}
                <div className="space-y-2 md:space-y-3 overflow-y-auto pr-1 flex-1" aria-label="User reviews list">
                  {reviews.length === 0 && !revLoading && !revError && (
                    <p className="text-xs md:text-sm theme-muted">You have not posted any reviews yet.</p>
                  )}
                  {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              </div>
            </div>

            {/* Followed Games full width */}
            <div className="theme-surface border theme-border rounded-xl shadow p-4">
              <h3 className="text-sm font-semibold mb-2">Followed Games</h3>
              {followedGames.length === 0 && (
                <p className="text-xs theme-muted">You are not following any games yet.</p>
              )}
              {followedGames.length > 0 && followedGames.length <= VISIBLE && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {followedGames.map(g => (
                    <a key={g.id} href={`/games/${g.id}`} className="block group">
                      <div className="aspect-video theme-subtle border theme-border rounded overflow-hidden flex items-center justify-center">
                        {g.images && g.images.length ? (
                          <img src={g.images[0]} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-[10px] theme-muted">No image</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-medium truncate theme-text" title={g.title}>{g.title}</div>
                    </a>
                  ))}
                </div>
              )}
              {followedGames.length > VISIBLE && (
                <div className="relative">
                  {/* Left arrow */}
                  <button
                    aria-label="Previous followed games"
                    onClick={() => setFgIndex(i => (i - 1 + followedGames.length) % followedGames.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full theme-surface border theme-border shadow hover:opacity-80 flex items-center justify-center"
                  >
                    <span className="text-sm">&lt;</span>
                  </button>
                  {/* Right arrow */}
                  <button
                    aria-label="Next followed games"
                    onClick={() => setFgIndex(i => (i + 1) % followedGames.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full theme-surface border theme-border shadow hover:opacity-80 flex items-center justify-center"
                  >
                    <span className="text-sm">&gt;</span>
                  </button>
                  <div className="mx-10">
                    <div className="grid grid-cols-5 gap-4">
                      {getWindow(followedGames, fgIndex, VISIBLE).map(g => (
                        <a key={`${g.id}-${fgIndex}`} href={`/games/${g.id}`} className="block group">
                          <div className="aspect-video theme-subtle border theme-border rounded overflow-hidden flex items-center justify-center">
                            {g.images && g.images.length ? (
                              <img src={g.images[0]} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <span className="text-[10px] theme-muted">No image</span>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] font-medium truncate theme-text" title={g.title}>{g.title}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Edit Profile modal */}
            {showEdit && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="theme-surface border theme-border rounded-xl shadow p-6 w-full max-w-md">
                  <h3 className="text-base font-semibold mb-3">Edit Profile</h3>
                  {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium theme-text mb-1">Username</label>
                      <input type="text" value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} className="w-full theme-input rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium theme-text mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full theme-input rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowEdit(false)} className="px-3 py-1 rounded-md text-xs font-medium theme-subtle border theme-border hover:opacity-90">Cancel</button>
                      <button type="submit" disabled={savingEdit} className="px-3 py-1 rounded-md text-xs font-medium theme-btn-strong">{savingEdit ? 'Updating…' : 'Update Profile'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Change Password modal */}
            {showPwd && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="theme-surface border theme-border rounded-xl shadow p-6 w-full max-w-md">
                  <h3 className="text-base font-semibold mb-3">Change Password</h3>
                  {pwdError && <p className="text-xs text-red-600 mb-2">{pwdError}</p>}
                  <form onSubmit={handleSavePwd} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium theme-text mb-1">Current Password</label>
                      <input type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} className="w-full theme-input rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium theme-text mb-1">New Password</label>
                      <input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} className="w-full theme-input rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowPwd(false)} className="px-3 py-1 rounded-md text-xs font-medium theme-subtle border theme-border hover:opacity-90">Cancel</button>
                      <button type="submit" disabled={savingPwd} className="px-3 py-1 rounded-md text-xs font-medium theme-btn-strong">{savingPwd ? 'Updating…' : 'Update Password'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Component to display review card
function ReviewCard({ review }) {
  const { game, rating, comment, createdAt } = review;
  const stars = Math.round(rating || 0);
  const starEls = Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < stars ? 'text-amber-400' : 'theme-muted'}>&#9733;</span>
  ));
  const timeAgo = formatTimeAgo(createdAt);
  return (
    <div className="border theme-border rounded-md p-3 md:p-4 theme-subtle text-[11px] md:text-xs lg:text-sm theme-text">
      <div className="flex justify-between mb-1 md:mb-2">
        <span className="font-semibold truncate" title={game?.title || 'Game'}>{game?.title || 'Game'}</span>
        <span className="theme-muted whitespace-nowrap">{timeAgo}</span>
      </div>
      <div className="mb-1" aria-label={`Rating ${stars} of 5`}>{starEls}</div>
      <p className="leading-snug md:leading-normal">{comment || 'No comment provided.'}</p>
    </div>
  );
}

// Component to display a single stat box
function StatBox({ label, value }) {
  return (
    <div className="theme-surface border theme-border rounded-xl shadow p-4 flex flex-col items-center justify-center text-center">
      <div className="text-xl font-semibold theme-accent" aria-label={`${label} count`}>{value}</div>
      <div className="text-xs theme-muted">{label}</div>
    </div>
  );
}

// function to calculate the time from when the review was posted
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

function Checkbox({ id, label, desc, checked, onChange }) {
  return (
    <div className="flex items-start gap-2 theme-subtle border theme-border rounded-md p-2">
      <input
        id={id}
        type="checkbox"
        className="mt-1"
        style={{ accentColor: 'var(--accent)' }}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-xs leading-snug cursor-pointer select-none">
        <span className="font-medium">{label}</span><br />
        <span className="theme-muted">{desc}</span>
      </label>
    </div>
  );
}
