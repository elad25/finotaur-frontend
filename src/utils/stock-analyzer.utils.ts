// src/utils/stock-analyzer.utils.ts
// =====================================================
// 🔧 STOCK ANALYZER — Utility Functions v2.1
// =====================================================
// v2.1 FIXES:
//   ✅ isValid() now allows negative values (for negative P/E, FCF Yield)
//   ✅ Added isValidOrNeg() for metrics that can be legitimately negative
// =====================================================

import type { StockData } from '@/types/stock-analyzer.types';
import { C } from '@/constants/stock-analyzer.constants';

// =====================================================
// FORMATTERS
// =====================================================

export function fmt(
  n: number | null | undefined,
  opts?: { decimals?: number; prefix?: string; suffix?: string; compact?: boolean }
): string {
  if (n == null || isNaN(n)) return 'N/A';
  const { decimals = 1, prefix = '', suffix = '', compact = false } = opts || {};
  if (compact) {
    if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(decimals)}T${suffix}`;
    if (Math.abs(n) >= 1e9) return `${prefix}${(n / 1e9).toFixed(decimals)}B${suffix}`;
    if (Math.abs(n) >= 1e6) return `${prefix}${(n / 1e6).toFixed(decimals)}M${suffix}`;
    if (Math.abs(n) >= 1e3) return `${prefix}${(n / 1e3).toFixed(decimals)}K${suffix}`;
  }
  return `${prefix}${n.toFixed(decimals)}${suffix}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'N/A';
  return `${n.toFixed(1)}%`;
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'N/A';
  return `$${n.toFixed(2)}`;
}

export function fmtBig(n: number | null | undefined): string {
  return fmt(n, { prefix: '$', compact: true });
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if value is valid for display (excludes null, NaN, and zero)
 * Use for metrics where 0 is meaningless (most ratios, margins)
 */
export function isValid(v: any): boolean {
  return v != null && v !== 'N/A' && !isNaN(v) && v !== 0;
}

/**
 * Check if value is valid INCLUDING negative values
 * Use for metrics that can be legitimately negative:
 * - P/E (loss-making companies)
 * - FCF Yield (cash-burning companies)
 * - EPS Growth (declining earnings)
 * - Net Margin (unprofitable)
 */
export function isValidOrNeg(v: any): boolean {
  return v != null && v !== 'N/A' && !isNaN(v);
}

// =====================================================
// ANALYSIS GENERATORS
// =====================================================

export function generateInvestmentThesis(data: StockData): string {
  const pts: string[] = [];
  if (isValid(data.revenueGrowth) && data.revenueGrowth! > 10) pts.push(`strong revenue growth of ${data.revenueGrowth!.toFixed(1)}%`);
  else if (isValid(data.revenueGrowth) && data.revenueGrowth! > 0) pts.push(`steady revenue growth of ${data.revenueGrowth!.toFixed(1)}%`);
  if (isValid(data.grossMargin) && data.grossMargin! > 50) pts.push(`high gross margins at ${data.grossMargin!.toFixed(0)}%`);
  if (isValid(data.roe) && data.roe! > 20) pts.push(`excellent capital efficiency (ROE: ${data.roe!.toFixed(0)}%)`);
  if (isValid(data.dividendYield) && data.dividendYield! > 1) pts.push(`reliable income stream (${data.dividendYield!.toFixed(2)}% yield)`);
  if (isValid(data.debtToEquity) && data.debtToEquity! < 0.5) pts.push('a conservative balance sheet');
  if (pts.length === 0) return `${data.name} operates in the ${data.industry} sector with a market capitalization of ${fmtBig(data.marketCap)}.`;
  return `${data.name} presents an investment case built on ${pts.slice(0, 3).join(', ')}${pts.length > 3 ? ', among other strengths' : ''}.`;
}

export function generateSignal(data: StockData): { signal: string; color: string } {
  let s = 0;
  if (isValid(data.revenueGrowth) && data.revenueGrowth! > 5) s++;
  if (isValid(data.revenueGrowth) && data.revenueGrowth! > 15) s++;
  if (isValid(data.grossMargin) && data.grossMargin! > 40) s++;
  if (isValid(data.roe) && data.roe! > 15) s++;
  if (isValid(data.pe) && data.pe! < 25 && data.pe! > 0) s++;
  if (isValid(data.debtToEquity) && data.debtToEquity! < 1) s++;
  if (isValid(data.netMargin) && data.netMargin! > 10) s++;
  if (data.analystRating?.toLowerCase().includes('buy')) s++;
  if (isValid(data.revenueGrowth) && data.revenueGrowth! < -5) s -= 2;
  if (isValid(data.pe) && data.pe! > 50) s--;
  if (isValid(data.debtToEquity) && data.debtToEquity! > 3) s--;
  if (s >= 5) return { signal: 'Strong Opportunity', color: C.green };
  if (s >= 3) return { signal: 'Favorable Outlook', color: C.green };
  if (s >= 1) return { signal: 'Neutral / Monitor', color: C.amber };
  return { signal: 'Caution Advised', color: C.red };
}

export function getBusinessModelType(data: StockData): { type: string; recurring: string; sensitivity: string } {
  const sec = data.sector.toLowerCase();
  const ind = data.industry.toLowerCase();
  if (ind.includes('software') || ind.includes('saas') || sec.includes('technology'))
    return { type: 'Mixed (Product + Services)', recurring: 'High', sensitivity: 'Medium' };
  if (sec.includes('consumer defensive') || ind.includes('household'))
    return { type: 'Recurring (Consumer Staples)', recurring: 'Very High', sensitivity: 'Low' };
  if (sec.includes('financial') || ind.includes('bank'))
    return { type: 'Fee-Based / Interest Income', recurring: 'High', sensitivity: 'High' };
  if (sec.includes('healthcare') || ind.includes('pharma'))
    return { type: 'Mixed (Patented + Generic)', recurring: 'High', sensitivity: 'Low' };
  if (sec.includes('energy'))
    return { type: 'Commodity / Cyclical', recurring: 'Low', sensitivity: 'Very High' };
  if (sec.includes('consumer cyclical'))
    return { type: 'Transaction-Based', recurring: 'Medium', sensitivity: 'High' };
  if (sec.includes('real estate'))
    return { type: 'Rental / Lease Income', recurring: 'Very High', sensitivity: 'Medium' };
  if (sec.includes('utilities'))
    return { type: 'Regulated Utility', recurring: 'Very High', sensitivity: 'Low' };
  if (sec.includes('communication'))
    return { type: 'Subscription + Advertising', recurring: 'High', sensitivity: 'Medium' };
  return { type: 'Mixed', recurring: 'Medium', sensitivity: 'Medium' };
}