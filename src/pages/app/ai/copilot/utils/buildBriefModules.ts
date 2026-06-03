/**
 * buildBriefModules — pure adapter that maps raw API data into the typed
 * BriefData shape consumed by the Daily PM Brief page.
 *
 * No React, no side-effects. Fully defensive: every field may be null/empty.
 * All strings are English-only (IRON RULE).
 */

import type {
  SynthesisBrief,
  PersonalizedBriefPayload,
  GroundSentimentItem,
  KeyRisk,
  TradeIdea,
  EventRadarItem,
  PlanAction,
} from '@/services/copilotSynthesisBriefApi';
import type {
  DailyGlobalBrief,
  DailyPersonalization,
  DailyOpportunityItem,
} from '@/services/copilotDailyBriefApi';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';
import type { RotationRow, BookRow } from '../brief/QuantFlow';
import type { Tone } from '../brief/ToneBadge';
import type { Opportunity } from './opportunityMapper';
import { ideaToOpportunity } from './opportunityMapper';

// ---------------------------------------------------------------------------
// BriefData type
// ---------------------------------------------------------------------------

/** Glance row shown in the collapsed BriefModule trigger. */
export interface ModuleGlance {
  headline: string;
  score?: number;
  badge?: { label: string; tone: Tone };
}

export interface BriefData {
  /** B-U-L-F — executive summary at the top. */
  bluf: {
    glance: ModuleGlance;
    totalValue?: number;
    dayChangeAbs?: number;
    dayChangePercent?: number;
  };

  /** Macro narrative — passes the brief text down to SynthesisBriefNarrative. */
  marketPulse: {
    glance: ModuleGlance;
    macro_narrative: string;
    weekly_context: string;
    this_week_tactical: string;
  };

  /** Event radar — Phase-1 seed from ground_sentiment + key_risks. */
  eventRadar: {
    glance: ModuleGlance;
    items: EventRadarItem[];
  };

  /** Portfolio snapshot passthrough for allocation / sector / holdings panels. */
  portfolioToday: {
    glance: ModuleGlance;
    snapshot: PortfolioSnapshot | null;
  };

  /** Sector rotation vs book exposure. */
  quantFlow: {
    glance: ModuleGlance;
    rotation: RotationRow[];
    book: BookRow[];
  };

  /** Ranked trade ideas (Opportunity shape for reuse in the existing table). */
  opportunities: {
    glance: ModuleGlance;
    items: Opportunity[];
  };

  /** Key risks from the brief. */
  riskManagement: {
    glance: ModuleGlance;
    items: KeyRisk[];
  };

  /** Top 3 ranked ideas rendered as numbered action steps. */
  thePlan: {
    glance: ModuleGlance;
    actions: PlanAction[];
  };

  /** Personalized analyst note. */
  pmNote: {
    glance: ModuleGlance;
    commentary: string | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull the first sentence from a paragraph (up to 150 chars). */
function firstSentence(text: string | undefined | null): string {
  if (!text) return '';
  const dot = text.indexOf('. ');
  const raw = dot !== -1 ? text.slice(0, dot + 1) : text;
  return raw.length > 150 ? raw.slice(0, 147) + '…' : raw;
}

/**
 * Map a GroundSentimentItem classification to an EventRadarItem crowdSentiment tone.
 * The API uses 'leading' | 'lagging', which describes *type* not direction.
 * We fall back to 'neutral' for both since the classification doesn't encode bias.
 * Future enhancement: add a `bias` field on GroundSentimentItem to carry directional info.
 */
function classificationToTone(
  classification: GroundSentimentItem['classification'],
): Tone {
  // 'leading' → watch (worth monitoring); 'lagging' → neutral (confirming only)
  if (classification === 'leading') return 'watch';
  return 'neutral';
}

/** Normalize SectorCall.stance ('OW'/'MW'/'UW') → RotationRow.stance. */
function normalizeStance(stance: string): RotationRow['stance'] {
  const s = stance.toUpperCase();
  if (s === 'OW' || s === 'OVERWEIGHT') return 'overweight';
  if (s === 'UW' || s === 'UNDERWEIGHT') return 'underweight';
  return 'neutral';
}

/** Derive sector exposure BookRow[] from portfolio holdings.
 *  Uses IB AssetClass codes (STK, OPT, etc.) since the snapshot doesn't carry
 *  equity-sector labels (Polygon enrichment is a future enhancement).
 */
function holdingsToBookRows(snapshot: PortfolioSnapshot | null): BookRow[] {
  if (!snapshot || snapshot.holdings.length === 0) return [];

  const total = snapshot.totalValue || 1;
  const groups = new Map<string, number>();

  for (const h of snapshot.holdings) {
    const cls = (h.assetClass ?? '').toUpperCase();
    let label: string;
    if (cls === 'STK' || cls === 'WAR' || cls === 'EQUITIES') label = 'Equities';
    else if (cls === 'OPT' || cls === 'FOP') label = 'Options';
    else if (cls === 'FUT') label = 'Futures';
    else if (cls === 'BOND') label = 'Bonds';
    else if (cls === 'CASH' || cls === 'FOREX') label = 'Cash';
    else label = 'Other';

    groups.set(label, (groups.get(label) ?? 0) + h.marketValue);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sector, val]) => ({ sector, weightPct: (val / total) * 100 }));
}

/** Sort and re-rank trade ideas by personalized relevance when available. */
function rankIdeas(
  brief: SynthesisBrief,
  personal: PersonalizedBriefPayload | null,
): Opportunity[] {
  const mapped = brief.trade_ideas.map((idea: TradeIdea, i: number) =>
    ideaToOpportunity(idea, i, personal?.rankedTradeIdeas),
  );

  if (personal?.rankedTradeIdeas?.length) {
    const relevanceMap = new Map(
      personal.rankedTradeIdeas.map((r) => [r.ideaIndex, r.relevanceScore]),
    );
    mapped.sort((a, b) => {
      const ra = relevanceMap.get(a.rank - 1) ?? 0;
      const rb = relevanceMap.get(b.rank - 1) ?? 0;
      return rb - ra;
    });
    mapped.forEach((o, i) => { o.rank = i + 1; });
  }

  return mapped;
}

/** Build PlanAction[] from the top N ranked opportunities. */
function buildPlanActions(
  rankedOpportunities: Opportunity[],
  brief: SynthesisBrief,
  personal: PersonalizedBriefPayload | null,
  n = 3,
): PlanAction[] {
  return rankedOpportunities.slice(0, n).map((opp, i) => {
    // Find the original TradeIdea to pull entry/stop for sizing hint
    const idea = brief.trade_ideas.find((t) => t.symbol === opp.ticker);
    const rankedEntry = personal?.rankedTradeIdeas?.find(
      (r) => r.ideaIndex === opp.rank - 1,
    );

    // Sizing: derive from entry/stop if numeric, else omit
    let sizing: string | undefined;
    if (idea?.entry && idea?.stop) {
      const entry = Number(idea.entry);
      const stop = Number(idea.stop);
      if (Number.isFinite(entry) && Number.isFinite(stop) && stop > 0) {
        sizing = `Entry $${entry.toFixed(2)} / Stop $${stop.toFixed(2)}`;
      }
    }

    const rationale =
      rankedEntry?.whyForYou ??
      (opp.catalysts.length > 0 ? opp.catalysts.join('; ') : opp.thesis);

    return {
      rank: i + 1,
      action: `${opp.confidence} conviction: ${opp.ticker}`,
      rationale,
      sizing,
      symbols: [opp.ticker],
    };
  });
}

// ---------------------------------------------------------------------------
// Seed EventRadarItem[] from ground_sentiment (Phase-1 approach)
// ---------------------------------------------------------------------------

function buildEventRadarItems(
  groundSentiment: GroundSentimentItem[],
  _keyRisks: KeyRisk[], // reserved for Phase 2 — risk events
  maxItems = 5,
): EventRadarItem[] {
  // Cap to maxItems; generate a stable synthetic id from index + sector
  return groundSentiment.slice(0, maxItems).map((gs, i) => {
    const tone = classificationToTone(gs.classification);
    const id = `gs-${i}-${gs.sector ?? 'general'}`;

    return {
      id,
      // Title: sector if available, otherwise attribution source
      title: gs.sector ?? gs.attribution ?? 'Market Signal',
      // Phase 1: no real scheduling data → use a placeholder when field absent
      when: gs.attribution ? `via ${gs.attribution}` : 'This week',
      whyItMatters: gs.quote,
      // consensus: not available from GroundSentimentItem — omit
      crowdSentiment: {
        label: tone === 'watch' ? 'Leading' : 'Lagging',
        tone,
      },
      // No affected symbols from ground sentiment yet (Phase 2: enrich from sector→ETF map)
      affectedSymbols: [],
    } satisfies EventRadarItem;
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface BuildBriefModulesCtx {
  greeting: string;
}

export function buildBriefModules(
  brief: SynthesisBrief | null,
  personal: PersonalizedBriefPayload | null,
  snapshot: PortfolioSnapshot | null,
  ctx: BuildBriefModulesCtx,
): BriefData {
  const { greeting } = ctx;

  // ── BLUF ──────────────────────────────────────────────────────────────────
  const thesis = brief?.central_thesis ?? '';
  const blufHeadline = thesis
    ? `${greeting} — ${thesis}`.slice(0, 120)
    : `${greeting} — Markets open.`;

  const bluf: BriefData['bluf'] = {
    glance: {
      headline: blufHeadline,
      // Badge: derive from first sector_call bias; omit if not available
      badge: brief?.sector_calls?.length
        ? (() => {
            const ow = brief.sector_calls.find((c) => c.stance === 'OW');
            if (ow) return { label: `OW: ${ow.sector}`, tone: 'watch' as Tone };
            return undefined;
          })()
        : undefined,
    },
    totalValue: snapshot?.totalValue,
    dayChangeAbs: snapshot?.changeAbs,
    dayChangePercent: snapshot?.changePercent,
  };

  // ── MARKET PULSE ─────────────────────────────────────────────────────────
  const macroNarrative = brief?.macro_narrative ?? '';
  const marketPulseHeadline = firstSentence(macroNarrative) || 'No macro narrative available.';

  const marketPulse: BriefData['marketPulse'] = {
    glance: { headline: marketPulseHeadline },
    macro_narrative: macroNarrative,
    weekly_context: brief?.weekly_context ?? '',
    this_week_tactical: brief?.this_week_tactical ?? '',
  };

  // ── EVENT RADAR ───────────────────────────────────────────────────────────
  const groundSentiment = brief?.ground_sentiment ?? [];
  const keyRisks = brief?.key_risks ?? [];
  const radarItems = buildEventRadarItems(groundSentiment, keyRisks);
  const eventRadarHeadline =
    radarItems.length > 0
      ? `${radarItems.length} signal${radarItems.length !== 1 ? 's' : ''} on your radar`
      : 'No signals on your radar';

  const eventRadar: BriefData['eventRadar'] = {
    glance: { headline: eventRadarHeadline },
    items: radarItems,
  };

  // ── PORTFOLIO TODAY ───────────────────────────────────────────────────────
  const holdingCount = snapshot?.holdings.length ?? 0;
  const topSectorCall = brief?.sector_calls?.[0];
  const portfolioHeadline = snapshot
    ? `${holdingCount} position${holdingCount !== 1 ? 's' : ''}${topSectorCall ? ` — ${topSectorCall.sector} ${topSectorCall.stance}` : ''}`
    : 'Connect a broker to see your portfolio';

  const portfolioToday: BriefData['portfolioToday'] = {
    glance: { headline: portfolioHeadline },
    snapshot,
  };

  // ── QUANT FLOW ────────────────────────────────────────────────────────────
  const rotation: RotationRow[] = (brief?.sector_calls ?? []).map((sc) => ({
    sector: sc.sector,
    stance: normalizeStance(sc.stance),
    rationale: sc.rationale,
  }));

  const book: BookRow[] = holdingsToBookRows(snapshot);

  const topOW = rotation.find((r) => r.stance === 'overweight');
  const quantFlowHeadline = topOW
    ? `Overweight: ${topOW.sector}`
    : rotation.length > 0
      ? `${rotation.length} sector calls`
      : 'No sector rotation signals';

  const quantFlow: BriefData['quantFlow'] = {
    glance: { headline: quantFlowHeadline },
    rotation,
    book,
  };

  // ── OPPORTUNITIES ─────────────────────────────────────────────────────────
  const rankedOpportunities: Opportunity[] = brief?.trade_ideas?.length
    ? rankIdeas(brief, personal)
    : [];

  const oppCount = rankedOpportunities.length;
  const opportunitiesHeadline =
    oppCount > 0
      ? `Top ${oppCount} ranked for you`
      : 'No trade ideas available this week';

  const opportunities: BriefData['opportunities'] = {
    glance: { headline: opportunitiesHeadline },
    items: rankedOpportunities,
  };

  // ── RISK MANAGEMENT ───────────────────────────────────────────────────────
  const topRisk = keyRisks[0];
  const riskHeadline = topRisk
    ? topRisk.risk.slice(0, 80)
    : 'No key risks identified';

  // Derive badge tone from first risk's probability string
  // (high/medium-probability risks get watch; low/unknown get neutral)
  const riskBadgeTone = ((): Tone => {
    if (!topRisk?.probability) return 'neutral';
    const p = topRisk.probability.toLowerCase();
    if (p.includes('high')) return 'negative';
    if (p.includes('med')) return 'watch';
    return 'neutral';
  })();

  const riskManagement: BriefData['riskManagement'] = {
    glance: {
      headline: riskHeadline,
      badge: topRisk ? { label: topRisk.probability ?? 'Risk', tone: riskBadgeTone } : undefined,
    },
    items: keyRisks,
  };

  // ── THE PLAN ──────────────────────────────────────────────────────────────
  const planActions = brief
    ? buildPlanActions(rankedOpportunities, brief, personal, 3)
    : [];

  const thePlanHeadline =
    planActions.length > 0
      ? `Do these ${planActions.length} thing${planActions.length !== 1 ? 's' : ''}`
      : 'No high-conviction actions today';

  const thePlan: BriefData['thePlan'] = {
    glance: { headline: thePlanHeadline },
    actions: planActions,
  };

  // ── PM NOTE ───────────────────────────────────────────────────────────────
  const commentary = personal?.personalCommentary ?? null;
  const pmNoteHeadline = commentary
    ? firstSentence(commentary) || 'A note from your analyst'
    : 'A note from your analyst';

  const pmNote: BriefData['pmNote'] = {
    glance: { headline: pmNoteHeadline },
    commentary,
  };

  return {
    bluf,
    marketPulse,
    eventRadar,
    portfolioToday,
    quantFlow,
    opportunities,
    riskManagement,
    thePlan,
    pmNote,
  };
}

// ---------------------------------------------------------------------------
// Daily Brief adapter
// ---------------------------------------------------------------------------

/**
 * Adapt a daily-brief opportunity item to the TradeIdea shape ideaToOpportunity expects.
 * Conviction is capitalized in the daily API ('High'/'Medium'/'Low') but TradeIdea
 * requires lowercase — we normalise here.
 */
function dailyItemToTradeIdea(it: DailyOpportunityItem): TradeIdea {
  return {
    symbol: it.symbol,
    sector: '',
    time_horizon: 'medium',
    source: 'synthesis',
    thesis: it.thesis,
    entry: it.entry,
    stop: it.stop,
    target: it.target,
    conviction: ((it.conviction ?? 'Medium').toLowerCase()) as TradeIdea['conviction'],
    catalysts: Array.isArray(it.catalysts) ? it.catalysts : [],
  } as TradeIdea;
}

/**
 * Adapt the personalized daily-brief payload into the BriefData shape consumed
 * by the Daily PM Brief page.
 *
 * Does NOT modify buildBriefModules — this is an additive, parallel adapter.
 */
export function buildBriefModulesFromDaily(
  global: DailyGlobalBrief | null,
  personal: DailyPersonalization | null,
  snapshot: PortfolioSnapshot | null,
  ctx: BuildBriefModulesCtx,
): BriefData {
  const { greeting } = ctx;
  const m = global?.modules ?? {};

  // ── BLUF ──────────────────────────────────────────────────────────────────
  const bluf: BriefData['bluf'] = {
    glance: m.bluf?.glance ?? { headline: `${greeting} — Markets open.` },
    totalValue: snapshot?.totalValue,
    dayChangeAbs: snapshot?.changeAbs,
    dayChangePercent: snapshot?.changePercent,
  };

  // ── MARKET PULSE ─────────────────────────────────────────────────────────
  const macroNarrative = m.marketPulse?.deep?.narrative ?? '';
  const marketPulse: BriefData['marketPulse'] = {
    glance: m.marketPulse?.glance ?? { headline: firstSentence(macroNarrative) || 'Market pulse' },
    macro_narrative: macroNarrative,
    weekly_context: '',
    this_week_tactical: '',
  };

  // ── EVENT RADAR ───────────────────────────────────────────────────────────
  const radarItems = Array.isArray(m.eventRadar?.items) ? m.eventRadar!.items! : [];
  const eventRadar: BriefData['eventRadar'] = {
    glance: m.eventRadar?.glance ?? {
      headline: radarItems.length > 0
        ? `${radarItems.length} signal${radarItems.length !== 1 ? 's' : ''} on your radar`
        : 'No signals on your radar',
    },
    items: radarItems,
  };

  // ── PORTFOLIO TODAY ───────────────────────────────────────────────────────
  const holdingCount = snapshot?.holdings.length ?? 0;
  // Prefer the personalized glance (which references real tickers and P&L)
  // over the generic position-count fallback. The personalized glance is
  // supplied by the server when livePortfolio is present in the request.
  const portfolioToday: BriefData['portfolioToday'] = {
    glance: personal?.modules?.portfolioToday?.glance ?? {
      headline: snapshot
        ? `${holdingCount} position${holdingCount !== 1 ? 's' : ''}`
        : 'Connect a broker to see your portfolio',
    },
    snapshot,
  };

  // ── QUANT FLOW ────────────────────────────────────────────────────────────
  const rotation = Array.isArray(m.quantFlow?.rotation) ? m.quantFlow!.rotation! : [];
  const quantFlow: BriefData['quantFlow'] = {
    glance: m.quantFlow?.glance ?? {
      headline: rotation.length > 0 ? `${rotation.length} sector calls` : 'No sector rotation signals',
    },
    rotation,
    book: holdingsToBookRows(snapshot),
  };

  // ── OPPORTUNITIES ─────────────────────────────────────────────────────────
  const oppItems = Array.isArray(m.opportunities?.items) ? m.opportunities!.items! : [];
  const opportunities: BriefData['opportunities'] = {
    glance: m.opportunities?.glance ?? {
      headline: oppItems.length > 0 ? `Top ${oppItems.length} ranked for you` : 'No trade ideas today',
    },
    items: oppItems.map((it, i) => ideaToOpportunity(dailyItemToTradeIdea(it), i, personal?.rankedTradeIdeas)),
  };

  // ── RISK MANAGEMENT ───────────────────────────────────────────────────────
  // DailyRiskItem: { risk, severity?, time_horizon? }
  // KeyRisk:       { risk, impact?, probability? }
  // Mapping: severity → probability, time_horizon → impact
  const riskItems = Array.isArray(m.riskManagement?.items) ? m.riskManagement!.items! : [];
  const riskManagement: BriefData['riskManagement'] = {
    glance: m.riskManagement?.glance ?? {
      headline: riskItems.length > 0 ? riskItems[0].risk.slice(0, 80) : 'No key risks identified',
    },
    items: riskItems.map((r): KeyRisk => ({ risk: r.risk, probability: r.severity, impact: r.time_horizon })),
  };

  // ── THE PLAN ──────────────────────────────────────────────────────────────
  const planActions = personal?.modules?.thePlan?.actions ?? [];
  const thePlan: BriefData['thePlan'] = {
    glance: personal?.modules?.thePlan?.glance ?? {
      headline: planActions.length > 0
        ? `Do these ${planActions.length} thing${planActions.length !== 1 ? 's' : ''}`
        : 'No high-conviction actions today',
    },
    actions: planActions,
  };

  // ── PM NOTE ───────────────────────────────────────────────────────────────
  // personalCommentary is now enriched with live ticker/P&L references when
  // livePortfolio was sent to the server — prefer it over the generic narrative.
  const commentary = personal?.personalCommentary ?? m.pmNote?.deep?.narrative ?? null;
  const pmNote: BriefData['pmNote'] = {
    glance: m.pmNote?.glance ?? {
      headline: commentary
        ? firstSentence(commentary) || 'A note from your analyst'
        : 'A note from your analyst',
    },
    commentary,
  };

  return { bluf, marketPulse, eventRadar, portfolioToday, quantFlow, opportunities, riskManagement, thePlan, pmNote };
}
