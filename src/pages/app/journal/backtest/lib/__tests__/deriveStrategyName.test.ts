// src/pages/app/journal/backtest/lib/__tests__/deriveStrategyName.test.ts

import { describe, it, expect } from 'vitest';
import { deriveStrategyName } from '../deriveStrategyName';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';

describe('deriveStrategyName', () => {
  it('builds "SYMBOL TF · phase summary" from the definition content', () => {
    const def = makeDefaultStrategyV2('MNQ', '5m');
    expect(deriveStrategyName(def)).toBe('MNQ 5m · 1. WHEN close crosses above EMA(20)');
  });

  it('reflects a completely different strategy after phases are replaced (the reported bug)', () => {
    const def = makeDefaultStrategyV2('MNQ', '5m');
    def.phases = [
      {
        id: 'p1',
        when: {
          kind: 'levelInteraction',
          level: { type: 'prevDayHigh' },
          interaction: 'reject',
        },
      },
    ];

    // Must NOT be the stale default's "EMA cross" description.
    expect(deriveStrategyName(def)).not.toContain('EMA cross');
    expect(deriveStrategyName(def)).toContain('MNQ 5m');
    expect(deriveStrategyName(def)).toContain('Previous Day High');
  });

  it('truncates a long phase summary to 40 chars with an ellipsis', () => {
    const def = makeDefaultStrategyV2('MNQ', '5m');
    def.phases = [
      {
        id: 'p1',
        when: {
          op: 'and',
          children: [
            {
              kind: 'compare',
              left: { src: 'price', field: 'close' },
              cmp: 'gt',
              right: { src: 'indicator', ref: { type: 'ema', length: 20 } },
            },
            {
              kind: 'compare',
              left: { src: 'price', field: 'close' },
              cmp: 'lt',
              right: { src: 'indicator', ref: { type: 'ema', length: 50 } },
            },
          ],
        },
      },
    ] as StrategyDefinitionV2['phases'];

    const name = deriveStrategyName(def);
    // "MNQ 5m · " prefix + a summary capped at 40 chars (with an ellipsis).
    const summary = name.split(' · ')[1];
    expect(summary.length).toBeLessThanOrEqual(40);
    expect(summary.endsWith('…')).toBe(true);
  });

  it('falls back to "SYMBOL TF" when there are no phases', () => {
    const def = makeDefaultStrategyV2('MNQ', '5m');
    def.phases = [];
    expect(deriveStrategyName(def)).toBe('MNQ 5m');
  });
});
