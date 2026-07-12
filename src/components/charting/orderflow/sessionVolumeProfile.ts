// src/components/charting/orderflow/sessionVolumeProfile.ts
//
// Pure aggregation for the ATAS-style SESSION Volume Profile overlay (Chart
// tab — see SessionVolumeProfileLayer.tsx). No React, no canvas.
//
// Distinct from volumeProfile.ts (the tick-level, FlowBinStore-fed,
// visible-range-only profile used by the Order Flow tab): this module works
// directly off the OHLCV `Bar[]` the Chart tab already has loaded — no new
// data feed, no FlowBinStore, no buy/sell split (OHLCV bars carry no
// aggressor-side information).
//
// APPROXIMATION (documented per spec): a bar's total volume is distributed
// UNIFORMLY across every price bin its [low, high] range overlaps. Real
// volume-at-price requires tick/trade-level data; this is the same
// approximation TradingView's "Visible Range Volume Profile" and similar
// OHLCV-only indicators use when no order-flow feed is available.

import type { Bar } from '../types';
import type { ChartTimezone } from '@/pages/app/trading-arena/components/chartStyleSettings';
import { getZonedParts, resolveIanaZone, type ZonedParts } from '@/pages/app/trading-arena/components/chartStyleMapping';
import { computeValueArea } from './valueArea';

export type SessionPeriod = 'day' | 'week' | 'month' | 'custom';

export interface SessionProfileRow {
  binPrice: number;
  vol: number;
}

export interface ComputedSessionProfile {
  /** Unix seconds (UTC) of the session's first bar — the histogram's left anchor. */
  sessionStartSec: number;
  /**
   * Unix seconds (UTC) of the session's boundary end — approximated as the
   * NEXT session's first bar time, or (for the most recent/ongoing session)
   * this session's own last bar time. Used only to size the profile's
   * horizontal span (`profileWidthPct`) — see SessionVolumeProfileLayer.
   */
  sessionEndSec: number;
  /** Rows sorted ascending by binPrice. Empty when the session has zero volume. */
  rows: SessionProfileRow[];
  poc: number | null;
  vah: number | null;
  val: number | null;
  maxRowVol: number;
  totalVol: number;
  /** Price-bin width used for every row in this session (derived per-session from its own high/low range). */
  rowSize: number;
  /**
   * Unix seconds (UTC) of the first bar AFTER this session whose [low, high]
   * range overlaps the POC bin — i.e. where price "violates" the vPOC ray.
   * Null when no such bar exists among the bars passed to
   * computeSessionProfiles (the ray then extends to chart end).
   */
  pocViolationSec: number | null;
}

const DEFAULT_TARGET_ROW_COUNT = 50;

// ─── HH:MM parsing ───────────────────────────────────────────────────────────

/** Parses a 'HH:MM' string into minutes-since-midnight. Returns null if malformed or out of range. */
export function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

// ─── Timezone-aware wall-clock parts ─────────────────────────────────────────

/**
 * Resolves a unix-seconds timestamp's wall-clock parts in `tz`. Mirrors
 * chartStyleMapping.ts's `getZonedParts`, but also handles `tz === 'local'`
 * (no IANA override — reads the JS Date object in the browser's own local
 * timezone, exactly like lightweight-charts' own default formatting).
 */
function zonedPartsFor(timestampSeconds: number, tz: ChartTimezone): ZonedParts {
  const ianaZone = resolveIanaZone(tz);
  if (ianaZone) return getZonedParts(timestampSeconds, ianaZone);
  const d = new Date(timestampSeconds * 1000);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dayKey(p: ZonedParts): string {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Civil-date-only Monday-of-week key (ignores actual TZ offset — operates on already-resolved Y/M/D). */
function isoWeekMondayKey(p: ZonedParts): string {
  const utcMidnight = Date.UTC(p.year, p.month - 1, p.day);
  const dow = new Date(utcMidnight).getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (dow + 6) % 7; // Mon=0 offset
  const monday = new Date(utcMidnight - diffToMonday * 86_400_000);
  return `W${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

function monthKey(p: ZonedParts): string {
  return `M${p.year}-${pad2(p.month)}`;
}

/** Civil date one day before `p` (Y/M/D only — used by the overnight-custom-window branch). */
function previousCivilDayKey(p: ZonedParts): string {
  const utcMidnight = Date.UTC(p.year, p.month - 1, p.day);
  const prev = new Date(utcMidnight - 86_400_000);
  return `C${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}-${pad2(prev.getUTCDate())}`;
}

/**
 * Session key for a bar under 'custom' period (explicit HH:MM start/end).
 * Returns null when the bar falls outside the configured window — the caller
 * excludes such bars entirely (no session drawn there, per spec).
 * Handles overnight windows (startMin >= endMin, e.g. 18:00 -> 06:00): a bar
 * in the pre-midnight portion is keyed to TODAY; a bar in the post-midnight
 * portion is keyed to YESTERDAY (the day the overnight session began).
 */
function customSessionKey(p: ZonedParts, startMin: number, endMin: number): string | null {
  const minutesOfDay = p.hour * 60 + p.minute;
  if (startMin === endMin) return null; // degenerate zero-length window

  if (startMin < endMin) {
    if (minutesOfDay < startMin || minutesOfDay >= endMin) return null;
    return `C${dayKey(p)}`;
  }

  // Overnight window: [startMin, 1440) U [0, endMin)
  if (minutesOfDay >= startMin) return `C${dayKey(p)}`;
  if (minutesOfDay < endMin) return previousCivilDayKey(p);
  return null;
}

// ─── Session partitioning ────────────────────────────────────────────────────

interface SessionGroup {
  bars: Bar[];
  /** Index of the group's last bar within the ORIGINAL `bars` array passed to computeSessionProfiles. */
  endIdx: number;
}

/**
 * Groups bars (already ascending-by-time, per ChartDataSource's contract)
 * into consecutive per-session runs. A bar's session key never causes
 * reordering — bars sharing a key are always contiguous in a time-sorted
 * array, even when 'custom' excludes some bars (exclusions only ever happen
 * BETWEEN sessions, never inside one).
 */
export function partitionBarsIntoSessions(
  bars: Bar[],
  period: SessionPeriod,
  timezone: ChartTimezone,
  customSessionStart: string,
  customSessionEnd: string,
): SessionGroup[] {
  if (bars.length === 0) return [];

  const startMin = period === 'custom' ? parseHHMM(customSessionStart) : null;
  const endMin = period === 'custom' ? parseHHMM(customSessionEnd) : null;
  const customWindowValid = startMin !== null && endMin !== null;

  const groups: SessionGroup[] = [];
  let currentKey: string | null = null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const tSec = bar.time as unknown as number;
    const parts = zonedPartsFor(tSec, timezone);

    let key: string | null;
    switch (period) {
      case 'day':
        key = dayKey(parts);
        break;
      case 'week':
        key = isoWeekMondayKey(parts);
        break;
      case 'month':
        key = monthKey(parts);
        break;
      case 'custom':
        key = customWindowValid ? customSessionKey(parts, startMin!, endMin!) : null;
        break;
    }

    if (key === null) {
      currentKey = null; // next matching bar (if any) starts a fresh group
      continue;
    }

    if (key !== currentKey || groups.length === 0) {
      groups.push({ bars: [], endIdx: i });
      currentKey = key;
    }

    const g = groups[groups.length - 1];
    g.bars.push(bar);
    g.endIdx = i;
  }

  return groups;
}

// ─── Row-size derivation + volume distribution ───────────────────────────────

/**
 * Snaps a raw price step to a "nice" 1/2/5 x 10^n grid — avoids ugly
 * arbitrary bin boundaries (e.g. $0.0347) that would look wrong in a price
 * axis-aligned histogram.
 */
function snapToNiceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 0;
  const exponent = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exponent);
  const fraction = raw / base;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * base;
}

/**
 * Derives a per-session row (bin) size from the session's own high/low range,
 * targeting ~`targetRowCount` rows (spec: "40-60 rows per typical session
 * range"), snapped to a sane price step via snapToNiceStep.
 */
export function deriveSessionRowSize(sessionHigh: number, sessionLow: number, targetRowCount: number = DEFAULT_TARGET_ROW_COUNT): number {
  const range = sessionHigh - sessionLow;
  if (!(range > 0) || targetRowCount <= 0) return 0;
  return snapToNiceStep(range / targetRowCount);
}

/**
 * Distributes one bar's total volume UNIFORMLY across every price bin its
 * [low, high] range overlaps (see module header for the approximation this
 * implements) and accumulates into `acc` (binPrice -> vol).
 */
export function distributeBarVolumeToBins(bar: Bar, rowSize: number, acc: Map<number, number>): void {
  const vol = bar.volume ?? 0;
  if (!(vol > 0) || !(rowSize > 0)) return;

  const lowBin = Math.floor(bar.low / rowSize) * rowSize;
  const highBin = Math.floor(bar.high / rowSize) * rowSize;
  const binCount = Math.max(1, Math.round((highBin - lowBin) / rowSize) + 1);

  const volPerBin = vol / binCount;
  for (let i = 0; i < binCount; i++) {
    const price = lowBin + i * rowSize;
    acc.set(price, (acc.get(price) ?? 0) + volPerBin);
  }
}

// ─── Top-level: bars -> per-session profiles ────────────────────────────────

/**
 * Computes one ComputedSessionProfile per session found in `bars`. Pure and
 * cheap enough to call on every bars/settings change (NOT per animation
 * frame — see SessionVolumeProfileLayer's recompute-gating doc comment).
 */
export function computeSessionProfiles(
  bars: Bar[],
  period: SessionPeriod,
  timezone: ChartTimezone,
  customSessionStart: string,
  customSessionEnd: string,
  targetRowCount: number = DEFAULT_TARGET_ROW_COUNT,
): ComputedSessionProfile[] {
  const groups = partitionBarsIntoSessions(bars, period, timezone, customSessionStart, customSessionEnd);
  const profiles: ComputedSessionProfile[] = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.bars.length === 0) continue;

    const sessionStartSec = g.bars[0].time as unknown as number;
    const next = groups[i + 1];
    const sessionEndSec = next && next.bars.length > 0
      ? (next.bars[0].time as unknown as number)
      : (g.bars[g.bars.length - 1].time as unknown as number);

    let hi = -Infinity;
    let lo = Infinity;
    for (const b of g.bars) {
      if (b.high > hi) hi = b.high;
      if (b.low < lo) lo = b.low;
    }

    const rowSize = deriveSessionRowSize(hi, lo, targetRowCount);
    const acc = new Map<number, number>();
    if (rowSize > 0) {
      for (const b of g.bars) distributeBarVolumeToBins(b, rowSize, acc);
    }

    const rows: SessionProfileRow[] = Array.from(acc.entries())
      .map(([binPrice, vol]) => ({ binPrice, vol }))
      .sort((a, b) => a.binPrice - b.binPrice);

    const maxRowVol = rows.reduce((m, r) => Math.max(m, r.vol), 0);
    const totalVol = rows.reduce((s, r) => s + r.vol, 0);

    const { pocIdx, vahIdx, valIdx } = computeValueArea(rows.map((r) => ({ price: r.binPrice, vol: r.vol })));
    const poc = pocIdx === null ? null : rows[pocIdx].binPrice;
    const vah = vahIdx === null ? null : rows[vahIdx].binPrice;
    const val = valIdx === null ? null : rows[valIdx].binPrice;

    // vPOC-ray violation scan: first bar AFTER this session whose range
    // overlaps the POC bin. One linear pass per session (not per frame) —
    // bars.length is small (ChartTab caps its fetch window at 24h).
    let pocViolationSec: number | null = null;
    if (poc !== null && rowSize > 0) {
      const pocLow = poc;
      const pocHigh = poc + rowSize;
      for (let idx = g.endIdx + 1; idx < bars.length; idx++) {
        const b = bars[idx];
        if (b.high >= pocLow && b.low <= pocHigh) {
          pocViolationSec = b.time as unknown as number;
          break;
        }
      }
    }

    profiles.push({ sessionStartSec, sessionEndSec, rows, poc, vah, val, maxRowVol, totalVol, rowSize, pocViolationSec });
  }

  return profiles;
}
