import { useState } from 'react';
import type { ReactNode } from 'react';
import { SkeletonCard } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
import { CopilotEmptyState } from './components/CopilotEmptyState';
import { PortfolioHealthPanel } from './components/PortfolioHealthPanel';

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

  return (
    <ErrorBoundary boundary="ai-copilot">
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">

        {/* ROW 1 — portfolio value | globe | portfolio health */}
        <PortfolioValuePanel
          className="xl:col-span-4"
          range={range}
          snapshot={snapshot}
          onRangeChange={setRange}
        />
        <AiBrainPanel className="xl:col-span-4" />
        <PortfolioHealthPanel className="xl:col-span-4" snapshot={snapshot} />

        {/* ROW 2 — allocation donut | performance comparison chart */}
        <AssetClassAllocationCard snapshot={snapshot} className="xl:col-span-6" />
        <MarketComparisonChart
          className="xl:col-span-6"
          portfolioSeries={snapshot.series}
          range={range}
          onRangeChange={setRange}
        />

        {/* ROW 3 — top opportunities full width */}
        <TopOpportunitiesPanel className="xl:col-span-12" fullWidth />

      </div>
    </ErrorBoundary>
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
    <div className={`relative min-h-[380px] ${className}`}>
      <div className="relative h-full min-h-[380px] flex items-start justify-center overflow-visible">
        {/* Outer decorative clip-path frame — sized up to contain the larger globe */}
        <div className="absolute top-0 h-[360px] w-[108%] max-w-[520px] border border-gold-primary/20 bg-black/15 shadow-[0_0_90px_rgba(201,166,70,0.18)] [clip-path:polygon(10%_0,90%_0,100%_16%,100%_80%,88%_100%,12%_100%,0_80%,0_16%)]" />
        {/* Inner inset frame */}
        <div className="absolute top-4 h-[324px] w-[94%] max-w-[464px] border border-gold-primary/10 [clip-path:polygon(10%_0,90%_0,100%_16%,100%_80%,88%_100%,12%_100%,0_80%,0_16%)]" />
        {/* Radial glow centred on the globe */}
        <div className="absolute left-1/2 top-[140px] h-[300px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.24),rgba(201,166,70,0.08)_38%,transparent_68%)] blur-xl" />
        {/* Globe — larger, still anchored at top-0 */}
        <div className="absolute left-1/2 top-[0px] -translate-x-1/2">
          <GlobeLoader size={360} />
        </div>
      </div>
    </div>
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

// Compact-word map for common long sector names
const COMPACT_WORD_MAP: Record<string, string> = {
  SEMICONDUCTORS:          'SEMIS',
  TECHNOLOGY:              'TECH',
  FINANCIALS:              'FINANCE',
  INDUSTRIALS:             'INDUSTRY',
  COMMUNICATIONS:          'COMMS',
  'CONSUMER DISCRETIONARY': 'CONSUMER',
  'CONSUMER STAPLES':      'STAPLES',
  'MULTI-FACTOR':          'MULTI',
};

/**
 * Produce a SHORT tag (one word, uppercase, max ~14 chars) from a trade idea.
 * Already-short tags (ISM, TACTICAL, WEEKLY) pass through unchanged.
 * For sector strings like "TECHNOLOGY / SEMICONDUCTORS", takes the last segment.
 * Applies compact-word substitutions for common long sector words.
 */
function toShortTag(idea: { source: TradeIdea['source']; sector?: string }): string {
  const raw = sourceToTag(idea);
  // Already short fixed labels — pass through
  if (raw === 'ISM' || raw === 'TACTICAL' || raw === 'WEEKLY') return raw;
  // Take the last "/" segment if present
  const segments = raw.split('/');
  const last = segments[segments.length - 1].trim().toUpperCase();
  // Apply compact-word substitution (full string first, then single word)
  if (COMPACT_WORD_MAP[last]) return COMPACT_WORD_MAP[last];
  // Try single-word substitution on the first word of last segment
  const firstWord = last.split(/\s+/)[0];
  if (COMPACT_WORD_MAP[firstWord]) return COMPACT_WORD_MAP[firstWord];
  return last;
}

/**
 * TopOpportunitiesPanel
 *
 * Two rendering modes:
 *  - compact (default): vertical list, used in empty-state / syncing branches
 *  - fullWidth: horizontal responsive grid (grid-cols-1 sm:grid-cols-2 xl:grid-cols-4),
 *    used in ROW 3 of the connected-state dashboard (xl:col-span-12)
 */
function TopOpportunitiesPanel({ className, fullWidth = false }: { className?: string; fullWidth?: boolean }) {
  const { brief } = useSynthesisBrief();

  const items: Array<{ ticker: string; company: string; tag: string; score: number }> =
    brief?.trade_ideas?.length
      ? brief.trade_ideas.slice(0, 4).map((idea, i) => {
          const opp = ideaToOpportunity(idea, i);
          return {
            ticker:  opp.ticker,
            company: TICKER_TO_NAME[opp.ticker] ?? opp.ticker,
            tag:     toShortTag(idea),
            score:   opp.score,
          };
        })
      : [];

  const emptyNode = (
    <p className="py-10 text-center text-[11px] leading-relaxed text-ink-tertiary">
      No live trade ideas right now.<br />New ideas appear here after the next AI brief.
    </p>
  );

  // Compact list card — used in non-fullWidth (sidebar/narrow) mode
  const itemCard = ({ ticker, company, tag, score }: typeof items[number]) => (
    <div key={ticker} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.045]">
      <TickerLogo ticker={ticker} size={32} className="h-8 w-8 rounded-[3px]" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{ticker}</p>
        <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
      </div>
      <span className="rounded-[4px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-1 text-[9px] uppercase text-gold-primary truncate max-w-[80px]">{tag}</span>
      <div className="h-9 w-9 rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-xs text-gold-primary">{score}</div>
    </div>
  );

  // Full-width mini-card — gold-framed card per stock (vertical layout, 4-column grid)
  const itemCardWide = ({ ticker, company, tag, score }: typeof items[number]) => (
    <div
      key={ticker}
      className="relative flex flex-col gap-1.5 overflow-hidden rounded-[7px] border border-gold-primary/24 bg-gold-primary/[0.05] p-4 shadow-[0_0_22px_rgba(201,166,70,0.10)] transition hover:border-gold-primary/45 hover:bg-gold-primary/[0.09]"
    >
      {/* Gold top hairline, matching PremiumFrame */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent" />
      {/* Row 1: logo + ticker + score circle pushed right */}
      <div className="flex items-center gap-2">
        <TickerLogo ticker={ticker} size={28} className="h-7 w-7 flex-none rounded-[3px]" />
        <p className="flex-1 text-sm font-semibold text-white">{ticker}</p>
        <div className="h-8 w-8 flex-none rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-xs text-gold-primary">{score}</div>
      </div>
      {/* Row 2: company name, single line truncated */}
      <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
      {/* Row 3: short tag chip */}
      <span className="self-start rounded-[4px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-0.5 text-[9px] uppercase text-gold-primary truncate max-w-full">{tag}</span>
    </div>
  );

  if (fullWidth) {
    return (
      <PremiumFrame className={className ?? ''}>
        {/* pb-14 ensures the absolute "VIEW ALL" bar never overlaps the last card row */}
        <div className="p-5 pb-14">
          <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
          {items.length === 0 ? (
            emptyNode
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {items.map(itemCardWide)}
            </div>
          )}
        </div>
        <Link to="/app/ai/copilot/top-opportunities" className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/30 bg-gold-primary/15 text-[11px] uppercase text-gold-bright transition-colors hover:bg-gold-primary/25 hover:text-white">
          VIEW ALL OPPORTUNITIES <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </PremiumFrame>
    );
  }

  return (
    <PremiumFrame className={`min-h-[338px] ${className ?? ''}`}>
      {/* pb-14 ensures the absolute "VIEW ALL" bar never overlaps list items */}
      <div className="p-5 pb-14">
        <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
        <div className="mt-4 space-y-2">
          {items.length === 0 && emptyNode}
          {items.map(itemCard)}
        </div>
      </div>
      <Link to="/app/ai/copilot/top-opportunities" className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary">
        VIEW ALL OPPORTUNITIES <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}

