-- Sprint E (2026-05-30): per-strategy attribution for the Backtest analytics.
--
-- backtest_trades_v2 previously had no way to record WHICH strategy produced a
-- trade, so the per-strategy stats breakdown (computeStatsByStrategy) collapsed
-- every saved trade into a single 'manual' bucket. This nullable column carries
-- the client strategy-library id (or NULL for manual/untagged trades) so the
-- aggregate Analytics view can attribute performance per strategy.
--
-- Additive + nullable → safe on existing rows (all backfill to NULL = manual).

ALTER TABLE public.backtest_trades_v2
  ADD COLUMN IF NOT EXISTS strategy_id text;

COMMENT ON COLUMN public.backtest_trades_v2.strategy_id IS
  'Strategy attribution tag (id from the client strategy library), or NULL for manual/untagged trades. Powers the per-strategy stats breakdown on the Backtest Analytics page.';
