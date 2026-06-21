-- Member Analytics RPCs.
-- Two RPCs for mentor dashboards: space-level summary and per-member performance.
-- Privacy: only active members with journal_shared = true are included in trade aggregates.
-- v1 note: raw pnl per user — copier-account de-duplication is a future refinement.

-- ─── Helper CTE logic note ────────────────────────────────────────────────────
-- Both RPCs share the same population and period logic:
--   Population : space_members WHERE space_id=p_space AND status='active'
--                AND journal_shared=true
--   Closed trade: close_at IS NOT NULL AND deleted_at IS NULL
--   Period      : 'this_month' → date_trunc('month', now())
--                 'this_year'  → date_trunc('year',  now())
--                 anything else (incl. 'all') → no lower bound
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. space_analytics_summary ───────────────────────────────────────────────
-- Space-wide aggregate for the mentor dashboard header.
--   space_net_pnl   : total pnl across all opted-in members' qualifying trades.
--   avg_win_rate    : average per-member win_rate (0..1) over members with >=1 trade.
--   member_count    : all active+shared members regardless of whether they traded.
--   needs_attention : members (with >=1 trade) whose net_pnl < 0 OR win_rate < 0.40.
CREATE OR REPLACE FUNCTION public.space_analytics_summary(
  p_space  uuid,
  p_period text DEFAULT 'this_month'
)
RETURNS TABLE (
  space_net_pnl   numeric,
  avg_win_rate    numeric,
  member_count    int,
  needs_attention int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  -- Access guard: caller must be an active member of the space.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Resolve period lower bound.
  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL  -- 'all' or unknown: no lower bound
  END;

  RETURN QUERY
  WITH
  -- All active+shared members of the space (for member_count denominator).
  eligible_members AS (
    SELECT sm.user_id
    FROM public.space_members sm
    WHERE sm.space_id       = p_space
      AND sm.status         = 'active'
      AND sm.journal_shared = true   -- privacy: only opted-in members
  ),
  -- Per-member aggregates for members who have at least one qualifying trade.
  per_member AS (
    SELECT
      sm.user_id,
      -- v1: raw pnl sum — copier-account de-duplication is a future refinement.
      COALESCE(SUM(t.pnl), 0)                                              AS net_pnl,
      (COUNT(*) FILTER (WHERE t.pnl > 0))::numeric / NULLIF(COUNT(*), 0)  AS win_rate
    FROM public.space_members sm
    JOIN public.trades t
      ON  t.user_id    = sm.user_id
      AND t.close_at   IS NOT NULL   -- closed trade: identified by close_at IS NOT NULL
      AND t.deleted_at IS NULL       -- exclude soft-deleted trades
      AND (v_start IS NULL OR t.close_at >= v_start)
    WHERE sm.space_id       = p_space
      AND sm.status         = 'active'
      AND sm.journal_shared = true
    GROUP BY sm.user_id
    HAVING COUNT(*) >= 1
  )
  SELECT
    COALESCE(SUM(pm.net_pnl), 0)::numeric                                  AS space_net_pnl,
    AVG(pm.win_rate)::numeric                                               AS avg_win_rate,
    (SELECT COUNT(*)::int FROM eligible_members)                            AS member_count,
    COUNT(*) FILTER (WHERE pm.net_pnl < 0 OR pm.win_rate < 0.40)::int     AS needs_attention
  FROM per_member pm;
END;
$$;

REVOKE ALL ON FUNCTION public.space_analytics_summary(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.space_analytics_summary(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.space_analytics_summary(uuid, text) IS
  'Space-wide analytics summary for a mentor_space. Aggregates opted-in members only. SECURITY DEFINER — requires active space membership.';


-- ── 2. space_member_performance ──────────────────────────────────────────────
-- Per-member performance breakdown. Includes only active+shared members with
-- at least one qualifying trade in the period. Ordered by net_pnl DESC.
--   needs_attention : net_pnl < 0 OR win_rate < 0.40 for that member.
CREATE OR REPLACE FUNCTION public.space_member_performance(
  p_space  uuid,
  p_period text DEFAULT 'this_month'
)
RETURNS TABLE (
  user_id         uuid,
  display_name    text,
  net_pnl         numeric,
  win_rate        numeric,
  trade_count     int,
  needs_attention boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  -- Access guard: caller must be an active member of the space.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Resolve period lower bound.
  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL  -- 'all' or unknown: no lower bound
  END;

  RETURN QUERY
  SELECT
    sm.user_id,
    p.display_name,
    -- v1: raw pnl sum — copier-account de-duplication is a future refinement.
    COALESCE(SUM(t.pnl), 0)::numeric                                             AS net_pnl,
    ((COUNT(*) FILTER (WHERE t.pnl > 0))::numeric / NULLIF(COUNT(*), 0))::numeric AS win_rate,
    COUNT(*)::int                                                                 AS trade_count,
    (COALESCE(SUM(t.pnl), 0) < 0
      OR (COUNT(*) FILTER (WHERE t.pnl > 0))::numeric
         / NULLIF(COUNT(*), 0) < 0.40)                                           AS needs_attention
  FROM public.space_members sm
  JOIN public.profiles p ON p.id = sm.user_id
  JOIN public.trades t
    ON  t.user_id    = sm.user_id
    AND t.close_at   IS NOT NULL   -- closed trade: identified by close_at IS NOT NULL
    AND t.deleted_at IS NULL       -- exclude soft-deleted trades
    AND (v_start IS NULL OR t.close_at >= v_start)
  WHERE sm.space_id       = p_space
    AND sm.status         = 'active'
    AND sm.journal_shared = true   -- privacy: only opted-in members
  GROUP BY sm.user_id, p.display_name
  HAVING COUNT(*) >= 1
  ORDER BY net_pnl DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.space_member_performance(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.space_member_performance(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.space_member_performance(uuid, text) IS
  'Per-member performance breakdown for a mentor_space. Opted-in members with >=1 trade only, ordered by net_pnl DESC. SECURITY DEFINER — requires active space membership.';
