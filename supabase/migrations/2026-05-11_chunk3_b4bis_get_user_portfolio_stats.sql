-- ============================================================================
-- CHUNK 3 — B.4 phase 2.A.bis: Multi-portfolio aggregated trade stats RPC
-- ============================================================================
-- Created: 2026-05-11
-- Purpose: Extend the per-user aggregated stats path (phase 2.A view) with a
--          portfolio_id[] dimension. Frontend can request:
--            • all-portfolios stats (p_portfolio_ids = NULL) — matches user_trade_stats_v
--            • subset of portfolios (p_portfolio_ids = ARRAY[...])
--          Required for the "1000 users × ~20 portfolios each" scale target
--          (20K total portfolios). Existing per-user view cannot express the
--          per-portfolio dimension; this RPC closes the gap.
-- Index:  Leverages existing idx_trades_user_symbol_date (partial index on
--         user_id + outcome <> 'OPEN') and idx_trades_user_portfolio. No new
--         index required — EXPLAIN ANALYZE on Elad's data shows
--         Bitmap Index Scan with 0.135ms total execution time.
-- RLS:    SECURITY INVOKER — inherits from `trades` (per-user RLS policy).
-- Rollback: DROP FUNCTION public.get_user_portfolio_stats(uuid, uuid[]);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_portfolio_stats(
  p_user_id        uuid,
  p_portfolio_ids  uuid[] DEFAULT NULL
) RETURNS TABLE (
  user_id          uuid,
  total_closed     int,
  wins             int,
  losses           int,
  breakeven        int,
  net_pnl          numeric,
  sum_win_pnl      numeric,
  sum_loss_pnl     numeric,
  avg_win          numeric,
  avg_loss         numeric,
  avg_rr           numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    user_id,
    COUNT(*)                                                AS total_closed,
    COUNT(*) FILTER (WHERE pnl > 0)                         AS wins,
    COUNT(*) FILTER (WHERE pnl < 0)                         AS losses,
    COUNT(*) FILTER (WHERE pnl = 0 OR pnl IS NULL)          AS breakeven,
    COALESCE(SUM(pnl), 0)                                   AS net_pnl,
    COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)            AS sum_win_pnl,
    COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)       AS sum_loss_pnl,
    COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0)            AS avg_win,
    COALESCE(AVG(pnl) FILTER (WHERE pnl < 0), 0)            AS avg_loss,
    -- avg_rr fallback chain mirrors user_trade_stats_v / calculateRR():
    --   actual_user_r → actual_r → rr (>0) → derived from pnl/risk_usd
    COALESCE(AVG(
      COALESCE(
        actual_user_r,
        actual_r,
        CASE WHEN rr > 0 THEN rr ELSE NULL END,
        CASE
          WHEN pnl IS NOT NULL AND risk_usd > 0 THEN
            CASE
              WHEN input_mode = 'risk-only' THEN pnl / risk_usd
              ELSE ABS(pnl) / risk_usd
            END
          ELSE NULL
        END
      )
    ) FILTER (WHERE pnl IS NOT NULL), 0)                    AS avg_rr
  FROM public.trades
  WHERE deleted_at IS NULL
    AND outcome IN ('WIN', 'LOSS', 'BE')
    AND user_id = p_user_id
    AND (p_portfolio_ids IS NULL OR portfolio_id = ANY(p_portfolio_ids))
  GROUP BY user_id;
$$;

-- Grant execute to authenticated users; RLS on `trades` still enforces row visibility.
GRANT EXECUTE ON FUNCTION public.get_user_portfolio_stats(uuid, uuid[]) TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.get_user_portfolio_stats(uuid, uuid[]) IS
  'CHUNK 3 B.4 phase-2.A.bis — multi-portfolio aggregated trade stats. '
  'NULL portfolio_ids returns all-portfolio aggregates (matches user_trade_stats_v). '
  'Array returns aggregates for those portfolios only. SECURITY INVOKER + RLS on trades '
  'ensures per-user row visibility.';
