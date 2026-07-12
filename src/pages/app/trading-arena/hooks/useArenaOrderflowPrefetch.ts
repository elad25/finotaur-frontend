/**
 * useArenaOrderflowPrefetch — fire-and-forget order-flow warm-up on Arena
 * mount (PR 3, H4).
 *
 * When the Trading Arena mounts (or the symbol/asset-class changes) on a
 * CRYPTO symbol — regardless of which tab is active — this quietly
 * backfills a phase-1-sized window of raw trades straight into
 * flowStoreCache.ts. No FlowBinStore is created, nothing renders. If the
 * user later opens the Order Flow tab for the same symbol,
 * useOrderFlow.ts's cache-hit path paints instantly instead of waiting on a
 * fresh backfill walk.
 *
 * Deliberately crypto-only and Binance-only: it's the only venue with both
 * a client-side REST backfill AND a live (non-admin) audience that
 * routinely lands on the Order Flow tab. Futures cache warm-up is a
 * separate, admin-only, SERVER-side concern — see
 * DatabentoTradeSource.ts's warmOrderflowCache(), called from
 * FootprintTab.tsx's FuturesFootprintBody mount instead.
 *
 * Aborted on symbol/asset-class change or unmount via the source's own
 * AbortSignal support (BinanceTradeSource.backfill's `opts.signal`).
 *
 * In-flight de-dup: landing directly on the Footprint tab mounts this
 * prefetch AND useOrderFlow.ts's own cache-miss backfill walk in the same
 * render pass, before either one's cache write lands — a plain cache check
 * alone can't see the other's in-progress walk. Both sides register/check a
 * shared in-flight-promise registry in flowStoreCache.ts keyed by the same
 * cache key; whichever one starts first wins, the other skips/reuses its
 * result instead of firing a near-duplicate REST walk.
 */

import { useEffect } from 'react';
import { BinanceTradeSource } from '@/components/charting/orderflow/BinanceTradeSource';
import {
  buildCacheKey,
  getCachedTrades,
  putCachedTrades,
  getInFlightBackfill,
  registerInFlightBackfill,
} from '@/components/charting/orderflow/flowStoreCache';
import type { AssetClass } from '@/components/backtest/symbolUniverse';

// Mirrors useOrderFlow.ts's PHASE1_MAX_REQUESTS — a fast, small first-paint
// budget. The FULL historical walk only ever happens once the user actually
// opens the Order Flow tab (useOrderFlow's own two-phase backfill, H3).
const PREFETCH_MAX_REQUESTS = 15;

// Prefetch doesn't know the user's eventual intervalSec (that's a tab-level
// concern the Arena header selects independently of which tab is open) —
// it just grabs the most recent slice of raw trades up to the request
// budget above, capped at a generous 24h lookback ceiling. useOrderFlow
// re-bins whatever's cached against whatever intervalSec is active once the
// Order Flow tab actually mounts (see flowStoreCache.ts's venue+symbol-only
// key decision — raw trades are interval-agnostic).
const PREFETCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export function useArenaOrderflowPrefetch(symbol: string, assetClass: AssetClass): void {
  useEffect(() => {
    if (assetClass !== 'crypto') return;

    const cacheKey = buildCacheKey('binance', symbol);
    if (getCachedTrades(cacheKey)) return; // already warm — nothing to do
    if (getInFlightBackfill(cacheKey)) return; // useOrderFlow's own cache-miss walk already covers this key — avoid a duplicate REST walk

    const controller = new AbortController();
    const toMs = Date.now();
    const fromMs = toMs - PREFETCH_WINDOW_MS;

    const backfillPromise = BinanceTradeSource.backfill(symbol, fromMs, toMs, {
      signal: controller.signal,
      maxRequests: PREFETCH_MAX_REQUESTS,
    })
      .then(({ trades }) => {
        if (controller.signal.aborted || trades.length === 0) return;
        // backfill() resolves with trades sorted ascending by time (see its
        // doc comment on TradeSource.backfill) — the last element is newest.
        const newestMs = trades[trades.length - 1].time;
        putCachedTrades(cacheKey, trades, newestMs);
      })
      .catch(() => {
        // Best-effort warm-up only — the Order Flow tab's own backfill is
        // the source of truth if this fails or never completes in time.
      });

    registerInFlightBackfill(cacheKey, backfillPromise);

    return () => {
      controller.abort();
    };
  }, [symbol, assetClass]);
}
