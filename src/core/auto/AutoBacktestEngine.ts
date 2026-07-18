// ============================================================================
// AUTO BACKTEST ENGINE — forward, single-pass, look-ahead-safe runner
// ============================================================================
//
// Wires the pieces together:
//   MarketContext.build -> runDetectors -> buildSignal -> arm/fill/manage
// using the existing OrderExecutionEngine (fills, SL/TP, sizing, P&L) and
// StatisticsEngine (final metrics). MVP enforces a single concurrent position.
//
// LOOK-AHEAD SAFETY
// -----------------
// The engine scans bars in order. A detection only enters the pending queue at
// its own formedAtIndex (step c, AFTER fill attempts for the same bar), so a
// signal can never fill on the very bar it was confirmed using future info.
// Pending fills, SL/TP checks, and sizing all read only the current bar.
// ============================================================================

import { OrderExecutionEngine } from '../engines/OrderExecutionEngine';
import { StatisticsEngine } from '../engines/StatisticsEngine';
import type { Candle } from '../../components/ReplayChart/types';
import type { Detection, SetupDefinition, TradeSignal } from './types';
import { MarketContext } from './MarketContext';
import { runDetectors } from './detectors/registry';
import { buildSignal } from './SignalBuilder';
import { signalToPosition, type AutoPosition } from './signalToPosition';
import { candleTimeMs, localDayKey } from './MarketContext';
import { computeRLadderAggregate, type RLadderAgg } from './rLadderAnalysis';
import { getContractSpec } from './contractSpecs';
import {
  resolveFuturesContracts,
  applyFuturesTickSlippage,
  futuresPnl,
  futuresCommissionRoundTrip,
  priceMovePercent,
} from './futuresExecution';

/** Fixed reward:risk levels the honest-results R-ladder is simulated at. */
export const R_LADDER_LEVELS = [1, 2, 3, 4, 5];

// ----------------------------------------------------------------------------
// Narrow structural views of the reused engines. We describe ONLY the methods
// we call, so this module does not depend on the engines' own (currently
// unresolved) `'../../types'` Position import. AutoPosition is structurally
// compatible with the fields those methods touch at runtime.
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
  calculateRealizedPnL(
    position: AutoPosition,
    exitPrice: number,
  ): { pnl: number; pnlPercent: number };
  calculatePositionSize(
    balance: number,
    entryPrice: number,
    stopLoss: number,
    riskPercent: number,
  ): number;
  getExecutionPrice(
    candle: Candle,
    orderType: 'market' | 'limit',
    limitPrice?: number,
    direction?: 'buy' | 'sell',
  ): number | null;
  applySlippage(
    price: number,
    slippagePercent: number,
    direction: 'buy' | 'sell',
  ): number;
  calculateCommission(price: number, size: number, commissionRate: number): number;
}

interface StatsEngineView {
  calculate(
    closedPositions: AutoPosition[],
    initialBalance: number,
    currentBalance: number,
  ): BacktestStatisticsLike;
}

/** Loose view of the StatisticsEngine output (only fields we forward/read). */
export interface BacktestStatisticsLike {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  maxDrawdown: number;
  equityCurve?: Array<{ time: number; balance: number; equity: number; drawdown: number }>;
  [key: string]: unknown;
}

export type EquityCurvePoint = NonNullable<BacktestStatisticsLike['equityCurve']>[number];

export interface RMultipleDistribution {
  '< -2R': number;
  '-2R to -1R': number;
  '-1R to 0R': number;
  '0R to 1R': number;
  '1R to 2R': number;
  '2R to 3R': number;
  '> 3R': number;
}

/** Hard cap on accumulated detections to avoid unbounded memory growth on
 *  wide date ranges / loose patterns. When exceeded, the array is truncated
 *  and `detectionsCapped` is set so the UI can warn the user. */
export const MAX_DETECTIONS = 10000;

export interface AutoBacktestResult {
  detections: Detection[];
  trades: AutoPosition[];
  statistics: BacktestStatisticsLike;
  equityCurve: EquityCurvePoint[];
  rMultipleDistribution: RMultipleDistribution;
  /** True when raw detections exceeded MAX_DETECTIONS and were truncated. */
  detectionsCapped?: boolean;
  /** Fill-anchored R-ladder aggregate (honest results, re-scored vs real candles). Optional for backward compatibility. */
  rLadder?: { perR: RLadderAgg[] };
  /**
   * Diagnostic counters for signals that were built but never became a
   * trade (v2 only — undefined for v1 runs). `zeroSize`: the signal's
   * risk-budget/stop-distance combination sized to 0 contracts on every bar
   * it was considered (attemptFill kept it pending until validForBars
   * expired). `expired`: a pending signal's limit/market price condition
   * was never touched within `validForBars` bars. Additive/optional —
   * existing callers reading only `trades`/`statistics` are unaffected.
   */
  skippedSignals?: { zeroSize: number; expired: number };
}

export function runAutoBacktest(
  setup: SetupDefinition,
  candles: Candle[],
  htfCandles?: Candle[],
  onProgress?: (scanned: number, total: number, found: number) => void,
): AutoBacktestResult {
  const orderEngine = new OrderExecutionEngine() as unknown as OrderEngineView;
  const statsEngine = new StatisticsEngine() as unknown as StatsEngineView;

  // 1. Build context once.
  const swingLookback = deriveSwingLookback(setup);
  const ctx = MarketContext.build(candles, {
    swingLookback,
    atrPeriod: 14,
    session: setup.session,
    bias: setup.bias,
    htfCandles,
  });

  // 2. Detect everything up front (each tagged with a look-ahead-safe index).
  const rawDetections = runDetectors(setup.patterns, candles, ctx);
  const detectionsCapped = rawDetections.length > MAX_DETECTIONS;
  const detections = detectionsCapped
    ? rawDetections.slice(0, MAX_DETECTIONS)
    : rawDetections;

  // Group detections by formedAtIndex for O(1) lookup during the scan.
  const byIndex = new Map<number, Detection[]>();
  for (const d of detections) {
    const list = byIndex.get(d.formedAtIndex);
    if (list) list.push(d);
    else byIndex.set(d.formedAtIndex, [d]);
  }

  // 3. State.
  let pending: TradeSignal[] = [];
  let open: AutoPosition | null = null;
  let balance = setup.risk.initialBalance;
  const closed: AutoPosition[] = [];
  const commissionPct = setup.risk.commissionPct ?? 0;
  const slippagePct = setup.risk.slippagePct ?? 0;

  // Futures contract spec for this run's symbol (null for crypto/other
  // symbols, in which case every branch below falls through to the existing
  // fractional-unit math via OrderExecutionEngine, unchanged).
  const contractSpec = getContractSpec(setup.instrument.symbol);
  const sizingMode = setup.risk.sizingMode ?? 'risk-pct';
  const commissionPerContract =
    setup.risk.commissionPerContract ?? contractSpec?.defaultCommissionPerSide ?? 0;
  const slippageTicks = setup.risk.slippageTicks;

  // Per-day trade cap (RiskConfig.maxTradesPerDay). Only enforced when set to
  // a finite number >= 1; undefined/0/absent stays unlimited (backward
  // compatible). "Day" boundary uses the session filter's timezone when the
  // session filter is enabled (reusing the same local-calendar-day notion the
  // session gate already applies to this run), else UTC.
  const maxTradesPerDayRaw = setup.risk.maxTradesPerDay;
  const maxTradesPerDay =
    typeof maxTradesPerDayRaw === 'number' &&
    Number.isFinite(maxTradesPerDayRaw) &&
    maxTradesPerDayRaw >= 1
      ? maxTradesPerDayRaw
      : undefined;
  const dayTimezone =
    setup.session.enabled && setup.session.timezone ? setup.session.timezone : 'UTC';
  let currentDayKey: string | null = null;
  let tradesOpenedToday = 0;

  const n = candles.length;
  const PROGRESS_EVERY = 500;

  // 4. Forward single pass.
  for (let i = 0; i < n; i++) {
    const candle = candles[i];

    // Roll the day-trade counter forward whenever the bar crosses into a new
    // calendar day (only tracked when the cap is actually enforced).
    if (maxTradesPerDay !== undefined) {
      const dayKey = localDayKey(candleTimeMs(candle), dayTimezone);
      if (dayKey !== currentDayKey) {
        currentDayKey = dayKey;
        tradesOpenedToday = 0;
      }
    }

    // (a) Manage the open position: SL first, then TP (engine convention).
    if (open) {
      const sl = orderEngine.checkStopLoss(open, candle);
      const tp = sl ? null : orderEngine.checkTakeProfit(open, candle);
      const hit = sl ?? tp;
      if (hit) {
        let exitPrice: number;
        let netPnl: number;
        let pnlPercent: number;

        if (contractSpec) {
          // Futures: whole-contract, point-value P&L + per-contract commission.
          const closingSide: 'buy' | 'sell' = open.type === 'long' ? 'sell' : 'buy';
          exitPrice = slippageTicks
            ? applyFuturesTickSlippage(hit.price, contractSpec.tickSize, slippageTicks, closingSide)
            : hit.price;
          const grossPnl = futuresPnl(
            open.entryPrice,
            exitPrice,
            contractSpec.pointValue,
            open.size,
            open.type === 'long',
          );
          const commission = commissionPerContract > 0
            ? futuresCommissionRoundTrip(commissionPerContract, open.size)
            : 0;
          netPnl = grossPnl - commission;
          pnlPercent = priceMovePercent(open.entryPrice, exitPrice, open.type === 'long');
        } else {
          // Crypto/other: existing fractional-unit math, unchanged.
          exitPrice = applyExitSlippage(orderEngine, hit.price, open.type, slippagePct);
          const pnlResult = orderEngine.calculateRealizedPnL(open, exitPrice);
          const commission = commissionPct > 0
            ? orderEngine.calculateCommission(exitPrice, open.size, commissionPct) +
              orderEngine.calculateCommission(open.entryPrice, open.size, commissionPct)
            : 0;
          netPnl = pnlResult.pnl - commission;
          pnlPercent = pnlResult.pnlPercent;
        }

        open.exitPrice = exitPrice;
        open.exitTime = Math.floor(candleTimeMs(candle) / 1000);
        open.exitReason = hit.reason;
        open.realizedPnl = netPnl;
        open.realizedPnlPercent = pnlPercent;
        open.status = 'closed';
        balance += netPnl;
        closed.push(open);
        open = null;
      }
    }

    // (b) Try to fill pending signals (only if no open position, MVP=1).
    if (pending.length > 0) {
      const stillPending: TradeSignal[] = [];
      for (const sig of pending) {
        // Expire?
        if (i - sig.armIndex > sig.validForBars) continue; // dropped

        const canConsider =
          !open &&
          i >= sig.armIndex &&
          ctx.sessionAllowed[i] &&
          biasAgrees(setup, ctx.htfBias[i], sig.direction) &&
          (maxTradesPerDay === undefined || tradesOpenedToday < maxTradesPerDay);

        if (!canConsider) {
          stillPending.push(sig);
          continue;
        }

        const side: 'buy' | 'sell' = sig.direction === 'long' ? 'buy' : 'sell';
        const fill = orderEngine.getExecutionPrice(
          candle,
          sig.orderType,
          sig.entryPrice,
          side,
        );

        if (fill === null) {
          stillPending.push(sig); // not filled this bar; keep waiting
          continue;
        }

        let fillPrice: number;
        let size: number;

        if (contractSpec) {
          // Futures: tick-based slippage + whole-contract risk-based/fixed sizing.
          fillPrice = slippageTicks
            ? applyFuturesTickSlippage(fill, contractSpec.tickSize, slippageTicks, side)
            : fill;
          const stopDistancePoints = Math.abs(fillPrice - sig.stopLoss);
          const sizing = resolveFuturesContracts({
            sizingMode,
            riskPerTradePct: setup.risk.riskPerTradePct,
            balance,
            contractsConfig: setup.risk.contracts,
            stopDistancePoints,
            pointValue: contractSpec.pointValue,
          });
          if (!sizing) {
            // Stop too wide for the risk budget at 1 contract -- skip this
            // fill, keep the signal pending in case a tighter fill comes later.
            stillPending.push(sig);
            continue;
          }
          size = sizing.contracts;
        } else {
          // Crypto/other: existing fractional-unit math, unchanged.
          fillPrice = slippagePct > 0
            ? orderEngine.applySlippage(fill, slippagePct, side)
            : fill;
          size = orderEngine.calculatePositionSize(
            balance,
            fillPrice,
            sig.stopLoss,
            setup.risk.riskPerTradePct,
          );
        }

        if (size > 0) {
          const entryTime = Math.floor(candleTimeMs(candle) / 1000);
          open = signalToPosition(sig, fillPrice, size, entryTime, contractSpec?.pointValue ?? 1);
          if (maxTradesPerDay !== undefined) tradesOpenedToday++;
          // Do NOT keep this signal; one fill consumes it. Remaining pending
          // can't fill while open is set anyway.
        } else {
          stillPending.push(sig);
        }
      }
      pending = stillPending;
    }

    // (c) Arm signals from detections confirmed on THIS bar (after fills, so a
    //     same-bar fill is impossible — earliest fill is i+1).
    const formedHere = byIndex.get(i);
    if (formedHere) {
      for (const det of formedHere) {
        if (!directionAllowed(setup, det.direction)) continue;
        if (!biasAgrees(setup, ctx.htfBias[i], det.direction)) continue;
        const sig = buildSignal(det, candles, ctx, setup);
        if (sig) pending.push(sig);
      }
    }

    // (d) Progress.
    if (onProgress && (i % PROGRESS_EVERY === 0 || i === n - 1)) {
      onProgress(i + 1, n, closed.length + (open ? 1 : 0));
    }
  }

  // 5. Statistics.
  const statistics = statsEngine.calculate(
    closed,
    setup.risk.initialBalance,
    balance,
  );

  // 6. R-multiple distribution (post-step; engine may omit it).
  const rMultipleDistribution = computeRDistribution(closed);

  // 7. Fill-anchored R-ladder (honest results) — re-scores each real trade's
  //    outcome against the real candles at fixed reward:risk levels, anchored
  //    to the ACTUAL fill (entryPrice/stopLoss/entryTime), not the pre-fill
  //    signal reference. Attach both the per-R aggregate and each trade's own
  //    outcome map (mutating `closed` in place is safe -- these are the same
  //    AutoPosition objects returned in `trades`).
  const { perR, perTrade } = computeRLadderAggregate(closed, candles, R_LADDER_LEVELS);
  closed.forEach((trade, i) => {
    trade.rLadder = perTrade[i];
  });

  return {
    detections,
    trades: closed,
    statistics,
    equityCurve: statistics.equityCurve ?? [],
    rMultipleDistribution,
    detectionsCapped,
    rLadder: { perR },
  };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function deriveSwingLookback(setup: SetupDefinition): number {
  for (const p of setup.patterns) {
    if (p.type === 'OB' || p.type === 'BREAKER' || p.type === 'LIQUIDITY') {
      return p.swing.lookback;
    }
  }
  return 2;
}

function directionAllowed(setup: SetupDefinition, dir: 'long' | 'short'): boolean {
  return setup.direction === 'both' || setup.direction === dir;
}

/** Bias filter: if disabled, always agrees; else require same-sign HTF bias. */
function biasAgrees(
  setup: SetupDefinition,
  htfBias: number,
  dir: 'long' | 'short',
): boolean {
  if (!setup.bias.enabled) return true;
  if (dir === 'long') return htfBias >= 0; // allow neutral + bullish
  return htfBias <= 0; // allow neutral + bearish
}

/** Exit slippage works against the closing side. */
function applyExitSlippage(
  engine: OrderEngineView,
  price: number,
  type: 'long' | 'short',
  slippagePct: number,
): number {
  if (slippagePct <= 0) return price;
  // Closing a long = sell; closing a short = buy.
  const side: 'buy' | 'sell' = type === 'long' ? 'sell' : 'buy';
  return engine.applySlippage(price, slippagePct, side);
}

function computeRDistribution(closed: AutoPosition[]): RMultipleDistribution {
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
