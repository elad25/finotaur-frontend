-- Authorization predicate for Mentor Mode. TRUE when caller is an ACCEPTED mentor
-- of p_student. SECURITY DEFINER to read mentor_relationships without recursion,
-- mirroring public.rls_check_admin(). auth.uid() is captured inside — the caller
-- can only ask "am I an accepted mentor of X", never impersonate another mentor.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_03_is_accepted_mentor_of).

CREATE OR REPLACE FUNCTION public.is_accepted_mentor_of(p_student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid()
      AND mr.student_id = p_student
      AND mr.status = 'accepted'
  );
$$;

REVOKE ALL ON FUNCTION public.is_accepted_mentor_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_accepted_mentor_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accepted_mentor_of(uuid) TO service_role;

COMMENT ON FUNCTION public.is_accepted_mentor_of(uuid) IS
  'Mentor Mode authz predicate. TRUE when auth.uid() is an accepted mentor of p_student. SECURITY DEFINER, mirrors rls_check_admin().';
