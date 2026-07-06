-- 2026-07-06 — "Verified trades only" gate for the FINOTAUR community feed.
--
-- Product rule: a trade is BROKER-VERIFIED iff its `broker` column is a real
-- broker (broker <> 'manual'). Both hand-typed trades (import_source='manual')
-- and AI-screenshot trades (import_source='api') carry broker='manual' — both
-- are UNVERIFIED.
--   • Global feed        → HARD BLOCK unverified trades (enforced in
--                          share_trade(), scope='global' ONLY).
--   • Community rooms     → ALLOWED (no new restriction).
--   • Mentor 1:1 review   → ALLOWED (no new restriction).
--   • Room feed (list_posts) → gains a `trade_is_manual` flag so the client can
--     render a "Manual trade" badge next to unverified trades shared into a room.
--
-- ⚠️ SOURCE OF TRUTH: all three function bodies below were reproduced from the
-- LIVE database via `pg_get_functiondef(...)` on 2026-07-06, NOT from committed
-- migration files. The committed history had DRIFTED from production in two
-- material ways that would have caused regressions if trusted:
--   1. share_trade's paid-user guard is `NOT is_paying_user() AND NOT is_admin()`
--      live (the committed 6-arg file omitted the is_admin clause → would block
--      admins from the global feed).
--   2. list_posts live returns `reactions jsonb` + `my_reaction text` (the
--      64-emoji reactions system); the committed file still had the old
--      `my_reacted boolean` → a DROP+CREATE from it would have wiped reactions.
-- Only the broker-verification gate (share_trade) and the trade_is_manual column
-- (list_posts) are NEW here; everything else is verbatim from live.
--
-- Idempotency: share_trade uses CREATE OR REPLACE (signature unchanged → ACL is
-- preserved automatically, so NO grant statements are emitted for it). list_posts
-- changes its return type (new trailing column) → requires DROP + CREATE, after
-- which the exact live grants are re-emitted. Re-running this file is safe.

-- ─────────────────────────────────────────────────────────────────────────────
-- A1a. share_trade — 6-arg overload. Adds broker-verification gate for
--      scope='global' only. CREATE OR REPLACE preserves the existing ACL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.share_trade(
  p_trade_id        uuid,
  p_destinations    jsonb,
  p_hide_pnl        boolean DEFAULT false,
  p_show_setup_only boolean DEFAULT false,
  p_reveal_size     boolean DEFAULT false,
  p_caption         text    DEFAULT NULL::text
)
RETURNS SETOF trade_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner          uuid;
  v_broker         text;
  d                jsonb;
  v_scope          text;
  v_room           uuid;
  v_mentor         uuid;
  v_global_post_id uuid;
  v_space_post_id  uuid;
  v_review_id      uuid;
  v_share_row      public.trade_shares;
BEGIN
  SELECT user_id, broker INTO v_owner, v_broker
  FROM public.trades
  WHERE id = p_trade_id AND deleted_at IS NULL;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'trade_not_found' USING errcode = 'P0002';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_trade_owner' USING errcode = '42501';
  END IF;

  FOR d IN SELECT * FROM jsonb_array_elements(p_destinations)
  LOOP
    v_scope          := d->>'scope';
    v_room           := NULL;
    v_mentor         := NULL;
    v_global_post_id := NULL;
    v_space_post_id  := NULL;
    v_review_id      := NULL;

    IF v_scope = 'global' THEN
      IF NOT public.is_paying_user() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
      END IF;
      -- Verified-trades-only gate (global feed ONLY). Manual / AI-screenshot
      -- trades (broker = 'manual', or no broker) can never reach the global feed.
      IF COALESCE(v_broker, 'manual') = 'manual' THEN
        RAISE EXCEPTION 'trade_not_broker_verified' USING errcode = '42501';
      END IF;
      INSERT INTO public.global_posts (author_id, body, attached_trade_id, hide_pnl, show_setup_only, reveal_size)
      VALUES (auth.uid(), p_caption, p_trade_id, p_hide_pnl, p_show_setup_only, p_reveal_size)
      RETURNING id INTO v_global_post_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, hide_pnl, show_setup_only, reveal_size, caption, global_post_id)
      VALUES (p_trade_id, auth.uid(), 'global', p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_global_post_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSIF v_scope = 'community' THEN
      v_room := (d->>'room_id')::uuid;
      IF v_room IS NULL THEN
        RAISE EXCEPTION 'community_scope_requires_room_id' USING errcode = 'P0001';
      END IF;
      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;
      INSERT INTO public.space_posts (space_id, author_id, body, attached_trade_id)
      VALUES (v_room, auth.uid(), COALESCE(p_caption, ''), p_trade_id)
      RETURNING id INTO v_space_post_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, room_id, hide_pnl, show_setup_only, reveal_size, caption, space_post_id)
      VALUES (p_trade_id, auth.uid(), 'community', v_room, p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_space_post_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSIF v_scope = 'mentor' THEN
      v_room   := (d->>'room_id')::uuid;
      v_mentor := (d->>'target_mentor_id')::uuid;
      IF v_room IS NULL THEN
        RAISE EXCEPTION 'mentor_scope_requires_room_id' USING errcode = 'P0001';
      END IF;
      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;
      INSERT INTO public.space_trade_reviews (space_id, trade_id, requester_id)
      VALUES (v_room, p_trade_id, auth.uid())
      RETURNING id INTO v_review_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, room_id, target_mentor_id, hide_pnl, show_setup_only, reveal_size, caption, review_id)
      VALUES (p_trade_id, auth.uid(), 'mentor', v_room, v_mentor, p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_review_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSE
      RAISE EXCEPTION 'invalid_scope: %', v_scope USING errcode = 'P0001';
    END IF;
  END LOOP;
  RETURN;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A1b. share_trade — 7-arg overload (adds p_strategy_category). Same broker gate.
--      Body reproduced from live pg_get_functiondef. CREATE OR REPLACE preserves ACL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.share_trade(
  p_trade_id          uuid,
  p_destinations      jsonb,
  p_hide_pnl          boolean DEFAULT false,
  p_show_setup_only   boolean DEFAULT false,
  p_reveal_size       boolean DEFAULT false,
  p_caption           text    DEFAULT NULL::text,
  p_strategy_category text    DEFAULT NULL::text
)
RETURNS SETOF trade_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner          uuid;
  v_broker         text;
  d                jsonb;
  v_scope          text;
  v_room           uuid;
  v_mentor         uuid;
  v_global_post_id uuid;
  v_space_post_id  uuid;
  v_review_id      uuid;
  v_share_row      public.trade_shares;
BEGIN
  SELECT user_id, broker INTO v_owner, v_broker
  FROM public.trades
  WHERE id = p_trade_id AND deleted_at IS NULL;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'trade_not_found' USING errcode = 'P0002';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_trade_owner' USING errcode = '42501';
  END IF;

  FOR d IN SELECT * FROM jsonb_array_elements(p_destinations)
  LOOP
    v_scope          := d->>'scope';
    v_room           := NULL;
    v_mentor         := NULL;
    v_global_post_id := NULL;
    v_space_post_id  := NULL;
    v_review_id      := NULL;

    IF v_scope = 'global' THEN
      IF NOT public.is_paying_user() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
      END IF;
      -- Verified-trades-only gate (global feed ONLY). Manual / AI-screenshot
      -- trades (broker = 'manual', or no broker) can never reach the global feed.
      IF COALESCE(v_broker, 'manual') = 'manual' THEN
        RAISE EXCEPTION 'trade_not_broker_verified' USING errcode = '42501';
      END IF;
      IF p_strategy_category IS NULL OR trim(p_strategy_category) = '' THEN
        RAISE EXCEPTION 'strategy_category_required' USING errcode = 'P0001';
      END IF;
      INSERT INTO public.global_posts (author_id, body, attached_trade_id, hide_pnl, show_setup_only, reveal_size, strategy_category)
      VALUES (auth.uid(), p_caption, p_trade_id, p_hide_pnl, p_show_setup_only, p_reveal_size, p_strategy_category)
      RETURNING id INTO v_global_post_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, hide_pnl, show_setup_only, reveal_size, caption, global_post_id)
      VALUES (p_trade_id, auth.uid(), 'global', p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_global_post_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSIF v_scope = 'community' THEN
      v_room := (d->>'room_id')::uuid;
      IF v_room IS NULL THEN
        RAISE EXCEPTION 'community_scope_requires_room_id' USING errcode = 'P0001';
      END IF;
      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;
      INSERT INTO public.space_posts (space_id, author_id, body, attached_trade_id)
      VALUES (v_room, auth.uid(), COALESCE(p_caption, ''), p_trade_id)
      RETURNING id INTO v_space_post_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, room_id, hide_pnl, show_setup_only, reveal_size, caption, space_post_id)
      VALUES (p_trade_id, auth.uid(), 'community', v_room, p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_space_post_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSIF v_scope = 'mentor' THEN
      v_room   := (d->>'room_id')::uuid;
      v_mentor := (d->>'target_mentor_id')::uuid;
      IF v_room IS NULL THEN
        RAISE EXCEPTION 'mentor_scope_requires_room_id' USING errcode = 'P0001';
      END IF;
      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;
      INSERT INTO public.space_trade_reviews (space_id, trade_id, requester_id)
      VALUES (v_room, p_trade_id, auth.uid())
      RETURNING id INTO v_review_id;
      INSERT INTO public.trade_shares (trade_id, author_id, scope, room_id, target_mentor_id, hide_pnl, show_setup_only, reveal_size, caption, review_id)
      VALUES (p_trade_id, auth.uid(), 'mentor', v_room, v_mentor, p_hide_pnl, p_show_setup_only, p_reveal_size, p_caption, v_review_id)
      RETURNING * INTO v_share_row;
      RETURN NEXT v_share_row;

    ELSE
      RAISE EXCEPTION 'invalid_scope: %', v_scope USING errcode = 'P0001';
    END IF;
  END LOOP;
  RETURN;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A2. list_posts — add trade_is_manual (last column) so the room feed can badge
--     unverified shares. Return-type change → DROP + CREATE. Body reproduced from
--     LIVE pg_get_functiondef (includes reactions jsonb + my_reaction text).
--     Grants re-emitted to match live exactly (anon, authenticated, service_role;
--     PUBLIC keeps the default EXECUTE that CREATE grants).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.list_posts(uuid, timestamp with time zone, integer);

CREATE FUNCTION public.list_posts(
  p_space  uuid,
  p_before timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_limit  integer                  DEFAULT 20
)
RETURNS TABLE(
  id                uuid,
  author_id         uuid,
  author_name       text,
  body              text,
  attached_trade_id uuid,
  trade_symbol      text,
  trade_side        text,
  trade_pnl         numeric,
  trade_close_at    timestamp with time zone,
  pinned            boolean,
  created_at        timestamp with time zone,
  comment_count     integer,
  reaction_count    integer,
  reactions         jsonb,
  my_reaction       text,
  trade_is_manual   boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_space_member(p_space) THEN RAISE EXCEPTION 'access_denied' USING errcode = '42501'; END IF;
  RETURN QUERY
  SELECT sp.id, sp.author_id, COALESCE(pr.display_name, pr.email) AS author_name, sp.body, sp.attached_trade_id,
    t.symbol AS trade_symbol, t.side AS trade_side, t.pnl AS trade_pnl, t.close_at AS trade_close_at, sp.pinned, sp.created_at,
    (SELECT COUNT(*)::int FROM public.space_post_comments c WHERE c.post_id = sp.id AND c.deleted_at IS NULL) AS comment_count,
    (SELECT COUNT(*)::int FROM public.space_post_reactions r WHERE r.post_id = sp.id) AS reaction_count,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'count', x.cnt) ORDER BY x.cnt DESC, x.emoji)
      FROM (SELECT r.emoji, COUNT(*) AS cnt FROM public.space_post_reactions r
            WHERE r.post_id = sp.id GROUP BY r.emoji) x
    ), '[]'::jsonb) AS reactions,
    (SELECT r2.emoji FROM public.space_post_reactions r2 WHERE r2.post_id = sp.id AND r2.user_id = auth.uid()) AS my_reaction,
    (COALESCE(t.broker, 'manual') = 'manual') AS trade_is_manual
  FROM public.space_posts sp JOIN public.profiles pr ON pr.id = sp.author_id
  LEFT JOIN public.trades t ON t.id = sp.attached_trade_id
  WHERE sp.space_id = p_space AND sp.deleted_at IS NULL AND (p_before IS NULL OR sp.created_at < p_before)
  ORDER BY sp.pinned DESC, sp.created_at DESC LIMIT LEAST(p_limit, 50);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_posts(uuid, timestamp with time zone, integer) TO anon, authenticated, service_role;
