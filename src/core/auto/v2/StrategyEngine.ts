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
// PER-BAR ORDER OF OPERATIONS (see runStrategyV2's loop)
// --------------------------------------------------------
//   (a) Manage the OPEN position, in order: partials -> BE/trailing ->
//       time-stop -> SL-before-TP fill checks (v1 gap-realism convention:
//       SL checked before TP on the same bar).
//   (b) Attempt to fill the PENDING signal (earliest fill armIndex+1,
//       validForBars expiry, session gating, maxTradesPerDay, the NEW
//       dailyLossStopPct filter).
//   (c) Advance the phase state machine — ONLY when no position is open AND
//       no signal is pending (the machine PAUSES otherwise; see module
//       doc below on why).
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
import { MarketContext, candleTimeMs, localDayKey } from '../MarketContext';
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
import {
  compileStrategy,
  strategyNeedsIndicators,
  type CompiledPhase,
  type CompiledStrategy,
  type IndicatorBankLike,
  type RuntimeState,
} from './ConditionCompiler';
import { buildSignalV2, type TradeSignalV2 } from './SignalBuilderV2';
import { validateStrategyStructure, type AnchorKind, type StrategyDefinitionV2 } from './types';

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

export async function runStrategyV2(
  def: StrategyDefinitionV2,
  candles: Candle[],
  opts: RunStrategyV2Options = {},
): Promise<AutoBacktestResult> {
  const structuralErrors = validateStrategyStructure(def);
  if (structuralErrors.length > 0) {
    throw new Error(
      `runStrategyV2: StrategyDefinitionV2 "${def.id}" failed structural validation: ` +
        structuralErrors.join('; '),
    );
  }

  const timezone = def.filters.session?.timezone ?? 'UTC';
  const levels = new LevelBank(candles, { timezone });
  const events = new EventBank(candles, {});
  const indicators = await maybeLoadIndicatorBank(def, candles, timezone);

  const compiled = compileStrategy(def, candles, { levels, events, indicators });

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

    captureAnchors(phase, i, candidateDirection, runtimeState, mctx, candles);

    if (phaseIdx === compiled.phases.length - 1) {
      const signal = buildSignalV2(compiled, candles, i, runtimeState, candidateDirection, mctx.atr);
      if (signal) pending = signal;
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

        if (checkTimeStop(open, i, def.exits.timeStopBars)) {
          finalizeTimeStop(open, candle, engineCtx);
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
      if (i - pending.armIndex > pending.validForBars) {
        pending = null;
      } else {
        const canConsider =
          i >= pending.armIndex &&
          mctx.sessionAllowed[i] &&
          !dailyLossStopHit &&
          (maxTradesPerDay === undefined || tradesOpenedToday < maxTradesPerDay);

        if (canConsider) {
          const filled = attemptFill(pending, candle, i, balance, sizingMode, engineCtx);
          if (filled) {
            open = filled;
            tradesOpenedToday += 1;
            pending = null;
          }
          // else: sizing rejected this bar (e.g. stop too wide for the risk
          // budget) — keep the signal pending, it may still fill on a later,
          // tighter bar within validForBars.
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
): Promise<IndicatorBankLike | undefined> {
  if (!strategyNeedsIndicators(def)) return undefined;
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
): void {
  if (phase.capture.length === 0) return;
  const candle = candles[i];
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

function attemptFill(
  pending: TradeSignalV2,
  candle: Candle,
  i: number,
  balance: number,
  sizingMode: 'risk-pct' | 'fixed-contracts',
  ctx: EngineCtx,
): OpenPositionV2 | null {
  const side: 'buy' | 'sell' = pending.direction === 'long' ? 'buy' : 'sell';
  const fill = ctx.orderEngine.getExecutionPrice(candle, pending.orderType, pending.entryPrice, side);
  if (fill === null) return null;

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
    if (!sizing) return null;
    size = sizing.contracts;
  } else {
    fillPrice = ctx.slippagePct > 0 ? ctx.orderEngine.applySlippage(fill, ctx.slippagePct, side) : fill;
    size = ctx.orderEngine.calculatePositionSize(balance, fillPrice, pending.stopLoss, ctx.def.risk.riskPerTradePct);
  }
  if (size <= 0) return null;

  const entryTime = Math.floor(candleTimeMs(candle) / 1000);
  const risk = Math.abs(fillPrice - pending.stopLoss);
  const reward = Math.abs(pending.takeProfit - fillPrice);
  const pointValue = ctx.contractSpec?.pointValue ?? 1;

  return {
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

/** Force-close at the CLOSE of the bar `timeStopBars` was reached on. */
function finalizeTimeStop(position: OpenPositionV2, candle: Candle, ctx: EngineCtx): void {
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
  position.exitReason = 'manual';
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
// ----------------------------------------------------------------------------

function computeRDistributionV2(closed: OpenPositionV2[]): RMultipleDistribution {
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

export type { CompiledStrategy };
