-- 20260623_floor_leaderboard_metrics.sql
-- Rich per-trader metrics for the Floor leaderboard (podium + full ranking).
--   * New helper floor_user_metrics(user, start, end) computes win_rate, avg_win,
--     avg_loss, profit_factor, best/worst trade, and longest win streak from the
--     SAME broker-verified trade set used by floor_user_score (no manual entries).
--   * floor_leaderboard + floor_leaderboard_cumulative are extended to return those
--     columns (ranking stays by discipline_score — NOT P&L).
--   * Return signatures change, so the two RPCs are DROP+CREATE'd.

-- ─── 1. Metrics helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.floor_user_metrics(
  p_user  uuid,
  p_start timestamptz DEFAULT NULL,
  p_end   timestamptz DEFAULT NULL
)
RETURNS TABLE(
  win_rate      numeric,
  avg_win       numeric,
  avg_loss      numeric,
  profit_factor numeric,
  best_trade    numeric,
  worst_trade   numeric,
  win_streak    integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT t.pnl, t.close_at
    FROM public.trades t
    WHERE t.user_id = p_user
      AND t.close_at IS NOT NULL
      AND t.deleted_at IS NULL
      AND t.broker IS NOT NULL AND t.broker <> 'manual'
      AND t.import_source IS NOT NULL AND t.import_source <> 'manual'
      AND t.external_id IS NOT NULL
      AND t.pnl IS NOT NULL
      AND (p_start IS NULL OR t.close_at >= p_start)
      AND (p_end   IS NULL OR t.close_at <  p_end)
  ),
  seq AS (
    SELECT (pnl > 0) AS is_win,
           row_number() OVER (ORDER BY close_at)
             - row_number() OVER (PARTITION BY (pnl > 0) ORDER BY close_at) AS grp
    FROM base
  ),
  streaks AS (
    SELECT is_win, count(*) AS run_len
    FROM seq
    GROUP BY is_win, grp
  )
  SELECT
    ROUND(100.0 * count(*) FILTER (WHERE pnl > 0) / NULLIF(count(*), 0), 1),
    ROUND(avg(pnl) FILTER (WHERE pnl > 0), 2),
    ROUND(avg(pnl) FILTER (WHERE pnl < 0), 2),
    ROUND(
      COALESCE(sum(pnl) FILTER (WHERE pnl > 0), 0)
      / NULLIF(ABS(sum(pnl) FILTER (WHERE pnl < 0)), 0), 2
    ),
    max(pnl),
    min(pnl),
    COALESCE((SELECT max(run_len) FROM streaks WHERE is_win), 0)::int
  FROM base;
$function$;

REVOKE ALL ON FUNCTION public.floor_user_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_user_metrics(uuid, timestamptz, timestamptz) TO authenticated;

-- ─── 2. floor_leaderboard (competition) — + metrics ───────────────────────────
DROP FUNCTION IF EXISTS public.floor_leaderboard(uuid);
CREATE FUNCTION public.floor_leaderboard(p_competition_id uuid)
RETURNS TABLE(
  user_id uuid, display_name text, floor_username text, avatar_url text,
  discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer,
  qualified boolean, is_champion boolean,
  win_rate numeric, avg_win numeric, avg_loss numeric, profit_factor numeric,
  best_trade numeric, worst_trade numeric, win_streak integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_comp public.floor_competitions;
BEGIN
  SELECT * INTO v_comp FROM public.floor_competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_comp.status = 'closed' THEN
    RETURN QUERY
      SELECT s.user_id, pr.display_name, pr.floor_username, pr.avatar_url, s.discipline_score,
             (s.components->>'net_pnl')::numeric, s.trade_count, s.rank,
             (s.trade_count >= v_comp.min_trades),
             EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = s.user_id),
             m.win_rate, m.avg_win, m.avg_loss, m.profit_factor, m.best_trade, m.worst_trade, m.win_streak
      FROM public.floor_score_snapshots s
      JOIN public.profiles pr ON pr.id = s.user_id
      CROSS JOIN LATERAL public.floor_user_metrics(s.user_id, v_comp.period_start, v_comp.period_end) m
      WHERE s.competition_id = p_competition_id
      ORDER BY s.rank NULLS LAST, s.discipline_score DESC NULLS LAST;
    RETURN;
  END IF;

  RETURN QUERY
  WITH parts AS (
    SELECT fp.user_id FROM public.floor_participants fp
    WHERE fp.competition_id = v_comp.id AND fp.is_public AND fp.status = 'active'
  ),
  scored AS (
    SELECT pa.user_id, pr.display_name, pr.floor_username, pr.avatar_url,
           sc.discipline_score, sc.net_pnl, sc.trade_count,
           (sc.trade_count >= v_comp.min_trades AND sc.discipline_score IS NOT NULL) AS qualified,
           m.win_rate, m.avg_win, m.avg_loss, m.profit_factor, m.best_trade, m.worst_trade, m.win_streak
    FROM parts pa
    JOIN public.profiles pr ON pr.id = pa.user_id
    CROSS JOIN LATERAL public.floor_user_score(pa.user_id, v_comp.period_start, v_comp.period_end) sc
    CROSS JOIN LATERAL public.floor_user_metrics(pa.user_id, v_comp.period_start, v_comp.period_end) m
  ),
  ranked AS (
    SELECT s.*, CASE WHEN s.qualified
      THEN RANK() OVER (PARTITION BY s.qualified ORDER BY s.discipline_score DESC) END::int AS rnk
    FROM scored s
  )
  SELECT r.user_id, r.display_name, r.floor_username, r.avatar_url, r.discipline_score,
         r.net_pnl, r.trade_count, r.rnk, r.qualified,
         EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = r.user_id),
         r.win_rate, r.avg_win, r.avg_loss, r.profit_factor, r.best_trade, r.worst_trade, r.win_streak
  FROM ranked r
  ORDER BY r.qualified DESC, r.rnk NULLS LAST, r.trade_count DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_leaderboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard(uuid) TO authenticated;

-- ─── 3. floor_leaderboard_cumulative (this_year / all_time) — + metrics ───────
DROP FUNCTION IF EXISTS public.floor_leaderboard_cumulative(text);
CREATE FUNCTION public.floor_leaderboard_cumulative(p_scope text DEFAULT 'all_time'::text)
RETURNS TABLE(
  user_id uuid, display_name text, floor_username text, avatar_url text,
  discipline_score numeric, net_pnl numeric, trade_count bigint, rank integer,
  qualified boolean, is_champion boolean,
  win_rate numeric, avg_win numeric, avg_loss numeric, profit_factor numeric,
  best_trade numeric, worst_trade numeric, win_streak integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_start timestamptz; v_min CONSTANT int := 20;
BEGIN
  v_start := CASE WHEN p_scope = 'this_year' THEN date_trunc('year', now()) ELSE NULL END;
  RETURN QUERY
  WITH parts AS (SELECT DISTINCT fp.user_id FROM public.floor_participants fp WHERE fp.is_public),
  scored AS (
    SELECT pa.user_id, pr.display_name, pr.floor_username, pr.avatar_url,
           sc.discipline_score, sc.net_pnl, sc.trade_count,
           (sc.trade_count >= v_min AND sc.discipline_score IS NOT NULL) AS qualified,
           m.win_rate, m.avg_win, m.avg_loss, m.profit_factor, m.best_trade, m.worst_trade, m.win_streak
    FROM parts pa
    JOIN public.profiles pr ON pr.id = pa.user_id
    CROSS JOIN LATERAL public.floor_user_score(pa.user_id, v_start, NULL) sc
    CROSS JOIN LATERAL public.floor_user_metrics(pa.user_id, v_start, NULL) m
  ),
  ranked AS (
    SELECT s.*, CASE WHEN s.qualified
      THEN RANK() OVER (PARTITION BY s.qualified ORDER BY s.discipline_score DESC) END::int AS rnk
    FROM scored s
  )
  SELECT r.user_id, r.display_name, r.floor_username, r.avatar_url, r.discipline_score,
         r.net_pnl, r.trade_count, r.rnk, r.qualified,
         EXISTS(SELECT 1 FROM public.floor_winners w WHERE w.user_id = r.user_id),
         r.win_rate, r.avg_win, r.avg_loss, r.profit_factor, r.best_trade, r.worst_trade, r.win_streak
  FROM ranked r
  ORDER BY r.qualified DESC, r.rnk NULLS LAST, r.trade_count DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.floor_leaderboard_cumulative(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.floor_leaderboard_cumulative(text) TO authenticated;
