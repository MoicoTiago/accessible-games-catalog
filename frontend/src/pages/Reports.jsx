import React, { useEffect, useMemo, useState } from 'react';
import { getGameReports, fetchCurrentUser, resolveGameReport, deleteGame } from '../api.js';
import { pushToast } from '../components/ToastHost.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | resolved
  const [gameFilter, setGameFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');

        // Ensure user is logged in and is admin
        let currentUser;
        try {
          currentUser = await fetchCurrentUser();
        } catch {
          if (!cancelled) {
            pushToast('You must be logged in to view reports');
            navigate('/', { replace: true });
          }
          return;
        }

        if (!currentUser?.isAdmin) {
          if (!cancelled) {
            pushToast('You do not have permission to view reports');
            navigate('/', { replace: true });
          }
          return;
        }

        const data = await getGameReports();
        if (!cancelled) {
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load reports');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const games = useMemo(() => {
    const map = new Map();
    for (const r of reports) {
      if (r.game && !map.has(r.game.id)) {
        map.set(r.game.id, r.game.title || `Game #${r.game.id}`);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === 'open' && r.status) return false;
      if (statusFilter === 'resolved' && !r.status) return false;
      if (gameFilter !== 'all') {
        const gid = Number(gameFilter);
        if (!r.game || r.game.id !== gid) return false;
      }
      return true;
    });
  }, [reports, statusFilter, gameFilter]);

  const handleResolve = async (id) => {
    try {
      await resolveGameReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: true } : r)));
      pushToast('Report marked as resolved');
    } catch (e) {
      pushToast(e.message || 'Failed to resolve report');
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!gameId) return;
    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteGame(gameId);
      // Mark reports for this game as resolved locally
      setReports((prev) =>
        prev.map((r) =>
          r.game && r.game.id === gameId
            ? { ...r, status: true }
            : r
        )
      );
      pushToast('Game deleted and associated reports marked as resolved');
    } catch (e) {
      pushToast(e.message || 'Failed to delete game');
    }
  };

  return (
    <main className="min-h-screen bg-page text-primary">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Game Reports</h1>
          <Link to="/" className="text-sm text-accent hover:underline">
            ← Back to Home
          </Link>
        </header>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <section className="mb-4 flex flex-wrap gap-3 items-center text-sm">
          <div>
            <label className="mr-2 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="theme-input rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="mr-2 font-medium">Game:</label>
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="theme-input rounded px-2 py-1 text-sm"
            >
              <option value="all">All games</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <p className="text-sm">Loading reports…</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-sm text-muted">No reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle">
                  <th className="px-3 py-2 text-left font-medium">Game</th>
                  <th className="px-3 py-2 text-left font-medium">User ID</th>
                  <th className="px-3 py-2 text-left font-medium">Message</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Created</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id} className="border-b border-border align-top">
                    <td className="px-3 py-2">
                      {r.game ? r.game.title : 'Unknown game'}
                    </td>
                    <td className="px-3 py-2">{r.userId ?? 'N/A'}</td>
                    <td className="px-3 py-2 max-w-md whitespace-pre-wrap">
                      {r.message}
                    </td>
                    <td className="px-3 py-2">
                      {r.status ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </td>
                    <td className="px-3 py-2">
                      {!r.status && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResolve(r.id)}
                            className="px-3 py-1 mr-2 rounded bg-blue-500 text-white bg-accent text-accent-contrast text-xs font-medium hover:opacity-90"
                          >
                            Resolve
                          </button>
                          {r.game && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGame(r.game.id)}
                              className="px-3 py-1 rounded bg-red-600 text-white text-xs font-medium hover:opacity-90"
                            >
                              Delete game
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
