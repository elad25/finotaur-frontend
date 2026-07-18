// src/pages/app/journal/backtest/lib/diffStrategyV2.ts
// ============================================================================
// Compact "what changed" summary for the refine/patch flow: compares two
// StrategyDefinitionV2 objects field-by-field at the TOP LEVEL only (a
// field-path list, not a deep diff) and returns the list of field names that
// differ. Pure — every field on StrategyDefinitionV2 is plain
// JSON-serializable data per the schema's own contract (see v2/types.ts),
// so JSON.stringify equality is a safe/cheap deep-equal here.
// ============================================================================

import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';

const COMPARABLE_FIELDS: Array<keyof StrategyDefinitionV2> = [
  'name',
  'description',
  'direction',
  'instrument',
  'timeframes',
  'phases',
  'entry',
  'stop',
  'exits',
  'filters',
  'risk',
];

/** Returns the list of top-level field names that differ between two v2 strategy definitions. */
export function diffStrategyV2Fields(
  prev: StrategyDefinitionV2,
  next: StrategyDefinitionV2,
): string[] {
  const changed: string[] = [];
  for (const field of COMPARABLE_FIELDS) {
    if (JSON.stringify(prev[field]) !== JSON.stringify(next[field])) {
      changed.push(field);
    }
  }
  return changed;
}
