/**
 * arenaViewState — cross-view "synced price scale" store (ATAS-parity).
 *
 * When the user pans/zooms one Trading Arena chart view (Chart / Footprint /
 * Liquidity / CVD) and switches to another for the SAME
 * `${assetClass}|${symbol}|${interval}`, the new view should open on the
 * same time window and price window instead of resetting to fitContent()
 * or a fresh rolling window. This module is the plain (no-React) keyed
 * store every view reads/writes — see FinotaurChart.tsx's `viewSyncKey`
 * prop doc comment for how the Chart/Footprint/Liquidity tabs wire it, and
 * CvdTab.tsx for how the CVD pane (which doesn't use FinotaurChart) wires
 * it directly.
 *
 * Deliberately NOT a React hook: multiple FinotaurChart instances and
 * CvdTab's raw lightweight-charts panes all need to read/write the SAME
 * entry without being mounted at the same time or sharing a React tree —
 * a plain keyed map (mirroring useLiquidityPreferences.ts / useDomPreferences.ts's
 * lazy-read / write-through / corrupt-JSON-safe convention, but backed by
 * sessionStorage instead of localStorage) is the simplest correct shape.
 *
 * sessionStorage (not localStorage): a saved view should survive a reload
 * within the same browser tab/session, but should NOT resurrect a
 * days-old zoom the next time the user opens the Arena — see FRESHNESS_MS.
 */

export const ARENA_VIEW_STATE_STORAGE_KEY = 'finotaur:arena:viewState:v1';

/** Saved views older than this are treated as absent on read (readViewState returns null). */
export const ARENA_VIEW_STATE_FRESHNESS_MS = 30 * 60 * 1000; // 30 minutes

export interface ArenaTimeRange {
  /** Unix seconds, UTC — matches FinotaurChart's `from`/`to` prop convention. */
  from: number;
  to: number;
}

export interface ArenaPriceRange {
  min: number;
  max: number;
}

export interface ArenaViewState {
  timeRange: ArenaTimeRange;
  /** null when the caller couldn't derive a meaningful price window (e.g. CVD's pane, which has no real "price" axis). */
  priceRange: ArenaPriceRange | null;
  /** Epoch ms this entry was last written — freshness is measured against this. */
  updatedAt: number;
}

type ArenaViewStateMap = Record<string, ArenaViewState>;

/**
 * Builds the shared key format every Arena chart view uses —
 * `${assetClass}|${symbol}|${interval}`. Deliberately keyed by assetClass
 * (not the underlying feed/venue name) so, e.g., ChartTab's Binance-native
 * symbol and FootprintTab's resolved contract symbol still agree as long as
 * they're the same top-level Arena symbol/interval/assetClass selection.
 */
export function buildViewSyncKey(assetClass: string, symbol: string, interval: string): string {
  return `${assetClass}|${symbol}|${interval}`;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function sanitizeTimeRange(raw: unknown): ArenaTimeRange | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isFiniteNumber(r.from) || !isFiniteNumber(r.to)) return null;
  return { from: r.from, to: r.to };
}

function sanitizePriceRange(raw: unknown): ArenaPriceRange | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isFiniteNumber(r.min) || !isFiniteNumber(r.max)) return null;
  return { min: r.min, max: r.max };
}

function sanitizeEntry(raw: unknown): ArenaViewState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const timeRange = sanitizeTimeRange(r.timeRange);
  if (!timeRange || !isFiniteNumber(r.updatedAt)) return null;
  return {
    timeRange,
    priceRange: sanitizePriceRange(r.priceRange),
    updatedAt: r.updatedAt,
  };
}

function readAll(): ArenaViewStateMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(ARENA_VIEW_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: ArenaViewStateMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = sanitizeEntry(value);
      if (entry) out[key] = entry;
    }
    return out;
  } catch {
    // Corrupt JSON / blocked storage — fall back silently to "no saved views".
    return {};
  }
}

function writeAll(map: ArenaViewStateMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ARENA_VIEW_STATE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full / blocked (private mode) — non-fatal; sync just won't
    // survive a reload this session, the live chart is unaffected.
  }
}

/**
 * Reads the saved view for `key`. Returns null when absent OR stale (older
 * than ARENA_VIEW_STATE_FRESHNESS_MS) so a days-old zoom never silently
 * reappears. `nowMs` is overridable for tests (defaults to `Date.now()`,
 * evaluated at call time — mocking `Date.now` works without passing it).
 */
export function readViewState(key: string, nowMs: number = Date.now()): ArenaViewState | null {
  const entry = readAll()[key];
  if (!entry) return null;
  if (nowMs - entry.updatedAt > ARENA_VIEW_STATE_FRESHNESS_MS) return null;
  return entry;
}

/**
 * Writes (replaces) the saved view for `key`. `updatedAt` is always
 * stamped to `nowMs` (default `Date.now()`) — callers only supply
 * `timeRange`/`priceRange`.
 */
export function writeViewState(
  key: string,
  state: { timeRange: ArenaTimeRange; priceRange: ArenaPriceRange | null },
  nowMs: number = Date.now(),
): void {
  const map = readAll();
  map[key] = { timeRange: state.timeRange, priceRange: state.priceRange, updatedAt: nowMs };
  writeAll(map);
}
