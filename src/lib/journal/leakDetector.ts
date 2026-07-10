// src/lib/journal/leakDetector.ts
// =====================================================
// Leak Detector — the unified "judge" over behavioural patterns.
// Pure function: no React, no I/O, no network calls, no Math.random/Date.now.
// Runs all 7 leak families over one closed-trade set, expresses each on a
// common dollar-cost axis, and returns a single ranked diagnosis: your #1
// most expensive trading problem, with honest thresholds and real evidence.
//
// Reuses (does NOT reimplement) the existing detection engines:
//   - detectRevenge()          from revengeDetection.ts    (family 1)
//   - buildAggregate() /
//     computePlannedScenarios() from plannedScenarios.ts   (families 4, 5)
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import { detectRevenge } from '@/lib/journal/revengeDetection';
import { buildAggregate, computePlannedScenarios } from '@/lib/journal/plannedScenarios';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LeakEvidence {
  tradeId: string;
  note?: string;
}

export type LeakFamily =
  | 'revenge_reentry'
  | 'size_escalation'
  | 'toxic_bucket'
  | 'early_exit'
  | 'held_loser'
  | 'overtrading'
  | 'loss_shape';

export interface Leak {
  id: string;
  family: LeakFamily;
  title: string;
  detail: string;
  rule: string;
  costUsd: number;
  shareOfLosses: number | null;
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
  evidence: LeakEvidence[];
}

export interface LeakReport {
  status: 'ok' | 'early' | 'collecting';
  tradesAnalyzed: number;
  minTradesRequired: number;
  verdict: Leak | null;
  leaks: Leak[];
  /** Top (up to 3) relaxed-gate insights for the 'early' status (10-29 trades).
   *  Always [] for 'ok' and 'collecting' — existing consumers are unaffected. */
  earlyInsights: Leak[];
  cleanBill: boolean;
}

// ─── Thresholds (honesty rules) ────────────────────────────────────────────────

const MIN_TRADES = 30;
const DEFAULT_MIN_SAMPLE = 5;
const LOSS_SHAPE_MIN_LOSSES = 10;
const MIN_COST_USD = 100;
const MIN_SHARE_OF_LOSSES = 0.05;
const TOXIC_BUCKET_MIN_TRADES = 5;
const TOXIC_BUCKET_DEVIATION_THRESHOLD = 150;
const HIGH_CONFIDENCE_SAMPLE = 10;
const HIGH_CONFIDENCE_COVERAGE = 15; // families 4, 5

/** "Early Read" mode (10-29 closed trades) — same 7 families, relaxed gates,
 *  confidence capped at 'medium', top 3 candidates surfaced as earlyInsights. */
const EARLY_MIN_TRADES = 10;
const EARLY_MIN_SAMPLE = 3;
const EARLY_MIN_COST_USD = 50;
/** loss_shape's 10-loss floor is unreachable under 30 trades in most real
 *  distributions — relax proportionally rather than disable the family. */
const EARLY_LOSS_SHAPE_MIN_LOSSES = 5;
const EARLY_INSIGHTS_CAP = 3;

/** Per-mode gate configuration, threaded through all 7 family builders so
 *  behaviour for >= 30 trades (FULL_GATES) stays bit-for-bit identical to
 *  the pre-Early-Read implementation. */
interface Gates {
  /** General min-sample floor (families 1, 2, 3, 6; also toxic_bucket's final gate). */
  minSample: number;
  /** Bucket-eligibility floor for family 3 (toxic_bucket). */
  toxicBucketMinTrades: number;
  /** Min-loss floor for family 7 (loss_shape). */
  lossShapeMinLosses: number;
  minCostUsd: number;
  minShareOfLosses: number | null;
  /** When true, any 'high' confidence result is downgraded to 'medium'. */
  capConfidence: boolean;
}

const FULL_GATES: Gates = {
  minSample: DEFAULT_MIN_SAMPLE,
  toxicBucketMinTrades: TOXIC_BUCKET_MIN_TRADES,
  lossShapeMinLosses: LOSS_SHAPE_MIN_LOSSES,
  minCostUsd: MIN_COST_USD,
  minShareOfLosses: MIN_SHARE_OF_LOSSES,
  capConfidence: false,
};

const EARLY_GATES: Gates = {
  minSample: EARLY_MIN_SAMPLE,
  toxicBucketMinTrades: EARLY_MIN_SAMPLE,
  lossShapeMinLosses: EARLY_LOSS_SHAPE_MIN_LOSSES,
  minCostUsd: EARLY_MIN_COST_USD,
  minShareOfLosses: null, // no share-of-losses gate in early mode
  capConfidence: true,
};

function applyConfidenceCap(confidence: Leak['confidence'], gates: Gates): Leak['confidence'] {
  return gates.capConfidence && confidence === 'high' ? 'medium' : confidence;
}

/** Same-symbol re-entry / size-escalation constants — mirror revengeDetection.ts,
 *  so family 2 (size_escalation) uses the identical measurement, just looking
 *  BEYOND revenge's own time windows to avoid double-counting the same trades. */
const SIZE_ESCALATION_WINDOW_MIN = 30;
const SIZE_ESCALATION_MULTIPLIER = 1.5;
const SIZE_ESCALATION_LOOKBACK = 20;

const CONFIDENCE_WEIGHT: Record<Leak['confidence'], number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

// ─── Small shared helpers (mirror revengeDetection.ts / groupStats.ts style) ──

function safeTime(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function minutesBetween(fromIso: string, toIso: string): number {
  const from = safeTime(fromIso);
  const to = safeTime(toIso);
  if (from == null || to == null) return Infinity;
  return (to - from) / 60000;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function notionalOf(trade: Trade): number {
  const multiplier = trade.multiplier ?? 1;
  return Math.abs(trade.quantity) * multiplier * trade.entry_price;
}

function isLoss(trade: Trade): boolean {
  if (trade.pnl != null) return trade.pnl < 0;
  return trade.outcome === 'LOSS';
}

/** Local (browser timezone) YYYY-MM-DD for a trade's open time. */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function money(n: number): string {
  return '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
}

/** Find the most recent PRIOR trade (by close time) that closed at-or-before
 *  `sorted[idx]`'s open time. `sorted` must be ascending by open_at. */
function findPrevClosedTrade(sorted: Trade[], idx: number): Trade | null {
  const trade = sorted[idx];
  const openTime = safeTime(trade.open_at);
  if (openTime == null) return null;

  let prevTrade: Trade | null = null;
  let prevCloseTime = -Infinity;
  for (let j = idx - 1; j >= 0; j--) {
    const candidate = sorted[j];
    const closeTime = safeTime(candidate.close_at);
    if (closeTime == null) continue;
    if (closeTime <= openTime && closeTime > prevCloseTime) {
      prevCloseTime = closeTime;
      prevTrade = candidate;
    }
  }
  return prevTrade;
}

function computeGrossLosses(trades: Trade[]): number {
  let sum = 0;
  for (const t of trades) {
    const pnl = t.pnl ?? 0;
    if (pnl < 0) sum += Math.abs(pnl);
  }
  return sum;
}

function shareOf(costUsd: number, grossLosses: number): number | null {
  return grossLosses > 0 ? costUsd / grossLosses : null;
}

function passesThresholds(
  sampleSize: number,
  costUsd: number,
  shareOfLosses: number | null,
  minSample: number,
  gates: Gates,
): boolean {
  if (sampleSize < minSample) return false;
  if (costUsd < gates.minCostUsd) return false;
  if (gates.minShareOfLosses !== null && shareOfLosses !== null && shareOfLosses < gates.minShareOfLosses) {
    return false;
  }
  return true;
}

// ─── Family 1: revenge_reentry ─────────────────────────────────────────────────
// Reuses detectRevenge() verbatim. Also returns the flagged-trade id set so
// family 2 (size_escalation) can dedupe against it.

function buildRevengeLeak(
  closedTrades: Trade[],
  grossLosses: number,
  gates: Gates,
): { leak: Leak | null; flaggedIds: Set<string> } {
  const analysis = detectRevenge(closedTrades);
  const flaggedIds = new Set(analysis.flags.keys());

  const costUsd = Math.max(0, -analysis.revengePnl);
  const sampleSize = analysis.revengeCount;
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(sampleSize, costUsd, shareOfLosses, gates.minSample, gates)) {
    return { leak: null, flaggedIds };
  }

  const confidence: Leak['confidence'] = applyConfidenceCap(
    sampleSize >= HIGH_CONFIDENCE_SAMPLE ? 'high' : 'medium',
    gates,
  );
  const evidence: LeakEvidence[] = [...analysis.flags.values()]
    .slice(0, 20)
    .map((flag) => ({ tradeId: flag.tradeId, note: flag.reasons.join(', ') }));

  const leak: Leak = {
    id: 'revenge_reentry',
    family: 'revenge_reentry',
    title: "You're revenge trading after losses",
    detail: `${sampleSize} of your ${closedTrades.length} trades were entered right after a loss, chasing it back — that pattern cost you ${money(costUsd)} overall.`,
    rule: 'Wait at least 30 minutes after any loss before placing your next trade.',
    costUsd,
    shareOfLosses,
    sampleSize,
    confidence,
    evidence,
  };

  return { leak, flaggedIds };
}

// ─── Family 2: size_escalation ─────────────────────────────────────────────────
// Independently detects oversized re-entries after a loss, but ONLY beyond
// revenge's own SIZE_ESCALATION_WINDOW_MIN (30 min), on the same calendar day —
// and excludes any trade already flagged by detectRevenge (dedupe).

function buildSizeEscalationLeak(
  sortedTrades: Trade[],
  revengeFlaggedIds: Set<string>,
  grossLosses: number,
  gates: Gates,
): Leak | null {
  const found: { tradeId: string; excess: number }[] = [];

  for (let i = 0; i < sortedTrades.length; i++) {
    const trade = sortedTrades[i];
    if (revengeFlaggedIds.has(trade.id)) continue; // dedupe vs family 1

    const prevTrade = findPrevClosedTrade(sortedTrades, i);
    if (!prevTrade || !prevTrade.close_at || !isLoss(prevTrade)) continue;

    const gapMin = minutesBetween(prevTrade.close_at, trade.open_at);
    if (!Number.isFinite(gapMin) || gapMin < 0) continue;
    if (gapMin <= SIZE_ESCALATION_WINDOW_MIN) continue; // stay beyond revenge's window
    if (localDateKey(prevTrade.close_at) !== localDateKey(trade.open_at)) continue; // same day only

    const lookbackStart = Math.max(0, i - SIZE_ESCALATION_LOOKBACK);
    const priorNotionals = sortedTrades
      .slice(lookbackStart, i)
      .map(notionalOf)
      .filter((n) => n > 0);
    if (priorNotionals.length === 0) continue;

    const med = median(priorNotionals);
    const thisNotional = notionalOf(trade);
    if (med <= 0 || thisNotional < SIZE_ESCALATION_MULTIPLIER * med) continue;

    const pnl = trade.pnl ?? 0;
    if (pnl >= 0) continue; // losses only

    const excess = Math.abs(pnl) * (1 - med / thisNotional);
    if (excess <= 0) continue;

    found.push({ tradeId: trade.id, excess });
  }

  const costUsd = found.reduce((sum, f) => sum + f.excess, 0);
  const sampleSize = found.length;
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(sampleSize, costUsd, shareOfLosses, gates.minSample, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap(
    sampleSize >= HIGH_CONFIDENCE_SAMPLE ? 'high' : 'medium',
    gates,
  );
  const evidence: LeakEvidence[] = [...found]
    .sort((a, b) => b.excess - a.excess)
    .slice(0, 20)
    .map((f) => ({ tradeId: f.tradeId, note: `${money(f.excess)} excess loss from oversizing` }));

  return {
    id: 'size_escalation',
    family: 'size_escalation',
    title: "You're oversizing right after a loss",
    detail: `${sampleSize} trades sized up at least 1.5x your normal size after a loss earlier the same session — the extra size on those losers cost about ${money(costUsd)}.`,
    rule: 'Cut position size in half on your next trade after any loss, for the rest of the session.',
    costUsd,
    shareOfLosses,
    sampleSize,
    confidence,
    evidence,
  };
}

// ─── Family 3: toxic_bucket ────────────────────────────────────────────────────
// Baseline-relative time analysis over hour-of-day AND day-of-week buckets.
// Reports only the single worst bucket.

interface TimeBucket {
  kind: 'hour' | 'weekday';
  label: string;
  count: number;
  netPnl: number;
  tradeIds: string[];
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildToxicBucketLeak(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak | null {
  const withDate = closedTrades.filter((t) => t.open_at && safeTime(t.open_at) != null);
  if (withDate.length === 0) return null;

  const totalPnl = withDate.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const overallAvg = totalPnl / withDate.length;

  const hourBuckets = new Map<number, TimeBucket>();
  const weekdayBuckets = new Map<number, TimeBucket>();

  for (const t of withDate) {
    const d = new Date(t.open_at);
    const hour = d.getHours();
    const weekday = d.getDay();
    const pnl = t.pnl ?? 0;

    let hb = hourBuckets.get(hour);
    if (!hb) {
      const nextHour = (hour + 1) % 24;
      hb = {
        kind: 'hour',
        label: `${String(hour).padStart(2, '0')}:00-${String(nextHour).padStart(2, '0')}:00`,
        count: 0,
        netPnl: 0,
        tradeIds: [],
      };
      hourBuckets.set(hour, hb);
    }
    hb.count += 1;
    hb.netPnl += pnl;
    hb.tradeIds.push(t.id);

    let wb = weekdayBuckets.get(weekday);
    if (!wb) {
      wb = {
        kind: 'weekday',
        label: `${WEEKDAY_NAMES[weekday]}s`,
        count: 0,
        netPnl: 0,
        tradeIds: [],
      };
      weekdayBuckets.set(weekday, wb);
    }
    wb.count += 1;
    wb.netPnl += pnl;
    wb.tradeIds.push(t.id);
  }

  const allBuckets = [...hourBuckets.values(), ...weekdayBuckets.values()];

  let worst: TimeBucket | null = null;
  let worstDeviation = 0; // most negative wins
  for (const b of allBuckets) {
    if (b.count < gates.toxicBucketMinTrades) continue;
    if (b.netPnl >= 0) continue;
    const expected = b.count * overallAvg;
    const deviation = b.netPnl - expected;
    if (deviation < -TOXIC_BUCKET_DEVIATION_THRESHOLD && deviation < worstDeviation) {
      worstDeviation = deviation;
      worst = b;
    }
  }

  if (!worst) return null;

  const costUsd = Math.abs(worstDeviation);
  const sampleSize = worst.count;
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(sampleSize, costUsd, shareOfLosses, gates.minSample, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap(
    sampleSize >= HIGH_CONFIDENCE_SAMPLE ? 'high' : 'medium',
    gates,
  );
  const evidence: LeakEvidence[] = worst.tradeIds.slice(0, 20).map((id) => ({ tradeId: id }));
  const windowLabel = worst.kind === 'hour' ? `${worst.label} hour` : worst.label;

  return {
    id: 'toxic_bucket',
    family: 'toxic_bucket',
    title: `Your ${windowLabel} is bleeding money`,
    detail: `${sampleSize} trades in this window net ${money(worst.netPnl)} — ${money(costUsd)} worse than your average trade would predict.`,
    rule: `Stop trading during your ${windowLabel} until you've reviewed why it underperforms.`,
    costUsd,
    shareOfLosses,
    sampleSize,
    confidence,
    evidence,
  };
}

// ─── Family 4: early_exit ──────────────────────────────────────────────────────
// Reuses buildAggregate()/computePlannedScenarios() target-gap logic.
// sampleSize = covered-trade count (trades with a recorded target).

function buildEarlyExitLeak(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak | null {
  const agg = buildAggregate(closedTrades);
  const coveredCount = agg.coverage.withTarget;
  if (coveredCount < gates.minSample) return null;

  const costUsd = Math.max(0, agg.totals.target - agg.totals.actual);
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(coveredCount, costUsd, shareOfLosses, gates.minSample, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap(
    coveredCount >= HIGH_CONFIDENCE_COVERAGE ? 'high' : 'medium',
    gates,
  );

  const gaps: { tradeId: string; gap: number }[] = [];
  for (const t of closedTrades) {
    if (t.exit_price == null || t.exit_price <= 0 || t.close_at == null) continue;
    if (t.take_profit_price == null || t.take_profit_price <= 0) continue;
    const result = computePlannedScenarios(t);
    const targetScenario = result.scenarios.find((s) => s.key === 'target');
    if (targetScenario?.available && targetScenario.deltaVsActual != null && targetScenario.deltaVsActual > 0) {
      gaps.push({ tradeId: t.id, gap: targetScenario.deltaVsActual });
    }
  }
  gaps.sort((a, b) => b.gap - a.gap);
  const evidence: LeakEvidence[] = gaps.slice(0, 20).map((g) => ({
    tradeId: g.tradeId,
    note: `left ${money(g.gap)} on the table vs the recorded target`,
  }));

  return {
    id: 'early_exit',
    family: 'early_exit',
    title: "You're banking winners too early",
    detail: `Across ${coveredCount} trades with a recorded target, holding to target would have added ${money(costUsd)} overall.`,
    rule: 'Hold winners to your recorded target instead of exiting on feel.',
    costUsd,
    shareOfLosses,
    sampleSize: coveredCount,
    confidence,
    evidence,
  };
}

// ─── Family 5: held_loser ───────────────────────────────────────────────────────
// Reuses computePlannedScenarios() stop-scenario cost.
// sampleSize = covered-trade count (trades with a recorded stop).

function buildHeldLoserLeak(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak | null {
  const agg = buildAggregate(closedTrades);
  const coveredCount = agg.coverage.withStop;
  if (coveredCount < gates.minSample) return null;

  let costUsd = 0;
  const costs: { tradeId: string; cost: number }[] = [];

  for (const t of closedTrades) {
    if (t.exit_price == null || t.exit_price <= 0 || t.close_at == null) continue;
    if (t.stop_price == null || t.stop_price <= 0) continue;

    const result = computePlannedScenarios(t);
    const actualPnl = result.actualPnl;
    if (actualPnl >= 0) continue; // losers only

    const stopScenario = result.scenarios.find((s) => s.key === 'stop');
    if (stopScenario?.available && stopScenario.pnl != null) {
      const cost = stopScenario.pnl - actualPnl; // positive = stop would have cut the loss
      if (cost > 0) {
        costUsd += cost;
        costs.push({ tradeId: t.id, cost });
      }
    }
  }

  const shareOfLosses = shareOf(costUsd, grossLosses);
  if (!passesThresholds(coveredCount, costUsd, shareOfLosses, gates.minSample, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap(
    coveredCount >= HIGH_CONFIDENCE_COVERAGE ? 'high' : 'medium',
    gates,
  );
  costs.sort((a, b) => b.cost - a.cost);
  const evidence: LeakEvidence[] = costs
    .slice(0, 20)
    .map((c) => ({ tradeId: c.tradeId, note: `ran ${money(c.cost)} past the recorded stop` }));

  return {
    id: 'held_loser',
    family: 'held_loser',
    title: "You're holding losers past your stop",
    detail: `Across ${coveredCount} trades with a recorded stop, letting losers run past the stop cost about ${money(costUsd)}.`,
    rule: "Treat your stop as a hard exit — once it's set, only move it in your favor.",
    costUsd,
    shareOfLosses,
    sampleSize: coveredCount,
    confidence,
    evidence,
  };
}

// ─── Family 6: overtrading ──────────────────────────────────────────────────────
// Days with trade count > max(3, 2x median daily count); costUsd = sum of net
// PnL of the trades beyond the median-count position on those days, when negative.

function buildOvertradingLeak(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak | null {
  const withDate = closedTrades.filter((t) => t.open_at && safeTime(t.open_at) != null);
  const byDay = new Map<string, Trade[]>();
  for (const t of withDate) {
    const key = localDateKey(t.open_at);
    const arr = byDay.get(key);
    if (arr) arr.push(t);
    else byDay.set(key, [t]);
  }

  const dayCounts = [...byDay.values()].map((arr) => arr.length);
  const medianCount = median(dayCounts);
  const threshold = Math.max(3, medianCount * 2);
  const medianCountFloor = Math.floor(medianCount);

  let costUsd = 0;
  const overtradingDays: { day: string; excessCount: number; excessPnl: number; evidenceId: string }[] = [];

  for (const [day, trades] of byDay.entries()) {
    if (trades.length <= threshold) continue;
    const sortedDay = [...trades].sort((a, b) => (safeTime(a.open_at) ?? 0) - (safeTime(b.open_at) ?? 0));
    const excessTrades = sortedDay.slice(medianCountFloor);
    if (excessTrades.length === 0) continue;

    const excessPnl = excessTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    if (excessPnl < 0) {
      costUsd += Math.abs(excessPnl);
      overtradingDays.push({
        day,
        excessCount: excessTrades.length,
        excessPnl,
        evidenceId: excessTrades[0].id,
      });
    }
  }

  const sampleSize = overtradingDays.length;
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(sampleSize, costUsd, shareOfLosses, gates.minSample, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap(
    sampleSize >= HIGH_CONFIDENCE_SAMPLE ? 'high' : 'medium',
    gates,
  );
  const evidence: LeakEvidence[] = overtradingDays.map((d) => ({
    tradeId: d.evidenceId,
    note: `${d.day}: ${d.excessCount} trades beyond your usual pace cost ${money(Math.abs(d.excessPnl))}`,
  }));

  return {
    id: 'overtrading',
    family: 'overtrading',
    title: 'Overtrading is costing you on your busiest days',
    detail: `On ${sampleSize} days you traded well beyond your usual pace — the trades beyond your normal count lost ${money(costUsd)}.`,
    rule: 'Cap yourself at your median daily trade count and stop once you hit it.',
    costUsd,
    shareOfLosses,
    sampleSize,
    confidence,
    evidence,
  };
}

// ─── Family 7: loss_shape ───────────────────────────────────────────────────────
// avgLoss > avgWin with >= 10 losses. Confidence capped at 'medium' (it's a
// shape derived from an average, not a discrete flagged-event list).

function buildLossShapeLeak(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak | null {
  let winSum = 0;
  let winCount = 0;
  let lossSum = 0;
  let lossCount = 0;
  const losers: { tradeId: string; pnl: number }[] = [];

  for (const t of closedTrades) {
    const pnl = t.pnl ?? 0;
    if (pnl > 0) {
      winSum += pnl;
      winCount += 1;
    } else if (pnl < 0) {
      lossSum += Math.abs(pnl);
      lossCount += 1;
      losers.push({ tradeId: t.id, pnl });
    }
  }

  if (lossCount < gates.lossShapeMinLosses) return null;

  const avgWin = winCount > 0 ? winSum / winCount : 0;
  const avgLossAbs = lossSum / lossCount;
  if (avgLossAbs <= avgWin) return null;

  const costUsd = (avgLossAbs - avgWin) * lossCount;
  const shareOfLosses = shareOf(costUsd, grossLosses);

  if (!passesThresholds(lossCount, costUsd, shareOfLosses, gates.lossShapeMinLosses, gates)) return null;

  const confidence: Leak['confidence'] = applyConfidenceCap('medium', gates); // capped — shape, not an event list
  losers.sort((a, b) => a.pnl - b.pnl); // most negative first
  const evidence: LeakEvidence[] = losers.slice(0, 20).map((l) => ({ tradeId: l.tradeId }));

  return {
    id: 'loss_shape',
    family: 'loss_shape',
    title: 'Your losses are bigger than your wins',
    detail: `Average loss (${money(avgLossAbs)}) is bigger than average win (${money(avgWin)}) across ${lossCount} losing trades — that shape cost roughly ${money(costUsd)} versus balanced sizing.`,
    rule: 'Tighten your stop-loss or extend your target so wins are at least as large as losses.',
    costUsd,
    shareOfLosses,
    sampleSize: lossCount,
    confidence,
    evidence,
  };
}

/** Runs all 7 leak families over one closed-trade set under a given gate
 *  configuration. Shared by both 'ok' (FULL_GATES) and 'early' (EARLY_GATES)
 *  report modes so the two never drift out of sync with each other. */
function runFamilies(closedTrades: Trade[], grossLosses: number, gates: Gates): Leak[] {
  const candidates: Leak[] = [];

  const { leak: revengeLeak, flaggedIds: revengeFlaggedIds } = buildRevengeLeak(closedTrades, grossLosses, gates);
  if (revengeLeak) candidates.push(revengeLeak);

  const sizeEscalationLeak = buildSizeEscalationLeak(closedTrades, revengeFlaggedIds, grossLosses, gates);
  if (sizeEscalationLeak) candidates.push(sizeEscalationLeak);

  const toxicBucketLeak = buildToxicBucketLeak(closedTrades, grossLosses, gates);
  if (toxicBucketLeak) candidates.push(toxicBucketLeak);

  const earlyExitLeak = buildEarlyExitLeak(closedTrades, grossLosses, gates);
  if (earlyExitLeak) candidates.push(earlyExitLeak);

  const heldLoserLeak = buildHeldLoserLeak(closedTrades, grossLosses, gates);
  if (heldLoserLeak) candidates.push(heldLoserLeak);

  const overtradingLeak = buildOvertradingLeak(closedTrades, grossLosses, gates);
  if (overtradingLeak) candidates.push(overtradingLeak);

  const lossShapeLeak = buildLossShapeLeak(closedTrades, grossLosses, gates);
  if (lossShapeLeak) candidates.push(lossShapeLeak);

  return candidates;
}

function rankLeaks(candidates: Leak[]): Leak[] {
  return [...candidates].sort(
    (a, b) => b.costUsd * CONFIDENCE_WEIGHT[b.confidence] - a.costUsd * CONFIDENCE_WEIGHT[a.confidence],
  );
}

// ─── Public entry point ────────────────────────────────────────────────────────

export function buildLeakReport(trades: Trade[]): LeakReport {
  const closedTrades = trades
    .filter((t) => t.close_at != null && t.outcome !== 'OPEN')
    .sort((a, b) => (safeTime(a.open_at) ?? 0) - (safeTime(b.open_at) ?? 0));

  const tradesAnalyzed = closedTrades.length;

  if (tradesAnalyzed < EARLY_MIN_TRADES) {
    return {
      status: 'collecting',
      tradesAnalyzed,
      minTradesRequired: MIN_TRADES,
      verdict: null,
      leaks: [],
      earlyInsights: [],
      cleanBill: false,
    };
  }

  const grossLosses = computeGrossLosses(closedTrades);

  if (tradesAnalyzed < MIN_TRADES) {
    const ranked = rankLeaks(runFamilies(closedTrades, grossLosses, EARLY_GATES));
    return {
      status: 'early',
      tradesAnalyzed,
      minTradesRequired: MIN_TRADES,
      verdict: null,
      leaks: [],
      earlyInsights: ranked.slice(0, EARLY_INSIGHTS_CAP),
      cleanBill: false,
    };
  }

  const ranked = rankLeaks(runFamilies(closedTrades, grossLosses, FULL_GATES));

  return {
    status: 'ok',
    tradesAnalyzed,
    minTradesRequired: MIN_TRADES,
    verdict: ranked[0] ?? null,
    leaks: ranked,
    earlyInsights: [],
    cleanBill: ranked.length === 0,
  };
}
