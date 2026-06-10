-- Extend trades SELECT to grant accepted mentors read access. Write policies
-- (insert/update/delete) are untouched and remain owner-only -> read-only enforced in DB.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_05_trades_select_policy).

DROP POLICY IF EXISTS "trades_select_unified" ON public.trades;
CREATE POLICY "trades_select_unified" ON public.trades
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_accepted_mentor_of(user_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "trades_select_unified" ON public.trades IS
  'owner OR accepted-mentor (read-only) OR admin-mode. Mentor branch added for Mentor Mode; write policies remain owner-only.';
