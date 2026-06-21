-- FINOTAUR Community Backbone — SECURITY DEFINER RPC layer.
-- Companion migrations:
--   2026-06-22_community_01_tables.sql — tables + triggers
--   2026-06-22_community_02_rls.sql    — RLS policies + is_paying_user()
--
-- Helper functions relied on (defined in prior migrations, NOT redefined here):
--   public.is_paying_user(uuid)          — community_02_rls.sql
--   public.is_space_member(uuid)         — mentorship_06_helpers.sql
--   public.is_space_manager(uuid)        — mentorship_06_helpers.sql
--   public.can_access_review(uuid)       — mentorship_16_reviews.sql
--
-- Trades columns referenced:
--   id, user_id, pnl, entry_price, exit_price, quantity, symbol, side, setup,
--   open_at, close_at, deleted_at.
--
-- Field-redaction policy (CRITICAL — enforced in RPC output, NOT in RLS):
--   hide_pnl OR show_setup_only  → trade_pnl      is NULL
--   show_setup_only              → trade_entry / trade_exit are NULL
--   NOT reveal_size              → trade_size      is NULL
--   trade_symbol / trade_side / trade_setup are always shown (no redaction).
--
-- All RPCs follow the established project pattern:
--   LANGUAGE plpgsql (or sql for trivial helpers)
--   SECURITY DEFINER
--   SET search_path = public
--   REVOKE ALL ON FUNCTION ... FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION ... TO authenticated;
--   COMMENT ON FUNCTION ...

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. share_trade
-- Publishes a trade to one or more destinations in a single atomic call.
-- p_destinations is a jsonb ARRAY, each element having a "scope" key:
--   { "scope": "global" }
--   { "scope": "community", "room_id": "<uuid>" }
--   { "scope": "mentor",    "room_id": "<uuid>", "target_mentor_id": "<uuid>" }
-- Returns all trade_shares rows created (one per destination element).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.share_trade(
  p_trade_id        uuid,
  p_destinations    jsonb,
  p_hide_pnl        boolean DEFAULT false,
  p_show_setup_only boolean DEFAULT false,
  p_reveal_size     boolean DEFAULT false,
  p_caption         text    DEFAULT NULL
)
RETURNS SETOF public.trade_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner          uuid;
  d                jsonb;
  v_scope          text;
  v_room           uuid;
  v_mentor         uuid;
  v_global_post_id uuid;
  v_space_post_id  uuid;
  v_review_id      uuid;
  v_share_row      public.trade_shares;
BEGIN
  -- ── Authorization ────────────────────────────────────────────────────────
  -- The trade must exist, not be soft-deleted, and belong to the caller.
  SELECT user_id INTO v_owner
  FROM public.trades
  WHERE id         = p_trade_id
    AND deleted_at IS NULL;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'trade_not_found' USING errcode = 'P0002';
  END IF;

  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_trade_owner' USING errcode = '42501';
  END IF;

  -- ── Destination loop ─────────────────────────────────────────────────────
  FOR d IN SELECT * FROM jsonb_array_elements(p_destinations)
  LOOP
    v_scope          := d->>'scope';
    v_room           := NULL;
    v_mentor         := NULL;
    v_global_post_id := NULL;
    v_space_post_id  := NULL;
    v_review_id      := NULL;

    -- ── scope = 'global' ───────────────────────────────────────────────────
    IF v_scope = 'global' THEN

      IF NOT public.is_paying_user() THEN
        RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
      END IF;

      -- Create the global post first (the trade_shares row back-links to it).
      INSERT INTO public.global_posts (
        author_id,
        body,
        attached_trade_id,
        hide_pnl,
        show_setup_only,
        reveal_size
      )
      VALUES (
        auth.uid(),
        p_caption,
        p_trade_id,
        p_hide_pnl,
        p_show_setup_only,
        p_reveal_size
      )
      RETURNING id INTO v_global_post_id;

      -- Write the ledger entry.
      INSERT INTO public.trade_shares (
        trade_id,
        author_id,
        scope,
        hide_pnl,
        show_setup_only,
        reveal_size,
        caption,
        global_post_id
      )
      VALUES (
        p_trade_id,
        auth.uid(),
        'global',
        p_hide_pnl,
        p_show_setup_only,
        p_reveal_size,
        p_caption,
        v_global_post_id
      )
      RETURNING * INTO v_share_row;

      RETURN NEXT v_share_row;

    -- ── scope = 'community' ────────────────────────────────────────────────
    ELSIF v_scope = 'community' THEN

      v_room := (d->>'room_id')::uuid;
      IF v_room IS NULL THEN
        RAISE EXCEPTION 'community_scope_requires_room_id' USING errcode = 'P0001';
      END IF;

      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;

      -- Create the space post matching the exact columns used by create_post().
      INSERT INTO public.space_posts (
        space_id,
        author_id,
        body,
        attached_trade_id
      )
      VALUES (
        v_room,
        auth.uid(),
        COALESCE(p_caption, ''),  -- space_posts.body is NOT NULL; trade carries the content
        p_trade_id
      )
      RETURNING id INTO v_space_post_id;

      -- Write the ledger entry.
      INSERT INTO public.trade_shares (
        trade_id,
        author_id,
        scope,
        room_id,
        hide_pnl,
        show_setup_only,
        reveal_size,
        caption,
        space_post_id
      )
      VALUES (
        p_trade_id,
        auth.uid(),
        'community',
        v_room,
        p_hide_pnl,
        p_show_setup_only,
        p_reveal_size,
        p_caption,
        v_space_post_id
      )
      RETURNING * INTO v_share_row;

      RETURN NEXT v_share_row;

    -- ── scope = 'mentor' ───────────────────────────────────────────────────
    ELSIF v_scope = 'mentor' THEN

      v_room   := (d->>'room_id')::uuid;
      v_mentor := (d->>'target_mentor_id')::uuid;

      IF v_room IS NULL THEN
        RAISE EXCEPTION 'mentor_scope_requires_room_id' USING errcode = 'P0001';
      END IF;

      IF NOT public.is_space_member(v_room) THEN
        RAISE EXCEPTION 'access_denied' USING errcode = '42501';
      END IF;

      -- Create the trade review using the same default status as request_trade_review().
      -- Status column default is 'under_review' (confirmed in mentorship_16_reviews.sql).
      INSERT INTO public.space_trade_reviews (
        space_id,
        trade_id,
        requester_id
      )
      VALUES (
        v_room,
        p_trade_id,
        auth.uid()
      )
      RETURNING id INTO v_review_id;

      -- Write the ledger entry.
      -- target_mentor_id is stored by convention; it is not a hard NOT NULL constraint
      -- (see community_01_tables.sql COMMENT ON COLUMN trade_shares.target_mentor_id).
      INSERT INTO public.trade_shares (
        trade_id,
        author_id,
        scope,
        room_id,
        target_mentor_id,
        hide_pnl,
        show_setup_only,
        reveal_size,
        caption,
        review_id
      )
      VALUES (
        p_trade_id,
        auth.uid(),
        'mentor',
        v_room,
        v_mentor,
        p_hide_pnl,
        p_show_setup_only,
        p_reveal_size,
        p_caption,
        v_review_id
      )
      RETURNING * INTO v_share_row;

      RETURN NEXT v_share_row;

    ELSE
      -- Unknown scope: fail fast so callers notice bad payloads.
      RAISE EXCEPTION 'invalid_scope: %', v_scope USING errcode = 'P0001';
    END IF;

  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.share_trade(uuid, jsonb, boolean, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.share_trade(uuid, jsonb, boolean, boolean, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.share_trade(uuid, jsonb, boolean, boolean, boolean, text) IS
  'Atomically publish a trade to one or more destinations (global / community / mentor). '
  'Caller must own the trade. Each destination element in p_destinations must have a '
  '"scope" key; community and mentor additionally require "room_id". Returns one '
  'trade_shares row per destination. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. create_global_post
-- Creates a text-only (or trade-attached) global feed post.
-- Requires a non-free platform plan (is_paying_user()).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_global_post(
  p_body            text,
  p_trade_id        uuid    DEFAULT NULL,
  p_hide_pnl        boolean DEFAULT false,
  p_show_setup_only boolean DEFAULT false,
  p_reveal_size     boolean DEFAULT false
)
RETURNS public.global_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.global_posts;
BEGIN
  -- Access guard: global feed requires a paid plan.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  -- Reject posts with neither a body nor a trade attachment.
  IF (p_body IS NULL OR trim(p_body) = '') AND p_trade_id IS NULL THEN
    RAISE EXCEPTION 'empty_post' USING errcode = 'P0001';
  END IF;

  -- Attached trade must belong to the caller and must not be soft-deleted.
  IF p_trade_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.trades
      WHERE id         = p_trade_id
        AND user_id    = auth.uid()
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'not_your_trade' USING errcode = '42501';
    END IF;
  END IF;

  INSERT INTO public.global_posts (
    author_id,
    body,
    attached_trade_id,
    hide_pnl,
    show_setup_only,
    reveal_size
  )
  VALUES (
    auth.uid(),
    p_body,
    p_trade_id,
    p_hide_pnl,
    p_show_setup_only,
    p_reveal_size
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_global_post(text, uuid, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_global_post(text, uuid, boolean, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION public.create_global_post(text, uuid, boolean, boolean, boolean) IS
  'Create a global feed post. Requires a paid platform plan. Optional trade attachment must '
  'belong to the caller. At least one of p_body or p_trade_id must be provided. '
  'SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. list_global_feed
-- Cursor-paginated global feed: pinned first, then newest.
-- Joins trade snapshot columns with per-field redaction controlled by the
-- hide_pnl / show_setup_only / reveal_size flags stored on each post.
-- Aggregates comment counts and per-kind reaction counts in subqueries.
-- SECURITY DEFINER allows the function to read trades without hitting trade RLS.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Trade snapshot — subject to per-post redaction flags (see CASE expressions below).
  trade_symbol     text,
  trade_side       text,
  trade_pnl        numeric,
  trade_size       numeric,
  trade_setup      text,
  trade_entry      numeric,
  trade_exit       numeric,
  trade_close_at   timestamptz,
  -- Privacy flags echoed so the client knows which fields were intentionally NULL.
  hide_pnl         boolean,
  show_setup_only  boolean,
  reveal_size      boolean,
  pinned           boolean,
  created_at       timestamptz,
  -- Aggregates.
  comment_count    bigint,
  up_count         bigint,
  down_count       bigint,
  repost_count     bigint,
  -- Caller's own reaction kind for this post (NULL if none).
  my_reaction      text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access guard: global feed requires a paid plan.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    gp.id,
    gp.author_id,
    COALESCE(pr.display_name, pr.email)                        AS author_name,
    gp.body,
    gp.attached_trade_id,

    -- ── Trade snapshot — always-visible fields ──────────────────────────────
    -- symbol, side, setup: never redacted; shown regardless of privacy flags.
    t.symbol                                                   AS trade_symbol,
    t.side                                                     AS trade_side,
    -- setup column: always visible so the reader understands the trade context.
    t.setup                                                    AS trade_setup,

    -- ── Redacted fields ─────────────────────────────────────────────────────
    -- CRITICAL: these CASE expressions are the sole enforcement layer for
    -- field-level privacy. RLS does not redact individual columns.
    --
    -- trade_pnl: hidden when hide_pnl=true OR show_setup_only=true.
    --   show_setup_only implies "show only the setup, not the result".
    CASE
      WHEN gp.hide_pnl OR gp.show_setup_only THEN NULL
      ELSE t.pnl
    END                                                        AS trade_pnl,

    -- trade_size (quantity): shown only when the author explicitly opted in
    --   by setting reveal_size=true. Default is NULL (hidden).
    CASE
      WHEN gp.reveal_size THEN t.quantity
      ELSE NULL
    END                                                        AS trade_size,

    -- trade_entry / trade_exit: hidden when show_setup_only=true.
    --   show_setup_only means "show the setup/direction but not exact prices".
    CASE
      WHEN gp.show_setup_only THEN NULL
      ELSE t.entry_price
    END                                                        AS trade_entry,

    CASE
      WHEN gp.show_setup_only THEN NULL
      ELSE t.exit_price
    END                                                        AS trade_exit,

    -- trade_close_at: always visible (gives temporal context without P&L).
    t.close_at                                                 AS trade_close_at,

    -- ── Privacy flag echo ────────────────────────────────────────────────────
    gp.hide_pnl,
    gp.show_setup_only,
    gp.reveal_size,
    gp.pinned,
    gp.created_at,

    -- ── Aggregates ───────────────────────────────────────────────────────────
    -- comment_count: non-deleted comments only.
    (
      SELECT COUNT(*)
      FROM public.global_post_comments c
      WHERE c.post_id    = gp.id
        AND c.deleted_at IS NULL
    )                                                          AS comment_count,

    -- Reaction counts split by kind.
    (
      SELECT COUNT(*)
      FROM public.global_post_reactions r
      WHERE r.post_id = gp.id
        AND r.kind    = 'up'
    )                                                          AS up_count,

    (
      SELECT COUNT(*)
      FROM public.global_post_reactions r
      WHERE r.post_id = gp.id
        AND r.kind    = 'down'
    )                                                          AS down_count,

    (
      SELECT COUNT(*)
      FROM public.global_post_reactions r
      WHERE r.post_id = gp.id
        AND r.kind    = 'repost'
    )                                                          AS repost_count,

    -- Caller's reaction: the kind string if they reacted, NULL otherwise.
    (
      SELECT r2.kind
      FROM public.global_post_reactions r2
      WHERE r2.post_id = gp.id
        AND r2.user_id = auth.uid()
      LIMIT 1
    )                                                          AS my_reaction

  FROM  public.global_posts gp
  JOIN  public.profiles      pr ON pr.id = gp.author_id
  LEFT JOIN public.trades    t  ON t.id  = gp.attached_trade_id

  WHERE gp.deleted_at IS NULL
    AND (p_before IS NULL OR gp.created_at < p_before)

  ORDER BY gp.pinned DESC, gp.created_at DESC
  LIMIT LEAST(p_limit, 50);
END;
$$;

REVOKE ALL ON FUNCTION public.list_global_feed(timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_global_feed(timestamptz, int) TO authenticated;

COMMENT ON FUNCTION public.list_global_feed(timestamptz, int) IS
  'Cursor-paginated global feed. Pinned posts first, then newest. Max 50 per page. '
  'Trade fields are individually redacted by hide_pnl / show_setup_only / reveal_size '
  'flags stored on each post. SECURITY DEFINER reads trades without hitting trade RLS.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. delete_global_post
-- Soft-deletes a global feed post. Author-only (no manager bypass needed for
-- global posts — there is no owning space; admin access is handled via RLS).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_global_post(
  p_post uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Author-only soft-delete. Using a conditional UPDATE so we get a clear
  -- error when the post doesn't exist vs. the caller is not the author.
  UPDATE public.global_posts
  SET    deleted_at = now()
  WHERE  id         = p_post
    AND  author_id  = auth.uid()
    AND  deleted_at IS NULL;

  IF NOT FOUND THEN
    -- Distinguish "not found" from "forbidden" to aid debugging.
    IF EXISTS (SELECT 1 FROM public.global_posts WHERE id = p_post) THEN
      RAISE EXCEPTION 'access_denied' USING errcode = '42501';
    ELSE
      RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_global_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_global_post(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_global_post(uuid) IS
  'Soft-deletes a global feed post. Caller must be the post author. '
  'Raises access_denied if caller is not the author; post_not_found if the post '
  'does not exist or is already deleted. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. add_global_comment
-- Appends a comment to a non-deleted global feed post.
-- Requires a paid plan; blank bodies are rejected.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_global_comment(
  p_post uuid,
  p_body text
)
RETURNS public.global_post_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.global_post_comments;
BEGIN
  -- Access guard: global feed requires a paid plan.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  -- Reject blank bodies.
  IF p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'empty_message' USING errcode = 'P0001';
  END IF;

  -- The target post must exist and not be soft-deleted.
  IF NOT EXISTS (
    SELECT 1
    FROM public.global_posts
    WHERE id         = p_post
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  INSERT INTO public.global_post_comments (post_id, author_id, body)
  VALUES (p_post, auth.uid(), p_body)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_global_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_global_comment(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.add_global_comment(uuid, text) IS
  'Append a comment to a global feed post. Requires a paid platform plan. '
  'Empty bodies and missing/deleted posts are rejected. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. list_global_comments
-- Returns non-deleted comments for a global feed post, oldest first.
-- Requires a paid plan.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Access guard: global feed requires a paid plan.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.author_id,
    COALESCE(p.display_name, p.email) AS author_name,
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

COMMENT ON FUNCTION public.list_global_comments(uuid, int) IS
  'Return non-deleted comments for a global feed post, oldest first. '
  'Requires a paid platform plan. Max 200 per call. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. toggle_global_reaction
-- Adds a kind-based reaction if absent; removes it if already present.
-- Mirrors the space toggle_reaction pattern but uses kind ('up','down','repost')
-- instead of an emoji column.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_global_reaction(
  p_post uuid,
  p_kind text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
BEGIN
  -- Access guard: global feed requires a paid plan.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  -- Validate the reaction kind against the allowed set.
  IF p_kind NOT IN ('up', 'down', 'repost') THEN
    RAISE EXCEPTION 'invalid_reaction_kind: %', p_kind USING errcode = 'P0001';
  END IF;

  -- The target post must exist and not be soft-deleted.
  IF NOT EXISTS (
    SELECT 1
    FROM public.global_posts
    WHERE id         = p_post
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  -- Toggle: delete if present, insert if absent.
  SELECT id INTO v_existing
  FROM public.global_post_reactions
  WHERE post_id = p_post
    AND user_id = auth.uid()
    AND kind    = p_kind;

  IF v_existing IS NOT NULL THEN
    -- Reaction exists → remove it.
    DELETE FROM public.global_post_reactions
    WHERE id = v_existing;
  ELSE
    -- No reaction yet → insert.
    INSERT INTO public.global_post_reactions (post_id, user_id, kind)
    VALUES (p_post, auth.uid(), p_kind);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_global_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_global_reaction(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.toggle_global_reaction(uuid, text) IS
  'Toggle a kind-based reaction (up / down / repost) on a global feed post. '
  'Requires a paid platform plan. Idempotent: calling twice returns to neutral. '
  'SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. global_leaderboard
-- Mirrors space_leaderboard exactly: same period CASE, same closed-trade filter
-- (close_at IS NOT NULL, deleted_at IS NULL), same net_pnl/win_rate computation,
-- same RANK() OVER (ORDER BY net_pnl DESC).
--
-- Eligibility WHERE (global variant — differs from space_leaderboard):
--   profiles.global_leaderboard_opt_in = true
--   profiles.platform_plan <> 'free'
--   profiles.platform_subscription_status IN ('active', 'trial')
--
-- p_metric is accepted but currently only 'net_pnl' is implemented.
-- A future 'discipline' metric (discipline score / adherence) is reserved;
-- for now any non-'net_pnl' value still ranks by net_pnl (see comment below).
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Access guard: global leaderboard is a paid-plan surface.
  IF NOT public.is_paying_user() THEN
    RAISE EXCEPTION 'global_feed_requires_paid_plan' USING errcode = '42501';
  END IF;

  -- NOTE: p_metric is reserved for a future 'discipline' value.
  -- For now, ranking is always by net_pnl regardless of p_metric.
  -- When the discipline metric lands, add a second RETURNS TABLE variant or
  -- extend this function with a second ORDER BY branch.

  -- Resolve period lower bound. Mirror of space_leaderboard's CASE logic.
  v_start := CASE
    WHEN p_period = 'this_month' THEN date_trunc('month', now())
    WHEN p_period = 'this_year'  THEN date_trunc('year',  now())
    ELSE NULL  -- 'all': no lower bound; unknown values fall through to 'all'
  END;

  RETURN QUERY
  WITH member_stats AS (
    SELECT
      t.user_id,
      -- Mirror of space_leaderboard: raw pnl sum; copier-account de-duplication
      -- is a future refinement (same v1 note as space variant).
      COALESCE(SUM(t.pnl), 0)                                              AS net_pnl,
      COUNT(*)                                                              AS trade_count,
      -- win_rate as a 0..1 fraction; frontend formats as percentage.
      -- Mirror of space_leaderboard: same NULLIF guard against 0-trade edge case.
      (COUNT(*) FILTER (WHERE t.pnl > 0))::numeric / NULLIF(COUNT(*), 0)  AS win_rate
    FROM public.trades t
    JOIN public.profiles pr ON pr.id = t.user_id
    WHERE
      -- Eligibility criteria for the global leaderboard (differs from space variant).
      pr.global_leaderboard_opt_in         = true
      AND pr.platform_plan                <> 'free'
      AND pr.platform_subscription_status IN ('active', 'trial')
      -- Closed-trade filter — mirrors space_leaderboard exactly.
      AND t.close_at   IS NOT NULL          -- closed trade: identified by close_at IS NOT NULL
      AND t.deleted_at IS NULL              -- exclude soft-deleted trades
      AND (v_start IS NULL OR t.close_at >= v_start)
    GROUP BY t.user_id
    -- Only include users who have at least one qualifying trade in the period.
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
  'Platform-wide leaderboard for opted-in paying users. Mirrors space_leaderboard: '
  'same period CASE (all / this_month / this_year), same closed-trade filter '
  '(close_at IS NOT NULL, deleted_at IS NULL), same net_pnl + win_rate aggregation, '
  'same RANK() OVER (ORDER BY net_pnl DESC). Eligibility: global_leaderboard_opt_in=true '
  'AND platform_plan<>''free'' AND platform_subscription_status IN (''active'',''trial''). '
  'p_metric is reserved for a future ''discipline'' value; currently always ranks by '
  'net_pnl. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. get_shared_note
-- Get-or-create the shared note for a trade review.
-- Requires can_access_review(p_review) — i.e., must be the requester or a
-- space manager. If no shared_notes row exists, inserts an empty one and
-- returns it; otherwise returns the existing row.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_shared_note(
  p_review uuid
)
RETURNS public.shared_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.shared_notes;
BEGIN
  -- Access guard: only the review requester or space managers may see the note.
  IF NOT public.can_access_review(p_review) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Attempt to fetch the existing note.
  SELECT * INTO v_row
  FROM public.shared_notes
  WHERE review_id = p_review;

  IF v_row.id IS NULL THEN
    -- No note yet — create an empty one so the UI always has a row to display.
    -- The revision trigger (tg_shared_notes_revision) only fires on UPDATE,
    -- so this INSERT does not create a revision row.
    INSERT INTO public.shared_notes (review_id, updated_by)
    VALUES (p_review, auth.uid())
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_note(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_note(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_shared_note(uuid) IS
  'Get-or-create the shared note for a trade review. If no row exists yet, '
  'an empty shared_notes row is inserted and returned. Caller must pass '
  'can_access_review (requester or space manager). SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. update_shared_note
-- Upserts the shared note body and goal for a trade review.
-- The shared_notes_set_updated_at trigger bumps updated_at, and the
-- tg_shared_notes_revision trigger captures a revision row — both fire
-- automatically on UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_shared_note(
  p_review uuid,
  p_goal   text,
  p_body   text
)
RETURNS public.shared_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_row         public.shared_notes;
BEGIN
  -- Access guard: only the review requester or space managers may edit the note.
  IF NOT public.can_access_review(p_review) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Check whether a row already exists.
  SELECT id INTO v_existing_id
  FROM public.shared_notes
  WHERE review_id = p_review;

  IF v_existing_id IS NOT NULL THEN
    -- Row exists: UPDATE in place.
    -- The BEFORE UPDATE trigger (trg_shared_notes_updated_at) sets updated_at = now().
    -- The AFTER UPDATE trigger (tg_shared_notes_revision) captures a revision row
    -- when body or goal actually changed (IS DISTINCT FROM check in the trigger body).
    UPDATE public.shared_notes
    SET    goal       = p_goal,
           body       = p_body,
           updated_by = auth.uid()
    WHERE  id = v_existing_id
    RETURNING * INTO v_row;
  ELSE
    -- No row yet: INSERT.
    -- The revision trigger does NOT fire on INSERT (it is AFTER UPDATE only),
    -- so no revision row is captured for the initial save — consistent with
    -- get_shared_note's empty-row creation path.
    INSERT INTO public.shared_notes (review_id, goal, body, updated_by)
    VALUES (p_review, p_goal, p_body, auth.uid())
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_shared_note(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_shared_note(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.update_shared_note(uuid, text, text) IS
  'Upsert the body and goal of the shared note for a trade review. '
  'On UPDATE the trg_shared_notes_updated_at trigger sets updated_at and the '
  'tg_shared_notes_revision trigger captures a revision row when content changed. '
  'Caller must pass can_access_review (requester or space manager). SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. list_note_revisions
-- Returns the revision history of the shared note for a trade review,
-- newest first. Joins shared_notes to obtain the note_id, and profiles for
-- the editor display name.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_note_revisions(
  p_review uuid,
  p_limit  int DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  body        text,
  goal        text,
  edited_by   uuid,
  editor_name text,
  created_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access guard: only the review requester or space managers may read revisions.
  IF NOT public.can_access_review(p_review) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    snr.id,
    snr.body,
    snr.goal,
    snr.edited_by,
    COALESCE(p.display_name, p.email) AS editor_name,
    snr.created_at
  FROM  public.shared_note_revisions snr
  -- Join through shared_notes to filter by review_id.
  JOIN  public.shared_notes          sn  ON sn.id  = snr.note_id
  JOIN  public.profiles              p   ON p.id   = snr.edited_by
  WHERE sn.review_id = p_review
  ORDER BY snr.created_at DESC
  LIMIT LEAST(p_limit, 200);
END;
$$;

REVOKE ALL ON FUNCTION public.list_note_revisions(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_note_revisions(uuid, int) TO authenticated;

COMMENT ON FUNCTION public.list_note_revisions(uuid, int) IS
  'Return the revision history of a shared note, newest first. Joins shared_notes '
  'to resolve the note_id from the review_id, and profiles for editor display name. '
  'Caller must pass can_access_review (requester or space manager). Max 200 per call. '
  'SECURITY DEFINER.';
