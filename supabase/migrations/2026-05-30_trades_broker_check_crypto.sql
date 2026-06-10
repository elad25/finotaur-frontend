-- 2026-05-30 — Widen trades_broker_check to allow crypto exchange brokers (additive).
-- Context: S2.1 widened broker_connections_broker_check to include the 5 crypto exchanges,
-- but the separate CHECK on public.trades.broker was never widened, so any synced Binance
-- trade insert (broker='binance') was rejected at the DB level. This mirrors the connections
-- constraint so exchange-sync can insert crypto trades.
-- Additive only: every existing row already satisfies the wider set; no data is rewritten.
-- Applied to PROD (xsgbtptkueabylkxibly) via Supabase MCP apply_migration on 2026-05-30.

ALTER TABLE public.trades DROP CONSTRAINT trades_broker_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_broker_check
  CHECK (broker = ANY (ARRAY[
    'manual','interactive_brokers','alpaca','tradingview','mt4','mt5','ninja_trader','tradovate',
    'binance','bybit','coinbase','okx','kraken'
  ]));
