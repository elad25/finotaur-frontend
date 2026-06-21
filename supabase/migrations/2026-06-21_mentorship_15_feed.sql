-- Community Feed engine: posts (with optional attached trade) + comments + reactions.
-- All writes go through SECURITY DEFINER RPCs; SELECT is RLS-gated via is_space_member().
-- Trades columns referenced: id, user_id, symbol, side, pnl, close_at, actual_r, deleted_at.

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.space_posts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  space_id          uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  author_id         uuid        NOT NULL REFERENCES public.profiles(id),
  body              text        NOT NULL,
  attached_trade_id uuid        REFERENCES public.trades(id) ON DELETE SET NULL,
  pinned            boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  edited_at         timestamptz,
  deleted_at        timestamptz,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS space_posts_space_created_idx
  ON public.space_posts (space_id, created_at DESC);

ALTER TABLE public.space_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_posts_select" ON public.space_posts;
CREATE POLICY "space_posts_select"
  ON public.space_posts
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_posts IS
  'Feed posts inside a mentor space. Writes are SECURITY DEFINER only; reads are RLS-gated.';


CREATE TABLE IF NOT EXISTS public.space_post_comments (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.space_posts(id) ON DELETE CASCADE,
  space_id   uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id),
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS space_post_comments_post_created_idx
  ON public.space_post_comments (post_id, created_at);

ALTER TABLE public.space_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_post_comments_select" ON public.space_post_comments;
CREATE POLICY "space_post_comments_select"
  ON public.space_post_comments
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_post_comments IS
  'Thread comments on a space post. Writes are SECURITY DEFINER only; reads are RLS-gated.';


CREATE TABLE IF NOT EXISTS public.space_post_reactions (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.space_posts(id) ON DELETE CASCADE,
  space_id   uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id),
  emoji      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (post_id, user_id, emoji)
);

ALTER TABLE public.space_post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_post_reactions_select" ON public.space_post_reactions;
CREATE POLICY "space_post_reactions_select"
  ON public.space_post_reactions
  FOR SELECT
  TO authenticated
  USING (public.is_space_member(space_id));

COMMENT ON TABLE public.space_post_reactions IS
  'Emoji reactions on space posts. One row per (post, user, emoji). Writes are SECURITY DEFINER only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: create_post
-- Creates a feed post, optionally attaching one of the caller's own trades.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_post(
  p_space    uuid,
  p_body     text,
  p_trade_id uuid DEFAULT NULL
)
RETURNS public.space_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.space_posts;
BEGIN
  -- Access guard.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Reject posts with no content.
  IF (trim(p_body) = '' OR p_body IS NULL) AND p_trade_id IS NULL THEN
    RAISE EXCEPTION 'empty_post' USING errcode = 'P0001';
  END IF;

  -- Attached trade must belong to the caller and must not be deleted.
  IF p_trade_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trades
      WHERE id         = p_trade_id
        AND user_id    = auth.uid()
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'not_your_trade' USING errcode = '42501';
    END IF;
  END IF;

  INSERT INTO public.space_posts (space_id, author_id, body, attached_trade_id)
  VALUES (p_space, auth.uid(), p_body, p_trade_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post(uuid, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.create_post(uuid, text, uuid) IS
  'Creates a feed post in a space. Caller must be a space member. Trade (if given) must belong to caller.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: list_posts
-- Cursor-paginated post feed: newest first (pinned posts always on top).
-- Joins trade snapshot columns and aggregates comment/reaction counts.
-- SECURITY DEFINER bypasses trades RLS so the attached trade is always readable.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_posts(
  p_space  uuid,
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
  trade_close_at   timestamptz,
  pinned           boolean,
  created_at       timestamptz,
  comment_count    int,
  reaction_count   int,
  my_reacted       boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access guard.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.author_id,
    COALESCE(pr.display_name, pr.email)                     AS author_name,
    sp.body,
    sp.attached_trade_id,
    t.symbol                                                 AS trade_symbol,
    t.side                                                   AS trade_side,
    t.pnl                                                    AS trade_pnl,
    t.close_at                                               AS trade_close_at,
    sp.pinned,
    sp.created_at,
    (
      SELECT COUNT(*)::int
      FROM public.space_post_comments c
      WHERE c.post_id    = sp.id
        AND c.deleted_at IS NULL
    )                                                        AS comment_count,
    (
      SELECT COUNT(*)::int
      FROM public.space_post_reactions r
      WHERE r.post_id = sp.id
    )                                                        AS reaction_count,
    EXISTS (
      SELECT 1
      FROM public.space_post_reactions r2
      WHERE r2.post_id = sp.id
        AND r2.user_id = auth.uid()
    )                                                        AS my_reacted
  FROM  public.space_posts sp
  JOIN  public.profiles    pr ON pr.id = sp.author_id
  LEFT JOIN public.trades  t  ON t.id  = sp.attached_trade_id
  WHERE sp.space_id   = p_space
    AND sp.deleted_at IS NULL
    AND (p_before IS NULL OR sp.created_at < p_before)
  ORDER BY sp.pinned DESC, sp.created_at DESC
  LIMIT LEAST(p_limit, 50);
END;
$$;

REVOKE ALL ON FUNCTION public.list_posts(uuid, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_posts(uuid, timestamptz, int) TO authenticated;

COMMENT ON FUNCTION public.list_posts(uuid, timestamptz, int) IS
  'Paginated feed for a space. Pinned posts first, then newest. Max 50 per page. SECURITY DEFINER reads trades without RLS.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: delete_post
-- Soft-deletes a post. Allowed for the author OR a space manager.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_post(
  p_post uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.space_posts;
BEGIN
  SELECT * INTO v_post
  FROM public.space_posts
  WHERE id = p_post;

  IF v_post.id IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  -- Caller must be the author or a manager of the post's space.
  IF v_post.author_id <> auth.uid()
     AND NOT public.is_space_manager(v_post.space_id)
  THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  UPDATE public.space_posts
  SET deleted_at = now()
  WHERE id = p_post;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_post(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_post(uuid) IS
  'Soft-deletes a space post. Caller must be the post author or a space manager.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: add_comment
-- Appends a comment to an existing (non-deleted) post.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_comment(
  p_post uuid,
  p_body text
)
RETURNS public.space_post_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.space_posts;
  v_row  public.space_post_comments;
BEGIN
  -- Resolve post to get space_id.
  SELECT * INTO v_post
  FROM public.space_posts
  WHERE id         = p_post
    AND deleted_at IS NULL;

  IF v_post.id IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  -- Access guard (space membership).
  IF NOT public.is_space_member(v_post.space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Reject blank comments.
  IF trim(p_body) = '' OR p_body IS NULL THEN
    RAISE EXCEPTION 'empty_message' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.space_post_comments (post_id, space_id, author_id, body)
  VALUES (p_post, v_post.space_id, auth.uid(), p_body)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_comment(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.add_comment(uuid, text) IS
  'Appends a comment to a space post. Caller must be a space member. Blank bodies are rejected.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: list_comments
-- Returns non-deleted comments for a post, oldest first.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_comments(
  p_post  uuid,
  p_limit int DEFAULT 100
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
DECLARE
  v_space_id uuid;
BEGIN
  -- Resolve the post's space.
  SELECT space_id INTO v_space_id
  FROM public.space_posts
  WHERE id         = p_post
    AND deleted_at IS NULL;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  -- Access guard.
  IF NOT public.is_space_member(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.author_id,
    COALESCE(p.display_name, p.email) AS author_name,
    c.body,
    c.created_at
  FROM  public.space_post_comments c
  JOIN  public.profiles             p ON p.id = c.author_id
  WHERE c.post_id    = p_post
    AND c.deleted_at IS NULL
  ORDER BY c.created_at ASC
  LIMIT LEAST(p_limit, 200);
END;
$$;

REVOKE ALL ON FUNCTION public.list_comments(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_comments(uuid, int) TO authenticated;

COMMENT ON FUNCTION public.list_comments(uuid, int) IS
  'Thread comments for a post, oldest first. Excludes soft-deleted rows. Max 200 per call.';


-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: toggle_reaction
-- Adds an emoji reaction if absent; removes it if present.
-- Returns TRUE when the reaction was inserted, FALSE when it was removed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_post  uuid,
  p_emoji text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post     public.space_posts;
  v_existing uuid;
BEGIN
  -- Resolve post to get space_id.
  SELECT * INTO v_post
  FROM public.space_posts
  WHERE id         = p_post
    AND deleted_at IS NULL;

  IF v_post.id IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING errcode = 'P0002';
  END IF;

  -- Access guard.
  IF NOT public.is_space_member(v_post.space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Check for an existing reaction by this user with this emoji.
  SELECT id INTO v_existing
  FROM public.space_post_reactions
  WHERE post_id = p_post
    AND user_id = auth.uid()
    AND emoji   = p_emoji;

  IF v_existing IS NOT NULL THEN
    -- Reaction exists → remove it and signal removal.
    DELETE FROM public.space_post_reactions
    WHERE id = v_existing;
    RETURN false;
  ELSE
    -- No reaction yet → insert and signal creation.
    INSERT INTO public.space_post_reactions (post_id, space_id, user_id, emoji)
    VALUES (p_post, v_post.space_id, auth.uid(), p_emoji);
    RETURN true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.toggle_reaction(uuid, text) IS
  'Toggles an emoji reaction on a post. Returns TRUE if added, FALSE if removed.';
