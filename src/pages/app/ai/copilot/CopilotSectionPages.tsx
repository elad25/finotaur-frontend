import { Link, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BarChart3,
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
import { usePortfolioMockData } from './hooks/usePortfolioMockData';
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

const riskRows = [
  ['Concentration', 'Medium', 'Top 3 holdings drive 58% of portfolio beta.'],
  ['Volatility', 'Medium', 'Growth allocation can widen daily drawdowns during rate shocks.'],
  ['Liquidity', 'Low', 'Core holdings remain highly liquid.'],
  ['Correlation', 'Medium', 'AI and mega-cap names can move together during risk-off sessions.'],
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
  const snapshot = usePortfolioMockData('1Y');

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

export function CopilotRisksPage() {
  return (
    <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <section className="rounded-[7px] border border-gold-primary/18 bg-[#050505]/96 p-6">
          <div className="flex min-h-[360px] items-center justify-center">
            <RiskManagementBreathingMark />
          </div>
        </section>
        <section className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
          <div className="space-y-3">
            {riskRows.map(([label, level, text]) => (
              <div key={label} className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-primary">{label}</p>
                  <span className={level === 'Low' ? 'text-emerald-300' : 'text-gold-primary'}>{level}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CopilotPageShell>
  );
}

function RiskManagementBreathingMark() {
  const totalTicks = 44;
  const fillFraction = 0.72;
  const startDeg = -132;
  const endDeg = 132;
  const ticks = Array.from({ length: totalTicks }, (_, index) => {
    const progress = index / (totalTicks - 1);
    const deg = startDeg + (endDeg - startDeg) * progress;
    const rad = ((deg - 90) * Math.PI) / 180;
    const inner = 57;
    const outer = index % 4 === 0 ? 72 : 68;
    return {
      x1: Math.cos(rad) * inner,
      y1: Math.sin(rad) * inner,
      x2: Math.cos(rad) * outer,
      y2: Math.sin(rad) * outer,
      bright: progress <= fillFraction,
      width: index % 4 === 0 ? 2.1 : 1.35,
    };
  });

  return (
    <div className="relative h-[286px] w-[286px]">
      <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.2),rgba(201,166,70,0.06)_42%,transparent_68%)] blur-xl" />
      <svg viewBox="-100 -100 200 200" className="relative h-full w-full overflow-visible drop-shadow-[0_0_30px_rgba(201,166,70,0.28)]" aria-hidden="true">
        <defs>
          <linearGradient id="riskPageGoldArc" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="45%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
          <radialGradient id="riskPageGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,217,123,0.46)" />
            <stop offset="60%" stopColor="rgba(201,166,70,0.10)" />
            <stop offset="100%" stopColor="rgba(201,166,70,0)" />
          </radialGradient>
        </defs>

        <circle r="82" fill="url(#riskPageGoldGlow)" opacity="0.56" />
        <circle r="88" fill="none" stroke="rgba(244,217,123,0.14)" strokeWidth="0.8" />
        <g opacity="0.72">
          <animateTransform attributeName="transform" type="scale" values="0.985;1.035;0.985" dur="4.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.48;0.78;0.48" dur="4.2s" repeatCount="indefinite" />
          <circle r="88" fill="none" stroke="url(#riskPageGoldArc)" strokeWidth="1.15" strokeLinecap="round" />
        </g>
        <circle r="78" fill="none" stroke="url(#riskPageGoldArc)" strokeWidth="0.9" strokeDasharray="1 4" opacity="0.68" />
        <circle r="54" fill="none" stroke="rgba(244,217,123,0.18)" strokeWidth="0.7" />

        <g stroke="url(#riskPageGoldArc)" strokeLinecap="round">
          {ticks.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1.toFixed(2)}
              y1={tick.y1.toFixed(2)}
              x2={tick.x2.toFixed(2)}
              y2={tick.y2.toFixed(2)}
              strokeWidth={tick.width}
              opacity={tick.bright ? 0.95 : 0.25}
            />
          ))}
        </g>

        <g stroke="url(#riskPageGoldArc)" strokeLinecap="round" fill="none" opacity="0.7">
          <path d="M -76 -20 A 78 78 0 0 0 -76 20" strokeWidth="1.4" />
          <path d="M 76 -20 A 78 78 0 0 1 76 20" strokeWidth="1.4" />
          <path d="M -60 -54 A 78 78 0 0 0 -50 -64" strokeWidth="1.1" />
          <path d="M 60 -54 A 78 78 0 0 1 50 -64" strokeWidth="1.1" />
          <path d="M -60 54 A 78 78 0 0 1 -50 64" strokeWidth="1.1" />
          <path d="M 60 54 A 78 78 0 0 0 50 64" strokeWidth="1.1" />
        </g>

        <g fill="var(--gold-bright)" opacity="0.82">
          <polygon points="0,-58 2.1,-55 0,-52 -2.1,-55" />
          <polygon points="0,58 2.1,55 0,52 -2.1,55" />
          <polygon points="-58,0 -55,2.1 -52,0 -55,-2.1" />
          <polygon points="58,0 55,2.1 52,0 55,-2.1" />
        </g>
      </svg>
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
      <div className="min-h-screen bg-[#030302] flex items-center justify-center text-ink-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  if (!hasSubscriberAccess) {
    return <Navigate to="/app/ai/copilot" replace />;
  }

  return (
    <div className="min-h-screen bg-[#030302] px-3 py-4 text-ink-primary">
      <main className="mx-auto max-w-[1480px]">
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
            <Link to="/app/ai/copilot" className="inline-flex items-center gap-2 rounded-[6px] border border-gold-primary/20 bg-black/30 px-3 py-2 text-xs uppercase text-gold-primary hover:bg-gold-primary/10">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Copilot
            </Link>
          </div>
        )}
        {children}
      </main>
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
