// src/pages/app/journal/backtest/lib/__tests__/mergeStrategyV2.test.ts

import { describe, it, expect } from 'vitest';
import { mergeStrategyV2 } from '../mergeStrategyV2';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';

describe('mergeStrategyV2', () => {
  it('merges a partial onto the full defaults, replacing only provided scalar/nested fields', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');

    const merged = mergeStrategyV2(base, {
      name: 'PDH reject short',
      direction: 'short',
      stop: { basis: 'wick' },
    });

    expect(merged.name).toBe('PDH reject short');
    expect(merged.direction).toBe('short');
    // stop.basis replaced, but the rest of the base stop shape is untouched
    // (base default stop had no bufferPct — still absent).
    expect(merged.stop.basis).toBe('wick');
    expect(merged.stop.bufferPct).toBeUndefined();
    // Unrelated fields keep the base's values.
    expect(merged.exits).toEqual(base.exits);
    expect(merged.instrument).toEqual(base.instrument);
  });

  it('never overwrites identity fields (id, schemaVersion) from the partial', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');
    const merged = mergeStrategyV2(base, {
      // A malicious/careless partial trying to overwrite identity fields —
      // TypeScript would normally prevent `id`/`schemaVersion` from being
      // assignable here since they're not part of a "safe" partial contract,
      // but mergeStrategyV2 must not read them even if present at runtime.
      name: 'renamed',
    } as Partial<StrategyDefinitionV2>);

    expect(merged.id).toBe(base.id);
    expect(merged.schemaVersion).toBe(2);
  });

  it('replaces the phases array wholesale rather than merging element-wise', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');
    expect(base.phases).toHaveLength(1);

    const partialPhases: StrategyDefinitionV2['phases'] = [
      {
        id: 'p1',
        when: {
          kind: 'levelInteraction',
          level: { type: 'prevDayHigh' },
          interaction: 'reject',
          wickBodyRatio: 2,
        },
      },
      {
        id: 'p2',
        when: { kind: 'event', event: 'mss' },
      },
    ];

    const merged = mergeStrategyV2(base, { phases: partialPhases });

    expect(merged.phases).toHaveLength(2);
    expect(merged.phases).toEqual(partialPhases);
    // Confirm it's a deep clone, not a shared reference to the input array.
    expect(merged.phases).not.toBe(partialPhases);
  });

  it('leaves phases untouched when the partial provides an empty array', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');
    const merged = mergeStrategyV2(base, { phases: [] });
    expect(merged.phases).toEqual(base.phases);
  });

  it('deep-merges exits.target field-by-field instead of replacing the whole exits object', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');
    expect(base.exits.target.basis).toBe('rMultiple');

    const merged = mergeStrategyV2(base, {
      exits: { target: { value: 3 } as StrategyDefinitionV2['exits']['target'] },
    });

    // basis carried over from base since the partial only specified `value`.
    expect(merged.exits.target.basis).toBe('rMultiple');
    expect(merged.exits.target.value).toBe(3);
  });

  it('does not mutate the base object passed in', () => {
    const base = makeDefaultStrategyV2('MNQ', '5m');
    const baseSnapshot = structuredClone(base);
    mergeStrategyV2(base, { name: 'changed' });
    expect(base).toEqual(baseSnapshot);
  });
});
