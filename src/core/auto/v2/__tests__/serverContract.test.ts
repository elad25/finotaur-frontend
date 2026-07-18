// ============================================================================
// SERVER CONTRACT TEST — locks the server parse-pipeline's output shape to
// the FE v2 engine's schema (Increment 4a — MTF + SMT realignment)
// ============================================================================
//
// Copied from finotaur-server src/ai/pipelines/backtest-parse-v2.js
// EXEMPLARS.mtfSmtFlagship — if this test breaks, the FE/server contract
// drifted; fix the SERVER (FE types are the source of truth).
//
// This test does NOT re-implement server logic. It proves that whatever the
// server's flagship exemplar emits (embedded verbatim below) is:
//   1. structurally typeable as Partial<StrategyDefinitionV2>,
//   2. mergeable onto a full default via mergeStrategyV2 into a
//      STRUCTURALLY VALID StrategyDefinitionV2 (validateStrategyStructure
//      returns zero errors),
//   3. renderable by the review-panel formatters without throwing,
//   4. correctly detected by the engine's TF/indicator/smt scanning helpers,
// and that a plausible OLD (pre-realignment) server shape — missing
// `compareSymbols` or an incoherent divergence/reference pairing — is
// REJECTED by validateStrategyStructure, proving this test would have
// caught the exact drift class the 2026-07 realignment fixed.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Condition, StrategyDefinitionV2 } from '../types';
import { makeDefaultStrategyV2, validateStrategyStructure } from '../types';
import { strategyNeedsIndicators, smtTfsUsed } from '../ConditionCompiler';
import { DEFAULT_PATTERN_PARAMS } from '../../types';
import { mergeStrategyV2 } from '@/pages/app/journal/backtest/lib/mergeStrategyV2';
import { describePhase } from '@/pages/app/journal/backtest/lib/describeCondition';

// ----------------------------------------------------------------------------
// The server's flagship exemplar, embedded VERBATIM (see header comment).
// `pattern` uses `DEFAULT_PATTERN_PARAMS.FVG` directly rather than a
// hand-retyped copy — it IS "the FE default FVG PatternParams" the server
// mirrors (`src/core/auto/types.ts`), so pulling it live can never drift
// from the source of truth the way a hand-copied literal could.
// ----------------------------------------------------------------------------
const SERVER_FIXTURE: Partial<StrategyDefinitionV2> = {
  direction: 'short',
  instrument: { symbol: 'MNQ', source: 'databento' },
  timeframes: { execution: '5m', context: ['4h'] },
  entry: {
    orderType: 'limit',
    priceAnchor: { phaseId: 'retest-choch', anchor: 'triggerPrice' },
    validForBars: 10,
  },
  stop: {
    basis: 'phaseAnchor',
    phaseRef: { phaseId: 'choch-smt', anchor: 'counterSwing' },
  },
  exits: { target: { basis: 'rMultiple', value: 2 } },
  compareSymbols: ['MES'],
  phases: [
    {
      id: 'htf-poi',
      timeframe: '4h',
      when: {
        kind: 'patternActive',
        pattern: DEFAULT_PATTERN_PARAMS.FVG,
        interaction: 'priceInZone',
      },
    },
    {
      id: 'choch-smt',
      when: {
        op: 'and',
        children: [
          { kind: 'event', event: 'choch' },
          {
            kind: 'smt',
            compareSymbol: 'MES',
            reference: { type: 'swingHigh' },
            divergence: 'bearish',
          },
        ],
      },
      within: { bars: 30 },
      capture: [{ anchor: 'triggerPrice' }, { anchor: 'counterSwing' }],
    },
    {
      id: 'retest-choch',
      when: {
        kind: 'levelInteraction',
        level: { type: 'phaseAnchor', phaseId: 'choch-smt', anchor: 'triggerPrice' },
        interaction: 'retest',
      },
      within: { bars: 15 },
      capture: [{ anchor: 'triggerPrice' }],
    },
  ],
};

// ----------------------------------------------------------------------------
// 1. Compile-time contract: the const declaration above IS the proof (it
// would fail `tsc` if the server's shape no longer matched
// StrategyDefinitionV2's Condition/Phase/LevelRef/AnchorRef unions). This
// test just exercises a couple of fields so it isn't a bare type-only file.
// ----------------------------------------------------------------------------
describe('server contract — Partial<StrategyDefinitionV2> shape', () => {
  it('type-checks and round-trips the basic scalar/array fields', () => {
    expect(SERVER_FIXTURE.direction).toBe('short');
    expect(SERVER_FIXTURE.compareSymbols).toEqual(['MES']);
    expect(SERVER_FIXTURE.phases).toHaveLength(3);
    // JSON-safe (no functions/classes/Date) — same round-trip contract every
    // other StrategyDefinitionV2 payload in this codebase relies on.
    expect(() => JSON.parse(JSON.stringify(SERVER_FIXTURE))).not.toThrow();
  });
});

// ----------------------------------------------------------------------------
// 2. mergeStrategyV2 onto a full default -> structurally valid.
// ----------------------------------------------------------------------------
describe('server contract — merges onto a full default cleanly', () => {
  it('validateStrategyStructure reports ZERO errors on the merged definition', () => {
    const merged = mergeStrategyV2(makeDefaultStrategyV2('MNQ', '5m'), SERVER_FIXTURE);
    const errors = validateStrategyStructure(merged);
    expect(errors).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// 3. describePhase renders every phase without throwing (smoke test for the
// review-panel formatters).
// ----------------------------------------------------------------------------
describe('server contract — review-panel formatters', () => {
  it('describePhase renders all 3 phases without throwing, each a non-empty string', () => {
    const merged = mergeStrategyV2(makeDefaultStrategyV2('MNQ', '5m'), SERVER_FIXTURE);
    expect(merged.phases).toHaveLength(3);
    merged.phases.forEach((phase, idx) => {
      let rendered = '';
      expect(() => {
        rendered = describePhase(phase, idx);
      }).not.toThrow();
      expect(rendered.length).toBeGreaterThan(0);
    });
  });
});

// ----------------------------------------------------------------------------
// 4. Engine detection helpers — lightweight alternative to a full compile
// fixture (per task guidance: "choose the strongest assertion that stays
// under ~40 lines of setup").
// ----------------------------------------------------------------------------
describe('server contract — engine TF/indicator/smt detection', () => {
  it('detects the 4h context timeframe, the execution-TF smt condition, and no indicator usage', () => {
    const merged = mergeStrategyV2(makeDefaultStrategyV2('MNQ', '5m'), SERVER_FIXTURE);

    // '4h' context timeframe correctly threaded through the merge.
    expect(merged.timeframes.context).toEqual(['4h']);

    // The `smt` leaf lives in phase 'choch-smt', which declares no
    // `.timeframe` override -> its EFFECTIVE timeframe is `execution` (5m),
    // NOT the '4h' context timeframe the sibling `htf-poi` phase uses.
    expect(smtTfsUsed(merged)).toEqual(['5m']);

    // No `Operand{src:'indicator'}` leaf anywhere in this fixture (event /
    // patternActive / levelInteraction / smt only) -> IndicatorBank is never
    // built for this strategy.
    expect(strategyNeedsIndicators(merged)).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// 5. Negative control — a plausible OLD (pre-realignment) server shape is
// REJECTED by validateStrategyStructure, proving this test would have
// caught the drift the 2026-07 FE/server realignment fixed.
// ----------------------------------------------------------------------------
describe('server contract — negative control (pre-realignment server shapes must fail validation)', () => {
  it('rejects the fixture when compareSymbols is dropped (old server shape: smt leaf, no compareSymbols)', () => {
    const { compareSymbols: _drop, ...brokenFixture } = SERVER_FIXTURE;
    const merged = mergeStrategyV2(makeDefaultStrategyV2('MNQ', '5m'), brokenFixture);
    const errors = validateStrategyStructure(merged);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('requires a non-empty compareSymbols'))).toBe(true);
  });

  it('rejects the fixture when divergence/reference are incoherent (old server shape: no coherence check)', () => {
    const brokenFixture: Partial<StrategyDefinitionV2> = structuredClone(SERVER_FIXTURE);
    // Flip divergence to 'bullish' while reference.type stays 'swingHigh' —
    // an incoherent pairing the OLD server shape never validated against.
    const chochSmtPhase = brokenFixture.phases!.find((p) => p.id === 'choch-smt')!;
    const whenNode = chochSmtPhase.when;
    if (!('op' in whenNode) || whenNode.op === 'not') {
      throw new Error('test fixture assumption broken: choch-smt phase.when must be an and/or node');
    }
    const smtLeaf = whenNode.children.find(
      (c): c is Extract<Condition, { kind: 'smt' }> => 'kind' in c && c.kind === 'smt',
    )!;
    smtLeaf.divergence = 'bullish';

    const merged = mergeStrategyV2(makeDefaultStrategyV2('MNQ', '5m'), brokenFixture);
    const errors = validateStrategyStructure(merged);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("divergence 'bullish' requires reference.type"))).toBe(true);
  });
});
