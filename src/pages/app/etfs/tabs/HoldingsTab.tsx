// src/pages/app/etfs/tabs/HoldingsTab.tsx
// =====================================================
// ETF ANALYZER — Holdings Tab
// =====================================================
// Shows: top holdings table (rank/ticker/name/weight + bar),
// concentration summary, sector weights, geo weights.
// Renders based on data presence — no entitlement gate.
// =====================================================

import type { ReactNode } from 'react';
import { Card } from '@/components/ds/Card';
import type { EtfData } from '@/types/etf.types';

// ─── Empty-state card (shown only when no holdings/sector/geo data present) ────

function HoldingsEmptyState() {
  return (
    <Card padding="spacious">
      <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
        Holdings
      </p>
      <p className="text-sm font-medium text-ink-secondary mb-ds-1">
        Holdings
      </p>
      <p className="text-small text-ink-tertiary">
        Holdings data is not available for this fund.
      </p>
    </Card>
  );
}

// ─── Inline weight bar ────────────────────────────────────────────────────────

function WeightBar({ pct, maxPct }: { pct: number; maxPct: number }) {
  const widthPct = maxPct > 0 ? (pct / maxPct) * 100 : 0;
  return (
    <div className="w-24 h-1.5 rounded-full bg-surface-2 overflow-hidden">
      <div
        className="h-full rounded-full bg-gold-primary opacity-70"
        style={{ width: `${widthPct.toFixed(1)}%` }}
      />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: EtfData;
}

export function HoldingsTab({ data }: Props) {
  const { holdings, concentration, fundamentals } = data;

  const sectorWeights = fundamentals?.sectorWeights ?? null;
  const geoWeights = fundamentals?.geoWeights ?? null;

  // Show empty-state only when ALL data sections are absent
  const hasHoldings = (holdings?.length ?? 0) > 0;
  const hasSectors = (sectorWeights?.length ?? 0) > 0;
  const hasGeo = (geoWeights?.length ?? 0) > 0;
  const hasConcentration = concentration != null;

  if (!hasHoldings && !hasSectors && !hasGeo && !hasConcentration) {
    return <HoldingsEmptyState />;
  }

  // Top 25, sorted desc by weight
  const topHoldings = (holdings ?? [])
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 25);

  const maxWeight = topHoldings.length > 0 ? topHoldings[0].weight : 1;

  const maxSector = sectorWeights ? Math.max(...sectorWeights.map((s) => s.weight)) : 1;
  const maxGeo = geoWeights ? Math.max(...geoWeights.map((g) => g.weight)) : 1;

  return (
    <div className="space-y-ds-6">

      {/* ── Top Holdings ──────────────────────────────────────────────── */}
      <Card padding="default">
        <SectionHeading>Top Holdings</SectionHeading>

        {topHoldings.length === 0 ? (
          <p className="text-small text-ink-tertiary">No holdings data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-ds-subtle">
                  <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary w-8">
                    #
                  </th>
                  <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Ticker
                  </th>
                  <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Name
                  </th>
                  <th className="pb-ds-2 text-right text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
                    Weight
                  </th>
                  <th className="pb-ds-2 pl-ds-3 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary hidden sm:table-cell">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {topHoldings.map((h, idx) => (
                  <tr
                    key={`${h.ticker}-${idx}`}
                    className="border-b border-border-ds-subtle/50 last:border-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-ds-2 text-ink-tertiary font-data text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-ds-2 font-data text-[12px] font-medium text-gold-primary pr-ds-2">
                      {h.ticker}
                    </td>
                    <td className="py-ds-2 text-ink-secondary text-[12px] max-w-[200px] truncate pr-ds-4">
                      {h.name}
                    </td>
                    <td className="py-ds-2 text-right font-data text-[12px] font-medium text-ink-primary tabular-nums">
                      {h.weight.toFixed(2)}%
                    </td>
                    <td className="py-ds-2 pl-ds-3 hidden sm:table-cell">
                      <WeightBar pct={h.weight} maxPct={maxWeight} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Concentration ─────────────────────────────────────────────── */}
      {concentration && (
        <Card padding="default">
          <SectionHeading>Concentration</SectionHeading>
          <div className="grid grid-cols-3 gap-ds-3">
            <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 p-ds-3">
              <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
                Top 10 Weight
              </span>
              <span className="font-data text-base font-medium text-ink-primary">
                {concentration.top10Weight !== null
                  ? `${concentration.top10Weight.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 p-ds-3">
              <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
                Effective Holdings
              </span>
              <span className="font-data text-base font-medium text-ink-primary">
                {concentration.effectiveHoldings !== null
                  ? concentration.effectiveHoldings.toFixed(0)
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[8px] bg-surface-2 p-ds-3">
              <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-ink-tertiary">
                Total Holdings
              </span>
              <span className="font-data text-base font-medium text-ink-primary">
                {concentration.count !== null ? concentration.count.toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Sector Weights ─────────────────────────────────────────────── */}
      {sectorWeights && sectorWeights.length > 0 && (
        <Card padding="default">
          <SectionHeading>Sector Allocation</SectionHeading>
          <div className="space-y-ds-2">
            {sectorWeights
              .slice()
              .sort((a, b) => b.weight - a.weight)
              .map((s) => (
                <div key={s.sector} className="flex items-center gap-ds-3">
                  <span className="text-[12px] text-ink-secondary w-[160px] shrink-0 truncate">
                    {s.sector}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold-primary opacity-60"
                      style={{ width: `${((s.weight / maxSector) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="font-data text-[12px] text-ink-primary tabular-nums w-12 text-right">
                    {s.weight.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ── Geographic Weights ─────────────────────────────────────────── */}
      {geoWeights && geoWeights.length > 0 && (
        <Card padding="default">
          <SectionHeading>Geographic Exposure</SectionHeading>
          <div className="space-y-ds-2">
            {geoWeights
              .slice()
              .sort((a, b) => b.weight - a.weight)
              .map((g) => (
                <div key={g.country} className="flex items-center gap-ds-3">
                  <span className="text-[12px] text-ink-secondary w-[160px] shrink-0 truncate">
                    {g.country}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold-primary opacity-60"
                      style={{ width: `${((g.weight / maxGeo) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="font-data text-[12px] text-ink-primary tabular-nums w-12 text-right">
                    {g.weight.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

    </div>
  );
}
