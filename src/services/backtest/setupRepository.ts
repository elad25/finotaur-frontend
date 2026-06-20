// ============================================================================
// SETUP REPOSITORY
// Supabase-first persistence for SetupDefinitions and SavedRuns, with a
// localStorage fallback. All public functions are ASYNC.
//
// Strategy:
//   - When an authenticated user exists AND the Supabase call succeeds, data
//     lives in the owner-scoped tables `bt_setups` / `bt_runs` / `bt_detections`.
//   - On ANY failure (no auth, network error, RLS rejection) we transparently
//     fall back to localStorage so the UI keeps working offline / logged out.
//   - We NEVER throw to the caller — failures are logged via console.warn and
//     resolved against localStorage.
//
// localStorage keys remain namespaced under 'finotaur.autobt.*' (unchanged) so
// previously-saved local data is preserved.
// ============================================================================

import { supabase } from '@/lib/supabase';
import type { Detection, SetupDefinition, Zone } from '@/core/auto/types';
import type {
  AutoBacktestResult,
  BacktestStatisticsLike,
  EquityCurvePoint,
  RMultipleDistribution,
} from '@/core/auto/AutoBacktestEngine';
import type { AutoPosition } from '@/core/auto/signalToPosition';

// ---------------------------------------------------------------------------
// SavedRun shape
// ---------------------------------------------------------------------------

/** A persisted snapshot of a completed run. */
export interface SavedRun {
  id: string;
  /** Immutable snapshot of the setup at run time. */
  setupSnapshot: SetupDefinition;
  symbol: string;
  timeframe: string;
  /** Range start, ms (Unix epoch). */
  from: number;
  /** Range end, ms (Unix epoch). */
  to: number;
  statistics: BacktestStatisticsLike;
  equityCurve: EquityCurvePoint[];
  detections: Detection[];
  trades: AutoPosition[];
  rMultipleDistribution?: RMultipleDistribution;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Storage keys (localStorage fallback)
// ---------------------------------------------------------------------------

const SETUPS_KEY = 'finotaur.autobt.setups.v1';
const RUNS_KEY = 'finotaur.autobt.runs.v1';
const MAX_RUNS = 50;
const ENGINE_VERSION = 'auto-v1';

// ---------------------------------------------------------------------------
// ID generation (no external deps)
// ---------------------------------------------------------------------------

/** Generate a stable unique id, preferring crypto.randomUUID when available. */
function makeId(): string {
  const c =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `id` is a canonical UUID (the `bt_setups.id` / `bt_runs.id` shape). */
function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/** Return the current authenticated user id, or null when logged out. */
async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ===========================================================================
// localStorage fallback helpers — used whenever Supabase is unavailable.
// ===========================================================================

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted JSON — return the safe fallback.
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or unavailable — fail silently.
    console.warn(`[setupRepository] Failed to write to localStorage key "${key}".`);
  }
}

// --- setups (local) -------------------------------------------------------

function localListSetups(): SetupDefinition[] {
  const map = readJSON<Record<string, SetupDefinition>>(SETUPS_KEY, {});
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

function localGetSetup(id: string): SetupDefinition | null {
  const map = readJSON<Record<string, SetupDefinition>>(SETUPS_KEY, {});
  return map[id] ?? null;
}

function localSaveSetup(setup: SetupDefinition): SetupDefinition {
  const map = readJSON<Record<string, SetupDefinition>>(SETUPS_KEY, {});
  const saved = { ...setup, updatedAt: Date.now() };
  map[setup.id] = saved;
  writeJSON(SETUPS_KEY, map);
  return saved;
}

function localDeleteSetup(id: string): void {
  const map = readJSON<Record<string, SetupDefinition>>(SETUPS_KEY, {});
  delete map[id];
  writeJSON(SETUPS_KEY, map);
}

// --- runs (local) ---------------------------------------------------------

function localListRuns(): SavedRun[] {
  const arr = readJSON<SavedRun[]>(RUNS_KEY, []);
  return arr.slice(0, MAX_RUNS);
}

function localGetRun(id: string): SavedRun | null {
  const arr = readJSON<SavedRun[]>(RUNS_KEY, []);
  return arr.find((r) => r.id === id) ?? null;
}

function localSaveRun(run: SavedRun): SavedRun {
  const arr = readJSON<SavedRun[]>(RUNS_KEY, []);
  const filtered = arr.filter((r) => r.id !== run.id);
  const next = [run, ...filtered].slice(0, MAX_RUNS);
  writeJSON(RUNS_KEY, next);
  return run;
}

function localDeleteRun(id: string): void {
  const arr = readJSON<SavedRun[]>(RUNS_KEY, []);
  writeJSON(RUNS_KEY, arr.filter((r) => r.id !== id));
}

// ===========================================================================
// Supabase row <-> domain mappers
// ===========================================================================

interface BtSetupRow {
  id: string;
  name: string;
  schema_version: number;
  definition: SetupDefinition;
  is_shared: boolean;
  updated_at: string;
}

/** The `definition` jsonb IS the SetupDefinition; we re-stamp id/name from the row. */
function rowToSetup(row: BtSetupRow): SetupDefinition {
  return {
    ...row.definition,
    id: row.id,
    name: row.name,
  };
}

interface BtRunRow {
  id: string;
  setup_snapshot: SetupDefinition;
  symbol: string;
  timeframe: string;
  from_ts: number | string;
  to_ts: number | string;
  statistics: BacktestStatisticsLike;
  equity_curve: EquityCurvePoint[];
  r_multiple_distribution: RMultipleDistribution | null;
  created_at: string;
}

interface BtDetectionRow {
  pattern_type: Detection['patternType'];
  direction: 'long' | 'short';
  formed_at_index: number;
  zone_top: number | string;
  zone_bottom: number | string;
  entry_price: number | string | null;
  entry_ts: number | string | null;
  stop_loss: number | string | null;
  take_profit: number | string | null;
  exit_price: number | string | null;
  exit_ts: number | string | null;
  exit_reason: string | null;
  realized_pnl: number | string | null;
  r_multiple: number | string | null;
  meta: Record<string, unknown> | null;
}

function toNum(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : undefined;
}

/** Reconstruct Detection[] from bt_detections rows (zone + refSwing from meta). */
function rowToDetection(row: BtDetectionRow): Detection {
  const zone: Zone = {
    top: toNum(row.zone_top) ?? 0,
    bottom: toNum(row.zone_bottom) ?? 0,
  };
  const meta =
    (row.meta?.detectionMeta as Detection['meta'] | undefined) ?? {};
  const refSwing = row.meta?.refSwing as Detection['refSwing'] | undefined;
  return {
    patternType: row.pattern_type,
    direction: row.direction,
    formedAtIndex: row.formed_at_index,
    zone,
    refSwing,
    meta,
  };
}

/** Reconstruct an AutoPosition (trade) from a bt_detections row. */
function rowToTrade(row: BtDetectionRow): AutoPosition {
  const tradeMeta = (row.meta?.trade as Partial<AutoPosition> | undefined) ?? {};
  return {
    symbol: typeof tradeMeta.symbol === 'string' ? tradeMeta.symbol : 'AUTO',
    type: row.direction,
    entryPrice: toNum(row.entry_price) ?? 0,
    size: typeof tradeMeta.size === 'number' ? tradeMeta.size : 0,
    stopLoss: toNum(row.stop_loss) ?? 0,
    takeProfit: toNum(row.take_profit) ?? 0,
    entryTime: toNum(row.entry_ts) ?? 0,
    status: 'closed',
    exitPrice: toNum(row.exit_price),
    exitTime: toNum(row.exit_ts),
    exitReason:
      (row.exit_reason as AutoPosition['exitReason'] | null) ?? undefined,
    realizedPnl: toNum(row.realized_pnl),
    realizedPnlPercent: tradeMeta.realizedPnlPercent,
    riskRewardRatio: tradeMeta.riskRewardRatio,
    riskAmount: tradeMeta.riskAmount,
  };
}

/**
 * Build bt_detections insert rows for a run. We pack the parts of Detection
 * and AutoPosition that have no dedicated column into `meta` so getRun can
 * faithfully reconstruct both arrays. Trades and detections are aligned by
 * index where possible; surplus detections (no matching trade) are still
 * persisted so the chart overlay keeps all zones.
 */
function buildDetectionRows(
  run: SavedRun,
  runId: string,
  userId: string,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  run.detections.forEach((d, i) => {
    const trade: AutoPosition | undefined = run.trades[i];
    rows.push({
      run_id: runId,
      user_id: userId,
      pattern_type: d.patternType,
      direction: d.direction,
      formed_at_index: d.formedAtIndex,
      formed_at_ts: null,
      zone_top: d.zone.top,
      zone_bottom: d.zone.bottom,
      entry_price: trade?.entryPrice ?? null,
      entry_ts: trade?.entryTime ?? null,
      stop_loss: trade?.stopLoss ?? null,
      take_profit: trade?.takeProfit ?? null,
      exit_price: trade?.exitPrice ?? null,
      exit_ts: trade?.exitTime ?? null,
      exit_reason: trade?.exitReason ?? null,
      realized_pnl: trade?.realizedPnl ?? null,
      r_multiple: null,
      meta: {
        detectionMeta: d.meta,
        refSwing: d.refSwing ?? null,
        trade: trade
          ? {
              symbol: trade.symbol,
              size: trade.size,
              realizedPnlPercent: trade.realizedPnlPercent ?? null,
              riskRewardRatio: trade.riskRewardRatio ?? null,
              riskAmount: trade.riskAmount ?? null,
            }
          : null,
      },
    });
  });

  return rows;
}

const EMPTY_R_DISTRIBUTION: RMultipleDistribution = {
  '< -2R': 0,
  '-2R to -1R': 0,
  '-1R to 0R': 0,
  '0R to 1R': 0,
  '1R to 2R': 0,
  '2R to 3R': 0,
  '> 3R': 0,
};

// ===========================================================================
// SetupDefinition CRUD (public, async, Supabase-first)
// ===========================================================================

/** Return all saved setups, newest first. Falls back to localStorage. */
export async function listSetups(): Promise<SetupDefinition[]> {
  const userId = await getUserId();
  if (!userId) return localListSetups();
  try {
    const { data, error } = await supabase
      .from('bt_setups')
      .select('id, name, schema_version, definition, is_shared, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as BtSetupRow[]).map(rowToSetup);
  } catch (err) {
    console.warn('[setupRepository] listSetups: Supabase failed, using localStorage.', err);
    return localListSetups();
  }
}

/** Return a single setup by id, or null. Falls back to localStorage. */
export async function getSetup(id: string): Promise<SetupDefinition | null> {
  const userId = await getUserId();
  if (!userId) return localGetSetup(id);
  try {
    const { data, error } = await supabase
      .from('bt_setups')
      .select('id, name, schema_version, definition, is_shared, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSetup(data as BtSetupRow) : localGetSetup(id);
  } catch (err) {
    console.warn('[setupRepository] getSetup: Supabase failed, using localStorage.', err);
    return localGetSetup(id);
  }
}

/**
 * Upsert a setup. Bumps `updatedAt` to now. Persists the full SetupDefinition
 * as the `definition` jsonb. Falls back to localStorage on failure / no auth.
 */
export async function saveSetup(setup: SetupDefinition): Promise<SetupDefinition> {
  const stamped: SetupDefinition = { ...setup, updatedAt: Date.now() };
  const userId = await getUserId();
  if (!userId) return localSaveSetup(stamped);
  // `bt_setups.id` is uuid; legacy `setup_*` ids (from makeDefaultSetup) must be
  // upgraded to a UUID on first cloud save so the upsert targets the PK column.
  const dbId = isUuid(stamped.id) ? stamped.id : makeId();
  const persisted: SetupDefinition = { ...stamped, id: dbId };
  try {
    const { data, error } = await supabase
      .from('bt_setups')
      .upsert(
        {
          id: persisted.id,
          user_id: userId,
          name: persisted.name,
          schema_version: persisted.schemaVersion,
          definition: persisted,
          is_shared: false,
          updated_at: new Date(persisted.updatedAt).toISOString(),
        },
        { onConflict: 'id' },
      )
      .select('id, name, schema_version, definition, is_shared, updated_at')
      .single();
    if (error) throw error;
    return rowToSetup(data as BtSetupRow);
  } catch (err) {
    console.warn('[setupRepository] saveSetup: Supabase failed, using localStorage.', err);
    return localSaveSetup(stamped);
  }
}

/** Delete a setup by id. Falls back to localStorage on failure / no auth. */
export async function deleteSetup(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    localDeleteSetup(id);
    return;
  }
  try {
    const { error } = await supabase.from('bt_setups').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('[setupRepository] deleteSetup: Supabase failed, using localStorage.', err);
    localDeleteSetup(id);
  }
}

// ===========================================================================
// SavedRun CRUD (public, async, Supabase-first)
// ===========================================================================

/** Return all saved runs, newest first. Falls back to localStorage. */
export async function listRuns(): Promise<SavedRun[]> {
  const userId = await getUserId();
  if (!userId) return localListRuns();
  try {
    const { data, error } = await supabase
      .from('bt_runs')
      .select(
        'id, setup_snapshot, symbol, timeframe, from_ts, to_ts, statistics, equity_curve, r_multiple_distribution, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_RUNS);
    if (error) throw error;
    // List view does not need per-trade detail — detections/trades resolve lazily in getRun.
    return (data as BtRunRow[]).map((row) => ({
      id: row.id,
      setupSnapshot: row.setup_snapshot,
      symbol: row.symbol,
      timeframe: row.timeframe,
      from: toNum(row.from_ts) ?? 0,
      to: toNum(row.to_ts) ?? 0,
      statistics: row.statistics,
      equityCurve: row.equity_curve ?? [],
      detections: [],
      trades: [],
      rMultipleDistribution: row.r_multiple_distribution ?? EMPTY_R_DISTRIBUTION,
      createdAt: new Date(row.created_at).getTime(),
    }));
  } catch (err) {
    console.warn('[setupRepository] listRuns: Supabase failed, using localStorage.', err);
    return localListRuns();
  }
}

/**
 * Return a single run by id, fully reconstructed (statistics + equity_curve
 * from bt_runs; detections + trades rebuilt from bt_detections rows). The
 * per-trade reconstruction is approximate but renders identically. Falls back
 * to localStorage on failure / no auth.
 */
export async function getRun(id: string): Promise<SavedRun | null> {
  const userId = await getUserId();
  if (!userId) return localGetRun(id);
  try {
    const { data: runData, error: runError } = await supabase
      .from('bt_runs')
      .select(
        'id, setup_snapshot, symbol, timeframe, from_ts, to_ts, statistics, equity_curve, r_multiple_distribution, created_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (runError) throw runError;
    if (!runData) return localGetRun(id);
    const row = runData as BtRunRow;

    const { data: detData, error: detError } = await supabase
      .from('bt_detections')
      .select(
        'pattern_type, direction, formed_at_index, zone_top, zone_bottom, entry_price, entry_ts, stop_loss, take_profit, exit_price, exit_ts, exit_reason, realized_pnl, r_multiple, meta',
      )
      .eq('run_id', id)
      .order('formed_at_index', { ascending: true });
    if (detError) throw detError;

    const detRows = (detData ?? []) as BtDetectionRow[];
    const detections = detRows.map(rowToDetection);
    // Only rows that carried trade detail become trades (others are zone-only).
    const trades = detRows
      .filter((r) => r.entry_price !== null && r.entry_price !== undefined)
      .map(rowToTrade);

    return {
      id: row.id,
      setupSnapshot: row.setup_snapshot,
      symbol: row.symbol,
      timeframe: row.timeframe,
      from: toNum(row.from_ts) ?? 0,
      to: toNum(row.to_ts) ?? 0,
      statistics: row.statistics,
      equityCurve: row.equity_curve ?? [],
      detections,
      trades,
      rMultipleDistribution: row.r_multiple_distribution ?? EMPTY_R_DISTRIBUTION,
      createdAt: new Date(row.created_at).getTime(),
    };
  } catch (err) {
    console.warn('[setupRepository] getRun: Supabase failed, using localStorage.', err);
    return localGetRun(id);
  }
}

/**
 * Persist a new run. Inserts into bt_runs, then best-effort bulk-inserts
 * bt_detections (a detection insert failure does NOT discard the run). Runs are
 * immutable snapshots. Falls back to localStorage on failure / no auth.
 */
export async function saveRun(run: SavedRun): Promise<SavedRun> {
  const userId = await getUserId();
  if (!userId) return localSaveRun(run);
  try {
    const { data, error } = await supabase
      .from('bt_runs')
      .insert({
        id: run.id,
        user_id: userId,
        setup_id: null,
        setup_snapshot: run.setupSnapshot,
        symbol: run.symbol,
        timeframe: run.timeframe,
        source: run.setupSnapshot.instrument.source,
        from_ts: run.from,
        to_ts: run.to,
        initial_balance: run.setupSnapshot.risk.initialBalance,
        statistics: run.statistics,
        equity_curve: run.equityCurve,
        r_multiple_distribution: run.rMultipleDistribution ?? EMPTY_R_DISTRIBUTION,
        engine_version: ENGINE_VERSION,
      })
      .select('id')
      .single();
    if (error) throw error;

    const runId = (data as { id: string }).id;

    // Best-effort: persist per-detection / per-trade detail. Never block the run.
    const detectionRows = buildDetectionRows(run, runId, userId);
    if (detectionRows.length > 0) {
      const { error: detError } = await supabase
        .from('bt_detections')
        .insert(detectionRows);
      if (detError) {
        console.warn(
          '[setupRepository] saveRun: detections insert failed (run kept).',
          detError,
        );
      }
    }

    return { ...run, id: runId };
  } catch (err) {
    console.warn('[setupRepository] saveRun: Supabase failed, using localStorage.', err);
    return localSaveRun(run);
  }
}

/** Delete a run by id. bt_detections cascade by FK / RLS. Falls back to localStorage. */
export async function deleteRun(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    localDeleteRun(id);
    return;
  }
  try {
    const { error } = await supabase.from('bt_runs').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('[setupRepository] deleteRun: Supabase failed, using localStorage.', err);
    localDeleteRun(id);
  }
}

// ---------------------------------------------------------------------------
// Factory: build a SavedRun from a completed result
// ---------------------------------------------------------------------------

/**
 * Build a SavedRun from the engine result + run metadata.
 * @param meta.from / meta.to  range bounds in ms (Unix epoch)
 */
export function buildSavedRun(
  setup: SetupDefinition,
  result: AutoBacktestResult,
  meta: { symbol: string; timeframe: string; from: number; to: number },
): SavedRun {
  return {
    id: makeId(),
    setupSnapshot: JSON.parse(JSON.stringify(setup)) as SetupDefinition,
    symbol: meta.symbol,
    timeframe: meta.timeframe,
    from: meta.from,
    to: meta.to,
    statistics: result.statistics,
    equityCurve: result.equityCurve,
    detections: result.detections,
    trades: result.trades,
    rMultipleDistribution: result.rMultipleDistribution,
    createdAt: Date.now(),
  };
}
