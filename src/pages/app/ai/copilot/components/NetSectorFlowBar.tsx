// Headline panel: aggregate composite score by parent sector to show
// net money flow direction at a glance. Top-of-page visual.

import { Card, Eyebrow } from '@/components/ds/Card';
import type { ScoredEtf } from '../utils/sectorFlowTypes';

interface NetSectorFlowBarProps {
  ranked: ScoredEtf[];
  loading?: boolean;
}

interface ParentNet {
  parent: string;
  netComposite: number;        // mean composite across sub-sectors
  subSectorCount: number;
  topEtf: string;              // most extreme sub-sector inside this parent
  topReason: string;           // sub-sector name of the top
}

function aggregateByParent(ranked: ScoredEtf[]): ParentNet[] {
  const grouped: Record<string, ScoredEtf[]> = {};
  for (const e of ranked) {
    (grouped[e.parentSector] ||= []).push(e);
  }
  const result: ParentNet[] = [];
  for (const [parent, entries] of Object.entries(grouped)) {
    const sum = entries.reduce((s, e) => s + e.composite, 0);
    const net = sum / entries.length;
    // pick the entry whose composite has the same sign as net AND is most extreme
    const sortedByMagnitude = [...entries].sort((a, b) => Math.abs(b.composite) - Math.abs(a.composite));
    const top = sortedByMagnitude[0];
    result.push({
      parent,
      netComposite: net,
      subSectorCount: entries.length,
      topEtf: top.etf,
      topReason: top.subSector,
    });
  }
  return result.sort((a, b) => b.netComposite - a.netComposite);
}

function Bar({ entry, maxMag }: { entry: ParentNet; maxMag: number }) {
  const isPositive = entry.netComposite >= 0;
  const widthPct = maxMag === 0 ? 0 : Math.min(100, (Math.abs(entry.netComposite) / maxMag) * 100);
  const fillColor = isPositive ? 'bg-gold-primary' : 'bg-num-negative';
  const arrow = isPositive ? '↗' : '↘';
  const arrowColor = isPositive ? 'text-gold-primary' : 'text-num-negative';

  return (
    <div className="flex items-center gap-ds-3 py-ds-2">
      {/* Left column: parent sector label */}
      <div className="w-44 shrink-0 flex items-center gap-ds-2">
        <span aria-hidden className={`${arrowColor} text-sm leading-none`}>{arrow}</span>
        <div className="text-sm text-ink-primary truncate" title={entry.parent}>{entry.parent}</div>
      </div>

      {/* Center column: split bar (left=out, right=in) */}
      <div className="flex-1 flex items-center">
        {/* Left half (outflow zone) */}
        <div className="flex-1 h-2 relative flex justify-end">
          {!isPositive && (
            <div className={`${fillColor} h-full rounded-l-sm`} style={{ width: `${widthPct}%` }} />
          )}
        </div>
        {/* Center divider */}
        <div className="w-px h-3 bg-border-ds-default" />
        {/* Right half (inflow zone) */}
        <div className="flex-1 h-2 relative">
          {isPositive && (
            <div className={`${fillColor} h-full rounded-r-sm`} style={{ width: `${widthPct}%` }} />
          )}
        </div>
      </div>

      {/* Right column: net score + leading sub-sector */}
      <div className="w-48 shrink-0 flex flex-col items-end">
        <span className={`font-mono text-sm tabular-nums ${isPositive ? 'text-ink-primary' : 'text-num-negative'}`}>
          {isPositive ? '+' : ''}{entry.netComposite.toFixed(1)}
        </span>
        <span className="text-[10px] text-ink-tertiary truncate max-w-[12rem]" title={entry.topReason}>
          via <span className="font-mono text-ink-secondary">{entry.topEtf}</span> · {entry.topReason}
        </span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-ds-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-ds-3">
          <div className="w-44 h-3 bg-surface-2 rounded" />
          <div className="flex-1 h-2 bg-surface-2 rounded" />
          <div className="w-24 h-3 bg-surface-2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function NetSectorFlowBar({ ranked, loading }: NetSectorFlowBarProps) {
  const parents = aggregateByParent(ranked);
  const maxMag = parents.reduce((m, p) => Math.max(m, Math.abs(p.netComposite)), 0);

  return (
    <Card variant="featured" className="p-ds-5">
      <div className="flex items-baseline justify-between mb-ds-4">
        <div>
          <Eyebrow className="text-gold-primary mb-ds-2">CAPITAL ROTATION</Eyebrow>
          <h2 className="text-2xl text-ink-primary tracking-tight">Where the big money is flowing</h2>
          <p className="text-ink-secondary text-sm mt-ds-1">
            Net composite score per parent sector — gold = inflow, red = outflow
          </p>
        </div>
        <div className="hidden md:flex gap-ds-4 text-[11px] uppercase tracking-[0.18em]">
          <span className="text-num-negative">← OUT</span>
          <span className="text-gold-primary">IN →</span>
        </div>
      </div>

      {loading && ranked.length === 0 ? (
        <Skeleton />
      ) : ranked.length === 0 ? (
        <div className="text-ink-secondary text-sm py-ds-3">
          No data yet — check back at next market open.
        </div>
      ) : (
        <div className="flex flex-col">
          {parents.map((p) => <Bar key={p.parent} entry={p} maxMag={maxMag} />)}
        </div>
      )}
    </Card>
  );
}
