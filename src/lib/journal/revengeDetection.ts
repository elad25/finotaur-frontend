// src/lib/journal/revengeDetection.ts
// =====================================================
// REVENGE RADAR — pure detection engine
// =====================================================
// No React. Operates entirely on closed Trade[] (client-side only,
// no backend changes). Flags trades that look like "revenge trading" —
// impulsive re-entries chasing a prior loss — using four independent
// heuristics, and builds the aggregates the Revenge Radar page renders.
// =====================================================

import type { Trade } from '@/hooks/useTradesData';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Same-symbol re-entry within this many minutes of a losing close = revenge. */
const REENTRY_WINDOW_MIN = 15;

/** Any-symbol re-entry this fast after a loss reads as impulsive, not analyzed. */
const RAPID_FIRE_WINDOW_MIN = 5;

/** Window after 2+ consecutive losses in which the next trade is "chasing" them. */
const LOSS_STREAK_WINDOW_MIN = 60;

/** Window after a loss in which a size jump reads as "trying to win it back". */
const SIZE_ESCALATION_WINDOW_MIN = 30;

/** A trade whose notional is at least this multiple of the recent median counts as escalated. */
const SIZE_ESCALATION_MULTIPLIER = 1.5;

/** How many prior trades feed the rolling median used for size-escalation comparison. */
const SIZE_ESCALATION_LOOKBACK = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

export type RevengeReason =
  | 'quick_reentry'
  | 'rapid_fire'
  | 'size_escalation'
  | 'loss_streak_chase';

export interface RevengeTradeFlag {
  tradeId: string;
  reasons: RevengeReason[];
  minutesAfterLoss: number;
}

export interface RevengeDay {
  date: string; // YYYY-MM-DD (local)
  count: number;
  pnl: number;
}

export interface RevengePoint {
  idx: number;
  label: string;
  actual: number;
  clean: number;
}

export interface RevengeAnalysis {
  flags: Map<string, RevengeTradeFlag>;
  revengeCount: number;
  totalCount: number;
  revengePnl: number;
  revengeWinRate: number | null;
  normalWinRate: number | null;
  revengeDays: RevengeDay[];
  points: RevengePoint[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function isWin(trade: Trade): boolean {
  if (trade.pnl != null) return trade.pnl > 0;
  return trade.outcome === 'WIN';
}

/** Local (browser timezone) YYYY-MM-DD for a trade's open time. */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

export function detectRevenge(closedTrades: Trade[]): RevengeAnalysis {
  const flags = new Map<string, RevengeTradeFlag>();

  // Sort ascending by open_at for detection (need chronological entry order).
  const byOpen = [...closedTrades].sort((a, b) => {
    const at = safeTime(a.open_at) ?? 0;
    const bt = safeTime(b.open_at) ?? 0;
    return at - bt;
  });

  for (let i = 0; i < byOpen.length; i++) {
    const trade = byOpen[i];
    const openAt = trade.open_at;
    if (!openAt) continue;

    // Find the most recent PRIOR trade (by index in open-sorted order) whose
    // close_at <= this trade's open_at. Since trades are open-sorted, we walk
    // backward and pick the closest qualifying candidate by close time.
    let prevTrade: Trade | null = null;
    let prevCloseTime = -Infinity;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = byOpen[j];
      const closeAt = candidate.close_at;
      if (!closeAt) continue;
      const closeTime = safeTime(closeAt);
      const openTime = safeTime(openAt);
      if (closeTime == null || openTime == null) continue;
      if (closeTime <= openTime && closeTime > prevCloseTime) {
        prevCloseTime = closeTime;
        prevTrade = candidate;
      }
    }

    if (!prevTrade || !prevTrade.close_at) continue;

    const gapMin = minutesBetween(prevTrade.close_at, openAt);
    if (!Number.isFinite(gapMin) || gapMin < 0) continue;

    const reasons: RevengeReason[] = [];
    const prevWasLoss = isLoss(prevTrade);

    // Rule: quick_reentry — same symbol, prior loss, within REENTRY_WINDOW_MIN.
    if (prevWasLoss && trade.symbol === prevTrade.symbol && gapMin <= REENTRY_WINDOW_MIN) {
      reasons.push('quick_reentry');
    }

    // Rule: rapid_fire — any symbol, prior loss, within RAPID_FIRE_WINDOW_MIN.
    if (prevWasLoss && gapMin <= RAPID_FIRE_WINDOW_MIN) {
      reasons.push('rapid_fire');
    }

    // Rule: loss_streak_chase — 2+ consecutive prior closed trades were losses
    // (looking back from prevTrade, inclusive), and this trade opened within
    // LOSS_STREAK_WINDOW_MIN of the most recent one.
    if (gapMin <= LOSS_STREAK_WINDOW_MIN) {
      // Walk backward through prior CLOSED trades (chronological by close)
      // starting at prevTrade, counting a consecutive-loss streak.
      const thisOpenTime = safeTime(openAt) ?? Infinity;
      const priorClosed = byOpen
        .slice(0, i)
        .filter((t) => {
          const ct = safeTime(t.close_at);
          // Only trades already CLOSED before this one opened count toward the
          // streak — overlapping positions that closed later are not "prior losses".
          return ct != null && ct <= thisOpenTime;
        })
        .sort((a, b) => (safeTime(a.close_at) ?? 0) - (safeTime(b.close_at) ?? 0));
      let streak = 0;
      for (let k = priorClosed.length - 1; k >= 0; k--) {
        if (isLoss(priorClosed[k])) {
          streak++;
        } else {
          break;
        }
      }
      if (streak >= 2) {
        reasons.push('loss_streak_chase');
      }
    }

    // Rule: size_escalation — prior loss, within SIZE_ESCALATION_WINDOW_MIN,
    // and this trade's notional >= 1.5x the median notional of up to the
    // 20 trades preceding it (in open-sorted order).
    if (prevWasLoss && gapMin <= SIZE_ESCALATION_WINDOW_MIN) {
      const lookbackStart = Math.max(0, i - SIZE_ESCALATION_LOOKBACK);
      const priorNotionals = byOpen.slice(lookbackStart, i).map(notionalOf).filter((n) => n > 0);
      if (priorNotionals.length > 0) {
        const med = median(priorNotionals);
        const thisNotional = notionalOf(trade);
        if (med > 0 && thisNotional >= SIZE_ESCALATION_MULTIPLIER * med) {
          reasons.push('size_escalation');
        }
      }
    }

    if (reasons.length > 0) {
      flags.set(trade.id, { tradeId: trade.id, reasons, minutesAfterLoss: gapMin });
    }
  }

  // ── Aggregates ──────────────────────────────────────────────────────────

  const totalCount = closedTrades.length;
  const revengeCount = flags.size;

  let revengePnl = 0;
  let revengeWins = 0;
  let revengeDecided = 0; // wins + losses (excludes BE/undecided) among flagged
  let normalWins = 0;
  let normalDecided = 0;

  const revengeDaysMap = new Map<string, RevengeDay>();

  for (const trade of closedTrades) {
    const pnl = trade.pnl ?? 0;
    const flagged = flags.has(trade.id);

    if (flagged) {
      revengePnl += pnl;
      if (isWin(trade) || isLoss(trade)) {
        revengeDecided++;
        if (isWin(trade)) revengeWins++;
      }
      if (trade.open_at) {
        const key = localDateKey(trade.open_at);
        const existing = revengeDaysMap.get(key);
        if (existing) {
          existing.count += 1;
          existing.pnl += pnl;
        } else {
          revengeDaysMap.set(key, { date: key, count: 1, pnl });
        }
      }
    } else {
      if (isWin(trade) || isLoss(trade)) {
        normalDecided++;
        if (isWin(trade)) normalWins++;
      }
    }
  }

  const revengeWinRate = revengeDecided > 0 ? (revengeWins / revengeDecided) * 100 : null;
  const normalWinRate = normalDecided > 0 ? (normalWins / normalDecided) * 100 : null;

  const revengeDays = Array.from(revengeDaysMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

  // ── Cumulative points (close_at asc) ──────────────────────────────────────

  const byClose = [...closedTrades]
    .filter((t) => t.close_at != null)
    .sort((a, b) => (safeTime(a.close_at) ?? 0) - (safeTime(b.close_at) ?? 0));

  let runningActual = 0;
  let runningClean = 0;
  const points: RevengePoint[] = byClose.map((trade, idx) => {
    const pnl = trade.pnl ?? 0;
    runningActual += pnl;
    if (!flags.has(trade.id)) {
      runningClean += pnl;
    }
    return {
      idx,
      label: shortLabel(trade.close_at as string),
      actual: runningActual,
      clean: runningClean,
    };
  });

  return {
    flags,
    revengeCount,
    totalCount,
    revengePnl,
    revengeWinRate,
    normalWinRate,
    revengeDays,
    points,
  };
}
