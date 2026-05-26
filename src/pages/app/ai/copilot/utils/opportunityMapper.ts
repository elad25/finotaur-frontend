// utils/opportunityMapper.ts
// Maps TradeIdea (from synthesis brief) → Opportunity (table row shape).

import type { TradeIdea, RankedTradeIdea } from '@/services/copilotSynthesisBriefApi';

// ---------------------------------------------------------------------------
// Opportunity type
// ---------------------------------------------------------------------------

export interface Opportunity {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  score: number;
  thesis: string;
  timeframe: string;
  catalysts: string[];
  // Live-data extensions (undefined on fallback rows)
  source?: TradeIdea['source'];
  timeHorizon?: TradeIdea['time_horizon'];
  whyForYou?: string;
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

export const HORIZON_TO_TIMEFRAME: Record<string, string> = {
  short: '1-5 Days',
  medium: '1-4 Weeks',
  long: '1-3 Months',
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
  // Deterministic scoring (no conviction, no pricing)
  const base = 75;
  const sourceBonus =
    idea.source === 'ism'      ? 10 :
    idea.source === 'weekly'   ?  8 :
    idea.source === 'war_zone' ?  6 :
    idea.source === 'synthesis'?  3 : 0;
  const catalystBonus =
    (idea.catalysts?.length ?? 0) === 3 ? 5 :
    (idea.catalysts?.length ?? 0) === 2 ? 3 : 0;
  const thesisBonus =
    idea.thesis.length >= 200 ? 5 :
    idea.thesis.length >= 120 ? 3 : 0;
  const ranked_ = ranked?.find(r => r.ideaIndex === idx);
  const personalBoost = ranked_ ? Math.round(ranked_.relevanceScore / 20) : 0; // up to +5
  const score = Math.min(99, base + sourceBonus + catalystBonus + thesisBonus + personalBoost);

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
    score,
    thesis: idea.thesis,
    timeframe: HORIZON_TO_TIMEFRAME[idea.time_horizon] ?? '1-4 Weeks',
    catalysts,
    source: idea.source,
    timeHorizon: idea.time_horizon,
    whyForYou: ranked_?.whyForYou,
  };
}
