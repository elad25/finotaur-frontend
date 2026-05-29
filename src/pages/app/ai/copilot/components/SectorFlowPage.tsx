// COPILOT > Quant Flow — main page composition with ErrorBoundary + market status.
// Brand: Quant Flow tracks INDUSTRIES (Semiconductors, Cybersecurity, Solar, Biotech) —
// not broad sectors. File name kept as SectorFlowPage for diff minimality.

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { useSectorFlowSnapshot, useSectorFlowBriefing } from '../hooks/useSectorFlow';
import { SectorFlowHeatmap } from './SectorFlowHeatmap';
import { SharpestMoversPanel } from './SharpestMoversPanel';
import { SectorFlowAIBriefing } from './SectorFlowAIBriefing';

function SectorFlowPageInner() {
  const snapshot = useSectorFlowSnapshot();
  const briefing = useSectorFlowBriefing();

  return (
    <div className="p-ds-5 max-w-[1400px] mx-auto flex flex-col gap-ds-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-ds-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold-primary mb-ds-2">
            COPILOT · QUANT FLOW
          </div>
          <h1 className="text-3xl text-ink-primary tracking-tight">Quant Flow</h1>
          <p className="text-ink-secondary text-sm mt-ds-2 max-w-2xl">
            Industry-level capital rotation. We track <span className="text-ink-primary">Semiconductors, Cybersecurity, Solar, Biotech, Oil Services</span> — not broad sectors. Score = relative strength · volume z-score · price change.
          </p>
        </div>
        <div className="md:self-start">
          <MarketStatusBadge className="relative top-auto right-auto" />
        </div>
      </header>

      {snapshot.error && (
        <div className="rounded-[12px] border border-num-negative/40 bg-num-negative/10 p-ds-4 text-num-negative text-sm">
          Snapshot unavailable: {snapshot.error.message}
        </div>
      )}

      <SectorFlowAIBriefing
        briefing={briefing.data}
        loading={briefing.loading}
        error={briefing.error}
        onRegenerate={() => briefing.refetch(true)}
      />

      <SharpestMoversPanel
        movers={snapshot.data?.sharpestMovers ?? []}
        weakest={snapshot.data?.weakestMovers}
        loading={snapshot.loading}
      />

      <SectorFlowHeatmap
        ranked={snapshot.data?.ranked ?? []}
        loading={snapshot.loading}
      />
    </div>
  );
}

export function SectorFlowPage() {
  return (
    <ErrorBoundary boundary="quant-flow">
      <SectorFlowPageInner />
    </ErrorBoundary>
  );
}

export default SectorFlowPage;
