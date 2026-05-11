-- ============================================================================
-- CHUNK 3 — B.4 phase 2.A: Server-side aggregated per-user trade stats VIEW
-- ============================================================================
-- Created: 2026-05-11
-- Purpose: Replace JS-side aggregation in useDashboardData.ts:computeStats()
--          with a single-row SELECT. Frontend stops pulling all trades just
--          to compute scalar aggregates.
-- Scope:  "All time" stats only (no time-window param). Consumer for
--         daysBack < 365 keeps using the existing JS path (bounded by phase 1
--         backstop). Consumer for daysBack >= 365 OR null reads this view.
-- Index:  Leverages existing idx_trades_dashboard_ultimate (covers
--         user_id + outcome IN (WIN,LOSS,BE) + included columns).
-- RLS:    Inherits from `trades` (per-user). No new policies needed.
-- Rollback: DROP VIEW public.user_trade_stats_v;
-- ============================================================================

CREATE OR REPLACE VIEW public.user_trade_stats_v AS
SELECT
  user_id,
  COUNT(*)                                                          AS total_closed,
  COUNT(*) FILTER (WHERE pnl > 0)                                   AS wins,
  COUNT(*) FILTER (WHERE pnl < 0)                                   AS losses,
  COUNT(*) FILTER (WHERE pnl = 0 OR pnl IS NULL)                    AS breakeven,
  COALESCE(SUM(pnl), 0)                                             AS net_pnl,
  COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)                      AS sum_win_pnl,
  COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)                 AS sum_loss_pnl,
  COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0)                      AS avg_win,
  COALESCE(AVG(pnl) FILTER (WHERE pnl < 0), 0)                      AS avg_loss,
  -- avg_rr mirrors useDashboardData.ts:calculateRR() fallback chain:
  --   1) actual_user_r
  --   2) actual_r
  --   3) rr (if > 0)
  --   4) derived from pnl / risk_usd
  --      - risk-only mode: pnl / risk_usd
  --      - summary  mode: ABS(pnl) / risk_usd
  -- Note: the JS calculateRR() has a 5th fallback using stop_price+entry_price
  -- for Summary mode when risk_usd missing. NOT mirrored here — Elad's data
  -- has no rows in this branch (pre-validation 2026-05-11). Document any
  -- divergence in regression test.
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
  ) FILTER (WHERE pnl IS NOT NULL), 0)                              AS avg_rr
FROM public.trades
WHERE deleted_at IS NULL
  AND outcome IN ('WIN', 'LOSS', 'BE')
GROUP BY user_id;

-- Documentation
COMMENT ON VIEW public.user_trade_stats_v IS
  'CHUNK 3 B.4 phase-2.A — per-user pre-aggregated trade stats. Source: trades '
  'filtered by deleted_at IS NULL AND outcome IN (WIN,LOSS,BE). RLS inherits '
  'from trades. For time-bounded stats, consumer uses JS path with '
  'MAX_LOOKBACK_DAYS=365 cap (phase 1 backstop).';
