// src/pages/app/trading-arena/hooks/depthHistoryStore.ts
//
// IndexedDB persistence for the Liquidity heatmap's depth-column rings —
// Bookmap-parity "pulled-liquidity memory". Phase 1 wired the NT8 futures
// path (useLiveDepthColumns.ts, sourceKey `nt8|<root>`); phase 2 added the
// crypto path (useDepthSlices.ts, sourceKey `binance|<symbol>`) so the
// heatmap survives tab switches and reloads even though the server's
// `crypto_depth_slices` table is UNLOGGED (wiped on every DB restart). Both
// callers share this one store keyed by an opaque sourceKey string.
//
// Mirrors src/components/charting/orderflow/flowStorePersistence.ts's
// conventions (single shared DB-open promise reused across calls, every
// IndexedDB op wrapped in try/catch, resolves to a safe fallback rather
// than throwing) — read that file's header first if this one is unclear.
// A DISTINCT DB ("finotaur-depth") and object store ("columns") are used —
// kept separate from "finotaur-orderflow" because the shape (a single
// DecodedColumn[] ring keyed by sourceKey, no "today"/day-boundary
// concept) and lifecycle (throttled saves every 30s during a live session)
// differ from the flow-bin session-snapshot use case.
//
// Every exported IndexedDB-touching function is fire-and-forget safe —
// never rejects, never throws — a persistence failure (private browsing,
// storage quota, unsupported browser) must NEVER interrupt or crash the
// live chart. The pure helpers (capColumnsForSave / selectKeysToPrune /
// buildGapColumn / needsGapColumn / mergeRestoredColumns) are exported
// standalone and unit-tested without an IndexedDB harness, same convention
// as useLiveDepthColumns.ts's sampleBookToColumn/appendColumnToRing (see
// that file's header comment).

import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';

const DB_NAME = 'finotaur-depth';
const DB_VERSION = 1;
const STORE_NAME = 'columns';

// Duplicated from useLiveDepthColumns.ts's RING_CAP (~4h @ 5s/column)
// rather than imported — this module is imported BY useLiveDepthColumns.ts,
// so importing RING_CAP back would create a circular module dependency.
const DEFAULT_CAP = 2_880;

// Snapshots older than this are pruned — mirrors flowStorePersistence.ts's
// PRUNE_MAX_AGE_MS (48h), also independently the "is this restore too
// stale to seed the ring with" cutoff useLiveDepthColumns.ts applies.
const PRUNE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
// LRU cap on distinct sourceKeys (e.g. one per contract root /
// source|symbol pair) — a handful of roots is the realistic ceiling, this
// just guards against unbounded growth if many symbols get sampled.
const PRUNE_MAX_KEYS = 8;

interface StoredDepthRecord {
  /** Primary key — caller-provided sourceKey, e.g. "nt8|NQ" or "binance|BTCUSDT". */
  key: string;
  columns: DecodedColumn[];
  /** Epoch ms this record was written — drives pruneDepthHistory()'s age cutoff and LRU ordering. */
  savedAtMs: number;
  notionalMultiplier?: number;
}

export interface LoadedDepthHistory {
  columns: DecodedColumn[];
  savedAtMs: number;
}

// ─── Pure helpers (unit-testable without IndexedDB) ─────────────────────

/**
 * Caps `columns` to the newest `cap` entries (default DEFAULT_CAP) —
 * defensive mirror of useLiveDepthColumns.ts's appendColumnToRing cap,
 * applied again on save/restore in case the caller passes an uncapped
 * array. `columns` is assumed oldest-first (ring convention).
 */
export function capColumnsForSave(columns: DecodedColumn[], cap: number = DEFAULT_CAP): DecodedColumn[] {
  if (columns.length <= cap) return columns;
  return columns.slice(columns.length - cap);
}

/**
 * Pure selection: given every stored record's key + savedAtMs, returns the
 * keys to delete — anything older than `maxAgeMs`, PLUS the LRU tail (by
 * savedAtMs, oldest of the survivors first) once age-pruning alone still
 * leaves more than `maxKeys` records. Extracted so prune logic is
 * unit-testable without an IndexedDB cursor walk.
 */
export function selectKeysToPrune(
  records: Array<{ key: string; savedAtMs: number }>,
  nowMs: number,
  maxAgeMs: number,
  maxKeys: number,
): string[] {
  const cutoff = nowMs - maxAgeMs;
  const toDelete = new Set<string>();
  const survivors: Array<{ key: string; savedAtMs: number }> = [];
  for (const rec of records) {
    if (rec.savedAtMs < cutoff) toDelete.add(rec.key);
    else survivors.push(rec);
  }
  if (survivors.length > maxKeys) {
    survivors.sort((a, b) => b.savedAtMs - a.savedAtMs); // newest first
    for (const rec of survivors.slice(maxKeys)) toDelete.add(rec.key);
  }
  return [...toDelete];
}

/**
 * Builds a synthetic transparent gap column (flags bit0 set, no bids/asks)
 * to insert between a restored ring's newest column and the first live
 * sample after a restore — DepthMatrixLayer already treats flags-bit0
 * columns as transparent (`col.flags & 1` — see its header comment), so
 * this renders as a clean gap instead of a smeared band bridging stale and
 * fresh depth data. `anchor`/`binSize` are carried over from `afterColumn`
 * purely for shape consistency; they have no visual effect on a
 * transparent column.
 */
export function buildGapColumn(afterColumn: DecodedColumn, tMs: number): DecodedColumn {
  return {
    t: tMs,
    anchor: afterColumn.anchor,
    binSize: afterColumn.binSize,
    flags: 1,
    bids: [],
    asks: [],
  };
}

/**
 * Whether a gap column should be inserted between a restored ring's newest
 * column (`lastRestoredT`) and the first live sample (`firstLiveT`) —
 * true once the gap exceeds 2x the sample interval, matching the
 * "meaningful outage" threshold rather than firing on every ordinary
 * restore-then-resume that lands within a couple of sample ticks.
 */
export function needsGapColumn(lastRestoredT: number, firstLiveT: number, sampleIntervalMs: number): boolean {
  return firstLiveT - lastRestoredT > 2 * sampleIntervalMs;
}

/**
 * Fill-the-gaps merge for the crypto Liquidity heatmap's phase-2 restore
 * (useDepthSlices.ts): combines a restored ring loaded from IndexedDB with
 * the current session's authoritative columns (server backfill + live
 * edge), deduping by exact column `t`. `authoritative` always wins a
 * collision — the server/live sample for a given timestamp is the ground
 * truth; `restored` only fills timestamps `authoritative` has not (yet)
 * produced. Unlike the NT8 ring (a single ordered array with one splice
 * point), useDepthSlices.ts already re-derives its visible columns from
 * TWO source maps (historicalRef + liveEdgeRef) onto a uniform time grid
 * every render — adding `restored` as a third source feeding the same
 * grid rebuild, deduped here first, is the smallest change that fits that
 * shape. Result is sorted ascending by `t` (ring convention).
 */
export function mergeRestoredColumns(
  restored: DecodedColumn[],
  authoritative: DecodedColumn[],
): DecodedColumn[] {
  const byT = new Map<number, DecodedColumn>();
  for (const col of restored) byT.set(col.t, col);
  for (const col of authoritative) byT.set(col.t, col); // authoritative overwrites on any exact-t collision
  return Array.from(byT.values()).sort((a, b) => a.t - b.t);
}

// ─── IndexedDB plumbing (mirrors flowStorePersistence.ts) ───────────────

// Single shared DB-open promise — every save/load/prune call reuses it
// instead of re-opening the connection. Resolves to `null` (never rejects)
// on any failure so callers just treat a null DB as "persistence is off".
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        } catch {
          // Best-effort — a failed upgrade just means persistence stays off.
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Persists `columns` under `sourceKey`, overwriting any prior entry for the
 * same key. The caller is responsible for throttling call frequency (this
 * function does not debounce/rate-limit itself). `columns` is capped to
 * the newest DEFAULT_CAP entries defensively before writing. Structured-
 * clone-safe (DecodedColumn is plain JSON-serializable data) — quota or
 * serialization errors are swallowed and logged, never thrown to the
 * caller.
 */
export async function saveDepthHistory(
  sourceKey: string,
  columns: DecodedColumn[],
  meta?: { notionalMultiplier?: number },
): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    const record: StoredDepthRecord = {
      key: sourceKey,
      columns: capColumnsForSave(columns),
      savedAtMs: Date.now(),
      notionalMultiplier: meta?.notionalMultiplier,
    };

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch (err) {
    // Persistence must never break the live chart — swallow, log for
    // visibility only (e.g. quota exceeded, structured-clone failure).
    console.warn('[depthHistoryStore] saveDepthHistory failed', err);
  }
}

/**
 * Loads the stored history for `sourceKey`, if any. Returns `null` on a
 * miss OR any failure — callers should treat both identically (no history
 * to restore from).
 */
export async function loadDepthHistory(sourceKey: string): Promise<LoadedDepthHistory | null> {
  try {
    const db = await openDb();
    if (!db) return null;

    return await new Promise<LoadedDepthHistory | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(sourceKey);
        req.onsuccess = () => {
          const rec = req.result as StoredDepthRecord | undefined;
          if (!rec) {
            resolve(null);
            return;
          }
          resolve({ columns: rec.columns, savedAtMs: rec.savedAtMs });
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Deletes stale entries (older than `maxAgeMs`) and LRU-trims beyond
 * `maxKeys` (by savedAtMs) — call opportunistically on load, not on a
 * fixed schedule. Best-effort, never throws.
 */
export async function pruneDepthHistory(
  maxAgeMs: number = PRUNE_MAX_AGE_MS,
  maxKeys: number = PRUNE_MAX_KEYS,
): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    const records: Array<{ key: string; savedAtMs: number }> = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const out: Array<{ key: string; savedAtMs: number }> = [];
        const cursorReq = tx.objectStore(STORE_NAME).openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const rec = cursor.value as StoredDepthRecord;
          out.push({ key: rec.key, savedAtMs: rec.savedAtMs });
          cursor.continue();
        };
        cursorReq.onerror = () => resolve(out);
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => resolve(out);
        tx.onabort = () => resolve(out);
      } catch {
        resolve([]);
      }
    });

    const keysToDelete = selectKeysToPrune(records, Date.now(), maxAgeMs, maxKeys);
    if (keysToDelete.length === 0) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const key of keysToDelete) store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // no-op
  }
}
