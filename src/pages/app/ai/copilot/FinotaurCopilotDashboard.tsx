import { useState } from 'react';
import { SkeletonCard } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePortfolioData } from './hooks/usePortfolioData';
import type { TimeRange } from './hooks/usePortfolioData';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { CopilotEmptyState } from './components/CopilotEmptyState';

// Row 1
import { PortfolioSnapshotCard } from './components/PortfolioSnapshotCard';
import { PortfolioHealthPanel } from './components/PortfolioHealthPanel';

// Row 2
import { TopOpportunitiesCompactCard } from './components/TopOpportunitiesCompactCard';
import { RiskAlertsCard } from './components/RiskAlertsCard';
import { AIRecommendationsCard } from './components/AIRecommendationsCard';

// Row 3
import { MarketComparisonChart } from './components/MarketComparisonChart';
import { TopHoldingsCard } from './components/TopHoldingsCard';
import { SectorExposureCard } from './components/SectorExposureCard';

// Right rail
import { AiAdvicesRail } from './components/AiAdvicesRail';

// Globe hero (Row 1 middle)
import { GlobeLoader } from './components/GlobeLoader';

// ─── AiBrainPanel (Row 1 middle — unchanged from original) ───────────────────

function AiBrainPanel({ className }: { className?: string }) {
  return (
    <div className={`relative min-h-[380px] ${className ?? ''}`}>
      <div className="relative h-full min-h-[380px] flex items-start justify-center overflow-visible">
        <div className="absolute top-0 h-[360px] w-[108%] max-w-[520px] border border-gold-primary/20 bg-black/15 shadow-[0_0_90px_rgba(201,166,70,0.18)] [clip-path:polygon(10%_0,90%_0,100%_16%,100%_80%,88%_100%,12%_100%,0_80%,0_16%)]" />
        <div className="absolute top-4 h-[324px] w-[94%] max-w-[464px] border border-gold-primary/10 [clip-path:polygon(10%_0,90%_0,100%_16%,100%_80%,88%_100%,12%_100%,0_80%,0_16%)]" />
        <div className="absolute left-1/2 top-[140px] h-[300px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.24),rgba(201,166,70,0.08)_38%,transparent_68%)] blur-xl" />
        <div className="absolute left-1/2 top-[0px] -translate-x-1/2">
          <GlobeLoader size={360} />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function FinotaurCopilotDashboard() {
  const [range, setRange] = useState<TimeRange>('1M');
  const snapshot = usePortfolioData(range);
  const ib = useIBConnection();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (ib.loading) {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 space-y-3">
          <SkeletonCard lines={3} withGrid />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!ib.isConnected) {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <div className="xl:col-span-9 xl:row-span-2">
            <CopilotEmptyState
              title="Connect to unlock your portfolio command center"
              description="Real-time portfolio value, allocation, sector exposure, risk analysis, and AI insights — all computed from your live broker holdings. Top opportunities and market signals work without a broker."
            />
          </div>
          <div className="xl:col-span-3">
            <AiAdvicesRail snapshot={snapshot} className="h-full" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Connected but not yet synced ─────────────────────────────────────────
  if (snapshot.source !== 'live') {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <div className="xl:col-span-9 xl:row-span-2">
            <CopilotEmptyState
              title="Syncing your portfolio…"
              description="Your broker is connected. We're pulling your live positions — this usually completes within a few minutes of the first sync. Top opportunities and market signals are ready below."
            />
          </div>
          <div className="xl:col-span-3">
            <AiAdvicesRail snapshot={snapshot} className="h-full" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Connected layout ─────────────────────────────────────────────────────
  return (
    <ErrorBoundary boundary="ai-copilot">
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">

        {/* ── MAIN CONTENT — xl:col-span-9 ─────────────────────────────── */}
        <div className="xl:col-span-9 flex flex-col gap-3">

          {/* ROW 1 — Snapshot | Globe | Health (3 equal cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ErrorBoundary boundary="copilot-snapshot">
              <PortfolioSnapshotCard snapshot={snapshot} />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-globe">
              <AiBrainPanel />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-health">
              <PortfolioHealthPanel snapshot={snapshot} />
            </ErrorBoundary>
          </div>

          {/* ROW 2 — Top Opportunities | Risk Alerts | AI Recommendations (3 equal cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ErrorBoundary boundary="copilot-opportunities">
              <TopOpportunitiesCompactCard />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-risks">
              <RiskAlertsCard snapshot={snapshot} />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-recommendations">
              <AIRecommendationsCard />
            </ErrorBoundary>
          </div>

          {/* ROW 3 — Performance (5/12) | Holdings (3/12) | Sector (4/12) — equal heights */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch [&>*]:h-full">
            <ErrorBoundary boundary="copilot-performance">
              <MarketComparisonChart
                className="xl:col-span-5"
                portfolioSeries={snapshot.series}
                range={range}
                onRangeChange={setRange}
              />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-holdings">
              <TopHoldingsCard snapshot={snapshot} className="xl:col-span-3" />
            </ErrorBoundary>

            <ErrorBoundary boundary="copilot-sector">
              <SectorExposureCard snapshot={snapshot} className="xl:col-span-4" />
            </ErrorBoundary>
          </div>

        </div>

        {/* ── RIGHT RAIL — xl:col-span-3, self-stretch full height ─────── */}
        <div className="xl:col-span-3 flex flex-col">
          <ErrorBoundary boundary="copilot-rail">
            <AiAdvicesRail snapshot={snapshot} className="flex-1" />
          </ErrorBoundary>
        </div>

      </div>
    </ErrorBoundary>
  );
}
