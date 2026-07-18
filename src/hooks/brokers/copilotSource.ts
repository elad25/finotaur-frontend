// src/hooks/brokers/copilotSource.ts
// Shared "which broker row powers COPILOT" preference logic.
//
// COPILOT (dashboard, holdings, risk, verdicts, drawers) accepts EITHER a
// live Interactive Brokers connection OR a user-maintained Manual Portfolio
// as its data source. Both are rows on `broker_connections` (broker =
// 'interactive_brokers' | 'manual'), and both write the SAME
// `connection_data.last_positions` / `last_account_summary` shape, so every
// downstream consumer (usePortfolioData, verdict engine, etc.) works
// identically regardless of which one is active.
//
// Preference when both exist (deterministic, documented here so every
// COPILOT surface derives the same "current source" without re-implementing
// the tie-break): Interactive Brokers wins over Manual — a live broker feed
// is more trustworthy than a hand-maintained portfolio. At most one row per
// broker exists per user (unique index on user_id+broker), so this is a
// simple lookup, not a sort.

export const COPILOT_SOURCE_BROKERS = ['interactive_brokers', 'manual'] as const;
export type CopilotSourceBroker = (typeof COPILOT_SOURCE_BROKERS)[number];

interface SourceCandidate {
  broker: string;
  is_active?: boolean | null;
  status?: string | null;
}

/**
 * Pick the broker_connections row that should drive COPILOT out of the rows
 * returned for a user (query should already be scoped to
 * `broker IN COPILOT_SOURCE_BROKERS`). Returns null when neither source is
 * active + connected.
 */
export function pickCopilotSource<T extends SourceCandidate>(rows: T[]): T | null {
  const byBroker = new Map(rows.map((r) => [r.broker, r]));

  const ib = byBroker.get('interactive_brokers');
  if (ib && ib.is_active === true && ib.status === 'connected') return ib;

  const manual = byBroker.get('manual');
  if (manual && manual.is_active === true && manual.status === 'connected') return manual;

  return null;
}
