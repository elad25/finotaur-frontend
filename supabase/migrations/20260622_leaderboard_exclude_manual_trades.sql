-- 20260622_leaderboard_exclude_manual_trades.sql
-- Update global_leaderboard RPC to exclude manually entered trades.
--
-- The original function (community_03_rpcs) counted every closed trade.
-- Per product requirement: only broker-synced trades count on the leaderboard
-- (trades where import_source IS NULL [legacy rows] or != 'manual').
--
-- Only the WHERE clause changes; everything else is identical to the original.

CREATE OR REPLACE FUNCTION public.global_leaderboard(
  p_period text DEFAULT 'all',
  p_metric text DEFAULT 'net_pnl'
)
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  net_pnl      numeric,
  win_rate     numeric,
  trade_count  bigint,
  rank         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL
  END;

  RETURN QUERY
  WITH member_stats AS (
    SELECT
      t.user_id,
      COALESCE(SUM(t.pnl), 0)                                              AS net_pnl,
      COUNT(*)                                                              AS trade_count,
      (COUNT(*) FILTER (WHERE t.pnl > 0))::numeric / NULLIF(COUNT(*), 0)  AS win_rate
    FROM public.trades t
    JOIN public.profiles pr ON pr.id = t.user_id
    WHERE
      pr.global_leaderboard_opt_in         = true
      AND pr.platform_plan                <> 'free'
      AND pr.platform_subscription_status IN ('active', 'trial')
      AND t.close_at   IS NOT NULL
      AND t.deleted_at IS NULL
      -- Broker-synced trades only: exclude manually entered trades.
      -- NULL import_source = legacy rows imported before this column existed.
      AND (t.import_source IS NULL OR t.import_source != 'manual')
      AND (v_start IS NULL OR t.close_at >= v_start)
    GROUP BY t.user_id
    HAVING COUNT(*) >= 1
  )
  SELECT
    ms.user_id,
    COALESCE(p.display_name, p.email)           AS display_name,
    ms.net_pnl,
    ms.win_rate,
    ms.trade_count,
    RANK() OVER (ORDER BY ms.net_pnl DESC)      AS rank
  FROM member_stats ms
  JOIN public.profiles p ON p.id = ms.user_id
  ORDER BY rank;
END;
$$;

REVOKE ALL ON FUNCTION public.global_leaderboard(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_leaderboard(text, text) TO authenticated;

COMMENT ON FUNCTION public.global_leaderboard(text, text) IS
  'Platform-wide leaderboard for opted-in paying users. Only broker-synced trades '
  '(import_source != manual) count — manual journal entries are excluded. '
  'Eligibility: global_leaderboard_opt_in=true AND platform_plan<>free AND '
  'platform_subscription_status IN (active, trial). SECURITY DEFINER.';
