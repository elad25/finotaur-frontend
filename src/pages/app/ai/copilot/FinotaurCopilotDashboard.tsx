import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { SkeletonCard } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Layers3,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { MarketComparisonChart } from './components/MarketComparisonChart';
import { AssetClassAllocationCard } from './components/AssetClassAllocationCard';
import { GlobeLoader } from './components/GlobeLoader';
import { usePortfolioData, TimeRange } from './hooks/usePortfolioData';
import type { PortfolioSnapshot } from './hooks/usePortfolioData';
import { PortfolioValuePanel } from './brief/panels/PortfolioValuePanel';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { useSynthesisBrief } from './hooks/useSynthesisBrief';
import { ideaToOpportunity, TICKER_TO_NAME } from './utils/opportunityMapper';
import { TickerLogo } from './components/TickerLogo';
import type { TradeIdea } from '@/services/copilotSynthesisBriefApi';
import { computeRiskAnalysis, type PortfolioRiskAnalysis, type RiskDriver } from './utils/portfolioRisk';
import { CopilotEmptyState } from './components/CopilotEmptyState';
import { TopMoversPanel } from './components/TopMoversPanel';
import { HoldingsOverviewPanel } from './components/HoldingsOverviewPanel';
import { MarketOverviewPanel } from './components/MarketOverviewPanel';
import { CuratedNewsPanel } from './components/CuratedNewsPanel';

// Time-range list lives inside PortfolioValuePanel.

export function FinotaurCopilotDashboard() {
  const [range, setRange] = useState<TimeRange>('1M');
  const snapshot = usePortfolioData(range);
  const ib = useIBConnection();

  if (ib.loading) {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 space-y-3">
          <SkeletonCard lines={3} withGrid />
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

  // Connected but positions not yet synced (source !== 'live') — never render
  // the empty/zero snapshot as if it were the user's real portfolio.
  if (snapshot.source !== 'live') {
    return (
      <ErrorBoundary boundary="ai-copilot">
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <div className="xl:col-span-8 xl:row-span-2">
            <CopilotEmptyState
              title="Syncing your portfolio…"
              description="Your broker is connected. We're pulling your live positions — this usually completes within a few minutes of the first sync. Top opportunities and market signals are ready below."
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
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">

        {/* ROW 1 — portfolio value | globe | insights */}
        <PortfolioValuePanel
          className="xl:col-span-4"
          range={range}
          snapshot={snapshot}
          onRangeChange={setRange}
        />
        <AiBrainPanel className="xl:col-span-4" />
        <InsightsPanel className="xl:col-span-4" analysis={analysis} />

        {/* ROW 2 — allocation donut | performance comparison chart | top movers */}
        <AssetClassAllocationCard snapshot={snapshot} className="xl:col-span-3" />
        <MarketComparisonChart
          className="xl:col-span-5"
          portfolioSeries={snapshot.series}
          range={range}
          onRangeChange={setRange}
        />
        <TopMoversPanel snapshot={snapshot} className="xl:col-span-4" />

        {/* ROW 3 — holdings overview | sector exposure | market overview | curated news */}
        <HoldingsOverviewPanel snapshot={snapshot} className="xl:col-span-3" />
        <SectorExposurePanel snapshot={snapshot} className="xl:col-span-3" />
        <MarketOverviewPanel className="xl:col-span-3" />
        <CuratedNewsPanel className="xl:col-span-3" />

        {/* ROW 4 — action items strip + top opportunities full-width */}
        <ActionItemsStrip analysis={analysis} />
        <TopOpportunitiesPanel fullWidth />

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
  const { brief } = useSynthesisBrief();

  // Health = inverse of risk score. 100 = perfectly safe, 0 = max risk.
  const health = Math.max(0, 100 - analysis.score);
  const healthLabel =
    analysis.level === 'Low' ? 'Excellent' :
    analysis.level === 'Moderate' ? 'Balanced' :
    'Concentrated';
  const healthDescription =
    analysis.level === 'Low' ? 'Portfolio is well balanced across exposures.' :
    analysis.level === 'Moderate' ? 'Some exposures elevated — monitor key drivers.' :
    'High concentration or leverage — consider rebalancing.';

  // Top non-green risk drivers first (sorted by progress desc), then opportunity row fill
  const nonGreenDrivers = [...analysis.drivers]
    .filter((d) => d.tone !== 'green')
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  // If fewer than 3 risk rows, pull from top trade idea as opportunity filler
  const topIdea = brief?.trade_ideas?.[0] ?? null;
  const opportunityRow =
    topIdea && nonGreenDrivers.length < 3
      ? {
          iconKey: 'equity' as const,
          label: `Opportunity: ${topIdea.symbol ?? ''}`,
          text: topIdea.sector ? `${topIdea.sector} — ${topIdea.source}` : topIdea.source,
          tone: 'gold' as const,
          href: '/app/ai/copilot/top-opportunities',
        }
      : null;

  const allRows: Array<{
    iconKey: RiskDriver['iconKey'];
    label: string;
    text: string;
    tone: string;
    href: string;
  }> = [
    ...nonGreenDrivers.map((d) => ({ iconKey: d.iconKey, label: d.label.toUpperCase(), text: d.text, tone: d.tone, href: '/copilot/risks' })),
    ...(opportunityRow ? [opportunityRow] : []),
  ].slice(0, 3);

  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="AI COPILOT INSIGHTS" action="ANALYST" actionTo="/copilot/ai-analyst" />
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

        {allRows.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">Holdings will appear here once positions are loaded.</p>
        ) : (
          allRows.map((row) => {
            const Icon = DRIVER_ICON_MAP[row.iconKey];
            return (
              <div key={row.label} className="flex items-start gap-3 border-b border-gold-primary/10 py-3 last:border-b-0">
                <div className="h-8 w-8 flex-none rounded-[6px] border border-gold-primary/20 bg-gold-primary/9 flex items-center justify-center text-gold-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gold-primary">{row.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">{row.text}</p>
                </div>
                <Link
                  to={row.href}
                  className="flex-none text-[9px] uppercase text-ink-tertiary hover:text-gold-primary transition-colors"
                >
                  View
                </Link>
              </div>
            );
          })
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

// Derive category chip label from TradeIdea source
function sourceToTag(idea: { source: TradeIdea['source']; sector?: string }): string {
  if (idea.source === 'ism')       return 'ISM';
  if (idea.source === 'war_zone')  return 'TACTICAL';
  if (idea.source === 'weekly')    return 'WEEKLY';
  return idea.sector || 'MULTI-FACTOR';
}

/**
 * TopOpportunitiesPanel
 *
 * `fullWidth` = true  → ROW 4 horizontal grid card (xl:col-span-12)
 * `fullWidth` = false (default) → compact vertical card used in empty-state branches
 */
function TopOpportunitiesPanel({ fullWidth = false }: { fullWidth?: boolean }) {
  const { brief } = useSynthesisBrief();

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
      : [];

  if (fullWidth) {
    // ROW 4 — full-width horizontal grid
    return (
      <PremiumFrame className="xl:col-span-12 relative">
        <div className="p-5">
          <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
          {items.length === 0 ? (
            <p className="mt-4 py-6 text-center text-[11px] leading-relaxed text-ink-tertiary">
              No live trade ideas right now.<br />New ideas appear here after the next AI brief.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {items.map(({ ticker, company, tag, score }) => (
                <div
                  key={ticker}
                  className="flex items-center gap-3 rounded-[6px] border border-gold-primary/12 bg-black/30 px-3 py-3 hover:border-gold-primary/25 hover:bg-gold-primary/[0.04] transition"
                >
                  <TickerLogo ticker={ticker} size={36} className="h-9 w-9 flex-none rounded-[4px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{ticker}</p>
                    <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-[4px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-0.5 text-[9px] uppercase text-gold-primary">{tag}</span>
                    <div className="h-7 w-7 rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-[10px] text-gold-primary">{score}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link
          to="/app/ai/copilot/top-opportunities"
          className="flex h-10 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.04] text-[11px] uppercase text-gold-primary hover:bg-gold-primary/[0.08] transition"
        >
          VIEW ALL OPPORTUNITIES <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PremiumFrame>
    );
  }

  // Compact vertical — used in not-connected / syncing empty-state branches
  return (
    <PremiumFrame className="min-h-[338px]">
      <div className="p-5">
        <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <p className="py-10 text-center text-[11px] leading-relaxed text-ink-tertiary">
              No live trade ideas right now.<br />New ideas appear here after the next AI brief.
            </p>
          )}
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

/**
 * SectorExposurePanel — restyled with bars list on the left + donut on the right.
 * Title renamed to "SECTOR EXPOSURE"; VIEW ALL → /app/ai/copilot/macro.
 */
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

  // Bars scale so the largest sector fills the available width
  const maxPct = Math.max(...sectors.map((s) => s[1]), 1);

  // Donut
  const conic = buildConicGradient(sectors);
  const bucketCount = sectors.length;

  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="SECTOR EXPOSURE" action="VIEW ALL" actionTo="/app/ai/copilot/macro" />
        {sectors.length === 0 ? (
          <p className="mt-4 text-xs text-ink-tertiary">
            No sector data yet — connect a broker and sync your holdings to see exposure.
          </p>
        ) : (
          <div className="mt-4 flex items-start gap-4">
            {/* Bars list — left */}
            <div className="flex-1 space-y-2.5">
              {sectors.map(([name, value], i) => (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-[2px]"
                        style={{ background: ALLOC_PALETTE[i % ALLOC_PALETTE.length].conic }}
                      />
                      <span className="text-ink-secondary">{name}</span>
                    </div>
                    <span className="font-mono text-ink-tertiary">{value.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]"
                      style={{ width: `${Math.min(100, (value / maxPct) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Donut — right */}
            <div
              className="relative h-20 w-20 flex-none rounded-full p-2.5"
              style={{ background: conic }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#080704]">
                <span className="font-mono text-sm text-gold-primary">{bucketCount}</span>
                <span className="text-[8px] uppercase text-ink-tertiary">CLASSES</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PremiumFrame>
  );
}
