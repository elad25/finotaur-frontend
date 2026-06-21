-- Space management RPCs. All SECURITY DEFINER so they can read/write the
-- mentorship tables regardless of the caller's profile visibility constraints.

-- Create a new mentor space. Caller must be on the platform_finotaur plan
-- (or have an elevated account_type / role). Seeds owner membership + two
-- default channels on success.
CREATE OR REPLACE FUNCTION public.create_mentor_space(
  p_name        text,
  p_slug        text,
  p_description text DEFAULT NULL
)
RETURNS public.mentor_spaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_space  public.mentor_spaces;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '28000';
  END IF;

  -- Tier gate: platform_finotaur plan, or admin/vip/beta account_type, or admin role.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller
      AND (
        platform_plan IN ('platform_finotaur', 'finotaur', 'platform_enterprise', 'enterprise')
        OR account_type IN ('admin', 'vip', 'beta')
        OR role        IN ('admin', 'super_admin')
      )
  ) THEN
    RAISE EXCEPTION 'not_premium' USING errcode = 'P0001';
  END IF;

  -- Insert the space; trap duplicate slug.
  BEGIN
    INSERT INTO public.mentor_spaces (owner_id, slug, name, description)
    VALUES (v_caller, p_slug, p_name, p_description)
    RETURNING * INTO v_space;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'slug_taken' USING errcode = '23505';
  END;

  -- Seed owner membership.
  INSERT INTO public.space_members (space_id, user_id, role, status, invited_by)
  VALUES (v_space.id, v_caller, 'owner', 'active', v_caller);

  -- Seed default channels.
  INSERT INTO public.space_channels (space_id, name, type, position)
  VALUES
    (v_space.id, 'announcements', 'announcement', 0),
    (v_space.id, 'general',       'chat',         1);

  RETURN v_space;
END;
$$;

REVOKE ALL ON FUNCTION public.create_mentor_space(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_mentor_space(text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_mentor_space(text, text, text) IS
  'Creates a mentor_space for the caller (platform_finotaur gate). Seeds owner membership and two default channels.';


-- Update mutable fields of a mentor_space. Only owner or co_mentor may call this.
CREATE OR REPLACE FUNCTION public.update_mentor_space(
  p_space       uuid,
  p_name        text    DEFAULT NULL,
  p_description text    DEFAULT NULL,
  p_avatar_url  text    DEFAULT NULL,
  p_banner_url  text    DEFAULT NULL
)
RETURNS public.mentor_spaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space public.mentor_spaces;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  UPDATE public.mentor_spaces
     SET name        = COALESCE(p_name,        name),
         description = COALESCE(p_description, description),
         avatar_url  = COALESCE(p_avatar_url,  avatar_url),
         banner_url  = COALESCE(p_banner_url,  banner_url),
         updated_at  = now()
   WHERE id = p_space
  RETURNING * INTO v_space;

  RETURN v_space;
END;
$$;

REVOKE ALL ON FUNCTION public.update_mentor_space(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_mentor_space(uuid, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.update_mentor_space(uuid, text, text, text, text) IS
  'Updates mutable mentor_space fields. Requires owner or co_mentor role.';


-- List all spaces the caller has an active membership in, with member count
-- and the caller's role in each space.
CREATE OR REPLACE FUNCTION public.list_my_spaces()
RETURNS TABLE (
  space_id     uuid,
  name         text,
  slug         text,
  description  text,
  avatar_url   text,
  role         text,
  member_count int,
  owner_id     uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ms.id                                                          AS space_id,
    ms.name,
    ms.slug,
    ms.description,
    ms.avatar_url,
    sm_caller.role,
    (
      SELECT COUNT(*)::int
      FROM public.space_members sm2
      WHERE sm2.space_id = ms.id
        AND sm2.status   = 'active'
    )                                                              AS member_count,
    ms.owner_id
  FROM public.mentor_spaces  ms
  JOIN public.space_members  sm_caller
    ON sm_caller.space_id = ms.id
   AND sm_caller.user_id  = auth.uid()
   AND sm_caller.status   = 'active'
  WHERE ms.is_archived = false
  ORDER BY sm_caller.joined_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_spaces() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_spaces() TO authenticated;

COMMENT ON FUNCTION public.list_my_spaces() IS
  'Returns all non-archived spaces where auth.uid() is an active member, with role and member count.';


-- Get full detail for a single space. Caller must be an active member.
CREATE OR REPLACE FUNCTION public.get_space(p_space uuid)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  description  text,
  avatar_url   text,
  banner_url   text,
  owner_id     uuid,
  my_role      text,
  member_count int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ms.id,
    ms.name,
    ms.slug,
    ms.description,
    ms.avatar_url,
    ms.banner_url,
    ms.owner_id,
    public.space_role(p_space)               AS my_role,
    (
      SELECT COUNT(*)::int
      FROM public.space_members sm2
      WHERE sm2.space_id = ms.id
        AND sm2.status   = 'active'
    )                                        AS member_count
  FROM public.mentor_spaces ms
  WHERE ms.id = p_space;
END;
$$;

REVOKE ALL ON FUNCTION public.get_space(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_space(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_space(uuid) IS
  'Returns detail row for a single mentor_space. Caller must be an active member.';


-- List channels accessible to the caller within a space (non-DM + own DMs).
CREATE OR REPLACE FUNCTION public.list_space_channels(p_space uuid)
RETURNS SETOF public.space_channels
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.space_channels
  WHERE space_id = p_space
    AND (
      type <> 'dm'
      OR auth.uid() IN (dm_a, dm_b)
    )
  ORDER BY position ASC, created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_space_channels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_space_channels(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_space_channels(uuid) IS
  'Returns channels in a space visible to auth.uid() (non-DM + own DM channels), ordered by position.';
