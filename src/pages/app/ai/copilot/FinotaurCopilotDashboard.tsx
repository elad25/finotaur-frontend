import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  Layers3,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { PerformanceChart } from './components/PerformanceChart';
import { GlobeLoader } from './components/GlobeLoader';
import { usePortfolioData, TimeRange } from './hooks/usePortfolioData';
import type { PortfolioSnapshot, PerformancePoint } from './hooks/usePortfolioData';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useSynthesisBrief } from './hooks/useSynthesisBrief';
import { ideaToOpportunity, TICKER_TO_NAME } from './utils/opportunityMapper';
import { TickerLogo } from './components/TickerLogo';
import type { TradeIdea } from '@/services/copilotSynthesisBriefApi';
import { computeRiskAnalysis, type PortfolioRiskAnalysis, type RiskDriver } from './utils/portfolioRisk';
import { CopilotEmptyState } from './components/CopilotEmptyState';

// Time-range list lives inside PerformanceChart now.

export function FinotaurCopilotDashboard() {
  const [range, setRange] = useState<TimeRange>('1Y');
  const snapshot = usePortfolioData(range);
  const ib = useIBConnection();

  if (ib.loading) {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
        </div>
      </ErrorBoundary>
    );
  }

  if (!ib.isConnected) {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <div className="xl:col-span-8 xl:row-span-2">
            <CopilotEmptyState
              title="Connect to unlock your portfolio command center"
              description="Real-time portfolio value, allocation, sector exposure, risk analysis, and AI insights — all computed from your live broker holdings. Top opportunities and market signals work without a broker."
            />
          </div>
          <AiBrainPanel className="xl:col-span-4" />
          <div className="xl:col-span-4">
            <TopOpportunitiesPanel />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Connected — compute risk once and pass down
  const analysis = computeRiskAnalysis(snapshot.holdings, snapshot.totalValue);

  return (
    <ErrorBoundary boundary="ai-copilot">
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
        <PortfolioValuePanel className="xl:col-span-4" range={range} snapshot={snapshot} />
        <AiBrainPanel className="xl:col-span-4" />
        <InsightsPanel className="xl:col-span-4" analysis={analysis} />

        {/* Action Items strip — the portfolio-manager voice. Turns analysis into
            "what should I do today" cards. Each card links to the relevant page. */}
        <ActionItemsStrip analysis={analysis} />

        <div className="xl:col-span-8">
          <PerformanceChart series={snapshot.series} range={range} onRangeChange={setRange} />
        </div>
        <div className="xl:col-span-4">
          <TopOpportunitiesPanel />
        </div>

        <AllocationPanel className="xl:col-span-4" snapshot={snapshot} />
        <SectorExposurePanel className="xl:col-span-4" snapshot={snapshot} />
        <RiskAnalysisPanel className="xl:col-span-4" analysis={analysis} />
      </div>
    </ErrorBoundary>
  );
}

interface ActionItem {
  icon: ElementType;
  title: string;
  body: string;
  toneClass: string;
  href: string;
}

/**
 * Build up to 3 prioritized action items from real analysis + live brief.
 * Items are ordered by severity — red drivers first, then gold, then the
 * weekly thesis fallback so the strip is never empty.
 */
function buildActionItems(
  analysis: PortfolioRiskAnalysis,
  centralThesis: string | undefined,
): ActionItem[] {
  const items: ActionItem[] = [];

  const concentration = analysis.drivers.find((d) => d.iconKey === 'concentration');
  if (concentration && concentration.tone !== 'green') {
    const top = analysis.topExposures[0];
    items.push({
      icon: Layers3,
      title: top ? `${top.ticker} is ${top.weightPct.toFixed(0)}% of the portfolio` : 'High concentration',
      body: 'Consider trimming to reduce single-name risk.',
      toneClass: concentration.tone === 'red' ? 'text-num-negative' : 'text-gold-primary',
      href: '/copilot/risks',
    });
  }

  const cashBuffer = analysis.drivers.find((d) => d.iconKey === 'liquidity');
  if (cashBuffer && cashBuffer.tone !== 'green') {
    items.push({
      icon: ShieldCheck,
      title: 'Low cash buffer',
      body: cashBuffer.text,
      toneClass: cashBuffer.tone === 'red' ? 'text-num-negative' : 'text-gold-primary',
      href: '/copilot/holdings',
    });
  }

  const options = analysis.drivers.find((d) => d.iconKey === 'options');
  if (options && options.tone !== 'green') {
    items.push({
      icon: Zap,
      title: 'Options leverage elevated',
      body: options.text,
      toneClass: options.tone === 'red' ? 'text-num-negative' : 'text-gold-primary',
      href: '/copilot/risks',
    });
  }

  if (items.length < 3 && centralThesis) {
    items.push({
      icon: TrendingUp,
      title: "This week's thesis",
      body: centralThesis.length > 120 ? `${centralThesis.slice(0, 117)}…` : centralThesis,
      toneClass: 'text-gold-primary',
      href: '/copilot/ai-analyst',
    });
  }

  if (items.length === 0) {
    items.push({
      icon: ShieldCheck,
      title: 'Portfolio in good shape',
      body: 'Risk dimensions look balanced. Review the weekly brief for tactical views.',
      toneClass: 'text-status-success',
      href: '/copilot/ai-analyst',
    });
  }

  return items.slice(0, 3);
}

function ActionItemsStrip({ analysis }: { analysis: PortfolioRiskAnalysis }) {
  const { brief } = useSynthesisBrief();
  const items = buildActionItems(analysis, brief?.central_thesis);

  return (
    <section className="xl:col-span-12 rounded-[7px] border border-gold-primary/14 bg-[#050505]/92 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-gold-primary" />
        <p className="text-[10px] uppercase tracking-[0.14em] text-gold-primary">Action Items</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={i}
              to={item.href}
              className="group flex gap-3 rounded-[6px] border border-gold-primary/12 bg-black/30 p-3 transition hover:border-gold-primary/30 hover:bg-gold-primary/[0.04]"
            >
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-[7px] border border-gold-primary/18 bg-gold-primary/[0.055] ${item.toneClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[12px] font-semibold leading-tight ${item.toneClass}`}>{item.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-secondary">{item.body}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 flex-none self-center text-ink-tertiary transition group-hover:text-gold-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PremiumFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-[7px] border border-gold-primary/20 bg-[#070604]/92 shadow-[0_24px_70px_rgba(0,0,0,0.48)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/65 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.075),transparent_30%,rgba(201,166,70,0.025))]" />
      <div className="relative h-full">{children}</div>
    </section>
  );
}

function PortfolioValuePanel({
  className,
  range,
  snapshot,
}: {
  className?: string;
  range: TimeRange;
  snapshot: PortfolioSnapshot;
}) {
  // Sum all CASH-class holdings to derive cash balance.
  // assetClass is carried on Holding when sourced from IBRIT; absent on mock holdings.
  const cashBalance = snapshot.holdings
    .filter((h) => h.assetClass === 'CASH')
    .reduce((sum, h) => sum + h.marketValue, 0);

  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5 h-full grid grid-rows-[1fr_auto]">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-eyebrow uppercase text-ink-tertiary">TOTAL PORTFOLIO VALUE</p>
            <Eye className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <Price
            value={snapshot.totalValue}
            size="display"
            className="mt-5 block whitespace-nowrap bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-[48px] font-normal leading-none text-transparent"
          />
          {/* Period change (% + $ sub) on the left, real sparkline on the right. */}
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-5 items-end">
            <Stat
              label="PERIOD CHANGE"
              value={<Change value={snapshot.changePercent} />}
              sub={<Change value={snapshot.changeAbs} format="currency" />}
            />
            <PortfolioSparkline series={snapshot.series} />
          </div>
        </div>
        {/* Single AVAILABLE CASH stat — cash and buying power are identical for cash-only accounts. */}
        {/* TODO: when IB account summary surfaces margin, split into two stats again. */}
        <div className="border-t border-gold-primary/12 mt-6 pt-5">
          <Stat label="AVAILABLE CASH" value={<Price value={cashBalance} size="small" />} />
        </div>
        <div className="absolute right-4 top-4 text-[10px] text-gold-primary/70">{range}</div>
      </div>
    </PremiumFrame>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</p>
      <div className="mt-2 text-sm leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs leading-none">{sub}</div>}
    </div>
  );
}

/**
 * PortfolioSparkline — small inline curve derived from the live series.
 * Replaces the previous MiniReturn component whose SVG path was hardcoded
 * (mock decoration that never reflected real portfolio history).
 * Shows the last 30 points so the curve has visible shape even for short ranges.
 */
function PortfolioSparkline({ series }: { series: PerformancePoint[] }) {
  if (series.length < 2) {
    // No history yet — render an empty box at the same footprint to keep layout stable.
    return <div className="h-7 w-28" aria-hidden="true" />;
  }
  const recent = series.slice(-30);
  const values = recent.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const valueRange = max - min || 1;
  const W = 120;
  const H = 28;

  const points = recent.map((p, i) => {
    const x = (i / Math.max(recent.length - 1, 1)) * W;
    const y = H - ((p.value - min) / valueRange) * H;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-28 text-gold-primary" aria-hidden="true">
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

// Map driver iconKey → Lucide icon. Aligned with portfolioRisk.ts's iconKey enum.
const DRIVER_ICON_MAP: Record<RiskDriver['iconKey'], ElementType> = {
  concentration: Layers3,
  equity: TrendingUp,
  options: Zap,
  liquidity: ShieldCheck,
};

function InsightsPanel({ className, analysis }: { className?: string; analysis: PortfolioRiskAnalysis }) {
  // Health = inverse of risk score. 100 = perfectly safe, 0 = max risk.
  const health = Math.max(0, 100 - analysis.score);
  const healthLabel = analysis.level === 'Low' ? 'Strong' : analysis.level === 'Moderate' ? 'Balanced' : 'Concentrated';
  const healthDescription =
    analysis.level === 'Low' ? 'Portfolio is well balanced across exposures.' :
    analysis.level === 'Moderate' ? 'Some exposures elevated — monitor key drivers.' :
    'High concentration or leverage — consider rebalancing.';

  // Top 3 drivers by progress, descending — most material risks first
  const topDrivers = [...analysis.drivers].sort((a, b) => b.progress - a.progress).slice(0, 3);

  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="AI INSIGHTS" action="CHAT" actionTo="/copilot/ai-chat" />
        <div className="mt-4 flex items-center gap-4 border-b border-gold-primary/12 pb-4">
          <div className="relative h-24 w-24 flex-none aspect-square rounded-full bg-[conic-gradient(from_210deg,var(--gold-bright)_0_18%,var(--gold-primary)_44%,var(--gold-deep)_78%,rgba(255,255,255,0.08)_78%_100%)] p-2 shadow-[0_0_26px_rgba(201,166,70,0.22)]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#090704] font-mono text-2xl tabular-nums">
              <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">{health}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ink-tertiary">PORTFOLIO HEALTH</p>
            <p className="mt-1 text-lg text-gold-primary">{healthLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{healthDescription}</p>
          </div>
        </div>
        {topDrivers.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">Holdings will appear here once positions are loaded.</p>
        ) : (
          topDrivers.map((d) => (
            <InsightRow
              key={d.label}
              icon={DRIVER_ICON_MAP[d.iconKey]}
              title={d.label.toUpperCase()}
              text={d.text}
            />
          ))
        )}
      </div>
    </PremiumFrame>
  );
}

function PanelHeader({ title, action, actionTo }: { title: string; action?: string; actionTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] uppercase text-gold-primary">{title}</p>
      {action && actionTo && (
        <Link to={actionTo} className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </Link>
      )}
      {action && !actionTo && (
        <button className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </button>
      )}
    </div>
  );
}

function InsightRow({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-3 border-b border-gold-primary/10 py-3 last:border-b-0">
      <div className="h-8 w-8 rounded-[6px] border border-gold-primary/20 bg-gold-primary/9 flex items-center justify-center text-gold-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-gold-primary">{title}</p>
        <p className="mt-1 text-xs text-ink-secondary">{text}</p>
      </div>
    </div>
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

/** Map IB AssetClass codes to human-readable display labels for the allocation panel. */
function bucketAssetClass(cls: string | undefined): string {
  const c = (cls || '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'EQUITIES';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS') return 'OPTIONS';
  if (c === 'FUT' || c === 'FUTURES') return 'FUTURES';
  if (c === 'BOND' || c === 'BONDS') return 'BONDS';
  if (c === 'CASH' || c === 'FOREX') return 'CASH';
  if (c === 'CMDTY' || c === 'COMMODITIES') return 'COMMODITIES';
  return 'OTHER';
}

// Palette for allocation donut / sector bars — gold variants + neutrals (design system ADL-020, no green).
const ALLOC_PALETTE: Array<{ swatch: string; conic: string }> = [
  { swatch: 'bg-[#f4d97b]',      conic: '#f4d97b' },
  { swatch: 'bg-[#c9a646]',      conic: '#c9a646' },
  { swatch: 'bg-[#a98220]',      conic: '#a98220' },
  { swatch: 'bg-[#7a5e16]',      conic: '#7a5e16' },
  { swatch: 'bg-[#4a3a0e]',      conic: '#4a3a0e' },
  { swatch: 'bg-white/15',       conic: 'rgba(255,255,255,0.15)' },
];

/** Build a CSS conic-gradient string from a list of (label, percent) rows. */
function buildConicGradient(rows: Array<[string, number]>): string {
  if (rows.length === 0) return 'rgba(255,255,255,0.13)';
  let cursor = 0;
  const stops: string[] = [];
  rows.forEach(([_, pct], i) => {
    const color = ALLOC_PALETTE[i % ALLOC_PALETTE.length].conic;
    const start = cursor;
    cursor += pct;
    stops.push(`${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function AllocationPanel({
  className,
  snapshot,
}: {
  className?: string;
  snapshot: PortfolioSnapshot;
}) {
  const total = snapshot.totalValue || 1;
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketAssetClass(h.assetClass);
    groups.set(label, (groups.get(label) || 0) + h.marketValue);
  }
  const rows: Array<[string, number]> = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, val]) => [label, (val / total) * 100]);

  let totalDisplay: string;
  if (snapshot.totalValue >= 1_000_000) {
    totalDisplay = `$${(snapshot.totalValue / 1_000_000).toFixed(2)}M`;
  } else if (snapshot.totalValue >= 10_000) {
    totalDisplay = `$${(snapshot.totalValue / 1_000).toFixed(1)}K`;
  } else {
    totalDisplay = `$${snapshot.totalValue.toFixed(2)}`;
  }

  const conic = buildConicGradient(rows);

  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="HOLDINGS" action="VIEW ALL" actionTo="/app/ai/copilot/holdings" />
        {rows.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No positions to allocate yet — once your broker sync completes, your allocation will appear here.
          </p>
        ) : (
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-28 w-28 rounded-full p-4" style={{ background: conic }}>
              <div className="h-full w-full rounded-full bg-[#080704] flex flex-col items-center justify-center">
                <span className="font-mono text-sm text-gold-primary">{totalDisplay}</span>
                <span className="text-[9px] uppercase text-ink-tertiary">TOTAL</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {rows.map(([label, pct], i) => (
                <div key={label} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[11px]">
                  <span className={`h-2 w-2 ${ALLOC_PALETTE[i % ALLOC_PALETTE.length].swatch}`} />
                  <span className="text-ink-secondary">{label}</span>
                  <span className="font-mono text-ink-primary">{pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}

/**
 * Map IB AssetClass to a human-readable macro bucket. For now we group by asset
 * class because the IBRIT Activity report doesn't carry ticker→sector data; a
 * future enhancement could enrich equity holdings with sector lookups
 * (Polygon / IEX), but until then "Cash" / "Equities" / "Options" etc. is the
 * honest classification we can prove from the source data.
 */
function bucketSector(cls: string | undefined): string {
  const c = (cls || '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'Equities';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS') return 'Options';
  if (c === 'FUT' || c === 'FUTURES') return 'Futures';
  if (c === 'BOND' || c === 'BONDS') return 'Bonds';
  if (c === 'CASH' || c === 'FOREX') return 'Cash';
  if (c === 'CMDTY' || c === 'COMMODITIES') return 'Commodities';
  return 'Other';
}

function SectorExposurePanel({
  className,
  snapshot,
}: {
  className?: string;
  snapshot: PortfolioSnapshot;
}) {
  const total = snapshot.totalValue || 1;
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketSector(h.assetClass);
    groups.set(label, (groups.get(label) || 0) + h.marketValue);
  }
  const sectors: Array<[string, number]> = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, val]) => [label, (val / total) * 100]);

  // Bars scale so the largest sector fills the available width; tiny allocations stay visible.
  const maxPct = Math.max(...sectors.map((s) => s[1]), 1);

  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="MACRO" action="VIEW ALL" actionTo="/app/ai/copilot/macro" />
        {sectors.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No sector data yet — connect a broker and sync your holdings to see exposure.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sectors.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[1fr_130px_42px] items-center gap-3 text-[11px]">
                <span className="text-ink-secondary truncate">{name}</span>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]"
                    style={{ width: `${Math.min(100, (value / maxPct) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-ink-tertiary text-right">{value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}

function RiskAnalysisPanel({ className, analysis }: { className?: string; analysis: PortfolioRiskAnalysis }) {
  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="RISK ANALYSIS" action="VIEW ALL" actionTo="/copilot/risks" />
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-4 items-center">
          <RiskManagementGoldMark />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-gold-primary/10 text-[11px]">
              <span className="text-ink-tertiary">Overall</span>
              <span className="font-mono text-gold-primary">{analysis.score}/100 · {analysis.level}</span>
            </div>
            {analysis.drivers.length === 0 ? (
              <p className="text-[11px] text-ink-tertiary">No drivers computed yet.</p>
            ) : (
              analysis.drivers.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-ink-secondary">{d.label}</span>
                  <span className={d.tone === 'red' ? 'text-num-negative' : d.tone === 'green' ? 'text-status-success' : 'text-gold-primary'}>{d.level}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PremiumFrame>
  );
}

function RiskManagementGoldMark() {
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
    <div className="relative h-32 w-32">
      <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.18),rgba(201,166,70,0.05)_42%,transparent_68%)] blur-md" />
      <svg viewBox="-100 -100 200 200" className="relative h-full w-full overflow-visible drop-shadow-[0_0_22px_rgba(201,166,70,0.26)]" aria-hidden="true">
        <defs>
          <linearGradient id="riskGoldArc" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="45%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
          <linearGradient id="riskGoldText" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="60%" stopColor="var(--gold-primary)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
          <radialGradient id="riskGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,217,123,0.46)" />
            <stop offset="60%" stopColor="rgba(201,166,70,0.10)" />
            <stop offset="100%" stopColor="rgba(201,166,70,0)" />
          </radialGradient>
        </defs>

        <circle r="82" fill="url(#riskGoldGlow)" opacity="0.56" />
        <circle r="88" fill="none" stroke="rgba(244,217,123,0.14)" strokeWidth="0.8" />
        <g opacity="0.72">
          <animateTransform attributeName="transform" type="scale" values="0.985;1.035;0.985" dur="4.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.48;0.78;0.48" dur="4.2s" repeatCount="indefinite" />
          <circle
            r="88"
            fill="none"
            stroke="url(#riskGoldArc)"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
        </g>
        <circle r="78" fill="none" stroke="url(#riskGoldArc)" strokeWidth="0.9" strokeDasharray="1 4" opacity="0.68" />
        <circle r="54" fill="none" stroke="rgba(244,217,123,0.18)" strokeWidth="0.7" />

        <g stroke="url(#riskGoldArc)" strokeLinecap="round">
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

        <g stroke="url(#riskGoldArc)" strokeLinecap="round" fill="none" opacity="0.7">
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
