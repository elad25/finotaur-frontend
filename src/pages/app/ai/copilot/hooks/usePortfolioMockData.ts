// src/pages/app/ai/copilot/hooks/usePortfolioMockData.ts
// =====================================================
// Portfolio data type contract.
// =====================================================
// This module is the stable shape contract that portfolio components depend
// on. It carries NO data — real portfolio data comes from usePortfolioData
// (live IB positions). The previous hardcoded mock holdings were removed so
// no fabricated portfolio values can ever reach the UI.
// =====================================================

export type TimeRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;       // dollars
  unrealizedPnlPercent: number; // percent (e.g. 12.5 = +12.5%)
  /** IB AssetClass code: 'STK', 'OPT', 'CASH', 'FUT', 'BOND', etc. Absent on mock holdings. */
  assetClass?: string;
}

export interface PerformancePoint {
  date: string; // ISO date e.g. '2026-04-12'
  value: number; // portfolio total value at that point
}

export interface PortfolioSnapshot {
  totalValue: number;
  changeAbs: number;    // dollars change over selected range
  changePercent: number; // percent change over selected range
  holdings: Holding[];
  series: PerformancePoint[];
}

/** An honest empty portfolio — zero values, no positions, no synthetic series.
 *  Used by usePortfolioData before live IB data is available. The UI gates on
 *  `source === 'live'` and shows a connect/sync state instead of these zeros. */
export const EMPTY_SNAPSHOT: PortfolioSnapshot = {
  totalValue: 0,
  changeAbs: 0,
  changePercent: 0,
  holdings: [],
  series: [],
};
