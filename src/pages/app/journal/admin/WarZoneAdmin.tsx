// =====================================================
// WAR ZONE ADMIN DASHBOARD
// =====================================================
// Path: src/pages/app/journal/admin/WarZoneAdmin.tsx
//
// Operator tool for tracking every ticker mentioned in
// WAR ZONE reports — why it was mentioned and how it
// performed over same-day / 30/60/90 days.
//
// Auth: Supabase session JWT → requireAdminWarzone middleware
// Data: Three backend endpoints under /api/warzone/admin/mentions
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MentionType =
  | 'analyst_rating'
  | 'significant_catalyst'
  | 'insider_buy'
  | 'earnings'
  | 'institutional_13f'
  | 'tactical_macro';

interface WarzoneMention {
  id: string;
  ticker: string;
  mentioned_at: string;
  mention_type: MentionType;
  firm_source: string | null;
  reason: string;
  price_at_mention: number | null;
  return_30d: number | null;
  return_60d: number | null;
  return_90d: number | null;
  alpha_90d_pct: number | null;
  // Task 1: same-day impact derived from metadata.move_pct
  immediate_impact_pct: number | null;
  metadata: Record<string, unknown> | null;
}

interface MentionAggregates {
  total_mentions: number;
  active_tickers: number;
  avg_return_30d: number | null;
  win_rate_30d: number | null;
  best_mention_type: string | null;
  best_mention_type_avg: number | null;
  worst_mention_type: string | null;
  worst_mention_type_avg: number | null;
  heatmap: HeatmapCell[];
  // Task 6: same-day aggregate fields
  avg_immediate_impact_pct: number | null;
  same_day_hit_rate: number | null;
  strongest_move: { ticker: string; impact_pct: number } | null;
}

// Task 3: extended to 4 timeframes
interface HeatmapCell {
  mention_type: MentionType;
  timeframe: 'same_day' | '30d' | '60d' | '90d';
  avg_return: number | null;
  count: number;
  median_return: number | null;
  win_rate: number | null;
}

interface TickerDrilldown {
  ticker: string;
  company_name: string | null;
  total_mentions: number;
  first_mention: string | null;
  last_mention: string | null;
  avg_return_30d: number | null;
  avg_return_90d: number | null;
  best_single_mention_30d: number | null;
  worst_single_mention_30d: number | null;
  mentions: WarzoneMention[];
}

interface PaginatedMentions {
  data: WarzoneMention[];
  total: number;
  offset: number;
  limit: number;
}

type SortBy = 'mentioned_at' | 'return_30d_desc' | 'return_30d_asc' | 'alpha_90d_desc' | 'win_loss';

// ---------------------------------------------------------------------------
// Auth helper — copies NewsletterSub pattern (supabase.auth.getSession)
// ---------------------------------------------------------------------------
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPct(val: number | null): string {
  if (val === null || val === undefined) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function formatPrice(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return `$${val.toFixed(2)}`;
}

// FINOTAUR color rule: positive = white, negative = text-num-negative
function pctColorClass(val: number | null): string {
  if (val === null) return 'text-ink-tertiary';
  return val < 0 ? 'text-num-negative' : 'text-ink-primary';
}

function ytdFromDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Heatmap cell background — purely intensity-based using design-system-safe rgba
function heatmapCellStyle(avgReturn: number | null): React.CSSProperties {
  if (avgReturn === null) return { background: 'rgba(255,255,255,0.04)' };
  const abs = Math.min(Math.abs(avgReturn), 30); // cap at 30% for scale
  const intensity = abs / 30; // 0-1
  if (avgReturn >= 0) {
    // White tint (design system has no green — white intensity on dark bg)
    return {
      background: `rgba(255, 255, 255, ${0.04 + intensity * 0.16})`,
    };
  } else {
    // num-negative tint
    return {
      background: `rgba(226, 75, 74, ${0.08 + intensity * 0.20})`,
    };
  }
}

// ---------------------------------------------------------------------------
// Task 1: extract immediate_impact_pct from raw API row metadata
// ---------------------------------------------------------------------------
function extractImmediateImpact(metadata: Record<string, unknown> | null): number | null {
  if (!metadata) return null;
  const movePct = (metadata as { move_pct?: unknown }).move_pct;
  if (typeof movePct === 'number') return movePct;
  if (typeof movePct === 'string') {
    const parsed = parseFloat(movePct);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mention type display config
// ---------------------------------------------------------------------------
const MENTION_TYPE_CONFIG: Record<
  MentionType,
  { label: string; badgeClass: string }
> = {
  analyst_rating: {
    label: 'Analyst Rating',
    badgeClass:
      'bg-status-info/15 text-status-info border border-status-info/25',
  },
  significant_catalyst: {
    label: 'Significant Catalyst',
    badgeClass: 'bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25',
  },
  insider_buy: {
    label: 'Insider Buy',
    badgeClass: 'bg-gold-primary/15 text-gold-primary border border-gold-border',
  },
  earnings: {
    label: 'Earnings',
    badgeClass: 'bg-[#0d9488]/15 text-[#2dd4bf] border border-[#0d9488]/25',
  },
  institutional_13f: {
    label: 'Institutional 13F',
    badgeClass: 'bg-[#4338ca]/15 text-[#818cf8] border border-[#4338ca]/25',
  },
  tactical_macro: {
    label: 'Tactical Macro',
    badgeClass: 'bg-ink-muted/10 text-ink-tertiary border border-border-ds-subtle',
  },
};

const HEATMAP_TYPES: { type: MentionType; label: string }[] = [
  { type: 'analyst_rating', label: 'Analyst Rating' },
  { type: 'significant_catalyst', label: 'Catalyst' },
  { type: 'insider_buy', label: 'Insider Buy' },
  { type: 'earnings', label: 'Earnings' },
  { type: 'institutional_13f', label: 'Institutional 13F' },
  { type: 'tactical_macro', label: 'Tactical Macro' },
];

// Task 3: heatmap timeframes extended to 4
const HEATMAP_TIMEFRAMES: { tf: HeatmapCell['timeframe']; label: string }[] = [
  { tf: 'same_day', label: 'Same-Day' },
  { tf: '30d', label: '+30d' },
  { tf: '60d', label: '+60d' },
  { tf: '90d', label: '+90d' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Mention type badge
const MentionBadge: React.FC<{ type: MentionType }> = ({ type }) => {
  const config = MENTION_TYPE_CONFIG[type] ?? {
    label: type,
    badgeClass: 'bg-ink-muted/10 text-ink-tertiary border border-border-ds-subtle',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${config.badgeClass}`}
      style={{ borderRadius: '4px' }}
    >
      {config.label}
    </span>
  );
};

// Skeleton row for table loading state — 11 cols now (added Same-Day Impact)
const SkeletonRow: React.FC = () => (
  <tr className="border-b border-border-ds-subtle">
    {Array.from({ length: 11 }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div className="h-4 bg-surface-2 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
      </td>
    ))}
  </tr>
);

// Stat card
const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  loading?: boolean;
}> = ({ label, value, icon: Icon, loading }) => (
  <Card padding="compact">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="font-sans text-eyebrow text-gold-muted uppercase tracking-[1.5px] block mb-2">
          {label}
        </span>
        {loading ? (
          <div className="h-8 w-24 bg-surface-2 rounded animate-pulse" />
        ) : (
          <div className="text-num-large font-mono text-ink-primary font-medium leading-none">
            {value}
          </div>
        )}
      </div>
      {Icon && (
        <div className="p-2 rounded-lg bg-surface-2 flex-shrink-0">
          <Icon className="w-4 h-4 text-gold-primary" />
        </div>
      )}
    </div>
  </Card>
);

// Heatmap tooltip state type
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cell: HeatmapCell | null;
}

// ---------------------------------------------------------------------------
// Drilldown modal
// ---------------------------------------------------------------------------
const DrilldownModal: React.FC<{
  ticker: string;
  onClose: () => void;
  authHeaders: HeadersInit;
}> = ({ ticker, onClose, authHeaders }) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const { data, isLoading, isError } = useQuery<TickerDrilldown>({
    queryKey: ['warzone-drilldown', ticker],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/warzone/admin/mentions/ticker/${encodeURIComponent(ticker)}`,
        { headers: authHeaders },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  // Task 7: compute avg same-day impact from ticker's mentions
  const avgSameDayImpact: number | null = (() => {
    if (!data?.mentions?.length) return null;
    const vals = data.mentions
      .map((m) => extractImmediateImpact(m.metadata))
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-base/90 backdrop-blur-glass"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="relative flex flex-col w-[95vw] max-w-4xl max-h-[88vh] rounded-xl bg-[#080810] border border-border-ds-subtle shadow-lg overflow-hidden"
        style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-ds-subtle bg-surface-1 flex-shrink-0">
          <div>
            <h2 className="text-h4 font-semibold text-ink-primary">{ticker}</h2>
            {data?.company_name && (
              <p className="text-small text-ink-secondary mt-0.5">{data.company_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors duration-base text-ink-tertiary hover:text-ink-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-ink-tertiary gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-gold-primary" />
              <span className="text-small">Loading ticker data...</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 p-4 bg-status-error/10 border border-status-error/25 rounded-lg text-status-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-small">Failed to load drilldown data.</span>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* Summary stats row — Task 7: added Avg Same-Day Impact */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatTile label="Total Mentions" value={data.total_mentions} />
                {/* Task 7: same-day impact per ticker */}
                <StatTile
                  label="Avg Same-Day"
                  value={
                    <span className={pctColorClass(avgSameDayImpact)}>
                      {formatPct(avgSameDayImpact)}
                    </span>
                  }
                />
                <StatTile
                  label="Avg Return 30d"
                  value={
                    <span className={pctColorClass(data.avg_return_30d)}>
                      {formatPct(data.avg_return_30d)}
                    </span>
                  }
                />
                <StatTile
                  label="Best Single 30d"
                  value={
                    <span className={pctColorClass(data.best_single_mention_30d)}>
                      {formatPct(data.best_single_mention_30d)}
                    </span>
                  }
                />
                <StatTile
                  label="Worst Single 30d"
                  value={
                    <span className={pctColorClass(data.worst_single_mention_30d)}>
                      {formatPct(data.worst_single_mention_30d)}
                    </span>
                  }
                />
              </div>

              {/* First / last mention metadata */}
              {(data.first_mention || data.last_mention) && (
                <div className="flex gap-4 text-small text-ink-tertiary">
                  {data.first_mention && (
                    <span>First mention: <span className="text-ink-secondary">{formatDate(data.first_mention)}</span></span>
                  )}
                  {data.last_mention && (
                    <span>Last mention: <span className="text-ink-secondary">{formatDate(data.last_mention)}</span></span>
                  )}
                </div>
              )}

              {/* Historical mentions list */}
              <div>
                <p className="text-small font-medium text-ink-secondary uppercase tracking-[1.5px] mb-3">
                  All Mentions
                </p>
                <div className="space-y-3">
                  {data.mentions.map((m) => {
                    const immediatePct = extractImmediateImpact(m.metadata);
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-lg bg-surface-1 border border-border-ds-subtle"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-small text-ink-tertiary">{formatDate(m.mentioned_at)}</span>
                            <MentionBadge type={m.mention_type} />
                            {m.firm_source && (
                              <span className="text-small text-ink-tertiary">{m.firm_source}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 font-mono text-small">
                            {m.price_at_mention !== null && (
                              <span className="text-ink-tertiary">{formatPrice(m.price_at_mention)}</span>
                            )}
                            {/* Task 7: same-day in drilldown row */}
                            {immediatePct !== null && (
                              <span className={pctColorClass(immediatePct)}>0d {formatPct(immediatePct)}</span>
                            )}
                            <span className={pctColorClass(m.return_30d)}>30d {formatPct(m.return_30d)}</span>
                            <span className={pctColorClass(m.return_60d)}>60d {formatPct(m.return_60d)}</span>
                            <span className={pctColorClass(m.return_90d)}>90d {formatPct(m.return_90d)}</span>
                          </div>
                        </div>
                        <p className="mt-2 text-small text-ink-secondary leading-relaxed">{m.reason}</p>
                      </div>
                    );
                  })}

                  {data.mentions.length === 0 && (
                    <p className="text-small text-ink-tertiary py-4 text-center">No mention records found.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Task 6: client-side aggregates computation from raw mentions data
// ---------------------------------------------------------------------------
function computeClientAggregates(
  serverAggregates: MentionAggregates | undefined,
  allMentions: WarzoneMention[],
  todayStr: string,
): MentionAggregates | undefined {
  if (!serverAggregates) return undefined;

  const withImpact = allMentions
    .map((m) => ({
      ...m,
      immediate_impact_pct: extractImmediateImpact(m.metadata),
    }))
    .filter((m) => m.immediate_impact_pct !== null && m.mentioned_at.startsWith(todayStr));

  if (!withImpact.length) {
    return {
      ...serverAggregates,
      avg_immediate_impact_pct: null,
      same_day_hit_rate: null,
      strongest_move: null,
    };
  }

  const impacts = withImpact.map((m) => m.immediate_impact_pct as number);
  const avg_immediate_impact_pct = impacts.reduce((a, b) => a + b, 0) / impacts.length;
  const positiveCount = impacts.filter((v) => v > 0).length;
  const same_day_hit_rate = (positiveCount / impacts.length) * 100;

  const strongestRow = withImpact.reduce((best, cur) => {
    const curAbs = Math.abs(cur.immediate_impact_pct as number);
    const bestAbs = Math.abs(best.immediate_impact_pct as number);
    return curAbs > bestAbs ? cur : best;
  });

  const strongest_move = {
    ticker: strongestRow.ticker,
    impact_pct: strongestRow.immediate_impact_pct as number,
  };

  // Also compute client-side heatmap same_day cells
  const sameDayCells: HeatmapCell[] = HEATMAP_TYPES.map(({ type }) => {
    const typeRows = allMentions
      .filter((m) => m.mention_type === type)
      .map((m) => extractImmediateImpact(m.metadata))
      .filter((v): v is number => v !== null);

    if (!typeRows.length) {
      return {
        mention_type: type,
        timeframe: 'same_day' as const,
        avg_return: null,
        count: 0,
        median_return: null,
        win_rate: null,
      };
    }

    const sorted = [...typeRows].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median_return =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    const avg_return = typeRows.reduce((a, b) => a + b, 0) / typeRows.length;
    const win_rate = (typeRows.filter((v) => v > 0).length / typeRows.length) * 100;

    return {
      mention_type: type,
      timeframe: 'same_day' as const,
      avg_return,
      count: typeRows.length,
      median_return,
      win_rate,
    };
  });

  // Merge same_day cells with existing heatmap (server returns 30d/60d/90d)
  const existingCells = (serverAggregates.heatmap ?? []).filter(
    (c) => c.timeframe !== 'same_day',
  );

  // Determine best_mention_type: prefer 30d if available, fallback to same_day
  let best_mention_type = serverAggregates.best_mention_type;
  let best_mention_type_avg = serverAggregates.best_mention_type_avg;
  let worst_mention_type = serverAggregates.worst_mention_type;
  let worst_mention_type_avg = serverAggregates.worst_mention_type_avg;

  if (!best_mention_type && sameDayCells.some((c) => c.count > 0)) {
    const withData = sameDayCells.filter((c) => c.count > 0 && c.avg_return !== null);
    if (withData.length) {
      const bestCell = withData.reduce((a, b) =>
        (a.avg_return ?? -Infinity) > (b.avg_return ?? -Infinity) ? a : b,
      );
      const worstCell = withData.reduce((a, b) =>
        (a.avg_return ?? Infinity) < (b.avg_return ?? Infinity) ? a : b,
      );
      best_mention_type = bestCell.mention_type;
      best_mention_type_avg = bestCell.avg_return;
      worst_mention_type = worstCell.mention_type;
      worst_mention_type_avg = worstCell.avg_return;
    }
  }

  return {
    ...serverAggregates,
    best_mention_type,
    best_mention_type_avg,
    worst_mention_type,
    worst_mention_type_avg,
    avg_immediate_impact_pct,
    same_day_hit_rate,
    strongest_move,
    heatmap: [...sameDayCells, ...existingCells],
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const WarZoneAdmin: React.FC = () => {
  // Date range (default: YTD)
  const [dateFrom, setDateFrom] = useState<string>(ytdFromDate());
  const [dateTo, setDateTo] = useState<string>(todayDate());

  // Filters
  const [mentionTypeFilter, setMentionTypeFilter] = useState<string>('all');
  const [tickerSearch, setTickerSearch] = useState<string>('');
  const [debouncedTicker, setDebouncedTicker] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('mentioned_at');
  const [pageSize, setPageSize] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Drilldown modal
  const [drilldownTicker, setDrilldownTicker] = useState<string | null>(null);

  // Heatmap tooltip
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cell: null });

  // Auth headers — fetched once and cached in ref (re-fetched on expiry isn't needed for admin)
  const authHeadersRef = useRef<HeadersInit>({});
  useEffect(() => {
    getAuthHeaders().then((h) => { authHeadersRef.current = h; });
  }, []);

  const queryClient = useQueryClient();
  const today = todayDate();

  // Debounce ticker search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTicker(tickerSearch), 300);
    return () => clearTimeout(t);
  }, [tickerSearch]);

  // Reset offset when filters change
  useEffect(() => { setOffset(0); }, [dateFrom, dateTo, mentionTypeFilter, debouncedTicker, sortBy, pageSize]);

  // Auto-refresh: invalidate queries every 60s when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['warzone-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['warzone-aggregates'] });
    }, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  // Build sort params
  const sortParamMap: Record<SortBy, { sortBy: string; sortDir: string }> = {
    mentioned_at: { sortBy: 'mentioned_at', sortDir: 'desc' },
    return_30d_desc: { sortBy: 'return_30d', sortDir: 'desc' },
    return_30d_asc: { sortBy: 'return_30d', sortDir: 'asc' },
    alpha_90d_desc: { sortBy: 'alpha_90d_pct', sortDir: 'desc' },
    win_loss: { sortBy: 'return_30d', sortDir: 'desc' },
  };

  // Query: paginated mentions list — Task 1: metadata included in API response
  const mentionsQueryKey = [
    'warzone-mentions',
    dateFrom, dateTo, mentionTypeFilter, debouncedTicker, sortBy, pageSize, offset,
  ];

  const {
    data: mentionsData,
    isLoading: mentionsLoading,
    isError: mentionsError,
    refetch: refetchMentions,
  } = useQuery<PaginatedMentions>({
    queryKey: mentionsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        limit: String(pageSize),
        offset: String(offset),
        ...sortParamMap[sortBy],
      });
      if (mentionTypeFilter !== 'all') params.set('type', mentionTypeFilter);
      if (debouncedTicker) params.set('ticker', debouncedTicker.toUpperCase());

      const res = await fetch(
        `${API_BASE}/api/warzone/admin/mentions?${params.toString()}`,
        { headers: authHeadersRef.current },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as PaginatedMentions;
      // Task 1: map metadata → immediate_impact_pct on each row
      return {
        ...json,
        data: json.data.map((row) => ({
          ...row,
          immediate_impact_pct: extractImmediateImpact(
            (row.metadata as Record<string, unknown> | null) ?? null,
          ),
        })),
      };
    },
    staleTime: 60_000,
  });

  // Query: aggregates — Task 6: metadata fetched server-side, client enriches
  const {
    data: serverAggregates,
    isLoading: aggregatesLoading,
  } = useQuery<MentionAggregates>({
    queryKey: ['warzone-aggregates', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(
        `${API_BASE}/api/warzone/admin/mentions/aggregates?${params.toString()}`,
        { headers: authHeadersRef.current },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const mentions = mentionsData?.data ?? [];
  const totalMentions = mentionsData?.total ?? 0;
  const totalPages = Math.ceil(totalMentions / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  // Task 6: enrich aggregates with client-side same-day computation
  const aggregates = computeClientAggregates(serverAggregates, mentions, today);

  // Heatmap cell lookup helper — Task 3: now handles 4 timeframes
  const getHeatmapCell = useCallback(
    (type: MentionType, timeframe: HeatmapCell['timeframe']): HeatmapCell | null => {
      return aggregates?.heatmap?.find(
        (c) => c.mention_type === type && c.timeframe === timeframe,
      ) ?? null;
    },
    [aggregates],
  );

  const resetToYTD = () => {
    setDateFrom(ytdFromDate());
    setDateTo(todayDate());
  };

  const resetFilters = () => {
    setMentionTypeFilter('all');
    setTickerSearch('');
    setDebouncedTicker('');
    setSortBy('mentioned_at');
  };

  // Task 5: filter today's tracked catalysts for the callout panel
  const todayCatalysts = mentions
    .filter(
      (m) =>
        m.immediate_impact_pct !== null &&
        m.mentioned_at.startsWith(today),
    )
    .sort((a, b) => Math.abs(b.immediate_impact_pct!) - Math.abs(a.immediate_impact_pct!))
    .slice(0, 6);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-surface-base p-6 space-y-6">
      {/* Drilldown modal */}
      {drilldownTicker && (
        <DrilldownModal
          ticker={drilldownTicker}
          onClose={() => setDrilldownTicker(null)}
          authHeaders={authHeadersRef.current}
        />
      )}

      {/* Heatmap tooltip */}
      {tooltip.visible && tooltip.cell && (
        <div
          className="fixed z-40 pointer-events-none bg-[#0d0d1a] border border-border-ds-default rounded-lg p-3 text-small shadow-lg"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12, minWidth: 160 }}
        >
          <p className="text-ink-primary font-semibold mb-1">
            {MENTION_TYPE_CONFIG[tooltip.cell.mention_type]?.label ?? tooltip.cell.mention_type}
            {' / '}{tooltip.cell.timeframe === 'same_day' ? 'Same-Day' : tooltip.cell.timeframe}
          </p>
          {tooltip.cell.count === 0 ? (
            <p className="text-ink-tertiary">No data yet</p>
          ) : (
            <>
              <p className="text-ink-secondary">
                Avg return:{' '}
                <span className={`font-mono ${pctColorClass(tooltip.cell.avg_return)}`}>
                  {formatPct(tooltip.cell.avg_return)}
                </span>
              </p>
              {tooltip.cell.median_return !== null && (
                <p className="text-ink-secondary">
                  Median:{' '}
                  <span className={`font-mono ${pctColorClass(tooltip.cell.median_return)}`}>
                    {formatPct(tooltip.cell.median_return)}
                  </span>
                </p>
              )}
              {tooltip.cell.win_rate !== null && (
                <p className="text-ink-secondary">
                  Win rate:{' '}
                  <span className="font-mono text-ink-primary">{tooltip.cell.win_rate.toFixed(1)}%</span>
                </p>
              )}
              <p className="text-ink-tertiary mt-1">{tooltip.cell.count} mention{tooltip.cell.count !== 1 ? 's' : ''}</p>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-gold-primary">
            WAR ZONE — Ticker Tracking
          </h1>
          <p className="text-small text-ink-tertiary mt-1">
            Every ticker mentioned, every reason, same-day impact + performance at 30/60/90 days
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
              aria-label="From date"
            />
            <span className="text-ink-tertiary text-small">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
              aria-label="To date"
            />
            <button
              onClick={resetToYTD}
              className="px-3 py-2 rounded-lg border border-border-ds-default text-small text-ink-tertiary hover:text-gold-primary hover:border-gold-primary transition-colors duration-base"
            >
              YTD
            </button>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-small transition-colors duration-base ${
              autoRefresh
                ? 'border-gold-primary text-gold-primary bg-gold-primary/10'
                : 'border-border-ds-default text-ink-tertiary hover:border-border-ds-default'
            }`}
            title={autoRefresh ? 'Auto-refresh ON — click to disable' : 'Enable auto-refresh (60s)'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {autoRefresh ? 'Live' : 'Auto-refresh'}
          </button>

          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['warzone-mentions'] });
              queryClient.invalidateQueries({ queryKey: ['warzone-aggregates'] });
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Catalyst Tracking callout (Task 5)                      */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="default">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#7c3aed]/15 flex-shrink-0">
            <Zap className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div>
            <p className="text-small font-semibold text-ink-primary">
              Catalyst Tracking — Today
            </p>
            <p className="text-small text-ink-tertiary mt-0.5">
              What WAR ZONE flagged this morning, and how the market responded by close.
            </p>
          </div>
        </div>

        {mentionsLoading ? (
          <div className="h-20 flex items-center justify-center text-ink-tertiary gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-primary" />
            <span className="text-small">Loading catalyst data...</span>
          </div>
        ) : todayCatalysts.length === 0 ? (
          <p className="text-small text-ink-tertiary py-2">No tracked catalysts yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-small border-collapse">
              <thead>
                <tr className="border-b border-border-ds-subtle/50">
                  <th className="text-left pb-2 pr-4 text-ink-tertiary font-medium uppercase tracking-[0.5px] whitespace-nowrap">Ticker</th>
                  <th className="text-left pb-2 pr-4 text-ink-tertiary font-medium uppercase tracking-[0.5px]">Catalyst</th>
                  <th className="text-left pb-2 pr-4 text-ink-tertiary font-medium uppercase tracking-[0.5px] whitespace-nowrap">Same-Day Move</th>
                  <th className="text-left pb-2 text-ink-tertiary font-medium uppercase tracking-[0.5px]">Type</th>
                </tr>
              </thead>
              <tbody>
                {todayCatalysts.map((m) => (
                  <tr key={m.id} className="border-b border-border-ds-subtle/30">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button
                        onClick={() => setDrilldownTicker(m.ticker)}
                        className="font-mono font-semibold text-gold-primary hover:text-gold-hover transition-colors duration-fast underline-offset-2 hover:underline"
                      >
                        {m.ticker}
                      </button>
                    </td>
                    <td className="py-2 pr-4 max-w-[320px]">
                      <span
                        className="text-ink-secondary line-clamp-1 cursor-help"
                        title={m.reason}
                      >
                        {m.reason.length > 60 ? m.reason.slice(0, 60) + '…' : m.reason}
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={`font-mono font-semibold ${pctColorClass(m.immediate_impact_pct)}`}>
                        {formatPct(m.immediate_impact_pct)}
                      </span>
                    </td>
                    <td className="py-2">
                      <MentionBadge type={m.mention_type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[11px] text-ink-muted leading-relaxed">
          Tracking continues — return columns (+30d / +60d / +90d) populate automatically as time passes via the daily price follow-up cron.
        </p>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Stats grid (Task 2)                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile
          label="Total Mentions"
          value={aggregates?.total_mentions?.toLocaleString() ?? '—'}
          icon={BarChart3}
          loading={aggregatesLoading}
        />
        <StatTile
          label="Active Tickers"
          value={aggregates?.active_tickers?.toLocaleString() ?? '—'}
          icon={Target}
          loading={aggregatesLoading}
        />
        {/* Task 2: Avg Same-Day Impact */}
        <StatTile
          label="Avg Same-Day Impact"
          value={
            <span className={pctColorClass(aggregates?.avg_immediate_impact_pct ?? null)}>
              {formatPct(aggregates?.avg_immediate_impact_pct ?? null)}
            </span>
          }
          icon={Zap}
          loading={aggregatesLoading}
        />
        {/* Task 2: Same-Day Hit Rate */}
        <StatTile
          label="Same-Day Hit Rate"
          value={
            aggregates?.same_day_hit_rate !== null && aggregates?.same_day_hit_rate !== undefined
              ? `${aggregates.same_day_hit_rate.toFixed(1)}%`
              : '—'
          }
          icon={Activity}
          loading={aggregatesLoading}
        />
        {/* Task 2: Strongest Single Move */}
        <StatTile
          label="Strongest Move"
          value={
            aggregates?.strongest_move ? (
              <span className="text-num-small font-sans leading-snug">
                <span className="font-mono font-semibold text-gold-primary">
                  {aggregates.strongest_move.ticker}
                </span>
                <span className={`block font-mono ${pctColorClass(aggregates.strongest_move.impact_pct)}`}>
                  {formatPct(aggregates.strongest_move.impact_pct)}
                </span>
              </span>
            ) : '—'
          }
          icon={TrendingUp}
          loading={aggregatesLoading}
        />
        {/* Task 2: Avg Return 30d (was tile 3) — kept as reference */}
        <StatTile
          label="Avg Return 30d"
          value={
            <span className={pctColorClass(aggregates?.avg_return_30d ?? null)}>
              {formatPct(aggregates?.avg_return_30d ?? null)}
            </span>
          }
          loading={aggregatesLoading}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — Heatmap (type × timeframe) — Task 3: 4 columns         */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="default">
        <div className="mb-4">
          <span className="font-sans text-eyebrow text-gold-muted uppercase tracking-[1.5px]">
            Performance Heatmap
          </span>
          <p className="text-small text-ink-tertiary mt-1">
            Average return by mention type and timeframe. Hover for detail.
          </p>
        </div>

        {aggregatesLoading ? (
          <div className="h-40 flex items-center justify-center text-ink-tertiary gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-primary" />
            <span className="text-small">Loading heatmap...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-small border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-3 pr-4 text-ink-tertiary font-medium text-small min-w-[140px]">
                    Mention Type
                  </th>
                  {HEATMAP_TIMEFRAMES.map(({ tf, label }) => (
                    <th
                      key={tf}
                      className={`text-center pb-3 px-3 font-medium w-28 ${
                        tf === 'same_day'
                          ? 'text-[#a78bfa]'
                          : 'text-ink-secondary'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEATMAP_TYPES.map(({ type, label }) => (
                  <tr key={type} className="border-t border-border-ds-subtle/50">
                    <td className="py-2 pr-4 text-ink-secondary">{label}</td>
                    {HEATMAP_TIMEFRAMES.map(({ tf }) => {
                      const cell = getHeatmapCell(type, tf);
                      const avgRet = cell?.avg_return ?? null;
                      const isEmpty = !cell || cell.count === 0;
                      return (
                        <td
                          key={tf}
                          className="py-2 px-3 text-center rounded cursor-default select-none transition-opacity duration-fast"
                          style={isEmpty ? { background: 'rgba(255,255,255,0.03)' } : heatmapCellStyle(avgRet)}
                          onMouseEnter={(e) => {
                            if (!cell) return;
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              visible: true,
                              x: rect.right + window.scrollX,
                              y: rect.top + window.scrollY,
                              cell,
                            });
                          }}
                          onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                        >
                          {isEmpty ? (
                            <span className="text-ink-muted text-[11px]">—</span>
                          ) : (
                            <span
                              className={`font-mono font-medium ${pctColorClass(avgRet)}`}
                            >
                              {formatPct(avgRet)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 5 — Filter bar                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mention type */}
        <select
          value={mentionTypeFilter}
          onChange={(e) => setMentionTypeFilter(e.target.value)}
          className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
        >
          <option value="all">All Types</option>
          <option value="analyst_rating">Analyst Rating</option>
          <option value="significant_catalyst">Catalyst</option>
          <option value="insider_buy">Insider Buy</option>
          <option value="earnings">Earnings</option>
          <option value="institutional_13f">13F</option>
          <option value="tactical_macro">Tactical Macro</option>
        </select>

        {/* Ticker search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search ticker..."
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value.toUpperCase())}
            className="bg-surface-1 border border-border-ds-default rounded-lg pl-9 pr-3 py-2 text-small text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-gold-primary transition-colors duration-base w-36"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
        >
          <option value="mentioned_at">Report Date (newest)</option>
          <option value="return_30d_desc">30d Return (desc)</option>
          <option value="return_30d_asc">30d Return (asc)</option>
          <option value="alpha_90d_desc">90d Alpha (desc)</option>
          <option value="win_loss">Win/Loss</option>
        </select>

        {/* Page size */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
        >
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={200}>200 / page</option>
        </select>

        {/* Clear filters */}
        {(mentionTypeFilter !== 'all' || tickerSearch || sortBy !== 'mentioned_at') && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-small text-ink-tertiary hover:text-gold-primary transition-colors duration-base"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 6 — Main table (Task 4: Same-Day Impact column added)       */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="compact">
        {mentionsError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-status-error">
            <AlertCircle className="w-8 h-8" />
            <p className="text-small">Failed to load mentions. Check admin auth or backend status.</p>
            <Button variant="goldOutline" size="compact" showArrow={false} onClick={() => refetchMentions()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-small border-collapse">
                <thead>
                  <tr className="border-b border-border-ds-default">
                    {[
                      'Ticker', 'Date', 'Type', 'Firm / Source', 'Reason',
                      'Price @', 'Same-Day Impact', '+30d', '+60d', '+90d', 'vs SPY 90d',
                    ].map((col) => (
                      <th
                        key={col}
                        className={`text-left px-3 py-3 font-medium text-small uppercase tracking-[0.5px] whitespace-nowrap ${
                          col === 'Same-Day Impact'
                            ? 'text-[#a78bfa]'
                            : 'text-ink-tertiary'
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mentionsLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : mentions.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-border-ds-subtle/60 hover:bg-surface-2/50 transition-colors duration-fast"
                        >
                          {/* Ticker — clickable */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <button
                              onClick={() => setDrilldownTicker(m.ticker)}
                              className="font-mono font-semibold text-gold-primary hover:text-gold-hover transition-colors duration-fast underline-offset-2 hover:underline"
                            >
                              {m.ticker}
                            </button>
                          </td>

                          {/* Date */}
                          <td className="px-3 py-3 whitespace-nowrap text-ink-tertiary">
                            {formatDate(m.mentioned_at)}
                          </td>

                          {/* Type badge */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <MentionBadge type={m.mention_type} />
                          </td>

                          {/* Firm/source */}
                          <td className="px-3 py-3 text-ink-secondary max-w-[120px] truncate" title={m.firm_source ?? undefined}>
                            {m.firm_source ?? <span className="text-ink-muted">—</span>}
                          </td>

                          {/* Reason — truncated */}
                          <td className="px-3 py-3 max-w-[220px]">
                            <span
                              className="text-ink-secondary line-clamp-2 leading-snug cursor-help"
                              title={m.reason}
                            >
                              {m.reason}
                            </span>
                          </td>

                          {/* Price @ mention */}
                          <td className="px-3 py-3 font-mono text-ink-secondary whitespace-nowrap">
                            {formatPrice(m.price_at_mention)}
                          </td>

                          {/* Task 4: Same-Day Impact */}
                          <td className={`px-3 py-3 font-mono whitespace-nowrap font-semibold ${pctColorClass(m.immediate_impact_pct)}`}>
                            {formatPct(m.immediate_impact_pct)}
                          </td>

                          {/* +30d */}
                          <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(m.return_30d)}`}>
                            {formatPct(m.return_30d)}
                          </td>

                          {/* +60d */}
                          <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(m.return_60d)}`}>
                            {formatPct(m.return_60d)}
                          </td>

                          {/* +90d */}
                          <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(m.return_90d)}`}>
                            {formatPct(m.return_90d)}
                          </td>

                          {/* vs SPY 90d */}
                          <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(m.alpha_90d_pct)}`}>
                            {formatPct(m.alpha_90d_pct)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {!mentionsLoading && mentions.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-ink-tertiary">
                <Search className="w-8 h-8 text-ink-muted" />
                <p className="text-small">No mentions match the current filters.</p>
                <button
                  onClick={resetFilters}
                  className="text-small text-gold-primary hover:text-gold-hover transition-colors duration-fast"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalMentions > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border-ds-subtle mt-4">
                <span className="text-small text-ink-tertiary">
                  Showing{' '}
                  <span className="text-ink-secondary">{offset + 1}–{Math.min(offset + pageSize, totalMentions)}</span>
                  {' '}of{' '}
                  <span className="text-ink-secondary">{totalMentions.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - pageSize))}
                    disabled={offset === 0}
                    className="p-2 rounded-lg border border-border-ds-default text-ink-tertiary hover:text-ink-primary hover:border-border-ds-strong disabled:opacity-30 disabled:pointer-events-none transition-colors duration-fast"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-small text-ink-secondary px-2">
                    {currentPage} / {Math.max(1, totalPages)}
                  </span>
                  <button
                    onClick={() => setOffset(offset + pageSize)}
                    disabled={offset + pageSize >= totalMentions}
                    className="p-2 rounded-lg border border-border-ds-default text-ink-tertiary hover:text-ink-primary hover:border-border-ds-strong disabled:opacity-30 disabled:pointer-events-none transition-colors duration-fast"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default WarZoneAdmin;
