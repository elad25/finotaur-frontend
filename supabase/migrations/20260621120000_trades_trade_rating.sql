-- Trade Detail: single overall "Trade Rating" (1–5 stars), TradeZella-style.
-- Replaces the two separate setup_quality_rating / mental_state ratings in the UI
-- (those columns are kept in the DB for historical data, just removed from the UI).
-- Applied to prod 2026-06-21 via Supabase MCP (add_trade_rating_column).

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trade_rating smallint;

ALTER TABLE public.trades ADD CONSTRAINT trades_trade_rating_chk
  CHECK (trade_rating IS NULL OR trade_rating BETWEEN 1 AND 5);
