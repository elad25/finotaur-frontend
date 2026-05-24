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
import { HoldingsTable } from './components/HoldingsTable';
import { usePortfolioData } from './hooks/usePortfolioData';
import { getCompanyLogo } from './utils/companyLogo';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';

const opportunities = [
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

const macroRegimeRows = [
  { label: 'Macro Regime', value: 'Disinflationary Growth', detail: 'Improving backdrop', tone: 'green' },
  { label: 'Global Growth (2026)', value: '2.8%', detail: '+0.3% vs prev. month', tone: 'green' },
  { label: 'Global Inflation', value: '2.6%', detail: '-0.2% vs prev. month', tone: 'green' },
  { label: 'Fed Policy Path', value: 'Easing in Q4 26', detail: '2 cuts priced', tone: 'green' },
  { label: 'Risk Sentiment', value: 'Positive', detail: 'Improving', tone: 'green', gauge: true },
  { label: 'Market Impact', value: 'Risk-On', detail: 'Selective Opportunities', tone: 'green' },
];

const macroDriverRows = [
  { label: 'Rates', badge: 'Neutral -> Supportive', text: 'Cuts priced gradually; duration risk is controlled.', metric: '10Y UST Yield', value: '4.18%', change: '-0.12%', tone: 'gold', path: 0 },
  { label: 'Inflation', badge: 'Disinflating', text: 'Core CPI trending lower, goods deflation continues.', metric: 'Global CPI YoY', value: '2.6%', change: '-0.2%', tone: 'green', path: 1 },
  { label: 'Growth', badge: 'Improving', text: 'Resilient US demand; EM recovery gaining traction.', metric: 'Global GDP (2026)', value: '2.8%', change: '+0.3%', tone: 'green', path: 2 },
  { label: 'Liquidity', badge: 'Constructive', text: 'Central banks easing; liquidity conditions improving.', metric: 'Global Liquidity Index', value: '62', change: '+4', tone: 'green', path: 3 },
  { label: 'USD', badge: 'Neutral', text: 'Dollar plateauing; DXY range bound in near term.', metric: 'DXY Index', value: '104.2', change: '-0.6%', tone: 'red', path: 4 },
  { label: 'Geopolitics', badge: 'Elevated', text: 'Tensions persist but markets well-adjusted.', metric: 'Geo Risk Index', value: '68', change: '-3', tone: 'green', path: 5 },
];

const scenarioRows = [
  { label: 'Base Case', weight: '60%', growth: '2.8%', inflation: '2.6%', market: 'Strong Bull', tone: 'green' },
  { label: 'Bull Case', weight: '20%', growth: '3.4%', inflation: '2.3%', market: 'Strong Bull', tone: 'gold' },
  { label: 'Bear Case', weight: '20%', growth: '1.6%', inflation: '2.7%', market: 'Risk-Off', tone: 'red' },
];

const implicationRows = [
  { label: 'Overweight', text: 'Technology, Communication Services, Industrials', tone: 'green' },
  { label: 'Neutral', text: 'Financials, Energy', tone: 'gold' },
  { label: 'Underweight', text: 'Consumer Staples, Utilities, Long Duration Bonds', tone: 'red' },
  { label: 'Opportunities', text: 'AI Infrastructure, Cloud, Cybersecurity, Semiconductors', tone: 'green' },
];

const benefitRows = [
  'High quality growth aligned with macro tailwinds',
  'Low duration reduces rate sensitivity',
  'Diversified across secular themes',
  'Positioned for risk-on environment',
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

const riskDriverCards = [
  {
    label: 'Rates',
    sublabel: 'Interest Rate Risk',
    level: 'High',
    tone: 'red',
    icon: BarChart3,
    progress: 50,
    text: 'Duration sensitivity is elevated. Rate shocks could pressure growth assets.',
  },
  {
    label: 'AI Correlation',
    sublabel: 'Correlation Risk',
    level: 'Medium',
    tone: 'gold',
    icon: Brain,
    progress: 38,
    text: 'AI and mega-cap names are highly correlated. Risk-off could hit valuations.',
  },
  {
    label: 'Liquidity',
    sublabel: 'Liquidity Risk',
    level: 'Low',
    tone: 'green',
    icon: Shield,
    progress: 28,
    text: 'Core holdings remain liquid. Market depth is supportive.',
  },
  {
    label: 'Volatility',
    sublabel: 'Volatility Risk',
    level: 'Medium',
    tone: 'gold',
    icon: Zap,
    progress: 44,
    text: 'Volatility can expand during macroeconomic surprises. Stay nimble.',
  },
] as const;

const riskScenarioRows = [
  { label: 'Soft Landing', probability: '48%', impact: '+4.2%', tone: 'green', path: 'M3 62 C12 56 18 59 27 52 C38 43 45 48 54 38 C64 27 71 34 81 21 C90 12 95 18 105 8' },
  { label: 'Sticky Inflation', probability: '27%', impact: '-6.8%', tone: 'gold', path: 'M3 58 C12 50 18 54 27 47 C38 38 45 44 54 34 C64 24 72 30 82 19 C91 12 96 17 105 5' },
  { label: 'Recession', probability: '15%', impact: '-14.2%', tone: 'red', path: 'M3 14 C12 22 18 16 27 25 C39 31 45 27 55 38 C66 47 74 43 84 52 C94 61 98 58 105 68' },
] as const;

const riskExposureRows = [
  { ticker: 'NVDA', level: 'High Exposure', tone: 'red', width: '92%', mark: 'NV' },
  { ticker: 'TSLA', level: 'High Exposure', tone: 'red', width: '91%', mark: 'T' },
  { ticker: 'QQQ', level: 'High Exposure', tone: 'red', width: '88%', mark: 'QQ' },
  { ticker: 'MSFT', level: 'Medium Exposure', tone: 'gold', width: '72%', mark: 'MS' },
  { ticker: 'META', level: 'Medium Exposure', tone: 'gold', width: '68%', mark: 'ME' },
] as const;

const riskMitigationIdeas = [
  { title: 'Rates Hedge', text: 'Add duration hedge via TLT or rate swaps.', impact: 'High', tone: 'red', icon: Shield },
  { title: 'Volatility Hedge', text: 'Increase VIX exposure via calls or UVXY.', impact: 'Medium', tone: 'gold', icon: Zap },
  { title: 'Quality Tilt', text: 'Rotate into quality and earnings stability.', impact: 'Medium', tone: 'gold', icon: BarChart3 },
  { title: 'Diversification', text: 'Add non-correlated assets: GLD, utilities.', impact: 'Medium', tone: 'gold', icon: Globe },
] as const;

export function CopilotTopOpportunitiesPage() {
  return (
    <CopilotPageShell title="Top Opportunities" eyebrow="AI-ranked portfolio actions" icon={Zap} frameless>
      <div className="space-y-3">
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

function OpportunityTableRow({ opportunity }: { opportunity: (typeof opportunities)[number] }) {
  const logo = getCompanyLogo(opportunity.ticker);

  return (
    <tr className="group h-[88px] bg-[#050505] align-middle">
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-primary/65 bg-[radial-gradient(circle_at_50%_42%,rgba(201,166,70,0.16),rgba(201,166,70,0.04)_52%,transparent_74%)] font-mono text-sm font-semibold text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.12),inset_0_0_12px_rgba(201,166,70,0.08)]">
          {opportunity.rank}
        </div>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-white/8 bg-[#0b0b0b] shadow-[inset_0_0_18px_rgba(255,255,255,0.02)]">
            {logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" /> : <span className="font-mono text-base text-gold-primary">{opportunity.ticker.slice(0, 1)}</span>}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-base font-semibold leading-tight text-ink-primary">{opportunity.ticker}</p>
            <p className="mt-1 max-w-[170px] truncate text-[11px] font-medium text-ink-secondary">{opportunity.name}</p>
            <span className="mt-1.5 inline-flex rounded-[4px] bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-ink-tertiary">{opportunity.sector}</span>
          </div>
        </div>
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <ScoreRing score={opportunity.score} />
      </td>
      <td className="border-b border-gold-primary/10 px-2">
        <p className="max-w-[230px] text-[12px] leading-[1.45] text-ink-secondary">{opportunity.thesis}</p>
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
        <p className="text-xs text-ink-primary">{opportunity.timeframe}</p>
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
  return (
    <CopilotPageShell title="Macro" eyebrow="Portfolio-aware macro lens" icon={Globe}>
      <div className="space-y-3">
        <section className="overflow-hidden rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 shadow-[0_0_34px_rgba(0,0,0,0.45)]">
          <div className="grid divide-y divide-gold-primary/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-6">
            {macroRegimeRows.map((row) => (
              <div key={row.label} className="min-h-[96px] px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-ink-tertiary">{row.label}</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className={`text-[19px] font-semibold leading-tight tracking-normal ${row.tone === 'green' ? 'text-[#6bec78]' : 'text-gold-primary'}`}>{row.value}</p>
                  {row.gauge && <MacroSentimentGauge />}
                </div>
                <p className="mt-2 text-[11px] font-medium leading-snug text-[#4ee66e]">{row.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-2">
          <p className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Macro Drivers</p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            {macroDriverRows.map((driver) => (
              <MacroDriverCard key={driver.label} driver={driver} />
            ))}
          </div>
        </section>

        <MacroScenarioTable />

        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-3">
          <div className="flex items-center gap-2 text-gold-primary">
            <BarChart3 className="h-4 w-4" />
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em]">Portfolio Sensitivity</p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Metric label="Rate shock" value="-3.2%" />
            <Metric label="USD spike" value="-1.4%" />
            <Metric label="Risk-on rally" value="+6.8%" positive />
          </div>
        </section>
      </div>
    </CopilotPageShell>
  );
}

function MacroScenarioTable() {
  return (
    <section className="grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
      <div className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Global Forecast & Scenarios</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[0.76fr_1.7fr]">
          <div className="rounded-[7px] border border-gold-primary/10 bg-[#070707] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#62ef79]">Base Case (60%)</p>
            <p className="mt-3 text-[12px] font-medium leading-[1.6] text-ink-secondary">Soft landing with disinflation and resilient growth.</p>
            <ul className="mt-5 space-y-3 text-[11px] text-ink-secondary">
              {['Growth stabilizes', 'Inflation trends lower', 'Central banks ease', 'Risk assets grind higher'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#5af06e]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button type="button" className="mt-5 text-[11px] font-semibold text-gold-primary">View Scenario Detail →</button>
          </div>

          <div className="min-h-[260px] rounded-[7px] border border-gold-primary/10 bg-[#070707] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">GDP Growth Forecast</p>
              <div className="flex items-center gap-3 text-[9px] text-ink-tertiary">
                <LegendDot color="#63ef7c" label="Base Case" />
                <LegendDot color="#d7b24d" label="Bull Case" />
                <LegendDot color="#f05d55" label="Bear Case" />
              </div>
            </div>
            <ForecastChart />
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {scenarioRows.map((row) => (
                <ScenarioInlineStat key={row.label} row={row} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.95fr_1fr]">
        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-primary">Portfolio Implications</p>
          <div className="mt-4 space-y-4">
            {implicationRows.map((row) => (
              <ImplicationRow key={row.label} row={row} />
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-primary">How Your Portfolio Benefits</p>
          <ul className="mt-4 space-y-3 border-b border-gold-primary/10 pb-4 text-[11px] font-medium text-ink-secondary">
            {benefitRows.map((row) => (
              <li key={row} className="flex gap-2">
                <span className="text-[#5af06e]">✓</span>
                {row}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-4">
            <AlignmentRing />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Portfolio Alignment</p>
              <p className="mt-2 text-sm font-semibold text-gold-primary">Well Positioned</p>
              <p className="mt-1 text-[11px] leading-[1.5] text-ink-secondary">Aligned with macro backdrop</p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ForecastChart() {
  return (
    <svg viewBox="0 0 420 220" className="mt-4 h-[210px] w-full" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => (
        <line key={line} x1="42" x2="410" y1={26 + line * 38} y2={26 + line * 38} stroke="rgba(201,166,70,0.12)" strokeWidth="1" />
      ))}
      {['2023', '2024', '2025', '2026E', '2027E'].map((year, index) => (
        <text key={year} x={50 + index * 82} y="208" fill="rgba(202,210,216,0.55)" fontSize="11">{year}</text>
      ))}
      {['4%', '3%', '2%', '1%', '0%'].map((tick, index) => (
        <text key={tick} x="8" y={30 + index * 38} fill="rgba(202,210,216,0.55)" fontSize="11">{tick}</text>
      ))}
      <path d="M48 66 L130 78 L210 95 L292 82 L386 44" fill="none" stroke="#63ef7c" strokeWidth="2.2" />
      <path d="M48 118 L130 126 L210 112 L292 88 L386 100" fill="none" stroke="#d7b24d" strokeWidth="2" />
      <path d="M48 140 L130 126 L210 148 L292 120 L386 142" fill="none" stroke="#f05d55" strokeWidth="2" />
      <path d="M210 95 L292 82 L386 44" fill="none" stroke="#63ef7c" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" />
      <path d="M210 112 L292 88 L386 100" fill="none" stroke="#d7b24d" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" />
      <path d="M210 148 L292 120 L386 142" fill="none" stroke="#f05d55" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" />
      <rect x="210" y="26" width="82" height="154" fill="rgba(201,166,70,0.07)" />
    </svg>
  );
}

function ScenarioInlineStat({ row }: { row: (typeof scenarioRows)[number] }) {
  const toneClass = row.tone === 'red' ? 'text-[#ff665f]' : row.tone === 'gold' ? 'text-gold-primary' : 'text-[#5af06e]';
  return (
    <div className="rounded-[6px] border border-gold-primary/10 bg-black/20 px-3 py-2">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${toneClass}`}>{row.label} ({row.weight})</p>
      <p className="mt-1 text-[10px] text-ink-tertiary">Growth <span className={toneClass}>{row.growth}</span> · Inflation <span className={toneClass}>{row.inflation}</span> · {row.market}</p>
    </div>
  );
}

function ImplicationRow({ row }: { row: (typeof implicationRows)[number] }) {
  const toneClass = row.tone === 'red' ? 'text-[#ff665f] border-[#ff665f]/35 bg-[#ff665f]/7' : row.tone === 'gold' ? 'text-gold-primary border-gold-primary/35 bg-gold-primary/7' : 'text-[#5af06e] border-[#5af06e]/35 bg-[#5af06e]/7';
  return (
    <div className="flex gap-3">
      <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full border ${toneClass}`}>
        <span className="h-3 w-3 rounded-[3px] border border-current" />
      </div>
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${toneClass.split(' ')[0]}`}>{row.label}</p>
        <p className="mt-1 text-[11px] leading-[1.45] text-ink-secondary">{row.text}</p>
      </div>
    </div>
  );
}

function AlignmentRing() {
  return (
    <div className="relative flex h-[78px] w-[78px] flex-none items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(#67ee75_0deg_281deg,rgba(201,166,70,0.22)_281deg_360deg)] p-[7px]">
        <div className="h-full w-full rounded-full bg-[#050505]" />
      </div>
      <span className="relative text-lg font-semibold text-[#78f47e]">78%</span>
    </div>
  );
}

function MacroDriverCard({ driver }: { driver: (typeof macroDriverRows)[number] }) {
  const badgeClass = driver.tone === 'green' ? 'text-[#63ef7c]' : driver.tone === 'red' ? 'text-[#ff665f]' : 'text-gold-primary';
  const changeClass = driver.change.startsWith('-') && driver.tone === 'red' ? 'text-[#ff665f]' : 'text-[#59ec75]';

  return (
    <article className="min-h-[178px] rounded-[7px] border border-gold-primary/14 bg-[#070707] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.015)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">{driver.label}</p>
        <span className={`rounded-[4px] border border-gold-primary/14 bg-gold-primary/[0.055] px-2 py-0.5 text-[8px] font-semibold uppercase ${badgeClass}`}>{driver.badge}</span>
      </div>
      <p className="mt-5 min-h-[38px] text-[11px] font-medium leading-[1.6] text-ink-secondary">{driver.text}</p>
      <MacroSparkline index={driver.path} />
      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.08em] text-ink-tertiary">{driver.metric}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-[19px] font-semibold leading-none text-ink-primary">{driver.value}</p>
        <p className={`text-sm font-semibold ${changeClass}`}>{driver.change}</p>
      </div>
    </article>
  );
}

function MacroSentimentGauge() {
  return (
    <div className="relative h-10 w-16 flex-none overflow-hidden">
      <div className="absolute left-1 top-1 h-14 w-14 rounded-full border-[7px] border-transparent [border-top-color:#45c76b] [border-right-color:#be6a3a] [border-left-color:#2f8d55] rotate-[-45deg]" />
      <div className="absolute bottom-0 left-1/2 h-5 w-10 -translate-x-1/2 bg-[#050505]" />
    </div>
  );
}

function MacroSparkline({ index }: { index: number }) {
  const paths = [
    'M2 26 C10 31 17 17 25 20 C35 24 39 29 48 22 C58 14 62 27 72 25 C84 23 90 16 98 22 C108 30 116 20 126 25 C135 29 142 22 150 24',
    'M2 17 C10 25 16 24 24 18 C35 10 39 22 48 20 C60 17 64 28 74 27 C84 26 91 17 100 19 C112 22 122 24 130 20 C138 17 145 24 150 23',
    'M2 18 C13 25 19 20 28 18 C38 16 45 24 54 22 C64 20 69 25 78 21 C89 17 98 23 108 22 C119 21 129 27 139 23 C144 21 148 18 150 19',
    'M2 19 C9 25 17 28 27 22 C35 17 43 20 52 19 C63 18 70 27 80 26 C91 25 96 18 106 21 C118 25 126 19 136 25 C142 29 146 25 150 24',
    'M2 15 C11 29 19 24 27 18 C36 12 42 25 52 23 C62 21 67 13 77 18 C88 24 94 30 105 23 C116 16 120 23 130 20 C139 18 145 20 150 22',
    'M2 23 C11 26 16 21 24 20 C34 18 40 12 50 18 C60 24 66 25 76 20 C86 15 92 22 102 21 C113 20 119 14 130 18 C138 21 145 18 150 17',
  ];

  return (
    <svg viewBox="0 0 152 38" className="mt-3 h-10 w-full text-gold-primary" aria-hidden="true">
      <path d={paths[index % paths.length]} fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${paths[index % paths.length]} L150 38 L2 38 Z`} fill="url(#macroSparkFill)" opacity="0.18" />
      <defs>
        <linearGradient id="macroSparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#C9A646" />
          <stop offset="1" stopColor="#C9A646" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
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
  return (
    <CopilotPageShell title="AI Analyst" eyebrow="Detailed per-user intelligence report" icon={Brain}>
      <div className="space-y-3">
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
  return (
    <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
      <div className="space-y-3">
        <section className="overflow-hidden rounded-[8px] border border-gold-primary/18 bg-[linear-gradient(135deg,#171816_0%,#10100f_52%,#18150e_100%)] shadow-[0_18px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="px-5 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-normal text-ink-tertiary">Portfolio Risk Score</p>
          </div>
          <div className="grid divide-y divide-gold-primary/10 lg:grid-cols-[1.05fr_0.86fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="flex min-h-[116px] items-center gap-4 px-5 pb-4 pt-2">
              <RiskScoreGauge score={74} />
              <div className="pt-1">
                <p className="font-mono text-[35px] font-semibold leading-none tabular-nums text-gold-primary">74</p>
                <p className="mt-2 font-mono text-[11px] text-ink-secondary">/100</p>
              </div>
            </div>

            <div className="flex min-h-[116px] flex-col justify-center px-5 py-4">
              <p className="text-sm font-semibold text-gold-primary">Moderate Risk</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-tertiary">
                <span>vs last week</span>
                <span className="font-mono font-semibold text-status-success">down 6</span>
              </div>
            </div>

            <div className="flex min-h-[116px] flex-col justify-center px-5 py-4">
              <p className="text-[11px] font-medium text-ink-secondary">Main Risk Drivers</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Rates', 'AI Correlation', 'USD Strength'].map((driver) => (
                  <span
                    key={driver}
                    className="rounded-[6px] border border-gold-primary/14 bg-gold-primary/[0.055] px-3 py-1.5 text-[10px] font-medium text-gold-primary"
                  >
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {riskDriverCards.map((driver) => (
            <RiskDriverCard key={driver.label} driver={driver} />
          ))}
        </section>

        <RiskScenarioTable />
        <RiskMitigationSummary />
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

function RiskDriverCard({ driver }: { driver: (typeof riskDriverCards)[number] }) {
  const Icon = driver.icon;
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

function RiskScenarioTable() {
  return (
    <section className="grid gap-3 xl:grid-cols-[1.18fr_0.88fr]">
      <div className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4 shadow-[0_0_34px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Macro Scenario Analysis</p>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink-tertiary/30 text-[9px] text-ink-tertiary">i</span>
          </div>
          <button type="button" className="flex items-center gap-1.5 text-[10px] font-semibold text-gold-primary">
            View Details
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3 md:divide-x md:divide-gold-primary/10">
          {riskScenarioRows.map((scenario) => (
            <RiskScenarioCard key={scenario.label} scenario={scenario} />
          ))}
        </div>

        <p className="mt-4 border-t border-gold-primary/10 pt-3 text-[10px] leading-relaxed text-ink-tertiary">
          Probabilities are AI-estimated and updated daily based on market data.
        </p>
      </div>

      <div className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4 shadow-[0_0_34px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">What Can Hurt Your Portfolio</p>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink-tertiary/30 text-[9px] text-ink-tertiary">i</span>
        </div>
        <p className="mt-2 text-[10px] text-ink-tertiary">Top vulnerabilities in a risk-off scenario.</p>

        <div className="mt-5 space-y-3">
          {riskExposureRows.map((row) => (
            <RiskExposureRow key={row.ticker} row={row} />
          ))}
        </div>

        <button type="button" className="mx-auto mt-6 flex items-center gap-2 text-[11px] font-semibold text-gold-primary">
          View Full Exposure Map
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function RiskScenarioCard({ scenario }: { scenario: (typeof riskScenarioRows)[number] }) {
  const toneClass = scenario.tone === 'red' ? 'text-num-negative' : scenario.tone === 'green' ? 'text-status-success' : 'text-gold-primary';
  const strokeColor = scenario.tone === 'red' ? 'var(--num-negative)' : scenario.tone === 'green' ? 'var(--status-success)' : 'var(--gold-primary)';

  return (
    <article className="min-w-0 md:px-4 md:first:pl-0 md:last:pr-0">
      <p className={`text-sm font-semibold ${toneClass}`}>{scenario.label}</p>
      <p className="mt-4 text-[11px] text-ink-tertiary">Probability</p>
      <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${toneClass}`}>{scenario.probability}</p>
      <svg viewBox="0 0 110 76" className="mt-1 h-[74px] w-full" aria-hidden="true">
        <path d={scenario.path} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`${scenario.path} L105 76 L3 76 Z`} fill={strokeColor} opacity="0.08" />
      </svg>
      <p className="text-[11px] text-ink-tertiary">Portfolio Impact (1Y)</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>{scenario.impact}</p>
    </article>
  );
}

function RiskExposureRow({ row }: { row: (typeof riskExposureRows)[number] }) {
  const toneClass = row.tone === 'red' ? 'text-num-negative' : 'text-gold-primary';
  const barClass = row.tone === 'red' ? 'bg-num-negative' : 'bg-gold-primary';

  return (
    <div className="grid grid-cols-[36px_48px_1fr] items-center gap-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full border bg-black/30 font-mono text-[9px] font-semibold ${toneClass} ${row.tone === 'red' ? 'border-num-negative/25' : 'border-gold-primary/25'}`}>
        {row.mark}
      </div>
      <p className="font-mono text-[12px] font-semibold text-ink-primary">{row.ticker}</p>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-[10px] font-semibold ${toneClass}`}>{row.level}</p>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08]">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: row.width }} />
        </div>
      </div>
    </div>
  );
}

function RiskMitigationSummary() {
  return (
    <section className="grid gap-3 xl:grid-cols-[1.18fr_0.88fr]">
      <div className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4 shadow-[0_0_34px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Risk Mitigation Ideas</p>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink-tertiary/30 text-[9px] text-ink-tertiary">i</span>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {riskMitigationIdeas.map((idea) => (
            <RiskMitigationCard key={idea.title} idea={idea} />
          ))}
        </div>
      </div>

      <div className="rounded-[8px] border border-gold-primary/14 bg-[#050505]/96 p-4 shadow-[0_0_34px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">AI Risk Summary</p>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink-tertiary/30 text-[9px] text-ink-tertiary">i</span>
        </div>

        <div className="mt-5 flex gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[8px] border border-gold-primary/20 bg-gold-primary/[0.075] text-gold-primary shadow-[0_0_22px_rgba(201,166,70,0.15)]">
            <Brain className="h-7 w-7" />
          </div>
          <p className="max-w-[420px] text-[12px] leading-[1.65] text-ink-secondary">
            Portfolio risk is <span className="font-semibold text-gold-primary">Moderate</span>. Elevated exposure to rates,
            AI correlation, and growth. Maintain hedges and monitor inflation and FOMC signals.
          </p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] text-ink-tertiary">Overall Outlook</p>
            <p className="mt-1 text-xl font-semibold text-gold-primary">Moderate</p>
          </div>
          <RiskSummarySparkline />
        </div>
      </div>
    </section>
  );
}

function RiskMitigationCard({ idea }: { idea: (typeof riskMitigationIdeas)[number] }) {
  const Icon = idea.icon;
  const toneClass = idea.tone === 'red' ? 'text-num-negative' : 'text-gold-primary';

  return (
    <article className="min-h-[150px] rounded-[7px] border border-gold-primary/12 bg-[#080806]/95 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-[7px] border border-gold-primary/18 bg-gold-primary/[0.055] text-gold-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[12px] font-semibold text-ink-primary">{idea.title}</p>
      <p className="mt-2 min-h-[40px] text-[10px] leading-[1.5] text-ink-secondary">{idea.text}</p>
      <p className="mt-3 text-[9px] text-ink-tertiary">Impact</p>
      <p className={`mt-1 text-[11px] font-semibold ${toneClass}`}>{idea.impact}</p>
    </article>
  );
}

function RiskSummarySparkline() {
  return (
    <svg viewBox="0 0 180 62" className="h-[62px] w-[180px] flex-none text-gold-primary" aria-hidden="true">
      <path
        d="M3 52 C14 45 21 51 31 38 C42 24 49 33 59 28 C71 21 77 34 88 30 C99 26 103 15 114 19 C126 24 134 15 145 17 C157 19 165 10 177 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 52 C14 45 21 51 31 38 C42 24 49 33 59 28 C71 21 77 34 88 30 C99 26 103 15 114 19 C126 24 134 15 145 17 C157 19 165 10 177 6 L177 62 L3 62 Z"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
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
