/**
 * Backtest Results — list of saved sessions.
 *
 * Phase 2 of the backtest marketing-ready sprint. Reads from the
 * backtest-sessions Edge Function (RLS-scoped to the current user). Each
 * row links back to the chart with the session pre-loaded — but that
 * load-from-saved flow lands in a later phase; for now clicking a row just
 * shows a detail panel inline.
 */

import { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { Trash2, BarChart3, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import {
  useBacktestPersistence,
  type SavedSessionSummary,
} from '@/hooks/useBacktestPersistence';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const BacktestResults = () => {
  const navigate = useNavigate();
  const persistence = useBacktestPersistence();
  const [sessions, setSessions] = useState<SavedSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedSessionSummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await persistence.listSessions();
      setSessions(result.sessions);
      setNextCursor(result.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [persistence]);

  const loadMore = useCallback(async () => {
    if (nextCursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await persistence.listSessions({ before: nextCursor });
      setSessions((prev) => [...prev, ...result.sessions]);
      setNextCursor(result.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more sessions');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, persistence]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setDeletingId(id);
    setDeleteError(null);
    try {
      await persistence.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      // Inline banner instead of alert() — native dialogs freeze the renderer
      // under browser automation (matches the app-wide flashTradeError policy).
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 text-[#F4F4F4]">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-[#C9A646]">
              <BarChart3 size={28} />
              My Backtests
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              All sessions you've saved to your journal.
            </p>
          </div>
          <button
            onClick={refresh}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        {/* Delete-failure banner (inline — no alert()) */}
        {deleteError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-300">
            <span className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              Couldn't delete session: {deleteError}
            </span>
            <button
              onClick={() => setDeleteError(null)}
              className="shrink-0 text-rose-400 transition-colors hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body */}
        {loading && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-12 text-center text-sm text-zinc-500">
            Loading saved sessions…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load sessions</div>
              <div className="mt-1 text-rose-400">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
              <BarChart3 className="text-zinc-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">No saved sessions yet</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Open the Chart tab, run a backtest, and click <span className="text-[#C9A646]">Save</span> to keep it here.
            </p>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-right">Trades</th>
                  <th className="px-4 py-3 text-right">Win rate</th>
                  <th className="px-4 py-3 text-right">Net P&amp;L</th>
                  <th className="px-4 py-3 text-right">Profit factor</th>
                  <th className="px-4 py-3 text-left">Saved</th>
                  <th className="px-4 py-3" />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/app/journal/backtest/chart?sessionId=${s.id}`)}
                    className="cursor-pointer border-t border-zinc-900 transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      {s.name ?? <span className="text-zinc-500 italic">Untitled</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <span className="text-[#C9A646]">{s.symbol}</span>
                      <span className="ml-1.5 text-zinc-600">· {s.interval}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{s.total_trades}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      s.win_rate >= 50 ? 'text-emerald-400' : 'text-zinc-400'
                    }`}>
                      {s.win_rate.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      s.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        {s.net_pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {s.net_pnl >= 0 ? '+' : ''}${s.net_pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#C9A646]">
                      {s.profit_factor >= 9999 ? '∞' : s.profit_factor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-600">
                      → Open
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(s); }}
                        disabled={deletingId === s.id}
                        className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-rose-950 hover:text-rose-400 disabled:cursor-wait"
                        title="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nextCursor !== null && (
              <div className="border-t border-zinc-800 px-4 py-3">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-[#C9A646] hover:text-[#C9A646] disabled:cursor-wait disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load older'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#C9A646]">Delete this saved session?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingDelete?.name
                ? <>You're about to delete <span className="font-semibold text-zinc-200">"{pendingDelete.name}"</span> permanently. This cannot be undone.</>
                : <>You're about to delete this saved session permanently. This cannot be undone.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default function BacktestResultsRoute() {
  return (
    <ErrorBoundary boundary="backtest-results">
      <BacktestResults />
    </ErrorBoundary>
  );
}
