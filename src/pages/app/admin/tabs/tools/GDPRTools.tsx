// src/pages/app/admin/tabs/tools/GDPRTools.tsx
// ============================================
// GDPR Tools — search a user, preview their profile, download a JSON
// data dump for portability / right-to-access requests.
//
// Data: getAllUsers (search) + getUserById (full profile snapshot).
// No new RPCs; uses existing reads only. Audit-trail entry recorded
// via logAdminAction inside getUserById/the broader admin pipeline.
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileDown,
  Search,
  Download,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Calendar,
  Crown,
  Activity,
} from 'lucide-react';
import { SkeletonText, SkeletonCard } from '@/components/ds/Skeleton';
import { getAllUsers, getUserById } from '@/services/adminService';
import type { UserWithStats } from '@/types/admin';

interface PreviewSection {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function GDPRTools() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [candidates, setCandidates] = useState<UserWithStats[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<UserWithStats | null>(null);
  const [full, setFull] = useState<UserWithStats | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (debounced.length < 2) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const resp = await getAllUsers(
          { search: debounced },
          { page: 1, pageSize: 20, sortBy: 'created_at', sortOrder: 'desc' }
        );
        if (cancelled) return;
        setCandidates(resp.data);
      } catch (err) {
        if (cancelled) return;
        console.error('[GDPRTools] search failed:', err);
        setSearchError(
          err instanceof Error ? err.message : 'Search failed'
        );
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    if (!selected) {
      setFull(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingFull(true);
        setFullError(null);
        setDownloaded(false);
        const u = await getUserById(selected.id);
        if (cancelled) return;
        setFull(u);
      } catch (err) {
        if (cancelled) return;
        console.error('[GDPRTools] getUserById failed:', err);
        setFullError(
          err instanceof Error ? err.message : 'Failed to load full profile'
        );
      } finally {
        if (!cancelled) setLoadingFull(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const preview = useMemo<PreviewSection[]>(() => {
    if (!full) return [];
    return [
      { label: 'Email', value: full.email, icon: Mail },
      {
        label: 'Display name',
        value: full.display_name || '—',
        icon: ShieldCheck,
      },
      { label: 'Plan', value: full.account_type, icon: Crown },
      {
        label: 'Joined',
        value: new Date(full.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        icon: Calendar,
      },
      {
        label: 'Login count',
        value: full.login_count.toLocaleString('en-US'),
        icon: Activity,
      },
      {
        label: 'Last login',
        value: full.last_login_at
          ? new Date(full.last_login_at).toLocaleString('en-US')
          : '—',
        icon: Activity,
      },
    ];
  }, [full]);

  function downloadJSON() {
    if (!full) return;

    const dump = {
      _meta: {
        export_type: 'GDPR data portability',
        exported_at: new Date().toISOString(),
        user_id: full.id,
        notice:
          'This export contains profile data available from the FINOTAUR admin RPCs. Trade history, journal entries, and broker tokens require a separate per-table export — request via support.',
      },
      profile: full,
    };

    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const safeEmail = full.email.replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-export-${safeEmail}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start gap-4">
        <Link
          to="/app/admin/tools"
          className="text-xs text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 transition-colors mt-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tools
        </Link>
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <FileDown className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">GDPR Export</h1>
          <p className="text-sm text-gray-400 mt-1">
            Search a user, preview their profile, download a JSON dump for
            right-to-access / data-portability requests.
          </p>
        </div>
      </header>

      <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
        <label className="block mb-3">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Search by email or name
          </span>
          <div className="relative mt-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="user@example.com or display name…"
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded pl-9 pr-3 py-2 text-white focus:border-[#D4AF37]/50 focus:outline-none"
            />
          </div>
        </label>

        {searchError && (
          <div className="text-red-400 text-sm flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {debounced.length >= 2 && (
          <div className="border border-gray-800 rounded overflow-hidden max-h-72 overflow-y-auto">
            {searching ? (
              <div className="p-4">
                <SkeletonText lines={3} />
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                No users match “{debounced}”.
              </div>
            ) : (
              <ul className="divide-y divide-gray-800">
                {candidates.map((c) => {
                  const isActive = selected?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelected(c)}
                        className={`w-full text-left px-4 py-2 transition-colors ${
                          isActive
                            ? 'bg-[#D4AF37]/[0.08]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-sm">
                            {c.display_name || '—'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {c.account_type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.email}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {selected && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
          <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-white font-semibold">
              Profile preview
            </h2>
            {full && (
              <button
                onClick={downloadJSON}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#D4AF37] text-black text-sm font-semibold hover:bg-[#E5C04C] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download JSON
              </button>
            )}
          </header>

          {fullError ? (
            <div className="text-red-400 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{fullError}</span>
            </div>
          ) : loadingFull || !full ? (
            <SkeletonCard lines={4} withGrid />
          ) : (
            <>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {preview.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li
                      key={p.label}
                      className="bg-[#0A0A0A] border border-gray-800 rounded-md p-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
                        <Icon className="w-3 h-3" />
                        {p.label}
                      </div>
                      <div className="text-white text-sm font-medium mt-1 break-all">
                        {p.value}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  Raw JSON preview
                </summary>
                <pre className="mt-2 text-[11px] text-gray-300 bg-[#0A0A0A] border border-gray-800 rounded p-3 max-h-72 overflow-auto font-mono">
{JSON.stringify(full, null, 2)}
                </pre>
              </details>

              {downloaded && (
                <p className="text-xs text-green-400 mt-3 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Export downloaded — log the request reference in your CRM
                  ticket per company GDPR procedure.
                </p>
              )}

              <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
                This export contains profile fields available via
                {' '}<code className="text-[#D4AF37]">getUserById</code>{' '}
                today. Trades, journal entries, and broker tokens require a
                separate per-table export — coordinate via the support
                ticket or a dedicated Edge Function in a future sprint.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
