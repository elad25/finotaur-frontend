-- Room Leaderboard RPC.
-- Aggregates closed trades of opted-in members (journal_shared = true) for a space.
-- Privacy: members with journal_shared = false are NEVER included.
-- v1 note: raw pnl per user — copier-account de-duplication is a future refinement.

-- Returns one row per opted-in member who has at least one qualifying closed trade
-- in the requested period. rank is computed by net_pnl DESC.
CREATE OR REPLACE FUNCTION public.space_leaderboard(
  p_space  uuid,
  p_period text DEFAULT 'all'
)
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  net_pnl      numeric,
  win_rate     numeric,
  trade_count  int,
  rank         int
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

  -- Resolve period lower bound (treat unknown values as 'all').
  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL  -- 'all': no lower bound
  END;

  RETURN QUERY
  WITH member_stats AS (
    SELECT
      sm.user_id,
      -- v1: raw pnl sum — copier-account de-duplication is a future refinement.
      COALESCE(SUM(t.pnl), 0)                                              AS net_pnl,
      COUNT(*)::int                                                         AS trade_count,
      -- win_rate as a 0..1 fraction; frontend formats as percentage.
      (COUNT(*) FILTER (WHERE t.pnl > 0))::numeric / NULLIF(COUNT(*), 0)  AS win_rate
    FROM public.space_members sm
    JOIN public.trades t
      ON  t.user_id    = sm.user_id
      AND t.close_at   IS NOT NULL       -- closed trade: identified by close_at IS NOT NULL
      AND t.deleted_at IS NULL           -- exclude soft-deleted trades
      AND (v_start IS NULL OR t.close_at >= v_start)
    WHERE sm.space_id       = p_space
      AND sm.status         = 'active'
      AND sm.journal_shared = true       -- privacy: only opted-in members
    GROUP BY sm.user_id
    -- Only include members who have at least one qualifying trade.
    HAVING COUNT(*) >= 1
  )
  SELECT
    ms.user_id,
    p.display_name,
    ms.net_pnl,
    ms.win_rate,
    ms.trade_count,
    ROW_NUMBER() OVER (ORDER BY ms.net_pnl DESC)::int AS rank
  FROM member_stats ms
  JOIN public.profiles p ON p.id = ms.user_id
  ORDER BY rank;
END;
$$;

REVOKE ALL ON FUNCTION public.space_leaderboard(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.space_leaderboard(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.space_leaderboard(uuid, text) IS
  'Returns ranked leaderboard for a mentor_space. Only active members with journal_shared=true and at least one closed trade in the period are included. SECURITY DEFINER — requires active space membership.';
