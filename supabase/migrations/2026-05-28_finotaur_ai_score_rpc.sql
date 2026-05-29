-- ============================================
-- FINOTAUR AI — Trader Score RPC
-- ============================================
-- Computes the FINOTAUR composite trader score (0–100) for a given user
-- over a configurable rolling window.
--
-- Score dimensions and weights:
--   Win Rate (15%) · Profit Factor (25%) · Avg W/L Ratio (15%)
--   Max Drawdown (20%) · Consistency/CV (15%) · Recovery Factor (10%)
--
-- Used by: finotaur-server/src/routes/journal-ai/score.ts
-- Read by: finotaur-frontend/src/components/journal/ai/ScoreCard.tsx
-- ============================================

CREATE OR REPLACE FUNCTION get_finotaur_score(
  p_user_id    uuid,
  p_window_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER   -- RLS on trades is honoured; user can only score their own trades
SET search_path = public
AS $$
DECLARE
  -- ── current window ─────────────────────────────────────────────────────────
  v_total_closed   int;
  v_wins           int;
  v_losses         int;
  v_sum_win_pnl    numeric;
  v_sum_loss_pnl   numeric;   -- stored as positive value
  v_avg_win        numeric;
  v_avg_loss       numeric;
  v_profit_factor  numeric;
  v_win_rate       numeric;
  v_avg_wl_ratio   numeric;
  v_max_drawdown   numeric;   -- percentage (0–100)
  v_cv             numeric;   -- coefficient of variation of daily PnL
  v_recovery       numeric;   -- total_pnl / NULLIF(max_drawdown_usd, 0)

  -- dimension scores (0–100)
  v_score_wr       numeric;
  v_score_pf       numeric;
  v_score_wl       numeric;
  v_score_dd       numeric;
  v_score_cv       numeric;
  v_score_rf       numeric;
  v_composite      numeric;

  -- ── comparison window (p_window_days days prior) ────────────────────────────
  v_prev_total     int;
  v_prev_wins      int;
  v_prev_losses    int;
  v_prev_sum_win   numeric;
  v_prev_sum_loss  numeric;
  v_prev_pf        numeric;
  v_prev_wr        numeric;
  v_prev_wl        numeric;
  v_prev_dd        numeric;
  v_prev_cv        numeric;
  v_prev_rf        numeric;
  v_prev_score_wr  numeric;
  v_prev_score_pf  numeric;
  v_prev_score_wl  numeric;
  v_prev_score_dd  numeric;
  v_prev_score_cv  numeric;
  v_prev_score_rf  numeric;
  v_prev_composite numeric;
BEGIN
  -- ════════════════════════════════════════════════════════════════════════════
  -- CURRENT WINDOW
  -- ════════════════════════════════════════════════════════════════════════════

  -- ── stats CTE ──────────────────────────────────────────────────────────────
  SELECT
    COUNT(*)                                                      AS total_closed,
    COUNT(*) FILTER (WHERE outcome = 'WIN')                       AS wins,
    COUNT(*) FILTER (WHERE outcome = 'LOSS')                      AS losses,
    COALESCE(SUM(pnl) FILTER (WHERE outcome = 'WIN'),  0)         AS sum_win_pnl,
    COALESCE(ABS(SUM(pnl) FILTER (WHERE outcome = 'LOSS')), 0)   AS sum_loss_pnl
  INTO v_total_closed, v_wins, v_losses, v_sum_win_pnl, v_sum_loss_pnl
  FROM trades
  WHERE user_id    = p_user_id
    AND deleted_at IS NULL
    AND outcome    IN ('WIN', 'LOSS', 'BE')
    AND close_at   >= (now() - (p_window_days || ' days')::interval);

  -- Early exit — not enough data
  IF v_total_closed = 0 THEN
    RETURN jsonb_build_object(
      'score',       NULL,
      'prev_score',  NULL,
      'delta',       NULL,
      'window_days', p_window_days,
      'breakdown', jsonb_build_object(
        'win_rate',        jsonb_build_object('raw', NULL, 'score', NULL),
        'profit_factor',   jsonb_build_object('raw', NULL, 'score', NULL),
        'avg_wl',          jsonb_build_object('raw', NULL, 'score', NULL),
        'max_drawdown_pct',jsonb_build_object('raw', NULL, 'score', NULL),
        'consistency_cv',  jsonb_build_object('raw', NULL, 'score', NULL),
        'recovery_factor', jsonb_build_object('raw', NULL, 'score', NULL)
      ),
      'trade_count', 0,
      'computed_at', now()
    );
  END IF;

  -- Derived stats
  v_win_rate      := v_wins::numeric / NULLIF(v_total_closed, 0);
  v_avg_win       := v_sum_win_pnl   / NULLIF(v_wins,   0);
  v_avg_loss      := v_sum_loss_pnl  / NULLIF(v_losses, 0);
  v_profit_factor := v_sum_win_pnl   / NULLIF(v_sum_loss_pnl, 0);
  v_avg_wl_ratio  := COALESCE(v_avg_win, 0) / NULLIF(COALESCE(v_avg_loss, 0), 0);

  -- ── max drawdown ───────────────────────────────────────────────────────────
  -- Running cumulative PnL, track peak, derive max drawdown %
  WITH ordered AS (
    SELECT close_at,
           SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_pnl
    FROM trades
    WHERE user_id    = p_user_id
      AND deleted_at IS NULL
      AND outcome    IN ('WIN', 'LOSS', 'BE')
      AND close_at   >= (now() - (p_window_days || ' days')::interval)
  ),
  peaks AS (
    SELECT cum_pnl,
           MAX(cum_pnl) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_peak
    FROM ordered
  )
  SELECT COALESCE(
    MAX(
      CASE
        WHEN running_peak > 0
        THEN (running_peak - cum_pnl) / running_peak * 100
        ELSE 0
      END
    ), 0
  )
  INTO v_max_drawdown
  FROM peaks;

  -- ── consistency (CV of daily PnL) ─────────────────────────────────────────
  WITH daily AS (
    SELECT DATE_TRUNC('day', close_at AT TIME ZONE 'America/New_York') AS day,
           SUM(COALESCE(pnl, 0)) AS day_pnl
    FROM trades
    WHERE user_id    = p_user_id
      AND deleted_at IS NULL
      AND outcome    IN ('WIN', 'LOSS', 'BE')
      AND close_at   >= (now() - (p_window_days || ' days')::interval)
    GROUP BY 1
  )
  SELECT STDDEV_POP(day_pnl) / NULLIF(AVG(day_pnl) FILTER (WHERE day_pnl > 0), 0)
  INTO v_cv
  FROM daily;

  v_cv := COALESCE(v_cv, 0);

  -- ── recovery factor ────────────────────────────────────────────────────────
  -- total_pnl / max_drawdown_usd  (drawdown in absolute USD = peak * dd_pct / 100)
  DECLARE
    v_total_pnl  numeric;
    v_max_dd_usd numeric;
  BEGIN
    SELECT COALESCE(SUM(pnl), 0)
    INTO v_total_pnl
    FROM trades
    WHERE user_id    = p_user_id
      AND deleted_at IS NULL
      AND outcome    IN ('WIN', 'LOSS', 'BE')
      AND close_at   >= (now() - (p_window_days || ' days')::interval);

    WITH ordered2 AS (
      SELECT SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_pnl
      FROM trades
      WHERE user_id    = p_user_id
        AND deleted_at IS NULL
        AND outcome    IN ('WIN', 'LOSS', 'BE')
        AND close_at   >= (now() - (p_window_days || ' days')::interval)
    ),
    dd_usd AS (
      SELECT MAX(
               MAX(cum_pnl) OVER (ORDER BY (SELECT 1) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
               - cum_pnl
             ) OVER () AS max_drawdown_usd
      FROM ordered2
    )
    SELECT COALESCE(MAX(max_drawdown_usd), 0)
    INTO v_max_dd_usd
    FROM dd_usd;

    v_recovery := COALESCE(v_total_pnl / NULLIF(v_max_dd_usd, 0), 0);
  END;

  -- ── dimension scores (0–100) ───────────────────────────────────────────────
  -- Win Rate: clamp(win_rate * 200, 0, 100)  — 50 % win → score 100
  v_score_wr := LEAST(GREATEST(COALESCE(v_win_rate, 0) * 200.0, 0), 100);

  -- Profit Factor: log₂(GREATEST(PF, 0.01)) * 50, clamped 0–100
  --   PF = 2  → log₂(2) * 50  = 50
  --   PF = 4  → log₂(4) * 50  = 100
  --   PF = 0.5 → negative → clamp to 0
  v_score_pf := LEAST(GREATEST(
    LOG(2, GREATEST(COALESCE(v_profit_factor, 0.01), 0.01)) * 50.0,
    0), 100);

  -- Avg W/L Ratio: clamp(ratio * 33.3, 0, 100)  — 3:1 → 100
  v_score_wl := LEAST(GREATEST(COALESCE(v_avg_wl_ratio, 0) * 33.3, 0), 100);

  -- Max Drawdown: 100 - clamp(drawdown_pct, 0, 100)
  v_score_dd := 100 - LEAST(GREATEST(COALESCE(v_max_drawdown, 0), 0), 100);

  -- Consistency CV: 100 - clamp(cv * 25, 0, 100)  — cv=0 → 100, cv=4 → 0
  v_score_cv := LEAST(GREATEST(100 - COALESCE(v_cv, 0) * 25.0, 0), 100);

  -- Recovery Factor: clamp(recovery * 10, 0, 100)  — RF=10 → 100
  v_score_rf := LEAST(GREATEST(COALESCE(v_recovery, 0) * 10.0, 0), 100);

  -- Weighted composite
  v_composite :=
      v_score_wr * 0.15
    + v_score_pf * 0.25
    + v_score_wl * 0.15
    + v_score_dd * 0.20
    + v_score_cv * 0.15
    + v_score_rf * 0.10;

  -- ════════════════════════════════════════════════════════════════════════════
  -- COMPARISON WINDOW (previous p_window_days period)
  -- days 31–60 ago for a 30-day window
  -- ════════════════════════════════════════════════════════════════════════════
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE outcome = 'WIN'),
    COUNT(*) FILTER (WHERE outcome = 'LOSS'),
    COALESCE(SUM(pnl)  FILTER (WHERE outcome = 'WIN'),  0),
    COALESCE(ABS(SUM(pnl) FILTER (WHERE outcome = 'LOSS')), 0)
  INTO v_prev_total, v_prev_wins, v_prev_losses, v_prev_sum_win, v_prev_sum_loss
  FROM trades
  WHERE user_id    = p_user_id
    AND deleted_at IS NULL
    AND outcome    IN ('WIN', 'LOSS', 'BE')
    AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
    AND close_at   <  (now() - (p_window_days     || ' days')::interval);

  IF v_prev_total = 0 THEN
    v_prev_composite := NULL;
  ELSE
    v_prev_wr := v_prev_wins::numeric   / NULLIF(v_prev_total,  0);
    v_prev_pf := v_prev_sum_win         / NULLIF(v_prev_sum_loss, 0);
    v_prev_wl := (v_prev_sum_win  / NULLIF(v_prev_wins,   0))
               / NULLIF(v_prev_sum_loss / NULLIF(v_prev_losses, 0), 0);

    -- prev drawdown
    WITH ord_p AS (
      SELECT SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_pnl
      FROM trades
      WHERE user_id    = p_user_id
        AND deleted_at IS NULL
        AND outcome    IN ('WIN', 'LOSS', 'BE')
        AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
        AND close_at   <  (now() - (p_window_days     || ' days')::interval)
    ),
    pk_p AS (
      SELECT cum_pnl,
             MAX(cum_pnl) OVER (ORDER BY (SELECT 1) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rp
      FROM ord_p
    )
    SELECT COALESCE(MAX(CASE WHEN rp > 0 THEN (rp - cum_pnl) / rp * 100 ELSE 0 END), 0)
    INTO v_prev_dd
    FROM pk_p;

    -- prev CV
    WITH daily_p AS (
      SELECT SUM(COALESCE(pnl, 0)) AS day_pnl
      FROM trades
      WHERE user_id    = p_user_id
        AND deleted_at IS NULL
        AND outcome    IN ('WIN', 'LOSS', 'BE')
        AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
        AND close_at   <  (now() - (p_window_days     || ' days')::interval)
      GROUP BY DATE_TRUNC('day', close_at AT TIME ZONE 'America/New_York')
    )
    SELECT COALESCE(STDDEV_POP(day_pnl) / NULLIF(AVG(day_pnl) FILTER (WHERE day_pnl > 0), 0), 0)
    INTO v_prev_cv
    FROM daily_p;

    -- prev recovery
    DECLARE
      v_prev_total_pnl numeric;
      v_prev_dd_usd    numeric;
    BEGIN
      SELECT COALESCE(SUM(pnl), 0) INTO v_prev_total_pnl
      FROM trades
      WHERE user_id    = p_user_id
        AND deleted_at IS NULL
        AND outcome    IN ('WIN', 'LOSS', 'BE')
        AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
        AND close_at   <  (now() - (p_window_days     || ' days')::interval);

      WITH o2 AS (
        SELECT SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS c
        FROM trades
        WHERE user_id    = p_user_id
          AND deleted_at IS NULL
          AND outcome    IN ('WIN', 'LOSS', 'BE')
          AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
          AND close_at   <  (now() - (p_window_days     || ' days')::interval)
      ),
      dd2 AS (
        SELECT MAX(MAX(c) OVER () - c) OVER () AS mdd FROM o2
      )
      SELECT COALESCE(MAX(mdd), 0) INTO v_prev_dd_usd FROM dd2;

      v_prev_rf := COALESCE(v_prev_total_pnl / NULLIF(v_prev_dd_usd, 0), 0);
    END;

    v_prev_score_wr := LEAST(GREATEST(COALESCE(v_prev_wr, 0) * 200.0, 0), 100);
    v_prev_score_pf := LEAST(GREATEST(LOG(2, GREATEST(COALESCE(v_prev_pf, 0.01), 0.01)) * 50.0, 0), 100);
    v_prev_score_wl := LEAST(GREATEST(COALESCE(v_prev_wl, 0) * 33.3, 0), 100);
    v_prev_score_dd := 100 - LEAST(GREATEST(COALESCE(v_prev_dd, 0), 0), 100);
    v_prev_score_cv := LEAST(GREATEST(100 - COALESCE(v_prev_cv, 0) * 25.0, 0), 100);
    v_prev_score_rf := LEAST(GREATEST(COALESCE(v_prev_rf, 0) * 10.0, 0), 100);

    v_prev_composite :=
        v_prev_score_wr * 0.15
      + v_prev_score_pf * 0.25
      + v_prev_score_wl * 0.15
      + v_prev_score_dd * 0.20
      + v_prev_score_cv * 0.15
      + v_prev_score_rf * 0.10;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- RETURN
  -- ════════════════════════════════════════════════════════════════════════════
  RETURN jsonb_build_object(
    'score',      ROUND(v_composite),
    'prev_score', CASE WHEN v_prev_composite IS NULL THEN NULL
                       ELSE ROUND(v_prev_composite) END,
    'delta',      CASE WHEN v_prev_composite IS NULL THEN NULL
                       ELSE ROUND(v_composite) - ROUND(v_prev_composite) END,
    'window_days', p_window_days,
    'breakdown', jsonb_build_object(
      'win_rate',        jsonb_build_object('raw', ROUND(COALESCE(v_win_rate,     0) * 100, 1), 'score', ROUND(v_score_wr)),
      'profit_factor',   jsonb_build_object('raw', ROUND(COALESCE(v_profit_factor,0),        2), 'score', ROUND(v_score_pf)),
      'avg_wl',          jsonb_build_object('raw', ROUND(COALESCE(v_avg_wl_ratio, 0),        2), 'score', ROUND(v_score_wl)),
      'max_drawdown_pct',jsonb_build_object('raw', ROUND(COALESCE(v_max_drawdown, 0),        1), 'score', ROUND(v_score_dd)),
      'consistency_cv',  jsonb_build_object('raw', ROUND(COALESCE(v_cv,           0),        3), 'score', ROUND(v_score_cv)),
      'recovery_factor', jsonb_build_object('raw', ROUND(COALESCE(v_recovery,     0),        2), 'score', ROUND(v_score_rf))
    ),
    'trade_count', v_total_closed,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_finotaur_score(uuid, int) TO authenticated;

COMMENT ON FUNCTION get_finotaur_score(uuid, int) IS
  'Composite trader score (0–100) over a rolling window. '
  'Dimensions: Win Rate 15%, Profit Factor 25%, Avg W/L 15%, Max Drawdown 20%, Consistency CV 15%, Recovery Factor 10%. '
  'Returns score, prev_score (prior window), delta, per-dimension breakdown, trade_count, computed_at. '
  'Returns score=null when trade_count=0. SECURITY INVOKER — honours RLS on trades table.';
