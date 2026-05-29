// 25 ETF tiles grouped by parent sector, tinted by composite magnitude.

import { Change } from '@/components/ds/NumberDisplay';
import type { ScoredEtf } from '../utils/sectorFlowTypes';

interface SectorFlowHeatmapProps {
  ranked: ScoredEtf[];
  loading?: boolean;
}

function bucketTint(composite: number): string {
  const mag = Math.abs(composite);
  if (composite >= 0) {
    if (mag >= 40) return 'bg-gold-primary/40';
    if (mag >= 20) return 'bg-gold-primary/20';
    return 'bg-gold-primary/10';
  }
  if (mag >= 40) return 'bg-num-negative/40';
  if (mag >= 20) return 'bg-num-negative/20';
  return 'bg-num-negative/10';
}

function Tile({ etf }: { etf: ScoredEtf }) {
  const tint = bucketTint(etf.composite);
  const glow = etf.composite > 0 ? 'hover:shadow-glow-gold-resting' : '';
  return (
    <div
      className={`flex flex-col justify-between rounded-[12px] border border-border-ds-subtle ${tint} p-ds-3 w-[110px] min-h-[88px] transition-transform duration-150 hover:scale-[1.04] ${glow}`}
      title={`${etf.subSector} — composite ${etf.composite.toFixed(1)}`}
    >
      <div className="font-mono text-base text-ink-primary tracking-tight">{etf.etf}</div>
      <div className="flex flex-col gap-1">
        <div className="text-[10px] text-ink-secondary truncate">{etf.subSector}</div>
        <Change value={etf.priceChangePct} format="percent" />
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 w-[110px] min-h-[88px] animate-pulse" />
  );
}

export function SectorFlowHeatmap({ ranked, loading }: SectorFlowHeatmapProps) {
  if (loading && ranked.length === 0) {
    return (
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-secondary mb-ds-3">All Sub-Sectors</div>
        <div className="flex flex-wrap gap-ds-3">
          {Array.from({ length: 25 }).map((_, i) => <SkeletonTile key={i} />)}
        </div>
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5 text-ink-secondary text-sm">
        No sub-sector data available.
      </div>
    );
  }

  const grouped = ranked.reduce<Record<string, ScoredEtf[]>>((acc, e) => {
    (acc[e.parentSector] ||= []).push(e);
    return acc;
  }, {});
  const parents = Object.keys(grouped).sort();

  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
      <div className="flex items-baseline justify-between mb-ds-4">
        <div className="text-xs uppercase tracking-[0.18em] text-gold-primary">All Sub-Sectors</div>
        <div className="text-[11px] text-ink-tertiary">
          Gold = inflow · Red = outflow · Intensity = composite magnitude
        </div>
      </div>
      <div className="flex flex-col gap-ds-5">
        {parents.map((parent) => (
          <div key={parent}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-secondary mb-ds-2">{parent}</div>
            <div className="flex flex-wrap gap-ds-2">
              {grouped[parent].map((etf) => <Tile key={etf.etf} etf={etf} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
