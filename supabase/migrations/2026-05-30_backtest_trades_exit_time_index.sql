-- D6 (Sprint D, 2026-05-30): index for fastest "saved sessions newest-trades first" query.
--
-- useBacktestStats() runs the following hot query on every dashboard load:
--   SELECT ... FROM backtest_trades_v2
--   WHERE session_id IN (...)
--     AND exit_time IS NOT NULL
--   ORDER BY exit_time DESC
--   LIMIT 5001;
--
-- A composite (session_id, exit_time DESC) index matches both the predicate
-- and the ordering, eliminating a sort + filter pass.

CREATE INDEX IF NOT EXISTS idx_trades_v2_session_exit
  ON public.backtest_trades_v2 (session_id, exit_time DESC);
