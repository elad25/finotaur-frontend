// src/pages/app/ai/UpcomingEventsView.tsx
// =====================================================
// 📅 UPCOMING EVENTS — main public-facing page
// =====================================================
// Forward-looking catalyst calendar (Investor Days, Product launches,
// Earnings). Pro+ gated. Default range = 3 days.
//
// Architecture:
//   - useSubscriptionStatus → isPlatformPaid gate (paywall if free)
//   - listEvents(range) → fetches from /api/upcoming-events/list?days=X
//   - RangeSelector → 3d / 7d / 30d toggles
//   - UpcomingEventCard list → renders each event
//   - EventThesisDrawer → opens on "View AI thesis" click
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { Card } from '@/components/ds/Card';
import { RangeSelector } from '@/components/upcoming-events/RangeSelector';
import { UpcomingEventCard } from '@/components/upcoming-events/UpcomingEventCard';
import { EventThesisDrawer } from '@/components/upcoming-events/EventThesisDrawer';
import { listEvents } from '@/services/upcomingEvents.api';
import type { UpcomingEvent, RangeDays } from '@/types/upcomingEvents';
import { cn } from '@/lib/utils';

export default function UpcomingEventsView() {
  const { isPlatformPaid, isAdmin, isLoading: subLoading } = useSubscriptionStatus();

  const [range, setRange] = useState<RangeDays>(3);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const hasAccess = isPlatformPaid || isAdmin;

  // ─── Fetch events ──────────────────────────────────────────────────────
  const fetchEvents = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const res = await listEvents({ days: range });
      setEvents(res.events);
      setLastUpdated(new Date());

      setLoading(false);
      setRefreshing(false);
    },
    [range],
  );

  useEffect(() => {
    if (!hasAccess || subLoading) return;
    fetchEvents();
  }, [range, hasAccess, subLoading, fetchEvents]);

  // ─── Gating ────────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-gold-primary animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <UpgradeGate
        feature="Upcoming Events"
        upgradeTarget="core"
        message="Get forward-looking event calendar with AI thesis for Investor Days, product launches, and earnings."
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-4xl px-ds-4 py-ds-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mb-ds-6"
        >
          <div className="flex items-center gap-ds-2 mb-ds-2">
            <Calendar className="w-4 h-4 text-gold-primary" />
            <span className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
              Forward Calendar
            </span>
          </div>
          <h1 className="font-sans text-[28px] font-semibold text-ink-primary leading-tight">
            Upcoming Events
          </h1>
          <p className="font-sans text-[14px] text-ink-secondary mt-ds-2 max-w-2xl">
            Investor Days, product launches, and earnings — surfaced before
            they happen, with AI-generated bull/bear theses on demand.
          </p>
        </motion.header>

        {/* Toolbar */}
        <div className="mb-ds-5 flex items-center justify-between gap-ds-4 flex-wrap">
          <RangeSelector value={range} onChange={setRange} disabled={loading} />

          <div className="flex items-center gap-ds-3">
            {lastUpdated && !loading && (
              <span className="font-sans text-[11px] tabular-nums text-ink-secondary">
                Updated {formatTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchEvents(true)}
              disabled={loading || refreshing}
              aria-label="Refresh events"
              className={cn(
                'p-ds-1 rounded-sm',
                'text-ink-secondary hover:text-gold-primary',
                'transition-colors duration-base',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary',
                (loading || refreshing) && 'cursor-not-allowed opacity-50',
              )}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && <ListSkeleton />}
        {!loading && events.length === 0 && <EmptyState range={range} />}
        {!loading && events.length > 0 && (
          <motion.ul
            className="space-y-ds-3 list-none p-0 m-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {events.map((ev) => (
              <li key={ev.id}>
                <UpcomingEventCard
                  event={ev}
                  onThesisClick={() => setSelectedEvent(ev)}
                />
              </li>
            ))}
          </motion.ul>
        )}
      </div>

      {/* Thesis drawer */}
      <EventThesisDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-ds-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} variant="default" padding="default">
          <div className="flex items-start gap-ds-5">
            <div className="w-[72px] flex-shrink-0 space-y-ds-1">
              <div className="h-3 w-12 bg-surface-base rounded" />
              <div className="h-5 w-16 bg-surface-base rounded" />
            </div>
            <div className="flex-1 space-y-ds-2">
              <div className="h-3 w-24 bg-surface-base rounded" />
              <div className="h-4 w-3/4 bg-surface-base rounded" />
              <div className="h-3 w-1/2 bg-surface-base rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ range }: { range: RangeDays }) {
  return (
    <Card variant="default" padding="spacious">
      <div className="flex flex-col items-center text-center py-ds-5 gap-ds-3">
        <Calendar className="w-8 h-8 text-ink-secondary opacity-40" />
        <h3 className="font-sans text-[15px] font-medium text-ink-primary">
          No events in the next {range} days
        </h3>
        <p className="font-sans text-[13px] text-ink-secondary max-w-md">
          The next Perplexity scan runs daily at 8:45 AM ET. Try a longer range or check back tomorrow morning.
        </p>
      </div>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
