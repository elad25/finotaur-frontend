// src/lib/shadow/scenarioEngine.test.ts
// Vitest fixture suite for the Shadow scenario engine.
// All expected values are hand-computed from the engine rules defined in the spec.

import { describe, it, expect } from 'vitest';
import { runScenarios, extractModificationMarkers } from './scenarioEngine';
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

// ---------------------------------------------------------------------------
// Fixture 12: no_stop_moves — (a) absent without real stop modifications
// ---------------------------------------------------------------------------

describe('Fixture 12 — no_stop_moves absent when no stop modifications exist', () => {
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
    // no `modifications` field at all
  };

  const { scenarios } = runScenarios(input);

  it('no_stop_moves is NOT in the scenarios array', () => {
    expect(scenarios.find((s) => s.key === 'no_stop_moves')).toBeUndefined();
  });

  it('no_target_moves is NOT in the scenarios array', () => {
    expect(scenarios.find((s) => s.key === 'no_target_moves')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Fixture 13: no_stop_moves — (b) BE move saved the trader; counterfactual
// shows the loss that would have happened had the stop never moved.
// ---------------------------------------------------------------------------
// entry=100, LONG, qty=1, mult=1
// trade.stop_price (input.originalStop) = 98 — the CURRENT (post-move) stop.
// One real stop modification: moved from 90 -> 98 at t=500 (fromPrice: 90).
// derivedOriginalStop = 90 (the true original, from the mod's fromPrice).
// actualExits: exited at 98 (their moved BE-ish stop) — small loss of -2.
// pricePath continues past the actual exit and later tags the TRUE original
// stop at 90 -> no_stop_moves shows a bigger loss (-10), proving the BE move
// saved the trader $8.
// ---------------------------------------------------------------------------

describe('Fixture 13 — no_stop_moves shows the counterfactual loss the BE move avoided', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 98, qty: 1, time: 600 }],
    originalStop: 98, // current (post-move) stop on the trade record
    originalTarget: null,
    modifications: [{ kind: 'stop', price: 98, time: 500, fromPrice: 90 }],
    pricePath: [
      { t: 100, o: 100, h: 101, l: 99, c: 100 },
      { t: 600, o: 100, h: 100, l: 97, c: 98 },
      { t: 900, o: 98, h: 99, l: 89, c: 90 }, // l=89 <= 90 -> true original stop tagged here
    ],
    granularity: '1m',
  };

  const { scenarios } = runScenarios(input);

  it('actual: small loss of -2 (exited at the moved BE stop)', () => {
    const s = scenarios.find((sc) => sc.key === 'actual')!;
    expect(s.pnlUsd).toBeCloseTo(-2);
  });

  it('no_stop_moves: available, walks to the TRUE original stop (90) at t=900, pnl=-10', () => {
    const s = scenarios.find((sc) => sc.key === 'no_stop_moves')!;
    expect(s).toBeDefined();
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(90);
    expect(s.exitTime).toBe(900);
    expect(s.pnlUsd).toBeCloseTo(-10);
    expect(s.confidence).toBe('high');
    expect(s.simulated).toBe(true);
  });

  it('no_stop_moves loss is worse than actual — the BE move saved the trader money', () => {
    const actual = scenarios.find((sc) => sc.key === 'actual')!;
    const noStopMoves = scenarios.find((sc) => sc.key === 'no_stop_moves')!;
    expect(noStopMoves.pnlUsd!).toBeLessThan(actual.pnlUsd!);
  });

  it('no_stop_moves note references the true original stop price (90), not the current stop (98)', () => {
    const s = scenarios.find((sc) => sc.key === 'no_stop_moves')!;
    expect(s.note).toContain('90');
  });
});

// ---------------------------------------------------------------------------
// Fixture 14: no_stop_moves — (c) same-bar stop+target collision -> stop-first,
// confidence 'ambiguous'. Also covers (d): derivedOriginalStop comes from the
// first modification's fromPrice (95), NOT from originalStop/trade.stop_price
// (99), which differs.
// ---------------------------------------------------------------------------

describe('Fixture 14 — no_stop_moves in-bar collision + originalStop derived from fromPrice', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 103, qty: 1, time: 1 }],
    originalStop: 99, // current (post-move) stop — deliberately DIFFERS from the true original (95)
    originalTarget: 105,
    modifications: [{ kind: 'stop', price: 99, time: 10, fromPrice: 95 }],
    pricePath: [
      { t: 1, o: 100, h: 107, l: 93, c: 100 }, // both true-original-stop (95) and target (105) touched
    ],
    granularity: '1m',
  };

  const { scenarios } = runScenarios(input);
  const s = scenarios.find((sc) => sc.key === 'no_stop_moves')!;

  it('collided same-bar -> conservative stop-first, confidence ambiguous', () => {
    expect(s).toBeDefined();
    expect(s.available).toBe(true);
    expect(s.confidence).toBe('ambiguous');
  });

  it('exits at the DERIVED true original stop (95), not the current stop (99)', () => {
    expect(s.exitPrice).toBeCloseTo(95);
    expect(s.pnlUsd).toBeCloseTo(-5); // (95-100)*1*1
  });
});

// ---------------------------------------------------------------------------
// Fixture 15: no_target_moves — smoke test (produced only with target mods)
// ---------------------------------------------------------------------------

describe('Fixture 15 — no_target_moves gated on real target modifications', () => {
  it('absent when no target modifications exist', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [{ price: 102, qty: 1, time: 1 }],
      originalStop: 95,
      originalTarget: 110,
      pricePath: [{ t: 1, o: 100, h: 103, l: 99, c: 102 }],
      granularity: '1m',
    };
    const { scenarios } = runScenarios(input);
    expect(scenarios.find((s) => s.key === 'no_target_moves')).toBeUndefined();
  });

  it('present and walks with the derived original target when a target modification exists', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [{ price: 103, qty: 1, time: 1 }],
      originalStop: 95,
      originalTarget: 115, // current (moved) target — differs from the true original (110)
      modifications: [{ kind: 'target', price: 115, time: 10, fromPrice: 110 }],
      pricePath: [
        { t: 1, o: 100, h: 112, l: 99, c: 108 }, // h=112 touches derived original target 110, not stop
      ],
      granularity: '1m',
    };
    const { scenarios } = runScenarios(input);
    const s = scenarios.find((sc) => sc.key === 'no_target_moves')!;
    expect(s).toBeDefined();
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(110);
    expect(s.pnlUsd).toBeCloseTo(10); // (110-100)*1*1
  });
});

// ---------------------------------------------------------------------------
// Fixture 16: extractModificationMarkers — sorting + fromPrice resolution
// ---------------------------------------------------------------------------

describe('Fixture 16 — extractModificationMarkers', () => {
  it('returns [] when there are no modifications', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      pricePath: [],
      granularity: '1m',
    };
    expect(extractModificationMarkers(input)).toEqual([]);
  });

  it('sorts out-of-order modifications ascending by time', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      originalStop: 90,
      originalTarget: 110,
      modifications: [
        { kind: 'stop', price: 95, time: 500 },
        { kind: 'stop', price: 92, time: 100 },
      ],
      pricePath: [],
      granularity: '1m',
    };
    const markers = extractModificationMarkers(input);
    expect(markers.map((m) => m.at)).toEqual([100, 500]);
  });

  it('first modification of a kind: fromPrice falls back to the input original seed when not explicitly captured', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      originalStop: 90,
      modifications: [{ kind: 'stop', price: 95, time: 100 }],
      pricePath: [],
      granularity: '1m',
    };
    const markers = extractModificationMarkers(input);
    expect(markers).toEqual([{ kind: 'stop', at: 100, fromPrice: 90, toPrice: 95 }]);
  });

  it('subsequent modification of the same kind: fromPrice chains from the previous toPrice', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      originalStop: 90,
      modifications: [
        { kind: 'stop', price: 95, time: 100 },
        { kind: 'stop', price: 99, time: 200 },
      ],
      pricePath: [],
      granularity: '1m',
    };
    const markers = extractModificationMarkers(input);
    expect(markers).toEqual([
      { kind: 'stop', at: 100, fromPrice: 90, toPrice: 95 },
      { kind: 'stop', at: 200, fromPrice: 95, toPrice: 99 },
    ]);
  });

  it('an explicitly-captured fromPrice on the row is preferred over the chain-derived value', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      originalStop: 90,
      modifications: [{ kind: 'stop', price: 95, time: 100, fromPrice: 80 }],
      pricePath: [],
      granularity: '1m',
    };
    const markers = extractModificationMarkers(input);
    expect(markers[0].fromPrice).toBe(80);
  });

  it('stop and target chains are independent of each other', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [],
      originalStop: 90,
      originalTarget: 110,
      modifications: [
        { kind: 'target', price: 115, time: 50 },
        { kind: 'stop', price: 95, time: 100 },
      ],
      pricePath: [],
      granularity: '1m',
    };
    const markers = extractModificationMarkers(input);
    expect(markers).toEqual([
      { kind: 'target', at: 50, fromPrice: 110, toPrice: 115 },
      { kind: 'stop', at: 100, fromPrice: 90, toPrice: 95 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Fixture 17: fee normalization — hypothetical USD = gross - fee; actual
// uses net; no_trade stays 0.
// ---------------------------------------------------------------------------
// entry=100, LONG, qty=1, mult=1, actual exit=110 (gross=10), netPnlUsd=8
// (fee=2, within the $50/contract clamp).
// originalStop=95, originalTarget=105. Single bar touches the target (105)
// before the stop (95 never touched) -> original_target_hit / held_original_stop
// both resolve to exit=105, gross=5, net-of-fee=3.
// ---------------------------------------------------------------------------

describe('Fixture 17 — fee normalization across scenarios', () => {
  const input: ShadowTradeInput = {
    side: 'LONG',
    entryPrice: 100,
    entryTime: 0,
    qty: 1,
    multiplier: 1,
    actualExits: [{ price: 110, qty: 1, time: 1000 }],
    originalStop: 95,
    originalTarget: 105,
    pricePath: [{ t: 1000, o: 101, h: 112, l: 101, c: 110 }],
    granularity: '1m',
    netPnlUsd: 8,
  };

  const { scenarios, actualPnlUsd } = runScenarios(input);

  it('actual scenario uses the real net P&L (8), not the gross (10)', () => {
    const s = scenarios.find((sc) => sc.key === 'actual')!;
    expect(s.pnlUsd).toBeCloseTo(8);
    expect(actualPnlUsd).toBeCloseTo(8);
  });

  it('original_target_hit: gross(5) - fee(2) = 3', () => {
    const s = scenarios.find((sc) => sc.key === 'original_target_hit')!;
    expect(s.available).toBe(true);
    expect(s.exitPrice).toBeCloseTo(105);
    expect(s.pnlUsd).toBeCloseTo(3);
  });

  it('held_original_stop: gross(5) - fee(2) = 3 (same walk resolves to target here)', () => {
    const s = scenarios.find((sc) => sc.key === 'held_original_stop')!;
    expect(s.pnlUsd).toBeCloseTo(3);
  });

  it('no_trade stays 0 regardless of fees', () => {
    const s = scenarios.find((sc) => sc.key === 'no_trade')!;
    expect(s.pnlUsd).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture 18: fee normalization — no netPnlUsd supplied => feeUsd is 0,
// scenarios behave exactly as before fee-normalization existed.
// ---------------------------------------------------------------------------

describe('Fixture 18 — no netPnlUsd => zero fee, unchanged behavior', () => {
  it('held_original_stop equals the pure gross computation', () => {
    const input: ShadowTradeInput = {
      side: 'LONG',
      entryPrice: 100,
      entryTime: 0,
      qty: 1,
      multiplier: 1,
      actualExits: [{ price: 103, qty: 1, time: 1 }],
      originalStop: 95,
      originalTarget: null,
      pricePath: [{ t: 1, o: 100, h: 104, l: 99, c: 103 }],
      granularity: '1m',
      // netPnlUsd intentionally omitted
    };
    const { scenarios } = runScenarios(input);
    const s = scenarios.find((sc) => sc.key === 'held_original_stop')!;
    // Neither stop nor target touched -> exit at lastClose=103, gross=(103-100)*1*1=3
    expect(s.pnlUsd).toBeCloseTo(3);
  });
});
