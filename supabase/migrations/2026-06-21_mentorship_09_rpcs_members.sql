-- Member management RPCs: invite creation, invite acceptance, member listing,
-- member removal, and DM channel creation. All SECURITY DEFINER.

-- Generate a single-use invite token for a space. Caller must be a manager.
CREATE OR REPLACE FUNCTION public.create_space_invite(
  p_space  uuid,
  p_email  text   DEFAULT NULL,
  p_role   text   DEFAULT 'student'
)
RETURNS public.space_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token  text;
  v_invite public.space_invites;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.space_invites (space_id, token, email, role, created_by)
  VALUES (p_space, v_token, p_email, p_role, auth.uid())
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;

REVOKE ALL ON FUNCTION public.create_space_invite(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_space_invite(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_space_invite(uuid, text, text) IS
  'Creates a single-use invite token for a mentor_space. Requires owner or co_mentor role.';


-- Consume an invite token. Upserts membership on conflict (re-join case).
CREATE OR REPLACE FUNCTION public.accept_space_invite(p_token text)
RETURNS public.space_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.space_invites;
  v_member  public.space_members;
BEGIN
  SELECT * INTO v_invite
  FROM public.space_invites
  WHERE token = p_token;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found' USING errcode = 'P0002';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_used' USING errcode = 'P0001';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired' USING errcode = 'P0001';
  END IF;

  -- Insert or re-activate membership if the user previously left/was banned.
  INSERT INTO public.space_members (space_id, user_id, role, status, invited_by)
  VALUES (v_invite.space_id, auth.uid(), v_invite.role, 'active', v_invite.created_by)
  ON CONFLICT (space_id, user_id)
  DO UPDATE SET
    status = 'active',
    role   = EXCLUDED.role
  RETURNING * INTO v_member;

  -- Consume the invite.
  UPDATE public.space_invites
     SET used_at  = now(),
         used_by  = auth.uid()
   WHERE id = v_invite.id;

  RETURN v_member;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_space_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_space_invite(text) TO authenticated;

COMMENT ON FUNCTION public.accept_space_invite(text) IS
  'Consumes an invite token and creates (or reactivates) the caller''s space membership.';


-- List all members of a space with their profile display names.
CREATE OR REPLACE FUNCTION public.list_space_members(p_space uuid)
RETURNS TABLE (
  member_id      uuid,
  user_id        uuid,
  display_name   text,
  email          text,
  role           text,
  status         text,
  journal_shared boolean,
  joined_at      timestamptz
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
    sm.id            AS member_id,
    sm.user_id,
    p.display_name,
    p.email,
    sm.role,
    sm.status,
    sm.journal_shared,
    sm.joined_at
  FROM public.space_members sm
  JOIN public.profiles      p  ON p.id = sm.user_id
  WHERE sm.space_id = p_space
  ORDER BY
    CASE sm.role
      WHEN 'owner'      THEN 1
      WHEN 'co_mentor'  THEN 2
      WHEN 'moderator'  THEN 3
      ELSE                   4
    END,
    sm.joined_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_space_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_space_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_space_members(uuid) IS
  'Returns all members of a space with profile fields. Requires active membership to call.';


-- Remove a member from a space. Also revokes any active mentor_relationship
-- between the removed student and the space owner.
CREATE OR REPLACE FUNCTION public.remove_space_member(p_space uuid, p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_role text;
  v_owner_id    uuid;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  SELECT role INTO v_target_role
  FROM public.space_members
  WHERE space_id = p_space AND user_id = p_user;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'cannot_remove_owner' USING errcode = 'P0001';
  END IF;

  DELETE FROM public.space_members
  WHERE space_id = p_space AND user_id = p_user;

  -- Revoke the mentor_relationship between this student and the space owner,
  -- if one exists in accepted status.
  SELECT owner_id INTO v_owner_id
  FROM public.mentor_spaces
  WHERE id = p_space;

  UPDATE public.mentor_relationships
     SET status     = 'revoked',
         revoked_at = now(),
         revoked_by = auth.uid()
   WHERE student_id = p_user
     AND mentor_id  = v_owner_id
     AND status     = 'accepted';
END;
$$;

REVOKE ALL ON FUNCTION public.remove_space_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_space_member(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.remove_space_member(uuid, uuid) IS
  'Removes a member from a space (managers only). Also revokes an active mentor_relationship with the space owner.';


-- Open (or return existing) a DM channel between the caller and another space member.
CREATE OR REPLACE FUNCTION public.open_dm_channel(p_space uuid, p_user uuid)
RETURNS public.space_channels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel public.space_channels;
BEGIN
  -- Both parties must be active members.
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = p_space AND user_id = p_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  -- Return existing DM channel if one already exists for this pair.
  SELECT * INTO v_channel
  FROM public.space_channels
  WHERE space_id = p_space
    AND type     = 'dm'
    AND LEAST(dm_a, dm_b)    = LEAST(auth.uid(), p_user)
    AND GREATEST(dm_a, dm_b) = GREATEST(auth.uid(), p_user);

  IF v_channel.id IS NOT NULL THEN
    RETURN v_channel;
  END IF;

  -- Create a new DM channel.
  INSERT INTO public.space_channels (space_id, name, type, dm_a, dm_b)
  VALUES (p_space, 'dm', 'dm', auth.uid(), p_user)
  RETURNING * INTO v_channel;

  RETURN v_channel;
END;
$$;

REVOKE ALL ON FUNCTION public.open_dm_channel(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_dm_channel(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.open_dm_channel(uuid, uuid) IS
  'Returns an existing DM channel between the caller and p_user in p_space, or creates one. Both must be active members.';
