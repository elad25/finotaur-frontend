import { PremiumFrame } from '../PremiumFrame';
import { PanelHeader } from './_shared';
import type { PortfolioSnapshot } from '../../hooks/usePortfolioData';

/** Map IB AssetClass codes to human-readable display labels for the allocation panel. */
function bucketAssetClass(cls: string | undefined): string {
  const c = (cls || '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'EQUITIES';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS') return 'OPTIONS';
  if (c === 'FUT' || c === 'FUTURES') return 'FUTURES';
  if (c === 'BOND' || c === 'BONDS') return 'BONDS';
  if (c === 'CASH' || c === 'FOREX') return 'CASH';
  if (c === 'CMDTY' || c === 'COMMODITIES') return 'COMMODITIES';
  return 'OTHER';
}

// Palette for allocation donut / sector bars — gold variants + neutrals (design system ADL-020, no green).
const ALLOC_PALETTE: Array<{ swatch: string; conic: string }> = [
  { swatch: 'bg-[#f4d97b]',      conic: '#f4d97b' },
  { swatch: 'bg-[#c9a646]',      conic: '#c9a646' },
  { swatch: 'bg-[#a98220]',      conic: '#a98220' },
  { swatch: 'bg-[#7a5e16]',      conic: '#7a5e16' },
  { swatch: 'bg-[#4a3a0e]',      conic: '#4a3a0e' },
  { swatch: 'bg-white/15',       conic: 'rgba(255,255,255,0.15)' },
];

/** Build a CSS conic-gradient string from a list of (label, percent) rows. */
function buildConicGradient(rows: Array<[string, number]>): string {
  if (rows.length === 0) return 'rgba(255,255,255,0.13)';
  let cursor = 0;
  const stops: string[] = [];
  rows.forEach(([_, pct], i) => {
    const color = ALLOC_PALETTE[i % ALLOC_PALETTE.length].conic;
    const start = cursor;
    cursor += pct;
    stops.push(`${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function AllocationPanel({
  className,
  snapshot,
  isConnected,
}: {
  className?: string;
  snapshot: PortfolioSnapshot;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <PremiumFrame className={`min-h-[210px] ${className}`}>
        <div className="p-5">
          <PanelHeader title="HOLDINGS" action="VIEW ALL" actionTo="/app/ai/copilot/holdings" />
          <div className="mt-4 flex min-h-[120px] items-center justify-center">
            <span className="text-[13px] text-ink-tertiary">Connect a broker to see your holdings</span>
          </div>
        </div>
      </PremiumFrame>
    );
  }

  const total = snapshot.totalValue || 1;
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketAssetClass(h.assetClass);
    groups.set(label, (groups.get(label) || 0) + h.marketValue);
  }
  let rows: Array<[string, number]> = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, val]) => [label, (val / total) * 100]);
  if (rows.length === 0) rows = [['CASH', 100]]; // defensive: empty holdings

  let totalDisplay: string;
  if (snapshot.totalValue >= 1_000_000) {
    totalDisplay = `$${(snapshot.totalValue / 1_000_000).toFixed(2)}M`;
  } else if (snapshot.totalValue >= 10_000) {
    totalDisplay = `$${(snapshot.totalValue / 1_000).toFixed(1)}K`;
  } else {
    totalDisplay = `$${snapshot.totalValue.toFixed(2)}`;
  }

  const conic = buildConicGradient(rows);

  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="HOLDINGS" action="VIEW ALL" actionTo="/app/ai/copilot/holdings" />
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-28 w-28 rounded-full p-4" style={{ background: conic }}>
            <div className="h-full w-full rounded-full bg-[#080704] flex flex-col items-center justify-center">
              <span className="font-mono text-sm text-gold-primary">{totalDisplay}</span>
              <span className="text-[9px] uppercase text-ink-tertiary">TOTAL</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {rows.map(([label, pct], i) => (
              <div key={label} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[11px]">
                <span className={`h-2 w-2 ${ALLOC_PALETTE[i % ALLOC_PALETTE.length].swatch}`} />
                <span className="text-ink-secondary">{label}</span>
                <span className="font-mono text-ink-primary">{pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumFrame>
  );
}
