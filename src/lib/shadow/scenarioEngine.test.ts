// src/lib/shadow/scenarioEngine.test.ts
// Vitest fixture suite for the Shadow scenario engine.
// All expected values are hand-computed from the engine rules defined in the spec.

import { describe, it, expect } from 'vitest';
import { runScenarios } from './scenarioEngine';
import type { ShadowTradeInput, ScenarioResult, ScenarioKey } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScenario(
  results: ScenarioResult[],
  key: ScenarioKey,
): ScenarioResult {
  const s = results.find((r) => r.key === key);
  if (!s) throw new Error(`Scenario '${key}' not found in results`);
  return s;
}

// ---------------------------------------------------------------------------
// Fixture 1: LONG winner — trader exited early; price later ran to target
// ---------------------------------------------------------------------------
// entry=100, side=LONG, qty=2, mult=50, stop=95, target=110
// actual exit: 104 (early exit before target)
// pricePath:
//   bar1 {t:1000, h:106, l:101, c:104} — neither stop nor target touched
//   bar2 {t:2000, h:112, l:103, c:108} — target 110 touched (h=112>=110)
// lastClose = 108
//
// Hand-computed expectations:
//   riskUsd = |100-95| * 2 * 50 = 500
//   actual pnlUsd    = (104-100)*2*50 = 400      rM = 400/500 = 0.8
//   held_original_stop: bar2 hitTarget  → exit=110, pnl=(110-100)*2*50=1000, rM=2.0
//   original_target_hit: same walk      → exit=110, pnl=1000, rM=2.0
//   held_loser_past_stop: exit=lastClose=108, pnl=(108-100)*2*50=800, rM=1.6
// ---------------------------------------------------------------------------

describe('Fixture 1 — LONG winner, exited early', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 900,
    qty: 2,
    multiplier: 50,
    actualExits: [{ price: 104, qty: 2, time: 1000 }],
    originalStop: 95,
    originalTarget: 110,
    pricePath: [
      { t: 1000, o: 101, h: 106, l: 101, c: 104 },
      { t: 2000, o: 104, h: 112, l: 103, c: 108 },
    ],
    granularity: '1m',
  };

  const { scenarios, riskUsd, actualPnlUsd } = runScenarios(input);

  it('riskUsd is 500', () => {
    expect(riskUsd).toBeCloseTo(500);
  });

  it('actualPnlUsd is 400', () => {
    expect(actualPnlUsd).toBeCloseTo(400);
  });

  it('actual scenario: pnlUsd=400, rMultiple=0.8, available=true', () => {
    const s = getScenario(scenarios, 'actual');
    expect(s.available).toBe(true);
    expect(s.pnlUsd).toBeCloseTo(400);
    expect(s.rMultiple).toBeCloseTo(0.8);
    expect(s.confidence).toBe('high');
  });

  it('original_target_hit: pnlUsd > actual pnlUsd (1000 > 400)', () => {
    const s = getScenario(scenarios, 'original_target_hit');
    expect(s.available).toBe(true);
    expect(s.pnlUsd).toBeCloseTo(1000);
    expect(s.pnlUsd!).toBeGreaterThan(actualPnlUsd);
    expect(s.exitPrice).toBeCloseTo(110);
    expect(s.rMultiple).toBeCloseTo(2.0);
  });

  it('held_original_stop: target hit at bar2, pnlUsd=1000, confidence=high', () => {
    const s = getScenario(scenarios, 'held_original_stop');
    expect(s.available).toBe(true);
    expect(s.pnlUsd).toBeCloseTo(1000);
    expect(s.exitPrice).toBeCloseTo(110);
    expect(s.exitTime).toBe(2000);
    expect(s.confidence).toBe('high');
  });

  it('held_loser_past_stop: uses lastClose=108, pnlUsd=800', () => {
    const s = getScenario(scenarios, 'held_loser_past_stop');
    expect(s.available).toBe(true);
    expect(s.pnlUsd).toBeCloseTo(800);
    expect(s.exitPrice).toBeCloseTo(108);
    expect(s.rMultiple).toBeCloseTo(1.6);
  });

  it('no_trade: pnlUsd=0, rMultiple=0', () => {
    const s = getScenario(scenarios, 'no_trade');
    expect(s.pnlUsd).toBe(0);
    expect(s.rMultiple).toBe(0);
    expect(s.available).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: SHORT trade — verify direction math
// ---------------------------------------------------------------------------
// entry=200, side=SHORT, qty=1, mult=100, stop=205, target=190
// actual exit: 192
// pricePath:
//   bar1 {t:100, h:203, l:195, c:196} — SHORT: stop if h>=205 → 203<205 NO; target if l<=190 → 195>190 NO
//   bar2 {t:200, h:198, l:188, c:192} — stop if h>=205 → 198<205 NO; target if l<=190 → 188<=190 YES → hitTarget
//
// Hand-computed:
//   riskUsd = |200-205| * 1 * 100 = 500
//   actual pnlUsd = -1*(192-200)*1*100 = 800      rM = 800/500 = 1.6
//   held_original_stop: bar2 target hit → exit=190, pnl=-1*(190-200)*1*100=1000, rM=2.0
// ---------------------------------------------------------------------------

describe('Fixture 2 — SHORT trade direction math', () => {
  const input: ShadowTradeInput = {
    side: 'SHORT',
    entryPrice: 200,
    entryTime: 50,
    qty: 1,
    multiplier: 100,
    actualExits: [{ price: 192, qty: 1, time: 100 }],
    originalStop: 205,
    originalTarget: 190,
    pricePath: [
      { t: 100, o: 198, h: 203, l: 195, c: 196 },
      { t: 200, o: 196, h: 198, l: 188, c: 192 },
    ],
    granularity: '1m',
  };

  const { scenarios, riskUsd, actualPnlUsd } = runScenarios(input);

  it('riskUsd=500, actualPnlUsd=800', () => {
    expect(riskUsd).toBeCloseTo(500);
    expect(actualPnlUsd).toBeCloseTo(800);
  });

  it('actual: rMultiple=1.6', () => {
    const s = getScenario(scenarios, 'actual');
    expect(s.rMultiple).toBeCloseTo(1.6);
  });

  it('held_original_stop: target reached (bar2 l<=190), exit=190, pnl=1000, rM=2.0', () => {
    const s = getScenario(scenarios, 'held_original_stop');
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(190);
    expect(s.pnlUsd).toBeCloseTo(1000);
    expect(s.rMultiple).toBeCloseTo(2.0);
    expect(s.confidence).toBe('high');
  });

  it('held_loser_past_stop: exits at lastClose (bar2.c=192)', () => {
    const s = getScenario(scenarios, 'held_loser_past_stop');
    // SHORT pnl at 192: -1*(192-200)*1*100 = 800 (same as actual, price unchanged)
    expect(s.exitPrice).toBeCloseTo(192);
    expect(s.pnlUsd).toBeCloseTo(800);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: In-bar collision — stop AND target touched in the same bar
// ---------------------------------------------------------------------------
// entry=100, side=LONG, qty=1, mult=1, stop=95, target=105
// single bar: {h:107, l:93} — LONG: stop if l<=95 → 93<=95 YES; target if h>=105 → 107>=105 YES
// Conservative rule: stop printed first.
//
// Hand-computed:
//   riskUsd = |100-95|*1*1 = 5
//   held_original_stop: collided=true, exitPrice=stop=95, pnl=-5, confidence='ambiguous', rM=-1.0
// ---------------------------------------------------------------------------

describe('Fixture 3 — in-bar collision (conservative stop-first)', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 103, qty: 1, time: 1 }],
    originalStop: 95,
    originalTarget: 105,
    pricePath: [
      { t: 1, o: 100, h: 107, l: 93, c: 100 },
    ],
    granularity: '1m',
  };

  const { scenarios, riskUsd } = runScenarios(input);

  it('riskUsd=5', () => {
    expect(riskUsd).toBeCloseTo(5);
  });

  it('held_original_stop: confidence=ambiguous, exit at stop=95, pnl=-5, rM=-1.0', () => {
    const s = getScenario(scenarios, 'held_original_stop');
    expect(s.available).toBe(true);
    expect(s.confidence).toBe('ambiguous');
    expect(s.exitPrice).toBeCloseTo(95);
    expect(s.pnlUsd).toBeCloseTo(-5);
    expect(s.rMultiple).toBeCloseTo(-1.0);
  });

  it('original_target_hit: also collided (same bar) → confidence=ambiguous, exit at stop=95', () => {
    // Walk for original_target_hit also passes stop, so collision also fires.
    const s = getScenario(scenarios, 'original_target_hit');
    expect(s.available).toBe(true);
    expect(s.confidence).toBe('ambiguous');
    // Conservative: stop wins, so exit at stop=95 (note says "Stopped out before the target")
    expect(s.exitPrice).toBeCloseTo(95);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: moved_stop_to_breakeven — price reaches +1R then pulls back to entry
// ---------------------------------------------------------------------------
// entry=100, side=LONG, qty=1, mult=1, stop=95, target=110, breakevenTriggerR=1
// triggerPrice = 100 + 1*5 = 105
//
// pricePath:
//   bar1 {t:1, h:106, l:99, c:105}: Phase1 — stop(l=99>95 NO), trigger(h=106>=105 YES) → BE armed, move to phase2
//   bar2 {t:2, h:103, l:98, c:101}: Phase2 (stop=entryPrice=100, target=110)
//     LONG stopTouched if l<=100 → 98<=100 YES; targetTouched if h>=110 → 103<110 NO → exit at BE=100
//
// Hand-computed:
//   riskUsd = 5
//   pnlUsd = (100-100)*1*1 = 0   (choked at BE)
//   note = "Choked at breakeven — price ran without you."
// ---------------------------------------------------------------------------

describe('Fixture 4 — moved_stop_to_breakeven (choke at entry)', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 107, qty: 1, time: 1 }],
    originalStop: 95,
    originalTarget: 110,
    pricePath: [
      { t: 1, o: 100, h: 106, l: 99, c: 105 },  // Phase1: trigger reached (h=106>=105)
      { t: 2, o: 105, h: 103, l: 98, c: 101 },   // Phase2: BE stop hit (l=98<=100)
    ],
    granularity: '1m',
    config: { breakevenTriggerR: 1 },
  };

  const { scenarios, riskUsd } = runScenarios(input);

  it('riskUsd=5', () => {
    expect(riskUsd).toBeCloseTo(5);
  });

  it('moved_stop_to_breakeven: exit at entryPrice=100, pnl≈0, note "Choked at breakeven"', () => {
    const s = getScenario(scenarios, 'moved_stop_to_breakeven');
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(100);
    expect(s.pnlUsd).toBeCloseTo(0);
    expect(s.note).toMatch(/choked at breakeven/i);
    expect(s.confidence).toBe('high');
  });

  it('rMultiple for BE choke: 0/5 = 0', () => {
    const s = getScenario(scenarios, 'moved_stop_to_breakeven');
    // rOf(0) = 0 / 5 = 0
    expect(s.rMultiple).toBeCloseTo(0);
  });

  it('moved_stop_to_breakeven: simulated=true', () => {
    expect(getScenario(scenarios, 'moved_stop_to_breakeven').simulated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: No target — original_target_hit and scale_out_half are unavailable
// ---------------------------------------------------------------------------

describe('Fixture 5 — no target defined', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 50,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 53, qty: 1, time: 1 }],
    originalStop: 47,
    originalTarget: null,
    pricePath: [
      { t: 1, o: 51, h: 55, l: 50, c: 53 },
    ],
    granularity: '1m',
  };

  const { scenarios } = runScenarios(input);

  it('original_target_hit.available === false', () => {
    const s = getScenario(scenarios, 'original_target_hit');
    expect(s.available).toBe(false);
    expect(s.pnlUsd).toBeNull();
    expect(s.rMultiple).toBeNull();
  });

  it('held_original_stop is still available (stop exists)', () => {
    const s = getScenario(scenarios, 'held_original_stop');
    expect(s.available).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fixture 6: No stop, no strategy → riskUsd=null, all rMultiple=null (no_trade=0)
// ---------------------------------------------------------------------------

describe('Fixture 6 — no stop and no strategy rules', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 200,
    entryTime: 0,
    qty: 3,
    multiplier: 10,
    actualExits: [{ price: 210, qty: 3, time: 1 }],
    originalStop: null,
    originalTarget: null,
    pricePath: [
      { t: 1, o: 200, h: 215, l: 198, c: 210 },
    ],
    granularity: '1m',
    strategyRules: null,
  };

  const { scenarios, riskUsd } = runScenarios(input);

  it('riskUsd is null', () => {
    expect(riskUsd).toBeNull();
  });

  it('actual.rMultiple is null', () => {
    expect(getScenario(scenarios, 'actual').rMultiple).toBeNull();
  });

  it('held_loser_past_stop.rMultiple is null', () => {
    expect(getScenario(scenarios, 'held_loser_past_stop').rMultiple).toBeNull();
  });

  it('held_original_stop is unavailable (no stop)', () => {
    const s = getScenario(scenarios, 'held_original_stop');
    expect(s.available).toBe(false);
    expect(s.rMultiple).toBeNull();
  });

  it('no_trade.rMultiple === 0 (special case)', () => {
    // no_trade always returns 0, not null
    expect(getScenario(scenarios, 'no_trade').rMultiple).toBe(0);
  });

  it('moved_stop_to_breakeven is unavailable (no stop)', () => {
    const s = getScenario(scenarios, 'moved_stop_to_breakeven');
    expect(s.available).toBe(false);
    expect(s.rMultiple).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fixture 7: R math — assert rMultiple equals hand-computed pnl/riskUsd
// ---------------------------------------------------------------------------
// entry=100, side=LONG, qty=2, mult=50, stop=98, actualExit=103
// riskUsd = |100-98|*2*50 = 200
// pnlUsd  = (103-100)*2*50 = 300
// rMultiple = 300/200 = 1.5
// ---------------------------------------------------------------------------

describe('Fixture 7 — R multiple math', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 2,
    multiplier: 50,
    actualExits: [{ price: 103, qty: 2, time: 1 }],
    originalStop: 98,
    originalTarget: null,
    pricePath: [
      { t: 1, o: 100, h: 104, l: 99, c: 103 },
    ],
    granularity: '1m',
  };

  const { riskUsd, actualPnlUsd, scenarios } = runScenarios(input);

  it('riskUsd = 200', () => {
    expect(riskUsd).toBeCloseTo(200);
  });

  it('actual pnlUsd = 300', () => {
    expect(actualPnlUsd).toBeCloseTo(300);
  });

  it('actual rMultiple = 1.5 (300 / 200)', () => {
    const s = getScenario(scenarios, 'actual');
    expect(s.rMultiple).toBeCloseTo(1.5);
  });

  it('held_loser_past_stop: exit at lastClose=103, same pnl=300, rM=1.5', () => {
    // Price closed at 103 (same as actual exit), so pnl is the same.
    const s = getScenario(scenarios, 'held_loser_past_stop');
    expect(s.pnlUsd).toBeCloseTo(300);
    expect(s.rMultiple).toBeCloseTo(1.5);
  });
});

// ---------------------------------------------------------------------------
// Fixture 8: strategyRules overrides stop for risk sizing
// ---------------------------------------------------------------------------
// entry=100, originalStop=90 (wide), but strategyRules.stopPrice=98 (tighter)
// riskUsd should use strategyRules.stopPrice: |100-98|*1*1 = 2
// ---------------------------------------------------------------------------

describe('Fixture 8 — strategyRules.stopPrice overrides originalStop for riskUsd', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 104, qty: 1, time: 1 }],
    originalStop: 90,
    originalTarget: null,
    pricePath: [
      { t: 1, o: 100, h: 105, l: 99, c: 104 },
    ],
    granularity: '1m',
    strategyRules: { stopPrice: 98 },
  };

  const { riskUsd, scenarios } = runScenarios(input);

  it('riskUsd = 2 (from strategyRules.stopPrice=98, not originalStop=90)', () => {
    expect(riskUsd).toBeCloseTo(2);
  });

  it('actual rMultiple = (104-100)*1*1 / 2 = 2.0', () => {
    const s = getScenario(scenarios, 'actual');
    expect(s.rMultiple).toBeCloseTo(2.0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 9: moved_stop_to_breakeven — BE trigger never reached
// ---------------------------------------------------------------------------
// entry=100, side=LONG, qty=1, mult=1, stop=95, target=110, triggerR=1 → triggerPrice=105
// pricePath: only bars that never reach 105 (max h=103)
// Expected: stop never hit either, exit at lastClose, note "BE trigger never reached."
// ---------------------------------------------------------------------------

describe('Fixture 9 — BE trigger never reached', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 101, qty: 1, time: 2 }],
    originalStop: 95,
    originalTarget: 110,
    pricePath: [
      { t: 1, o: 100, h: 103, l: 98, c: 101 },
      { t: 2, o: 101, h: 102, l: 99, c: 101 },
    ],
    granularity: '1m',
    config: { breakevenTriggerR: 1 },
  };

  const { scenarios } = runScenarios(input);

  it('moved_stop_to_breakeven: exits at lastClose (101), note "BE trigger never reached"', () => {
    const s = getScenario(scenarios, 'moved_stop_to_breakeven');
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(101);
    expect(s.pnlUsd).toBeCloseTo(1); // (101-100)*1*1
    expect(s.note).toMatch(/BE trigger never reached/i);
    expect(s.confidence).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// Fixture 10: Empty actualExits — actual pnlUsd = 0, exitPrice = entryPrice
// ---------------------------------------------------------------------------

describe('Fixture 10 — empty actualExits', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [],
    originalStop: null,
    originalTarget: null,
    pricePath: [
      { t: 1, o: 100, h: 102, l: 99, c: 101 },
    ],
    granularity: '1m',
  };

  const { scenarios, actualPnlUsd } = runScenarios(input);

  it('actualPnlUsd = 0 when no exits', () => {
    expect(actualPnlUsd).toBeCloseTo(0);
  });

  it('actual.exitPrice = entryPrice (fallback)', () => {
    const s = getScenario(scenarios, 'actual');
    expect(s.exitPrice).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
// Fixture 11: All 6 scenarios always present in the output
// ---------------------------------------------------------------------------

describe('Fixture 11 — all 6 scenarios always present', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 102, qty: 1, time: 1 }],
    originalStop: 97,
    originalTarget: 106,
    pricePath: [{ t: 1, o: 100, h: 103, l: 99, c: 102 }],
    granularity: '1m',
  };

  const { scenarios } = runScenarios(input);

  it('output contains exactly 6 scenarios', () => {
    expect(scenarios).toHaveLength(6);
  });

  const expectedKeys: string[] = [
    'actual',
    'held_original_stop',
    'original_target_hit',
    'held_loser_past_stop',
    'moved_stop_to_breakeven',
    'no_trade',
  ];

  it('all expected keys are present', () => {
    const keys = scenarios.map((s) => s.key);
    for (const k of expectedKeys) {
      expect(keys).toContain(k);
    }
  });
});
