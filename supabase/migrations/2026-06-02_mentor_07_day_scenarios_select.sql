-- Mentor View: accepted mentor can read a student's Gameplan (day_scenarios), read-only.
-- The existing "Users manage own scenarios" (FOR ALL, owner-only) still governs writes.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_07_day_scenarios_select).

CREATE POLICY "day_scenarios_mentor_select" ON public.day_scenarios
  FOR SELECT TO authenticated
  USING (public.is_accepted_mentor_of(user_id));
