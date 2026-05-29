-- Mentor Mode write-path RPCs. All SECURITY DEFINER because profiles_select_policy
-- prevents a student from reading the mentor's profile (and vice versa) to resolve ids.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_04_rpcs).

-- Student requests a mentor by email. Mentor must be an existing user.
CREATE OR REPLACE FUNCTION public.request_mentor_by_email(p_email text)
RETURNS public.mentor_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid := auth.uid();
  v_mentor  uuid;
  v_row     public.mentor_relationships;
BEGIN
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '28000';
  END IF;

  SELECT id INTO v_mentor
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_email));

  IF v_mentor IS NULL THEN
    RAISE EXCEPTION 'mentor_not_found' USING errcode = 'P0002';
  END IF;

  IF v_mentor = v_student THEN
    RAISE EXCEPTION 'cannot_mentor_self' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.mentor_relationships (student_id, mentor_id, requested_email, status)
  VALUES (v_student, v_mentor, trim(p_email), 'pending')
  ON CONFLICT (student_id, mentor_id) WHERE status IN ('pending', 'accepted')
  DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'request_already_exists' USING errcode = '23505';
  END IF;

  RETURN v_row;
END;
$$;

-- Mentor accepts or declines a pending request addressed to them.
CREATE OR REPLACE FUNCTION public.respond_to_mentor_request(p_relationship_id uuid, p_accept boolean)
RETURNS public.mentor_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mentor_relationships;
BEGIN
  UPDATE public.mentor_relationships
     SET status = (CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END)::public.mentor_relationship_status,
         responded_at = now()
   WHERE id = p_relationship_id
     AND mentor_id = auth.uid()
     AND status = 'pending'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'request_not_actionable' USING errcode = 'P0001';
  END IF;

  RETURN v_row;
END;
$$;

-- Either party revokes a pending/accepted relationship.
CREATE OR REPLACE FUNCTION public.revoke_mentor_relationship(p_relationship_id uuid)
RETURNS public.mentor_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mentor_relationships;
BEGIN
  UPDATE public.mentor_relationships
     SET status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
   WHERE id = p_relationship_id
     AND (student_id = auth.uid() OR mentor_id = auth.uid())
     AND status IN ('pending', 'accepted')
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'relationship_not_actionable' USING errcode = 'P0001';
  END IF;

  RETURN v_row;
END;
$$;

-- Mentor's accepted students (needs profile fields the mentor cannot read directly).
CREATE OR REPLACE FUNCTION public.list_my_students()
RETURNS TABLE (relationship_id uuid, student_id uuid, display_name text, email text, accepted_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mr.id, p.id, p.display_name, p.email, mr.responded_at
  FROM public.mentor_relationships mr
  JOIN public.profiles p ON p.id = mr.student_id
  WHERE mr.mentor_id = auth.uid() AND mr.status = 'accepted'
  ORDER BY mr.responded_at DESC NULLS LAST;
$$;

-- Student's mentors (any non-revoked/declined status), with mentor profile fields.
CREATE OR REPLACE FUNCTION public.list_my_mentors()
RETURNS TABLE (relationship_id uuid, mentor_id uuid, display_name text, email text, status public.mentor_relationship_status, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mr.id, p.id, p.display_name, p.email, mr.status, mr.created_at
  FROM public.mentor_relationships mr
  JOIN public.profiles p ON p.id = mr.mentor_id
  WHERE mr.student_id = auth.uid() AND mr.status IN ('pending', 'accepted')
  ORDER BY mr.created_at DESC;
$$;

-- Mentor's incoming pending requests (student profile fields for the accept/decline UI).
CREATE OR REPLACE FUNCTION public.list_pending_mentor_requests()
RETURNS TABLE (relationship_id uuid, student_id uuid, display_name text, email text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mr.id, p.id, p.display_name, p.email, mr.created_at
  FROM public.mentor_relationships mr
  JOIN public.profiles p ON p.id = mr.student_id
  WHERE mr.mentor_id = auth.uid() AND mr.status = 'pending'
  ORDER BY mr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.request_mentor_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_mentor_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_mentor_relationship(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_students() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_mentors() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_pending_mentor_requests() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_mentor_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_mentor_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mentor_relationship(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_students() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_mentors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_mentor_requests() TO authenticated;
