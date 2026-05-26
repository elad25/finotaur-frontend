// src/pages/app/admin/tabs/tools/BulkActions.tsx
// ============================================
// Bulk Actions — multi-select users + grant access / ban / email.
//
// Data: getAllUsers (existing RPC), batchUpdateUsers, grantFreeAccess,
// banUser. No new RPCs, no schema changes. Loops grant_free_access per
// user since the RPC is single-user; batches ban via batchUpdateUsers.
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Gift,
  Ban,
  Mail,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import {
  getAllUsers,
  batchUpdateUsers,
  grantFreeAccess,
} from '@/services/adminService';
import type { UserWithStats, AccountType } from '@/types/admin';

type BulkAction = 'grant' | 'ban' | 'email';
type ResultState =
  | { kind: 'idle' }
  | { kind: 'running'; total: number; done: number }
  | { kind: 'done'; ok: number; failed: number; errors: string[] };

interface FilterState {
  search: string;
  accountType: AccountType | 'all';
}

const ACCOUNT_FILTERS: Array<{ value: FilterState['accountType']; label: string }> = [
  { value: 'all', label: 'All subscribers' },
  { value: 'trial', label: 'Trial' },
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium' },
  { value: 'free', label: 'Free (legacy)' },
];

export function BulkActions() {
  const { user } = useAuth();
  const adminId = user?.id ?? '';

  const [action, setAction] = useState<BulkAction>('grant');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    accountType: 'all',
  });
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [grantMonths, setGrantMonths] = useState(1);
  const [grantReason, setGrantReason] = useState('Bulk grant — Phase 2 admin');
  const [banReason, setBanReason] = useState('');

  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const resp = await getAllUsers(
          {
            account_type:
              filters.accountType === 'all' ? undefined : (filters.accountType as AccountType),
            search: filters.search || undefined,
          },
          { page: 1, pageSize: 100, sortBy: 'created_at', sortOrder: 'desc' }
        );
        if (cancelled) return;
        setUsers(resp.data);
      } catch (err) {
        if (cancelled) return;
        console.error('[BulkActions] load failed:', err);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load users'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.accountType]);

  const filteredUsers = useMemo(() => users, [users]);

  const allSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selected.has(u.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredUsers.map((u) => u.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function executeGrant() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setResult({ kind: 'running', total: ids.length, done: 0 });

    const errors: string[] = [];
    let ok = 0;
    let done = 0;

    for (const id of ids) {
      try {
        await grantFreeAccess(id, grantMonths, grantReason, adminId);
        ok += 1;
      } catch (err) {
        errors.push(
          `${id}: ${err instanceof Error ? err.message : 'unknown error'}`
        );
      }
      done += 1;
      setResult({ kind: 'running', total: ids.length, done });
    }

    setResult({ kind: 'done', ok, failed: ids.length - ok, errors });
  }

  async function executeBan() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!banReason.trim()) return;
    setResult({ kind: 'running', total: ids.length, done: 0 });

    try {
      await batchUpdateUsers(
        ids.map((id) => ({
          userId: id,
          data: {
            is_banned: true,
            ban_reason: banReason,
            banned_at: new Date().toISOString(),
          },
        })),
        adminId
      );
      setResult({ kind: 'done', ok: ids.length, failed: 0, errors: [] });
    } catch (err) {
      setResult({
        kind: 'done',
        ok: 0,
        failed: ids.length,
        errors: [err instanceof Error ? err.message : 'batch failed'],
      });
    }
  }

  function reset() {
    setSelected(new Set());
    setResult({ kind: 'idle' });
  }

  const canExecute = selected.size > 0 && result.kind !== 'running';

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
          <Users className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Bulk Actions</h1>
          <p className="text-sm text-gray-400 mt-1">
            Select users, then apply a single action across the entire
            selection — grant access, ban, or compose a broadcast.
          </p>
        </div>
      </header>

      {/* Action picker */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionCard
          icon={Gift}
          label="Grant free access"
          hint="Loops grant_free_access per user"
          active={action === 'grant'}
          onClick={() => setAction('grant')}
        />
        <ActionCard
          icon={Ban}
          label="Ban users"
          hint="Batched via batchUpdateUsers"
          active={action === 'ban'}
          onClick={() => setAction('ban')}
        />
        <ActionCard
          icon={Mail}
          label="Email (broadcast)"
          hint="Hands off to Communication tab"
          active={action === 'email'}
          onClick={() => setAction('email')}
        />
      </section>

      {/* Action-specific config */}
      {action === 'grant' && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Months to grant
            </span>
            <input
              type="number"
              min={1}
              max={24}
              value={grantMonths}
              onChange={(e) => setGrantMonths(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2 text-white focus:border-[#D4AF37]/50 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Reason (logged)
            </span>
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              className="mt-1 w-full bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2 text-white focus:border-[#D4AF37]/50 focus:outline-none"
            />
          </label>
        </section>
      )}

      {action === 'ban' && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
          <label className="block">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Ban reason (required)
            </span>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. spam, payment dispute, ToS violation"
              className="mt-1 w-full bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2 text-white focus:border-[#D4AF37]/50 focus:outline-none"
            />
          </label>
        </section>
      )}

      {action === 'email' && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
          <p className="text-sm text-gray-300 mb-3">
            Broadcast composition lives in the Communication tab. Select your
            audience here, then jump over with the selection IDs preserved in
            the URL fragment.
          </p>
          <Link
            to={`/app/admin/communication?ids=${Array.from(selected).join(',')}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              selected.size > 0
                ? 'bg-[#D4AF37] text-black hover:bg-[#E5C04C]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            onClick={(e) => {
              if (selected.size === 0) e.preventDefault();
            }}
          >
            <Mail className="w-4 h-4" />
            Compose for {selected.size} selected
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* User list with filter */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-800 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="Search by email or name..."
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded pl-9 pr-3 py-2 text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none"
            />
          </div>
          <select
            value={filters.accountType}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                accountType: e.target.value as FilterState['accountType'],
              }))
            }
            className="bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-[#D4AF37]/50 focus:outline-none"
          >
            {ACCOUNT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500 ml-auto">
            {selected.size} of {filteredUsers.length} selected
          </div>
        </header>

        {loadError ? (
          <div className="p-6 text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-sm">{loadError}</span>
          </div>
        ) : loading ? (
          <div className="p-6 text-gray-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading users…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">
            No users match the current filter.
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-[#D4AF37]"
                    />
                  </th>
                  <th className="text-left px-4 py-2 font-medium">User</th>
                  <th className="text-left px-4 py-2 font-medium">Plan</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelected = selected.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => toggleOne(u.id)}
                      className={`border-t border-gray-800 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#D4AF37]/[0.07]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(u.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-[#D4AF37]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-white">{u.display_name || '—'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-300">
                        {u.account_type}
                      </td>
                      <td className="px-4 py-2">
                        {u.is_banned ? (
                          <span className="text-red-400 text-xs">Banned</span>
                        ) : u.is_in_trial ? (
                          <span className="text-yellow-400 text-xs">Trial</span>
                        ) : (
                          <span className="text-green-400 text-xs">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Action bar */}
      {action !== 'email' && (
        <section className="bg-[#0E0E0E] border border-[#D4AF37]/20 rounded-lg p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <p className="text-white font-semibold">
              {action === 'grant' ? `Grant ${grantMonths} month(s) free access` : 'Ban selected users'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Applies to {selected.size} user{selected.size === 1 ? '' : 's'}.
              Logged in admin_actions.
            </p>
          </div>

          {result.kind === 'running' && (
            <div className="flex items-center gap-2 text-sm text-[#D4AF37]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {result.done} / {result.total}
            </div>
          )}

          {result.kind === 'done' && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-white">{result.ok} ok</span>
              {result.failed > 0 && (
                <>
                  <XCircle className="w-4 h-4 text-red-400 ml-2" />
                  <span className="text-red-400">{result.failed} failed</span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset
            </button>
            <button
              onClick={action === 'grant' ? executeGrant : executeBan}
              disabled={!canExecute || (action === 'ban' && !banReason.trim())}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                canExecute && !(action === 'ban' && !banReason.trim())
                  ? 'bg-[#D4AF37] text-black hover:bg-[#E5C04C]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Apply to {selected.size}
            </button>
          </div>
        </section>
      )}

      {result.kind === 'done' && result.errors.length > 0 && (
        <section className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-400 font-semibold text-sm">
              {result.errors.length} error{result.errors.length === 1 ? '' : 's'}:
            </span>
          </div>
          <ul className="text-xs text-red-300/80 space-y-1 max-h-40 overflow-y-auto">
            {result.errors.map((e, i) => (
              <li key={i} className="font-mono">
                {e}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg p-4 border transition-colors ${
        active
          ? 'bg-[#D4AF37]/[0.08] border-[#D4AF37]/50'
          : 'bg-[#111111] border-gray-800 hover:border-[#D4AF37]/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            active ? 'bg-[#D4AF37]/20' : 'bg-[#D4AF37]/10'
          }`}
        >
          <Icon className="w-4 h-4 text-[#D4AF37]" />
        </div>
        <div>
          <div className="text-white text-sm font-semibold">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{hint}</div>
        </div>
      </div>
    </button>
  );
}
