// src/pages/app/journal/backtest/lib/__tests__/diffStrategyV2.test.ts

import { describe, it, expect } from 'vitest';
import { diffStrategyV2Fields } from '../diffStrategyV2';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';

describe('diffStrategyV2Fields', () => {
  it('returns an empty list for two identical definitions', () => {
    const a = makeDefaultStrategyV2('MNQ', '5m');
    const b = structuredClone(a);
    expect(diffStrategyV2Fields(a, b)).toEqual([]);
  });

  it('reports only the top-level fields that actually changed', () => {
    const a = makeDefaultStrategyV2('MNQ', '5m');
    const b = structuredClone(a);
    b.exits = { target: { basis: 'rMultiple', value: 3 } };
    b.filters = { maxTradesPerDay: 2 };

    const changed = diffStrategyV2Fields(a, b);
    expect(changed).toEqual(['exits', 'filters']);
  });

  it('detects a phases array change even when length is identical', () => {
    const a = makeDefaultStrategyV2('MNQ', '5m');
    const b = structuredClone(a);
    b.phases = [{ ...b.phases[0], id: 'renamed-phase' }];

    expect(diffStrategyV2Fields(a, b)).toEqual(['phases']);
  });

  it('ignores id/schemaVersion since they are not in the comparable field set', () => {
    const a = makeDefaultStrategyV2('MNQ', '5m');
    const b = structuredClone(a);
    b.id = 'a-totally-different-id';
    expect(diffStrategyV2Fields(a, b)).toEqual([]);
  });
});
