-- Mentorship authz helpers. All SECURITY DEFINER to read space_members without
-- recursion, mirroring public.rls_check_admin() and is_accepted_mentor_of().
-- These are called from RLS policies (file 07) and RPCs (files 08-11).

-- TRUE when auth.uid() is an active member of p_space.
CREATE OR REPLACE FUNCTION public.is_space_member(p_space uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE space_id = p_space
      AND user_id  = auth.uid()
      AND status   = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_space_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO service_role;

COMMENT ON FUNCTION public.is_space_member(uuid) IS
  'TRUE when auth.uid() is an active member (any role) of the given space. SECURITY DEFINER.';


-- TRUE when auth.uid() is an owner or co_mentor in p_space (active only).
CREATE OR REPLACE FUNCTION public.is_space_manager(p_space uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE space_id = p_space
      AND user_id  = auth.uid()
      AND status   = 'active'
      AND role     IN ('owner', 'co_mentor')
  );
$$;

REVOKE ALL ON FUNCTION public.is_space_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_manager(uuid) TO service_role;

COMMENT ON FUNCTION public.is_space_manager(uuid) IS
  'TRUE when auth.uid() is an active owner or co_mentor of the given space. SECURITY DEFINER.';


-- Returns auth.uid()'s role string within p_space, or NULL if not a member.
CREATE OR REPLACE FUNCTION public.space_role(p_space uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.space_members
  WHERE space_id = p_space
    AND user_id  = auth.uid()
    AND status   = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.space_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.space_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.space_role(uuid) TO service_role;

COMMENT ON FUNCTION public.space_role(uuid) IS
  'Returns role of auth.uid() in the given space, NULL if not an active member. SECURITY DEFINER.';


-- TRUE when auth.uid() can access p_channel: must be a member of the parent space
-- and, for DM channels, must be one of the two DM participants.
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_channels c
    WHERE c.id = p_channel
      AND public.is_space_member(c.space_id)
      AND (
        c.type <> 'dm'
        OR auth.uid() IN (c.dm_a, c.dm_b)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_channel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_channel(uuid) TO service_role;

COMMENT ON FUNCTION public.can_access_channel(uuid) IS
  'TRUE when auth.uid() may read p_channel: space member + DM participant check. SECURITY DEFINER.';
