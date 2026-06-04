// ============================================================
// Commodities Calendar — Calendar & News page
// Tabs: Calendar (economic events filtered to commodity-relevant),
//       News (commodities news feed), Catalysts, Reports
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTabs,
  EmptyState,
  GlassTableSkeleton,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useNewsByCategory } from '@/hooks/useNews';
import { api } from '@/lib/apiBase';
import type { NewsItem } from '@/types/news';

// ── Types (mirrors all-markets/Calendar.tsx) ─────────────────

type Importance = 1 | 2 | 3;

interface EconomicEvent {
  id: string;
  time: string;
  date: string;
  currency: string;
  countryCode: string;
  countryFlag?: string;
  country?: string;
  importance: Importance;
  event: string;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
}

interface CalendarData {
  economic?: { count: number; events: EconomicEvent[] };
}

// ── Constants ────────────────────────────────────────────────

const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'news', label: 'News' },
  { id: 'catalysts', label: 'Catalysts' },
  { id: 'reports', label: 'Reports' },
];

/**
 * Case-insensitive keywords that mark an event as commodity-relevant.
 * Applied to the event name field.
 */
const COMMODITY_KEYWORDS = [
  'eia',
  'crude',
  'oil',
  'gas',
  'petroleum',
  'opec',
  'wasde',
  'usda',
  'grain',
  'gold',
  'inventories',
  'rig count',
  'natural gas storage',
];

// ── Helpers ──────────────────────────────────────────────────

function isCommodityEvent(eventName: string): boolean {
  const lower = eventName.toLowerCase();
  return COMMODITY_KEYWORDS.some(kw => lower.includes(kw));
}

function importanceDots(level: Importance) {
  const colors: Record<Importance, string> = {
    1: 'bg-white/30',
    2: 'bg-amber-400',
    3: 'bg-red-400',
  };
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            n <= level ? colors[level as Importance] : 'bg-white/10'
          }`}
        />
      ))}
    </span>
  );
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────

function CalendarTab() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api('/api/all-markets/calendar?tab=economic&dateFilter=thisWeek'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  if (loading) return <GlassTableSkeleton rows={6} />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Unable to load calendar"
        description={error}
      />
    );
  }

  const allEvents = data?.economic?.events ?? [];
  const commodityEvents = allEvents.filter(e => isCommodityEvent(e.event));

  if (commodityEvents.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No commodity-relevant events this week"
        description="EIA reports, WASDE, OPEC meetings, and inventory data will appear here."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {commodityEvents.map(ev => (
        <div
          key={ev.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
        >
          {/* Date/time */}
          <div className="w-20 flex-shrink-0 text-right">
            <p className="text-[11px] text-white/60 font-mono">{ev.date}</p>
            <p className="text-[11px] text-white/40 font-mono">{ev.time}</p>
          </div>

          {/* Country flag + code */}
          <div className="w-10 flex-shrink-0 text-center">
            {ev.countryFlag ? (
              <span className="text-base">{ev.countryFlag}</span>
            ) : (
              <span className="text-xs text-white/40">{ev.countryCode}</span>
            )}
          </div>

          {/* Importance */}
          <div className="w-12 flex-shrink-0">{importanceDots(ev.importance)}</div>

          {/* Event name */}
          <p className="flex-1 text-sm text-white/80 font-medium truncate">{ev.event}</p>

          {/* Forecast / Actual / Previous */}
          <div className="hidden sm:flex gap-4 flex-shrink-0 text-right">
            {ev.forecast != null && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wide">Forecast</p>
                <p className="text-xs text-white/60 font-mono">{ev.forecast}</p>
              </div>
            )}
            {ev.actual != null && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wide">Actual</p>
                <p className="text-xs text-white/90 font-mono font-semibold">{ev.actual}</p>
              </div>
            )}
            {ev.previous != null && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wide">Prev</p>
                <p className="text-xs text-white/40 font-mono">{ev.previous}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsTab() {
  const { categories, isLoading, error } = useNewsByCategory({ limit: 20 });
  const items: NewsItem[] = categories.commodities;

  if (isLoading) return <GlassTableSkeleton rows={6} />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Unable to load news"
        description={error}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="📰"
        title="No commodities news right now"
        description="Check back soon — commodity market updates will appear here."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors group"
        >
          <div className="flex items-start gap-3">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="w-14 h-10 rounded-lg object-cover flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/85 font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
                {item.headline}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-white/40">{item.source}</span>
                <span className="text-[11px] text-white/20">·</span>
                <span className="text-[11px] text-white/30">{timeAgo(item.publishedAt)}</span>
                {item.importance === 'high' && (
                  <>
                    <span className="text-[11px] text-white/20">·</span>
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium">
                      High Impact
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function CommoditiesCalendar() {
  const [tab, setTab] = useState(TABS[0].id);

  return (
    <PageTemplate
      title="Commodities Calendar"
      description="WASDE reports, EIA data, OPEC meetings, and supply events."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

        <GlassCard>
          {tab === 'calendar' && <CalendarTab />}
          {tab === 'news' && <NewsTab />}
          {tab === 'catalysts' && (
            <EmptyState
              icon="⚡"
              title="Catalysts — coming soon"
              description="Price-moving commodity catalysts, supply shocks, and geopolitical events will appear here."
            />
          )}
          {tab === 'reports' && (
            <EmptyState
              icon="🤖"
              title="AI commodity reports — coming soon"
              description="AI-generated commodity analysis and weekly outlook reports will appear here."
            />
          )}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
