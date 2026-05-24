// src/pages/app/ai/copilot/hooks/usePortfolioData.ts
// =====================================================
// Portfolio data hook — real IB data when connected, mock fallback otherwise.
// Phase 1 MVP: snapshot-based (single point series for performance chart).
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePortfolioMockData } from './usePortfolioMockData';

// Re-export stable type contract so consumers can import from one surface.
export type { TimeRange, Holding, PerformancePoint, PortfolioSnapshot } from './usePortfolioMockData';
import type { TimeRange, Holding, PerformancePoint, PortfolioSnapshot } from './usePortfolioMockData';

// ─── Series helpers ──────────────────────────────────────────────────────────

const RANGE_DAYS: Record<TimeRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, 'YTD': 130, '1Y': 365, 'ALL': 730,
};

/**
 * Generates a flat series at `totalValue` for the selected range.
 * Used when we have a real portfolio value but no historical time series
 * (IB gateway doesn't return trade history in the snapshot).
 * TODO future: replace with real trade-history time series from IB.
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

// ─── Transformation ─────────────────────────────────────────────────────────

function mapIBRITPositionToHolding(pos: IBRITPosition): Holding {
  const quantity = Number(pos.Quantity) || 0;
  const marketPrice = Number(pos.MarkPrice) || 0;
  const marketValue = Number(pos.PositionValue) || (quantity * marketPrice);
  const avgCost = Number(pos.CostBasisPrice) || 0;
  const unrealizedPnl = Number(pos.FifoPnlUnrealized) || 0;
  const costBasis = avgCost * Math.abs(quantity);
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
  lastSyncAt: string | null,
  range: TimeRange,
): PortfolioSnapshot {
  const sumMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalValue = accountSummary?.netliquidation?.amount ?? sumMarketValue;

  // Flat series at current totalValue for the selected range.
  // A flat line is honest: we have one snapshot point, not a real time series.
  // TODO: replace with real trade-history time series from IB when available.
  const series: PerformancePoint[] = makeFlatSeries(totalValue, range);

  const changeAbs = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
  const costBase = totalValue - changeAbs;
  const changePercent = costBase > 0 ? (changeAbs / costBase) * 100 : 0;

  return { totalValue, changeAbs, changePercent, holdings, series };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePortfolioData(range: TimeRange): PortfolioDataResult {
  const { isConnected, loading: ibLoading, lastSyncAt: ibLastSyncAt } = useIBConnection();
  const { id: userId } = useEffectiveUser();
  const mockSnapshot = usePortfolioMockData(range);

  const { data: ibRow, isLoading: queryLoading } = useQuery({
    queryKey: ['portfolio-ib', userId ?? ''],
    queryFn: () => fetchIBPortfolio(userId!),
    enabled: !!userId && isConnected,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return useMemo((): PortfolioDataResult => {
    // Not connected, or still loading connection state → mock (no flicker)
    if (!isConnected || ibLoading || queryLoading) {
      return { ...mockSnapshot, source: 'mock', lastSyncAt: null };
    }

    // Connected but sync hasn't run yet (no positions in connection_data)
    const positions = ibRow?.connection_data?.last_positions;
    if (!positions || positions.length === 0) {
      return { ...mockSnapshot, source: 'mock', lastSyncAt: ibLastSyncAt };
    }

    const holdings = transformPositions(positions);
    const accountSummary = ibRow?.connection_data?.last_account_summary;
    const lastSyncAt = ibRow?.last_sync_at ?? ibLastSyncAt;
    const snapshot = buildSnapshot(holdings, accountSummary, lastSyncAt, range);

    return { ...snapshot, source: 'live', lastSyncAt };
  }, [isConnected, ibLoading, queryLoading, mockSnapshot, ibRow, ibLastSyncAt, range]);
}
