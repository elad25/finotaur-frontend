import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronRight,
  Filter,
  Globe,
  Layers,
  MessageSquare,
  Shield,
  Star,
  Zap,
} from 'lucide-react';
import { CopilotChatPanel } from './components/CopilotChatPanel';
import { CopilotEmptyState } from './components/CopilotEmptyState';
import { HoldingsTable } from './components/HoldingsTable';
import { SynthesisBriefNarrative } from './components/SynthesisBriefNarrative';
import { SynthesisBriefPersonalTwist } from './components/SynthesisBriefPersonalTwist';
import { usePortfolioData } from './hooks/usePortfolioData';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useSynthesisBrief } from './hooks/useSynthesisBrief';
import { computeRiskAnalysis, type PortfolioRiskAnalysis, type RiskDriver, type TopExposure } from './utils/portfolioRisk';
import { TickerLogo } from './components/TickerLogo';
import { SectorCallsPanel } from './components/SectorCallsPanel';
import { ideaToOpportunity, type Opportunity } from './utils/opportunityMapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';

const FALLBACK_OPPORTUNITIES: Opportunity[] = [
  {
    rank: 1,
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    score: 92,
    thesis: 'AI infrastructure demand accelerating. Strong earnings momentum and institutional accumulation.',
    upside: '+18.4%',
    price: '$1,152.00',
    current: '$973.47',
    confidence: 'High',
    bars: 5,
    timeframe: '1-3 Weeks',
    catalysts: ['Earnings Beat', 'Blackwell Ramp', 'Institutional Flow'],
  },
  {
    rank: 2,
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    score: 89,
    thesis: 'Cloud + AI growth re-acceleration. Strong Copilot adoption and enterprise demand.',
    upside: '+11.2%',
    price: '$468.00',
    current: '$421.10',
    confidence: 'High',
    bars: 4,
    timeframe: '1-3 Weeks',
    catalysts: ['Copilot Adoption', 'Azure Growth', 'Cost Efficiency'],
  },
  {
    rank: 3,
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    score: 86,
    thesis: 'Margin expansion + AWS acceleration. E-commerce stabilization and ad growth.',
    upside: '+9.6%',
    price: '$205.00',
    current: '$188.93',
    confidence: 'High',
    bars: 4,
    timeframe: '1-4 Weeks',
    catalysts: ['AWS Growth', 'Ad Revenue', 'Prime Engagement'],
  },
  {
    rank: 4,
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Communication Services',
    score: 84,
    thesis: 'Ad revenue strength and cost discipline driving margin expansion.',
    upside: '+8.8%',
    price: '$582.00',
    current: '$535.10',
    confidence: 'High',
    bars: 4,
    timeframe: '1-4 Weeks',
    catalysts: ['Ad Demand', 'AI Efficiency', 'Reality Labs Progress'],
  },
  {
    rank: 5,
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Cyclical',
    score: 81,
    thesis: 'Volume recovery and energy business growth. FSD monetization ramp.',
    upside: '+12.3%',
    price: '$198.00',
    current: '$176.21',
    confidence: 'Medium-High',
    bars: 3,
    timeframe: '2-6 Weeks',
    catalysts: ['Volume Recovery', 'FSD Progress', 'Energy Growth'],
  },
];

const sectorOpportunityRows = [
  { sector: 'Technology', score: 92, pick: 'NVDA', upside: '+18.4%' },
  { sector: 'Communication Services', score: 87, pick: 'META', upside: '+8.8%' },
  { sector: 'Consumer Cyclical', score: 83, pick: 'AMZN', upside: '+9.6%' },
  { sector: 'Industrials', score: 76, pick: 'CAT', upside: '+7.1%' },
  { sector: 'Financials', score: 72, pick: 'JPM', upside: '+6.3%' },
];

const timeframeRows = [
  { label: '1-2 Weeks', count: 18, share: '38%', color: '#33f08a' },
  { label: '2-4 Weeks', count: 16, share: '33%', color: '#f1c74d' },
  { label: '1-3 Months', count: 10, share: '21%', color: '#c77b38' },
  { label: '3+ Months', count: 4, share: '8%', color: '#c84a4a' },
];


const analystSummaryRows = [
  { label: 'Analyst Rating', value: 'A-', note: 'High conviction, controlled risk' },
  { label: 'Behavior Score', value: '82', note: 'Discipline improving across recent sessions' },
  { label: 'Portfolio Fit', value: '78%', note: 'Growth tilt matches current macro regime' },
  { label: 'Action Items', value: '4', note: 'Two allocation, one hedge, one watchlist update' },
] as const;

const analystSections = [
  {
    title: 'Executive Summary',
    text: 'The user profile shows strong growth exposure, improving trade discipline, and portfolio construction that benefits from the current disinflationary growth backdrop. Main weakness is concentration in AI infrastructure names during high-beta sessions.',
  },
  {
    title: 'Portfolio Diagnosis',
    text: 'Core holdings are liquid and institutionally owned. Allocation is efficient for upside capture, but drawdown sensitivity rises when mega-cap technology correlations compress toward one.',
  },
  {
    title: 'Behavioral Read',
    text: 'Recent activity suggests cleaner decision timing and fewer reactive exits. The system should keep monitoring late-session entries, oversized conviction trades, and repeated exposure to the same catalyst.',
  },
  {
    title: 'Recommended Next Moves',
    text: 'Keep the AI/semiconductor overweight, trim redundant exposure on strength, add a defensive watchlist layer, and require a pre-trade thesis check for positions above portfolio-average risk.',
  },
] as const;

const analystRiskRows = [
  ['Concentration', 'Medium', 'Top holdings create meaningful single-theme dependency.'],
  ['Execution Discipline', 'Improving', 'Entry timing has become more selective over the latest review window.'],
  ['Macro Sensitivity', 'Medium', 'Risk-on backdrop helps, but duration shocks can pressure growth exposure.'],
  ['User Readiness', 'High', 'Profile is suitable for detailed weekly AI analyst reporting.'],
] as const;

export function CopilotTopOpportunitiesPage() {
  const { brief, loading: briefLoading, personal, personalLoading } = useSynthesisBrief();

  const opportunities = React.useMemo<Opportunity[]>(() => {
    if (!brief?.trade_ideas?.length) return FALLBACK_OPPORTUNITIES;

    const mapped = brief.trade_ideas.map((idea, i) =>
      ideaToOpportunity(idea, i, personal?.rankedTradeIdeas)
    );

    // If personal ranking exists, sort by relevance score DESC
    if (personal?.rankedTradeIdeas?.length) {
      const relevanceMap = new Map(
        personal.rankedTradeIdeas.map(r => [r.ideaIndex, r.relevanceScore])
      );
      mapped.sort((a, b) => {
        const ra = relevanceMap.get(a.rank - 1) ?? 0;
        const rb = relevanceMap.get(b.rank - 1) ?? 0;
        return rb - ra;
      });
      // Re-number after sort
      mapped.forEach((o, i) => { o.rank = i + 1; });
    }

    return mapped;
  }, [brief?.trade_ideas, personal?.rankedTradeIdeas]);

  return (
    <CopilotPageShell title="Top Opportunities" eyebrow="AI-ranked portfolio actions" icon={Zap} frameless>
      <div className="space-y-3">
        {/* Phase 2: Per-user personalization banner */}
        <SynthesisBriefPersonalTwist
          personal={personal}
          personalLoading={personalLoading}
          degenerate={personal?.degenerate}
        />

        <section className="overflow-hidden rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 shadow-[0_0_34px_rgba(0,0,0,0.45)]">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-gold-primary/14 bg-[#050505] px-1.5 py-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <TabButton active label="All Opportunities" />
              <TabButton label="Stocks" />
              <TabButton label="Sectors" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SelectPill label="All Sectors" width="w-[146px]" />
              <SelectPill label="Timeframe" value="1W" width="w-[150px]" />
              <SelectPill label="Sort By" value="AI Score" width="w-[172px]" />
              <button className="flex h-10 w-10 items-center justify-center rounded-[7px] border border-gold-primary/14 bg-[#0b0a07] text-gold-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="h-10 bg-[#060606]">
                  {['RANK', 'OPPORTUNITY', 'AI SCORE', 'THESIS', 'UPSIDE POTENTIAL', 'CONFIDENCE', 'TIMEFRAME', 'KEY CATALYSTS', ''].map((heading) => (
                    <th key={heading} className="border-b border-gold-primary/12 px-2 text-[9px] font-semibold uppercase tracking-[0.07em] text-ink-tertiary">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <OpportunityTableRow key={opportunity.ticker} opportunity={opportunity} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <SectorCallsPanel brief={brief} loading={briefLoading} />
        <OpportunityInsightsFooter />
      </div>
    </CopilotPageShell>
  );
}

function TabButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-11 items-center gap-2 rounded-[7px] px-4 text-sm transition ${
        active ? 'bg-gold-primary/8 text-gold-primary' : 'text-ink-secondary hover:bg-white/[0.03] hover:text-ink-primary'
      }`}
    >
      <span className={`h-3.5 w-3.5 rounded-full border ${active ? 'border-gold-primary' : 'border-ink-tertiary/60'}`} />
      {label}
    </button>
  );
}

function SelectPill({ label, value, width }: { label: string; value?: string; width: string }) {
  return (
    <button type="button" className={`flex h-11 ${width} items-center justify-between rounded-[7px] border border-gold-primary/14 bg-[#0b0a07] px-4 text-xs text-ink-secondary`}>
      <span>{label}</span>
      <span className="flex items-center gap-3 text-ink-primary">
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-gold-primary" />
      </span>
    </button>
  );
}

// Dot color for time horizon
const HORIZON_DOT: Record<string, string> = {
  short:  'bg-[#4ade80]',   // green
  medium: 'bg-[#f59e0b]',   // amber
  long:   'bg-[#6366f1]',   // indigo
};

function OpportunityTableRow({ opportunity }: { opportunity: Opportunity }) {
  const horizonDot = opportunity.timeHorizon ? HORIZON_DOT[opportunity.timeHorizon] : undefined;

  return (
    <tr className="group min-h-[88px] bg-[#050505] align-middle">
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-primary/65 bg-[radial-gradient(circle_at_50%_42%,rgba(201,166,70,0.16),rgba(201,166,70,0.04)_52%,transparent_74%)] font-mono text-sm font-semibold text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.12),inset_0_0_12px_rgba(201,166,70,0.08)]">
          {opportunity.rank}
        </div>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-white/8 bg-[#0b0b0b] shadow-[inset_0_0_18px_rgba(255,255,255,0.02)]">
            <TickerLogo ticker={opportunity.ticker} size={28} className="h-7 w-7" />

          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-base font-semibold leading-tight text-ink-primary">{opportunity.ticker}</p>
              {opportunity.source === 'ism' && (
                <span className="inline-flex items-center rounded-[4px] bg-[#c9a646]/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-[#f4d97b]">
                  ISM
                </span>
              )}
            </div>
            <p className="mt-1 max-w-[170px] truncate text-[11px] font-medium text-ink-secondary">{opportunity.name}</p>
            <span className="mt-1.5 inline-flex rounded-[4px] bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-ink-tertiary">{opportunity.sector}</span>
          </div>
        </div>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <ScoreRing score={opportunity.score} />
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <p className="line-clamp-2 max-w-[230px] text-sm text-ink-secondary" title={opportunity.thesis}>{opportunity.thesis}</p>
        {opportunity.whyForYou && (
          <p className="line-clamp-1 mt-1 max-w-[230px] text-[11px] italic text-gold-primary/70">
            Why for you: {opportunity.whyForYou}
          </p>
        )}
        {opportunity.patternEvidence && (
          <details className="mt-1.5 max-w-[230px] text-[10px] leading-[1.45]">
            <summary className="cursor-pointer text-gold-primary/70 hover:text-gold-primary transition">
              Why this pattern?
            </summary>
            <div className="mt-1 ps-2 border-s border-gold-primary/20">
              <p className="text-ink-secondary">{opportunity.patternEvidence}</p>
              {opportunity.invalidation && (
                <p className="mt-1 text-ink-tertiary">
                  <strong className="text-ink-secondary">Invalidation:</strong>{' '}
                  {opportunity.invalidation}
                </p>
              )}
            </div>
          </details>
        )}
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <p className="font-mono text-xl font-semibold text-[#64f56a]">{opportunity.upside}</p>
        <p className="mt-1.5 font-mono text-xs text-ink-secondary">{opportunity.price}</p>
        <p className="mt-0.5 text-[11px] text-ink-tertiary">Current: {opportunity.current}</p>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={`h-5 w-2.5 rounded-[2px] ${index < opportunity.bars ? 'bg-[#31bd72]' : 'bg-white/[0.07]'}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-secondary">{opportunity.confidence}</p>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex items-center gap-1.5">
          {horizonDot && <span className={`h-2 w-2 flex-none rounded-full ${horizonDot}`} />}
          <p className="text-xs text-ink-primary">{opportunity.timeframe}</p>
        </div>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <ul className="space-y-1 text-[11px] text-ink-secondary">
          {opportunity.catalysts.map((catalyst) => (
            <li key={catalyst}>{`\u2022 ${catalyst}`}</li>
          ))}
        </ul>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex w-[150px] flex-col gap-1.5">
          <button type="button" className="flex h-8 items-center justify-between rounded-[6px] border border-gold-primary/18 bg-gold-primary/[0.075] px-3 text-[11px] font-semibold text-gold-primary">
            View Analysis
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="flex h-7 items-center justify-center gap-1.5 rounded-[6px] border border-white/8 bg-white/[0.03] px-2 text-[10px] text-ink-tertiary">
            <Star className="h-3 w-3" />
            Add to Watchlist
            <Star className="h-3 w-3 fill-ink-tertiary/20" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative flex h-[58px] w-[58px] items-center justify-center">
      <div
        className="absolute inset-0 rounded-full p-[5px] shadow-[0_0_16px_rgba(91,245,92,0.12)]"
        style={{ background: `conic-gradient(#5feb64 0 ${score * 3.6}deg, rgba(201,166,70,0.35) ${score * 3.6}deg 360deg)` }}
      >
        <div className="h-full w-full rounded-full bg-[#070707]" />
      </div>
      <span className="relative font-mono text-lg font-bold text-[#bff26f]">{score}</span>
    </div>
  );
}

function OpportunityInsightsFooter() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1.13fr_0.82fr_1.12fr]">
      <section className="overflow-hidden rounded-[7px] border border-gold-primary/14 bg-[#050505]/96">
        <div className="flex h-10 items-center justify-between border-b border-gold-primary/10 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gold-primary">Sector Opportunities</p>
          <button type="button" className="text-[10px] font-semibold text-gold-primary">View All</button>
        </div>
        <div className="grid grid-cols-[1fr_58px_86px_58px_70px] items-center border-b border-gold-primary/8 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.05em] text-ink-tertiary">
          <span>Sector</span>
          <span>AI Score</span>
          <span>Trend</span>
          <span>Top Pick</span>
          <span className="text-right">Upside</span>
        </div>
        <div>
          {sectorOpportunityRows.map((row, index) => (
            <div key={row.sector} className="grid min-h-9 grid-cols-[1fr_58px_86px_58px_70px] items-center border-b border-gold-primary/8 px-3 text-[11px] last:border-b-0">
              <span className="font-medium text-ink-primary">{row.sector}</span>
              <span className="font-mono font-semibold text-[#5af06e]">{row.score}</span>
              <SectorSparkline offset={index} />
              <span className="font-mono font-semibold text-ink-primary">{row.pick}</span>
              <span className="text-right font-mono font-semibold text-[#4bea7a]">{row.upside}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[7px] border border-gold-primary/14 bg-[#050505]/96 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gold-primary">Opportunities By Timeframe</p>
        <div className="mt-3 flex items-center gap-4">
          <TimeframeDonut />
          <div className="min-w-0 flex-1 space-y-3">
            {timeframeRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[12px_1fr_30px_34px] items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="text-ink-secondary">{row.label}</span>
                <span className="text-right font-mono text-ink-primary">{row.count}</span>
                <span className="font-mono text-ink-secondary">({row.share})</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[7px] border border-gold-primary/14 bg-[#050505]/96 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gold-primary">AI Summary</p>
        <div className="mt-4 flex gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[6px] border border-gold-primary/18 bg-gold-primary/12 font-mono text-sm font-bold text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.18)]">
            AI
          </div>
          <p className="max-w-[410px] text-[12px] leading-[1.65] text-ink-secondary">
            Strong bullish setup in Technology and Communication Services. AI infrastructure demand and cloud adoption remain key growth drivers. Monitor earnings this week for momentum <span className="text-gold-primary">confirmation.</span>
          </p>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-gold-primary/10 pt-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="font-semibold text-gold-primary">Market Bias: <span className="text-[#5af06e]">Bullish</span></span>
            <span className="text-ink-tertiary">Confidence: <span className="font-semibold text-[#5af06e]">High</span></span>
          </div>
          <MiniMomentumTrend />
        </div>
      </section>
    </div>
  );
}

function SectorSparkline({ offset }: { offset: number }) {
  const paths = [
    'M2 20 L16 17 L27 11 L38 13 L51 8 L66 4',
    'M2 18 L14 15 L28 16 L41 9 L53 10 L66 5',
    'M2 21 L15 18 L26 18 L38 12 L50 11 L66 6',
    'M2 20 L15 19 L29 14 L43 15 L54 9 L66 7',
    'M2 19 L14 20 L28 17 L41 12 L52 14 L66 8',
  ];

  return (
    <svg viewBox="0 0 68 24" className="h-6 w-[74px] text-[#34e177]" aria-hidden="true">
      <path d={paths[offset % paths.length]} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TimeframeDonut() {
  return (
    <div className="relative flex h-[112px] w-[112px] flex-none items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(#2fa86a_0deg_137deg,#e5bd45_137deg_256deg,#b66a34_256deg_332deg,#b94242_332deg_360deg)] shadow-[0_0_26px_rgba(201,166,70,0.1)]" />
      <div className="absolute inset-[12px] rounded-full bg-[#050505]" />
      <div className="relative text-center">
        <p className="font-mono text-3xl font-semibold text-gold-primary">48</p>
        <p className="mt-1 text-[10px] text-ink-tertiary">Total</p>
      </div>
    </div>
  );
}

function MiniMomentumTrend() {
  return (
    <svg viewBox="0 0 140 40" className="h-10 w-[140px] flex-none text-[#35e376]" aria-hidden="true">
      <path d="M3 33 C18 31 24 25 37 26 C48 27 52 17 64 19 C76 21 77 26 88 24 C100 22 103 16 114 14 C126 12 130 7 137 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CopilotMacroPage() {
  const { brief, loading, error } = useSynthesisBrief();

  if (loading) {
    return (
      <CopilotPageShell title="Macro" eyebrow="Portfolio-aware macro lens" icon={Globe}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
        </div>
      </CopilotPageShell>
    );
  }

  if (error || !brief) {
    return (
      <CopilotPageShell title="Macro" eyebrow="Portfolio-aware macro lens" icon={Globe}>
        <CopilotEmptyState
          title="Macro briefing not available yet"
          description="The weekly macro briefing is generated on a recurring schedule. Check back shortly — once the next brief lands, the macro lens, central thesis, weekly context, tactical view, and key risks will appear here."
        />
      </CopilotPageShell>
    );
  }

  const weekLabel = new Date(brief.week_start).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <CopilotPageShell title="Macro" eyebrow="Portfolio-aware macro lens" icon={Globe}>
      <div className="space-y-3">
        {/* Hero — central thesis + macro narrative */}
        <section className="overflow-hidden rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5 shadow-[0_0_34px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-3 border-b border-gold-primary/10 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-primary">Central Thesis</p>
            <p className="text-[10px] uppercase text-ink-tertiary">Week of {weekLabel}</p>
          </div>
          {brief.central_thesis && (
            <p className="mt-4 text-[15px] font-medium leading-[1.6] text-ink-primary">{brief.central_thesis}</p>
          )}
          {brief.macro_narrative && (
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{brief.macro_narrative}</p>
          )}
        </section>

        {/* Weekly context + this-week tactical */}
        <section className="grid gap-3 md:grid-cols-2">
          <article className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Weekly Context</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{brief.weekly_context}</p>
          </article>
          <article className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-primary">This Week Tactical</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{brief.this_week_tactical}</p>
          </article>
        </section>

        {/* Key risks */}
        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Key Risks</p>
          {(!brief.key_risks || brief.key_risks.length === 0) ? (
            <p className="mt-4 text-[12px] text-ink-tertiary">No key risks identified this week.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {brief.key_risks.map((risk, index) => (
                <li key={index} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[4px] border border-num-negative/30 bg-num-negative/[0.07]">
                    <span className="h-1.5 w-1.5 rounded-full bg-num-negative/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-[1.5] text-ink-primary">{risk.risk}</p>
                    {(risk.impact || risk.probability) && (
                      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-ink-tertiary">
                        {risk.impact && (
                          <span>Impact: <span className="text-ink-secondary">{risk.impact}</span></span>
                        )}
                        {risk.probability && (
                          <span>Prob: <span className="text-ink-secondary">{risk.probability}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ground sentiment quotes */}
        {brief.ground_sentiment && brief.ground_sentiment.length > 0 && (
          <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Ground Sentiment</p>
            <div className="mt-4 space-y-3">
              {brief.ground_sentiment.map((item, index) => (
                <blockquote key={index} className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
                  <p className="text-[12px] leading-[1.65] text-ink-secondary">
                    <span className="mr-1 text-gold-primary/60 font-serif text-xl leading-none">&ldquo;</span>
                    {item.quote}
                    <span className="ml-1 text-gold-primary/60 font-serif text-xl leading-none">&rdquo;</span>
                  </p>
                  {(item.attribution || item.source) && (
                    <footer className="mt-2 text-[10px] text-ink-tertiary">
                      {[item.attribution, item.source].filter(Boolean).join(' · ')}
                    </footer>
                  )}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Footer metadata */}
        <p className="text-[10px] text-ink-tertiary text-center">
          Model: <span className="font-mono text-ink-secondary">{brief.model}</span>
          {brief.qa_score != null && (
            <> · QA: <span className="font-mono text-ink-secondary">{brief.qa_score}</span></>
          )}
        </p>
      </div>
    </CopilotPageShell>
  );
}

export function CopilotHoldingsPage() {
  const snapshot = usePortfolioData('1Y');

  return (
    <CopilotPageShell title="Holdings" eyebrow="Positions, exposure, and P&L" icon={Layers}>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Positions" value={String(snapshot.holdings.length)} />
        <Metric label="Market value" value={`$${Math.round(snapshot.totalValue).toLocaleString('en')}`} />
        <Metric label="Unrealized P&L" value={`+$${Math.round(snapshot.holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0)).toLocaleString('en')}`} positive />
      </div>
      <div className="mt-3">
        <HoldingsTable holdings={snapshot.holdings} />
      </div>
    </CopilotPageShell>
  );
}

export function CopilotAIAnalystPage() {
  const { brief, loading: briefLoading, error: briefError, personal, personalLoading } = useSynthesisBrief();

  return (
    <CopilotPageShell title="AI Analyst" eyebrow="Detailed per-user intelligence report" icon={Brain}>
      <div className="space-y-3">
        {/* Phase 2: Per-user personalization banner */}
        <SynthesisBriefPersonalTwist
          personal={personal}
          personalLoading={personalLoading}
          degenerate={personal?.degenerate}
        />

        {/* Phase 1: Weekly Synthesis Brief — replaces hardcoded content once stable */}
        <SynthesisBriefNarrative brief={brief} loading={briefLoading} error={briefError} />

        <hr className="border-gold-primary/10" />
        <section className="rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5 shadow-[0_0_34px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gold-primary/12 pb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-primary/78">User Report</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-primary">Detailed AI analyst report per user</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
                A dedicated space for user-level analysis: portfolio fit, behavior, risk profile, macro exposure,
                and prioritized analyst actions in one structured report.
              </p>
            </div>
            <div className="rounded-[7px] border border-gold-primary/20 bg-black/32 px-4 py-3 text-right">
              <p className="text-[10px] uppercase text-ink-tertiary">Current profile</p>
              <p className="mt-1 font-mono text-sm text-ink-primary">USER-001</p>
              <p className="mt-1 text-[11px] text-gold-primary">Ready for weekly report</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {analystSummaryRows.map((row) => (
              <div key={row.label} className="rounded-[7px] border border-gold-primary/14 bg-black/28 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">{row.label}</p>
                <p className="mt-3 font-mono text-2xl tabular-nums text-gold-primary">{row.value}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary">{row.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-gold-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">Analyst Narrative</p>
                <h3 className="text-lg font-semibold text-ink-primary">Full report structure</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {analystSections.map((section) => (
                <article key={section.title} className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
                  <p className="text-sm font-semibold text-gold-primary">{section.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{section.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-gold-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">Risk & Readiness</p>
                <h3 className="text-lg font-semibold text-ink-primary">User-level checks</h3>
              </div>
            </div>
            <div className="mt-5 divide-y divide-gold-primary/10">
              {analystRiskRows.map(([label, value, text]) => (
                <div key={label} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-primary">{label}</p>
                    <span className="rounded-[5px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-1 text-[10px] uppercase text-gold-primary">
                      {value}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </CopilotPageShell>
  );
}

export function CopilotRisksPage() {
  const ib = useIBConnection();
  const snapshot = usePortfolioData('1Y');

  if (ib.loading) {
    return (
      <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
        </div>
      </CopilotPageShell>
    );
  }

  if (!ib.isConnected) {
    return (
      <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
        <CopilotEmptyState
          title="Connect to see your risk profile"
          description="Risk analysis shows your real exposure across concentration, equity beta, options leverage, and cash buffer — computed from your actual broker holdings."
        />
      </CopilotPageShell>
    );
  }

  const analysis = computeRiskAnalysis(snapshot.holdings, snapshot.totalValue);
  const mainDriverLabels = analysis.drivers
    .filter((d) => d.tone !== 'green')
    .slice(0, 3)
    .map((d) => d.label);

  return (
    <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
      <div className="space-y-3">
        <section className="overflow-hidden rounded-[8px] border border-gold-primary/18 bg-[linear-gradient(135deg,#171816_0%,#10100f_52%,#18150e_100%)] shadow-[0_18px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="px-5 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-normal text-ink-tertiary">Portfolio Risk Score</p>
          </div>
          <div className="grid divide-y divide-gold-primary/10 lg:grid-cols-[1.05fr_0.86fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="flex min-h-[116px] items-center gap-4 px-5 pb-4 pt-2">
              <RiskScoreGauge score={analysis.score} />
              <div className="pt-1">
                <p className="font-mono text-[35px] font-semibold leading-none tabular-nums text-gold-primary">{analysis.score}</p>
                <p className="mt-2 font-mono text-[11px] text-ink-secondary">/100</p>
              </div>
            </div>

            <div className="flex min-h-[116px] flex-col justify-center px-5 py-4">
              <p className="text-sm font-semibold text-gold-primary">{analysis.level} Risk</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-tertiary">
                <span>Based on current holdings</span>
              </div>
            </div>

            <div className="flex min-h-[116px] flex-col justify-center px-5 py-4">
              <p className="text-[11px] font-medium text-ink-secondary">Main Risk Drivers</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {mainDriverLabels.length === 0 ? (
                  <span className="text-[10px] text-ink-tertiary">All dimensions Low.</span>
                ) : (
                  mainDriverLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-[6px] border border-gold-primary/14 bg-gold-primary/[0.055] px-3 py-1.5 text-[10px] font-medium text-gold-primary"
                    >
                      {label}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {analysis.drivers.length > 0 && (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analysis.drivers.map((driver) => (
              <RiskDriverCard key={driver.label} driver={driver} />
            ))}
          </section>
        )}

        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4 shadow-[0_0_34px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">What Can Hurt Your Portfolio</p>
          <p className="mt-2 text-[10px] text-ink-tertiary">Top positions by weight — concentration risk in a drawdown.</p>

          {analysis.topExposures.length === 0 ? (
            <p className="mt-5 text-[12px] text-ink-tertiary">No equity exposures detected.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {analysis.topExposures.map((row) => (
                <RiskExposureRow key={row.ticker} row={row} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Risk Summary</p>
          <div className="mt-3 flex gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[8px] border border-gold-primary/20 bg-gold-primary/[0.075] text-gold-primary">
              <Brain className="h-6 w-6" />
            </div>
            <p className="max-w-[640px] text-[12px] leading-[1.65] text-ink-secondary">{analysis.summary}</p>
          </div>
        </section>
      </div>
    </CopilotPageShell>
  );
}

function RiskScoreGauge({ score }: { score: number }) {
  const needleAngle = 180 - (score / 100) * 180;
  const rad = (needleAngle * Math.PI) / 180;
  const needleLength = 42;
  const needleX = 58 + Math.cos(rad) * needleLength;
  const needleY = 60 - Math.sin(rad) * needleLength;

  return (
    <svg viewBox="0 0 116 68" className="h-[78px] w-[142px] flex-none overflow-hidden drop-shadow-[0_0_16px_rgba(201,166,70,0.18)]" aria-label={`Portfolio risk score ${score} out of 100`}>
      <defs>
        <linearGradient id="portfolioRiskGaugeGold" x1="8" x2="108" y1="16" y2="16">
          <stop offset="0%" stopColor="var(--gold-deep)" />
          <stop offset="48%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--gold-primary)" />
        </linearGradient>
        <filter id="portfolioRiskGaugeGlow" x="-35%" y="-45%" width="170%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d="M11 60 A47 47 0 0 1 105 60" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="8" strokeLinecap="butt" />
      <path
        d="M11 60 A47 47 0 0 1 105 60"
        fill="none"
        stroke="url(#portfolioRiskGaugeGold)"
        pathLength="100"
        strokeDasharray={`${score} 100`}
        strokeWidth="8"
        strokeLinecap="butt"
        filter="url(#portfolioRiskGaugeGlow)"
      />
      <line x1="58" y1="60" x2={needleX.toFixed(2)} y2={needleY.toFixed(2)} stroke="rgba(255,255,255,0.24)" strokeWidth="5" strokeLinecap="round" />
      <line x1="58" y1="60" x2={needleX.toFixed(2)} y2={needleY.toFixed(2)} stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="58" cy="60" r="3.2" fill="#090908" stroke="rgba(255,255,255,0.84)" strokeWidth="1.2" />
    </svg>
  );
}

const RISK_ICON_MAP: Record<RiskDriver['iconKey'], LucideIcon> = {
  concentration: Brain,
  equity: BarChart3,
  options: Zap,
  liquidity: Shield,
};

function RiskDriverCard({ driver }: { driver: RiskDriver }) {
  const Icon = RISK_ICON_MAP[driver.iconKey];
  const toneClass = driver.tone === 'red' ? 'text-num-negative' : driver.tone === 'green' ? 'text-status-success' : 'text-gold-primary';
  const fillClass = driver.tone === 'red' ? 'bg-num-negative' : driver.tone === 'green' ? 'bg-status-success' : 'bg-gold-primary';

  return (
    <article className="min-h-[164px] rounded-[8px] border border-gold-primary/14 bg-[#080806]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.015)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-[7px] border border-gold-primary/18 bg-gold-primary/[0.055] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink-primary">{driver.label}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-ink-tertiary">{driver.sublabel}</p>
        </div>
      </div>

      <p className={`mt-4 text-[11px] font-semibold ${toneClass}`}>{driver.level}</p>
      <div className="mt-2 flex h-1.5 gap-1">
        {Array.from({ length: 7 }, (_, index) => {
          const lit = index < Math.ceil((driver.progress / 100) * 7);
          return <span key={index} className={`h-full flex-1 rounded-[2px] ${lit ? fillClass : 'bg-white/[0.08]'}`} />;
        })}
      </div>
      <p className="mt-4 text-[11px] leading-[1.55] text-ink-secondary">{driver.text}</p>
    </article>
  );
}

function RiskExposureRow({ row }: { row: TopExposure }) {
  const toneClass = row.tone === 'red' ? 'text-num-negative' : row.tone === 'green' ? 'text-status-success' : 'text-gold-primary';
  const borderClass = row.tone === 'red' ? 'border-num-negative/25' : row.tone === 'green' ? 'border-status-success/25' : 'border-gold-primary/25';
  const barClass = row.tone === 'red' ? 'bg-num-negative' : row.tone === 'green' ? 'bg-status-success' : 'bg-gold-primary';
  const initials = row.ticker.slice(0, 2).toUpperCase();
  // Bar scales weight ×4 so a 25% holding fills the meter (visual emphasis cap).
  const barWidth = `${Math.min(100, row.weightPct * 4)}%`;

  return (
    <div className="grid grid-cols-[36px_60px_1fr_60px] items-center gap-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full border bg-black/30 font-mono text-[9px] font-semibold ${toneClass} ${borderClass}`}>
        {initials}
      </div>
      <p className="font-mono text-[12px] font-semibold text-ink-primary">{row.ticker}</p>
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold ${toneClass}`}>{row.level} Exposure</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08]">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: barWidth }} />
        </div>
      </div>
      <p className="text-right font-mono text-[11px] text-ink-secondary">{row.weightPct.toFixed(1)}%</p>
    </div>
  );
}

export function CopilotAIChatPage() {
  return (
    <CopilotPageShell title="AI Portfolio Chat" eyebrow="Ask the AI about your portfolio" icon={MessageSquare}>
      <div className="min-h-[680px]">
        <CopilotChatPanel />
      </div>
    </CopilotPageShell>
  );
}

function CopilotPageShell({
  title,
  eyebrow,
  icon: Icon,
  children,
  frameless = false,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  children: ReactNode;
  frameless?: boolean;
}) {
  const { hasBetaAccess, isLoading: adminLoading } = useAdminAuth();
  const { canAccessPage, loading: accessLoading } = usePlatformAccess();
  const hasSubscriberAccess = hasBetaAccess || canAccessPage('my_portfolio').hasAccess;

  if (adminLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  if (!hasSubscriberAccess) {
    return <Navigate to="/copilot" replace />;
  }

  return (
    <div className="px-0 pt-4 text-ink-primary">
      <div className="mx-auto">
        {!frameless && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[7px] border border-gold-primary/30 bg-gold-primary/10 text-gold-primary shadow-[0_0_24px_rgba(201,166,70,0.16)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-ink-tertiary">{eyebrow}</p>
                <h1 className="text-2xl font-semibold text-gold-primary">{title}</h1>
              </div>
            </div>
            <Link to="/copilot" className="inline-flex items-center gap-2 rounded-[6px] border border-gold-primary/20 bg-black/30 px-3 py-2 text-xs uppercase text-gold-primary hover:bg-gold-primary/10">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Copilot
            </Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
      <p className="text-[10px] uppercase text-ink-tertiary">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${positive ? 'text-emerald-300' : 'text-gold-primary'}`}>{value}</p>
    </div>
  );
}

// P0.2 fix (OQ-93): explicit default export keeps the six named page
// components reachable through `m.default.X` AND through `m.X`. The latter
// is what App.tsx currently uses via `.then((m) => ({ default: m.X }))`.
// Without an `export default`, Vite/Rollup's static analysis may strip a
// named export under certain chunking conditions, leaving `m.X` undefined at
// runtime and triggering Sentry's [lazyWithRetry] / MZ-2D "Cannot read
// properties of undefined (reading 'default')" errors. Including each name
// in the default object literal pins them as live references so they
// survive tree-shaking deterministically. ADL-040: structural fix, not a
// defensive workaround. The Vite build-time guard added in vite.config.ts
// (assertLazyImportsHaveDefault) now prevents any future lazy-loaded file
// from regressing on this invariant.
const CopilotSections = {
  CopilotTopOpportunitiesPage,
  CopilotMacroPage,
  CopilotAIAnalystPage,
  CopilotHoldingsPage,
  CopilotRisksPage,
  CopilotAIChatPage,
};

export default CopilotSections;
