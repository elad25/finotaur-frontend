-- SHADOW / Trade Detail: per-trade Exit Reason (trailing/manual/signal/target/stop).
-- Makes a trade reproducible. Editable inline (instant-save) in the My Trades detail panel.
-- Applied to prod 2026-06-21 via Supabase MCP (add_trade_exit_reason).

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_reason text;

ALTER TABLE public.trades ADD CONSTRAINT trades_exit_reason_chk
  CHECK (exit_reason IS NULL OR exit_reason IN ('trailing','manual','signal','target','stop'));
