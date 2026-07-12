// src/pages/app/trading-arena/components/depthProfileGutterMath.ts
//
// Pure aggregation + formatting logic for DepthProfileGutter.tsx (Task S2 —
// the Liquidity tab's right-edge "what's waiting" resting-book overlay).
// No React, no DOM — mirrors the pure-engine convention of
// flowBinStore.ts / volumeBubbles.ts. Bin-floor/aggregate approach copied
// (not imported) from MarketScanner.tsx's computeWalls (same "keep
// MarketScanner.tsx untouched" constraint the rest of LiquidityTab.tsx
// already documents).

export interface RestingLevel {
  /** Bin floor price. */
  price: number;
  /** Aggregated USD notional (Σ price × qty) across every raw level in this bin. */
  usd: number;
}

/** Round a price DOWN to the nearest bin boundary. */
export function binFloor(price: number, binSize: number): number {
  return Math.floor(price / binSize) * binSize;
}

/**
 * Aggregates raw (price → qty) resting-order maps into USD-notional bins.
 * Bids are returned sorted DESCENDING by price (closest-to-mid first —
 * "extends left below current price"); asks ASCENDING by price
 * (closest-to-mid first — "extends left above current price", i.e. also
 * anchored near the price axis on the gutter's right edge).
 *
 * `binSize <= 0` (not yet known — e.g. before the depth matrix's own
 * adaptive binSize has resolved) returns empty arrays rather than dividing
 * by zero.
 */
export function aggregateRestingBook(
  bids: ReadonlyMap<number, number>,
  asks: ReadonlyMap<number, number>,
  binSize: number,
): { bids: RestingLevel[]; asks: RestingLevel[] } {
  if (!(binSize > 0)) return { bids: [], asks: [] };

  const bidBins = new Map<number, number>();
  for (const [price, qty] of bids) {
    const bin = binFloor(price, binSize);
    bidBins.set(bin, (bidBins.get(bin) ?? 0) + qty * price);
  }

  const askBins = new Map<number, number>();
  for (const [price, qty] of asks) {
    const bin = binFloor(price, binSize);
    askBins.set(bin, (askBins.get(bin) ?? 0) + qty * price);
  }

  const bidLevels = Array.from(bidBins, ([price, usd]) => ({ price, usd })).sort((a, b) => b.price - a.price);
  const askLevels = Array.from(askBins, ([price, usd]) => ({ price, usd })).sort((a, b) => a.price - b.price);

  return { bids: bidLevels, asks: askLevels };
}

/**
 * Returns the set of prices for the `n` largest levels by USD notional —
 * used to decide which bars get a size label (avoids label clutter when
 * dozens of bins are visible; only the strongest N per side are labeled).
 */
export function topLevelsBySize(levels: readonly RestingLevel[], n: number): Set<number> {
  if (n <= 0) return new Set();
  const sorted = [...levels].sort((a, b) => b.usd - a.usd).slice(0, n);
  return new Set(sorted.map((l) => l.price));
}

/** K/M-formatted USD notional for the gutter's size labels: '$8.2M', '$640K', '$12'. */
export function formatGutterSize(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}
