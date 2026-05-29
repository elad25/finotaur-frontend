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
 *
 * Clicking the calendar icon opens a 2-step popover wizard:
 *   Step 1 — date picker → "Next"
 *   Step 2 — time picker → "Apply" (fires onChange with combined Date)
 * Outside-click or Esc closes without committing.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
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

type PopoverStep = 'closed' | 'date' | 'time';

export function DateTimePicker({ value, interval, onChange, disabled }: DateTimePickerProps) {
  // ─── Popover state machine ────────────────────────────────────
  const [popoverStep, setPopoverStep] = useState<PopoverStep>('closed');
  // Draft values while the wizard is open; committed only on "Apply".
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState('');

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isOpen = popoverStep !== 'closed';

  // Open: seed draft from current value, start at date step.
  const handleOpen = () => {
    if (disabled) return;
    setDraftDate(toDateInputValue(value));
    setDraftTime(toTimeInputValue(value));
    setPopoverStep('date');
  };

  // Close without committing.
  const handleClose = () => setPopoverStep('closed');

  // Outside-click and Esc close without committing.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  // Keep draft in sync when parent resets value externally (e.g. Reset button)
  // — only while the popover is closed so we don't override an in-flight edit.
  useEffect(() => {
    if (!isOpen) {
      setDraftDate(toDateInputValue(value));
      setDraftTime(toTimeInputValue(value));
    }
  }, [value, isOpen]);

  // ─── Allowed date range for the picker (data-source limits) ──
  // The Calendar is clamped to [oldest, now] so users can only pick dates
  // we can actually fetch bars for. No hidden warning needed.
  const lookbackDays = LOOKBACK_DAYS_BY_INTERVAL[interval];
  const { fromDate, toDate, selectedDate } = useMemo(() => {
    const now = new Date();
    const oldest = lookbackDays != null
      ? new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000)
      : new Date(1970, 0, 1);
    const picked = draftDate ? new Date(draftDate + 'T00:00:00') : undefined;
    return { fromDate: oldest, toDate: now, selectedDate: picked };
  }, [draftDate, lookbackDays]);

  // ─── Apply: build combined Date and fire onChange ─────────────
  const handleApply = () => {
    const [y, mo, d] = draftDate.split('-').map(Number);
    const [hh, mm] = draftTime.split(':').map(Number);
    if (!y || !mo || !d || isNaN(hh) || isNaN(mm)) return;
    const next = new Date(y, mo - 1, d, hh, mm, 0, 0);
    if (isNaN(next.getTime())) return;
    onChange(next);
    handleClose();
  };

  return (
    <div className="relative flex items-center" title="Replay start time">
      {/* Trigger: calendar icon */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="flex items-center text-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Pick replay start date and time"
      >
        <CalendarIcon size={14} aria-hidden="true" />
      </button>

      {/* 2-step popover wizard */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full mt-1 right-0 z-50 w-72 rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-xs font-semibold text-zinc-300">
              {popoverStep === 'date' ? 'Pick date' : 'Pick time'}
            </span>
            <span className="text-xs text-zinc-600">
              Step {popoverStep === 'date' ? 1 : 2} of 2
            </span>
          </div>

          <div className="p-3 space-y-3">
            {popoverStep === 'date' && (
              <>
                {/* Visual calendar — clamped to the data-source lookback so
                    users can only pick a date we can fetch bars for. */}
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setDraftDate(toDateInputValue(d));
                  }}
                  fromDate={fromDate}
                  toDate={toDate}
                  defaultMonth={selectedDate ?? toDate}
                  className="p-0"
                />
                {/* Actions */}
                <button
                  type="button"
                  disabled={!draftDate}
                  onClick={() => setPopoverStep('time')}
                  className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}

            {popoverStep === 'time' && (
              <>
                {/* Time input */}
                <input
                  type="time"
                  value={draftTime}
                  onChange={(e) => setDraftTime(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
                {/* Actions */}
                <button
                  type="button"
                  disabled={!draftTime}
                  onClick={handleApply}
                  className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setPopoverStep('date')}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
