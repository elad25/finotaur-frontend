// Top-N industry cards driven by composite score.
// Quant Flow: industry name (Semiconductors, Cybersecurity) is the headline;
// ETF ticker and parent sector are reference chrome.

import { Card, Eyebrow } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import type { ScoredEtf } from '../utils/sectorFlowTypes';

interface SharpestMoversPanelProps {
  movers: ScoredEtf[];
  weakest?: ScoredEtf[];
  loading?: boolean;
}

function MoverCard({ etf, tone }: { etf: ScoredEtf; tone: 'gold' | 'negative' }) {
  const compositeColor = tone === 'gold' ? 'text-gold-primary' : 'text-num-negative';
  const volTone = Math.abs(etf.volumeZScore) > 2 ? 'text-gold-primary' : 'text-ink-secondary';
  return (
    <div className="flex flex-col rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4 transition-transform duration-150 hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-ds-2">
        <span className="font-mono text-[11px] text-ink-tertiary tabular-nums">#{etf.rank}</span>
        <span className="text-[10px] tracking-[0.16em] uppercase text-ink-tertiary">
          {etf.parentSector}
        </span>
      </div>
      <div className="text-lg text-ink-primary leading-tight mb-ds-1" title={etf.subSector}>
        {etf.subSector}
      </div>
      <div className="font-mono text-[10px] text-ink-secondary tracking-wide mb-ds-3">
        via {etf.etf}
      </div>
      <div className={`font-mono text-xl tabular-nums ${compositeColor}`}>
        {etf.composite >= 0 ? '+' : ''}{etf.composite.toFixed(1)}
      </div>
      <div className="flex items-center justify-between mt-ds-2">
        <Change value={etf.priceChangePct} format="percent" />
        <span className={`font-mono text-xs tabular-nums ${volTone}`}>
          vol {etf.volumeZScore.toFixed(2)}σ
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4 animate-pulse">
      <div className="h-3 w-12 bg-surface-2 rounded mb-ds-3" />
      <div className="h-6 w-16 bg-surface-2 rounded mb-ds-2" />
      <div className="h-3 w-24 bg-surface-2 rounded mb-ds-3" />
      <div className="h-5 w-20 bg-surface-2 rounded" />
    </div>
  );
}

export function SharpestMoversPanel({ movers, weakest, loading }: SharpestMoversPanelProps) {
  return (
    <div className="flex flex-col gap-ds-5">
      <Card variant="glass" className="p-ds-5">
        <Eyebrow className="text-gold-primary mb-ds-2">SHARPEST MOVERS</Eyebrow>
        <h3 className="text-xl text-ink-primary mb-ds-4">Where the money is moving</h3>
        {loading && movers.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-ds-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : movers.length === 0 ? (
          <div className="text-ink-secondary text-sm py-ds-4">
            No data yet — check back at next market open.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-ds-3">
            {movers.slice(0, 5).map((m) => <MoverCard key={m.etf} etf={m} tone="gold" />)}
          </div>
        )}
      </Card>

      {weakest && weakest.length > 0 && (
        <Card variant="glass" className="p-ds-5">
          <Eyebrow className="text-num-negative mb-ds-2">WEAKEST FLOWS</Eyebrow>
          <h3 className="text-xl text-ink-primary mb-ds-4">Money flowing out</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-ds-3">
            {weakest.slice(0, 5).map((m) => <MoverCard key={m.etf} etf={m} tone="negative" />)}
          </div>
        </Card>
      )}
    </div>
  );
}
