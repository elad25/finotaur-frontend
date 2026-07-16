// src/components/charting/orderflow/flowStorePersistence.ts
//
// Local Session Recording (browser-side, IndexedDB) for the futures NT8
// footprint. While the NT8 desktop-agent bridge is live, the browser
// already accumulates every trade in a FlowBinStore — this module
// periodically snapshots that store's aggregated bins into IndexedDB so
// TODAY's session survives a bridge disconnect (NinjaTrader closed) or the
// user reopening the tab later the same day, instead of a dead "connect"
// panel replacing everything that was on screen a moment ago.
//
// Native IndexedDB only — no new dependency. Futures NT8 only (see
// FootprintTab.tsx's FuturesNt8FootprintBody, the only caller) — crypto
// (Binance) and Databento review data are never recorded here.
//
// Every operation is wrapped in try/catch and resolves to a safe fallback
// (undefined/null) rather than throwing — a persistence failure (private
// browsing, storage quota, unsupported browser) must NEVER interrupt or
// crash the live chart; it silently no-ops.

import type { SerializedFlowBinStore } from './flowBinStore';

const DB_NAME = 'finotaur-orderflow';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// Snapshots older than this are pruned on module init — a session recording
// is only ever useful for "today" (or, generously, "yesterday if it's just
// past midnight") so nothing needs to accumulate indefinitely in IndexedDB.
const PRUNE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

interface StoredSessionRecord {
  /** Primary key — `${symbol}|${yyyy-mm-dd}` (UTC day). */
  key: string;
  symbol: string;
  bins: SerializedFlowBinStore;
  /** Epoch ms of the most recent trade folded into `bins`. */
  lastTradeMs: number;
  /** Epoch ms this record was written — drives pruneOld()'s cutoff. */
  savedAtMs: number;
}

export interface LoadedSnapshot {
  bins: SerializedFlowBinStore;
  lastTradeMs: number;
}

function utcDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey(symbol: string): string {
  return `${symbol}|${utcDayKey(Date.now())}`;
}

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
 * Persists a snapshot under today's `${symbol}|yyyy-mm-dd` (UTC) key,
 * overwriting any prior snapshot for the same key. Fire-and-forget safe —
 * never rejects, never throws.
 */
export async function saveSnapshot(
  symbol: string,
  serializedBins: SerializedFlowBinStore,
  lastTradeMs: number,
): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    const record: StoredSessionRecord = {
      key: todayKey(symbol),
      symbol,
      bins: serializedBins,
      lastTradeMs,
      savedAtMs: Date.now(),
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
  } catch {
    // no-op — persistence must never break the live chart
  }
}

/**
 * Loads today's snapshot for `symbol` (UTC day), if any. Returns `null` on
 * a miss OR any failure — callers should treat both identically (no
 * recording to fall back to).
 */
export async function loadSnapshot(symbol: string): Promise<LoadedSnapshot | null> {
  try {
    const db = await openDb();
    if (!db) return null;

    return await new Promise<LoadedSnapshot | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(todayKey(symbol));
        req.onsuccess = () => {
          const rec = req.result as StoredSessionRecord | undefined;
          if (!rec) {
            resolve(null);
            return;
          }
          resolve({ bins: rec.bins, lastTradeMs: rec.lastTradeMs });
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
 * Deletes snapshots older than PRUNE_MAX_AGE_MS. Called once on module
 * init (see the bottom of this file) — best-effort, never throws.
 */
export async function pruneOld(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    const cutoff = Date.now() - PRUNE_MAX_AGE_MS;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const cursorReq = tx.objectStore(STORE_NAME).openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const rec = cursor.value as StoredSessionRecord;
          if (rec.savedAtMs < cutoff) cursor.delete();
          cursor.continue();
        };
        cursorReq.onerror = () => resolve();
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

// Prune once per module load (i.e. once per tab session) — cheap (a single
// cursor walk over what should be a handful of records: one per symbol per
// recent day) and keeps IndexedDB from accumulating stale sessions forever.
void pruneOld();
