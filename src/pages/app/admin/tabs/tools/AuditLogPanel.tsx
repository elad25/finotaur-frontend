// src/pages/app/admin/tabs/tools/AuditLogPanel.tsx
// Recent admin actions — uses getAdminAuditLogs (already shipped in
// adminService.ts). Read-only viewer.

import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  User as UserIcon,
  Ban,
  Gift,
  Edit3,
  Trash2,
  RotateCcw,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import {
  getAdminAuditLogs,
  invalidateUserCaches,
} from '@/services/adminService';
import { supabaseCache } from '@/lib/supabase';
import type { AdminAuditLog, AdminActionType } from '@/types/admin';

const ACTION_META: Record<AdminActionType, { icon: LucideIcon; color: string; label: string }> = {
  USER_UPDATE:                  { icon: Edit3,        color: 'text-blue-400',   label: 'User update' },
  SUBSCRIPTION_CHANGE:          { icon: Edit3,        color: 'text-yellow-400', label: 'Subscription change' },
  BAN_USER:                     { icon: Ban,          color: 'text-red-400',    label: 'Ban' },
  UNBAN_USER:                   { icon: UserIcon,     color: 'text-green-400',  label: 'Unban' },
  MANUAL_REWARD:                { icon: Gift,         color: 'text-purple-400', label: 'Manual reward' },
  DELETE_TRADE:                 { icon: Trash2,       color: 'text-red-400',    label: 'Trade delete' },
  DELETE_USER:                  { icon: Trash2,       color: 'text-red-500',    label: 'User delete' },
  SOFT_DELETE_USER:             { icon: Trash2,       color: 'text-orange-400', label: 'Soft delete' },
  RESTORE_USER_FROM_ARCHIVE:    { icon: RotateCcw,    color: 'text-green-400',  label: 'Restore' },
  PERMANENT_DELETE_FROM_ARCHIVE:{ icon: AlertTriangle, color: 'text-red-500',   label: 'Permanent delete' },
};

const PAGE_SIZE = 50;

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminAuditLogs(PAGE_SIZE, 0);
      setLogs(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleRefresh() {
    // Bust the audit-logs cache so the next fetch hits Postgres fresh
    supabaseCache.invalidate('audit-logs');
    load();
  }

  return (
    <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-white font-semibold text-sm">
            Recent admin actions
          </h3>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            last {PAGE_SIZE} · {total.toLocaleString()} total
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

      {!error && logs.length === 0 && !loading && (
        <p className="p-8 text-center text-sm text-gray-500">
          No admin actions logged yet.
        </p>
      )}

      {logs.length > 0 && (
        <ul className="divide-y divide-gray-800">
          {logs.map((log) => {
            const meta = ACTION_META[log.action_type] ?? {
              icon: Edit3,
              color: 'text-gray-400',
              label: log.action_type,
            };
            const Icon = meta.icon;
            return (
              <li
                key={log.id}
                className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02]"
              >
                <div
                  className="w-7 h-7 rounded-md bg-[#0A0A0A] border border-gray-800
                             flex items-center justify-center shrink-0"
                >
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formatRelative(log.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="text-gray-400">{log.admin_email}</span>
                    {log.target_user_email && (
                      <>
                        {' '}→ <span className="text-gray-400">{log.target_user_email}</span>
                      </>
                    )}
                  </p>
                  {log.reason && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">
                      "{log.reason}"
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {loading && logs.length === 0 && (
        <p className="p-8 text-center text-sm text-gray-500">Loading…</p>
      )}
    </section>
  );
}

// Re-export for explicit usage from container if invalidation is needed
export { invalidateUserCaches };
