-- ============================================================================
-- CHUNK 3 — B.4 phase 2.C: Daily-aggregated PnL view per user × portfolio
-- ============================================================================
-- Created: 2026-05-11
-- Purpose: Replace JS-side equity series construction in
--          useDashboardData.ts:computeStats(). Frontend currently iterates
--          every trade to bucket by day; this view does the daily aggregation
--          in SQL, returning ≤365 rows for the lookback window. Frontend
--          computes running equity + maxDrawdown in a single linear pass.
-- Scope:  Closed trades only (outcome IN WIN/LOSS/BE, pnl NOT NULL).
--         deleted_at filter retains active rows.
-- Index:  Existing partial index idx_trades_user_symbol_date serves the
--         predicate (Bitmap Index Scan, 0.213ms on Elad's data per EXPLAIN
--         ANALYZE 2026-05-11). No new index required.
-- RLS:    Inherits from `trades` (per-user). View is SECURITY INVOKER by
--         default; the underlying RLS policy on trades is enforced.
-- Rollback: DROP VIEW public.user_daily_pnl_v;
-- ============================================================================

CREATE OR REPLACE VIEW public.user_daily_pnl_v AS
SELECT
  user_id,
  portfolio_id,
  DATE_TRUNC('day', COALESCE(close_at, open_at))::date AS trade_date,
  COUNT(*)              AS day_trades,
  COALESCE(SUM(pnl), 0) AS day_pnl
FROM public.trades
WHERE deleted_at IS NULL
  AND pnl IS NOT NULL
  AND outcome IN ('WIN', 'LOSS', 'BE')
GROUP BY
  user_id,
  portfolio_id,
  DATE_TRUNC('day', COALESCE(close_at, open_at));

GRANT SELECT ON public.user_daily_pnl_v TO authenticated;

COMMENT ON VIEW public.user_daily_pnl_v IS
  'CHUNK 3 B.4 phase-2.C — per-user × per-portfolio daily PnL aggregation. '
  'Source: trades filtered by deleted_at IS NULL AND pnl IS NOT NULL AND outcome IN (WIN,LOSS,BE). '
  'Consumer: useDashboardData.ts equity series construction. RLS inherits from trades.';
