/**
 * DateTimePicker — pick the replay start moment.
 *
 * Phase 4 helper for BacktestReplayChart. Two native inputs (date + time) so
 * we get zero-dependency, accessible UX. The picker enforces the lookback
 * ceiling of the chosen interval (Yahoo: 1m → 7d, 5m → 60d, 15m → 60d,
 * 60m → 730d, 1d → multi-year). Picking a moment before the limit surfaces
 * an inline warning but does NOT hard-block — Binance crypto has different
 * limits and pulling the constraint in here would couple it to Yahoo.
 *
 * Emits a JS Date (local time, browser timezone) on user commit. Caller
 * converts to UTC seconds for the bar-fetch call.
 */

import { useMemo, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import type { Interval } from '@/components/charting/types';

export interface DateTimePickerProps {
  value: Date;
  interval: Interval;
  onChange: (next: Date) => void;
  /** Disabled while a fetch is in flight, etc. */
  disabled?: boolean;
}

// Yahoo-finance lookback ceilings (days). Empirical limits documented in
// the chart-bars Edge Function. Crypto via Binance is effectively unbounded
// — surfaced as `null` so the warning is skipped.
const LOOKBACK_DAYS_BY_INTERVAL: Partial<Record<Interval, number>> = {
  '1m': 7,
  '2m': 60,
  '5m': 60,
  '15m': 60,
  '30m': 60,
  '60m': 730,
  '1h': 730,
  '4h': 730,
  '1d': 365 * 50,
  '1wk': 365 * 50,
  '1mo': 365 * 50,
};

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${mm}`;
}

export function DateTimePicker({ value, interval, onChange, disabled }: DateTimePickerProps) {
  const [dateStr, setDateStr] = useState(() => toDateInputValue(value));
  const [timeStr, setTimeStr] = useState(() => toTimeInputValue(value));

  // Keep local input state in sync when parent updates `value` (e.g. via Reset).
  useEffect(() => {
    setDateStr(toDateInputValue(value));
    setTimeStr(toTimeInputValue(value));
  }, [value]);

  const lookbackDays = LOOKBACK_DAYS_BY_INTERVAL[interval];

  const { warning, maxDate } = useMemo(() => {
    if (lookbackDays == null) return { warning: null, maxDate: null };
    const now = new Date();
    const oldest = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    if (value < oldest) {
      return {
        warning: `Yahoo only serves ${lookbackDays}-day history for ${interval} bars. Pick a date after ${oldest.toLocaleDateString()}.`,
        maxDate: toDateInputValue(now),
      };
    }
    return { warning: null, maxDate: toDateInputValue(now) };
  }, [value, interval, lookbackDays]);

  const commit = (newDateStr: string, newTimeStr: string) => {
    // Parse as local time, then hand back as Date. Caller converts to UTC.
    const [y, m, d] = newDateStr.split('-').map(Number);
    const [hh, mm] = newTimeStr.split(':').map(Number);
    if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return;
    const next = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (isNaN(next.getTime())) return;
    onChange(next);
  };

  // Elad 2026-05-29: only the calendar icon. The visible date + time
  // inputs were removed because the in-chart click-to-jump (set in
  // BacktestReplayChart) is now the primary way to change the replay
  // moment. The icon is preserved as a visual cue + future popover
  // expansion point. dateStr/timeStr state retained so future expansion
  // can re-enable a popup without restoring the inputs inline.
  void dateStr; void timeStr; void commit; void warning;

  return (
    <div className="flex items-center" title="Replay start time — click on the chart to jump">
      <Calendar size={14} className="text-zinc-500" aria-hidden="true" />
    </div>
  );
}
