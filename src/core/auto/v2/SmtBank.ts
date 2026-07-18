// ============================================================================
// SMT BANK — Smart Money Technique divergence detector (Increment 4a)
// ============================================================================
//
// WHAT SMT DIVERGENCE MEANS
// --------------------------
// Two historically-correlated instruments (e.g. MES vs MNQ, ES vs NQ) are
// expected to make new highs/lows together. When the TRADED symbol takes out
// a reference level (a new swing high, or the prior day's high) but a
// CORRELATED compare symbol FAILS to take out its own corresponding level,
// that failure-to-confirm ("divergence") is read as smart-money absorption —
// a classic reversal signal. `divergence: 'bearish'` = the divergence occurs
// AT HIGHS (arms SHORT candidates only); `'bullish'` = AT LOWS (arms LONG
// candidates only) — see `types.ts`'s `Condition{kind:'smt'}` doc for the
// full contract, and `validateStrategyStructure` for the structural coupling
// between `divergence` and `reference.type`.
//
// FIRING SEMANTICS (see `SmtBank.getSeries` below for the precise algorithm)
// -----------------------------------------------------------------------
// `getSeries(reference, divergence)` fires at bar `i` when, within a
// `windowBars`-bar window ENDING at `i` (`[i - windowBars + 1, i]`, default
// `DEFAULT_SMT_WINDOW_BARS = 5`):
//
//  1. The TRADED symbol's series took out `reference`: some bar's HIGH in
//     the window exceeds the reference level (`swingHigh`/`prevDayHigh`), or
//     some bar's LOW undercuts it (`swingLow`/`prevDayLow`).
//  2. The COMPARE symbol did NOT take out its OWN corresponding level in the
//     SAME (time-aligned) window.
//
// Both reference levels are READ ONCE, from the bar immediately BEFORE the
// window started (`levels.getSeries(ref)[windowStart - 1]`) — a
// confirmed/causal LevelBank snapshot, so the level cannot "chase" price as
// it sweeps through the window (e.g. a `swingHigh` series updating mid-
// window because the sweep itself creates a fresh, higher pivot).
//
// LOOK-AHEAD SAFETY
// -------------------
// Every value `compute()` reads — traded/compare candles, traded/compare
// LevelBank series, and the traded->compare alignment array — is indexed at
// or before bar `i` on BOTH series. `LevelBank` is itself causal by
// construction (see `LevelBank.ts`), and `alignCompareSeries` (below) only
// ever advances its compare pointer to a bar whose OWN time is <= the
// traded bar's time. Consequently, truncating BOTH series consistently
// (dropping only trailing bars) reproduces byte-identical `fires`/`level`
// values for every bar that survives the truncation — no bar's outcome
// depends on anything after it.
//
// COMPARE-COVERAGE GUARANTEE
// -----------------------------
// If the compare series has no aligned data for the pre-window reference bar
// OR for any bar inside the window (`alignment[j] === -1` — e.g. right at
// the start of a backtest before the compare feed has caught up), the
// divergence is UNCONFIRMED and the condition does NOT fire. This module
// never fires on partial/unknown compare coverage — silence, not a guess.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import { candleTimeMs } from '../MarketContext';
import { LevelBank } from './LevelBank';
import type { Condition, LevelRef } from './types';

/** Default window length (in bars of the phase's own timeframe) an `smt`
 *  condition looks back over — see module doc. Not exposed in the
 *  `Condition{kind:'smt'}` schema (fixed for this increment). */
export const DEFAULT_SMT_WINDOW_BARS = 5;

/** The `reference` shape carried by `Condition{kind:'smt'}` — re-derived
 *  here (rather than duplicated) so this module and `types.ts` never drift. */
export type SmtReference = Extract<Condition, { kind: 'smt' }>['reference'];

/** Per-(reference,divergence) result of {@link SmtBank.getSeries}. */
export interface SmtSeriesResult {
  /** 1 at bar `i` iff the divergence condition fired at `i`; 0 otherwise.
   *  Index-aligned to the TRADED candle series passed to the constructor. */
  fires: Uint8Array;
  /** The TRADED reference level (the swept price) at the bar the condition
   *  fired, `NaN` elsewhere — consumed by `AnchorKind: 'eventLevel'`
   *  capture the same way `levelInteraction`/`event` leaves are (see
   *  `ConditionCompiler.ts`'s `compileSmt`). */
  level: Float64Array;
}

/**
 * Causal alignment: for each bar in `tradedCandles`, the index into
 * `compareCandles` of the LAST compare bar whose OWN open time is <= the
 * traded bar's open time, or -1 if no compare bar has occurred yet.
 *
 * Both series are assumed time-ascending (the standard candle-series
 * invariant used throughout this codebase) and are the SAME timeframe
 * cadence — this is deliberately NOT the higher/lower-timeframe closed-bar
 * formula `TimeframeSet.ts` uses (there is no "duration to wait out" here:
 * two same-cadence series' bars normally share the same open time). Falling
 * back to "nearest prior bar" gracefully absorbs minor calendar gaps between
 * the two symbols (e.g. one instrument prints a bar the other skips).
 *
 * Two-pointer ascending pass — O(tradedBars + compareBars), never
 * O(tradedBars * compareBars). Look-ahead safe: the compare pointer only
 * ever advances to a bar whose time is <= the CURRENT traded bar's time.
 */
export function alignCompareSeries(tradedCandles: Candle[], compareCandles: Candle[]): Int32Array {
  const n = tradedCandles.length;
  const out = new Int32Array(n).fill(-1);
  let j = -1;
  for (let i = 0; i < n; i++) {
    const tradedMs = candleTimeMs(tradedCandles[i]);
    while (j + 1 < compareCandles.length && candleTimeMs(compareCandles[j + 1]) <= tradedMs) {
      j++;
    }
    out[i] = j;
  }
  return out;
}

/**
 * SMT divergence detector for one TRADED/COMPARE symbol pair, both series
 * already resolved to the SAME timeframe (the phase's own TF — see
 * `ConditionCompiler.ts`'s `compileSmt`, which constructs one `SmtBank` per
 * compiled timeframe context via `StrategyEngine.ts`'s `SmtContext`).
 *
 * `getSeries` results are cached per `(reference.type, divergence)` pair —
 * the same lazy-cache discipline `LevelBank.getSeries` uses.
 */
export class SmtBank {
  private readonly cache = new Map<string, SmtSeriesResult>();

  constructor(
    private readonly tradedCandles: Candle[],
    private readonly tradedLevels: LevelBank,
    private readonly compareCandles: Candle[],
    private readonly compareLevels: LevelBank,
    /** `alignCompareSeries(tradedCandles, compareCandles)` — see above. */
    private readonly alignment: Int32Array,
    private readonly windowBars: number = DEFAULT_SMT_WINDOW_BARS,
  ) {}

  /**
   * `divergence` is part of the cache key (so a `'bearish'` and a
   * `'bullish'` lookup never share a cache entry even if a future increment
   * relaxes the reference/divergence coupling), but the actual high/low
   * side tested is driven purely by `reference.type` — see `compute` — so
   * this module never has to trust an inconsistent `divergence` value from
   * a caller that skipped `validateStrategyStructure`.
   */
  getSeries(reference: SmtReference, divergence: 'bullish' | 'bearish'): SmtSeriesResult {
    const key = `${reference.type}:${divergence}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = this.compute(reference);
    this.cache.set(key, result);
    return result;
  }

  private compute(reference: SmtReference): SmtSeriesResult {
    const isHighSide = reference.type === 'swingHigh' || reference.type === 'prevDayHigh';
    const levelRef = toLevelRef(reference);
    const tradedLevelSeries = this.tradedLevels.getSeries(levelRef);
    const compareLevelSeries = this.compareLevels.getSeries(levelRef);
    const n = this.tradedCandles.length;
    const fires = new Uint8Array(n);
    const level = new Float64Array(n).fill(NaN);
    const windowBars = this.windowBars;

    for (let i = 0; i < n; i++) {
      const windowStart = i - windowBars + 1;
      const refIdx = windowStart - 1;
      if (refIdx < 0) continue; // not enough history for a "before window" snapshot

      const tradedRefLevel = tradedLevelSeries[refIdx];
      if (Number.isNaN(tradedRefLevel)) continue;

      // (1) Did the TRADED symbol take out its reference anywhere in the window?
      let tradedBroke = false;
      for (let j = Math.max(0, windowStart); j <= i; j++) {
        const bar = this.tradedCandles[j];
        if (isHighSide ? bar.high > tradedRefLevel : bar.low < tradedRefLevel) {
          tradedBroke = true;
          break;
        }
      }
      if (!tradedBroke) continue;

      // (2) Resolve the COMPARE symbol's own "before window" reference level,
      // via the traded pre-window bar's aligned compare index.
      const compareRefIdx = this.alignment[refIdx];
      if (compareRefIdx === -1) continue; // no compare data yet — cannot confirm
      const compareRefLevel = compareLevelSeries[compareRefIdx];
      if (Number.isNaN(compareRefLevel)) continue;

      // (3) Did the COMPARE symbol ALSO take out its level anywhere in the
      // (time-aligned) window? If so, there is no divergence.
      let compareBroke = false;
      for (let j = Math.max(0, windowStart); j <= i; j++) {
        const cj = this.alignment[j];
        if (cj === -1) {
          // Incomplete compare coverage inside the window — cannot confirm
          // the compare symbol stayed unbroken. Conservative: block the
          // fire rather than assume "unbroken".
          compareBroke = true;
          break;
        }
        const cBar = this.compareCandles[cj];
        if (isHighSide ? cBar.high > compareRefLevel : cBar.low < compareRefLevel) {
          compareBroke = true;
          break;
        }
      }
      if (compareBroke) continue;

      fires[i] = 1;
      level[i] = tradedRefLevel;
    }

    return { fires, level };
  }
}

/**
 * Narrow an `smt` leaf's `reference` (a flat `{ type }` shape, per the
 * Increment 4a contract — a single object type with a UNION-valued `type`
 * field, not a discriminated union of 4 object types) into a proper
 * `LevelRef` discriminated-union member so it can be passed straight to
 * `LevelBank.getSeries`. An explicit switch on `reference.type` (rather than
 * a structural cast) gives the compiler exhaustiveness checking if a new
 * reference type is ever added — note the exhaustiveness guard narrows
 * `reference.type` itself (a plain string-literal union), NOT `reference`
 * (switching on a non-discriminant property never narrows the containing
 * object's static type, only the switched expression's).
 */
function toLevelRef(reference: SmtReference): LevelRef {
  switch (reference.type) {
    case 'swingHigh':
      return { type: 'swingHigh' };
    case 'swingLow':
      return { type: 'swingLow' };
    case 'prevDayHigh':
      return { type: 'prevDayHigh' };
    case 'prevDayLow':
      return { type: 'prevDayLow' };
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = reference.type;
      throw new Error(`SmtBank.toLevelRef: unknown smt reference type ${JSON.stringify(_exhaustive)}`);
    }
  }
}
