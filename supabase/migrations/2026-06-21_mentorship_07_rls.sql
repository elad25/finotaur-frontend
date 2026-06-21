-- RLS policies for the mentorship tables. SELECT-only policies for normal user
-- access; writes go exclusively through SECURITY DEFINER RPCs (files 08-11).
-- Admin override uses rls_check_admin() + rls_check_admin_mode() matching the
-- pattern established in mentor_02_relationships_rls.sql and mentor_05_trades_select_policy.sql.

-- ── mentor_spaces ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "spaces_select_member_or_owner" ON public.mentor_spaces;
CREATE POLICY "spaces_select_member_or_owner" ON public.mentor_spaces
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_space_member(id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "spaces_select_member_or_owner" ON public.mentor_spaces IS
  'Owner or active member may SELECT the space row. Writes are RPC-only.';

-- ── space_members ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members_select_space_member" ON public.space_members;
CREATE POLICY "members_select_space_member" ON public.space_members
  FOR SELECT TO authenticated
  USING (
    public.is_space_member(space_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "members_select_space_member" ON public.space_members IS
  'Active space members may list the full roster. Writes are RPC-only.';

-- ── space_invites ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "invites_select_creator_or_manager" ON public.space_invites;
CREATE POLICY "invites_select_creator_or_manager" ON public.space_invites
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_space_manager(space_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "invites_select_creator_or_manager" ON public.space_invites IS
  'Invite creator or space manager (owner/co_mentor) may read invite rows. Writes are RPC-only.';

-- ── space_channels ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "channels_select_accessible" ON public.space_channels;
CREATE POLICY "channels_select_accessible" ON public.space_channels
  FOR SELECT TO authenticated
  USING (
    public.can_access_channel(id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "channels_select_accessible" ON public.space_channels IS
  'Members see non-DM channels + DM channels they participate in. Writes are RPC-only.';

-- ── space_messages ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "messages_select_accessible_channel" ON public.space_messages;
CREATE POLICY "messages_select_accessible_channel" ON public.space_messages
  FOR SELECT TO authenticated
  USING (
    public.can_access_channel(channel_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "messages_select_accessible_channel" ON public.space_messages IS
  'Messages visible when the caller can access the parent channel. Writes are RPC-only.';
