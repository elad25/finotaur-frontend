// src/pages/app/ai/copilot/hooks/usePortfolioData.ts
// =====================================================
// Portfolio data hook — real IB data when connected, mock fallback otherwise.
//
// Performance chart series is sourced (in order):
//   1. portfolio_snapshots table, range-filtered (written daily by
//      interactive-brokers-sync v4) — real historical line
//   2. flat-line at current totalValue when <2 snapshots accumulated
//   3. mock data when not connected
//
// The time-range buttons (1M/3M/6M/YTD/1Y/ALL) drive the query so the chart
// re-renders with a different X-axis span and the visible series actually
// changes shape (when enough snapshots exist).
//
// Live quote layer (intraday mark-to-market):
//   GET /api/quotes?symbols=... is polled every 60s during market hours.
//   It provides the headline totalValue (mark-to-market) and day change.
//   The chart series is NOT updated — it stays snapshot-sourced.
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { isMarketOpen } from '@/lib/marketStatus';
import { EMPTY_SNAPSHOT } from './usePortfolioMockData';

// Re-export stable type contract so consumers can import from one surface.
export type { TimeRange, Holding, PerformancePoint, PortfolioSnapshot } from './usePortfolioMockData';
import type { TimeRange, Holding, PerformancePoint, PortfolioSnapshot } from './usePortfolioMockData';

// ─── Series helpers ──────────────────────────────────────────────────────────

const RANGE_DAYS: Record<TimeRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, 'YTD': 130, '1Y': 365, 'ALL': 730,
};

function rangeStartDate(range: TimeRange): string {
  if (range === 'YTD') {
    const jan1 = new Date(new Date().getUTCFullYear(), 0, 1);
    return jan1.toISOString().slice(0, 10);
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - RANGE_DAYS[range]);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates a flat series at `totalValue` for the selected range.
 * Fallback when fewer than 2 portfolio_snapshots exist for the user.
 * Visually honest: signals "we have your current value but no history yet".
 */
function makeFlatSeries(totalValue: number, range: TimeRange): PerformancePoint[] {
  const days = RANGE_DAYS[range];
  const today = new Date();
  const points: PerformancePoint[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    points.push({ date: d.toISOString().slice(0, 10), value: totalValue });
  }
  return points;
}

// ─── IBRIT position shape (written by interactive-brokers-sync edge fn v2) ──

interface IBRITPosition {
  Symbol: string;
  Description?: string;
  UnderlyingSymbol?: string;
  Quantity: string;
  MarkPrice: string;
  PositionValue: string;
  CostBasisPrice: string;
  CostBasisMoney?: string;
  FifoPnlUnrealized: string;
  CurrencyPrimary?: string;
  AssetClass?: string;
}

interface IBAccountSummary {
  netliquidation?: { amount: number; currency?: string };
  totalcashvalue?: { amount: number };
  [key: string]: unknown;
}

interface IBConnectionData {
  last_positions?: IBRITPosition[];
  last_account_summary?: IBAccountSummary;
  [key: string]: unknown;
}

// ─── Live quotes API ─────────────────────────────────────────────────────────

interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketStatus: string;
  asOf: string;
}

interface QuotesApiResponse {
  quotes: LiveQuote[];
  stale: boolean;
  source: 'yahoo' | 'cache' | 'unavailable';
}

async function fetchLiveQuotes(symbols: string[]): Promise<QuotesApiResponse> {
  const res = await fetch(`/api/portfolio-quotes?symbols=${symbols.join(',')}`);
  if (!res.ok) throw new Error(`quotes fetch failed: ${res.status}`);
  return res.json() as Promise<QuotesApiResponse>;
}

// ─── Return type ────────────────────────────────────────────────────────────

export interface PortfolioDataResult extends PortfolioSnapshot {
  /** 'live' when data comes from IB, 'mock' otherwise. */
  source: 'mock' | 'live';
  lastSyncAt: string | null;
  /** True when the chart series came from portfolio_snapshots (≥2 rows). False = flat-line fallback. */
  hasHistoricalSeries: boolean;
  /** ISO timestamp of the most recent live quote batch, null when unavailable. */
  liveAsOf: string | null;
  /** True when totalValue reflects intraday mark-to-market (live quotes present and not stale). */
  isLive: boolean;
  /** True when the quotes response was marked stale by the backend. */
  quotesStale: boolean;
  /** Intraday $ change (Σ qty × quote.change), null when market closed or no quotes. */
  dayChangeAbs: number | null;
  /** Intraday % change, null when unavailable. */
  dayChangePercent: number | null;
}

// ─── Supabase fetch ─────────────────────────────────────────────────────────

const SELECT_COLS = 'connection_data,last_sync_at';

async function fetchIBPortfolio(userId: string): Promise<{
  connection_data: IBConnectionData | null;
  last_sync_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from('broker_connections')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .eq('broker', 'interactive_brokers')
    .eq('is_active', true)
    .maybeSingle();

  if (error?.code === '42P01') return null; // table missing — fresh dev DB
  if (error) throw error;
  return data as { connection_data: IBConnectionData | null; last_sync_at: string | null } | null;
}

interface SnapshotRow {
  snapshot_date: string;
  total_value: string | number; // numeric → string in some PG client configs
}

async function fetchSnapshots(userId: string, range: TimeRange): Promise<PerformancePoint[]> {
  const fromDate = rangeStartDate(range);
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date,total_value')
    .eq('user_id', userId)
    .gte('snapshot_date', fromDate)
    .order('snapshot_date', { ascending: true });

  if (error?.code === '42P01') return []; // table missing — fresh dev DB
  if (error) throw error;

  return ((data as SnapshotRow[] | null) ?? []).map((row) => ({
    date: row.snapshot_date,
    value: Number(row.total_value) || 0,
  }));
}

// ─── Transformation ─────────────────────────────────────────────────────────

function mapIBRITPositionToHolding(pos: IBRITPosition): Holding {
  const quantity = Number(pos.Quantity) || 0;
  const marketPrice = Number(pos.MarkPrice) || 0;
  const marketValue = Number(pos.PositionValue) || (quantity * marketPrice);
  const avgCost = Number(pos.CostBasisPrice) || 0;
  const unrealizedPnl = Number(pos.FifoPnlUnrealized) || 0;
  // Use IB's CostBasisMoney (total cost in account currency, already includes the
  // contract multiplier for options/futures). Falling back to avgCost × qty drops
  // the ×100 option multiplier and inflates P&L% by 100× (QBTS showed -1472% vs -14.72%).
  const costBasisMoney = Number(pos.CostBasisMoney);
  const costBasis = costBasisMoney > 0 ? costBasisMoney : avgCost * Math.abs(quantity);
  return {
    symbol: pos.Symbol || pos.UnderlyingSymbol || 'UNKNOWN',
    name: pos.Description || pos.Symbol || 'Unknown',
    quantity,
    avgCost,
    marketPrice,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0,
    assetClass: pos.AssetClass || 'UNKNOWN',
  };
}

function transformPositions(positions: IBRITPosition[]): Holding[] {
  return positions
    .map(mapIBRITPositionToHolding)
    .filter((h) => h.quantity !== 0); // filter closed positions (Quantity = 0)
}

interface BuildSnapshotResult {
  snapshot: PortfolioSnapshot;
  hasHistoricalSeries: boolean;
  liveTotalValue: number | null;
  isLive: boolean;
  quotesStale: boolean;
  liveAsOf: string | null;
  dayChangeAbs: number | null;
  dayChangePercent: number | null;
}

function buildSnapshot(
  holdings: Holding[],
  accountSummary: IBAccountSummary | undefined,
  historicalSeries: PerformancePoint[],
  range: TimeRange,
  quotesData: QuotesApiResponse | undefined,
): BuildSnapshotResult {
  const sumMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const baseValue = accountSummary?.netliquidation?.amount ?? sumMarketValue;

  // ── Mark-to-market with live quotes ───────────────────────────────────────
  // Separate cash holdings (AssetClass === 'CASH') from equity holdings.
  const cashHoldings = holdings.filter((h) => (h.assetClass ?? '').toUpperCase() === 'CASH');
  const equityHoldings = holdings.filter((h) => (h.assetClass ?? '').toUpperCase() !== 'CASH');

  const isLive = !!quotesData && !quotesData.stale && quotesData.source !== 'unavailable';
  const quotesStale = !!quotesData && quotesData.stale;
  const liveAsOf = isLive && quotesData!.quotes.length > 0
    ? quotesData!.quotes[0].asOf
    : null;

  let liveTotalValue: number | null = null;
  let dayChangeAbs: number | null = null;
  let dayChangePercent: number | null = null;

  if (isLive && quotesData!.quotes.length > 0) {
    const quoteMap = new Map<string, LiveQuote>(
      quotesData!.quotes.map((q) => [q.symbol.toUpperCase(), q]),
    );

    // Compute live equity value: qty × livePrice, fall back to stored marketValue.
    const liveEquityValue = equityHoldings.reduce((sum, h) => {
      const q = quoteMap.get(h.symbol.toUpperCase());
      return sum + (q ? h.quantity * q.price : h.marketValue);
    }, 0);

    const cashValue = cashHoldings.reduce((sum, h) => sum + h.marketValue, 0);
    liveTotalValue = liveEquityValue + cashValue;

    // Day change: Σ(qty × quote.change) for equity holdings that have a live quote.
    dayChangeAbs = equityHoldings.reduce((sum, h) => {
      const q = quoteMap.get(h.symbol.toUpperCase());
      return sum + (q ? h.quantity * q.change : 0);
    }, 0);

    // dayChangePercent = dayChangeAbs / (liveTotal − dayChangeAbs) — guard divide-by-zero.
    const denominator = liveTotalValue - dayChangeAbs;
    dayChangePercent = denominator > 0 ? (dayChangeAbs / denominator) * 100 : 0;
  }

  // Headline totalValue: use live mark-to-market when available, fall back to IB snapshot.
  const totalValue = liveTotalValue ?? baseValue;

  // Use real historical series when we have ≥2 distinct points; else honest flat-line.
  const hasHistoricalSeries = historicalSeries.length >= 2;
  const series: PerformancePoint[] = hasHistoricalSeries
    ? historicalSeries
    : makeFlatSeries(totalValue, range);

  // changeAbs/changePercent for the selected RANGE (chart-level, NOT day change).
  // Prefers the series (first→last), falls back to unrealized PnL.
  let changeAbs: number;
  let changePercent: number;
  if (hasHistoricalSeries) {
    const first = series[0].value;
    const last = series[series.length - 1].value;
    changeAbs = last - first;
    changePercent = first > 0 ? (changeAbs / first) * 100 : 0;
  } else {
    changeAbs = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
    const costBase = totalValue - changeAbs;
    changePercent = costBase > 0 ? (changeAbs / costBase) * 100 : 0;
  }

  return {
    snapshot: { totalValue, changeAbs, changePercent, holdings, series },
    hasHistoricalSeries,
    liveTotalValue,
    isLive,
    quotesStale,
    liveAsOf,
    dayChangeAbs,
    dayChangePercent,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

const LIVE_QUOTE_STALE_TIME = 55_000; // slightly less than poll interval

/** Derive the sorted, deduplicated list of equity symbols from positions. */
function equitySymbols(positions: IBRITPosition[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of positions) {
    const cls = (p.AssetClass ?? '').toUpperCase();
    if (cls === 'CASH') continue; // skip cash entries
    const qty = Number(p.Quantity) || 0;
    if (qty === 0) continue; // skip closed positions
    const sym = (p.Symbol || p.UnderlyingSymbol || '').toUpperCase();
    if (sym && !seen.has(sym)) {
      seen.add(sym);
      result.push(sym);
    }
  }
  return result.sort();
}

export function usePortfolioData(range: TimeRange): PortfolioDataResult {
  const { isConnected, loading: ibLoading, lastSyncAt: ibLastSyncAt } = useIBConnection();
  const { id: userId } = useEffectiveUser();

  const { data: ibRow, isLoading: queryLoading } = useQuery({
    queryKey: ['portfolio-ib', userId ?? ''],
    queryFn: () => fetchIBPortfolio(userId!),
    enabled: !!userId && isConnected,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Range-keyed: switching time-range re-runs the query → chart redraws with new shape.
  const { data: snapshotSeries, isLoading: seriesLoading } = useQuery({
    queryKey: ['portfolio-snapshots', userId ?? '', range],
    queryFn: () => fetchSnapshots(userId!, range),
    enabled: !!userId && isConnected,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Derive equity symbols for the live-quote query key (sorted → stable key).
  const positions = ibRow?.connection_data?.last_positions ?? null;
  const symbols = useMemo(
    () => (positions ? equitySymbols(positions) : []),
    [positions],
  );

  // Live intraday quotes — polled every 60s while market is open.
  const { data: quotesData } = useQuery({
    queryKey: ['portfolio-live-quotes', userId ?? '', symbols],
    queryFn: () => fetchLiveQuotes(symbols),
    enabled: !!userId && isConnected && symbols.length > 0,
    // Function form so the interval is re-evaluated after each poll: polling
    // automatically stops once the market closes (no new data is coming).
    refetchInterval: () => (isMarketOpen() ? 60_000 : false),
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUOTE_STALE_TIME,
    gcTime: 10 * 60 * 1000,
    // Silently degrade on error — never block the UI for stale/unavailable quotes.
    retry: 1,
  });

  return useMemo((): PortfolioDataResult => {
    const liveQuotesAbsent: Pick<PortfolioDataResult, 'liveAsOf' | 'isLive' | 'quotesStale' | 'dayChangeAbs' | 'dayChangePercent'> = {
      liveAsOf: null,
      isLive: false,
      quotesStale: false,
      dayChangeAbs: null,
      dayChangePercent: null,
    };

    // Not connected, or still loading connection state → empty (no fabricated data)
    if (!isConnected || ibLoading || queryLoading) {
      return { ...EMPTY_SNAPSHOT, source: 'mock', lastSyncAt: null, hasHistoricalSeries: false, ...liveQuotesAbsent };
    }

    // Connected but sync hasn't run yet (no positions in connection_data)
    if (!positions || positions.length === 0) {
      return { ...EMPTY_SNAPSHOT, source: 'mock', lastSyncAt: ibLastSyncAt, hasHistoricalSeries: false, ...liveQuotesAbsent };
    }

    const holdings = transformPositions(positions);
    const accountSummary = ibRow?.connection_data?.last_account_summary;
    const lastSyncAt = ibRow?.last_sync_at ?? ibLastSyncAt;
    const historicalSeries = seriesLoading ? [] : (snapshotSeries ?? []);

    const {
      snapshot,
      hasHistoricalSeries,
      isLive,
      quotesStale,
      liveAsOf,
      dayChangeAbs,
      dayChangePercent,
    } = buildSnapshot(holdings, accountSummary, historicalSeries, range, quotesData);

    return {
      ...snapshot,
      source: 'live',
      lastSyncAt,
      hasHistoricalSeries,
      isLive,
      quotesStale,
      liveAsOf,
      dayChangeAbs,
      dayChangePercent,
    };
  }, [isConnected, ibLoading, queryLoading, ibRow, ibLastSyncAt, range, snapshotSeries, seriesLoading, positions, quotesData]);
}
