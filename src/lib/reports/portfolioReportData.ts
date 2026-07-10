// src/lib/reports/portfolioReportData.ts
// =====================================================
// FINO REPORTS — Portfolio report, client-side data builder
// =====================================================
// Pure functions only — no React, no network. Builds the 4 Portfolio
// Report slides from the user's trades, reusing calculateBreakdown()
// (by-asset, by-direction) from useTradeStats.ts as the source of truth.
//
// Volume proxy: several brokers/asset classes don't carry a uniformly
// comparable dollar-notional field (multipliers differ by contract), so
// "volume" here is trade-count share — documented at each call site.
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import { calculateBreakdown } from '@/hooks/useTradeStats';
import type {
  AllocationSlice,
  ConcentrationSymbol,
  DirectionStats,
  PortfolioReportData,
  ReportSlide,
  SymbolEdgeRow,
  TakeawaySlideInput,
} from './reportTypes';

export const PORTFOLIO_REPORT_SLIDES: ReportSlide[] = [
  { key: 'allocation', title: 'Allocation' },
  { key: 'long-short', title: 'Long vs Short' },
  { key: 'concentration', title: 'Concentration' },
  { key: 'symbol-edge', title: 'Symbol Edge' },
];

export const PORTFOLIO_REPORT_MIN_TRADES = 60;
const MIN_SYMBOL_EDGE_TRADES = 5;

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

function buildAllocation(trades: Trade[]): { byAssetClass: AllocationSlice[]; topSymbols: AllocationSlice[] } {
  const total = trades.length || 1;

  const assetMap = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const key = t.asset_class || 'Unknown';
    if (!assetMap.has(key)) assetMap.set(key, []);
    assetMap.get(key)!.push(t);
  });
  const byAssetClass: AllocationSlice[] = Array.from(assetMap.entries())
    .map(([key, group]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      pnl: round2(group.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0)),
      tradeShare: round1((group.length / total) * 100),
      tradeCount: group.length,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  const symbolMap = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const key = t.symbol || 'Unknown';
    if (!symbolMap.has(key)) symbolMap.set(key, []);
    symbolMap.get(key)!.push(t);
  });
  const topSymbols: AllocationSlice[] = Array.from(symbolMap.entries())
    .map(([key, group]) => ({
      key,
      label: key,
      pnl: round2(group.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0)),
      tradeShare: round1((group.length / total) * 100),
      tradeCount: group.length,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 8);

  return { byAssetClass, topSymbols };
}

function buildDirection(trades: Trade[]): DirectionStats[] {
  const breakdown = calculateBreakdown(trades).byDirection;
  return breakdown
    .filter((d) => d.name === 'LONG' || d.name === 'SHORT')
    .map((d) => ({
      direction: d.name as 'LONG' | 'SHORT',
      trades: d.stats.totalTrades,
      winRate: round1(d.stats.winRate),
      netPnl: round2(d.stats.netPnL),
      expectancy: round2(d.stats.expectancy),
    }));
}

function buildConcentration(topSymbols: AllocationSlice[], totalTrades: number): {
  symbols: ConcentrationSymbol[];
  top5SharePct: number;
  warning: boolean;
} {
  const symbols: ConcentrationSymbol[] = topSymbols.slice(0, 5).map((s) => ({
    symbol: s.label,
    tradeCount: s.tradeCount,
    volumeSharePct: s.tradeShare,
  }));
  const top5SharePct = round1(symbols.reduce((sum, s) => sum + s.volumeSharePct, 0));
  return { symbols, top5SharePct, warning: top5SharePct > 60 };
}

function buildSymbolEdge(trades: Trade[]): { best: SymbolEdgeRow[]; worst: SymbolEdgeRow[] } {
  const byAsset = calculateBreakdown(trades).byAsset.filter((a) => a.stats.totalTrades >= MIN_SYMBOL_EDGE_TRADES);
  const rows: SymbolEdgeRow[] = byAsset.map((a) => ({
    symbol: a.name,
    trades: a.stats.totalTrades,
    expectancy: round2(a.stats.expectancy),
    winRate: round1(a.stats.winRate),
  }));
  const sorted = [...rows].sort((a, b) => b.expectancy - a.expectancy);
  return {
    best: sorted.slice(0, 3),
    worst: sorted.slice(-3).reverse().filter((r) => !sorted.slice(0, 3).includes(r)),
  };
}

export function buildPortfolioReportData(trades: Trade[]): PortfolioReportData {
  const { byAssetClass, topSymbols } = buildAllocation(trades);
  const direction = buildDirection(trades);
  const concentration = buildConcentration(topSymbols, trades.length);
  const symbolEdge = buildSymbolEdge(trades);

  return { byAssetClass, topSymbols, direction, concentration, symbolEdge };
}

export function buildPortfolioTakeawayInputs(data: PortfolioReportData): TakeawaySlideInput[] {
  const byKey: Record<string, Record<string, unknown>> = {
    allocation: {
      byAssetClass: data.byAssetClass.map((a) => ({ key: a.key, pnl: a.pnl, tradeShare: a.tradeShare })),
      topSymbols: data.topSymbols.slice(0, 5).map((s) => ({ key: s.key, pnl: s.pnl, tradeShare: s.tradeShare })),
    },
    'long-short': {
      direction: data.direction,
    },
    concentration: {
      top5SharePct: data.concentration.top5SharePct,
      warning: data.concentration.warning,
    },
    'symbol-edge': {
      best: data.symbolEdge.best,
      worst: data.symbolEdge.worst,
    },
  };

  return PORTFOLIO_REPORT_SLIDES.map((s) => ({
    key: s.key,
    title: s.title,
    stats: byKey[s.key] ?? {},
  }));
}

// ---------------------------------------------------------------------------
// Deterministic fallback takeaway text — used whenever the AI layer hasn't
// responded. The report must read as complete without any AI copy.
// ---------------------------------------------------------------------------

export function buildPortfolioFallbackText(data: PortfolioReportData): Record<string, string> {
  const topAsset = [...data.byAssetClass].sort((a, b) => b.tradeCount - a.tradeCount)[0];
  const long = data.direction.find((d) => d.direction === 'LONG');
  const short = data.direction.find((d) => d.direction === 'SHORT');
  const topSymbol = data.concentration.symbols[0];
  const bestEdge = data.symbolEdge.best[0];

  return {
    allocation: topAsset
      ? `${topAsset.label} makes up the largest share of your activity at ${topAsset.tradeShare}% of trades.`
      : 'Not enough data yet to break down your allocation.',
    'long-short': long && short
      ? `Long trades: ${long.winRate.toFixed(1)}% win rate. Short trades: ${short.winRate.toFixed(1)}% win rate.`
      : 'Trade both directions to unlock a long vs. short comparison.',
    concentration: topSymbol
      ? data.concentration.warning
        ? `Your top 5 symbols make up ${data.concentration.top5SharePct}% of your trade volume — a concentrated book.`
        : `Your top symbol, ${topSymbol.symbol}, accounts for ${topSymbol.volumeSharePct}% of your trade volume — a healthy spread.`
      : 'Not enough data yet to assess concentration.',
    'symbol-edge': bestEdge
      ? `${bestEdge.symbol} is your strongest edge at ${bestEdge.expectancy.toFixed(2)}R expectancy over ${bestEdge.trades} trades.`
      : 'Log at least 5 trades on a symbol to see its edge here.',
  };
}
