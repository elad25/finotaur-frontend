// src/components/upcoming-events/RangeSelector.tsx
// =====================================================
// Segmented control: 3d | 7d | 30d
// Drives the window for UpcomingEventsView's list query.
// Default: 3d (per Elad 2026-05-26).
// =====================================================

import { cn } from '@/lib/utils';
import { RANGE_OPTIONS, type RangeDays } from '@/types/upcomingEvents';

interface RangeSelectorProps {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
  disabled?: boolean;
}

export function RangeSelector({ value, onChange, disabled = false }: RangeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Event date range"
      className={cn(
        'inline-flex items-center gap-ds-1',
        'rounded-[12px] border-[0.5px] border-border-ds-subtle',
        'bg-surface-1 p-ds-1',
      )}
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Show events for next ${opt.value} days`}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-w-[44px] px-ds-3 py-ds-1',
              'rounded-sm',
              'font-sans text-[13px] font-medium tabular-nums',
              'transition-colors duration-base ease-out',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
              disabled && 'cursor-not-allowed opacity-50',
              active
                ? 'bg-gradient-gold text-black shadow-glow-gold-resting'
                : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
