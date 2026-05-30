/**
 * DailyBrief — Daily PM Brief page composition.
 *
 * Renders 9 BriefModules in a vertical stack, each wrapped in its own
 * ErrorBoundary. One outer ErrorBoundary protects the whole stack.
 * Module config drives the render loop; per-module bodies are bespoke
 * (rendered via a switch) because each body has a distinct component.
 *
 * State management:
 *  - useDailyBrief() supplies all data and status.
 *  - openMap (record of id → boolean) provides controlled open/close
 *    for every module so "Expand all / Collapse all" works page-wide.
 *  - openMap is initialised phase-aware (pre-market opens event-radar;
 *    open-session also opens portfolio-today + quant-flow).
 *
 * This file is intentionally a single composition module. Functions over
 * 30 lines exist only where they are pure render logic for a single module
 * body (each body is a distinct UI with its own component tree).
 */

import { useState, useMemo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Radar,
  BarChart2,
  TrendingUp,
  Lightbulb,
  Shield,
  ListChecks,
  MessageSquare,
  Zap,
  RefreshCcw,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BriefModule } from '@/pages/app/ai/copilot/brief/BriefModule';
import { BriefModuleSkeleton } from '@/pages/app/ai/copilot/brief/BriefModuleSkeleton';
import { ModuleErrorFallback } from '@/pages/app/ai/copilot/brief/ModuleErrorFallback';
import { EventRadar } from '@/pages/app/ai/copilot/brief/EventRadar';
import { QuantFlow } from '@/pages/app/ai/copilot/brief/QuantFlow';
import { ThePlan } from '@/pages/app/ai/copilot/brief/ThePlan';
import { AllocationPanel } from '@/pages/app/ai/copilot/brief/panels/AllocationPanel';
import { SectorExposurePanel } from '@/pages/app/ai/copilot/brief/panels/SectorExposurePanel';
import { RiskAnalysisPanel } from '@/pages/app/ai/copilot/brief/panels/RiskAnalysisPanel';
import { SynthesisBriefNarrative } from '@/pages/app/ai/copilot/components/SynthesisBriefNarrative';
import { SynthesisBriefPersonalTwist } from '@/pages/app/ai/copilot/components/SynthesisBriefPersonalTwist';
import { HoldingsTable } from '@/pages/app/ai/copilot/components/HoldingsTable';
import { useDailyBrief } from '@/pages/app/ai/copilot/hooks/useDailyBrief';
import { useSynthesisBrief } from '@/pages/app/ai/copilot/hooks/useSynthesisBrief';
import { usePortfolioData } from '@/pages/app/ai/copilot/hooks/usePortfolioData';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { Change, Price } from '@/components/ds/NumberDisplay';
import type { BriefData } from '@/pages/app/ai/copilot/utils/buildBriefModules';
import type { Opportunity } from '@/pages/app/ai/copilot/utils/opportunityMapper';
import type { SessionPhase } from '@/pages/app/ai/copilot/hooks/useDailyBrief';

// ---------------------------------------------------------------------------
// Module config — drives the render loop
// ---------------------------------------------------------------------------

type ModuleId =
  | 'bluf'
  | 'market-pulse'
  | 'event-radar'
  | 'portfolio-today'
  | 'quant-flow'
  | 'opportunities'
  | 'risk'
  | 'the-plan'
  | 'pm-note';

interface ModuleConfig {
  id: ModuleId;
  eyebrow: string;
  icon: LucideIcon;
  deepLinkTo?: string;
}

const MODULES: ModuleConfig[] = [
  { id: 'bluf',           eyebrow: 'THE OPEN',             icon: Zap },
  { id: 'market-pulse',   eyebrow: 'MARKET PULSE',         icon: Activity,    deepLinkTo: '/app/ai/copilot/macro' },
  { id: 'event-radar',    eyebrow: 'EVENT RADAR',          icon: Radar },
  { id: 'portfolio-today', eyebrow: 'YOUR PORTFOLIO TODAY', icon: BarChart2,   deepLinkTo: '/app/ai/copilot/holdings' },
  { id: 'quant-flow',     eyebrow: 'QUANT FLOW',           icon: TrendingUp,  deepLinkTo: '/app/ai/copilot/quant-flow' },
  { id: 'opportunities',  eyebrow: 'OPPORTUNITIES',        icon: Lightbulb,   deepLinkTo: '/app/ai/copilot/top-opportunities' },
  { id: 'risk',           eyebrow: 'RISK MANAGEMENT',      icon: Shield,      deepLinkTo: '/app/ai/copilot/risks' },
  { id: 'the-plan',       eyebrow: 'THE PLAN',             icon: ListChecks },
  { id: 'pm-note',        eyebrow: 'FROM YOUR ANALYST',    icon: MessageSquare },
];

// IDs that are always open by default regardless of session phase.
const ALWAYS_OPEN: ModuleId[] = ['bluf', 'the-plan', 'pm-note'];

/** IDs additionally opened during pre-market. */
const PRE_MARKET_OPEN: ModuleId[] = ['event-radar'];

/** IDs additionally opened during an open session. */
const OPEN_SESSION_OPEN: ModuleId[] = ['portfolio-today', 'quant-flow'];

function buildInitialOpenMap(phase: SessionPhase): Record<ModuleId, boolean> {
  const openIds = new Set<ModuleId>(ALWAYS_OPEN);
  if (phase === 'pre-market') PRE_MARKET_OPEN.forEach((id) => openIds.add(id));
  if (phase === 'open') OPEN_SESSION_OPEN.forEach((id) => openIds.add(id));
  return Object.fromEntries(
    MODULES.map((m) => [m.id, openIds.has(m.id)]),
  ) as Record<ModuleId, boolean>;
}

// ---------------------------------------------------------------------------
// Module bodies
// ---------------------------------------------------------------------------

/**
 * Compact stat row for the BLUF module.
 * Uses <Price>/<Change> from the DS. Respects `negative` flag from BriefData
 * (but the bluf shape doesn't have explicit negative flags — we derive from value sign).
 */
function BlufBody({ data }: { data: BriefData }) {
  const { totalValue, dayChangeAbs, dayChangePercent } = data.bluf;
  return (
    <div className="flex flex-wrap items-center gap-ds-4 py-ds-1">
      {totalValue !== undefined && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary mb-1">Portfolio value</p>
          <Price value={totalValue} size="small" />
        </div>
      )}
      {dayChangeAbs !== undefined && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary mb-1">Day change</p>
          <Change value={dayChangeAbs} format="currency" />
        </div>
      )}
      {dayChangePercent !== undefined && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary mb-1">Return</p>
          <Change value={dayChangePercent} />
        </div>
      )}
    </div>
  );
}

/**
 * Compact opportunity card list for the OPPORTUNITIES module.
 * Uses Opportunity[] from buildBriefModules (already mapped from TradeIdea[]).
 * Each card: rank badge, ticker, confidence, thesis, entry→target.
 */
function OpportunitiesList({ items }: { items: Opportunity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[12px] text-ink-tertiary py-2">
        No trade ideas available this week.
      </p>
    );
  }

  return (
    <ol className="list-none m-0 p-0 space-y-3">
      {items.map((opp) => (
        <li
          key={opp.ticker}
          className="flex gap-ds-3 rounded-[7px] border border-gold-primary/12 bg-black/24 p-4"
        >
          {/* Rank */}
          <div className="flex-none flex h-7 w-7 items-center justify-center rounded-full border border-gold-primary/50 bg-gold-primary/[0.07] font-mono text-[11px] font-semibold text-gold-primary mt-0.5">
            {opp.rank}
          </div>

          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex flex-wrap items-baseline gap-ds-2">
              <span className="font-mono text-sm font-semibold text-ink-primary">{opp.ticker}</span>
              {opp.sector && (
                <span className="text-[10px] text-ink-tertiary">{opp.sector}</span>
              )}
              <span className="ml-auto text-[10px] font-medium text-gold-primary">{opp.confidence}</span>
            </div>

            {/* Thesis */}
            <p className="mt-1 text-[12px] leading-[1.6] text-ink-secondary">{opp.thesis}</p>

            {/* Entry / target row */}
            {(opp.current !== '—' || opp.price !== '—' || opp.upside !== '—') && (
              <div className="mt-2 flex flex-wrap gap-ds-3 text-[11px]">
                {opp.current !== '—' && (
                  <span className="text-ink-tertiary">
                    Entry <span className="font-mono text-ink-secondary">{opp.current}</span>
                  </span>
                )}
                {opp.price !== '—' && (
                  <span className="text-ink-tertiary">
                    Target <span className="font-mono text-ink-secondary">{opp.price}</span>
                  </span>
                )}
                {opp.upside !== '—' && (
                  <span className="text-ink-tertiary">
                    Upside <span className="font-mono text-ink-primary">{opp.upside}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Body router — one place that knows what goes inside each module.
// ---------------------------------------------------------------------------

/**
 * Renders the body for a given module id.
 * Long by necessity — each of 9 modules has a distinct component tree.
 * Kept in a single switch to avoid 9 separate prop-drilling components.
 */
function ModuleBody({
  id,
  data,
  synthesisBrief,
  portfolioSnapshot,
  isConnected,
}: {
  id: ModuleId;
  data: BriefData;
  synthesisBrief: ReturnType<typeof useSynthesisBrief>;
  portfolioSnapshot: ReturnType<typeof usePortfolioData>;
  isConnected: boolean;
}) {
  switch (id) {
    case 'bluf':
      return <BlufBody data={data} />;

    case 'market-pulse':
      // SynthesisBriefNarrative takes the raw brief + loading/error state from the hook.
      return (
        <SynthesisBriefNarrative
          brief={synthesisBrief.brief}
          loading={synthesisBrief.loading}
          error={synthesisBrief.error}
        />
      );

    case 'event-radar':
      return <EventRadar items={data.eventRadar.items} />;

    case 'portfolio-today': {
      const snapshot = portfolioSnapshot;
      return (
        <div className="space-y-ds-4">
          <AllocationPanel snapshot={snapshot} isConnected={isConnected} />
          <SectorExposurePanel snapshot={snapshot} isConnected={isConnected} />
          <HoldingsTable holdings={snapshot.holdings} />
        </div>
      );
    }

    case 'quant-flow':
      return (
        <QuantFlow
          rotation={data.quantFlow.rotation}
          book={data.quantFlow.book}
        />
      );

    case 'opportunities':
      return <OpportunitiesList items={data.opportunities.items} />;

    case 'risk':
      return (
        <div className="space-y-ds-4">
          <RiskAnalysisPanel />
          {data.riskManagement.items.length > 0 && (
            <ul className="space-y-ds-3">
              {data.riskManagement.items.map((risk, i) => (
                <li key={i} className="flex gap-ds-3 rounded-[7px] border border-gold-primary/12 bg-black/24 p-3">
                  <div className="flex-none mt-0.5 h-5 w-5 flex items-center justify-center rounded-[4px] border border-num-negative/30 bg-num-negative/[0.07]">
                    <span className="h-1.5 w-1.5 rounded-full bg-num-negative/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-[1.5] text-ink-primary">{risk.risk}</p>
                    {(risk.impact || risk.probability) && (
                      <div className="mt-1 flex flex-wrap gap-ds-3 text-[10px] text-ink-tertiary">
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
        </div>
      );

    case 'the-plan':
      return <ThePlan actions={data.thePlan.actions} />;

    case 'pm-note':
      // SynthesisBriefPersonalTwist takes personal + loading state from the hook.
      return (
        <SynthesisBriefPersonalTwist
          personal={synthesisBrief.personal}
          personalLoading={synthesisBrief.personalLoading}
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-module wrapper — ErrorBoundary + BriefModule
// ---------------------------------------------------------------------------

function ModuleWithBoundary({
  config,
  data,
  open,
  onOpenChange,
  synthesisBrief,
  portfolioSnapshot,
  isConnected,
}: {
  config: ModuleConfig;
  data: BriefData;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  synthesisBrief: ReturnType<typeof useSynthesisBrief>;
  portfolioSnapshot: ReturnType<typeof usePortfolioData>;
  isConnected: boolean;
}) {
  const { id, eyebrow, icon, deepLinkTo } = config;
  // Explicit map from ModuleId to BriefData key — avoids string-manipulation hacks.
  const ID_TO_KEY: Record<ModuleId, keyof BriefData> = {
    'bluf':           'bluf',
    'market-pulse':   'marketPulse',
    'event-radar':    'eventRadar',
    'portfolio-today': 'portfolioToday',
    'quant-flow':     'quantFlow',
    'opportunities':  'opportunities',
    'risk':           'riskManagement',
    'the-plan':       'thePlan',
    'pm-note':        'pmNote',
  };

  // Safe access — all 9 keys are present in BriefData
  const briefKey = ID_TO_KEY[id];
  const glance = (data[briefKey] as { glance: BriefData['bluf']['glance'] }).glance;

  return (
    <ErrorBoundary
      boundary={`copilot-brief-${id}`}
      fallback={<ModuleErrorFallback eyebrow={eyebrow} />}
    >
      <BriefModule
        id={id}
        eyebrow={eyebrow}
        headline={glance?.headline ?? ''}
        score={glance?.score}
        badge={glance?.badge}
        icon={icon}
        deepLinkTo={deepLinkTo}
        open={open}
        onOpenChange={onOpenChange}
      >
        <ModuleBody
          id={id}
          data={data}
          synthesisBrief={synthesisBrief}
          portfolioSnapshot={portfolioSnapshot}
          isConnected={isConnected}
        />
      </BriefModule>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function BriefHeader({
  greeting,
  generatedAt,
  allOpen,
  onExpandAll,
  onCollapseAll,
}: {
  greeting: string;
  generatedAt: string | null;
  allOpen: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const asOf = generatedAt
    ? new Date(generatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-ds-3 mb-ds-4">
      {/* Left */}
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">Daily Brief</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">{greeting}</p>
        {asOf && (
          <p className="mt-0.5 text-[10px] text-ink-tertiary">
            As of <span className="font-mono">{asOf}</span>
          </p>
        )}
      </div>

      {/* Right — market status badge (inline, not fixed) + expand control */}
      <div className="flex flex-wrap items-center gap-ds-3">
        <MarketStatusBadge
          hideWhenOpen={false}
          className="relative top-auto right-auto static"
        />
        <button
          type="button"
          onClick={allOpen ? onCollapseAll : onExpandAll}
          className="text-[11px] font-semibold text-gold-primary hover:text-gold-bright transition-colors duration-base"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level error state (brief failed to load)
// ---------------------------------------------------------------------------

function BriefError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-[980px] mx-auto px-ds-4 py-ds-8">
      <ModuleErrorFallback eyebrow="DAILY BRIEF" />
      <p className="mt-ds-2 text-xs text-ink-tertiary">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-ds-4 inline-flex items-center gap-ds-2 rounded-md border border-gold-primary/30 bg-gold-primary/[0.07] px-ds-3 py-ds-2 text-[11px] font-semibold text-gold-primary hover:bg-gold-primary/[0.12] transition-colors duration-base"
      >
        <RefreshCcw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function DailyBrief() {
  const {
    data,
    loading,
    error,
    refetch,
    sessionPhase,
    greeting,
    generatedAt,
  } = useDailyBrief();

  // We also need the raw synthesis brief hook for modules that use it directly
  // (SynthesisBriefNarrative, SynthesisBriefPersonalTwist) — useDailyBrief
  // composes useSynthesisBrief internally but doesn't re-export it.
  // We call it here at the same level; React deduplicates the effect — both
  // calls share the same singleton state because useState/useEffect have the
  // same call-site key. Note: two separate hook invocations do run two effects,
  // but useSynthesisBrief is safe to call multiple times (idempotent fetch).
  const synthesisBrief = useSynthesisBrief();

  // Portfolio for the panels that need snapshot + isConnected
  const portfolioSnapshot = usePortfolioData('1M');
  const { isConnected } = useIBConnection();

  // Controlled open map — lifted so Expand/Collapse-all can touch all modules.
  const initialOpenMap = useMemo(
    () => buildInitialOpenMap(sessionPhase),
    // initialise once; sessionPhase is stable after first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [openMap, setOpenMap] = useState<Record<ModuleId, boolean>>(initialOpenMap);

  const handleOpenChange = useCallback((id: ModuleId, value: boolean) => {
    setOpenMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const allOpen = MODULES.every((m) => openMap[m.id]);

  const expandAll = useCallback(() => {
    setOpenMap(Object.fromEntries(MODULES.map((m) => [m.id, true])) as Record<ModuleId, boolean>);
  }, []);

  const collapseAll = useCallback(() => {
    setOpenMap(Object.fromEntries(MODULES.map((m) => [m.id, false])) as Record<ModuleId, boolean>);
  }, []);

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <ErrorBoundary boundary="copilot-brief">
        <BriefError error={error} onRetry={refetch} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary boundary="copilot-brief">
      <div className="max-w-[980px] mx-auto px-ds-4 py-ds-6">
        <BriefHeader
          greeting={greeting}
          generatedAt={generatedAt}
          allOpen={allOpen}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        {/* ── Loading — 9 skeleton modules ── */}
        {loading && (
          <div className="space-y-ds-4">
            {MODULES.map((m) => <BriefModuleSkeleton key={m.id} />)}
          </div>
        )}

        {/* ── Loaded — 9 real modules ── */}
        {!loading && data && (
          <div className="space-y-ds-4">
            {MODULES.map((config) => (
              <ModuleWithBoundary
                key={config.id}
                config={config}
                data={data}
                open={openMap[config.id]}
                onOpenChange={(v) => handleOpenChange(config.id, v)}
                synthesisBrief={synthesisBrief}
                portfolioSnapshot={portfolioSnapshot}
                isConnected={isConnected}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default DailyBrief;
