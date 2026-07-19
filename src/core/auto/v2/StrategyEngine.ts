// ============================================================================
// STRATEGY ENGINE V2 — forward, single-pass phase-state-machine runner
// ============================================================================
//
// Skeleton mirrors `../AutoBacktestEngine.ts` (v1) closely: a single forward
// pass over `candles`, one concurrent position, SL-before-TP fills, earliest
// fill i+1, session gating, per-day trade counters, futures contract math via
// `../contractSpecs` + `../futuresExecution` — all REUSED verbatim from v1,
// not reimplemented. What's new is WHAT drives a signal: instead of v1's
// precomputed, independent per-bar `Detection[]`, v2 runs a single live
// **phase state machine** (`SetupInstance`) that advances one bar at a time
// through `StrategyDefinitionV2.phases`, captures anchors, and — once the
// LAST phase completes — builds one `TradeSignalV2` via `SignalBuilderV2`.
//
// PER-BAR ORDER OF OPERATIONS (see runStrategyV2Single's loop)
// --------------------------------------------------------
//   (a) Manage the OPEN position, in order: partials -> BE/trailing ->
//       flatAt (Increment 5 — clock-time flat exit) -> exitWhen (Increment 5
//       — condition-based exit) -> time-stop -> SL-before-TP fill checks
//       (v1 gap-realism convention: SL checked before TP on the same bar).
//       flatAt/exitWhen/time-stop are all "force close at this bar's close"
//       mechanisms, checked in that fixed order — whichever fires FIRST on a
//       given bar wins (its own exitReason), the rest are never evaluated
//       that bar.
//   (b) Attempt to fill the PENDING signal (earliest fill armIndex+1,
//       validForBars expiry, session gating, maxTradesPerDay, the NEW
//       dailyLossStopPct filter, and — Increment 5 — cancel outright once
//       local time reaches `exits.flatAt`, never filling into a post-flat
//       window).
//   (c) Advance the phase state machine — ONLY when no position is open AND
//       no signal is pending (the machine PAUSES otherwise; see module
//       doc below on why).
//
// MIRROR (Increment 5 — `mirror: true`)
// ----------------------------------------
// `runStrategyV2` (the public entry point) is a thin wrapper over the above:
// when `def.mirror` is unset, it delegates straight to `runStrategyV2Single`
// (byte-identical to every earlier increment). When set, it ALSO runs
// `mirrorStrategy.ts`'s `mirrorStrategyV2(def)` as a SECOND, independent
// `runStrategyV2Single` pass over the SAME candle series, then merges both
// variants' trades into one chronological result (`mergeStrategyResults`):
// trades concatenated + sorted by entryTime, statistics/equityCurve/
// rMultipleDistribution/rLadder recomputed over the MERGED set using the
// run's real risk params, skippedSignals summed. The two directions run
// fully independently — a long and a short MAY overlap in time (mirrors
// TradeZella's independent long/short counts); `maxTradesPerDay` /
// `dailyLossStopPct` apply PER VARIANT, not to the merged total.
//
// PHASE STATE MACHINE
// --------------------
// Exactly one live `SetupInstance` at a time: `{ phaseIdx, anchors, scratch,
// phaseStartBar, candidateDirection }`. Each bar, while active:
//   - `invalidateIf` (if present) is checked FIRST; if true, reset to phase 0.
//   - else `within.bars` (if present): if the phase has been active longer
//     than its budget, reset to phase 0.
//   - else `when`: if true, the phase COMPLETES — capture its declared
//     anchors, resolve/lock the candidate direction (first direction-coded
//     leaf to fire, across the WHOLE attempt — once resolved it never
//     changes for the rest of the attempt), and advance to the next phase
//     (or, if this was the last phase, build the entry signal and reset for
//     the NEXT attempt).
// While a position is OPEN, or a signal is PENDING, the machine is PAUSED —
// it does not evaluate `when`/`invalidateIf`/`within` at all, and does not
// accumulate `within.bars` budget during the pause (`phaseStartBar` is only
// ever set at the moment a phase actually becomes the active one). This
// keeps the MVP invariant "one position at a time" honest: a strategy cannot
// be mid-way through a NEW setup attempt while the current trade is still
// live.
//
// ANCHOR SEMANTICS (what each AnchorKind captures, and when)
// -------------------------------------------------------------
//   triggerPrice   : close of the bar the phase's `when` fired on.
//   triggerBarHigh : high of that bar.
//   triggerBarLow  : low of that bar.
//   wickExtreme    : direction-dependent — the SHORT side cares about the
//                    bar's HIGH (upper wick, stop sits above), the LONG side
//                    about its LOW (lower wick, stop sits below).
//   eventLevel     : the concrete price the phase's `when` tree fired
//                    against, if any leaf in the tree is a `levelInteraction`
//                    (via `CompiledCondition.resolveEventLevel`, first
//                    non-null leaf in tree order). Falls back to the bar's
//                    close (== triggerPrice) when the firing leaf carries no
//                    natural price (e.g. a pure `event`/`patternActive`
//                    leaf) — documented simplification, see
//                    ConditionCompiler.ts's leaf-level `resolveEventLevel`
//                    implementations for exactly which leaf kinds expose one.
//   counterSwing   : nearest CONFIRMED swing AGAINST the resolved trade
//                    direction as of this bar (long -> nearest confirmed
//                    swing LOW; short -> nearest confirmed swing HIGH), via
//                    v1's `MarketContext.lastConfirmedSwingLow/High` (reused
//                    verbatim, k=2 fractal, same discipline as v1). Absent
//                    (not captured) if no such swing has confirmed yet.
//
// DIRECTION 'both'
// ------------------
// The candidate direction is resolved by the FIRST phase (in phase order)
// whose `when` tree contains a direction-coded leaf that actually fires
// (`CompiledCondition.resolveDirection`). Once resolved it is fixed for the
// remainder of the attempt — later phases' own `when` trees are evaluated
// with `directionsToTest` still spanning both senses (a later phase's own
// leaf could independently resolve either sense), but the ENGINE ignores a
// later resolution once `candidateDirection` is already set; a purely
// direction-agnostic later phase (e.g. a bare `compare`) simply inherits the
// already-resolved candidate.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { AutoBacktestResult, BacktestStatisticsLike, RMultipleDistribution } from '../AutoBacktestEngine';
import { R_LADDER_LEVELS } from '../AutoBacktestEngine';
import { MarketContext, candleTimeMs, localDayKey, hhmmToMinutes, localMinutesAndDay } from '../MarketContext';
import { OrderExecutionEngine } from '../../engines/OrderExecutionEngine';
import { StatisticsEngine } from '../../engines/StatisticsEngine';
import { getContractSpec, type ContractSpec } from '../contractSpecs';
import {
  resolveFuturesContracts,
  applyFuturesTickSlippage,
  futuresPnl,
  futuresCommissionRoundTrip,
  priceMovePercent,
} from '../futuresExecution';
import { computeRLadderAggregate } from '../rLadderAnalysis';
import type { AutoPosition } from '../signalToPosition';
import { LevelBank } from './LevelBank';
import { EventBank } from './EventBank';
import { IndicatorBank } from './IndicatorBank';
import { TimeframeSet } from './TimeframeSet';
import { alignCompareSeries } from './SmtBank';
import {
  compileStrategy,
  strategyNeedsIndicatorsForTf,
  smtTfsUsed,
  type CompiledPhase,
  type CompiledStrategy,
  type ConditionBanks,
  type IndicatorBankLike,
  type MtfContext,
  type RuntimeState,
  type SmtCompareBank,
  type SmtContext,
} from './ConditionCompiler';
import { buildSignalV2, type TradeSignalV2 } from './SignalBuilderV2';
import { mirrorStrategyV2 } from './mirrorStrategy';
import { validateStrategyStructure, type AnchorKind, type StrategyDefinitionV2, type TF } from './types';

// ----------------------------------------------------------------------------
// Narrow structural views of the reused engines — same pattern as v1's
// AutoBacktestEngine.ts (avoids depending on their unresolved `'../../types'`
// Position import).
// ----------------------------------------------------------------------------

interface ExecResult {
  executed: boolean;
  price: number;
  pnl: number;
  pnlPercent: number;
  reason: 'stop_loss' | 'take_profit' | 'manual';
}

interface OrderEngineView {
  checkStopLoss(position: AutoPosition, candle: Candle): ExecResult | null;
  checkTakeProfit(position: AutoPosition, candle: Candle): ExecResult | null;
  calculateRealizedPnL(position: AutoPosition, exitPrice: number): { pnl: number; pnlPercent: number };
  calculatePositionSize(balance: number, entryPrice: number, stopLoss: number, riskPercent: number): number;
  getExecutionPrice(
    candle: Candle,
    orderType: 'market' | 'limit',
    limitPrice?: number,
    direction?: 'buy' | 'sell',
  ): number | null;
  applySlippage(price: number, slippagePercent: number, direction: 'buy' | 'sell'): number;
  calculateCommission(price: number, size: number, commissionRate: number): number;
}

interface StatsEngineView {
  calculate(closedPositions: AutoPosition[], initialBalance: number, currentBalance: number): BacktestStatisticsLike;
}

export interface RunStrategyV2Options {
  onProgress?: (scanned: number, total: number, found: number) => void;
  /**
   * Compare-symbol candle series for `Condition{kind:'smt'}` conditions
   * (Increment 4a — SMT divergence), keyed by symbol then by timeframe:
   * `compareSeriesBySymbolTf[compareSymbol][tf]`. Required (per timeframe an
   * `smt` condition references — see `smtTfsUsed`) whenever `def.
   * compareSymbols` is non-empty AND the definition contains an `smt`
   * condition; omitted (or `undefined`) for every strategy without one — no
   * compare-symbol `LevelBank`, no alignment array, zero overhead. Keyed by
   * symbol (rather than a bare per-TF map) so a future increment can raise
   * `MAX_COMPARE_SYMBOLS` above 1 without another shape change.
   */
  compareSeriesBySymbolTf?: Partial<Record<string, Partial<Record<TF, Candle[]>>>>;
}

// ----------------------------------------------------------------------------
// Local position shape — AutoPosition plus v2-only partials/time-stop
// bookkeeping. Structurally assignable to AutoPosition (the extra fields are
// simply extra own properties), so `closed: AutoPositionV2[]` satisfies
// `AutoBacktestResult.trades: AutoPosition[]` without any cast.
// ----------------------------------------------------------------------------

interface OpenPositionV2 extends AutoPosition {
  /** Size at fill time, BEFORE any partials reduced it. Partial legs' sizePct
   *  is a percentage of THIS, never of the (shrinking) remaining size. */
  originalSize: number;
  /** Bar index the position was filled on (for timeStopBars). */
  entryBarIndex: number;
  /** |entryPrice - initial stopLoss|, fixed at fill time (partials/BE/
   *  trailing never change this — it is the basis for R-multiple math). */
  initialRisk: number;
  /** Indices into `exits.partials` already triggered (never re-fires). */
  partialsTriggered: Set<number>;
  /** Net P&L already realized by triggered partial legs, accumulated until
   *  the position fully closes (then folded into `realizedPnl`). */
  realizedFromPartials: number;
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

/** Throws with a consistent, actionable message if `def` fails structural
 *  validation — shared by the public `runStrategyV2` wrapper (validates the
 *  ORIGINAL definition before mirroring) and `runStrategyV2Single` (validates
 *  whichever definition it was actually handed — the original, or the
 *  mirrored variant, doubling as a correctness safety net on the mirror
 *  transform itself). */
function assertStructurallyValid(def: StrategyDefinitionV2): void {
  const structuralErrors = validateStrategyStructure(def);
  if (structuralErrors.length > 0) {
    throw new Error(
      `runStrategyV2: StrategyDefinitionV2 "${def.id}" failed structural validation: ` +
        structuralErrors.join('; '),
    );
  }
}

/**
 * Public entry point. Delegates to `runStrategyV2Single` for every strategy
 * without `mirror: true` (byte-identical to every earlier increment); see
 * this module's "MIRROR" doc above for the `mirror: true` split-run + merge
 * path.
 */
export async function runStrategyV2(
  def: StrategyDefinitionV2,
  candlesInput: Candle[] | Partial<Record<TF, Candle[]>>,
  opts: RunStrategyV2Options = {},
): Promise<AutoBacktestResult> {
  if (!def.mirror) {
    return runStrategyV2Single(def, candlesInput, opts);
  }

  assertStructurallyValid(def);
  const mirrored = mirrorStrategyV2(def);

  const seriesByTfForMirror: Partial<Record<TF, Candle[]>> = Array.isArray(candlesInput)
    ? { [def.timeframes.execution]: candlesInput }
    : candlesInput;
  const executionCandles = seriesByTfForMirror[def.timeframes.execution];
  if (!executionCandles || executionCandles.length === 0) {
    throw new Error(
      `runStrategyV2: no (non-empty) candle series supplied for the execution timeframe ` +
        `"${def.timeframes.execution}".`,
    );
  }
  const n = executionCandles.length;

  const primaryResult = await runStrategyV2Single(def, candlesInput, {
    ...opts,
    onProgress: opts.onProgress
      ? (scanned: number, _total: number, found: number) => opts.onProgress!(scanned, n * 2, found)
      : undefined,
  });
  const foundOffset = primaryResult.trades.length;
  const mirroredResult = await runStrategyV2Single(mirrored, candlesInput, {
    ...opts,
    onProgress: opts.onProgress
      ? (scanned: number, _total: number, found: number) =>
          opts.onProgress!(n + scanned, n * 2, foundOffset + found)
      : undefined,
  });

  return mergeStrategyResults(primaryResult, mirroredResult, executionCandles, def.risk.initialBalance);
}

/**
 * Single-direction, single-pass engine run — the ENTIRE Increment 1-4
 * implementation, unchanged, plus Increment 5's flatAt/exitWhen additions
 * (see module doc). Renamed from the old `runStrategyV2` (Increment 5) so
 * the public `runStrategyV2` above can wrap it for the mirror split-run.
 */
async function runStrategyV2Single(
  def: StrategyDefinitionV2,
  /**
   * Legacy (Increment 1/2) shape: a plain execution-timeframe candle array —
   * unchanged, byte-identical behavior for every single-timeframe strategy.
   * Increment 3 (MTF) shape: a map of candle series keyed by timeframe
   * label, MUST include an entry for `def.timeframes.execution` plus one
   * entry per timeframe named in `def.timeframes.context` that at least one
   * phase actually references (see `contextTfsUsed` below).
   */
  candlesInput: Candle[] | Partial<Record<TF, Candle[]>>,
  opts: RunStrategyV2Options = {},
): Promise<AutoBacktestResult> {
  assertStructurallyValid(def);

  // Normalize the legacy array shape into the { [execTf]: candles } map
  // shape — one code path below regardless of which shape the caller used.
  const seriesByTf: Partial<Record<TF, Candle[]>> = Array.isArray(candlesInput)
    ? { [def.timeframes.execution]: candlesInput }
    : candlesInput;

  const candles = seriesByTf[def.timeframes.execution];
  if (!candles || candles.length === 0) {
    throw new Error(
      `runStrategyV2: no (non-empty) candle series supplied for the execution timeframe ` +
        `"${def.timeframes.execution}".`,
    );
  }

  const timezone = def.filters.session?.timezone ?? 'UTC';
  const levels = new LevelBank(candles, { timezone });
  const events = new EventBank(candles, {});
  const indicators = await maybeLoadIndicatorBank(def, candles, timezone, def.timeframes.execution);

  // ---------------------------------------------------------------------
  // MTF wiring (Increment 3) — built ONLY when at least one phase declares
  // a context timeframe. Zero overhead for every single-timeframe strategy
  // (no TimeframeSet, no extra banks, `mtf` stays `undefined` and
  // `compileStrategy`/`captureAnchors` take their Increment 1/2 codepaths).
  // ---------------------------------------------------------------------
  const contextTfsUsed = Array.from(
    new Set(
      def.phases
        .map((p) => p.timeframe)
        .filter((tf): tf is TF => tf !== undefined && tf !== def.timeframes.execution),
    ),
  );

  let mtf: MtfContext | undefined;
  if (contextTfsUsed.length > 0) {
    const contextSeries: Partial<Record<TF, Candle[]>> = { [def.timeframes.execution]: candles };
    for (const tf of contextTfsUsed) {
      const s = seriesByTf[tf];
      if (!s || s.length === 0) {
        throw new Error(
          `runStrategyV2: strategy "${def.id}" has a phase declaring context timeframe "${tf}" ` +
            'but no candle series was supplied for it.',
        );
      }
      contextSeries[tf] = s;
    }
    const timeframeSet = new TimeframeSet(contextSeries, def.timeframes.execution);

    const banksByTf = new Map<TF, ConditionBanks>();
    for (const tf of contextTfsUsed) {
      const tfCandles = timeframeSet.series(tf);
      const tfLevels = new LevelBank(tfCandles, { timezone });
      const tfEvents = new EventBank(tfCandles, {});
      const tfIndicators = await maybeLoadIndicatorBank(def, tfCandles, timezone, tf);
      banksByTf.set(tf, { levels: tfLevels, events: tfEvents, indicators: tfIndicators });
    }
    mtf = { timeframeSet, banksByTf };
  }

  // ---------------------------------------------------------------------
  // SMT divergence wiring (Increment 4a) — built ONLY when at least one
  // phase's condition tree contains an `smt` leaf. Zero overhead for every
  // strategy without one (no compare-symbol LevelBank, no alignment array,
  // `smtCtx` stays `undefined` and `compileStrategy`'s Increment 1-3
  // codepaths are unaffected).
  // ---------------------------------------------------------------------
  const smtTfs = smtTfsUsed(def);
  let smtCtx: SmtContext | undefined;
  if (smtTfs.length > 0) {
    const compareSymbol = def.compareSymbols?.[0];
    if (!compareSymbol) {
      // validateStrategyStructure (called above) already rejects an `smt`
      // condition with an empty compareSymbols — this is a defensive
      // safety net, never expected to actually trigger.
      throw new Error(
        `runStrategyV2: strategy "${def.id}" has an 'smt' condition but declares no compareSymbols.`,
      );
    }
    const compareBySymbol = opts.compareSeriesBySymbolTf?.[compareSymbol];
    const banksByTf = new Map<TF, SmtCompareBank>();
    for (const tf of smtTfs) {
      const tradedTfCandles = tf === def.timeframes.execution ? candles : mtf!.timeframeSet.series(tf);
      const compareCandles = compareBySymbol?.[tf];
      if (!compareCandles || compareCandles.length === 0) {
        throw new Error(
          `runStrategyV2: strategy "${def.id}" has an 'smt' condition on timeframe "${tf}" ` +
            `referencing compareSymbol "${compareSymbol}" but no compare candle series was supplied ` +
            `for it (opts.compareSeriesBySymbolTf["${compareSymbol}"]["${tf}"]).`,
        );
      }
      const compareLevels = new LevelBank(compareCandles, { timezone });
      const alignment = alignCompareSeries(tradedTfCandles, compareCandles);
      banksByTf.set(tf, { candles: compareCandles, levels: compareLevels, alignment });
    }
    smtCtx = { banksByTf };
  }

  const compiled = compileStrategy(def, candles, { levels, events, indicators }, mtf, smtCtx);

  // Reused verbatim from v1: ATR (trailing 'atr' mode), confirmed-swing
  // helpers (trailing 'swing' mode + the 'counterSwing' anchor), and
  // session gating (computeSessionAllowed). v2 does not reimplement any of
  // these — same causal discipline as every v1 run.
  const mctx = MarketContext.build(candles, {
    swingLookback: 2,
    atrPeriod: 14,
    session: def.filters.session,
  });

  const orderEngine = new OrderExecutionEngine() as unknown as OrderEngineView;
  const statsEngine = new StatisticsEngine() as unknown as StatsEngineView;

  const contractSpec = getContractSpec(def.instrument.symbol);
  const sizingMode = def.risk.sizingMode ?? 'risk-pct';
  const commissionPerContract = def.risk.commissionPerContract ?? contractSpec?.defaultCommissionPerSide ?? 0;
  const slippageTicks = def.risk.slippageTicks;
  const commissionPct = def.risk.commissionPct ?? 0;
  const slippagePct = def.risk.slippagePct ?? 0;
  const sizeEpsilon = contractSpec ? 0.5 : 1e-9;

  const engineCtx: EngineCtx = {
    def,
    candles,
    orderEngine,
    contractSpec,
    commissionPerContract,
    slippageTicks,
    commissionPct,
    slippagePct,
    mctx,
  };

  let balance = def.risk.initialBalance;
  const closed: OpenPositionV2[] = [];
  let open: OpenPositionV2 | null = null;
  let pending: TradeSignalV2 | null = null;

  // Diagnostic counters (AutoBacktestResult.skippedSignals) — see that
  // field's doc comment in AutoBacktestEngine.ts. `zeroSize` counts a
  // signal that expired (never filled) having been rejected on sizing
  // grounds at least once; `expired` counts every pending signal that ran
  // out its validForBars window without ever being considered fillable
  // (price never touched it, or every touch was gated off by session/
  // maxTradesPerDay/dailyLossStop).
  let skippedZeroSize = 0;
  let skippedExpired = 0;
  let pendingSawZeroSize = false;

  // Phase state machine (single live SetupInstance).
  let phaseIdx = 0;
  let runtimeState: RuntimeState = { anchors: new Map(), scratch: new Map() };
  let phaseStartBar = 0;
  let candidateDirection: 'long' | 'short' | null = null;

  const resetAttempt = (atBar: number): void => {
    phaseIdx = 0;
    runtimeState = { anchors: new Map(), scratch: new Map() };
    phaseStartBar = atBar;
    candidateDirection = null;
  };

  // Day-scoped counters: maxTradesPerDay + the NEW dailyLossStopPct filter.
  // "Day" boundary uses the session filter's timezone when enabled, else
  // UTC — same convention v1 uses for its own maxTradesPerDay counter.
  const dayTimezone = def.filters.session?.enabled ? def.filters.session.timezone : 'UTC';
  const maxTradesPerDay = def.filters.maxTradesPerDay;
  const dailyLossStopPct = def.filters.dailyLossStopPct;
  let currentDayKey: string | null = null;
  let tradesOpenedToday = 0;
  let dayRealizedPnl = 0;
  let dailyLossStopHit = false;

  // flatAt (Increment 5 — clock-time flat exit). `flatTimezone` mirrors the
  // dayTimezone convention above but defaults to America/New_York (rather
  // than UTC) when no session filter is configured — "flat by 4pm" without
  // an explicit timezone is universally meant in ET for US futures/equities.
  const flatAtMinutes = def.exits.flatAt !== undefined ? hhmmToMinutes(def.exits.flatAt) : undefined;
  const flatTimezone = def.filters.session?.timezone ?? 'America/New_York';
  const isFlatTime = (candle: Candle): boolean =>
    flatAtMinutes !== undefined && localMinutesAndDay(candleTimeMs(candle), flatTimezone).minutes >= flatAtMinutes;

  // exitWhen (Increment 5 — condition-based exit). Evaluated against a
  // FRESH, per-position RuntimeState — see ExitRuleV2.exitWhen's
  // LIMITATION doc (the entry attempt's captured anchors are already gone
  // by the time a position is open). Reset on every fill, below.
  let exitWhenState: RuntimeState = { anchors: new Map(), scratch: new Map() };

  const advancePhase = (i: number): void => {
    const phase = compiled.phases[phaseIdx];

    if (phase.invalidateIf && phase.invalidateIf.test(i, runtimeState)) {
      resetAttempt(i);
      return;
    }
    if (phase.withinBars !== undefined && i - phaseStartBar > phase.withinBars) {
      resetAttempt(i);
      return;
    }
    if (!phase.when.test(i, runtimeState)) return;

    const resolved =
      phase.when.resolveDirection(i, runtimeState) ??
      candidateDirection ??
      (def.direction !== 'both' ? def.direction : null);
    if (resolved === null) {
      // 'both' strategy whose firing phase carries no direction-coded leaf
      // anywhere yet, and no earlier phase resolved one either — the trade
      // direction is fundamentally undecidable. Abandon this attempt rather
      // than guess.
      resetAttempt(i);
      return;
    }
    if (candidateDirection === null) candidateDirection = resolved;

    captureAnchors(phase, i, candidateDirection, runtimeState, mctx, candles, def.timeframes.execution, mtf?.timeframeSet);

    if (phaseIdx === compiled.phases.length - 1) {
      const signal = buildSignalV2(compiled, candles, i, runtimeState, candidateDirection, mctx.atr);
      if (signal) {
        pending = signal;
        pendingSawZeroSize = false;
      }
      resetAttempt(i + 1);
    } else {
      phaseIdx += 1;
      phaseStartBar = i;
    }
  };

  const n = candles.length;
  const PROGRESS_EVERY = 500;

  for (let i = 0; i < n; i++) {
    const candle = candles[i];

    const dayKey = localDayKey(candleTimeMs(candle), dayTimezone);
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      tradesOpenedToday = 0;
      dayRealizedPnl = 0;
      dailyLossStopHit = false;
    }

    // (a) Manage the open position.
    if (open) {
      managePartials(open, candle, engineCtx);

      if (open.size <= sizeEpsilon) {
        finalizePartialExhaustion(open, candle);
        balance += open.realizedPnl ?? 0;
        dayRealizedPnl += open.realizedPnl ?? 0;
        closed.push(open);
        open = null;
      } else {
        applyTrailing(open, candle, i, engineCtx);

        if (isFlatTime(candle)) {
          finalizeForceClose(open, candle, engineCtx, 'flat_time');
          balance += open.realizedPnl ?? 0;
          dayRealizedPnl += open.realizedPnl ?? 0;
          closed.push(open);
          open = null;
        } else if (compiled.exitWhen && compiled.exitWhen.test(i, exitWhenState)) {
          finalizeForceClose(open, candle, engineCtx, 'condition');
          balance += open.realizedPnl ?? 0;
          dayRealizedPnl += open.realizedPnl ?? 0;
          closed.push(open);
          open = null;
        } else if (checkTimeStop(open, i, def.exits.timeStopBars)) {
          finalizeForceClose(open, candle, engineCtx, 'manual');
          balance += open.realizedPnl ?? 0;
          dayRealizedPnl += open.realizedPnl ?? 0;
          closed.push(open);
          open = null;
        } else {
          const sl = orderEngine.checkStopLoss(open, candle);
          const tp = sl ? null : orderEngine.checkTakeProfit(open, candle);
          const hit = sl ?? tp;
          if (hit) {
            finalizeHit(open, candle, hit, engineCtx);
            balance += open.realizedPnl ?? 0;
            dayRealizedPnl += open.realizedPnl ?? 0;
            closed.push(open);
            open = null;
          }
        }
      }

      if (
        dailyLossStopPct !== undefined &&
        dayRealizedPnl <= -(Math.abs(dailyLossStopPct) / 100) * def.risk.initialBalance
      ) {
        dailyLossStopHit = true;
      }
    }

    // (b) Attempt to fill the pending signal.
    if (pending && !open) {
      if (isFlatTime(candle)) {
        // flatAt (Increment 5): never fill into a post-flat window — cancel
        // outright, same accounting as a validForBars expiry (it never
        // became a trade).
        if (pendingSawZeroSize) skippedZeroSize += 1;
        else skippedExpired += 1;
        pending = null;
      } else if (i - pending.armIndex > pending.validForBars) {
        // Unfillable within its window — expires and unblocks the machine
        // (see StrategyEngine.ts module doc: the machine only ever pauses
        // while `pending` is set, so clearing it here is what lets phase 0
        // start evaluating again on THIS SAME bar, in step (c) below).
        if (pendingSawZeroSize) skippedZeroSize += 1;
        else skippedExpired += 1;
        pending = null;
      } else {
        const canConsider =
          i >= pending.armIndex &&
          mctx.sessionAllowed[i] &&
          !dailyLossStopHit &&
          (maxTradesPerDay === undefined || tradesOpenedToday < maxTradesPerDay);

        if (canConsider) {
          const attempt = attemptFill(pending, candle, i, balance, sizingMode, engineCtx);
          if (attempt.kind === 'filled') {
            open = attempt.position;
            tradesOpenedToday += 1;
            pending = null;
            // exitWhen (Increment 5): fresh state per position — the phase
            // attempt's own runtimeState was already reset when the signal
            // was built (see advancePhase), so this is a SEPARATE state
            // object, not a reuse of it.
            exitWhenState = { anchors: new Map(), scratch: new Map() };
          } else if (attempt.kind === 'zero-size') {
            // Sizing rejected this bar (e.g. stop too wide for the risk
            // budget) — keep the signal pending, it may still fill on a
            // later, tighter bar within validForBars. Remembered for the
            // skippedSignals.zeroSize diagnostic if it never does.
            pendingSawZeroSize = true;
          }
          // 'no-touch': price condition not met this bar — no state change.
        }
      }
    }

    // (c) Advance the phase state machine — paused while a position is open
    // or a signal is pending (see module doc).
    if (!open && !pending) {
      advancePhase(i);
    }

    if (opts.onProgress && (i % PROGRESS_EVERY === 0 || i === n - 1)) {
      opts.onProgress(i + 1, n, closed.length + (open ? 1 : 0));
    }
  }

  const statistics = statsEngine.calculate(closed, def.risk.initialBalance, balance);
  const rMultipleDistribution = computeRDistributionV2(closed);
  const { perR, perTrade } = computeRLadderAggregate(closed, candles, R_LADDER_LEVELS);
  closed.forEach((trade, idx) => {
    trade.rLadder = perTrade[idx];
  });

  return {
    // v2 has no independent, precomputed detection list (signals emerge
    // from the live phase state machine, not from a scan) — empty for
    // AutoBacktestResult shape-compatibility with the v1-consuming UI.
    detections: [],
    trades: closed,
    statistics,
    equityCurve: statistics.equityCurve ?? [],
    rMultipleDistribution,
    rLadder: { perR },
    skippedSignals: { zeroSize: skippedZeroSize, expired: skippedExpired },
  };
}

// ----------------------------------------------------------------------------
// Lazy IndicatorBank load
// ----------------------------------------------------------------------------

/**
 * Construct an IndicatorBank ONLY when the strategy actually references an
 * `Operand{src:'indicator'}` leaf — indicator series precompute lazily inside
 * the bank, so strategies without indicators pay nothing.
 *
 * NOTE: this MUST be a static import. A dynamic `import('./IndicatorBank')`
 * here forces code-splitting inside the Web Worker bundle, and Vite builds
 * workers as IIFE — Rollup then fails the whole production build with
 * "UMD and IIFE output formats are not supported for code-splitting builds"
 * (observed on the Cloudflare Pages build of this branch, 2026-07-17).
 */
async function maybeLoadIndicatorBank(
  def: StrategyDefinitionV2,
  candles: Candle[],
  timezone: string,
  /** Which timeframe `candles` belongs to — Increment 3 (MTF): only phases
   *  whose EFFECTIVE timeframe equals `tf` are scanned for indicator refs,
   *  so each timeframe's IndicatorBank is built independently and only when
   *  actually needed for THAT timeframe. */
  tf: TF,
): Promise<IndicatorBankLike | undefined> {
  if (!strategyNeedsIndicatorsForTf(def, tf)) return undefined;
  return new IndicatorBank(candles, { timezone });
}

// ----------------------------------------------------------------------------
// Anchor capture
// ----------------------------------------------------------------------------

function captureAnchors(
  phase: CompiledPhase,
  i: number,
  dir: 'long' | 'short',
  state: RuntimeState,
  mctx: MarketContext,
  candles: Candle[],
  executionTf: TF,
  /** Present only when the strategy has at least one context-TF phase
   *  (Increment 3 — MTF); `undefined` for every single-timeframe run. */
  timeframeSet: TimeframeSet | undefined,
): void {
  if (phase.capture.length === 0) return;

  // Price-based anchors (triggerPrice/triggerBarHigh/triggerBarLow/
  // wickExtreme) read the candle THIS PHASE actually fired on: the
  // execution candle when the phase runs on the execution timeframe, or
  // the phase's own context-TF candle (via TimeframeSet.alignedIndex)
  // otherwise. counterSwing intentionally ALWAYS uses the EXECUTION
  // MarketContext's confirmed-swing timeline regardless of phase.timeframe
  // — a deliberate simplification (documented in StrategyEngine.ts's module
  // doc): stop/target management happens at execution granularity, so the
  // "nearest confirmed swing against the trade direction" is most useful
  // measured on the SAME series the trade will actually be managed on.
  let candle: Candle;
  if (phase.timeframe === executionTf || !timeframeSet) {
    candle = candles[i];
  } else {
    const j = timeframeSet.alignedIndex(phase.timeframe, i);
    // `j` is guaranteed >= 0 here: this function only runs after
    // `phase.when.test(i, state)` returned true, and a context-TF
    // condition's wrapped `test` already returns false whenever `j === -1`
    // (see ConditionCompiler.ts's `wrapContextCondition`). The fallback
    // below is defensive only — it should never actually be reached.
    candle = j >= 0 ? timeframeSet.series(phase.timeframe)[j] : candles[i];
  }
  const values: Partial<Record<AnchorKind, number>> = state.anchors.get(phase.id) ?? {};

  for (const kind of phase.capture) {
    switch (kind) {
      case 'triggerPrice':
        values.triggerPrice = candle.close;
        break;
      case 'triggerBarHigh':
        values.triggerBarHigh = candle.high;
        break;
      case 'triggerBarLow':
        values.triggerBarLow = candle.low;
        break;
      case 'wickExtreme':
        // Short side cares about the upper wick (high); long about the
        // lower wick (low) — see module doc.
        values.wickExtreme = dir === 'short' ? candle.high : candle.low;
        break;
      case 'eventLevel': {
        const lvl = phase.when.resolveEventLevel(i, state);
        values.eventLevel = lvl !== null ? lvl : candle.close;
        break;
      }
      case 'counterSwing': {
        const swing = dir === 'long' ? mctx.lastConfirmedSwingLow(i) : mctx.lastConfirmedSwingHigh(i);
        if (swing) values.counterSwing = swing.price;
        break;
      }
      /* istanbul ignore next -- exhaustiveness guard */
      default: {
        const _exhaustive: never = kind;
        throw new Error(`captureAnchors: unknown AnchorKind ${JSON.stringify(_exhaustive)}`);
      }
    }
  }
  state.anchors.set(phase.id, values);
}

// ----------------------------------------------------------------------------
// Fill
// ----------------------------------------------------------------------------

interface EngineCtx {
  def: StrategyDefinitionV2;
  candles: Candle[];
  orderEngine: OrderEngineView;
  contractSpec: ContractSpec | null;
  commissionPerContract: number;
  slippageTicks: number | undefined;
  commissionPct: number;
  slippagePct: number;
  mctx: MarketContext;
}

/** Outcome of one bar's fill attempt against a pending signal — see
 *  `StrategyEngine.ts`'s `skippedSignals` counters for why this is tagged
 *  rather than a bare nullable return. */
type AttemptFillResult =
  | { kind: 'filled'; position: OpenPositionV2 }
  | { kind: 'zero-size' }
  | { kind: 'no-touch' };

function attemptFill(
  pending: TradeSignalV2,
  candle: Candle,
  i: number,
  balance: number,
  sizingMode: 'risk-pct' | 'fixed-contracts',
  ctx: EngineCtx,
): AttemptFillResult {
  const side: 'buy' | 'sell' = pending.direction === 'long' ? 'buy' : 'sell';
  const fill = ctx.orderEngine.getExecutionPrice(candle, pending.orderType, pending.entryPrice, side);
  if (fill === null) return { kind: 'no-touch' };

  let fillPrice: number;
  let size: number;

  if (ctx.contractSpec) {
    fillPrice = ctx.slippageTicks
      ? applyFuturesTickSlippage(fill, ctx.contractSpec.tickSize, ctx.slippageTicks, side)
      : fill;
    const stopDistancePoints = Math.abs(fillPrice - pending.stopLoss);
    const sizing = resolveFuturesContracts({
      sizingMode,
      riskPerTradePct: ctx.def.risk.riskPerTradePct,
      balance,
      contractsConfig: ctx.def.risk.contracts,
      stopDistancePoints,
      pointValue: ctx.contractSpec.pointValue,
    });
    if (!sizing) return { kind: 'zero-size' };
    size = sizing.contracts;
  } else {
    fillPrice = ctx.slippagePct > 0 ? ctx.orderEngine.applySlippage(fill, ctx.slippagePct, side) : fill;
    size = ctx.orderEngine.calculatePositionSize(balance, fillPrice, pending.stopLoss, ctx.def.risk.riskPerTradePct);
  }
  if (size <= 0) return { kind: 'zero-size' };

  const entryTime = Math.floor(candleTimeMs(candle) / 1000);
  const risk = Math.abs(fillPrice - pending.stopLoss);
  const reward = Math.abs(pending.takeProfit - fillPrice);
  const pointValue = ctx.contractSpec?.pointValue ?? 1;

  const position: OpenPositionV2 = {
    symbol: ctx.def.instrument.symbol,
    type: pending.direction,
    entryPrice: fillPrice,
    size,
    stopLoss: pending.stopLoss,
    takeProfit: pending.takeProfit,
    entryTime,
    status: 'open',
    riskRewardRatio: risk > 0 ? reward / risk : 0,
    riskAmount: risk * size * pointValue,
    originalSize: size,
    entryBarIndex: i,
    initialRisk: risk,
    partialsTriggered: new Set<number>(),
    realizedFromPartials: 0,
  };
  return { kind: 'filled', position };
}

// ----------------------------------------------------------------------------
// Position management: partials / trailing / time-stop / close
// ----------------------------------------------------------------------------

/**
 * Scale out configured partial legs. Each leg's `sizePct` is a percentage of
 * the position's ORIGINAL (fill-time) size, never the shrinking remainder —
 * so a 50%+50% plan always fully exits (not 50% then 50%-of-50%). Futures
 * leg sizes are rounded to the nearest WHOLE contract (documented rounding
 * choice); a leg that rounds to 0 contracts is marked triggered (consumed)
 * but realizes no P&L — a whole-contract position too small to split.
 */
function managePartials(position: OpenPositionV2, candle: Candle, ctx: EngineCtx): void {
  const partials = ctx.def.exits.partials;
  if (!partials || partials.length === 0) return;
  const isLong = position.type === 'long';
  const pointValue = ctx.contractSpec?.pointValue ?? 1;

  partials.forEach((leg, legIdx) => {
    if (position.partialsTriggered.has(legIdx)) return;

    const targetPrice = isLong
      ? position.entryPrice + leg.atR * position.initialRisk
      : position.entryPrice - leg.atR * position.initialRisk;
    const reached = isLong ? candle.high >= targetPrice : candle.low <= targetPrice;
    if (!reached) return;

    let legSize = ctx.contractSpec
      ? Math.round(position.originalSize * (leg.sizePct / 100))
      : position.originalSize * (leg.sizePct / 100);
    legSize = Math.min(legSize, position.size);

    position.partialsTriggered.add(legIdx);
    if (legSize > 0) {
      const grossPnl = ctx.contractSpec
        ? futuresPnl(position.entryPrice, targetPrice, pointValue, legSize, isLong)
        : (isLong ? targetPrice - position.entryPrice : position.entryPrice - targetPrice) * legSize;
      const commission = ctx.contractSpec
        ? ctx.commissionPerContract > 0
          ? futuresCommissionRoundTrip(ctx.commissionPerContract, legSize)
          : 0
        : ctx.commissionPct > 0
          ? ctx.orderEngine.calculateCommission(targetPrice, legSize, ctx.commissionPct) +
            ctx.orderEngine.calculateCommission(position.entryPrice, legSize, ctx.commissionPct)
          : 0;

      position.realizedFromPartials += grossPnl - commission;
      position.size -= legSize;
    }

    if (leg.moveStopToBE) {
      const be = position.entryPrice;
      position.stopLoss = isLong ? Math.max(position.stopLoss, be) : Math.min(position.stopLoss, be);
    }
  });
}

/**
 * Trailing-stop update. Only ever TIGHTENS the stop (moves it further in the
 * position's favor) — never loosens it, regardless of mode.
 *   - 'atr'   : close -/+ value*ATR(i) (ATR reused from v1 MarketContext).
 *   - 'swing' : nearest confirmed swing AGAINST direction, as of bar i.
 *   - 'rStep' : once price has reached k*initialRisk (using the bar's
 *               favorable extreme — high for long, low for short — same
 *               intrabar-touch convention as partials), ratchet the stop to
 *               entry + (k-1)*initialRisk. `value` is unused for this mode.
 */
function applyTrailing(position: OpenPositionV2, candle: Candle, i: number, ctx: EngineCtx): void {
  const trailing = ctx.def.exits.trailing;
  if (!trailing) return;
  const isLong = position.type === 'long';
  let candidate: number | null = null;

  switch (trailing.mode) {
    case 'atr': {
      const a = ctx.mctx.atr[i] || 0;
      const mult = trailing.value ?? 1.5;
      if (a > 0) candidate = isLong ? candle.close - mult * a : candle.close + mult * a;
      break;
    }
    case 'swing': {
      const swing = isLong ? ctx.mctx.lastConfirmedSwingLow(i) : ctx.mctx.lastConfirmedSwingHigh(i);
      if (swing) candidate = swing.price;
      break;
    }
    case 'rStep': {
      if (position.initialRisk > 0) {
        const favorable = isLong ? candle.high : candle.low;
        const moveR = isLong
          ? (favorable - position.entryPrice) / position.initialRisk
          : (position.entryPrice - favorable) / position.initialRisk;
        const k = Math.floor(moveR);
        if (k >= 1) {
          candidate = isLong
            ? position.entryPrice + (k - 1) * position.initialRisk
            : position.entryPrice - (k - 1) * position.initialRisk;
        }
      }
      break;
    }
    /* istanbul ignore next -- exhaustiveness guard */
    default: {
      const _exhaustive: never = trailing.mode;
      throw new Error(`applyTrailing: unknown trailing mode ${JSON.stringify(_exhaustive)}`);
    }
  }

  if (candidate === null) return;
  position.stopLoss = isLong ? Math.max(position.stopLoss, candidate) : Math.min(position.stopLoss, candidate);
}

function checkTimeStop(position: OpenPositionV2, i: number, timeStopBars: number | undefined): boolean {
  if (timeStopBars === undefined) return false;
  return i - position.entryBarIndex >= timeStopBars;
}

/** SL/TP hit on the REMAINING size (after any partials already realized). */
function finalizeHit(position: OpenPositionV2, candle: Candle, hit: ExecResult, ctx: EngineCtx): void {
  const isLong = position.type === 'long';
  let exitPrice: number;
  let legNetPnl: number;
  let pnlPercent: number;

  if (ctx.contractSpec) {
    const closingSide: 'buy' | 'sell' = isLong ? 'sell' : 'buy';
    exitPrice = ctx.slippageTicks
      ? applyFuturesTickSlippage(hit.price, ctx.contractSpec.tickSize, ctx.slippageTicks, closingSide)
      : hit.price;
    const grossPnl = futuresPnl(position.entryPrice, exitPrice, ctx.contractSpec.pointValue, position.size, isLong);
    const commission =
      ctx.commissionPerContract > 0 ? futuresCommissionRoundTrip(ctx.commissionPerContract, position.size) : 0;
    legNetPnl = grossPnl - commission;
    pnlPercent = priceMovePercent(position.entryPrice, exitPrice, isLong);
  } else {
    exitPrice =
      ctx.slippagePct > 0 ? ctx.orderEngine.applySlippage(hit.price, ctx.slippagePct, isLong ? 'sell' : 'buy') : hit.price;
    const pnlResult = ctx.orderEngine.calculateRealizedPnL(position, exitPrice);
    const commission =
      ctx.commissionPct > 0
        ? ctx.orderEngine.calculateCommission(exitPrice, position.size, ctx.commissionPct) +
          ctx.orderEngine.calculateCommission(position.entryPrice, position.size, ctx.commissionPct)
        : 0;
    legNetPnl = pnlResult.pnl - commission;
    pnlPercent = pnlResult.pnlPercent;
  }

  position.exitPrice = exitPrice;
  position.exitTime = Math.floor(candleTimeMs(candle) / 1000);
  position.exitReason = hit.reason;
  position.realizedPnl = position.realizedFromPartials + legNetPnl;
  position.realizedPnlPercent = pnlPercent;
  position.status = 'closed';
}

/**
 * Force-close at the CLOSE of the current bar, tagged with `exitReason`.
 * Shared by three "force close at bar's close" mechanisms (Increment 5
 * renamed this from the Increment 1-4 `finalizeTimeStop`, which only ever
 * used `'manual'` — that call site is unchanged):
 *  - `'manual'`   : `timeStopBars` reached (pre-existing, Increment 1-4).
 *  - `'flat_time'`: `exits.flatAt` clock-time reached (Increment 5).
 *  - `'condition'`: `exits.exitWhen` fired (Increment 5).
 */
function finalizeForceClose(
  position: OpenPositionV2,
  candle: Candle,
  ctx: EngineCtx,
  exitReason: 'manual' | 'flat_time' | 'condition',
): void {
  const isLong = position.type === 'long';
  const exitPrice = candle.close;
  let legNetPnl: number;
  let pnlPercent: number;

  if (ctx.contractSpec) {
    const grossPnl = futuresPnl(position.entryPrice, exitPrice, ctx.contractSpec.pointValue, position.size, isLong);
    const commission =
      ctx.commissionPerContract > 0 ? futuresCommissionRoundTrip(ctx.commissionPerContract, position.size) : 0;
    legNetPnl = grossPnl - commission;
    pnlPercent = priceMovePercent(position.entryPrice, exitPrice, isLong);
  } else {
    const pnlResult = ctx.orderEngine.calculateRealizedPnL(position, exitPrice);
    const commission =
      ctx.commissionPct > 0
        ? ctx.orderEngine.calculateCommission(exitPrice, position.size, ctx.commissionPct) +
          ctx.orderEngine.calculateCommission(position.entryPrice, position.size, ctx.commissionPct)
        : 0;
    legNetPnl = pnlResult.pnl - commission;
    pnlPercent = pnlResult.pnlPercent;
  }

  position.exitPrice = exitPrice;
  position.exitTime = Math.floor(candleTimeMs(candle) / 1000);
  position.exitReason = exitReason;
  position.realizedPnl = position.realizedFromPartials + legNetPnl;
  position.realizedPnlPercent = pnlPercent;
  position.status = 'closed';
}

/** Partials alone consumed the entire position (no SL/TP/time-stop touched
 *  the remainder) — wrap up using the already-accumulated partial P&L. */
function finalizePartialExhaustion(position: OpenPositionV2, candle: Candle): void {
  position.exitPrice = candle.close;
  position.exitTime = Math.floor(candleTimeMs(candle) / 1000);
  position.exitReason = 'take_profit';
  position.realizedPnl = position.realizedFromPartials;
  position.realizedPnlPercent = priceMovePercent(position.entryPrice, candle.close, position.type === 'long');
  position.status = 'closed';
}

// ----------------------------------------------------------------------------
// R-multiple distribution (identical bucketing to v1's private helper —
// duplicated since v1's is not exported; see AutoBacktestEngine.ts).
// Typed `AutoPosition[]` (rather than `OpenPositionV2[]`) so `mergeStrategyResults`
// (Increment 5 — mirror) can reuse it directly over a merged trade list that
// no longer carries the v2-only OpenPositionV2 bookkeeping fields.
// ----------------------------------------------------------------------------

function computeRDistributionV2(closed: AutoPosition[]): RMultipleDistribution {
  const dist: RMultipleDistribution = {
    '< -2R': 0,
    '-2R to -1R': 0,
    '-1R to 0R': 0,
    '0R to 1R': 0,
    '1R to 2R': 0,
    '2R to 3R': 0,
    '> 3R': 0,
  };
  for (const p of closed) {
    const pnl = p.realizedPnl ?? 0;
    const riskAmount = p.riskAmount && p.riskAmount > 0 ? p.riskAmount : null;
    if (riskAmount === null) continue;
    const r = pnl / riskAmount;
    if (r < -2) dist['< -2R']++;
    else if (r < -1) dist['-2R to -1R']++;
    else if (r < 0) dist['-1R to 0R']++;
    else if (r < 1) dist['0R to 1R']++;
    else if (r < 2) dist['1R to 2R']++;
    else if (r <= 3) dist['2R to 3R']++;
    else dist['> 3R']++;
  }
  return dist;
}

// ----------------------------------------------------------------------------
// Mirror merge (Increment 5) — see this module's doc "MIRROR" section.
// ----------------------------------------------------------------------------

/**
 * Merge the primary and mirrored `runStrategyV2Single` results into one
 * chronological `AutoBacktestResult`: trades concatenated + sorted by
 * `entryTime`, statistics/equityCurve/rMultipleDistribution/rLadder
 * recomputed over the MERGED set (using the run's real `initialBalance` —
 * both variants share the same `risk` config, mirroring never touches it),
 * `skippedSignals` summed. `detections` stays empty, same
 * shape-compatibility convention `runStrategyV2Single` itself uses.
 */
function mergeStrategyResults(
  a: AutoBacktestResult,
  b: AutoBacktestResult,
  candles: Candle[],
  initialBalance: number,
): AutoBacktestResult {
  const merged: AutoPosition[] = [...a.trades, ...b.trades].sort(
    (x, y) => x.entryTime - y.entryTime,
  );
  const totalPnl = merged.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
  const currentBalance = initialBalance + totalPnl;

  const statsEngine = new StatisticsEngine() as unknown as StatsEngineView;
  const statistics = statsEngine.calculate(merged, initialBalance, currentBalance);
  const rMultipleDistribution = computeRDistributionV2(merged);
  const { perR, perTrade } = computeRLadderAggregate(merged, candles, R_LADDER_LEVELS);
  merged.forEach((trade, idx) => {
    trade.rLadder = perTrade[idx];
  });

  return {
    detections: [],
    trades: merged,
    statistics,
    equityCurve: statistics.equityCurve ?? [],
    rMultipleDistribution,
    rLadder: { perR },
    skippedSignals: {
      zeroSize: (a.skippedSignals?.zeroSize ?? 0) + (b.skippedSignals?.zeroSize ?? 0),
      expired: (a.skippedSignals?.expired ?? 0) + (b.skippedSignals?.expired ?? 0),
    },
  };
}

export type { CompiledStrategy };
