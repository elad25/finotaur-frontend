-- 2026-05-28 — backtest_pending_orders
-- Sprint B1 of backtest-launch-ready.
--
-- Adds a pending_orders JSONB column to backtest_sessions_v2 so that saves
-- preserve unfilled LIMIT/STOP orders (was previously dropped on save).
--
-- Shape per element (mirrors PendingOrder in useBacktestSession.ts):
--   { id, side, type, triggerPrice, size, stopLoss?, takeProfit?,
--     strategyId?, createdAt }
--
-- Existing rows backfill with [] via the column default. No data lost.
-- RLS unchanged (column inherits row policy).

ALTER TABLE public.backtest_sessions_v2
  ADD COLUMN IF NOT EXISTS pending_orders JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.backtest_sessions_v2.pending_orders IS
  'Unfilled LIMIT/STOP orders captured at session save time. Frontend rehydrates these into useBacktestSession state on session load.';
