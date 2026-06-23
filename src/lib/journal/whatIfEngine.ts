// whatIfEngine.ts — pure, side-effect-free what-if analysis for a single trade.
// No React, no Supabase, no network I/O.
// getAssetMultiplier is not exported from useTradesData, so we inline an
// equivalent lookup keyed on the same ASSET_MULTIPLIERS map.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Side = 'LONG' | 'SHORT';

/**
 * Confidence tier for R-based what-if estimates.
 *
 * - 'exact'         — bar-level walk resolved the order; outcome is known.
 * - 'certain'       — R fields alone are sufficient to determine the outcome
 *                     unambiguously (e.g. price never reached the arm level,
 *                     or it reached the arm but never returned to entry).
 * - 'indeterminate' — R fields show both the arm AND a return-to-entry were
 *                     reached, but tick order is unknown without bar data, so
 *                     we cannot tell whether break-even fired before or after
 *                     the return. outcomeR is null; lowR/highR bound the range.
 */
export type Confidence = 'exact' | 'certain' | 'indeterminate';

export interface WhatIfTrade {
  side: Side;
  entry_price: number;
  exit_price: number;
  quantity: number;
  multiplier?: number | null;       // if absent, derive from symbol
  symbol?: string;
  stop_price?: number | null;       // intended/initial stop
  take_profit_price?: number | null; // intended target
  planned_1r_usd?: number | null;   // planned risk in $
  open_at: string;
  close_at: string;
  mfe_r?: number | null;            // max favorable excursion in R units (R = |entry-stop| pts)
  mae_r?: number | null;            // max adverse excursion in R units
}

export interface PriceBar { t: number; o: number; h: number; l: number; c: number; }

export type ScenarioKey = 'actual' | 'plan' | 'best_possible' | 'held_stop';

export interface WhatIfScenario {
  key: ScenarioKey;
  label: string;
  pnl: number | null;           // null when not computable
  deltaVsActual: number | null;
  exitPrice: number | null;
  detail: string;               // short human explanation
  available: boolean;           // false => data missing; UI greys it out
  requires?: 'bars' | 'order_modifications';
}

export interface WhatIfResult {
  actualPnl: number;
  scenarios: WhatIfScenario[];
  mfe: { price: number; pnl: number } | null;  // max favorable excursion (needs bars)
  mae: { price: number; pnl: number } | null;  // max adverse excursion (needs bars)
  insight: string;              // one-line plain-English takeaway
  confidence: 'high' | 'low' | 'none';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ASSET_MULTIPLIERS: Record<string, number> = {
  ES: 50, MES: 5, NQ: 20, MNQ: 2, YM: 5,
  RTY: 50, CL: 1000, GC: 100, SI: 5000,
  ZB: 1000, ZN: 1000,
};

export function resolveMultiplier(trade: WhatIfTrade): number {
  if (trade.multiplier != null && trade.multiplier > 0) return trade.multiplier;
  const sym = trade.symbol?.toUpperCase().trim().replace(/\d+$/, '') ?? '';
  return ASSET_MULTIPLIERS[sym] ?? 1;
}

/** Core P&L at any hypothetical exit price. */
function pnlAt(price: number, trade: WhatIfTrade, mult: number): number {
  const diff = trade.side === 'LONG'
    ? price - trade.entry_price
    : trade.entry_price - price;
  return diff * trade.quantity * mult;
}

function isPositiveNumber(v: number | null | undefined): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0;
}

function fmtDelta(n: number): string {
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+' : '-') + '$' + abs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute what-if scenarios for a completed trade.
 *
 * @param trade   - The trade to analyse. entry/exit/quantity/side are required.
 * @param bars    - Optional intra-trade OHLC bars ordered by time ascending.
 *                  When supplied, MFE/MAE and path-dependent scenarios
 *                  (best_possible, held_stop) become available.
 * @returns       WhatIfResult with scenarios, excursions, and a one-line insight.
 */
export function analyzeWhatIf(trade: WhatIfTrade, bars?: PriceBar[] | null): WhatIfResult {
  const mult = resolveMultiplier(trade);
  const actualPnl = pnlAt(trade.exit_price, trade, mult);
  const hasBars = Array.isArray(bars) && bars.length > 0;
  const tp = trade.take_profit_price;
  const stop = trade.stop_price;
  const isLong = trade.side === 'LONG';

  // --- Scenario: actual ---
  const actualScenario: WhatIfScenario = {
    key: 'actual',
    label: 'Your actual',
    pnl: actualPnl,
    deltaVsActual: 0,
    exitPrice: trade.exit_price,
    detail: 'What actually happened.',
    available: true,
  };

  // --- Scenario: plan (held to target) ---
  let planScenario: WhatIfScenario;
  if (isPositiveNumber(tp)) {
    const planPnl = pnlAt(tp, trade, mult);
    const delta = planPnl - actualPnl;
    let detail = 'If you had held to your original target';
    if (hasBars) {
      // Did price reach TP before stop?
      let tpReached = false;
      let stopHitFirst = false;
      for (const bar of bars!) {
        const stopHit = isPositiveNumber(stop) && (isLong ? bar.l <= stop : bar.h >= stop);
        const tpHit = isLong ? bar.h >= tp : bar.l <= tp;
        if (stopHit && !tpReached) { stopHitFirst = true; break; }
        if (tpHit) { tpReached = true; break; }
      }
      detail = tpReached
        ? 'Price reached your target before hitting stop — this exit was available.'
        : stopHitFirst
          ? 'Stop was hit before price reached your target — you may not have gotten this exit.'
          : 'Price did not reach your target during the trade.';
    } else {
      detail += ' (assumes stop not hit first)';
    }
    planScenario = {
      key: 'plan',
      label: 'Held to plan target',
      pnl: planPnl,
      deltaVsActual: delta,
      exitPrice: tp,
      detail,
      available: true,
    };
  } else {
    planScenario = {
      key: 'plan',
      label: 'Held to plan target',
      pnl: null,
      deltaVsActual: null,
      exitPrice: null,
      detail: 'No take-profit price set for this trade.',
      available: false,
    };
  }

  // --- Scenario: best_possible (MFE exit) ---
  let bestScenario: WhatIfScenario;
  if (hasBars) {
    const bestPrice = isLong
      ? Math.max(...bars!.map(b => b.h))
      : Math.min(...bars!.map(b => b.l));
    const bestPnl = pnlAt(bestPrice, trade, mult);
    bestScenario = {
      key: 'best_possible',
      label: 'Best possible exit',
      pnl: bestPnl,
      deltaVsActual: bestPnl - actualPnl,
      exitPrice: bestPrice,
      detail: 'The most favourable price reached during the trade.',
      available: true,
    };
  } else {
    bestScenario = {
      key: 'best_possible',
      label: 'Best possible exit',
      pnl: null,
      deltaVsActual: null,
      exitPrice: null,
      detail: 'Need price bars to compute the best reachable exit.',
      available: false,
      requires: 'bars',
    };
  }

  // --- Scenario: held_stop (never moved stop) ---
  let heldStopScenario: WhatIfScenario;
  if (!isPositiveNumber(stop)) {
    heldStopScenario = {
      key: 'held_stop',
      label: 'If you never moved your stop',
      pnl: null,
      deltaVsActual: null,
      exitPrice: null,
      detail: 'No initial stop price set for this trade.',
      available: false,
    };
  } else if (!hasBars) {
    heldStopScenario = {
      key: 'held_stop',
      label: 'If you never moved your stop',
      pnl: null,
      deltaVsActual: null,
      exitPrice: null,
      detail: 'Need price path to know if the original stop would have been hit.',
      available: false,
      requires: 'bars',
    };
  } else {
    // Walk bars in time order; determine whether stop or TP is touched first.
    let outcomePrice: number = trade.exit_price; // fallback
    let outcomeDetail = 'Stop was not touched — exit at actual price.';
    for (const bar of bars!) {
      const stopTouched = isLong ? bar.l <= stop : bar.h >= stop;
      const tpTouched = isPositiveNumber(tp) && (isLong ? bar.h >= tp : bar.l <= tp);
      if (tpTouched && (!stopTouched || (isLong ? bar.h : -bar.l) >= (isLong ? tp : -stop!))) {
        // TP touched first (or same bar but conservatively credit TP when we can't split intrabar)
        outcomePrice = tp;
        outcomeDetail = 'Target was hit before the original stop — locked in full profit.';
        break;
      }
      if (stopTouched) {
        outcomePrice = stop;
        outcomeDetail = `Original stop at ${stop} would have been hit — stopped out.`;
        break;
      }
    }
    const hsPnl = pnlAt(outcomePrice, trade, mult);
    heldStopScenario = {
      key: 'held_stop',
      label: 'If you never moved your stop',
      pnl: hsPnl,
      deltaVsActual: hsPnl - actualPnl,
      exitPrice: outcomePrice,
      detail: outcomeDetail,
      available: true,
    };
  }

  // --- MFE / MAE ---
  let mfe: WhatIfResult['mfe'] = null;
  let mae: WhatIfResult['mae'] = null;
  if (hasBars) {
    const mfePrice = isLong
      ? Math.max(...bars!.map(b => b.h))
      : Math.min(...bars!.map(b => b.l));
    const maePrice = isLong
      ? Math.min(...bars!.map(b => b.l))
      : Math.max(...bars!.map(b => b.h));
    mfe = { price: mfePrice, pnl: pnlAt(mfePrice, trade, mult) };
    mae = { price: maePrice, pnl: pnlAt(maePrice, trade, mult) };
  }

  // --- Confidence ---
  const confidence: WhatIfResult['confidence'] = hasBars
    ? 'high'
    : (isPositiveNumber(tp) || isPositiveNumber(stop)) ? 'low' : 'none';

  // --- Insight ---
  let insight: string;
  if (hasBars && mfe != null) {
    const leftOnTable = mfe.pnl - actualPnl;
    if (Math.abs(leftOnTable) >= 50) {
      insight = `The market offered ${fmtDelta(leftOnTable)} more than you took.`;
    } else if (planScenario.available && planScenario.deltaVsActual != null) {
      insight = `Holding to your plan target would have changed this trade by ${fmtDelta(planScenario.deltaVsActual)}.`;
    } else {
      insight = 'You captured most of the available move in this trade.';
    }
  } else if (planScenario.available && planScenario.deltaVsActual != null) {
    insight = `Holding to your plan target would have changed this trade by ${fmtDelta(planScenario.deltaVsActual)}.`;
  } else {
    insight = 'Add a stop/target or enable price tracking to unlock what-if analysis for this trade.';
  }

  return {
    actualPnl,
    scenarios: [actualScenario, planScenario, bestScenario, heldStopScenario],
    mfe,
    mae,
    insight,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// R-based scenario helpers
// ---------------------------------------------------------------------------

/**
 * Derive risk in USD for a trade: |entry - stop| * quantity * multiplier.
 * Returns null when stop is missing or non-positive.
 * Used internally by the R-based scenario functions below.
 */
export function riskUsd(trade: WhatIfTrade, mult: number): number | null {
  if (!isPositiveNumber(trade.stop_price)) return null;
  const riskPts = Math.abs(trade.entry_price - trade.stop_price);
  if (riskPts === 0) return null;
  return riskPts * trade.quantity * mult;
}

/**
 * Compute the actual R outcome for a trade from its entry/exit/stop.
 * Returns null when risk cannot be derived (no stop or zero-risk).
 */
function actualOutcomeR(trade: WhatIfTrade): number | null {
  if (!isPositiveNumber(trade.stop_price)) return null;
  const riskPts = Math.abs(trade.entry_price - trade.stop_price);
  if (riskPts === 0) return null;
  const actualPts = trade.side === 'LONG'
    ? trade.exit_price - trade.entry_price
    : trade.entry_price - trade.exit_price;
  return actualPts / riskPts;
}

/**
 * Bars-free break-even estimator with honest confidence tiering.
 *
 * Requires both `mfe_r` AND `mae_r` on the trade — returns null if either
 * is missing. This function deliberately avoids fabricating a point estimate
 * when the tick order is unknowable.
 *
 * Why a trade can be indeterminate:
 *   A break-even stop is armed once price travels `rMultiple` R in the
 *   trader's favour. When bar data is absent we only know the *magnitude*
 *   of excursions, not their *order*. If the price both reached the arm
 *   level (mfe_r ≥ rMultiple) AND returned to entry (mae_r > EPS), the
 *   break-even stop might have fired before the adverse move or the adverse
 *   move might have occurred before the arm was reached — the R fields alone
 *   cannot distinguish these two orderings.
 *
 * Confidence tiers:
 *   'certain'       — outcome is unambiguous from the R magnitudes alone.
 *   'indeterminate' — arm reached AND return-to-entry present; outcomeR is
 *                     null (never fabricated); lowR/highR bound the range.
 *
 * @param trade      - Trade with mfe_r and mae_r populated.
 * @param rMultiple  - R level at which the stop is moved to break-even.
 * @returns          Confidence-tiered estimate, or null if excursion data
 *                   is unavailable.
 */
export function estimateBreakEvenAtR(
  trade: WhatIfTrade,
  rMultiple: number,
): {
  confidence: 'certain' | 'indeterminate';
  outcomeR: number | null;
  lowR: number;
  highR: number;
  pnlUsd: number | null;
  lowUsd: number;
  highUsd: number;
} | null {
  const hasMfeR = typeof trade.mfe_r === 'number' && isFinite(trade.mfe_r);
  const hasMaeR = typeof trade.mae_r === 'number' && isFinite(trade.mae_r);
  if (!hasMfeR || !hasMaeR) return null;

  const mfe_r = trade.mfe_r as number;
  const mae_r = trade.mae_r as number;

  // R-noise floor: excursions below this are treated as "price never moved
  // meaningfully against entry" (tick spread / rounding artefacts).
  const EPS = 0.02;

  const actR = actualOutcomeR(trade); // realized R from entry/exit/stop
  const mult = resolveMultiplier(trade);
  const rUsd = riskUsd(trade, mult);  // $ per 1R; null when stop is missing

  const armed = mfe_r >= rMultiple;

  let confidence: 'certain' | 'indeterminate';
  let outcomeR: number | null;
  let lowR: number;
  let highR: number;

  if (!armed) {
    // Price never reached the arm level — break-even was never triggered.
    // The actual outcome is certain: stopped out at -1R, or exited at actR.
    outcomeR = mae_r >= 1 ? -1 : (actR ?? 0);
    confidence = 'certain';
    lowR = outcomeR;
    highR = outcomeR;
  } else if (mae_r <= EPS) {
    // Armed, but price effectively never returned toward entry — break-even
    // stop was never touched. Outcome = what actually happened.
    outcomeR = actR ?? 0;
    confidence = 'certain';
    lowR = outcomeR;
    highR = outcomeR;
  } else {
    // Armed AND price returned past entry (mae_r > EPS). Without knowing
    // tick order we cannot determine whether the arm fired before or after
    // the adverse move. Return an honest range instead of a point value.
    confidence = 'indeterminate';
    outcomeR = null; // DO NOT fabricate a single number here

    // Lower bound: worst case — stop was not yet armed when adverse move hit.
    //   If mae_r ≥ 1, stop would have been hit at -1R.
    //   Otherwise the adverse move stopped short and we bound at 0 (BE) or actR.
    lowR = Math.min(0, actR ?? 0, mae_r >= 1 ? -1 : 0);
    // Upper bound: best case — arm fired, BE stop protected; exit at actR ≥ 0.
    highR = Math.max(0, actR ?? 0);
  }

  // USD conversion — rUsd may be null when stop_price is absent.
  let pnlUsd: number | null;
  let lowUsd: number;
  let highUsd: number;

  if (rUsd != null) {
    pnlUsd  = outcomeR !== null ? outcomeR * rUsd : null;
    lowUsd  = lowR  * rUsd;
    highUsd = highR * rUsd;
  } else {
    // No stop price available — cannot convert R to USD.
    pnlUsd  = null;
    lowUsd  = 0;
    highUsd = 0;
  }

  return { confidence, outcomeR, lowR, highR, pnlUsd, lowUsd, highUsd };
}

/**
 * Models a fixed take-profit at `rMultiple` R with the original stop kept at -1R.
 *
 * Requires mfe_r + mae_r on the trade, OR price bars. Returns null if neither
 * is available to determine the outcome.
 *
 * When both the target and the stop were touched but no bars are provided,
 * we default conservatively to stop-first (resolved = 'estimated', outcomeR = -1)
 * so we never overstate a strategy's expected value.
 */
export function fixedTargetAtR(
  trade: WhatIfTrade,
  rMultiple: number,
  bars?: PriceBar[],
): { pnlUsd: number; outcomeR: number; resolved: 'target' | 'stop' | 'actual' | 'estimated'; confidence: Confidence } | null {
  const mult = resolveMultiplier(trade);
  const rUsd = riskUsd(trade, mult);

  const hasMfeR = typeof trade.mfe_r === 'number' && isFinite(trade.mfe_r);
  const hasMaeR = typeof trade.mae_r === 'number' && isFinite(trade.mae_r);
  const hasBars = Array.isArray(bars) && bars.length > 0;

  // Need at least one excursion source.
  if (!hasMfeR && !hasMaeR && !hasBars) return null;

  const isLong = trade.side === 'LONG';

  // Determine target / stop touches from R fields first, then from bars.
  let reachedTarget: boolean;
  let hitStop: boolean;

  if (hasMfeR || hasMaeR) {
    // Use stored R excursion values.
    reachedTarget = hasMfeR && (trade.mfe_r as number) >= rMultiple;
    hitStop       = hasMaeR && (trade.mae_r as number) >= 1;
  } else {
    // Derive from bars: compute riskPts to convert price distances to R.
    if (!isPositiveNumber(trade.stop_price)) return null;
    const riskPts = Math.abs(trade.entry_price - trade.stop_price);
    if (riskPts === 0) return null;

    const targetPrice = isLong
      ? trade.entry_price + rMultiple * riskPts
      : trade.entry_price - rMultiple * riskPts;
    const stopPrice = trade.stop_price;

    reachedTarget = hasBars && bars!.some(b => isLong ? b.h >= targetPrice : b.l <= targetPrice);
    hitStop       = hasBars && bars!.some(b => isLong ? b.l <= stopPrice  : b.h >= stopPrice);
  }

  let outcomeR: number;
  let resolved: 'target' | 'stop' | 'actual' | 'estimated';

  if (reachedTarget && !hitStop) {
    outcomeR = rMultiple;
    resolved = 'target';
  } else if (hitStop && !reachedTarget) {
    outcomeR = -1;
    resolved = 'stop';
  } else if (!reachedTarget && !hitStop) {
    // Neither level was touched — fall back to what actually happened.
    outcomeR = actualOutcomeR(trade) ?? 0;
    resolved = 'actual';
  } else {
    // Both touched: ambiguous order. Walk bars if available to resolve.
    if (hasBars && isPositiveNumber(trade.stop_price)) {
      const riskPts = Math.abs(trade.entry_price - trade.stop_price);
      if (riskPts > 0) {
        const targetPrice = isLong
          ? trade.entry_price + rMultiple * riskPts
          : trade.entry_price - rMultiple * riskPts;
        const stopPrice = trade.stop_price;
        let barResolved: 'target' | 'stop' | null = null;
        for (const bar of bars!) {
          const tHit = isLong ? bar.h >= targetPrice : bar.l <= targetPrice;
          const sHit = isLong ? bar.l <= stopPrice   : bar.h >= stopPrice;
          if (tHit && !sHit) { barResolved = 'target'; break; }
          if (sHit && !tHit) { barResolved = 'stop';   break; }
          // Both hit inside the same bar — intrabar order unknowable; take pessimistic.
          if (tHit && sHit) { barResolved = 'stop'; break; }
        }
        resolved = barResolved ?? 'stop';
      } else {
        // Zero risk — pessimistic default.
        resolved = 'stop';
      }
    } else {
      // No bars available to break the tie.
      // Conservative assumption: stop was hit first — we never overstate expected value.
      resolved = 'estimated';
    }
    outcomeR = resolved === 'target' ? rMultiple : -1;
  }

  // Convert R outcome to USD: outcomeR * riskUsd (when stop is available),
  // or fall back to price-based P&L for the 'actual' path.
  let pnlUsd: number;
  if (resolved === 'actual') {
    pnlUsd = pnlAt(trade.exit_price, trade, mult);
  } else {
    if (rUsd != null) {
      pnlUsd = outcomeR * rUsd;
    } else {
      // No stop available — approximate from actual P&L scaled by outcomeR.
      const actualPnl = pnlAt(trade.exit_price, trade, mult);
      // outcomeR already carries the sign (e.g. -1 for a stop-out), so scale by
      // the magnitude of actual P&L only — multiplying by sign(outcomeR) again
      // would cancel the sign and flip a loss into a gain.
      pnlUsd = actualPnl !== 0 ? outcomeR * Math.abs(actualPnl) : 0;
    }
  }

  // Derive confidence from how the order was resolved.
  // - bars walked and resolved intrabar order → 'exact'
  // - bars walked but order was unambiguous (only one level hit) → 'certain'
  // - no bars, but R fields gave an unambiguous answer → 'certain'
  // - both levels hit, no bars to break the tie → 'indeterminate'
  const confidence: Confidence =
    resolved === 'estimated'
      ? 'indeterminate'
      : hasBars && (reachedTarget && hitStop)
        ? 'exact'        // bars walked to resolve the ambiguous-both-touched case
        : 'certain';

  return { pnlUsd, outcomeR, resolved, confidence };
}

/**
 * Models a break-even stop management: the stop is moved to entry once
 * price reaches `rMultiple` R in the trader's favour (the "arm level").
 *
 * Requires price bars and a stop_price — returns null when either is absent.
 *
 * Walk order (time-ascending bars):
 *   Phase 1 (not armed): original stop active. Adverse extreme hits stop → -1R exit.
 *                        Favourable extreme reaches arm level → move to Phase 2.
 *   Phase 2 (armed):     stop = entry. Adverse extreme returns to entry → 0R exit.
 *                        Favourable extreme reaches take_profit_price → exit there.
 *   After final bar:     exit at trade's actual exit_price.
 */
export function breakEvenAtR(
  trade: WhatIfTrade,
  bars: PriceBar[],
  rMultiple: number,
): { pnlUsd: number; outcomeR: number; confidence: 'exact' } | null {
  if (!Array.isArray(bars) || bars.length === 0) return null;
  if (!isPositiveNumber(trade.stop_price)) return null;

  const mult = resolveMultiplier(trade);
  const isLong = trade.side === 'LONG';
  const riskPts = Math.abs(trade.entry_price - trade.stop_price);
  if (riskPts === 0) return null;

  const stopPrice = trade.stop_price;
  const armLevel = isLong
    ? trade.entry_price + rMultiple * riskPts
    : trade.entry_price - rMultiple * riskPts;
  const tp = trade.take_profit_price;

  let armed = false;
  let exitPrice: number | null = null;

  for (const bar of bars) {
    if (!armed) {
      // Phase 1: check if original stop is hit before arm level.
      const stopHit  = isLong ? bar.l <= stopPrice : bar.h >= stopPrice;
      const armHit   = isLong ? bar.h >= armLevel  : bar.l <= armLevel;

      if (stopHit && !armHit) {
        exitPrice = stopPrice;
        break;
      }
      if (armHit) {
        armed = true;
        // Continue into Phase 2 within the same bar — check if break-even touched.
        const beHit = isLong ? bar.l <= trade.entry_price : bar.h >= trade.entry_price;
        if (beHit) { exitPrice = trade.entry_price; break; }
        if (isPositiveNumber(tp)) {
          const tpHit = isLong ? bar.h >= tp : bar.l <= tp;
          if (tpHit) { exitPrice = tp; break; }
        }
      }
    } else {
      // Phase 2: stop moved to entry (break-even).
      const beHit = isLong ? bar.l <= trade.entry_price : bar.h >= trade.entry_price;
      if (isPositiveNumber(tp)) {
        const tpHit = isLong ? bar.h >= tp : bar.l <= tp;
        // Credit TP before break-even when both occur on the same bar.
        if (tpHit && !beHit) { exitPrice = tp; break; }
        if (beHit) { exitPrice = trade.entry_price; break; }
        if (tpHit) { exitPrice = tp; break; }
      } else {
        if (beHit) { exitPrice = trade.entry_price; break; }
      }
    }
  }

  // No level was hit during the bars window — use actual exit.
  if (exitPrice === null) exitPrice = trade.exit_price;

  const pnlUsd = pnlAt(exitPrice, trade, mult);
  const exitPts = isLong
    ? exitPrice - trade.entry_price
    : trade.entry_price - exitPrice;
  const outcomeR = riskPts > 0 ? exitPts / riskPts : 0;

  // Bar walk always resolves tick order precisely — confidence is always 'exact'.
  return { pnlUsd, outcomeR, confidence: 'exact' };
}

/**
 * Across a set of trades, evaluate every candidate take-profit target
 * (1R, 2R, 3R, 4R) using fixedTargetAtR (R-field path, no bars required)
 * and recommend the target R that maximises expectancy.
 *
 * Returns null when no trades have mfe_r / mae_r data (sampleSize = 0).
 */
export function recommendRR(trades: WhatIfTrade[]): {
  byR: Array<{ r: number; hitRate: number; expectancyR: number; totalUsd: number }>;
  recommendedR: number;
  sampleSize: number;
  verdict: string;
} | null {
  const CANDIDATE_RS = [1, 2, 3, 4] as const;

  // Only include trades that have at least mfe_r (needed to decide target hit).
  const usable = trades.filter(t => typeof t.mfe_r === 'number' && isFinite(t.mfe_r as number));
  if (usable.length === 0) return null;

  const byR = CANDIDATE_RS.map(r => {
    let hits = 0;
    let totalOutcomeR = 0;
    let totalUsd = 0;

    for (const trade of usable) {
      const result = fixedTargetAtR(trade, r);
      if (result === null) continue;
      if (result.resolved === 'target') hits++;
      totalOutcomeR += result.outcomeR;
      totalUsd += result.pnlUsd;
    }

    const hitRate = hits / usable.length;
    const expectancyR = totalOutcomeR / usable.length;
    return { r, hitRate, expectancyR, totalUsd };
  });

  // Pick the R with highest expectancy. On a tie, prefer the larger R
  // (more upside for the same expectancy).
  const best = byR.reduce((acc, cur) =>
    cur.expectancyR > acc.expectancyR ? cur : acc,
  );

  const hitPct = Math.round(best.hitRate * 100);
  const expRounded = best.expectancyR.toFixed(2);
  const verdict =
    `A fixed ${best.r}R target maximises expectancy (${expRounded}R avg, ${hitPct}% hit rate) ` +
    `on ${usable.length} trades — ` +
    (best.r === 1
      ? 'smaller targets keep win rate high but cap your runners.'
      : best.r >= 4
      ? 'only run this if your edge genuinely produces large moves.'
      : `smaller targets cap your winners while larger ones dilute hit rate.`);

  return {
    byR,
    recommendedR: best.r,
    sampleSize: usable.length,
    verdict,
  };
}
