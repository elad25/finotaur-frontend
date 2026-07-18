// src/pages/app/journal/backtest/lib/mergeStrategyV2.ts
// ============================================================================
// Deep-merge a partial StrategyDefinitionV2 (as returned by the
// parse-strategy-v2 / patch-strategy AI endpoints) onto a full base
// definition. Mirrors the field-merge discipline of the v1 store's
// `applyAISetup`: scalars replace when present, nested objects merge
// field-by-field so any key the AI omitted keeps the base's value, and
// `phases` REPLACES wholesale rather than merging element-wise — a v2 phase
// array is always a coherent, ordered whole from the AI, so partial
// element-by-element merges would be meaningless (phase[i] in the partial
// has no guaranteed correspondence to phase[i] in the base). Pure — no
// store/React import, safe to unit-test in isolation.
// ============================================================================

import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';

export function mergeStrategyV2(
  base: StrategyDefinitionV2,
  partial: Partial<StrategyDefinitionV2>,
): StrategyDefinitionV2 {
  const merged: StrategyDefinitionV2 = structuredClone(base);

  // Scalar fields — replace only when the AI provided them.
  if (partial.name !== undefined) merged.name = partial.name;
  if (partial.description !== undefined) merged.description = partial.description;
  if (partial.direction !== undefined) merged.direction = partial.direction;

  // Nested objects — field-level merge so unset AI keys keep base values.
  if (partial.instrument !== undefined) {
    merged.instrument = { ...merged.instrument, ...partial.instrument };
  }
  if (partial.timeframes !== undefined) {
    merged.timeframes = { ...merged.timeframes, ...partial.timeframes };
  }

  // Arrays replace wholesale — never concatenated/index-merged.
  if (partial.phases !== undefined && partial.phases.length > 0) {
    merged.phases = structuredClone(partial.phases);
  }

  if (partial.entry !== undefined) {
    merged.entry = { ...merged.entry, ...partial.entry };
  }
  if (partial.stop !== undefined) {
    merged.stop = { ...merged.stop, ...partial.stop };
  }
  if (partial.exits !== undefined) {
    merged.exits = {
      ...merged.exits,
      ...partial.exits,
      // `target` is itself a nested object — merge field-by-field too,
      // otherwise a partial `{ target: { value: 2 } }` would drop `basis`.
      target:
        partial.exits.target !== undefined
          ? { ...merged.exits.target, ...partial.exits.target }
          : merged.exits.target,
    };
  }
  if (partial.filters !== undefined) {
    merged.filters = { ...merged.filters, ...partial.filters };
  }
  if (partial.risk !== undefined) {
    merged.risk = { ...merged.risk, ...partial.risk };
  }

  // id / schemaVersion are identity fields — never overwritten from partial.
  return merged;
}
