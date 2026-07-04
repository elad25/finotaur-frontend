// src/pages/app/etfs/format.ts
// =====================================================
// ETF ANALYZER — shared formatter helpers
// =====================================================
// Unit conventions (MUST remain consistent across all tabs):
//
//   fmtReturn(v)       — v is a DECIMAL fraction from the API (e.g. 0.28 → "+28.00%")
//   fmtPct(v)          — v is a DECIMAL fraction from the API (e.g. 0.0097 → "+0.97%")
//   fmtExpenseRatio(v) — v is a DECIMAL fraction (e.g. 0.0009 → "0.09%")
//
//   All three helpers multiply by 100 internally. Do NOT pre-multiply at the
//   call site; passing (v * 100) would double-scale and produce wrong output.
//
//   Plain ratios (beta, sharpe, sortino, rSquared) and prices (week52High/Low,
//   NAV, closePrice) are NOT percents — use toFixed(2) or fmtPrice directly,
//   NOT these helpers.
// =====================================================

export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  const pct = v * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
}

export function fmtReturn(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const pct = v * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  const prefix = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${prefix}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  return `${prefix}$${abs.toLocaleString('en-US')}`;
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
