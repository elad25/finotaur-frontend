-- 1:1 Trade Reviews engine.
-- A member submits one of their own trades for structured mentor review.
-- Privacy: a review is visible only to its requester and space managers (owners / co_mentors).
-- All writes go through RPCs (SECURITY DEFINER); RLS covers SELECT only.

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.space_trade_reviews (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id     uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  trade_id     uuid        NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  requester_id uuid        NOT NULL REFERENCES public.profiles(id),
  status       text        NOT NULL DEFAULT 'under_review'
                           CHECK (status IN ('under_review', 'reviewed', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_space_trade_reviews_space_created
  ON public.space_trade_reviews (space_id, created_at DESC);

ALTER TABLE public.space_trade_reviews ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_trade_reviews IS
  '1:1 trade review requests. Visible only to the requester and space managers (owner/co_mentor).';


CREATE TABLE IF NOT EXISTS public.space_review_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid        NOT NULL REFERENCES public.space_trade_reviews(id) ON DELETE CASCADE,
  space_id   uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id),
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_space_review_comments_review_created
  ON public.space_review_comments (review_id, created_at);

ALTER TABLE public.space_review_comments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_review_comments IS
  'Threaded comments on a trade review. Access mirrors the parent review (requester + managers).';


-- ──────────────────────────────────────────────────────────────────────────────
-- HELPER: can_access_review
-- Returns TRUE when auth.uid() may see p_review:
--   must be a member of the review's space AND
--   either be the requester OR be a space manager (owner/co_mentor).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_access_review(p_review uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_trade_reviews r
    WHERE r.id = p_review
      AND public.is_space_member(r.space_id)
      AND (
        r.requester_id = auth.uid()
        OR public.is_space_manager(r.space_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_review(uuid) TO service_role;

COMMENT ON FUNCTION public.can_access_review(uuid) IS
  'TRUE when auth.uid() may read a trade review: must be a space member AND be the requester or a space manager. SECURITY DEFINER.';


-- ──────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES (SELECT only; all writes go through RPCs)
-- ──────────────────────────────────────────────────────────────────────────────

-- space_trade_reviews: requester or manager within the space.
CREATE POLICY "members can see own reviews; managers see all"
  ON public.space_trade_reviews
  FOR SELECT
  USING (
    public.is_space_member(space_id)
    AND (
      requester_id = auth.uid()
      OR public.is_space_manager(space_id)
    )
  );

-- space_review_comments: same access rule delegated to can_access_review.
CREATE POLICY "review comments visible to review participants"
  ON public.space_review_comments
  FOR SELECT
  USING (
    public.can_access_review(review_id)
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: request_trade_review
-- Member submits one of their own trades for mentor review.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.request_trade_review(
  p_space uuid,
  p_trade uuid
)
RETURNS public.space_trade_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.space_trade_reviews;
BEGIN
  -- Caller must be an active member of the space.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- The trade must belong to the caller.
  IF NOT EXISTS (
    SELECT 1
    FROM public.trades
    WHERE id      = p_trade
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_your_trade' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.space_trade_reviews (space_id, trade_id, requester_id)
  VALUES (p_space, p_trade, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.request_trade_review(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_trade_review(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.request_trade_review(uuid, uuid) IS
  'Submit a trade for 1:1 mentor review. Caller must be a space member and own the trade.';


-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: list_reviews
-- Returns reviews visible to the caller (own reviews for members; all for managers).
-- Joins trades table (definer context bypasses trade-level RLS) for display fields.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_reviews(
  p_space uuid,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id             uuid,
  requester_id   uuid,
  requester_name text,
  status         text,
  trade_id       uuid,
  trade_symbol   text,
  trade_side     text,
  trade_pnl      numeric,
  trade_r        numeric,
  trade_close_at timestamptz,
  comment_count  int,
  created_at     timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be an active member of the space.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.requester_id,
    COALESCE(p.display_name, p.email)                                AS requester_name,
    r.status,
    r.trade_id,
    t.symbol                                                         AS trade_symbol,
    t.side                                                           AS trade_side,
    t.pnl                                                            AS trade_pnl,
    t.actual_r                                                       AS trade_r,
    t.close_at                                                       AS trade_close_at,
    (
      SELECT COUNT(*)::int
      FROM public.space_review_comments c
      WHERE c.review_id  = r.id
        AND c.deleted_at IS NULL
    )                                                                AS comment_count,
    r.created_at
  FROM  public.space_trade_reviews r
  JOIN  public.trades              t ON t.id = r.trade_id
  JOIN  public.profiles            p ON p.id = r.requester_id
  WHERE r.space_id   = p_space
    AND r.deleted_at IS NULL
    -- Privacy: members see only their own; managers see all.
    AND (
      r.requester_id = auth.uid()
      OR public.is_space_manager(p_space)
    )
  ORDER BY r.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$;

REVOKE ALL ON FUNCTION public.list_reviews(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_reviews(uuid, int) TO authenticated;

COMMENT ON FUNCTION public.list_reviews(uuid, int) IS
  'List trade reviews visible to auth.uid() in p_space. Members see their own; managers see all. Max 100 per page.';


-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: add_review_comment
-- Post a comment on a review. Caller must pass can_access_review.
-- Also bumps updated_at on the parent review for recency ordering.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_review_comment(
  p_review uuid,
  p_body   text
)
RETURNS public.space_review_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_row      public.space_review_comments;
BEGIN
  -- Caller must be a review participant (requester or manager).
  IF NOT public.can_access_review(p_review) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  p_body := trim(p_body);
  IF p_body = '' OR p_body IS NULL THEN
    RAISE EXCEPTION 'empty_message' USING errcode = 'P0001';
  END IF;

  -- Resolve the space_id so it can be denormalised onto the comment row.
  SELECT space_id INTO v_space_id
  FROM public.space_trade_reviews
  WHERE id = p_review;

  INSERT INTO public.space_review_comments (review_id, space_id, author_id, body)
  VALUES (p_review, v_space_id, auth.uid(), p_body)
  RETURNING * INTO v_row;

  -- Keep the parent review's updated_at current for recency sorting.
  UPDATE public.space_trade_reviews
  SET    updated_at = now()
  WHERE  id = p_review;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_review_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_review_comment(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.add_review_comment(uuid, text) IS
  'Add a comment to a trade review. Caller must be the requester or a space manager. Empty bodies are rejected.';


-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: list_review_comments
-- Returns all non-deleted comments for a review, oldest first.
-- author_is_mentor is derived per comment from space_members.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_review_comments(
  p_review uuid
)
RETURNS TABLE (
  id               uuid,
  author_id        uuid,
  author_name      text,
  author_is_mentor boolean,
  body             text,
  created_at       timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_review(p_review) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.author_id,
    COALESCE(p.display_name, p.email)    AS author_name,
    -- TRUE when the comment author holds owner or co_mentor role in the space.
    EXISTS (
      SELECT 1
      FROM public.space_members m
      WHERE m.space_id = c.space_id
        AND m.user_id  = c.author_id
        AND m.status   = 'active'
        AND m.role     IN ('owner', 'co_mentor')
    )                                    AS author_is_mentor,
    c.body,
    c.created_at
  FROM  public.space_review_comments c
  JOIN  public.profiles               p ON p.id = c.author_id
  WHERE c.review_id  = p_review
    AND c.deleted_at IS NULL
  ORDER BY c.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_review_comments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_review_comments(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_review_comments(uuid) IS
  'Return all comments for a review in chronological order. Caller must pass can_access_review. author_is_mentor is per-comment from space_members.';


-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: set_review_status
-- Update the status of a review. Restricted to space managers (owner / co_mentor).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_review_status(
  p_review uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
BEGIN
  -- Resolve the space owning this review.
  SELECT space_id INTO v_space_id
  FROM public.space_trade_reviews
  WHERE id = p_review;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'review_not_found' USING errcode = 'P0002';
  END IF;

  -- Only managers (owner / co_mentor) may change review status.
  IF NOT public.is_space_manager(v_space_id) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Validate the supplied status value.
  IF p_status NOT IN ('under_review', 'reviewed', 'closed') THEN
    RAISE EXCEPTION 'invalid_status' USING errcode = 'P0001';
  END IF;

  UPDATE public.space_trade_reviews
  SET    status     = p_status,
         updated_at = now()
  WHERE  id = p_review;
END;
$$;

REVOKE ALL ON FUNCTION public.set_review_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_review_status(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.set_review_status(uuid, text) IS
  'Change the status of a trade review (under_review | reviewed | closed). Restricted to space managers.';
