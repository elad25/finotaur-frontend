/**
 * FundamentalsTable — two-column label/value table for key financial metrics.
 *
 * Renders em-dash for null values. Uses Intl.NumberFormat for large numbers.
 * No inline styles; Tailwind only.
 */

import type { SeoTickerFundamentals } from '@/lib/seo/types';

interface FundamentalsTableProps {
  fundamentals: SeoTickerFundamentals;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatLargeNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) {
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 1e12)}T`;
  }
  if (abs >= 1e9) {
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 1e9)}B`;
  }
  if (abs >= 1e6) {
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 1e6)}M`;
  }
  return `$${new Intl.NumberFormat('en-US').format(n)}`;
}

function formatDecimal(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

const DASH = '—'; // em-dash

// ---------------------------------------------------------------------------
// Row builder helpers
// ---------------------------------------------------------------------------

function largeOrDash(n: number | null): string {
  return n != null ? formatLargeNumber(n) : DASH;
}

function decimalOrDash(n: number | null, prefix = '', suffix = '', decimals = 2): string {
  if (n == null) return DASH;
  return `${prefix}${formatDecimal(n, decimals)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FundamentalsTable({ fundamentals: f }: FundamentalsTableProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Revenue (TTM)', value: largeOrDash(f.revenue) },
    { label: 'Net Income (TTM)', value: largeOrDash(f.netIncome) },
    { label: 'EPS (TTM)', value: decimalOrDash(f.eps, '$') },
    { label: 'P/E Ratio', value: decimalOrDash(f.pe, '', 'x') },
    { label: 'Return on Equity', value: decimalOrDash(f.roe != null ? f.roe * 100 : null, '', '%') },
    { label: 'Debt-to-Equity', value: decimalOrDash(f.debtToEquity) },
    { label: 'Dividend per Share', value: decimalOrDash(f.dividendPerShare, '$') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="border-b border-white/[0.08] px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          Fundamentals
        </h2>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(({ label, value }, idx) => (
            <tr
              key={label}
              className={
                idx % 2 === 0
                  ? 'bg-white/[0.02]'
                  : 'bg-transparent'
              }
            >
              <td className="px-5 py-3 text-sm text-white/60">{label}</td>
              <td className="px-5 py-3 text-right font-mono text-sm tabular-nums text-white">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
