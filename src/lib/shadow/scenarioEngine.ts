// src/lib/shadow/scenarioEngine.ts
// Pure, deterministic, side-effect-free counterfactual scenario engine.
// No React, no network, no Supabase.

import type {
  ShadowTradeInput,
  ShadowEngineResult,
  ScenarioResult,
  ScenarioKey,
  Confidence,
  PriceBar,
  EngineConfig,
  ModificationMarker,
} from './types';
import { estimateFeeUsd } from '@/lib/journal/fees';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface WalkOptions {
  stop: number | null;
  target: number | null;
}

interface WalkResult {
  exitPrice: number;
  exitTime: number;
  hitStop: boolean;
  hitTarget: boolean;
  /** Both stop and target touched in the same bar. Conservative: exit at stop. */
  collided: boolean;
}

function makeUnavailable(
  key: ScenarioKey,
  label: string,
  note: string,
): ScenarioResult {
  return {
    key,
    label,
    pnlUsd: null,
    rMultiple: null,
    exitPrice: null,
    exitTime: null,
    confidence: 'high',
    note,
    available: false,
  };
}

// ---------------------------------------------------------------------------
// Order-modification helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the raw, forward-only OrderModification[] into UI-facing markers
 * with fromPrice/toPrice, sorted ascending by time.
 *
 * fromPrice resolution per modification: prefer an explicitly-captured
 * `fromPrice` on the modification row; otherwise derive it from the chain —
 * the previous modification of the same kind's `toPrice`, or (for the first
 * modification of that kind) the trade's originalStop/originalTarget seed.
 */
export function extractModificationMarkers(input: ShadowTradeInput): ModificationMarker[] {
  const mods = [...(input.modifications ?? [])].sort((a, b) => a.time - b.time);
  const markers: ModificationMarker[] = [];

  let lastStopPrice: number | null = input.originalStop ?? null;
  let lastTargetPrice: number | null = input.originalTarget ?? null;

  for (const mod of mods) {
    if (mod.kind === 'stop') {
      const fromPrice = mod.fromPrice ?? lastStopPrice;
      markers.push({ kind: 'stop', at: mod.time, fromPrice, toPrice: mod.price });
      lastStopPrice = mod.price;
    } else {
      const fromPrice = mod.fromPrice ?? lastTargetPrice;
      markers.push({ kind: 'target', at: mod.time, fromPrice, toPrice: mod.price });
      lastTargetPrice = mod.price;
    }
  }

  return markers;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all Shadow counterfactual scenarios for a single trade.
 * Pure function — no side effects, no I/O.
 */
export function runScenarios(input: ShadowTradeInput): ShadowEngineResult {
  const {
    side,
    entryPrice,
    qty,
    multiplier,
    actualExits,
    originalStop,
    originalTarget,
    pricePath,
    granularity,
    strategyRules,
    config,
  } = input;

  const cfg: Required<EngineConfig> = {
    breakevenTriggerR: config?.breakevenTriggerR ?? 1.0,
  };

  const dir = side === 'LONG' ? 1 : -1;

  // ── Real stop/target modification history ──────────────────────────────────
  const allMods = input.modifications ?? [];
  const stopMods = allMods.filter((m) => m.kind === 'stop').sort((a, b) => a.time - b.time);
  const targetMods = allMods.filter((m) => m.kind === 'target').sort((a, b) => a.time - b.time);

  // The TRUE original stop/target (the level active before any recorded
  // move), derived from the first modification's fromPrice when a real
  // modification exists — falling back to the input-supplied
  // originalStop/originalTarget otherwise (which, for historical trades with
  // no captured modifications, is the only value we have).
  const derivedOriginalStop: number | null =
    stopMods.length > 0 ? (stopMods[0].fromPrice ?? originalStop ?? null) : (originalStop ?? null);
  const derivedOriginalTarget: number | null =
    targetMods.length > 0 ? (targetMods[0].fromPrice ?? originalTarget ?? null) : (originalTarget ?? null);

  /** P&L for any hypothetical fill at `price` for `q` contracts. */
  function pnlAt(price: number, q: number): number {
    return dir * (price - entryPrice) * q * multiplier;
  }

  /** Last bar close (fallback entryPrice when pricePath is empty). */
  const lastBar: PriceBar | undefined = pricePath[pricePath.length - 1];
  const lastClose = lastBar?.c ?? entryPrice;
  const lastTime = lastBar?.t ?? input.entryTime;

  // ── Risk sizing ────────────────────────────────────────────────────────────
  //
  // Prefer strategyRules.stopPrice, then originalStop for the price distance.
  // If strategyRules.rMultiple is set we derive riskUsd from the stop distance
  // (not from the rMultiple field itself — that field is the PLANNED R for the
  // strategy, not the per-trade dollar risk). We use it as a signal that a
  // strategy-level stop applies.
  const stopForRisk: number | null =
    strategyRules?.stopPrice != null && strategyRules.stopPrice > 0
      ? strategyRules.stopPrice
      : (originalStop != null && originalStop > 0 ? originalStop : null);

  const riskUsd: number | null =
    stopForRisk != null
      ? Math.abs(entryPrice - stopForRisk) * qty * multiplier
      : null;

  function rOf(pnlUsd: number | null): number | null {
    if (pnlUsd == null) return null;
    if (riskUsd == null || riskUsd <= 0) return null;
    return pnlUsd / riskUsd;
  }

  // ── Bar-touch helpers (side-aware) ─────────────────────────────────────────

  function stopTouched(bar: PriceBar, stop: number): boolean {
    return side === 'LONG' ? bar.l <= stop : bar.h >= stop;
  }

  function targetTouched(bar: PriceBar, target: number): boolean {
    return side === 'LONG' ? bar.h >= target : bar.l <= target;
  }

  // ── Walk function ──────────────────────────────────────────────────────────
  //
  // CONSERVATIVE IN-BAR COLLISION RULE: when both stop and target are touched
  // in the same 1m bar, assume the stop printed first (worst case for trader).
  // For granularity='tick', v1 treats same as 1m but forces confidence 'high'
  // (documented limitation: with tick data the order would be knowable, but
  // we still only have bar data in v1 — this simplification is intentional).
  //
  function walkToExit({ stop, target }: WalkOptions): WalkResult {
    for (const bar of pricePath) {
      const sHit = stop != null && stopTouched(bar, stop);
      const tHit = target != null && targetTouched(bar, target);

      if (sHit && tHit) {
        // Both touched in same bar — conservative: stop first.
        return {
          exitPrice: stop!,
          exitTime: bar.t,
          hitStop: true,
          hitTarget: false,
          collided: true,
        };
      }
      if (sHit) {
        return {
          exitPrice: stop!,
          exitTime: bar.t,
          hitStop: true,
          hitTarget: false,
          collided: false,
        };
      }
      if (tHit) {
        return {
          exitPrice: target!,
          exitTime: bar.t,
          hitStop: false,
          hitTarget: true,
          collided: false,
        };
      }
    }
    // Neither stop nor target reached — exit at last close.
    return {
      exitPrice: lastClose,
      exitTime: lastTime,
      hitStop: false,
      hitTarget: false,
      collided: false,
    };
  }

  function confidenceFor(collided: boolean): Confidence {
    if (collided) return 'ambiguous';
    // v1: tick granularity still uses bar data — treat as high confidence
    // per the documented simplification.
    return 'high';
  }

  // ── Scenario builders ──────────────────────────────────────────────────────

  const scenarios: ScenarioResult[] = [];

  // 1. actual ─────────────────────────────────────────────────────────────────
  //
  // grossActualPnlUsd is price-only (entry/exit/qty/multiplier, no fees) —
  // it is ALSO the fee-estimation baseline (see estimateFeeUsd) used to
  // normalize every hypothetical scenario below onto the same net-of-fees
  // basis as the real trade. The displayed 'actual' pnlUsd prefers the real
  // net P&L (input.netPnlUsd, e.g. trade.pnl) when supplied.
  const grossActualPnlUsd = actualExits.reduce(
    (sum, e) => sum + dir * (e.price - entryPrice) * e.qty * multiplier,
    0,
  );
  const feeUsd = estimateFeeUsd(grossActualPnlUsd, input.netPnlUsd, qty);
  {
    const pnlUsd = input.netPnlUsd ?? grossActualPnlUsd;

    let exitPrice = entryPrice;
    let exitTime = input.entryTime;
    if (actualExits.length > 0) {
      const totalQty = actualExits.reduce((s, e) => s + e.qty, 0);
      exitPrice =
        totalQty > 0
          ? actualExits.reduce((s, e) => s + e.price * e.qty, 0) / totalQty
          : entryPrice;
      exitTime = Math.max(...actualExits.map((e) => e.time));
    }

    scenarios.push({
      key: 'actual',
      label: 'Your actual',
      pnlUsd,
      rMultiple: rOf(pnlUsd),
      exitPrice,
      exitTime,
      confidence: 'high',
      note: 'What you actually did.',
      available: true,
      simulated: false,
    });
  }

  // 2. held_original_stop ─────────────────────────────────────────────────────
  {
    const hasStop = originalStop != null && originalStop > 0;
    if (!hasStop) {
      scenarios.push(
        makeUnavailable(
          'held_original_stop',
          'Held original stop',
          'No original stop recorded.',
        ),
      );
    } else {
      const w = walkToExit({ stop: originalStop!, target: originalTarget ?? null });
      const pnlUsd = pnlAt(w.exitPrice, qty) - feeUsd;
      let note: string;
      if (w.hitStop) {
        note = 'Original stop would have tagged out.';
      } else if (w.hitTarget) {
        note = 'Rode original stop to the target.';
      } else {
        note = 'Neither stop nor target reached — exit at close.';
      }
      scenarios.push({
        key: 'held_original_stop',
        label: 'Held original stop',
        pnlUsd,
        rMultiple: rOf(pnlUsd),
        exitPrice: w.exitPrice,
        exitTime: w.exitTime,
        confidence: confidenceFor(w.collided),
        note,
        available: true,
        simulated: false,
      });
    }
  }

  // 3. original_target_hit ────────────────────────────────────────────────────
  {
    const hasTarget = originalTarget != null && originalTarget > 0;
    if (!hasTarget) {
      scenarios.push(
        makeUnavailable(
          'original_target_hit',
          'Held to original target',
          'No target defined for this trade.',
        ),
      );
    } else {
      const w = walkToExit({ stop: originalStop ?? null, target: originalTarget! });
      const pnlUsd = pnlAt(w.exitPrice, qty) - feeUsd;
      let note: string;
      if (w.hitTarget) {
        note = 'Held to the original target.';
      } else if (w.hitStop || w.collided) {
        note = 'Stopped out before the target.';
      } else {
        note = 'Target not reached during the trade.';
      }
      scenarios.push({
        key: 'original_target_hit',
        label: 'Held to original target',
        pnlUsd,
        rMultiple: rOf(pnlUsd),
        exitPrice: w.exitPrice,
        exitTime: w.exitTime,
        confidence: confidenceFor(w.collided),
        note,
        available: true,
        simulated: false,
      });
    }
  }

  // 4. held_loser_past_stop ───────────────────────────────────────────────────
  {
    const pnlUsd = pnlAt(lastClose, qty) - feeUsd;
    scenarios.push({
      key: 'held_loser_past_stop',
      label: 'Held past the stop',
      pnlUsd,
      rMultiple: rOf(pnlUsd),
      exitPrice: lastClose,
      exitTime: lastTime,
      confidence: 'high',
      note: 'Ignored the stop and held to close.',
      available: true,
      simulated: false,
    });
  }

  // 5. moved_stop_to_breakeven (FALLBACK / simulated) ─────────────────────────
  {
    const hasStop = originalStop != null && originalStop > 0;
    if (!hasStop) {
      scenarios.push(
        makeUnavailable(
          'moved_stop_to_breakeven',
          'Moved stop to breakeven',
          'No original stop recorded.',
        ),
      );
    } else {
      const triggerR = cfg.breakevenTriggerR;
      const rPrice = Math.abs(entryPrice - originalStop!);
      const triggerPrice = entryPrice + dir * triggerR * rPrice;

      // When real stop modifications exist, swap the "will use your real
      // stop moves once captured" placeholder for a note grounded in the
      // trader's actual behavior (count + time of the first real move).
      const realStopMoveNote =
        stopMods.length > 0
          ? `You actually moved your stop ${stopMods.length} time${stopMods.length === 1 ? '' : 's'}, first at ${new Date(stopMods[0].time).toISOString()}.`
          : null;
      function withStopMoveNote(base: string): string {
        return realStopMoveNote
          ? `${base} — ${realStopMoveNote}`
          : `${base} (will use your real stop moves once captured).`;
      }

      // Phase 1: walk with the original stop active, watch for BE trigger.
      let pnlUsd: number | null = null;
      let exitPrice: number | null = null;
      let exitTime: number | null = null;
      let finalNote = '';
      let hadCollision = false;
      let beArmedAtIndex = -1;

      for (let i = 0; i < pricePath.length; i++) {
        const bar = pricePath[i];
        const sHit = stopTouched(bar, originalStop!);
        // Favorable extreme for checking the trigger.
        const favorableExtreme = side === 'LONG' ? bar.h : bar.l;
        const triggerReached =
          side === 'LONG'
            ? favorableExtreme >= triggerPrice
            : favorableExtreme <= triggerPrice;

        if (sHit) {
          // Stopped out before BE trigger was reached.
          pnlUsd = pnlAt(originalStop!, qty) - feeUsd;
          exitPrice = originalStop!;
          exitTime = bar.t;
          finalNote = withStopMoveNote('Estimated — stopped out before reaching breakeven trigger');
          break;
        }

        if (triggerReached) {
          // BE armed — switch to Phase 2 from the NEXT bar.
          beArmedAtIndex = i + 1;
          break;
        }
      }

      if (pnlUsd == null && beArmedAtIndex === -1) {
        // Exhausted all bars without hitting stop or trigger.
        pnlUsd = pnlAt(lastClose, qty) - feeUsd;
        exitPrice = lastClose;
        exitTime = lastTime;
        finalNote = withStopMoveNote('Estimated — BE trigger never reached');
      }

      if (pnlUsd == null && beArmedAtIndex >= 0) {
        // Phase 2: stop = entryPrice (breakeven), target = originalTarget if set.
        const phase2Bars = pricePath.slice(beArmedAtIndex);
        const beStop = entryPrice;
        const beTarget = originalTarget ?? null;

        let phase2Done = false;
        for (const bar of phase2Bars) {
          const beStopHit = stopTouched(bar, beStop);
          const tHit = beTarget != null && targetTouched(bar, beTarget);

          if (beStopHit && tHit) {
            // Collision in Phase 2 — conservative: BE stop first.
            pnlUsd = pnlAt(beStop, qty) - feeUsd;
            exitPrice = beStop;
            exitTime = bar.t;
            finalNote = withStopMoveNote('Estimated — choked at breakeven — price ran without you');
            hadCollision = true;
            phase2Done = true;
            break;
          }
          if (beStopHit) {
            pnlUsd = pnlAt(beStop, qty) - feeUsd;
            exitPrice = beStop;
            exitTime = bar.t;
            finalNote = withStopMoveNote('Estimated — choked at breakeven — price ran without you');
            phase2Done = true;
            break;
          }
          if (tHit) {
            pnlUsd = pnlAt(beTarget!, qty) - feeUsd;
            exitPrice = beTarget!;
            exitTime = bar.t;
            finalNote = withStopMoveNote('Estimated — moved to BE then hit target');
            phase2Done = true;
            break;
          }
        }

        if (!phase2Done) {
          // Phase 2 exhausted without exit.
          pnlUsd = pnlAt(lastClose, qty) - feeUsd;
          exitPrice = lastClose;
          exitTime = lastTime;
          finalNote = withStopMoveNote('Estimated — moved to BE — neither BE stop nor target reached; exit at close');
        }
      }

      scenarios.push({
        key: 'moved_stop_to_breakeven',
        label: 'Moved stop to breakeven',
        pnlUsd: pnlUsd!,
        rMultiple: rOf(pnlUsd),
        exitPrice: exitPrice!,
        exitTime: exitTime!,
        confidence: hadCollision ? 'ambiguous' : 'high',
        note: finalNote,
        available: true,
        simulated: true,
      });
    }
  }

  // 6. no_stop_moves — real stop-modification data only ──────────────────────
  //
  // "If you had never moved your stop": static walk using the DERIVED true
  // original stop AND the derived true original target — no breakeven logic,
  // no trailing. Only produced when at least one real stop modification was
  // captured (otherwise there is nothing to counterfactually undo — this is
  // NOT the same claim as held_original_stop, which walks with whatever
  // originalStop/originalTarget the caller supplied, real moves or not).
  if (stopMods.length > 0) {
    if (derivedOriginalStop == null || derivedOriginalStop <= 0) {
      scenarios.push(
        makeUnavailable(
          'no_stop_moves',
          'Never moved stop',
          'Stop was moved, but no original stop price could be determined.',
        ),
      );
    } else {
      const w = walkToExit({ stop: derivedOriginalStop, target: derivedOriginalTarget ?? null });
      const pnlUsd = pnlAt(w.exitPrice, qty) - feeUsd;
      scenarios.push({
        key: 'no_stop_moves',
        label: 'Never moved stop',
        pnlUsd,
        rMultiple: rOf(pnlUsd),
        exitPrice: w.exitPrice,
        exitTime: w.exitTime,
        confidence: confidenceFor(w.collided),
        note: `If you had never moved your stop: original stop ${derivedOriginalStop} held for the whole trade.`,
        available: true,
        simulated: true,
      });
    }
  }

  // 7. no_target_moves — real target-modification data only ──────────────────
  //
  // Symmetric to no_stop_moves: "if you had left your target where you
  // planned it" — static walk using the derived true original target AND
  // the derived true original stop, no breakeven logic, no trailing.
  if (targetMods.length > 0) {
    if (derivedOriginalTarget == null || derivedOriginalTarget <= 0) {
      scenarios.push(
        makeUnavailable(
          'no_target_moves',
          'Never moved target',
          'Target was moved, but no original target price could be determined.',
        ),
      );
    } else {
      const w = walkToExit({ stop: derivedOriginalStop ?? null, target: derivedOriginalTarget });
      const pnlUsd = pnlAt(w.exitPrice, qty) - feeUsd;
      scenarios.push({
        key: 'no_target_moves',
        label: 'Never moved target',
        pnlUsd,
        rMultiple: rOf(pnlUsd),
        exitPrice: w.exitPrice,
        exitTime: w.exitTime,
        confidence: confidenceFor(w.collided),
        note: `If you had never moved your target: original target ${derivedOriginalTarget} held for the whole trade.`,
        available: true,
        simulated: true,
      });
    }
  }

  // 8. no_trade ───────────────────────────────────────────────────────────────
  {
    scenarios.push({
      key: 'no_trade',
      label: 'No trade',
      pnlUsd: 0,
      rMultiple: 0,
      exitPrice: null,
      exitTime: null,
      confidence: 'high',
      note: 'Sat it out.',
      available: true,
      simulated: false,
    });
  }

  // ── Actual P&L (from scenario 'actual' already computed) ──────────────────
  const actualPnlUsd = (scenarios[0] as ScenarioResult).pnlUsd ?? 0;

  return { scenarios, riskUsd, actualPnlUsd, modificationMarkers: extractModificationMarkers(input) };
}
