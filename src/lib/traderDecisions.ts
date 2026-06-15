// src/lib/traderDecisions.ts
// ════════════════════════════════════════════════════════════════════
// Trader lens — collapse copied executions into ONE logical decision and
// compute noise-free, equal-weight-per-decision statistics.
//
// Why this exists: a single trading decision is often fanned out (copier
// or multi-account routing) to several accounts at DIFFERENT sizes, and
// some of those accounts later get "burned" (their broker connection goes
// inactive). Counting each copy as its own trade inflates the trade count
// and biases averages toward whichever decision happened to be copied to
// more accounts. The Trader lens removes that noise so the stats reflect
// the trader's actual decisions, while MONEY stays the real total.
//
// Two normalization layers:
//   1. WITHIN a decision  → per-contract $ = totalPnl / totalContracts
//                            (handles 3-vs-2 contract differences).
//   2. ACROSS decisions   → every decision carries weight 1, regardless
//                            of how many accounts it was copied to.
//
// MONEY (netPnl, equity curve, best/worst, daily) stays REAL: summing
// copies never changes the total. QUALITY (winrate, profitFactor, avgWin,
// avgLoss → expectancy) is per-contract and equal-weighted per decision.
//
// This module is PURE (no React, no Supabase). useDashboardData wires it
// in when the "Trader" view is selected.
// ════════════════════════════════════════════════════════════════════

import dayjs from 'dayjs';

// ── Inputs ──────────────────────────────────────────────────────────
// Minimal shape of a raw trade row the lens needs. Mirrors the fields
// selected by useDashboardData's trade queries. Kept local so this module
// has no import cycle with useDashboardData.
export interface TraderRawTrade {
  id: string;
  symbol: string | null;
  side?: 'LONG' | 'SHORT' | string | null;
  open_at?: string | null;
  close_at?: string | null;
  quantity?: number | null;
  pnl?: number | null;
  exit_price?: number | null;
  input_mode?: 'summary' | 'risk-only' | string | null;
  rr?: number | null;
  actual_r?: number | null;
  actual_user_r?: number | null;
  risk_usd?: number | null;
  session?: string | null;
  broker_connection_id?: string | null;
  portfolio_id?: string | null;
}

// ── Output: one logical decision ────────────────────────────────────
export interface TraderDecision {
  symbol: string;
  side: string;
  entryAt: string;        // earliest open_at across the merged copies
  exitAt: string | null;  // latest close_at across the merged copies
  contracts: number;      // total contracts across all copies
  realPnl: number;        // total $ across all copies (REAL money)
  perContract: number;    // realPnl / contracts — size & count agnostic
  baseSize: number;       // largest single copy (≈ your nostro size)
  copies: number;         // how many account rows merged into this decision
  rr: number | null;      // contract-weighted average R where available
  session: string | null;
}

// ── Output: the stats bundle (subset of DashboardStats, money + quality) ─
export interface TraderTradeRef {
  pnl: number;
  rr: number | null;
  symbol: string;
  open_at: string;
  session: string | null;
}

export interface TraderStats {
  netPnl: number;          // REAL money (sum across all copies/decisions)
  winrate: number;
  profitFactor: number;    // per-contract, equal weight per decision
  avgWin: number;          // per-contract mean of winning decisions
  avgLoss: number;         // per-contract mean of losing decisions (<= 0)
  avgRR: number;
  wins: number;
  losses: number;
  breakeven: number;
  closedTrades: number;    // = number of logical decisions
  maxDrawdown: number;     // on the REAL-money equity curve
  equitySeries: { date: string; equity: number; pnl: number }[];
  bestTrade: TraderTradeRef | null;
  worstTrade: TraderTradeRef | null;
  // Context for the "Noise-free · N decisions from M fills" strip.
  decisions: number;
  fills: number;
}

const BE_EPSILON = 1e-9;
const DEFAULT_WINDOW_MS = 60_000; // copies fire near-simultaneously (~seconds)

// Closed-trade test — mirrors useDashboardData.isTradeClosed exactly.
function isClosed(t: TraderRawTrade): boolean {
  if (t.input_mode === 'risk-only') {
    return t.pnl !== null && t.pnl !== undefined;
  }
  return t.exit_price !== null && t.exit_price !== undefined;
}

// R-multiple extraction — mirrors useDashboardData.calculateRR's precedence.
function rrOf(t: TraderRawTrade): number | null {
  if (t.actual_user_r != null && !Number.isNaN(t.actual_user_r)) return t.actual_user_r;
  if (t.actual_r != null && !Number.isNaN(t.actual_r)) return t.actual_r;
  if (t.rr != null && !Number.isNaN(t.rr) && t.rr > 0) return t.rr;
  if (t.input_mode === 'risk-only') {
    if (t.pnl != null && t.risk_usd && t.risk_usd > 0) return t.pnl / t.risk_usd;
    return null;
  }
  if (t.pnl != null && t.risk_usd && t.risk_usd > 0) return Math.abs(t.pnl) / t.risk_usd;
  return null;
}

function entryMs(t: TraderRawTrade): number {
  const ms = new Date(t.open_at ?? t.close_at ?? '').getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export interface GroupOpts {
  /** Copy-detection time window in ms. Default 60s. */
  windowMs?: number;
  /**
   * Set of active broker_connection_ids. When provided, trade rows whose
   * broker_connection_id is set but NOT in this set are treated as belonging
   * to a "burned" (disconnected) account and dropped. Manual rows (null
   * connection) are always kept. Pass null to disable burned filtering.
   */
  activeConnectionIds?: Set<string> | null;
}

// ── Grouping: copies → logical decisions ────────────────────────────
export function groupIntoDecisions(
  trades: TraderRawTrade[],
  opts: GroupOpts = {},
): TraderDecision[] {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const active = opts.activeConnectionIds ?? null;

  const usable = trades.filter(t => {
    if (!isClosed(t)) return false;
    // Burned-account exclusion: drop rows from inactive broker connections.
    if (active && t.broker_connection_id && !active.has(t.broker_connection_id)) return false;
    return true;
  });

  // Cluster by symbol+side, then by entry-time proximity (within window).
  const byKey = new Map<string, TraderRawTrade[]>();
  for (const t of usable) {
    const key = `${(t.symbol ?? '').toUpperCase()}|${t.side ?? ''}`;
    const arr = byKey.get(key);
    if (arr) arr.push(t);
    else byKey.set(key, [t]);
  }

  const decisions: TraderDecision[] = [];
  for (const rows of byKey.values()) {
    rows.sort((a, b) => entryMs(a) - entryMs(b));
    let cluster: TraderRawTrade[] = [];
    let clusterStart = 0;
    for (const t of rows) {
      const ts = entryMs(t);
      if (cluster.length === 0) {
        cluster = [t];
        clusterStart = ts;
      } else if (ts - clusterStart <= windowMs) {
        cluster.push(t);
      } else {
        decisions.push(buildDecision(cluster));
        cluster = [t];
        clusterStart = ts;
      }
    }
    if (cluster.length > 0) decisions.push(buildDecision(cluster));
  }

  decisions.sort(
    (a, b) =>
      new Date(a.exitAt ?? a.entryAt).getTime() -
      new Date(b.exitAt ?? b.entryAt).getTime(),
  );
  return decisions;
}

function buildDecision(copies: TraderRawTrade[]): TraderDecision {
  let contracts = 0;
  let realPnl = 0;
  let baseSize = 0;
  let rrWeighted = 0;
  let rrWeight = 0;
  let entryAt = copies[0].open_at ?? copies[0].close_at ?? '';
  let exitAt: string | null = null;

  for (const c of copies) {
    const q = Math.abs(c.quantity ?? 0);
    contracts += q;
    realPnl += c.pnl ?? 0;
    if (q > baseSize) baseSize = q;

    const r = rrOf(c);
    if (r != null && Number.isFinite(r)) {
      const w = q || 1;
      rrWeighted += r * w;
      rrWeight += w;
    }

    const eo = c.open_at ?? c.close_at ?? '';
    if (eo && (!entryAt || new Date(eo).getTime() < new Date(entryAt).getTime())) {
      entryAt = eo;
    }
    const ex = c.close_at ?? null;
    if (ex && (!exitAt || new Date(ex).getTime() > new Date(exitAt).getTime())) {
      exitAt = ex;
    }
  }

  const perContract = contracts > 0 ? realPnl / contracts : realPnl;

  return {
    symbol: copies[0].symbol ?? 'N/A',
    side: (copies[0].side as string) ?? '',
    entryAt,
    exitAt,
    contracts,
    realPnl,
    perContract,
    baseSize,
    copies: copies.length,
    rr: rrWeight > 0 ? rrWeighted / rrWeight : null,
    session: copies[0].session ?? null,
  };
}

// ── Stats: equal-weight-per-decision quality + real-money totals ────
export function computeTraderStats(
  decisions: TraderDecision[],
  totalFills: number,
): TraderStats {
  let netPnl = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let sumWinPC = 0;   // sum of per-contract $ of winning decisions
  let sumLossPC = 0;  // sum of |per-contract $| of losing decisions
  let winCount = 0;
  let lossCount = 0;
  let rrSum = 0;
  let rrCount = 0;
  let best: TraderTradeRef | null = null;
  let worst: TraderTradeRef | null = null;

  const sorted = [...decisions].sort(
    (a, b) =>
      new Date(a.exitAt ?? a.entryAt).getTime() -
      new Date(b.exitAt ?? b.entryAt).getTime(),
  );

  // Real-money equity curve, bucketed by day (matches computeStats format).
  const byDate = new Map<string, number>();
  for (const d of sorted) {
    netPnl += d.realPnl;
    const pc = d.perContract;

    if (d.realPnl > BE_EPSILON) {
      wins++;
      winCount++;
      sumWinPC += pc;
    } else if (d.realPnl < -BE_EPSILON) {
      losses++;
      lossCount++;
      sumLossPC += Math.abs(pc);
    } else {
      breakeven++;
    }

    if (d.rr != null && Number.isFinite(d.rr)) {
      rrSum += d.rr;
      rrCount++;
    }

    if (!best || d.realPnl > best.pnl) {
      best = { pnl: d.realPnl, rr: d.rr, symbol: d.symbol, open_at: d.entryAt, session: d.session };
    }
    if (!worst || d.realPnl < worst.pnl) {
      worst = { pnl: d.realPnl, rr: d.rr, symbol: d.symbol, open_at: d.entryAt, session: d.session };
    }

    const date = dayjs(d.exitAt ?? d.entryAt).format('MMM DD');
    byDate.set(date, (byDate.get(date) ?? 0) + d.realPnl);
  }

  const equitySeries: { date: string; equity: number; pnl: number }[] = [];
  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const [date, dayPnl] of byDate) {
    running += dayPnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
    equitySeries.push({ date, equity: running, pnl: dayPnl });
  }

  const closedTrades = wins + losses + breakeven;
  const profitFactor = sumLossPC > 0 ? sumWinPC / sumLossPC : 0;
  const avgWin = winCount > 0 ? sumWinPC / winCount : 0;
  const avgLoss = lossCount > 0 ? -(sumLossPC / lossCount) : 0;
  const winrate = closedTrades > 0 ? wins / closedTrades : 0;
  const avgRR = rrCount > 0 ? rrSum / rrCount : 0;

  return {
    netPnl,
    winrate,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
    avgWin: Number.isFinite(avgWin) ? avgWin : 0,
    avgLoss: Number.isFinite(avgLoss) ? avgLoss : 0,
    avgRR: Number.isFinite(avgRR) ? avgRR : 0,
    wins,
    losses,
    breakeven,
    closedTrades,
    maxDrawdown,
    equitySeries,
    bestTrade: best && best.pnl > 0 ? best : null,
    worstTrade: worst && worst.pnl < 0 ? worst : null,
    decisions: decisions.length,
    fills: totalFills,
  };
}
