// src/pages/app/admin/tabs/tools/ImpersonationPanel.tsx
// Active impersonation sessions — uses getActiveImpersonationSessions
// (already shipped). Includes a confirm-flow before ending a session.

import { useEffect, useState } from 'react';
import {
  Eye,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  getActiveImpersonationSessions,
  endImpersonation,
  invalidateImpersonationCaches,
  type ActiveImpersonationSession,
} from '@/services/adminService';
import { supabaseCache } from '@/lib/supabase';

function fmtTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function expiresInLabel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'expired';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  return `in ${h}h ${min % 60}m`;
}

export function ImpersonationPanel() {
  const [sessions, setSessions] = useState<ActiveImpersonationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getActiveImpersonationSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEnd(sessionToken: string) {
    try {
      setEnding(sessionToken);
      await endImpersonation(sessionToken);
      setConfirm(null);
      invalidateImpersonationCaches();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnding(null);
    }
  }

  function handleRefresh() {
    supabaseCache.invalidate('active-impersonation-sessions');
    load();
  }

  return (
    <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-white font-semibold text-sm">
            Active impersonation sessions
          </h3>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            {sessions.length} live
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="p-5 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {!error && sessions.length === 0 && !loading && (
        <p className="p-8 text-center text-sm text-gray-500">
          No active impersonation sessions.
        </p>
      )}

      {sessions.length > 0 && (
        <ul className="divide-y divide-gray-800">
          {sessions.map((s) => {
            const isConfirming = confirm === s.session_token;
            const isEnding = ending === s.session_token;
            return (
              <li key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="text-gray-400">admin:</span>{' '}
                      {s.admin_email}{' '}
                      <span className="text-gray-500">→</span>{' '}
                      <span className="text-gray-400">target:</span>{' '}
                      {s.target_user_email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {s.target_user_name || '(no display name)'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        started {fmtTime(s.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        expires {expiresInLabel(s.expires_at)}
                      </span>
                      {s.ip_address && (
                        <span className="text-gray-600">
                          ip {s.ip_address}
                        </span>
                      )}
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEnd(s.session_token)}
                        disabled={isEnding}
                        className="px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25
                                   text-xs font-medium disabled:opacity-50"
                      >
                        {isEnding ? 'Ending…' : 'Confirm end'}
                      </button>
                      <button
                        onClick={() => setConfirm(null)}
                        disabled={isEnding}
                        className="px-3 py-1.5 rounded-md bg-white/5 text-gray-400 hover:bg-white/10
                                   text-xs font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirm(s.session_token)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md
                                 bg-red-500/10 text-red-400 hover:bg-red-500/20
                                 text-xs font-medium shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      End session
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {loading && sessions.length === 0 && (
        <p className="p-8 text-center text-sm text-gray-500">Loading…</p>
      )}
    </section>
  );
}
