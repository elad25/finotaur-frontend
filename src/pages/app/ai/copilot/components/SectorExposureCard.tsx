// src/pages/app/ai/copilot/components/SectorExposureCard.tsx
// =====================================================
// ASSET ALLOCATION card — donut chart grouping holdings by assetClass.
// Follows the same pattern as AssetClassAllocationCard (Recharts PieChart).
// Center label: holdings count + "Holdings".
// Right-side legend with coloured dots.
// =====================================================

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';

// ─── Palette — monochrome gold ramp (design system forbids green) ────────────
// Ranked by slice dominance: chartData is sorted largest-first, so index 0
// (the largest slice) gets the brightest gold and each subsequent rank steps
// down through darker gold/neutral tones.

const GOLD_RAMP: string[] = ['#E8C766', '#C9A646', '#A88838', '#7A6528', '#4d4224', '#2e2a1c'];

const colourForIndex = (index: number): string =>
  GOLD_RAMP[index] ?? GOLD_RAMP[GOLD_RAMP.length - 1];

// ─── Map assetClass codes to display labels (same as AssetClassAllocationCard) ─

function bucketAssetClass(cls: string | undefined): string {
  const c = (cls ?? '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'Equities';
  if (c === 'ETF')                                      return 'ETFs';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS')   return 'Options';
  if (c === 'FUT' || c === 'FUTURES')                   return 'Futures';
  if (c === 'BOND' || c === 'BONDS')                    return 'Bonds';
  if (c === 'CASH' || c === 'FOREX')                    return 'Cash';
  if (c === 'CRYPTO' || c === 'COIN')                   return 'Crypto';
  if (c === 'CMDTY' || c === 'COMMODITIES')             return 'Commodities';
  return 'Other';
}

// ─── Recharts Tooltip ─────────────────────────────────────────────────────────

interface PiePayloadItem {
  name: string;
  value: number;
  payload: { name: string; value: number; pct: number };
}

function SectorTooltip({ active, payload }: { active?: boolean; payload?: PiePayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-0.5">
      <p className="font-medium text-ink-primary">{item.name}</p>
      <p className="text-ink-tertiary">{item.payload.pct.toFixed(1)}%</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SectorExposureCard({ snapshot, className }: Props) {
  const total = snapshot.totalValue || 1;
  const holdingsCount = snapshot.holdings.length;

  // Aggregate by asset-class bucket.
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketAssetClass(h.assetClass);
    groups.set(label, (groups.get(label) ?? 0) + Math.max(h.marketValue, 0));
  }

  const chartData = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }));

  const isEmpty = chartData.length === 0;

  return (
    <PremiumFrame className={`flex flex-col h-full min-h-[280px] ${className ?? ''}`}>
      {/* pb-14 reserves space for footer */}
      <div className="flex flex-col flex-1 p-5 pb-14">
        {/* Header pinned at top */}
        <p className="text-[10px] uppercase tracking-[0.12em] text-gold-primary font-semibold">
          ASSET ALLOCATION
        </p>

        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-[11px] text-ink-tertiary text-center py-4">
              No positions to display.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {/* Donut — centered, larger */}
            <div
              className="relative flex-none"
              style={{ width: 240, height: 240 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={110}
                    paddingAngle={2}
                    cornerRadius={4}
                    strokeWidth={0}
                    stroke="transparent"
                    label={false}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={entry.name} fill={colourForIndex(i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => (
                      <SectorTooltip
                        active={props.active as boolean | undefined}
                        payload={props.payload as PiePayloadItem[] | undefined}
                      />
                    )}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">
                  Total Assets
                </span>
                <span className="font-mono text-2xl font-semibold leading-tight text-ink-primary tabular-nums">
                  {holdingsCount}
                </span>
                <span className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">
                  Holdings
                </span>
              </div>
            </div>

            {/* Legend — centered wrap row below donut */}
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {chartData.slice(0, 6).map((item, i) => (
                <li key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-[2px] flex-none"
                    style={{ width: 8, height: 8, background: colourForIndex(i) }}
                  />
                  <span className="text-[11px] text-ink-secondary">
                    {item.name}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-ink-primary tabular-nums">
                    {item.pct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <Link
        to="/copilot/macro"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary transition-colors hover:bg-gold-primary/15"
      >
        View Full Breakdown <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
