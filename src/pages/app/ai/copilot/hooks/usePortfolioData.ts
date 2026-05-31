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
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
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

// ─── Return type ────────────────────────────────────────────────────────────

export interface PortfolioDataResult extends PortfolioSnapshot {
  /** 'live' when data comes from IB, 'mock' otherwise. */
  source: 'mock' | 'live';
  lastSyncAt: string | null;
  /** True when the chart series came from portfolio_snapshots (≥2 rows). False = flat-line fallback. */
  hasHistoricalSeries: boolean;
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

function buildSnapshot(
  holdings: Holding[],
  accountSummary: IBAccountSummary | undefined,
  historicalSeries: PerformancePoint[],
  range: TimeRange,
): { snapshot: PortfolioSnapshot; hasHistoricalSeries: boolean } {
  const sumMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalValue = accountSummary?.netliquidation?.amount ?? sumMarketValue;

  // Use real historical series when we have ≥2 distinct points; else honest flat-line.
  const hasHistoricalSeries = historicalSeries.length >= 2;
  const series: PerformancePoint[] = hasHistoricalSeries
    ? historicalSeries
    : makeFlatSeries(totalValue, range);

  // changeAbs/changePercent prefer the series (first→last), fall back to unrealized PnL.
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
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

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

  return useMemo((): PortfolioDataResult => {
    // Not connected, or still loading connection state → empty (no fabricated data)
    if (!isConnected || ibLoading || queryLoading) {
      return { ...EMPTY_SNAPSHOT, source: 'mock', lastSyncAt: null, hasHistoricalSeries: false };
    }

    // Connected but sync hasn't run yet (no positions in connection_data)
    const positions = ibRow?.connection_data?.last_positions;
    if (!positions || positions.length === 0) {
      return { ...EMPTY_SNAPSHOT, source: 'mock', lastSyncAt: ibLastSyncAt, hasHistoricalSeries: false };
    }

    const holdings = transformPositions(positions);
    const accountSummary = ibRow?.connection_data?.last_account_summary;
    const lastSyncAt = ibRow?.last_sync_at ?? ibLastSyncAt;
    const historicalSeries = seriesLoading ? [] : (snapshotSeries ?? []);
    const { snapshot, hasHistoricalSeries } = buildSnapshot(holdings, accountSummary, historicalSeries, range);

    return { ...snapshot, source: 'live', lastSyncAt, hasHistoricalSeries };
  }, [isConnected, ibLoading, queryLoading, ibRow, ibLastSyncAt, range, snapshotSeries, seriesLoading]);
}
