// src/pages/app/ai/copilot/components/AssetClassAllocationCard.tsx
// =====================================================
// ALLOCATION card — asset-class donut with a left-side vertical legend.
// Uses recharts PieChart + Pie (thick donut, no floating labels).
// Multi-colour palette overrides ADL-020 per explicit user request.
// =====================================================

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

function formatDollarFull(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Recharts Tooltip ─────────────────────────────────────────────────────────

interface PieTooltipPayloadItem {
  name: string;
  value: number;
  payload: { name: string; value: number; pct: number };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayloadItem[];
  hideValues: boolean;
}

function AllocationTooltip({ active, payload, hideValues }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-0.5">
      <p className="font-medium text-ink-primary">{item.name}</p>
      <p className="text-ink-secondary">
        {hideValues ? '**********' : formatDollarFull(item.value)}
      </p>
      <p className="text-ink-tertiary">{item.payload.pct.toFixed(1)}%</p>
    </div>
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
    >
      <span className="font-mono text-sm leading-tight text-gold-primary">
        {hideValues ? '**********' : totalDisplay}
      </span>
      <span className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">TOTAL</span>
    </div>
  );
}

// ─── Vertical legend ─────────────────────────────────────────────────────────

interface LegendItem {
  name: string;
  pct: number;
  colour: string;
}

function VerticalLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex shrink-0 flex-col gap-3 min-w-[96px]">
      {items.map((item) => (
        <li key={item.name} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-[2px]"
              style={{ width: 9, height: 9, background: item.colour, flexShrink: 0 }}
            />
            <span className="text-[12px] text-ink-secondary">{item.name}</span>
          </div>
          <span className="pl-[13.5px] text-[11px] font-bold text-ink-primary">
            {item.pct.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
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

  const legendItems: LegendItem[] = chartData.map((d) => ({
    name: d.name,
    pct: d.pct,
    colour: colourFor(d.name),
  }));

  const totalDisplay = formatTotal(snapshot.totalValue);

  return (
    <PremiumFrame className={`min-h-[300px] ${className ?? ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="mb-4">
          <p className="text-[13px] uppercase text-gold-primary">ALLOCATION</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">by Asset Class</p>
        </div>

        {/* Content */}
        {chartData.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No positions to allocate yet.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            {/* Left: vertical legend */}
            <VerticalLegend items={legendItems} />

            {/* Right: thick donut */}
            <div className="relative flex-1" style={{ minWidth: 160, maxWidth: 260, aspectRatio: '1 / 1' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="92%"
                    paddingAngle={3}
                    cornerRadius={6}
                    strokeWidth={0}
                    stroke="transparent"
                    label={false}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={colourFor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      // recharts Tooltip passes active/payload as props — we bridge hideValues in via closure
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts content prop is loosely typed
                      (props: any) => (
                        <AllocationTooltip
                          active={props.active as boolean | undefined}
                          payload={props.payload as PieTooltipPayloadItem[] | undefined}
                          hideValues={hideValues}
                        />
                      )
                    }
                    cursor={false}
                  />
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
