// src/pages/app/etfs/format.ts
// =====================================================
// ETF ANALYZER — shared formatter helpers
// =====================================================
// Unit conventions (MUST remain consistent across all tabs):
//   fmtPct(v)          — v is ALREADY in percent units (e.g. 12.34 → "+12.34%")
//   fmtReturn(v)       — v is ALREADY in percent units (same as fmtPct but no `decimals` param)
//   fmtExpenseRatio(v) — v is a DECIMAL (e.g. 0.0003 → "0.03%"); multiplies by 100 internally
//   dividendYield from API is a DECIMAL → pass as (dividendYield * 100) to fmtPct
// =====================================================

export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

export function fmtReturn(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  const prefix = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${prefix}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  return `${prefix}$${abs.toLocaleString()}`;
}

export function fmtPrice(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return `$${v.toFixed(decimals)}`;
}

export function fmtExpenseRatio(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  // Input is a decimal (e.g. 0.0003). Output: "0.03%"
  return `${(v * 100).toFixed(2)}%`;
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
