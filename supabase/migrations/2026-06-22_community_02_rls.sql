-- RLS policies for the FINOTAUR community backbone tables (global feed + trade
-- shares + shared notes). SELECT-only policies for authenticated clients;
-- writes go exclusively through SECURITY DEFINER RPCs in migration 03.
--
-- Important: RLS controls ROW-level access only. FIELD redaction (hide_pnl,
-- show_setup_only, reveal_size, etc.) is enforced separately inside the read
-- RPCs in migration 03 — it is NOT applied here.
--
-- Admin override follows the same rls_check_admin() + rls_check_admin_mode()
-- pattern used in mentorship_07_rls.sql and mentor_02_relationships_rls.sql.
--
-- Helper functions reused from prior migrations (do NOT redefine here):
--   public.is_space_member(uuid)    — mentorship_06_helpers.sql
--   public.is_space_manager(uuid)   — mentorship_06_helpers.sql
--   public.can_access_review(uuid)  — mentorship_16_reviews.sql


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: is_paying_user
-- Returns TRUE when p_user has a non-free platform_plan with an active or
-- trial subscription. Used to gate the global community feed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_paying_user(p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = COALESCE(p_user, auth.uid())
      AND p.platform_plan IS NOT NULL
      AND p.platform_plan <> 'free'
      AND p.platform_subscription_status IN ('active', 'trial')
  );
$$;

REVOKE ALL ON FUNCTION public.is_paying_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_paying_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_paying_user(uuid) TO service_role;

COMMENT ON FUNCTION public.is_paying_user(uuid) IS
  'TRUE when p_user (default auth.uid()) holds a non-free platform plan with an active or trial subscription. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- ENABLE RLS
-- The six community backbone tables created in migration 01 did not call
-- ENABLE ROW LEVEL SECURITY; we do it here alongside the policies.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.global_posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_post_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_post_reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_shares              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_note_revisions     ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- global_posts
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "global_posts_select_paying" ON public.global_posts;
CREATE POLICY "global_posts_select_paying" ON public.global_posts
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_paying_user()
      OR (public.rls_check_admin() AND public.rls_check_admin_mode())
    )
  );

COMMENT ON POLICY "global_posts_select_paying" ON public.global_posts IS
  'Paying users (non-free plan, active/trial status) may read non-deleted global feed posts. Writes are RPC-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- global_post_comments
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "global_post_comments_select_paying" ON public.global_post_comments;
CREATE POLICY "global_post_comments_select_paying" ON public.global_post_comments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_paying_user()
      OR (public.rls_check_admin() AND public.rls_check_admin_mode())
    )
  );

COMMENT ON POLICY "global_post_comments_select_paying" ON public.global_post_comments IS
  'Paying users may read non-deleted comments on global feed posts. Writes are RPC-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- global_post_reactions
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "global_post_reactions_select_paying" ON public.global_post_reactions;
CREATE POLICY "global_post_reactions_select_paying" ON public.global_post_reactions
  FOR SELECT TO authenticated
  USING (
    public.is_paying_user()
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "global_post_reactions_select_paying" ON public.global_post_reactions IS
  'Paying users may read reactions on global feed posts. Writes are RPC-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- trade_shares
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trade_shares_select_scoped" ON public.trade_shares;
CREATE POLICY "trade_shares_select_scoped" ON public.trade_shares
  FOR SELECT TO authenticated
  USING (
    (
      author_id = auth.uid()
      OR (scope = 'global'                          AND public.is_paying_user())
      OR (scope IN ('community', 'mentor')          AND public.is_space_member(room_id))
    )
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "trade_shares_select_scoped" ON public.trade_shares IS
  'Authors always see their own shares. Global shares visible to paying users. Community/mentor shares visible to space members. Writes are RPC-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- shared_notes
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_notes_select_review_participant" ON public.shared_notes;
CREATE POLICY "shared_notes_select_review_participant" ON public.shared_notes
  FOR SELECT TO authenticated
  USING (
    public.can_access_review(review_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "shared_notes_select_review_participant" ON public.shared_notes IS
  'The review requester and space managers (owner/co_mentor) may read the shared note. Writes are RPC-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- shared_note_revisions
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_note_revisions_select_review_participant" ON public.shared_note_revisions;
CREATE POLICY "shared_note_revisions_select_review_participant" ON public.shared_note_revisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_notes n
      WHERE n.id = note_id
        AND public.can_access_review(n.review_id)
    )
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "shared_note_revisions_select_review_participant" ON public.shared_note_revisions IS
  'Revision history is readable when the caller can access the parent note''s review. Writes are trigger-only (tg_shared_notes_revision).';
