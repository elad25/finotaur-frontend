// src/pages/app/ai/copilot/components/AssetClassAllocationCard.tsx
// =====================================================
// ALLOCATION card — asset-class donut with pointing slice labels.
// Uses recharts PieChart + Pie (innerRadius = donut) with a custom
// label renderer that draws a callout line + "ClassName N.N%".
// Multi-colour palette overrides ADL-020 per explicit user request.
// =====================================================

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useValuePrivacy } from '../hooks/useValuePrivacy';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';

// ─── Palette — per-asset-class colours (user-approved override of ADL-020) ───

// Six solid-but-colourful base colours (per Elad 2026-06-11: blue, green,
// red + three more — colourful, not grey) covering all asset classes;
// Futures/Commodities use darker shades of the blue/orange bases.
const CLASS_COLOURS: Record<string, string> = {
  Equities:    '#C9A646',             // gold — brand anchor
  ETFs:        '#4F7FCC',             // solid blue
  Cash:        '#4F9D6B',             // solid green
  Options:     '#C25450',             // solid red
  Bonds:       '#7E6BB8',             // solid purple
  Crypto:      '#D08A4A',             // solid orange
  Futures:     '#3A5F99',             // deep blue (blue-family shade)
  Commodities: '#A66A33',             // deep amber (orange-family shade)
  Other:       'rgba(255,255,255,0.30)',
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

function formatTotal(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000)    return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// ─── Custom label renderer ────────────────────────────────────────────────────

/**
 * Renders a short leader line from the slice midpoint to a callout text
 * showing "ClassName N.N%". The line bends via two SVG line segments:
 * outer ring → elbow → text anchor.
 */
function renderCustomLabel(props: PieLabelRenderProps) {
  const {
    cx, cy,
    midAngle,
    innerRadius,
    outerRadius,
    name,
    percent,
  } = props;

  // recharts types innerRadius/outerRadius as number | string — narrow safely
  const ir = typeof innerRadius === 'number' ? innerRadius : 0;
  const or = typeof outerRadius === 'number' ? outerRadius : 0;
  const cxN = typeof cx === 'number' ? cx : 0;
  const cyN = typeof cy === 'number' ? cy : 0;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);

  // Point on the outer edge of the slice
  const sx = cxN + (or + 2) * cos;
  const sy = cyN + (or + 2) * sin;

  // Elbow point
  const mx = cxN + (or + 22) * cos;
  const my = cyN + (or + 22) * sin;

  // Horizontal end of the leader line
  const ex = mx + (cos >= 0 ? 1 : -1) * 16;
  const ey = my;

  const textAnchor = cos >= 0 ? 'start' : 'end';
  const pct = typeof percent === 'number' ? (percent * 100).toFixed(1) : '0.0';
  const labelText = `${name as string} ${pct}%`;

  // Skip rendering for tiny slivers (< 1%) to avoid label collision
  if (typeof percent === 'number' && percent < 0.01) return null;

  // For very small slices shorten the leader line
  const leaderLen = or - ir;
  const useShortLine = leaderLen < 8;

  if (useShortLine) {
    return (
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill="rgba(255,255,255,0.72)"
        fontSize={11}
      >
        {labelText}
      </text>
    );
  }

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill="rgba(255,255,255,0.35)" stroke="none" />
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill="rgba(255,255,255,0.72)"
        fontSize={11}
      >
        {labelText}
      </text>
    </g>
  );
}

// ─── Centered hole label (absolute overlay) ───────────────────────────────────

interface HoleLabelProps {
  totalDisplay: string;
  hideValues: boolean;
}

function HoleLabel({ totalDisplay, hideValues }: HoleLabelProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <span className="font-mono text-sm leading-tight text-gold-primary">
        {hideValues ? '****' : totalDisplay}
      </span>
      <span className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">TOTAL</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AssetClassAllocationCard({ snapshot, className }: Props) {
  const [hideValues] = useValuePrivacy();
  const total = snapshot.totalValue || 1;

  // Aggregate holdings by asset-class bucket — never exposes individual tickers.
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketAssetClass(h.assetClass);
    groups.set(label, (groups.get(label) ?? 0) + h.marketValue);
  }

  // Sort descending by value; compute percentages for recharts data array.
  const chartData = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.max(value, 0), pct: (value / total) * 100 }));

  const totalDisplay = formatTotal(snapshot.totalValue);

  return (
    <PremiumFrame className={`min-h-[300px] ${className ?? ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <p className="text-[13px] uppercase text-gold-primary">ALLOCATION</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">by Asset Class</p>
        </div>

        {/* Content */}
        {chartData.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No positions to allocate yet.
          </p>
        ) : (
          // Outer container: flex + justify-center so the chart sits in the middle
          <div className="flex justify-center">
            {/* Relative wrapper so the absolute HoleLabel overlay works */}
            <div className="relative w-full" style={{ maxWidth: 480 }}>
              <ResponsiveContainer width="100%" height={340}>
                <PieChart margin={{ top: 24, right: 60, bottom: 24, left: 60 }}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="70%"
                    strokeWidth={1}
                    stroke="#070604"
                    label={renderCustomLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={colourFor(entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <HoleLabel totalDisplay={totalDisplay} hideValues={hideValues} />
            </div>
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
