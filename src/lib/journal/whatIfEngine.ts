// whatIfEngine.ts — pure, side-effect-free what-if analysis for a single trade.
// No React, no Supabase, no network I/O.
// getAssetMultiplier is not exported from useTradesData, so we inline an
// equivalent lookup keyed on the same ASSET_MULTIPLIERS map.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Side = 'LONG' | 'SHORT';

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

function resolveMultiplier(trade: WhatIfTrade): number {
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
