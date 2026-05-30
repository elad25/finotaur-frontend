-- RLS for mentor_relationships. Writes go through SECURITY DEFINER RPCs (file 04);
-- these policies are defense-in-depth for any direct client access.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_02_relationships_rls).

DROP POLICY IF EXISTS "mentor_rel_select_party" ON public.mentor_relationships;
CREATE POLICY "mentor_rel_select_party" ON public.mentor_relationships
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR mentor_id = auth.uid()
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  );

DROP POLICY IF EXISTS "mentor_rel_insert_self_request" ON public.mentor_relationships;
CREATE POLICY "mentor_rel_insert_self_request" ON public.mentor_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND mentor_id <> auth.uid()
  );

DROP POLICY IF EXISTS "mentor_rel_update_parties" ON public.mentor_relationships;
CREATE POLICY "mentor_rel_update_parties" ON public.mentor_relationships
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR mentor_id = auth.uid()
  )
  WITH CHECK (
    (mentor_id = auth.uid() AND status IN ('accepted', 'declined'))
    OR ((student_id = auth.uid() OR mentor_id = auth.uid()) AND status = 'revoked')
  );

DROP POLICY IF EXISTS "mentor_rel_delete_forbidden" ON public.mentor_relationships;
CREATE POLICY "mentor_rel_delete_forbidden" ON public.mentor_relationships
  FOR DELETE TO authenticated
  USING (false);
