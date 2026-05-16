// src/pages/app/ai/copilot/hooks/usePortfolioMockData.ts
// =====================================================
// 🪙 Mock portfolio data for Phase 1
// =====================================================
// Future: replaced by real broker adapter (IBKR, etc.).
// Shape is the stable contract — components only depend on this.
// =====================================================

import { useMemo } from 'react';

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

const HOLDINGS: Holding[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, avgCost: 165.20, marketPrice: 189.45, marketValue: 9472.50, unrealizedPnl: 1212.50, unrealizedPnlPercent: 14.68 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: 25, avgCost: 420.80, marketPrice: 612.30, marketValue: 15307.50, unrealizedPnl: 4787.50, unrealizedPnlPercent: 45.51 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgCost: 340.10, marketPrice: 412.85, marketValue: 12385.50, unrealizedPnl: 2182.50, unrealizedPnlPercent: 21.39 },
  { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 15, avgCost: 245.00, marketPrice: 198.50, marketValue: 2977.50, unrealizedPnl: -697.50, unrealizedPnlPercent: -18.98 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: 20, avgCost: 145.30, marketPrice: 178.40, marketValue: 3568.00, unrealizedPnl: 662.00, unrealizedPnlPercent: 22.78 },
  { symbol: 'META', name: 'Meta Platforms Inc.', quantity: 18, avgCost: 320.50, marketPrice: 478.20, marketValue: 8607.60, unrealizedPnl: 2838.60, unrealizedPnlPercent: 49.20 },
];

// Generate a realistic-looking series for a given range.
// Deterministic — uses sine/noise function on day index.
function generateSeries(days: number, endValue: number): PerformancePoint[] {
  const points: PerformancePoint[] = [];
  const startValue = endValue * 0.88; // start ~12% below
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const progress = (days - i) / days;
    // Smooth growth + sine wobble
    const noise = Math.sin(i * 0.35) * (endValue * 0.015) + Math.sin(i * 0.08) * (endValue * 0.025);
    const value = startValue + (endValue - startValue) * progress + noise;
    points.push({ date: date.toISOString().slice(0, 10), value: Math.round(value * 100) / 100 });
  }
  return points;
}

const RANGE_DAYS: Record<TimeRange, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  'YTD': 130, // approx (assume mid-year)
  '1Y': 365,
  'ALL': 730,
};

export function usePortfolioMockData(range: TimeRange) {
  return useMemo<PortfolioSnapshot>(() => {
    const totalValue = HOLDINGS.reduce((sum, h) => sum + h.marketValue, 0);
    const series = generateSeries(RANGE_DAYS[range], totalValue);
    const startValue = series[0]?.value ?? totalValue;
    const changeAbs = totalValue - startValue;
    const changePercent = startValue > 0 ? ((totalValue - startValue) / startValue) * 100 : 0;
    return {
      totalValue,
      changeAbs,
      changePercent,
      holdings: HOLDINGS,
      series,
    };
  }, [range]);
}
