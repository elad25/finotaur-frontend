import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Layers3,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { PerformanceChart } from './components/PerformanceChart';
import { GlobeLoader } from './components/GlobeLoader';
import { usePortfolioData, TimeRange } from './hooks/usePortfolioData';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useSynthesisBrief } from './hooks/useSynthesisBrief';
import { ideaToOpportunity, TICKER_TO_NAME } from './utils/opportunityMapper';
import { TickerLogo } from './components/TickerLogo';
import type { TradeIdea } from '@/services/copilotSynthesisBriefApi';
import { PremiumFrame } from './brief/PremiumFrame';
import { PanelHeader, InsightRow } from './brief/panels/_shared';
import { PortfolioValuePanel } from './brief/panels/PortfolioValuePanel';
import { AllocationPanel } from './brief/panels/AllocationPanel';
import { SectorExposurePanel } from './brief/panels/SectorExposurePanel';
import { RiskAnalysisPanel } from './brief/panels/RiskAnalysisPanel';

// Time-range list lives inside PerformanceChart now.

export function FinotaurCopilotDashboard() {
  const [range, setRange] = useState<TimeRange>('1Y');
  const snapshot = usePortfolioData(range);
  const ib = useIBConnection();

  return (
    <ErrorBoundary boundary="ai-copilot">
    <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
      <PortfolioValuePanel className="xl:col-span-4" range={range} snapshot={snapshot} isConnected={ib.isConnected} />
      <AiBrainPanel className="xl:col-span-4" />
      <InsightsPanel className="xl:col-span-4" />

      <div className="xl:col-span-8">
        <PerformanceChart series={snapshot.series} range={range} onRangeChange={setRange} />
      </div>
      <div className="xl:col-span-4">
        <TopOpportunitiesPanel />
      </div>

      <AllocationPanel className="xl:col-span-4" snapshot={snapshot} isConnected={ib.isConnected} />
      <SectorExposurePanel className="xl:col-span-4" snapshot={snapshot} isConnected={ib.isConnected} />
      <RiskAnalysisPanel className="xl:col-span-4" />
    </div>
    </ErrorBoundary>
  );
}

function AiBrainPanel({ className }: { className?: string }) {
  return (
    <div className={`relative min-h-[330px] ${className}`}>
      <div className="relative h-full min-h-[330px] flex items-start justify-center overflow-visible">
        <div className="absolute top-0 h-[286px] w-[108%] max-w-[500px] border border-gold-primary/20 bg-black/15 shadow-[0_0_90px_rgba(201,166,70,0.18)] [clip-path:polygon(10%_0,90%_0,100%_16%,100%_76%,88%_100%,12%_100%,0_76%,0_16%)]" />
        <div className="absolute top-4 h-[252px] w-[94%] max-w-[444px] border border-gold-primary/10 [clip-path:polygon(10%_0,90%_0,100%_16%,100%_76%,88%_100%,12%_100%,0_76%,0_16%)]" />
        <div className="absolute left-1/2 top-[110px] h-[250px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.24),rgba(201,166,70,0.08)_38%,transparent_68%)] blur-xl" />
        <div className="absolute left-1/2 top-[0px] -translate-x-1/2">
          <GlobeLoader size={280} />
        </div>
        <div className="absolute bottom-[-4px] left-1/2 w-[270px] -translate-x-1/2 rounded-[8px] border border-gold-primary/24 bg-black/75 px-5 py-3 text-center shadow-[0_0_36px_rgba(201,166,70,0.22)] backdrop-blur-md">
          <div className="text-sm font-semibold uppercase text-gold-primary">AI CORE</div>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-tertiary">Real-time market analysis</p>
          <p className="mt-1 font-mono text-[10px] text-ink-primary">24/7</p>
          <div className="absolute -bottom-3 left-1/2 h-3 w-px bg-gold-primary/80" />
          <Zap className="absolute -bottom-5 left-1/2 h-4 w-4 -translate-x-1/2 text-gold-primary" />
        </div>
      </div>
    </div>
  );
}

function InsightsPanel({ className }: { className?: string }) {
  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="AI INSIGHTS" action="CHAT" actionTo="/app/ai/copilot/ai-chat" />
        <div className="mt-4 flex items-center gap-4 border-b border-gold-primary/12 pb-4">
          <div className="relative h-24 w-24 flex-none aspect-square rounded-full bg-[conic-gradient(from_210deg,var(--gold-bright)_0_18%,var(--gold-primary)_44%,var(--gold-deep)_78%,rgba(255,255,255,0.08)_78%_100%)] p-2 shadow-[0_0_26px_rgba(201,166,70,0.22)]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#090704] font-mono text-2xl tabular-nums">
              <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">78%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ink-tertiary">PORTFOLIO HEALTH</p>
            <p className="mt-1 text-lg text-gold-primary">Strong</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">Your portfolio is well balanced with optimal risk exposure.</p>
          </div>
        </div>
        <InsightRow icon={Layers3} title="DIVERSIFICATION" text="Well diversified across assets and sectors." />
        <InsightRow icon={ShieldCheck} title="RISK EXPOSURE" text="Risk level is optimal for your profile." />
        <InsightRow icon={TrendingUp} title="PERFORMANCE" text="Outperforming 78% of similar portfolios." />
      </div>
    </PremiumFrame>
  );
}

// Derive category chip label from TradeIdea source
function sourceToTag(idea: { source: TradeIdea['source']; sector?: string }): string {
  if (idea.source === 'ism')       return 'ISM';
  if (idea.source === 'war_zone')  return 'TACTICAL';
  if (idea.source === 'weekly')    return 'WEEKLY';
  return idea.sector || 'MULTI-FACTOR';
}

const FALLBACK_ITEMS = [
  { ticker: 'NVDA', company: 'NVIDIA Corporation',   tag: 'AI/TECHNOLOGY', score: 92 },
  { ticker: 'TSLA', company: 'Tesla, Inc.',           tag: 'GROWTH',        score: 88 },
  { ticker: 'MSFT', company: 'Microsoft Corporation', tag: 'LONG TERM',     score: 85 },
  { ticker: 'AMZN', company: 'Amazon.com, Inc.',      tag: 'E-COMMERCE',    score: 83 },
] as const;

function TopOpportunitiesPanel() {
  const { brief } = useSynthesisBrief();

  // Build display items — use live data when available, fallback otherwise
  const items: Array<{ ticker: string; company: string; tag: string; score: number }> =
    brief?.trade_ideas?.length
      ? brief.trade_ideas.slice(0, 4).map((idea, i) => {
          const opp = ideaToOpportunity(idea, i);
          return {
            ticker:  opp.ticker,
            company: TICKER_TO_NAME[opp.ticker] ?? opp.ticker,
            tag:     sourceToTag(idea),
            score:   opp.score,
          };
        })
      : FALLBACK_ITEMS.map(f => ({ ...f }));

  return (
    <PremiumFrame className="min-h-[338px]">
      <div className="p-5">
        <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
        <div className="mt-4 space-y-2">
          {items.map(({ ticker, company, tag, score }) => {
            return (
              <div key={ticker} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.045]">
                <TickerLogo ticker={ticker} size={32} className="h-8 w-8 rounded-[3px]" />

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{ticker}</p>
                  <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
                </div>
                <span className="rounded-[4px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-1 text-[9px] uppercase text-gold-primary">{tag}</span>
                <div className="h-9 w-9 rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-xs text-gold-primary">{score}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Link to="/app/ai/copilot/top-opportunities" className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary">
        VIEW ALL OPPORTUNITIES <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}
