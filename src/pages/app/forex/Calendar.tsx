// ============================================================
// src/pages/app/forex/Calendar.tsx
// Economic Calendar — FREE page, no premium gate.
// ============================================================

import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useForexCalendar } from './_shared/hooks';
import type { ForexCalendarEvent } from './_shared/types';

// ── Impact badge ─────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: string }) {
  const lower = impact.toLowerCase();
  let cls = 'text-white/40 border-white/10';
  if (lower === 'high') cls = 'text-red-400 border-red-400/30 bg-red-400/10';
  else if (lower === 'medium' || lower === 'med') cls = 'text-amber-400 border-amber-400/30 bg-amber-400/10';
  else if (lower === 'low') cls = 'text-white/40 border-white/10 bg-white/5';

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${cls}`}>
      {lower === 'medium' || lower === 'med' ? 'MED' : impact.toUpperCase()}
    </span>
  );
}

// ── Cell value (actual / forecast / previous) ────────────────

function CellVal({ val }: { val: string | number | null | undefined }) {
  if (val === null || val === undefined || val === '') return <span className="text-white/20">—</span>;
  return <>{val}</>;
}

// ── Datetime formatter ────────────────────────────────────────

function fmtDatetime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ── Row ───────────────────────────────────────────────────────

function EventRow({ ev }: { ev: ForexCalendarEvent }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-xs text-white/50 whitespace-nowrap font-mono">
        {fmtDatetime(ev.datetime)}
      </td>
      <td className="py-2.5 px-3 text-xs font-bold text-white/80 uppercase">
        {ev.currency}
      </td>
      <td className="py-2.5 px-3">
        <ImpactBadge impact={ev.impact} />
      </td>
      <td className="py-2.5 px-3 text-xs text-white/80 max-w-[280px]">
        <span className="line-clamp-2">{ev.title}</span>
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/70 text-right">
        <CellVal val={ev.actual} />
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/40 text-right">
        <CellVal val={ev.forecast} />
      </td>
      <td className="py-2.5 px-3 text-xs font-mono text-white/40 text-right">
        <CellVal val={ev.previous} />
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ForexCalendar() {
  const { data, loading } = useForexCalendar(7);

  const unavailable =
    !loading && (!data || data.source === 'unavailable' || data.events.length === 0);

  // Sort by datetime ascending
  const events = data
    ? [...data.events].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      )
    : [];

  return (
    <PageTemplate
      title="Economic Calendar"
      description="High-impact economic events across the major currencies."
    >
      <GlassCard padding="md">
        {loading ? (
          <GlassTableSkeleton rows={10} />
        ) : unavailable ? (
          <EmptyState
            icon="📅"
            title="Economic calendar is temporarily unavailable."
            description="Check back shortly — data refreshes every 30 minutes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Time', 'Currency', 'Impact', 'Event', 'Actual', 'Forecast', 'Previous'].map((h) => (
                    <th
                      key={h}
                      className="pb-2.5 px-3 text-left text-[10px] uppercase tracking-wider text-white/30 font-medium last:text-right [&:nth-child(5)]:text-right [&:nth-child(6)]:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <EventRow key={`${ev.datetime}-${ev.currency}-${i}`} ev={ev} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.source !== 'unavailable' && (
          <p className="mt-3 text-[10px] text-white/20 text-right">
            Source: {data.source} &middot; {new Date(data.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
        )}
      </GlassCard>
    </PageTemplate>
  );
}
