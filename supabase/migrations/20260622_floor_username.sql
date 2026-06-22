-- 20260622_floor_username.sql
-- Add floor_username to profiles so Floor members can set a unique handle.
-- Rules: 3-20 chars, lowercase a-z, 0-9, underscore. NULL = not set (show display_name/email fallback).
-- Also updates the three community RPCs to prefer floor_username in their display name COALESCE.

-- ─── 1. Column + constraint + unique index ────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS floor_username text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_floor_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_floor_username_format
  CHECK (floor_username IS NULL OR floor_username ~ '^[a-z0-9_]{3,20}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_floor_username_unique
  ON public.profiles (floor_username)
  WHERE floor_username IS NOT NULL;

-- ─── 2. global_leaderboard — add floor_username to display fallback ───────────
-- Replaces 20260622_leaderboard_exclude_manual_trades.sql (identical except COALESCE).

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
      AND (t.import_source IS NULL OR t.import_source != 'manual')
      AND (v_start IS NULL OR t.close_at >= v_start)
    GROUP BY t.user_id
    HAVING COUNT(*) >= 1
  )
  SELECT
    ms.user_id,
    COALESCE(p.floor_username, p.display_name, p.email) AS display_name,
    ms.net_pnl,
    COALESCE(ms.win_rate, 0)                            AS win_rate,
    ms.trade_count,
    RANK() OVER (
      ORDER BY
        CASE WHEN p_metric = 'win_rate'    THEN ms.win_rate    ELSE NULL END DESC NULLS LAST,
        CASE WHEN p_metric != 'win_rate'   THEN ms.net_pnl     ELSE NULL END DESC NULLS LAST
    )                                                   AS rank
  FROM  member_stats ms
  JOIN  public.profiles p ON p.id = ms.user_id
  ORDER BY rank ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.global_leaderboard(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_leaderboard(text, text) TO authenticated;

-- ─── 3. list_global_feed — prefer floor_username for author_name ──────────────

CREATE OR REPLACE FUNCTION public.list_global_feed(
  p_before timestamptz DEFAULT NULL,
  p_limit  int         DEFAULT 20
)
RETURNS TABLE (
  id               uuid,
  author_id        uuid,
  author_name      text,
  body             text,
  attached_trade_id uuid,
  trade_symbol     text,
  trade_side       text,
  trade_pnl        numeric,
  trade_size       numeric,
  trade_setup      text,
  trade_entry      numeric,
  trade_exit       numeric,
  trade_close_at   timestamptz,
  hide_pnl         boolean,
  show_setup_only  boolean,
  reveal_size      boolean,
  pinned           boolean,
  created_at       timestamptz,
  comment_count    bigint,
  up_count         bigint,
  down_count       bigint,
  repost_count     bigint,
  my_reaction      text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    gp.id,
    gp.author_id,
    COALESCE(pr.floor_username, pr.display_name, pr.email) AS author_name,
    gp.body,
    gp.attached_trade_id,
    t.symbol                                               AS trade_symbol,
    t.side                                                 AS trade_side,
    CASE WHEN gp.hide_pnl        THEN NULL ELSE t.pnl    END AS trade_pnl,
    CASE WHEN NOT gp.reveal_size THEN NULL ELSE t.size   END AS trade_size,
    t.setup                                                AS trade_setup,
    CASE WHEN gp.show_setup_only THEN NULL ELSE t.entry  END AS trade_entry,
    CASE WHEN gp.show_setup_only THEN NULL ELSE t.exit   END AS trade_exit,
    t.close_at                                             AS trade_close_at,
    gp.hide_pnl,
    gp.show_setup_only,
    gp.reveal_size,
    gp.pinned,
    gp.created_at,
    COUNT(DISTINCT gc.id)                                  AS comment_count,
    COUNT(DISTINCT gr.id) FILTER (WHERE gr.kind = 'up')    AS up_count,
    COUNT(DISTINCT gr.id) FILTER (WHERE gr.kind = 'down')  AS down_count,
    COUNT(DISTINCT gr.id) FILTER (WHERE gr.kind = 'repost') AS repost_count,
    (SELECT kind FROM public.global_post_reactions
      WHERE post_id = gp.id AND user_id = auth.uid()
      LIMIT 1)                                             AS my_reaction
  FROM  public.global_posts             gp
  JOIN  public.profiles                 pr ON pr.id = gp.author_id
  LEFT  JOIN public.trades              t  ON t.id  = gp.attached_trade_id
  LEFT  JOIN public.global_post_comments gc ON gc.post_id = gp.id AND gc.deleted_at IS NULL
  LEFT  JOIN public.global_post_reactions gr ON gr.post_id = gp.id
  WHERE gp.deleted_at IS NULL
    AND (p_before IS NULL OR gp.created_at < p_before)
  GROUP BY gp.id, pr.floor_username, pr.display_name, pr.email,
           t.symbol, t.side, t.pnl, t.size, t.setup, t.entry, t.exit, t.close_at
  ORDER BY gp.pinned DESC, gp.created_at DESC
  LIMIT LEAST(p_limit, 50);
END;
$$;

REVOKE ALL ON FUNCTION public.list_global_feed(timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_global_feed(timestamptz, int) TO authenticated;

-- ─── 4. list_global_comments — prefer floor_username ─────────────────────────

CREATE OR REPLACE FUNCTION public.list_global_comments(
  p_post  uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  author_id   uuid,
  author_name text,
  body        text,
  created_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.author_id,
    COALESCE(p.floor_username, p.display_name, p.email) AS author_name,
    c.body,
    c.created_at
  FROM  public.global_post_comments c
  JOIN  public.profiles              p ON p.id = c.author_id
  WHERE c.post_id    = p_post
    AND c.deleted_at IS NULL
  ORDER BY c.created_at ASC
  LIMIT LEAST(p_limit, 200);
END;
$$;

REVOKE ALL ON FUNCTION public.list_global_comments(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_global_comments(uuid, int) TO authenticated;

COMMENT ON COLUMN public.profiles.floor_username IS
  'Unique Floor handle chosen by the user. 3-20 chars, lowercase a-z/0-9/_. '
  'Shown instead of display_name on the community feed, leaderboard, and comments.';
