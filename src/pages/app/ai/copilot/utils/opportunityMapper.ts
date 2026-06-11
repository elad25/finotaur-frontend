// utils/opportunityMapper.ts
// Maps TradeIdea (from synthesis brief) → Opportunity (showcase card shape).

import type { TradeIdea, RankedTradeIdea } from '@/services/copilotSynthesisBriefApi';
import type { PatternType } from '@/lib/patterns/types';
import { toPatternType } from '@/lib/patterns/types';

// ---------------------------------------------------------------------------
// BullPoint / BearPoint — argument rows shown in the Why-Up / Why-Down cards.
// ---------------------------------------------------------------------------

export interface ArgPoint {
  title: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// CatalystDetailed — catalyst with optional impact badge.
// ---------------------------------------------------------------------------

export interface CatalystDetailed {
  text: string;
  impact?: 'High' | 'Medium' | 'Low';
}

// ---------------------------------------------------------------------------
// Outlook distribution — donut segments in the AI Outlook card.
// ---------------------------------------------------------------------------

export interface OutlookData {
  bullish: number;
  neutral: number;
  bearish: number;
  summary: string;
}

// ---------------------------------------------------------------------------
// Opportunity type — superset of the old hardcoded array shape.
// ---------------------------------------------------------------------------

export interface Opportunity {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  score: number;
  thesis: string;
  upside: string;
  price: string;
  current: string;
  confidence: 'High' | 'Medium-High' | 'Medium' | 'Low';
  bars: number;
  timeframe: string;
  catalysts: string[];
  // Live-data extensions (undefined on fallback rows)
  source?: TradeIdea['source'];
  timeHorizon?: TradeIdea['time_horizon'];
  whyForYou?: string;
  /** Pattern classification (Phase 0 — Foundation, ADL-039). Always present after mapping; defaults to 'other' if upstream omits. */
  patternType?: PatternType;
  /** ONE sentence quoting source data justifying patternType. */
  patternEvidence?: string;
  /** ONE sentence stating what would break the thesis. */
  invalidation?: string;
  // ---------------------------------------------------------------------------
  // Showcase extensions — derived from new TradeIdea fields or fallback logic.
  // ---------------------------------------------------------------------------
  /** Risk level. undefined → UI shows '—'. */
  riskLevel?: 'Low' | 'Medium' | 'High';
  /** Why-Up argument rows. Always at least one (Core Thesis fallback). */
  bullPoints: ArgPoint[];
  /** Why-Down argument rows. Empty if no downside scenario is published. */
  bearPoints: ArgPoint[];
  /** Outlook distribution + summary sentence. */
  outlook: OutlookData;
  /** Catalysts with optional impact classification. */
  catalystsDetailed: CatalystDetailed[];
  /** Related themes for theme chips. Empty → section hidden. */
  themes: string[];
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

export const HORIZON_TO_TIMEFRAME: Record<string, string> = {
  short: '1-5 Days',
  medium: '1-4 Weeks',
  long: '1-3 Months',
};

type ConvictionKey = 'high' | 'medium' | 'low';

const CONVICTION_META: Record<ConvictionKey, { score: number; bars: number; confidence: Opportunity['confidence'] }> = {
  high:   { score: 90, bars: 5, confidence: 'High' },
  medium: { score: 80, bars: 4, confidence: 'Medium' },
  low:    { score: 70, bars: 3, confidence: 'Low' },
};

export const TICKER_TO_NAME: Record<string, string> = {
  SPY:  'SPDR S&P 500 ETF',
  QQQ:  'Invesco QQQ Trust',
  IWM:  'iShares Russell 2000 ETF',
  XLE:  'Energy Select Sector SPDR',
  XLF:  'Financial Select Sector SPDR',
  XLI:  'Industrial Select Sector SPDR',
  XLK:  'Technology Select Sector SPDR',
  XLV:  'Health Care Select Sector SPDR',
  XLY:  'Consumer Discretionary SPDR',
  XLP:  'Consumer Staples Select Sector SPDR',
  XLU:  'Utilities Select Sector SPDR',
  XLB:  'Materials Select Sector SPDR',
  XLRE: 'Real Estate Select Sector SPDR',
  XLC:  'Communication Services Select Sector SPDR',
  NVDA: 'NVIDIA Corporation',
  MSFT: 'Microsoft Corporation',
  AAPL: 'Apple Inc.',
  AMZN: 'Amazon.com, Inc.',
  GOOGL: 'Alphabet Inc.',
  META: 'Meta Platforms Inc.',
  TSLA: 'Tesla, Inc.',
  AVGO: 'Broadcom Inc.',
  AMD:  'Advanced Micro Devices',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveCatalystsFromThesis(thesis: string): string[] {
  // Pull first 2-3 title-case noun phrases from the thesis as fallback
  const matches = thesis.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

export function ideaToOpportunity(
  idea: TradeIdea,
  idx: number,
  ranked?: RankedTradeIdea[],
): Opportunity {
  const convictionKey = (idea.conviction?.toLowerCase() ?? 'medium') as ConvictionKey;
  const conv = CONVICTION_META[convictionKey] ?? CONVICTION_META.medium;

  // Score computation
  const sourceBonus = idea.source === 'ism' ? 5 : idea.source === 'war_zone' ? 3 : 0;
  const rank = ranked?.find(r => r.ideaIndex === idx);
  const personalizedBoost = rank ? Math.round(rank.relevanceScore / 20) : 0; // up to +5
  const finalScore = Math.min(99, conv.score + sourceBonus + personalizedBoost);

  // Price strings
  const entryNum = typeof idea.entry === 'number'
    ? idea.entry
    : Number.parseFloat(String(idea.entry ?? ''));
  const targetNum = typeof idea.target === 'number'
    ? idea.target
    : Number.parseFloat(String(idea.target ?? ''));

  let upside = '—';
  const priceStr  = Number.isFinite(targetNum) ? `$${targetNum.toFixed(2)}` : '—';
  const currentStr = Number.isFinite(entryNum)  ? `$${entryNum.toFixed(2)}`  : '—';

  if (Number.isFinite(entryNum) && Number.isFinite(targetNum) && entryNum > 0) {
    const pct = ((targetNum - entryNum) / entryNum) * 100;
    upside = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  // Catalysts — use model-supplied array (capped at 3) or derive from thesis
  const catalysts =
    Array.isArray(idea.catalysts) && idea.catalysts.length > 0
      ? idea.catalysts.slice(0, 3)
      : deriveCatalystsFromThesis(idea.thesis);

  // ---------------------------------------------------------------------------
  // Showcase fields — use server-authored values when available; fall back to
  // derived values from the existing TradeIdea fields. Never invent numbers.
  // ---------------------------------------------------------------------------

  // Bull points: server array → fallback chain from existing fields
  let bullPoints: ArgPoint[];
  if (idea.bull_points && idea.bull_points.length > 0) {
    bullPoints = idea.bull_points;
  } else {
    bullPoints = [{ title: 'Core Thesis', detail: idea.thesis }];
    if (idea.pattern_evidence) {
      bullPoints.push({ title: 'Pattern Evidence', detail: idea.pattern_evidence });
    }
    for (const c of catalysts) {
      bullPoints.push({ title: 'Catalyst', detail: c });
    }
  }

  // Bear points: server array → fallback to invalidation string
  let bearPoints: ArgPoint[];
  if (idea.bear_points && idea.bear_points.length > 0) {
    bearPoints = idea.bear_points;
  } else if (idea.invalidation) {
    bearPoints = [{ title: 'Invalidation', detail: idea.invalidation }];
  } else {
    bearPoints = [];
  }

  // Outlook: server object → derive from conviction (until real outlook arrives)
  let outlook: OutlookData;
  if (idea.outlook) {
    outlook = idea.outlook;
  } else {
    const ck = convictionKey as ConvictionKey;
    const derived = ck === 'high'
      ? { bullish: 70, neutral: 20, bearish: 10 }
      : ck === 'low'
      ? { bullish: 40, neutral: 35, bearish: 25 }
      : { bullish: 55, neutral: 30, bearish: 15 }; // medium
    outlook = {
      ...derived,
      summary: `AI conviction is ${idea.conviction} for ${idea.symbol} over the ${HORIZON_TO_TIMEFRAME[idea.time_horizon] ?? '1-4 Weeks'} timeframe.`,
    };
  }

  // Catalysts detailed: server array → map from plain catalysts with impact undefined
  let catalystsDetailed: CatalystDetailed[];
  if (idea.catalysts_detailed && idea.catalysts_detailed.length > 0) {
    catalystsDetailed = idea.catalysts_detailed;
  } else {
    catalystsDetailed = catalysts.map((text) => ({ text }));
  }

  return {
    rank: idx + 1,
    ticker: idea.symbol,
    name: TICKER_TO_NAME[idea.symbol] ?? idea.symbol,
    sector: idea.sector ?? '',
    score: finalScore,
    thesis: idea.thesis,
    upside,
    price: priceStr,
    current: currentStr,
    confidence: conv.confidence,
    bars: conv.bars,
    timeframe: HORIZON_TO_TIMEFRAME[idea.time_horizon] ?? '1-4 Weeks',
    catalysts,
    source: idea.source,
    timeHorizon: idea.time_horizon,
    whyForYou: rank?.whyForYou,
    patternType: toPatternType(idea.pattern_type),
    patternEvidence: idea.pattern_evidence ?? undefined,
    invalidation: idea.invalidation ?? undefined,
    riskLevel: idea.risk_level ?? undefined,
    bullPoints,
    bearPoints,
    outlook,
    catalystsDetailed,
    themes: idea.themes ?? [],
  };
}
