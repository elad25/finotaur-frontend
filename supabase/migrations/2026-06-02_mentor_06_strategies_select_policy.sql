-- useTrades joins strategies(name); grant accepted mentors read access so strategy
-- names render in the mentor's read-only view of a student's journal.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_06_strategies_select_policy).

DROP POLICY IF EXISTS "strategies_select_own" ON public.strategies;
CREATE POLICY "strategies_select_own" ON public.strategies
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_accepted_mentor_of(user_id)
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

COMMENT ON POLICY "strategies_select_own" ON public.strategies IS
  'owner OR accepted-mentor (read-only) OR admin-mode. Mentor branch added for Mentor Mode.';
