-- Mirror of the already-applied RPC add_space_member_direct (2026-06-27).
-- The function was applied directly to the live DB; this file keeps the
-- migration history on disk in sync with production.
-- DO NOT re-apply; it is a no-op via CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.add_space_member_direct(p_space uuid, p_user uuid, p_role text DEFAULT 'student'::text)
 RETURNS space_members
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_member public.space_members;
BEGIN
  IF NOT public.is_space_manager(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;
  IF p_role NOT IN ('co_mentor', 'moderator', 'student') THEN
    RAISE EXCEPTION 'invalid_role' USING errcode = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_relationships mr
    WHERE mr.mentor_id = auth.uid() AND mr.student_id = p_user AND mr.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'not_connected' USING errcode = 'P0001';
  END IF;
  INSERT INTO public.space_members (space_id, user_id, role, status, invited_by)
  VALUES (p_space, p_user, p_role, 'active', auth.uid())
  ON CONFLICT (space_id, user_id) DO UPDATE SET status = 'active', role = EXCLUDED.role
  RETURNING * INTO v_member;
  RETURN v_member;
END; $function$;
