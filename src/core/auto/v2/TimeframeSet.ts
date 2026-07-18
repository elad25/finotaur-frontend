// ============================================================================
// TIMEFRAME SET — precomputed causal alignment between an EXECUTION candle
// series and one or more higher-timeframe CONTEXT series (Increment 3 — MTF
// phase sequencing).
// ============================================================================
//
// CLOSED-BAR SEMANTICS
// ---------------------
// A context-timeframe (higher-TF) bar only becomes "usable" from an
// execution bar once it has fully CLOSED relative to that execution bar's
// OPEN time — EXACTLY the same rule `MarketContext.ts`'s HTF-bias fix uses
// (`computeHtfBias`):
//
//     ctxOpenMs + ctxDurationMs <= execOpenMs
//
// i.e. a 4h bar that opened at 00:00 (closes 04:00) only becomes usable for
// execution bars whose OWN open time is >= 04:00 — never for an execution
// bar still inside [00:00, 04:00), which would be reading a still-forming
// (not-yet-closed) HTF bar — a look-ahead bug. `alignedIndex(tf, i)` returns
// the index of the LAST such closed context bar as of execution bar `i`, or
// -1 if none has closed yet (e.g. the very start of the backtest, before the
// first context bar has finished forming).
//
// `execution TF` is trivially aligned to itself: `alignedIndex(executionTf,
// i) === i` always, by identity — no lookup array is built for it.
//
// PRECOMPUTATION
// ---------------
// For each registered context timeframe, a single ascending two-pointer pass
// over the execution series computes its alignment array ONCE, at
// construction time. Both series are time-ascending, so the context pointer
// `j` only ever moves forward — total work is O(execBars + ctxBars), never
// O(execBars * ctxBars).
//
// DURATION SOURCE
// -----------------
// Bar duration comes from `MarketContext.ts`'s `timeframeToMs` (the SAME
// known-label -> ms map the HTF-bias fix uses), falling back to
// `medianDeltaMs` (median delta between the context series' own candles) for
// any timeframe label the map doesn't recognize — same fallback discipline
// as `computeHtfBias`, so this module never invents a second,
// potentially-drifting duration source.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import { candleTimeMs, timeframeToMs, medianDeltaMs } from '../MarketContext';
import type { TF } from './types';

/**
 * Precomputed causal alignment between an execution candle series and zero
 * or more higher-timeframe context series. Built ONCE per backtest run (see
 * `StrategyEngine.ts`'s `runStrategyV2`) and shared by every context-TF
 * phase's compiled condition tree (`ConditionCompiler.ts`'s
 * `wrapContextCondition`).
 */
export class TimeframeSet {
  private readonly seriesByTf: Partial<Record<TF, Candle[]>>;
  private readonly executionTf: TF;
  /**
   * `alignment.get(tf)[i]` = index into `seriesByTf[tf]` of the last CLOSED
   * `tf`-bar as of execution bar `i`, or -1 if none has closed yet. One
   * array per registered CONTEXT timeframe (never for `executionTf` itself
   * — that mapping is the identity and needs no storage).
   */
  private readonly alignment: Map<TF, Int32Array>;

  /**
   * @param seriesByTf   Candle series keyed by timeframe label. MUST include
   *                     an entry for `executionTf`; any other entries are
   *                     treated as context timeframes and get an alignment
   *                     array precomputed against the execution series.
   * @param executionTf  The strategy's `timeframes.execution` label.
   */
  constructor(seriesByTf: Partial<Record<TF, Candle[]>>, executionTf: TF) {
    const execSeries = seriesByTf[executionTf];
    if (!execSeries || execSeries.length === 0) {
      throw new Error(
        `TimeframeSet: no (non-empty) candle series supplied for the execution timeframe "${executionTf}".`,
      );
    }
    this.seriesByTf = seriesByTf;
    this.executionTf = executionTf;
    this.alignment = new Map();

    for (const tf of Object.keys(seriesByTf) as TF[]) {
      if (tf === executionTf) continue;
      const ctxSeries = seriesByTf[tf];
      if (!ctxSeries || ctxSeries.length === 0) continue;
      this.alignment.set(tf, computeAlignment(execSeries, ctxSeries, tf));
    }
  }

  /**
   * Index of the last CLOSED `tf`-bar as of execution bar `i`, or -1 if none
   * has closed yet (or `i` is out of range). `alignedIndex(executionTf, i)
   * === i` always — the execution series is trivially "aligned to itself".
   *
   * Throws if `tf` is neither the execution timeframe nor a context
   * timeframe this set was constructed with (a caller bug — every timeframe
   * a compiled phase can reference must have been supplied up front).
   */
  alignedIndex(tf: TF, i: number): number {
    if (tf === this.executionTf) return i;
    const arr = this.alignment.get(tf);
    if (!arr) {
      throw new Error(
        `TimeframeSet.alignedIndex: no series registered for context timeframe "${tf}".`,
      );
    }
    if (i < 0 || i >= arr.length) return -1;
    return arr[i];
  }

  /** The raw candle series for `tf` (execution or a registered context TF). */
  series(tf: TF): Candle[] {
    const s = this.seriesByTf[tf];
    if (!s) {
      throw new Error(`TimeframeSet.series: no series registered for timeframe "${tf}".`);
    }
    return s;
  }
}

/**
 * Two-pointer ascending alignment pass — see module doc for the closed-bar
 * formula and complexity note.
 */
function computeAlignment(execSeries: Candle[], ctxSeries: Candle[], tf: TF): Int32Array {
  const n = execSeries.length;
  const out = new Int32Array(n).fill(-1);
  const ctxDurationMs = timeframeToMs(tf) ?? medianDeltaMs(ctxSeries);

  let j = -1;
  for (let i = 0; i < n; i++) {
    const execOpenMs = candleTimeMs(execSeries[i]);
    while (
      j + 1 < ctxSeries.length &&
      candleTimeMs(ctxSeries[j + 1]) + ctxDurationMs <= execOpenMs
    ) {
      j++;
    }
    out[i] = j;
  }
  return out;
}
