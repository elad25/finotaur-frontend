// src/pages/app/ai/copilot/components/AssetClassAllocationCard.tsx
// =====================================================
// ALLOCATION card — asset-class donut + legend.
// Replicates the image1 ALLOCATION panel using the same
// PremiumFrame + conic-gradient donut idiom as AllocationPanel
// in FinotaurCopilotDashboard.tsx, but keyed on broader
// asset-class buckets (ETF and Crypto are distinct here).
// Multi-colour palette overrides ADL-020 per explicit user request.
// =====================================================

import { PremiumFrame } from '../brief/PremiumFrame';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';

// ─── Palette — per-asset-class colours (user-approved override of ADL-020) ───

const CLASS_COLOURS: Record<string, string> = {
  Equities:    '#E6B84F',            // gold/amber
  ETFs:        '#4F8FE6',            // blue
  Cash:        '#3FBFA8',            // teal
  Bonds:       '#8B6FD6',            // purple
  Crypto:      '#E8884F',            // orange
  Options:     '#D65F9E',            // magenta
  Futures:     '#4FB8D6',            // cyan
  Commodities: '#B8884F',            // bronze
  Other:       'rgba(255,255,255,0.28)',
};

const colourFor = (label: string): string =>
  CLASS_COLOURS[label] ?? 'rgba(255,255,255,0.28)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map IB AssetClass codes → display label.
 * ETF and Crypto are distinct buckets (unlike AllocationPanel which lumps them).
 */
function bucketAssetClass(cls: string | undefined): string {
  const c = (cls ?? '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'Equities';
  if (c === 'ETF')                                     return 'ETFs';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS')   return 'Options';
  if (c === 'FUT' || c === 'FUTURES')                  return 'Futures';
  if (c === 'BOND' || c === 'BONDS')                   return 'Bonds';
  if (c === 'CASH' || c === 'FOREX')                   return 'Cash';
  if (c === 'CRYPTO' || c === 'COIN')                  return 'Crypto';
  if (c === 'CMDTY' || c === 'COMMODITIES')            return 'Commodities';
  return 'Other';
}

/** Build a CSS conic-gradient from (label, pct%) rows using per-label colours. */
function buildConicGradient(rows: Array<[string, number]>): string {
  if (rows.length === 0) return 'rgba(255,255,255,0.13)';
  let cursor = 0;
  const stops: string[] = [];
  rows.forEach(([label, pct]) => {
    const color = colourFor(label);
    const start = cursor;
    cursor += pct;
    stops.push(`${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function formatTotal(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000)    return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AssetClassAllocationCard({ snapshot, className }: Props) {
  const total = snapshot.totalValue || 1;

  // Aggregate holdings by asset-class bucket.
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketAssetClass(h.assetClass);
    groups.set(label, (groups.get(label) ?? 0) + h.marketValue);
  }

  // Sort descending by value; compute percentages.
  const rows: Array<[string, number]> = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, val]) => [label, (val / total) * 100]);

  const conic = buildConicGradient(rows);
  const totalDisplay = formatTotal(snapshot.totalValue);

  return (
    <PremiumFrame className={`min-h-[260px] ${className ?? ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="mb-4">
          <p className="text-[13px] uppercase text-gold-primary">ALLOCATION</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">by Asset Class</p>
        </div>

        {/* Content */}
        {rows.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No positions to allocate yet.
          </p>
        ) : (
          <div className="flex items-center gap-5">
            {/* Legend — left column */}
            <div className="flex-1 space-y-2">
              {rows.map(([label, pct]) => (
                <div
                  key={label}
                  className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[11px]"
                >
                  <span
                    className="h-2 w-2 rounded-[2px] inline-block flex-none"
                    style={{ background: colourFor(label) }}
                  />
                  <span className="text-ink-secondary">{label}</span>
                  <span className="font-mono text-ink-primary">{pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Donut — right side */}
            <div
              className="relative h-32 w-32 flex-none rounded-full p-4"
              style={{ background: conic }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#080704]">
                <span className="font-mono text-sm text-gold-primary">{totalDisplay}</span>
                <span className="text-[9px] uppercase text-ink-tertiary">TOTAL</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
