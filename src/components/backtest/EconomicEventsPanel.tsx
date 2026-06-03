// ==========================================
// ECONOMIC EVENTS PANEL (Phase 2 — calendar overlay)
// ==========================================
// Mirrors TradeZella's economic-events panel in the backtest window: a filterable
// list of upcoming high/medium/low-impact events for the session period. Reuses
// the existing /api/economic-calendar endpoint (same source as macro/Calendar).

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EconomicEvent {
  date: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
}

interface EconomicEventsPanelProps {
  /** ISO date (yyyy-mm-dd) range to fetch — defaults to a 7-day window from `from`. */
  from?: string;
  to?: string;
  onClose?: () => void;
  className?: string;
}

const IMPACT_COLOR: Record<EconomicEvent['impact'], string> = {
  high: '#E44545',
  medium: '#C9A646',
  low: '#6B7280',
};

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';

export function EconomicEventsPanel({ from, to, onClose, className }: EconomicEventsPanelProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<ImpactFilter>('all');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/economic-calendar?${params.toString()}`);
        const data = await res.json();
        const list: EconomicEvent[] = data?.events || data || [];
        if (!cancelled) setEvents(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.impact === filter)),
    [events, filter]
  );

  return (
    <div
      className={cn(
        'w-[300px] rounded-2xl border border-[#C9A646]/20 bg-[#0A0A0A]/95 backdrop-blur-sm text-white flex flex-col max-h-[60vh]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#C9A646]" />
          <h3 className="text-sm font-semibold">Economic events</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Impact filter */}
      <div className="grid grid-cols-4 gap-1 p-2">
        {(['all', 'high', 'medium', 'low'] as ImpactFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md py-1 text-[11px] capitalize transition-all',
              filter === f ? 'bg-[#C9A646] text-black' : 'text-gray-400 hover:text-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="text-xs text-gray-500 text-center py-6">Loading events…</p>
        ) : error ? (
          <p className="text-xs text-rose-400 text-center py-6">Couldn't load events.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No events for this period.</p>
        ) : (
          filtered.map((e, i) => (
            <div
              key={`${e.date}-${e.time}-${i}`}
              className="rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: IMPACT_COLOR[e.impact] }}
                />
                <span className="text-xs text-white truncate flex-1">{e.event}</span>
                <span className="text-[10px] text-gray-500 shrink-0">{e.currency}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 pl-4 text-[10px] text-gray-500">
                <span>{e.date} {e.time}</span>
                {e.forecast && <span>F: {e.forecast}</span>}
                {e.previous && <span>P: {e.previous}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EconomicEventsPanel;
