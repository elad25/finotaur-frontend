-- Fix: get_finotaur_score() threw "42P20: window function calls cannot be nested"
-- for ANY user with closed trades, so the FINOTAUR AI score was broken in production
-- for everyone with trade history (only the 0-trade early-return path succeeded).
--
-- Root cause: two max-drawdown-in-USD blocks computed an aggregate MAX(...) OVER ()
-- wrapping an expression that already contained a window MAX(...) OVER (...) — an
-- illegal nested window function. Fixed by splitting each into the correct two-level
-- pattern (running peak as a window in one CTE, then a plain aggregate MAX of
-- running_peak - cum_pnl), matching the percentage-drawdown blocks that were already correct.
--
-- Only the two USD-drawdown blocks changed (current-window dd_usd -> peaks2, and
-- prev-window dd2 -> pk2). Everything else is byte-identical to the prior definition.
-- Applied to production (project xsgbtptkueabylkxibly) on 2026-05-30.

CREATE OR REPLACE FUNCTION public.get_finotaur_score(p_user_id uuid, p_window_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_closed   int;
  v_wins           int;
  v_losses         int;
  v_sum_win_pnl    numeric;
  v_sum_loss_pnl   numeric;
  v_avg_win        numeric;
  v_avg_loss       numeric;
  v_profit_factor  numeric;
  v_win_rate       numeric;
  v_avg_wl_ratio   numeric;
  v_max_drawdown   numeric;
  v_cv             numeric;
  v_recovery       numeric;

  v_score_wr       numeric;
  v_score_pf       numeric;
  v_score_wl       numeric;
  v_score_dd       numeric;
  v_score_cv       numeric;
  v_score_rf       numeric;
  v_composite      numeric;

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
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE outcome = 'WIN'),
    COUNT(*) FILTER (WHERE outcome = 'LOSS'),
    COALESCE(SUM(pnl) FILTER (WHERE outcome = 'WIN'),  0),
    COALESCE(ABS(SUM(pnl) FILTER (WHERE outcome = 'LOSS')), 0)
  INTO v_total_closed, v_wins, v_losses, v_sum_win_pnl, v_sum_loss_pnl
  FROM trades
  WHERE user_id    = p_user_id
    AND deleted_at IS NULL
    AND outcome    IN ('WIN', 'LOSS', 'BE')
    AND close_at   >= (now() - (p_window_days || ' days')::interval);

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

  v_win_rate      := v_wins::numeric / NULLIF(v_total_closed, 0);
  v_avg_win       := v_sum_win_pnl   / NULLIF(v_wins,   0);
  v_avg_loss      := v_sum_loss_pnl  / NULLIF(v_losses, 0);
  v_profit_factor := v_sum_win_pnl   / NULLIF(v_sum_loss_pnl, 0);
  v_avg_wl_ratio  := COALESCE(v_avg_win, 0) / NULLIF(COALESCE(v_avg_loss, 0), 0);

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

    -- FIXED: running peak as a window, then plain aggregate MAX of (peak - cum_pnl).
    WITH ordered2 AS (
      SELECT close_at,
             SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_pnl
      FROM trades
      WHERE user_id    = p_user_id
        AND deleted_at IS NULL
        AND outcome    IN ('WIN', 'LOSS', 'BE')
        AND close_at   >= (now() - (p_window_days || ' days')::interval)
    ),
    peaks2 AS (
      SELECT cum_pnl,
             MAX(cum_pnl) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_peak
      FROM ordered2
    )
    SELECT COALESCE(MAX(running_peak - cum_pnl), 0)
    INTO v_max_dd_usd
    FROM peaks2;

    v_recovery := COALESCE(v_total_pnl / NULLIF(v_max_dd_usd, 0), 0);
  END;

  v_score_wr := LEAST(GREATEST(COALESCE(v_win_rate, 0) * 200.0, 0), 100);
  v_score_pf := LEAST(GREATEST(LOG(2, GREATEST(COALESCE(v_profit_factor, 0.01), 0.01)) * 50.0, 0), 100);
  v_score_wl := LEAST(GREATEST(COALESCE(v_avg_wl_ratio, 0) * 33.3, 0), 100);
  v_score_dd := 100 - LEAST(GREATEST(COALESCE(v_max_drawdown, 0), 0), 100);
  v_score_cv := LEAST(GREATEST(100 - COALESCE(v_cv, 0) * 25.0, 0), 100);
  v_score_rf := LEAST(GREATEST(COALESCE(v_recovery, 0) * 10.0, 0), 100);

  v_composite :=
      v_score_wr * 0.15
    + v_score_pf * 0.25
    + v_score_wl * 0.15
    + v_score_dd * 0.20
    + v_score_cv * 0.15
    + v_score_rf * 0.10;

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

      -- FIXED: running peak as a window, then plain aggregate MAX of (peak - c).
      WITH o2 AS (
        SELECT close_at,
               SUM(COALESCE(pnl, 0)) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS c
        FROM trades
        WHERE user_id    = p_user_id
          AND deleted_at IS NULL
          AND outcome    IN ('WIN', 'LOSS', 'BE')
          AND close_at   >= (now() - (p_window_days * 2 || ' days')::interval)
          AND close_at   <  (now() - (p_window_days     || ' days')::interval)
      ),
      pk2 AS (
        SELECT c,
               MAX(c) OVER (ORDER BY close_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_peak
        FROM o2
      )
      SELECT COALESCE(MAX(running_peak - c), 0) INTO v_prev_dd_usd FROM pk2;

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
$function$;
