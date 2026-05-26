// src/components/upcoming-events/UpcomingEventCard.tsx
// =====================================================
// Single event row in UpcomingEventsView's list.
// Date is the visual anchor — traders scan by "when" first.
// =====================================================

import { Calendar, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import {
  EVENT_TYPE_LABELS,
  CONFIDENCE_LABELS,
  type UpcomingEvent,
} from '@/types/upcomingEvents';

interface UpcomingEventCardProps {
  event: UpcomingEvent;
  onThesisClick: (eventId: string) => void;
}

// ─── Date formatting helpers ──────────────────────────────────────────────

function formatEventDate(iso: string): { weekday: string; monthDay: string } {
  // 'YYYY-MM-DD' → parse as local date (not UTC, to avoid TZ drift on day boundaries)
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function daysUntilLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

// ─── Type-specific styling ────────────────────────────────────────────────

const TYPE_ACCENT: Record<UpcomingEvent['event_type'], string> = {
  investor_day: 'text-gold-primary',
  product_launch: 'text-ink-primary',
  earnings: 'text-ink-primary',
};

// ─── Component ────────────────────────────────────────────────────────────

export function UpcomingEventCard({ event, onThesisClick }: UpcomingEventCardProps) {
  const { weekday, monthDay } = formatEventDate(event.event_date);
  const untilLabel = daysUntilLabel(event.event_date);

  return (
    <Card variant="default" padding="default" className="group">
      <div className="flex items-start gap-ds-5">
        {/* Date column — visual anchor */}
        <div className="flex-shrink-0 w-[72px] text-center">
          <div className="font-mono text-[11px] font-medium tracking-[1px] uppercase text-ink-secondary">
            {weekday}
          </div>
          <div className="font-mono text-[20px] font-semibold tabular-nums text-ink-primary mt-ds-1">
            {monthDay}
          </div>
          <div className="font-sans text-[11px] text-gold-muted mt-ds-1">
            {untilLabel}
          </div>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Top row: type badge + ticker + confidence */}
          <div className="flex items-center gap-ds-2 mb-ds-2 flex-wrap">
            <span className={cn(
              'inline-block px-ds-2 py-[2px] rounded-sm',
              'font-sans text-[11px] font-medium tracking-[0.5px] uppercase',
              'bg-surface-base border-[0.5px] border-border-ds-subtle',
              TYPE_ACCENT[event.event_type],
            )}>
              {EVENT_TYPE_LABELS[event.event_type]}
            </span>

            {event.primary_ticker && (
              <span className="font-mono text-[13px] font-semibold tabular-nums text-ink-primary">
                {event.primary_ticker}
              </span>
            )}

            {event.event_time && (
              <span className="inline-flex items-center gap-1 font-mono text-[12px] tabular-nums text-ink-secondary">
                <Clock className="w-3 h-3" />
                {event.event_time} ET
              </span>
            )}

            {event.confidence !== 'confirmed' && (
              <span className="font-sans text-[11px] tracking-[0.5px] uppercase text-ink-secondary">
                · {CONFIDENCE_LABELS[event.confidence]}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-sans text-[15px] font-medium text-ink-primary leading-snug">
            {event.title}
          </h3>

          {/* Description (truncated) */}
          {event.description && (
            <p className="font-sans text-[13px] text-ink-secondary leading-relaxed mt-ds-2 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Affected tickers */}
          {event.affected_tickers.length > 0 && (
            <div className="mt-ds-2 flex items-center gap-ds-1 flex-wrap">
              <span className="font-sans text-[11px] tracking-[0.5px] uppercase text-ink-secondary">
                Also moves:
              </span>
              {event.affected_tickers.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="font-mono text-[11px] tabular-nums text-ink-secondary px-ds-1 rounded-sm bg-surface-base"
                >
                  {t}
                </span>
              ))}
              {event.affected_tickers.length > 6 && (
                <span className="font-sans text-[11px] text-ink-secondary">
                  +{event.affected_tickers.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Thesis CTA */}
          <button
            type="button"
            onClick={() => onThesisClick(event.id)}
            className={cn(
              'mt-ds-4 inline-flex items-center gap-ds-1',
              'px-ds-3 py-ds-1 rounded-sm',
              'font-sans text-[13px] font-medium',
              'text-gold-primary border-[0.5px] border-gold-border',
              'hover:bg-gold-primary/10 hover:border-gold-primary',
              'transition-colors duration-base ease-out',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{event.has_thesis ? 'View AI thesis' : 'Generate AI thesis'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right column: subtle date icon for visual rhythm */}
        <div className="flex-shrink-0 hidden sm:block">
          <Calendar className="w-4 h-4 text-ink-secondary opacity-40 group-hover:opacity-70 transition-opacity duration-base" />
        </div>
      </div>
    </Card>
  );
}
