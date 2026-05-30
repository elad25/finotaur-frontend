// supabase/functions/_shared/exchanges/interface.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: ExchangeAdapter — generic interface for API-key-based
//          crypto exchange integrations (spot + perpetuals).
//
// Implementations live in sibling files (e.g., binance-adapter.ts).
// Looked up via registry.ts by exchange name.
//
// Exchanges targeted:
//   binance     — live now
//   bybit       — planned
//   coinbase    — planned
//   okx         — planned (uses passphrase field)
//   kraken      — planned
// ═══════════════════════════════════════════════════════════════

export type ExchangeName = 'binance' | 'bybit' | 'coinbase' | 'okx' | 'kraken';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  /** Used by OKX; ignored by other exchanges. */
  passphrase?: string;
  /** Defaults to 'live'. Set to 'testnet' for sandbox/test environments. */
  environment?: 'live' | 'testnet';
}

/**
 * A single normalized trade fill from any exchange.
 *
 * Fees assumption: commission is converted to quote-currency equivalent
 * where the exchange provides both commissionAsset and commissionAmount.
 * When the fee is paid in a non-quote asset (e.g. BNB for Binance's
 * BNB-fee-discount), `fees` stores the raw numeric amount and `feeCurrency`
 * identifies the asset so callers can do their own conversion if needed.
 *
 * realizedPnl: populated only when the exchange reports it authoritatively
 * (e.g. Binance futures /fapi/v1/userTrades `realizedPnl` field). For spot
 * trades this is always undefined — the journal calculates P&L independently.
 */
export interface UnifiedExchangeTrade {
  /** Globally unique. Format: `<exchange>::<market>::<tradeId>`. Used for
   *  deduplification via trades.external_id. */
  externalId: string;
  /** Normalized symbol as returned by the exchange, e.g. 'BTCUSDT'. */
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  /** Fill price (entry price for journal purposes). */
  entryPrice: number;
  /** Commission amount. See fees assumption note above. */
  fees: number;
  /** Asset the commission was paid in, e.g. 'BNB', 'USDT'. */
  feeCurrency?: string;
  /** ISO 8601 timestamp of the trade execution. */
  tradeTime: string;
  positionType: 'Spot' | 'Perpetual';
  /** Sum of funding payments for the position window (perpetual only).
   *  May be 0 or undefined when the exchange does not provide it inline. */
  fundingPaid?: number;
  /** Leverage at time of trade (perpetual only, when available). */
  leverage?: number;
  /** Exchange-authoritative realized PnL (perpetual only, when provided).
   *  Undefined for spot or when the exchange does not surface it per-fill. */
  realizedPnl?: number;
  /** Original exchange response payload for debugging.
   *  MUST NOT contain apiKey, apiSecret, or HMAC signatures. */
  raw?: unknown;
}

/**
 * ExchangeAdapter — one implementation per exchange.
 *
 * NOTE on Binance spot: the Binance GET /api/v3/myTrades endpoint is
 * PER-SYMBOL — the API requires a `symbol` query parameter and does not
 * support a "fetch all symbols" mode. Therefore `fetchSpotTrades` takes
 * an explicit `symbols` array that the caller is responsible for
 * supplying (e.g. from the user's portfolio or a configured watch-list).
 */
export interface ExchangeAdapter {
  readonly exchange: ExchangeName;

  /**
   * Verify credentials are valid and the account is reachable.
   * Returns { ok: true, accountLabel } on success.
   * Returns { ok: false, error } on failure — error MUST NOT contain secrets.
   */
  validateCredentials(
    creds: ExchangeCredentials,
  ): Promise<{ ok: boolean; accountLabel?: string; error?: string }>;

  /**
   * Fetch spot (non-margin) trade fills.
   *
   * @param params.symbols - Required list of symbols to query. The caller
   *   must supply this because Binance (and most exchanges) do not offer a
   *   "fetch all fills across all symbols" endpoint.
   * @param params.since - Optional Unix epoch ms. Fetches fills at or after
   *   this timestamp. Omit for a full historical pull.
   */
  fetchSpotTrades(
    creds: ExchangeCredentials,
    params: { symbols: string[]; since?: number },
  ): Promise<UnifiedExchangeTrade[]>;

  /**
   * Fetch perpetual futures trade fills.
   *
   * @param params.symbols - Optional symbol filter. Behaviour when omitted
   *   is exchange-specific (see adapter docs). For Binance, omitting symbols
   *   returns an empty array (symbols are required by the endpoint).
   * @param params.since - Optional Unix epoch ms.
   */
  fetchPerpTrades(
    creds: ExchangeCredentials,
    params: { symbols?: string[]; since?: number },
  ): Promise<UnifiedExchangeTrade[]>;

  /**
   * Fetch perpetual funding payments.
   *
   * @param params.since - Optional Unix epoch ms.
   * @returns Array of {symbol, amount, time} entries. `amount` is negative
   *   when the holder paid funding, positive when received.
   */
  fetchFunding(
    creds: ExchangeCredentials,
    params: { since?: number },
  ): Promise<{ symbol: string; amount: number; time: string }[]>;
}
