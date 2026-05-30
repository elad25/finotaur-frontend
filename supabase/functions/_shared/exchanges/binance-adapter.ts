// supabase/functions/_shared/exchanges/binance-adapter.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Binance GLOBAL implementation of ExchangeAdapter.
//
// Endpoints:
//   Spot base:    https://api.binance.com
//   Futures base: https://fapi.binance.com
//
// Auth: HMAC-SHA256 via Web Crypto API (crypto.subtle).
//   Every signed request appends &timestamp=<ms>&recvWindow=60000&signature=<hex>.
//   Header: X-MBX-APIKEY: <apiKey>
//
// Binance-specific quirks:
//   - /api/v3/myTrades is PER-SYMBOL (no "fetch all" endpoint).
//     The adapter returns [] and warns when symbols array is empty.
//   - /fapi/v1/userTrades is also PER-SYMBOL for futures.
//   - Server-time sync: GET /api/v3/time once per adapter instance to
//     compute a local clock offset, reducing -1021 timestamp errors.
//   - Pagination: Binance returns up to 500–1000 rows per page per symbol.
//     This adapter fetches one page per symbol. For accounts with deep
//     trade history (>500 fills/symbol), a time-window pagination loop
//     is needed.
//     TODO: implement time-window sliding-window pagination for deep history.
//
// SECURITY NOTES:
//   - apiKey and apiSecret MUST NOT appear in logs, errors, or raw payloads.
//   - The `raw` field on UnifiedExchangeTrade contains the original exchange
//     response minus any fields that could carry auth material (there are none
//     in Binance trade responses, but guard by convention).
// ═══════════════════════════════════════════════════════════════

import type {
  ExchangeAdapter,
  ExchangeCredentials,
  UnifiedExchangeTrade,
} from './interface.ts';

// ─── Base URLs ────────────────────────────────────────────────
const SPOT_BASE = 'https://api.binance.com';
const FUTURES_BASE = 'https://fapi.binance.com';

// ─── Binance raw response shapes ─────────────────────────────

interface BinanceSpotTrade {
  id: number;
  orderId: number;
  symbol: string;
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
}

interface BinanceFuturesTrade {
  id: number;
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: string;
  qty: string;
  realizedPnl: string;
  marginAsset: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  buyer: boolean;
  maker: boolean;
}

interface BinanceFundingIncome {
  symbol: string;
  incomeType: string;
  income: string;
  asset: string;
  time: number;
  info: string;
  tranId: number;
  tradeId: string;
}

interface BinanceErrorBody {
  code: number;
  msg: string;
}

// ─── HMAC-SHA256 via Web Crypto API ──────────────────────────

/**
 * Compute HMAC-SHA256 of `message` using `secret` and return hex string.
 * Uses crypto.subtle — no Node.js crypto dependency (Deno runtime).
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Append HMAC-SHA256 signature to an existing URLSearchParams string.
 * Returns the full query string including `&signature=<hex>`.
 */
async function signQuery(apiSecret: string, queryString: string): Promise<string> {
  const sig = await hmacSha256Hex(apiSecret, queryString);
  return `${queryString}&signature=${sig}`;
}

// ─── Server-time sync ─────────────────────────────────────────

/**
 * Fetch Binance server time and compute a local clock offset (ms).
 * Calling (Date.now() + offset) in subsequent requests avoids -1021
 * "Timestamp for this request is outside of the recvWindow" errors
 * caused by local clock drift.
 *
 * On network error, returns 0 (use local clock as-is).
 */
async function fetchServerTimeOffset(): Promise<number> {
  try {
    const localBefore = Date.now();
    const resp = await fetch(`${SPOT_BASE}/api/v3/time`);
    if (!resp.ok) return 0;
    const data = (await resp.json()) as { serverTime: number };
    const localAfter = Date.now();
    const roundTrip = localAfter - localBefore;
    // Estimate server time at the midpoint of the request.
    return data.serverTime - (localBefore + Math.floor(roundTrip / 2));
  } catch {
    return 0;
  }
}

// ─── Signed request helper ────────────────────────────────────

/**
 * Build and execute a signed Binance REST request.
 * Automatically adds timestamp, recvWindow, and HMAC signature.
 * Throws a sanitized Error on non-2xx responses (never leaks secrets).
 */
async function signedGet(
  apiKey: string,
  apiSecret: string,
  url: string,
  params: Record<string, string | number>,
  clockOffset: number,
): Promise<unknown> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  qs.set('timestamp', String(Date.now() + clockOffset));
  qs.set('recvWindow', '60000');

  const signed = await signQuery(apiSecret, qs.toString());
  const fullUrl = `${url}?${signed}`;

  const resp = await fetch(fullUrl, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!resp.ok) {
    let errMsg = `Binance HTTP ${resp.status}`;
    try {
      const body = (await resp.json()) as BinanceErrorBody;
      // body.msg is safe to surface; it never contains auth material.
      errMsg = `Binance error ${body.code}: ${body.msg}`;
    } catch {
      // ignore JSON parse failure — use status-only message
    }
    throw new Error(errMsg);
  }

  return resp.json();
}

// ─── Small delay helper (rate-limit courtesy) ─────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Adapter factory ──────────────────────────────────────────

/**
 * Create a Binance ExchangeAdapter instance.
 * The returned adapter is stateless except for a lazily-initialized
 * server-time offset that is shared within the same JS call stack.
 */
export function createBinanceAdapter(): ExchangeAdapter {
  return {
    exchange: 'binance',

    // ── validateCredentials ──────────────────────────────────
    async validateCredentials(
      creds: ExchangeCredentials,
    ): Promise<{ ok: boolean; accountLabel?: string; error?: string }> {
      const clockOffset = await fetchServerTimeOffset();
      try {
        await signedGet(
          creds.apiKey,
          creds.apiSecret,
          `${SPOT_BASE}/api/v3/account`,
          {},
          clockOffset,
        );
        return { ok: true, accountLabel: 'Binance Spot' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
      }
    },

    // ── fetchSpotTrades ──────────────────────────────────────
    async fetchSpotTrades(
      creds: ExchangeCredentials,
      params: { symbols: string[]; since?: number },
    ): Promise<UnifiedExchangeTrade[]> {
      if (params.symbols.length === 0) {
        // Binance requires a symbol; we cannot fetch all symbols at once.
        console.warn(
          '[binance-adapter] fetchSpotTrades called with empty symbols array — returning []',
        );
        return [];
      }

      const clockOffset = await fetchServerTimeOffset();
      const results: UnifiedExchangeTrade[] = [];

      // TODO: implement time-window sliding pagination for symbols with
      // more than 1000 fills. Current implementation fetches one page
      // (up to 1000 rows) per symbol — sufficient for most accounts.

      for (let i = 0; i < params.symbols.length; i++) {
        const symbol = params.symbols[i];

        // Courtesy delay between symbol requests to stay within
        // Binance's per-IP rate limits (~1200 weight/min for spot).
        if (i > 0) await sleep(200);

        const reqParams: Record<string, string | number> = { symbol, limit: 1000 };
        if (params.since !== undefined) {
          reqParams.startTime = params.since;
        }

        let rawTrades: BinanceSpotTrade[];
        try {
          rawTrades = (await signedGet(
            creds.apiKey,
            creds.apiSecret,
            `${SPOT_BASE}/api/v3/myTrades`,
            reqParams,
            clockOffset,
          )) as BinanceSpotTrade[];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[binance-adapter] fetchSpotTrades symbol=${symbol} error: ${msg}`);
          continue;
        }

        for (const t of rawTrades) {
          results.push({
            externalId: `binance::spot::${t.id}`,
            symbol: t.symbol,
            side: t.isBuyer ? 'LONG' : 'SHORT',
            quantity: Number(t.qty),
            entryPrice: Number(t.price),
            fees: Number(t.commission),
            feeCurrency: t.commissionAsset,
            tradeTime: new Date(t.time).toISOString(),
            positionType: 'Spot',
            realizedPnl: undefined,
            raw: t,
          });
        }
      }

      return results;
    },

    // ── fetchPerpTrades ──────────────────────────────────────
    async fetchPerpTrades(
      creds: ExchangeCredentials,
      params: { symbols?: string[]; since?: number },
    ): Promise<UnifiedExchangeTrade[]> {
      const symbols = params.symbols ?? [];

      if (symbols.length === 0) {
        // Binance USDⓈ-M futures /fapi/v1/userTrades requires a symbol.
        // A "fetch all fills across all symbols" endpoint does not exist.
        console.warn(
          '[binance-adapter] fetchPerpTrades called without symbols — ' +
          'Binance requires a symbol for /fapi/v1/userTrades. Returning [].',
        );
        return [];
      }

      const clockOffset = await fetchServerTimeOffset();
      const results: UnifiedExchangeTrade[] = [];

      // TODO: implement time-window sliding pagination for symbols with
      // more than 1000 fills. Current implementation fetches one page
      // (up to 1000 rows) per symbol.

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];

        if (i > 0) await sleep(200);

        const reqParams: Record<string, string | number> = { symbol, limit: 1000 };
        if (params.since !== undefined) {
          reqParams.startTime = params.since;
        }

        let rawTrades: BinanceFuturesTrade[];
        try {
          rawTrades = (await signedGet(
            creds.apiKey,
            creds.apiSecret,
            `${FUTURES_BASE}/fapi/v1/userTrades`,
            reqParams,
            clockOffset,
          )) as BinanceFuturesTrade[];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[binance-adapter] fetchPerpTrades symbol=${symbol} error: ${msg}`);
          continue;
        }

        for (const t of rawTrades) {
          // Derive side: for one-way mode positionSide is 'BOTH'; use `buyer`
          // field. For hedge mode positionSide is 'LONG' or 'SHORT' directly.
          let side: 'LONG' | 'SHORT';
          if (t.positionSide === 'LONG') {
            side = 'LONG';
          } else if (t.positionSide === 'SHORT') {
            side = 'SHORT';
          } else {
            // One-way mode ('BOTH'): BUY = opening LONG (or closing SHORT),
            // treat as LONG for simplicity. The journal can refine with P&L.
            side = t.buyer ? 'LONG' : 'SHORT';
          }

          results.push({
            externalId: `binance::futures::${t.id}`,
            symbol: t.symbol,
            side,
            quantity: Number(t.qty),
            entryPrice: Number(t.price),
            fees: Number(t.commission),
            feeCurrency: t.commissionAsset,
            tradeTime: new Date(t.time).toISOString(),
            positionType: 'Perpetual',
            realizedPnl: Number(t.realizedPnl),
            raw: t,
          });
        }
      }

      return results;
    },

    // ── fetchFunding ─────────────────────────────────────────
    async fetchFunding(
      creds: ExchangeCredentials,
      params: { since?: number },
    ): Promise<{ symbol: string; amount: number; time: string }[]> {
      const clockOffset = await fetchServerTimeOffset();

      const reqParams: Record<string, string | number> = {
        incomeType: 'FUNDING_FEE',
        limit: 1000,
      };
      if (params.since !== undefined) {
        reqParams.startTime = params.since;
      }

      // TODO: implement pagination for accounts with more than 1000
      // funding events. Current implementation fetches one page.

      let rawItems: BinanceFundingIncome[];
      try {
        rawItems = (await signedGet(
          creds.apiKey,
          creds.apiSecret,
          `${FUTURES_BASE}/fapi/v1/income`,
          reqParams,
          clockOffset,
        )) as BinanceFundingIncome[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`[binance-adapter] fetchFunding error: ${msg}`);
      }

      return rawItems.map((item) => ({
        symbol: item.symbol,
        amount: Number(item.income),
        time: new Date(item.time).toISOString(),
      }));
    },
  };
}
