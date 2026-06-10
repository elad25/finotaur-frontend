// src/services/benchmarks.api.ts
// =====================================================
// BENCHMARKS — API Service (COPILOT Portfolio-vs-market comparison)
// =====================================================
// Returns daily close series for S&P 500 (SPY proxy) and NASDAQ (QQQ proxy)
// for a COPILOT time range, so MarketComparisonChart can plot Portfolio vs
// S&P 500 vs NASDAQ.
//
// Source: the existing ungated ETF-compare endpoint via fetchCompareBars
// (GET /api/etf/compare/bars). Those daily bars are maintained in Supabase
// (etf_compare_bars) by the ETF-compare cron, so this path never hits Yahoo
// per-request — Railway IPs are Yahoo-blocked, so a direct server fetch would
// return nothing.
//
// Never throws to the UI — returns empty arrays on any error (the chart then
// degrades to a portfolio-only line).
// =====================================================

import type { TimeRange } from '@/pages/app/ai/copilot/hooks/usePortfolioData';
import type { OhlcBar } from '@/types/etf.types';
import { fetchCompareBars, type EtfBarsRange } from '@/services/etf-analyzer.api';

export interface BenchPoint {
  date: string;
  value: number;
}

export interface BenchmarksResponse {
  range: string;
  sp500: BenchPoint[];
  nasdaq: BenchPoint[];
}

// COPILOT TimeRange → ETF-compare EtfBarsRange. YTD pulls 1Y then slices to Jan 1.
const RANGE_MAP: Record<TimeRange, EtfBarsRange> = {
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  YTD: '1Y',
  '1Y': '1Y',
  ALL: '5Y',
};

function ytdStart(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

/**
 * OhlcBar[] → ascending BenchPoint[]. The compare endpoint returns `t` as a
 * millisecond epoch (the OhlcBar type declares string, but the wire value is a
 * number), so coerce defensively and accept ISO strings too. `fromDate` filters
 * to a range start (used for YTD).
 */
function toPoints(bars: OhlcBar[], fromDate: string | null): BenchPoint[] {
  const points: BenchPoint[] = [];
  for (const b of bars) {
    if (b.c == null) continue;
    const ms = Number(b.t);
    const d = Number.isFinite(ms) ? new Date(ms) : new Date(b.t);
    if (Number.isNaN(d.getTime())) continue;
    const date = d.toISOString().slice(0, 10);
    if (fromDate && date < fromDate) continue;
    points.push({ date, value: b.c });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

export async function fetchBenchmarks(range: TimeRange): Promise<BenchmarksResponse> {
  const empty: BenchmarksResponse = { range, sp500: [], nasdaq: [] };
  const mapped = RANGE_MAP[range];
  const fromDate = range === 'YTD' ? ytdStart() : null;

  try {
    const [spy, qqq] = await Promise.all([
      fetchCompareBars('SPY', mapped).catch(() => [] as OhlcBar[]),
      fetchCompareBars('QQQ', mapped).catch(() => [] as OhlcBar[]),
    ]);
    return {
      range,
      sp500: toPoints(spy, fromDate),
      nasdaq: toPoints(qqq, fromDate),
    };
  } catch {
    return empty;
  }
}
