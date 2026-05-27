// utils/opportunityMapper.ts
// Maps TradeIdea (from synthesis brief) → Opportunity (table row shape).

import type { TradeIdea, RankedTradeIdea } from '@/services/copilotSynthesisBriefApi';
import type { PatternType } from '@/lib/patterns/types';
import { toPatternType } from '@/lib/patterns/types';

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
  };
}
