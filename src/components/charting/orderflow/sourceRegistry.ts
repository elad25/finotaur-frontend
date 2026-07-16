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
import { Nt8TradeSource } from './Nt8TradeSource';
import { getCryptoTickSize } from './cryptoTickSizes';
import { FUTURES_CONTRACTS, type FuturesRoot } from './futuresContracts';
import type { TradeSource } from './types';

export interface ResolvedTradeSource {
  source: TradeSource;
  tickSize: number;
}

/**
 * Resolves the live trade source + tick size for an instrument, by asset
 * class. Returns null when no live feed exists for the class (stock, forex)
 * or the caller isn't authorized (futures without a live NT8 bridge is
 * gated to admins and paid-tier users — see FuturesChartTab.tsx /
 * FootprintTab.tsx's compliance note: the Databento futures path is a
 * delayed historical "Session Review" surface, customer-facing for paid
 * tiers, still NEVER Tradovate market data, still delayed-only).
 *
 * `symbol` convention deliberately differs by asset class, matching what
 * each caller already holds locally (avoids a redundant resolution step
 * here):
 *  - 'crypto': the crypto ticker (e.g. 'BTCUSDT'). Resolves a per-symbol
 *    tick size via cryptoTickSizes.ts's hardcoded map (getCryptoTickSize) —
 *    callers that want the exchange-verified value should also call
 *    `refineCryptoTickSize(symbol)` (async, cached) and use its result once
 *    it resolves; this synchronous lookup is only the immediate/default
 *    value.
 *  - 'futures': the FuturesRoot (e.g. 'NQ'), NOT the front-month contract
 *    code. Front-month resolution (`frontMonthContract()` / `toNt8Symbol()`
 *    in futuresContracts.ts) stays the caller's responsibility — the
 *    resolved contract symbol is also needed elsewhere (useOrderFlow's
 *    `symbol`, DatabentoBarsSource, UI labels) beyond just this tickSize
 *    lookup, so duplicating that resolution here would just be a second
 *    source of truth.
 *
 * `opts.nt8Connected` — true when the caller has a LIVE NT8 desktop-agent
 * bridge connection (see nt8Bridge.ts). Available to ALL users (not
 * admin-gated, unlike the Databento path below) and takes priority: a
 * connected NT8 bridge is real live data from the user's own NinjaTrader,
 * whereas Databento is a delayed historical review surface.
 *
 * `opts.paidTier` — true when the caller has market-data entitlement per
 * `useMarketDataEntitled()` (marketDataEntitlement.ts — the same rule
 * MarketDataGate.tsx enforces at the route level). Unlocks the Databento
 * "Session Review" path for paying customers, mirroring the existing
 * admin-only dev-preview gate rather than replacing it.
 */
export function resolveTradeSource(
  assetClass: 'crypto' | 'futures' | 'stock' | 'forex',
  symbol: string,
  opts: { isAdmin: boolean; nt8Connected?: boolean; paidTier?: boolean },
): ResolvedTradeSource | null {
  if (assetClass === 'crypto') {
    return { source: BinanceTradeSource, tickSize: getCryptoTickSize(symbol) };
  }

  if (assetClass === 'futures') {
    const spec = FUTURES_CONTRACTS[symbol as FuturesRoot];
    if (!spec) return null; // unknown root — defensive; callers only pass FUTURES_ROOTS members

    if (opts.nt8Connected) {
      return { source: Nt8TradeSource, tickSize: spec.tickSize };
    }

    // Databento delayed historical review — customer-facing for paid tiers
    // as Session Review (see FootprintTab.tsx's compliance note), plus the
    // existing admin dev-preview toggle. Still NEVER Tradovate, still
    // delayed-only.
    if (!opts.isAdmin && !opts.paidTier) return null;
    return { source: DatabentoTradeSource, tickSize: spec.tickSize };
  }

  // stock / forex — no live trades feed exists for these instruments today.
  return null;
}
