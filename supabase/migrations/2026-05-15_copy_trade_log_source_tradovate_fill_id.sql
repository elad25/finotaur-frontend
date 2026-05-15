-- =============================================================
-- A.3 — Idempotency on Tradovate fill replay
-- =============================================================
-- Adds source_tradovate_fill_id to copy_trade_log so we can detect
-- and skip duplicate fills outside the 10-minute in-memory dedup
-- window. Indexed for fast pre-order lookup.
--
-- The existing tradovate_fill_id column stores the TARGET orderId
-- (post-ack), which is unrelated to source fill replay.
--
-- Date: 2026-05-15
-- Session: copier-blockers-a1-a3
-- =============================================================

ALTER TABLE public.copy_trade_log
  ADD COLUMN IF NOT EXISTS source_tradovate_fill_id BIGINT;

COMMENT ON COLUMN public.copy_trade_log.source_tradovate_fill_id IS
  'Tradovate fill.id from the SOURCE/master account. Used for DB-backed idempotency on fill replay outside the 10-minute in-memory dedup window. Set on every executeCopy call.';

-- Partial index for the pre-order dedup lookup.
-- Tuple: (target_portfolio_id, source_tradovate_fill_id) WHERE row represents
-- a successfully-placed or flatten-derived copy.
-- 'skipped' / 'error' rows are NOT indexed — they don't represent placed orders,
-- so a later retry on the same fill is allowed.
CREATE INDEX IF NOT EXISTS idx_copy_trade_log_source_fill_dedup
  ON public.copy_trade_log (target_portfolio_id, source_tradovate_fill_id)
  WHERE source_tradovate_fill_id IS NOT NULL AND action IN ('open', 'close', 'flatten');
