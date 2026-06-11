// =====================================================
// WAR ZONE ADMIN DASHBOARD
// =====================================================
// Path: src/pages/app/journal/admin/WarZoneAdmin.tsx
//
// Operator tool for tracking every ticker mentioned in
// WAR ZONE reports — why it was mentioned and how it
// performed over same-day / 30/60/90 days.
//
// Auth: Supabase session JWT — RLS policy allows admin reads
// Data: Direct Supabase PostgREST queries on public.warzone_ticker_mentions
//
// v2.0 (2026-05-28): direct Supabase queries via PostgREST + RLS
//   — was /api/warzone/admin/* routes (404 after parallel Railway
//     deploy overwrote our backend).
// v2.1 (2026-05-28): same-day catalyst impact tracking (Tasks 1-7)
//   — metadata.move_pct → immediate_impact_pct
//   — 4-column heatmap (same_day / 30d / 60d / 90d)
//   — Catalyst Tracking callout panel
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
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
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { SkeletonTable } from "@/components/ds/Skeleton";
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';

// No API_BASE needed — all queries go directly to Supabase via PostgREST.

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
// Focus Stocks Tracking — types
// ---------------------------------------------------------------------------

interface FocusTrackingRow {
  id: string;
  report_date: string;
  ticker: string;
  company: string | null;
  direction: 'LONG' | 'SHORT';
  archetype: string | null;
  archetype_label: string | null;
  reason: string | null;
  confluence: boolean | null;
  entry_price: number | null;
  weekly_target: number | null;
  target_type: 'weekly_swing_high' | 'weekly_swing_low' | 'blue_sky' | 'unavailable' | null;
  stop_price: number | null;
  status: 'open' | 'target_hit' | 'stopped';
  outcome_date: string | null;
  outcome_price: number | null;
  max_favorable_price: number | null;
  max_adverse_price: number | null;
  price_7d: number | null;
  price_14d: number | null;
  price_30d: number | null;
  price_60d: number | null;
  last_checked_at: string | null;
  created_at: string;
}

type FocusStatusFilter = 'all' | 'open' | 'target_hit' | 'stopped';

// Compute direction-aware return %: LONG = (p/entry-1)*100, SHORT = (1-p/entry)*100
function focusReturn(price: number | null, entry: number | null, direction: 'LONG' | 'SHORT'): number | null {
  if (price === null || entry === null || entry === 0) return null;
  return direction === 'LONG'
    ? round2((price / entry - 1) * 100)
    : round2((1 - price / entry) * 100);
}

// ---------------------------------------------------------------------------
// Aggregate helpers (used for client-side stats computation)
// ---------------------------------------------------------------------------
function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(val: number | null): number | null {
  if (val === null) return null;
  return Math.round(val * 100) / 100;
}

// ---------------------------------------------------------------------------
// Task 1: extract immediate_impact_pct from metadata.move_pct
// Handles number, stringified number, or missing/null gracefully.
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

// Task 3: heatmap timeframes expanded to 4
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

// Skeleton row for table loading state — 11 cols (added Same-Day Impact)
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
// Drilldown modal — Task 7: adds metadata + immediate_impact_pct per mention
// ---------------------------------------------------------------------------
const DrilldownModal: React.FC<{
  ticker: string;
  onClose: () => void;
}> = ({ ticker, onClose }) => {
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
    queryFn: async (): Promise<TickerDrilldown> => {
      // Task 7: include metadata so we can show same-day impact per mention
      const { data: rows, error } = await supabase
        .from('warzone_ticker_mentions')
        .select(
          'id, ticker, report_date, mention_type, source_firm, reason_short, reason_full, price_at_mention, change_30d_pct, change_60d_pct, change_90d_pct, alpha_90d_pct, metadata',
        )
        .eq('ticker', ticker)
        .order('report_date', { ascending: false });

      if (error) throw new Error(error.message);

      const safeRows = rows ?? [];

      const mentions: WarzoneMention[] = safeRows.map((r) => {
        const meta = (r.metadata as Record<string, unknown> | null) ?? null;
        return {
          id: r.id,
          ticker: r.ticker,
          mentioned_at: r.report_date,
          mention_type: r.mention_type as MentionType,
          firm_source: r.source_firm ?? null,
          reason: r.reason_short ?? '',
          price_at_mention: r.price_at_mention ?? null,
          return_30d: round2(r.change_30d_pct ?? null),
          return_60d: round2(r.change_60d_pct ?? null),
          return_90d: round2(r.change_90d_pct ?? null),
          alpha_90d_pct: round2(r.alpha_90d_pct ?? null),
          metadata: meta,
          immediate_impact_pct: extractImmediateImpact(meta),
        };
      });

      const returns30 = safeRows
        .map((r) => r.change_30d_pct)
        .filter((v): v is number => v !== null && v !== undefined);
      const returns90 = safeRows
        .map((r) => r.change_90d_pct)
        .filter((v): v is number => v !== null && v !== undefined);

      const sortedDates = safeRows.map((r) => r.report_date).sort();

      return {
        ticker,
        company_name: null,
        total_mentions: safeRows.length,
        first_mention: sortedDates[0] ?? null,
        last_mention: sortedDates[sortedDates.length - 1] ?? null,
        avg_return_30d: round2(mean(returns30)),
        avg_return_90d: round2(mean(returns90)),
        best_single_mention_30d: returns30.length > 0 ? round2(Math.max(...returns30)) : null,
        worst_single_mention_30d: returns30.length > 0 ? round2(Math.min(...returns30)) : null,
        mentions,
      };
    },
    staleTime: 30_000,
  });

  // Task 7: compute avg same-day impact across this ticker's mentions
  const avgSameDayImpact: number | null = (() => {
    if (!data?.mentions?.length) return null;
    const vals = data.mentions
      .map((m) => m.immediate_impact_pct)
      .filter((v): v is number => v !== null);
    return vals.length ? round2(mean(vals)) : null;
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
            <SkeletonTable rows={4} cols={4} className="mt-2" />
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

              {/* Historical mentions list — Task 7: per-mention 0d column */}
              <div>
                <p className="text-small font-medium text-ink-secondary uppercase tracking-[1.5px] mb-3">
                  All Mentions
                </p>
                <div className="space-y-3">
                  {data.mentions.map((m) => (
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
                          {m.immediate_impact_pct !== null && (
                            <span className={pctColorClass(m.immediate_impact_pct)}>
                              0d {formatPct(m.immediate_impact_pct)}
                            </span>
                          )}
                          <span className={pctColorClass(m.return_30d)}>30d {formatPct(m.return_30d)}</span>
                          <span className={pctColorClass(m.return_60d)}>60d {formatPct(m.return_60d)}</span>
                          <span className={pctColorClass(m.return_90d)}>90d {formatPct(m.return_90d)}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-small text-ink-secondary leading-relaxed">{m.reason}</p>
                    </div>
                  ))}

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

  // Focus Stocks Tracking — status filter
  const [focusStatusFilter, setFocusStatusFilter] = useState<FocusStatusFilter>('all');

  // Drilldown modal
  const [drilldownTicker, setDrilldownTicker] = useState<string | null>(null);

  // Heatmap tooltip
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cell: null });

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

  // Map SortBy enum to DB column + direction
  const sortDbMap: Record<SortBy, { column: string; ascending: boolean }> = {
    mentioned_at:    { column: 'report_date',    ascending: false },
    return_30d_desc: { column: 'change_30d_pct', ascending: false },
    return_30d_asc:  { column: 'change_30d_pct', ascending: true  },
    alpha_90d_desc:  { column: 'alpha_90d_pct',  ascending: false },
    win_loss:        { column: 'change_30d_pct', ascending: false },
  };

  // Query: paginated mentions list — Task 1: metadata added to SELECT
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
    queryFn: async (): Promise<PaginatedMentions> => {
      const { column, ascending } = sortDbMap[sortBy];

      // Task 1: metadata included so extractImmediateImpact() can read move_pct
      let q = supabase
        .from('warzone_ticker_mentions')
        .select(
          'id, ticker, report_date, mention_type, source_firm, reason_short, price_at_mention, change_30d_pct, change_60d_pct, change_90d_pct, alpha_90d_pct, metadata',
          { count: 'exact' },
        )
        .gte('report_date', dateFrom)
        .lte('report_date', dateTo)
        .order(column, { ascending, nullsFirst: false })
        .range(offset, offset + pageSize - 1);

      if (mentionTypeFilter !== 'all') {
        q = q.eq('mention_type', mentionTypeFilter);
      }
      if (debouncedTicker) {
        q = q.ilike('ticker', `%${debouncedTicker.toUpperCase()}%`);
      }

      const { data: rows, count, error } = await q;
      if (error) throw new Error(error.message);

      // Task 1: map metadata → immediate_impact_pct on each row
      const mappedRows: WarzoneMention[] = (rows ?? []).map((r) => {
        const meta = (r.metadata as Record<string, unknown> | null) ?? null;
        return {
          id: r.id,
          ticker: r.ticker,
          mentioned_at: r.report_date,
          mention_type: r.mention_type as MentionType,
          firm_source: r.source_firm ?? null,
          reason: r.reason_short ?? '',
          price_at_mention: r.price_at_mention ?? null,
          return_30d: round2(r.change_30d_pct ?? null),
          return_60d: round2(r.change_60d_pct ?? null),
          return_90d: round2(r.change_90d_pct ?? null),
          alpha_90d_pct: round2(r.alpha_90d_pct ?? null),
          metadata: meta,
          immediate_impact_pct: extractImmediateImpact(meta),
        };
      });

      return { data: mappedRows, total: count ?? 0, offset, limit: pageSize };
    },
    staleTime: 60_000,
  });

  // Query: aggregates (computed client-side from a minimal full-range fetch)
  // Task 6: metadata + report_date included for same-day heatmap cells + stats
  const {
    data: aggregates,
    isLoading: aggregatesLoading,
  } = useQuery<MentionAggregates>({
    queryKey: ['warzone-aggregates', dateFrom, dateTo],
    queryFn: async (): Promise<MentionAggregates> => {
      const { data: rows, error } = await supabase
        .from('warzone_ticker_mentions')
        .select('ticker, mention_type, change_30d_pct, change_60d_pct, change_90d_pct, metadata, report_date')
        .gte('report_date', dateFrom)
        .lte('report_date', dateTo);

      if (error) throw new Error(error.message);

      const safeRows = rows ?? [];
      const MENTION_TYPES: MentionType[] = [
        'analyst_rating', 'significant_catalyst', 'insider_buy',
        'earnings', 'institutional_13f', 'tactical_macro',
      ];

      // Top-level stats
      const total_mentions = safeRows.length;
      const active_tickers = new Set(safeRows.map((r) => r.ticker)).size;

      const returns30 = safeRows
        .map((r) => r.change_30d_pct)
        .filter((v): v is number => v !== null && v !== undefined);
      const avg_return_30d = round2(mean(returns30));
      const win_rate_30d =
        returns30.length > 0
          ? round2((returns30.filter((v) => v > 0).length / returns30.length) * 100)
          : null;

      // Task 6: same-day impact stats
      const allImpacts = safeRows
        .map((r) => extractImmediateImpact((r.metadata as Record<string, unknown> | null) ?? null))
        .filter((v): v is number => v !== null);
      const avg_immediate_impact_pct = allImpacts.length ? round2(mean(allImpacts)) : null;
      const same_day_hit_rate = allImpacts.length
        ? round2((allImpacts.filter((v) => v > 0).length / allImpacts.length) * 100)
        : null;
      let strongest_move: { ticker: string; impact_pct: number } | null = null;
      if (allImpacts.length > 0) {
        let maxAbs = -1;
        for (const r of safeRows) {
          const imp = extractImmediateImpact((r.metadata as Record<string, unknown> | null) ?? null);
          if (imp !== null && Math.abs(imp) > maxAbs) {
            maxAbs = Math.abs(imp);
            strongest_move = { ticker: r.ticker, impact_pct: imp };
          }
        }
      }

      // Per-type avg 30d → derive best/worst (Task 6: fallback to same-day when 30d empty)
      const typeAvgs: Array<{ type: MentionType; avg: number | null }> = MENTION_TYPES.map((t) => {
        const vals30 = safeRows
          .filter((r) => r.mention_type === t)
          .map((r) => r.change_30d_pct)
          .filter((v): v is number => v !== null && v !== undefined);
        if (vals30.length > 0) return { type: t, avg: round2(mean(vals30)) };
        // Fallback: same-day impact when no 30d data yet
        const valsSd = safeRows
          .filter((r) => r.mention_type === t)
          .map((r) => extractImmediateImpact((r.metadata as Record<string, unknown> | null) ?? null))
          .filter((v): v is number => v !== null);
        return { type: t, avg: valsSd.length > 0 ? round2(mean(valsSd)) : null };
      });
      const withData = typeAvgs.filter((x) => x.avg !== null) as Array<{ type: MentionType; avg: number }>;
      let best_mention_type: string | null = null;
      let best_mention_type_avg: number | null = null;
      let worst_mention_type: string | null = null;
      let worst_mention_type_avg: number | null = null;
      if (withData.length > 0) {
        const best = withData.reduce((a, b) => (b.avg > a.avg ? b : a));
        const worst = withData.reduce((a, b) => (b.avg < a.avg ? b : a));
        best_mention_type = best.type;
        best_mention_type_avg = best.avg;
        worst_mention_type = worst.type;
        worst_mention_type_avg = worst.avg;
      }

      // Task 3: Heatmap 6 types × 4 timeframes = 24 cells
      const FOLLOW_UP_TIMEFRAMES: Array<{
        key: '30d' | '60d' | '90d';
        col: 'change_30d_pct' | 'change_60d_pct' | 'change_90d_pct';
      }> = [
        { key: '30d', col: 'change_30d_pct' },
        { key: '60d', col: 'change_60d_pct' },
        { key: '90d', col: 'change_90d_pct' },
      ];

      const heatmap: HeatmapCell[] = [];
      for (const mentionType of MENTION_TYPES) {
        const typeRows = safeRows.filter((r) => r.mention_type === mentionType);

        // Same-day column (from metadata.move_pct)
        const sdVals = typeRows
          .map((r) => extractImmediateImpact((r.metadata as Record<string, unknown> | null) ?? null))
          .filter((v): v is number => v !== null);
        const sdCount = sdVals.length;
        heatmap.push({
          mention_type: mentionType,
          timeframe: 'same_day',
          avg_return: sdCount > 0 ? round2(mean(sdVals)) : null,
          count: sdCount,
          median_return: sdCount > 0 ? round2(median(sdVals)) : null,
          win_rate: sdCount > 0
            ? round2((sdVals.filter((v) => v > 0).length / sdCount) * 100)
            : null,
        });

        // Follow-up timeframes (30d / 60d / 90d)
        for (const { key: timeframe, col } of FOLLOW_UP_TIMEFRAMES) {
          const vals = typeRows
            .map((r) => r[col])
            .filter((v): v is number => v !== null && v !== undefined);
          const count = vals.length;
          heatmap.push({
            mention_type: mentionType,
            timeframe,
            avg_return: round2(mean(vals)),
            count,
            median_return: round2(median(vals)),
            win_rate: count > 0
              ? round2((vals.filter((v) => v > 0).length / count) * 100)
              : null,
          });
        }
      }

      return {
        total_mentions,
        active_tickers,
        avg_return_30d,
        win_rate_30d,
        best_mention_type,
        best_mention_type_avg,
        worst_mention_type,
        worst_mention_type_avg,
        heatmap,
        avg_immediate_impact_pct,
        same_day_hit_rate,
        strongest_move,
      };
    },
    staleTime: 60_000,
  });

  // Query: Focus Stocks Tracking — direct Supabase PostgREST (same pattern as existing queries)
  const {
    data: focusData,
    isLoading: focusLoading,
    isError: focusError,
    refetch: refetchFocus,
  } = useQuery<FocusTrackingRow[]>({
    queryKey: ['warzone-focus-tracking', focusStatusFilter],
    queryFn: async (): Promise<FocusTrackingRow[]> => {
      let q = supabase
        .from('warzone_focus_tracking')
        .select(
          'id, report_date, ticker, company, direction, archetype, archetype_label, reason, confluence, entry_price, weekly_target, target_type, stop_price, status, outcome_date, outcome_price, max_favorable_price, max_adverse_price, price_7d, price_14d, price_30d, price_60d, last_checked_at, created_at',
        )
        .order('report_date', { ascending: false })
        .range(0, 99); // cap at 100 rows

      if (focusStatusFilter !== 'all') {
        q = q.eq('status', focusStatusFilter);
      }

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return (rows ?? []) as FocusTrackingRow[];
    },
    staleTime: 60_000,
  });

  const focusRows = focusData ?? [];

  // Focus stats (computed client-side from full unfiltered data — use a separate full-set query for stats)
  const {
    data: focusAllData,
  } = useQuery<FocusTrackingRow[]>({
    queryKey: ['warzone-focus-tracking-all'],
    queryFn: async (): Promise<FocusTrackingRow[]> => {
      const { data: rows, error } = await supabase
        .from('warzone_focus_tracking')
        .select('id, report_date, ticker, direction, entry_price, price_30d, status, outcome_date')
        .order('report_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (rows ?? []) as FocusTrackingRow[];
    },
    staleTime: 60_000,
  });

  const focusAll = focusAllData ?? [];
  const focusOpen = focusAll.filter((r) => r.status === 'open').length;
  const focusClosed = focusAll.filter((r) => r.status !== 'open').length;
  const focusHit = focusAll.filter((r) => r.status === 'target_hit').length;
  const focusHitRate: number | null =
    focusClosed > 0 ? round2((focusHit / focusClosed) * 100) : null;

  const focusAvgReturn30d: number | null = (() => {
    const vals = focusAll
      .map((r) => focusReturn(r.price_30d, r.entry_price, r.direction))
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? round2(mean(vals)) : null;
  })();

  const focusAvgDaysToOutcome: number | null = (() => {
    const days = focusAll
      .filter((r) => r.status !== 'open' && r.outcome_date && r.report_date)
      .map((r) => {
        const diff =
          (new Date(r.outcome_date!).getTime() - new Date(r.report_date).getTime()) /
          86_400_000;
        return Math.round(diff);
      })
      .filter((d) => d >= 0);
    return days.length > 0 ? round2(mean(days)) : null;
  })();

  const mentions = mentionsData?.data ?? [];
  const totalMentions = mentionsData?.total ?? 0;
  const totalPages = Math.ceil(totalMentions / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  // Heatmap cell lookup helper — Task 3: handles 4 timeframes
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

  // Task 5: today's tracked catalysts for the callout panel
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
      {/* Section A — Focus Stocks Tracking                                   */}
      {/* ------------------------------------------------------------------ */}
      <div>
        {/* Section header */}
        <div className="mb-4">
          <h2 className="text-h3 font-semibold text-gold-primary">Focus Stocks Tracking</h2>
          <p className="text-small text-ink-tertiary mt-1">
            Internal swing tracking — closes only on weekly target or 8% stop. Not customer-facing.
          </p>
        </div>

        {/* Stats tiles row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <StatTile
            label="Open Positions"
            value={focusAll.length === 0 && !focusAllData ? '—' : focusOpen.toLocaleString()}
            icon={Target}
            loading={!focusAllData && focusLoading}
          />
          <StatTile
            label="Closed"
            value={focusAll.length === 0 && !focusAllData ? '—' : focusClosed.toLocaleString()}
            icon={Activity}
            loading={!focusAllData && focusLoading}
          />
          <StatTile
            label="Hit Rate"
            value={
              focusHitRate !== null
                ? `${focusHitRate.toFixed(1)}%`
                : '—'
            }
            icon={TrendingUp}
            loading={!focusAllData && focusLoading}
          />
          <StatTile
            label="Avg Return 30d"
            value={
              <span className={pctColorClass(focusAvgReturn30d)}>
                {formatPct(focusAvgReturn30d)}
              </span>
            }
            icon={BarChart3}
            loading={!focusAllData && focusLoading}
          />
          <StatTile
            label="Avg Days to Close"
            value={
              focusAvgDaysToOutcome !== null
                ? `${focusAvgDaysToOutcome.toFixed(1)}d`
                : '—'
            }
            icon={Zap}
            loading={!focusAllData && focusLoading}
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select
            value={focusStatusFilter}
            onChange={(e) => setFocusStatusFilter(e.target.value as FocusStatusFilter)}
            className="bg-surface-1 border border-border-ds-default rounded-lg px-3 py-2 text-small text-ink-primary focus:outline-none focus:border-gold-primary transition-colors duration-base"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="target_hit">Target Hit</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>

        {/* Main table */}
        <Card padding="compact">
          {focusError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-status-error">
              <AlertCircle className="w-8 h-8" />
              <p className="text-small">Failed to load focus tracking data.</p>
              <Button variant="goldOutline" size="compact" showArrow={false} onClick={() => refetchFocus()}>
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
                        'Ticker', 'Date', 'Dir', 'Archetype', 'Entry', 'Target', 'Stop',
                        'Status', '+7d %', '+14d %', '+30d %', '+60d %', 'Max Fav', 'Max Adv',
                      ].map((col) => (
                        <th
                          key={col}
                          className="text-left px-3 py-3 font-medium text-small uppercase tracking-[0.5px] whitespace-nowrap text-ink-tertiary"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {focusLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border-ds-subtle">
                            {Array.from({ length: 14 }).map((__, j) => (
                              <td key={j} className="px-3 py-3">
                                <div
                                  className="h-4 bg-surface-2 rounded animate-pulse"
                                  style={{ width: `${50 + (j % 4) * 15}%` }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))
                      : focusRows.map((row) => {
                          const ret7d = focusReturn(row.price_7d, row.entry_price, row.direction);
                          const ret14d = focusReturn(row.price_14d, row.entry_price, row.direction);
                          const ret30d = focusReturn(row.price_30d, row.entry_price, row.direction);
                          const ret60d = focusReturn(row.price_60d, row.entry_price, row.direction);
                          const maxFavPct = focusReturn(row.max_favorable_price, row.entry_price, row.direction);
                          const maxAdvPct = focusReturn(row.max_adverse_price, row.entry_price, row.direction);

                          const statusBadge = (() => {
                            if (row.status === 'target_hit') {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap bg-[#0d9488]/15 text-[#2dd4bf] border border-[#0d9488]/25" style={{ borderRadius: '4px' }}>
                                  Target Hit
                                </span>
                              );
                            }
                            if (row.status === 'stopped') {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap bg-status-error/15 text-num-negative border border-status-error/25" style={{ borderRadius: '4px' }}>
                                  Stopped
                                </span>
                              );
                            }
                            // open
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap bg-gold-primary/15 text-gold-primary border border-gold-border" style={{ borderRadius: '4px' }}>
                                Open
                              </span>
                            );
                          })();

                          const targetDisplay = (() => {
                            if (row.target_type === 'blue_sky') {
                              // Blue sky: internal 20% target stored in weekly_target (never customer-facing)
                              return (
                                <span className="text-gold-primary font-mono whitespace-nowrap">
                                  {row.weekly_target !== null ? `${formatPrice(row.weekly_target)} ` : ''}
                                  <span className="text-[10px] uppercase tracking-wide opacity-80">Blue sky +20%</span>
                                </span>
                              );
                            }
                            if (row.weekly_target === null) return <span className="text-ink-muted">—</span>;
                            return <span className="font-mono text-ink-secondary">{formatPrice(row.weekly_target)}</span>;
                          })();

                          return (
                            <tr
                              key={row.id}
                              className="border-b border-border-ds-subtle/60 hover:bg-surface-2/50 transition-colors duration-fast"
                            >
                              {/* Ticker */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className="font-mono font-semibold text-gold-primary">
                                  {row.ticker}
                                </span>
                                {row.company && (
                                  <span className="block text-[11px] text-ink-muted leading-tight">{row.company}</span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="px-3 py-3 whitespace-nowrap text-ink-tertiary">
                                {formatDate(row.report_date)}
                              </td>

                              {/* Direction */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span
                                  className={`font-mono font-semibold text-small ${
                                    row.direction === 'LONG' ? 'text-ink-primary' : 'text-num-negative'
                                  }`}
                                >
                                  {row.direction}
                                </span>
                              </td>

                              {/* Archetype */}
                              <td className="px-3 py-3 whitespace-nowrap text-ink-secondary text-[11px]" title={row.archetype ?? undefined}>
                                {row.archetype_label ?? row.archetype ?? <span className="text-ink-muted">—</span>}
                              </td>

                              {/* Entry */}
                              <td className="px-3 py-3 font-mono text-ink-secondary whitespace-nowrap">
                                {formatPrice(row.entry_price)}
                              </td>

                              {/* Target */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                {targetDisplay}
                              </td>

                              {/* Stop */}
                              <td className="px-3 py-3 font-mono text-ink-secondary whitespace-nowrap">
                                {formatPrice(row.stop_price)}
                              </td>

                              {/* Status */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                {statusBadge}
                              </td>

                              {/* +7d % */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(ret7d)}`}>
                                {formatPct(ret7d)}
                              </td>

                              {/* +14d % */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(ret14d)}`}>
                                {formatPct(ret14d)}
                              </td>

                              {/* +30d % */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(ret30d)}`}>
                                {formatPct(ret30d)}
                              </td>

                              {/* +60d % */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(ret60d)}`}>
                                {formatPct(ret60d)}
                              </td>

                              {/* Max Fav */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(maxFavPct)}`}>
                                {formatPct(maxFavPct)}
                              </td>

                              {/* Max Adv */}
                              <td className={`px-3 py-3 font-mono whitespace-nowrap ${pctColorClass(maxAdvPct)}`}>
                                {formatPct(maxAdvPct)}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {!focusLoading && focusRows.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-ink-tertiary">
                  <Target className="w-8 h-8 text-ink-muted" />
                  <p className="text-small">No tracked positions yet — populated automatically by the daily report.</p>
                </div>
              )}
            </>
          )}
        </Card>
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
          <SkeletonTable rows={3} cols={4} className="mt-2" />
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
        {/* Task 2: Avg Return 30d (reference — populates later via cron) */}
        <StatTile
          label="Avg Return 30d"
          value={
            <span className={pctColorClass(aggregates?.avg_return_30d ?? null)}>
              {formatPct(aggregates?.avg_return_30d ?? null)}
            </span>
          }
          icon={TrendingDown}
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
          <SkeletonTable rows={5} cols={5} className="mt-2" />
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
                        tf === 'same_day' ? 'text-[#a78bfa]' : 'text-ink-secondary'
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
                            <span className={`font-mono font-medium ${pctColorClass(avgRet)}`}>
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
                          col === 'Same-Day Impact' ? 'text-[#a78bfa]' : 'text-ink-tertiary'
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
