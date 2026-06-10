// src/pages/app/admin/UpcomingEventsAdmin.tsx
// =====================================================
// 🔑 UPCOMING EVENTS — Admin management page
// =====================================================
// Surface for the cron-discovered events:
//   - Force a Perplexity scan now (instead of waiting for 8:45 ET)
//   - Edit any event (title, date, ticker, published flag)
//   - Delete an event
//   - Regenerate AI thesis on demand
//   - Auth: relies on ProtectedAdminRoute wrapper + x-admin-key in localStorage
// =====================================================

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { RefreshCw, Trash2, Edit2, Sparkles, EyeOff, Eye, Loader2, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { SkeletonTable } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';
import {
  adminListAll,
  adminScan,
  adminUpdate,
  adminDelete,
  adminRegenerateThesis,
} from '@/services/upcomingEvents.api';
import {
  EVENT_TYPE_LABELS,
  type UpcomingEvent,
  type UpcomingEventPatch,
} from '@/types/upcomingEvents';

type Toast = { kind: 'success' | 'error'; message: string };

export default function UpcomingEventsAdmin() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'hidden'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // ─── Toast helper ──────────────────────────────────────────────────────
  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Fetch all events ──────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    setLoading(true);
    const list = await adminListAll(90);
    setEvents(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ─── Filter ────────────────────────────────────────────────────────────
  const filtered = events.filter((ev) => {
    if (filter === 'all') return true;
    if (filter === 'today') return ev.event_date === todayISO();
    if (filter === 'week') return daysDiff(ev.event_date) <= 7;
    // 'hidden' would need server admin-list to include published=false rows;
    // for now, public list doesn't return them. Placeholder for future server route.
    if (filter === 'hidden') return false;
    return true;
  });

  // ─── Force scan ────────────────────────────────────────────────────────
  const handleScan = async () => {
    setScanning(true);
    const result = await adminScan({ days: 30 });
    setScanning(false);
    if ('error' in result) {
      showToast({ kind: 'error', message: `Scan failed: ${result.error}` });
    } else {
      showToast({
        kind: 'success',
        message: `Scan done: +${result.inserted} new, ${result.updated} updated, ${result.skipped} skipped`,
      });
      await refetch();
    }
  };

  // ─── Toggle published ──────────────────────────────────────────────────
  const handleTogglePublished = async (ev: UpcomingEvent) => {
    // We don't have `published` flag in public read; treat as currently-published
    // (since it's in the list). Toggling here will hide it from the list.
    const result = await adminUpdate(ev.id, { published: false });
    if ('error' in result) {
      showToast({ kind: 'error', message: result.error });
    } else {
      showToast({ kind: 'success', message: 'Event hidden' });
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (ev: UpcomingEvent) => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    const result = await adminDelete(ev.id);
    if (result.error) {
      showToast({ kind: 'error', message: result.error });
    } else {
      showToast({ kind: 'success', message: 'Deleted' });
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    }
  };

  // ─── Regenerate thesis ─────────────────────────────────────────────────
  const handleRegenerate = async (ev: UpcomingEvent) => {
    showToast({ kind: 'success', message: 'Regenerating thesis (≈10s)…' });
    const result = await adminRegenerateThesis(ev.id);
    if ('error' in result) {
      showToast({ kind: 'error', message: result.error });
    } else {
      showToast({ kind: 'success', message: 'Thesis regenerated' });
      await refetch();
    }
  };

  // ─── Save edit ─────────────────────────────────────────────────────────
  const handleSave = async (id: string, patch: UpcomingEventPatch) => {
    const result = await adminUpdate(id, patch);
    if ('error' in result) {
      showToast({ kind: 'error', message: result.error });
    } else {
      showToast({ kind: 'success', message: 'Saved' });
      setEditingId(null);
      await refetch();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-6xl px-ds-4 py-ds-6">
        {/* Header */}
        <header className="mb-ds-5 flex items-start justify-between gap-ds-4 flex-wrap">
          <div>
            <span className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
              Admin
            </span>
            <h1 className="font-sans text-[24px] font-semibold text-ink-primary mt-ds-1">
              Upcoming Events
            </h1>
            <p className="font-sans text-[13px] text-ink-secondary mt-ds-1">
              Manage events found by the daily 8:45 AM ET Perplexity scan.
            </p>
          </div>

          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className={cn(
              'inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-[12px]',
              'bg-gradient-gold text-black shadow-glow-gold-resting',
              'font-sans text-[13px] font-semibold',
              'hover:opacity-90 transition-opacity duration-base',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary',
              scanning && 'cursor-not-allowed opacity-60',
            )}
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {scanning ? 'Scanning…' : 'Run scan now'}
          </button>
        </header>

        {/* Filter pills */}
        <div className="mb-ds-4 inline-flex items-center gap-ds-1 rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-1">
          {(['all', 'today', 'week', 'hidden'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-ds-3 py-ds-1 rounded-sm',
                'font-sans text-[12px] font-medium capitalize',
                'transition-colors duration-base',
                filter === f
                  ? 'bg-surface-base text-ink-primary'
                  : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {f === 'week' ? 'Next 7d' : f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading && <AdminSkeleton />}

        {!loading && filtered.length === 0 && (
          <Card variant="default" padding="spacious">
            <p className="text-center font-sans text-[14px] text-ink-secondary">
              No events match this filter.
            </p>
          </Card>
        )}

        {!loading && filtered.length > 0 && (
          <Card variant="default" padding="compact">
            <table className="w-full">
              <thead>
                <tr className="border-b-[0.5px] border-border-ds-subtle">
                  {['Date', 'Type', 'Ticker', 'Title', 'Thesis', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left font-sans text-[11px] font-medium tracking-[0.5px] uppercase text-ink-secondary py-ds-2 px-ds-2"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => (
                  <AdminRow
                    key={ev.id}
                    event={ev}
                    isEditing={editingId === ev.id}
                    onEdit={() => setEditingId(ev.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(patch) => handleSave(ev.id, patch)}
                    onToggleHide={() => handleTogglePublished(ev)}
                    onRegenerate={() => handleRegenerate(ev)}
                    onDelete={() => handleDelete(ev)}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-ds-5 right-ds-5 z-50',
            'inline-flex items-center gap-ds-2 px-ds-4 py-ds-2 rounded-[12px]',
            'border-[0.5px] shadow-glow-gold-resting',
            'font-sans text-[13px]',
            toast.kind === 'success'
              ? 'bg-surface-1 text-ink-primary border-gold-border'
              : 'bg-surface-1 text-num-negative border-border-ds-subtle',
          )}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-gold-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 text-num-negative" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

interface AdminRowProps {
  event: UpcomingEvent;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: UpcomingEventPatch) => void | Promise<void>;
  onToggleHide: () => void | Promise<void>;
  onRegenerate: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

function AdminRow({
  event,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onToggleHide,
  onRegenerate,
  onDelete,
}: AdminRowProps) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.event_date);

  if (isEditing) {
    return (
      <tr className="border-b-[0.5px] border-border-ds-subtle bg-surface-base">
        <td colSpan={6} className="p-ds-3">
          <div className="flex items-center gap-ds-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="font-mono text-[12px] tabular-nums bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-sm px-ds-2 py-ds-1 text-ink-primary"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[200px] font-sans text-[13px] bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-sm px-ds-2 py-ds-1 text-ink-primary"
            />
            <button
              type="button"
              onClick={() => onSave({ title, event_date: date })}
              className="font-sans text-[12px] font-medium px-ds-3 py-ds-1 rounded-sm bg-gradient-gold text-black"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="font-sans text-[12px] px-ds-3 py-ds-1 rounded-sm text-ink-secondary hover:text-ink-primary"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b-[0.5px] border-border-ds-subtle hover:bg-surface-1 transition-colors duration-base">
      <td className="py-ds-3 px-ds-2 font-mono text-[12px] tabular-nums text-ink-primary whitespace-nowrap">
        {event.event_date}
        {event.event_time && (
          <div className="text-[10px] text-ink-secondary">{event.event_time} ET</div>
        )}
      </td>
      <td className="py-ds-3 px-ds-2 font-sans text-[12px] text-ink-secondary whitespace-nowrap">
        {EVENT_TYPE_LABELS[event.event_type]}
      </td>
      <td className="py-ds-3 px-ds-2 font-mono text-[12px] tabular-nums text-ink-primary">
        {event.primary_ticker || '—'}
      </td>
      <td className="py-ds-3 px-ds-2 font-sans text-[13px] text-ink-primary">
        <div className="line-clamp-1 max-w-[280px]">{event.title}</div>
        {event.admin_added && (
          <span className="font-sans text-[10px] text-gold-muted tracking-[0.5px] uppercase">
            admin
          </span>
        )}
      </td>
      <td className="py-ds-3 px-ds-2">
        {event.has_thesis ? (
          <span className="font-sans text-[11px] text-gold-primary">✓ cached</span>
        ) : (
          <span className="font-sans text-[11px] text-ink-secondary">—</span>
        )}
      </td>
      <td className="py-ds-3 px-ds-2">
        <div className="flex items-center gap-ds-1">
          <IconButton onClick={onEdit} title="Edit"><Edit2 className="w-3.5 h-3.5" /></IconButton>
          <IconButton onClick={onRegenerate} title="Regenerate thesis">
            <Sparkles className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton onClick={onToggleHide} title="Hide from public">
            <EyeOff className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton onClick={onDelete} title="Delete" danger>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  onClick,
  title,
  danger = false,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'p-ds-1 rounded-sm',
        'transition-colors duration-base',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
        danger
          ? 'text-ink-secondary hover:text-num-negative'
          : 'text-ink-secondary hover:text-gold-primary',
      )}
    >
      {children}
    </button>
  );
}

function AdminSkeleton() {
  return <SkeletonTable rows={5} cols={6} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysDiff(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
