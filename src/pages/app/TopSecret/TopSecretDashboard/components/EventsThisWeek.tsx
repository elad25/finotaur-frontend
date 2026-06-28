// =====================================================
// EventsThisWeek — Live Intel Rail block
// Shows up to 5 calendar events in the next 7 days.
// =====================================================

import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, TrendingUp, Rocket, Users, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { listEvents } from '@/services/upcomingEvents.api';
import type { UpcomingEvent, EventType, EventConfidence } from '@/types/upcomingEvents';

// ─── helpers ──────────────────────────────────────────────────────────────

function formatDateChip(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE MMM d');
  } catch {
    return dateStr;
  }
}

function EventTypeIcon({ type }: { type: EventType }) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (type === 'earnings') return <TrendingUp className={cls} style={{ color: '#C9A646' }} />;
  if (type === 'product_launch') return <Rocket className={cls} style={{ color: '#C9A646' }} />;
  return <Users className={cls} style={{ color: '#C9A646' }} />;
}

function ConfidenceDot({ confidence }: { confidence: EventConfidence }) {
  const color =
    confidence === 'confirmed'
      ? '#22c55e'
      : confidence === 'expected'
      ? '#C9A646'
      : 'rgba(255,255,255,0.3)';
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
      style={{ background: color }}
      title={confidence}
    />
  );
}

// ─── component ────────────────────────────────────────────────────────────

export const EventsThisWeek = memo(function EventsThisWeek() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listEvents({ days: 7, limit: 10 });
        if (!cancelled) {
          // Sort ascending by event_date
          const sorted = [...(res.events ?? [])].sort((a, b) =>
            a.event_date.localeCompare(b.event_date)
          );
          setEvents(sorted.slice(0, 5));
        }
      } catch {
        // silent fallback — empty state rendered below
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 shrink-0" style={{ color: '#C9A646' }} />
        <span className="text-sm font-semibold text-white">Events This Week</span>
      </div>

      {/* Body */}
      {loading ? (
        <p className="text-xs text-gray-500 py-2">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">No major events flagged this week.</p>
      ) : (
        <div className="space-y-2.5">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2">
              {/* Date chip */}
              <span
                className="text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0 tabular-nums"
                style={{
                  background: 'rgba(201,166,70,0.10)',
                  color: '#C9A646',
                  minWidth: 72,
                }}
              >
                {formatDateChip(ev.event_date)}
              </span>

              {/* Type icon */}
              <EventTypeIcon type={ev.event_type} />

              {/* Title */}
              <span
                className="flex-1 text-xs text-gray-200 truncate leading-snug"
                title={ev.title}
              >
                {ev.title}
              </span>

              {/* Right side: ticker + confidence dot */}
              <div className="flex items-center gap-1.5 shrink-0">
                {ev.primary_ticker && (
                  <span
                    className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {ev.primary_ticker}
                  </span>
                )}
                <ConfidenceDot confidence={ev.confidence} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <button
        onClick={() => navigate('/app/ai/upcoming-events')}
        className="mt-4 flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
        style={{ color: '#C9A646' }}
      >
        View all events
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
});
