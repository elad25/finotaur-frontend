// src/components/charting/orderflow/sourceRegistry.ts
// Central "which TradeSource + tickSize for this instrument" resolver —
// extracted from FootprintTab.tsx's crypto/futures conditionals so future
// callers (and the eventual NT8/DepthSource seam — see types.ts's
// DepthSource stub) have one place to look, instead of each tab
// re-implementing the same asset-class switch.
//
// Construction itself doesn't change here: both BinanceTradeSource and
// DatabentoTradeSource are stateless singletons (see their own files —
// `export const XTradeSource: TradeSource = new XTradeSourceImpl()`), not
// classes a caller `new`s per instrument. subscribe()/backfill() always take
// `symbol` per-call, so there's nothing to instantiate per instrument; this
// registry's job is purely the asset-class → {source, tickSize} lookup.

import { BinanceTradeSource } from './BinanceTradeSource';
import { DatabentoTradeSource } from './DatabentoTradeSource';
import { FUTURES_CONTRACTS, type FuturesRoot } from './futuresContracts';
import type { TradeSource } from './types';

/**
 * Fallback tick size for crypto — matches FootprintTab.tsx/ChartTab.tsx's own
 * historical constant (FlowBinStore's minimum-tick floor, so suggestRowSize
 * never divides by zero). Crypto has no per-symbol tick table today; every
 * crypto instrument uses this one flat value.
 */
const CRYPTO_FALLBACK_TICK_SIZE = 0.01;

export interface ResolvedTradeSource {
  source: TradeSource;
  tickSize: number;
}

/**
 * Resolves the live trade source + tick size for an instrument, by asset
 * class. Returns null when no live feed exists for the class (stock, forex)
 * or the caller isn't authorized (futures is admin-only — see
 * FuturesChartTab.tsx / FootprintTab.tsx's compliance note: the Databento
 * futures preview is never customer-facing).
 *
 * `symbol` convention deliberately differs by asset class, matching what
 * each caller already holds locally (avoids a redundant resolution step
 * here):
 *  - 'crypto': the crypto ticker (e.g. 'BTCUSDT'). Not currently used for
 *    tickSize (crypto has one flat fallback — see CRYPTO_FALLBACK_TICK_SIZE)
 *    but accepted for signature symmetry and any future per-symbol crypto
 *    tick table.
 *  - 'futures': the FuturesRoot (e.g. 'NQ'), NOT the front-month contract
 *    code. Front-month resolution (`frontMonthContract()` in
 *    futuresContracts.ts) stays the caller's responsibility — the resolved
 *    contract symbol is also needed elsewhere (useOrderFlow's `symbol`,
 *    DatabentoBarsSource, UI labels) beyond just this tickSize lookup, so
 *    duplicating that resolution here would just be a second source of truth.
 */
export function resolveTradeSource(
  assetClass: 'crypto' | 'futures' | 'stock' | 'forex',
  symbol: string,
  opts: { isAdmin: boolean },
): ResolvedTradeSource | null {
  if (assetClass === 'crypto') {
    return { source: BinanceTradeSource, tickSize: CRYPTO_FALLBACK_TICK_SIZE };
  }

  if (assetClass === 'futures') {
    // Databento futures preview is admin-only — never customer-facing (see
    // FuturesChartTab.tsx's compliance note, mirrored in FootprintTab.tsx).
    if (!opts.isAdmin) return null;
    const spec = FUTURES_CONTRACTS[symbol as FuturesRoot];
    if (!spec) return null; // unknown root — defensive; callers only pass FUTURES_ROOTS members
    return { source: DatabentoTradeSource, tickSize: spec.tickSize };
  }

  // stock / forex — no live trades feed exists for these instruments today.
  return null;
}
