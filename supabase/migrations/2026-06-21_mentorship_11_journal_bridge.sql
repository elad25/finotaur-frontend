-- Journal sharing bridge: toggling journal_shared in space_members
-- synchronously upserts/revokes a mentor_relationship so that existing
-- is_accepted_mentor_of() checks (file 2026-06-02_mentor_03) continue to
-- gate journal read access without any additional logic.
--
-- mentor_relationships columns referenced here (from mentor_01_relationships_table.sql):
--   id, student_id, mentor_id, requested_email, status, created_at,
--   responded_at, revoked_at, revoked_by
--   Partial unique index: (student_id, mentor_id) WHERE status IN ('pending','accepted')

CREATE OR REPLACE FUNCTION public.set_journal_sharing(
  p_space  uuid,
  p_shared boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student  uuid := auth.uid();
  v_owner_id uuid;
  v_owner_email text;
  v_live_id  uuid;
BEGIN
  IF NOT public.is_space_member(p_space) THEN
    RAISE EXCEPTION 'access_denied' USING errcode = '42501';
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.mentor_spaces
  WHERE id = p_space;

  IF v_owner_id = v_student THEN
    RAISE EXCEPTION 'owner_cannot_share' USING errcode = 'P0001';
  END IF;

  -- Update the journal_shared flag on the membership row.
  UPDATE public.space_members
     SET journal_shared = p_shared
   WHERE space_id = p_space
     AND user_id  = v_student;

  IF p_shared THEN
    -- Ensure an accepted mentor_relationship exists for (student → space owner).
    -- Check for an existing live row (pending or accepted) to avoid violating the
    -- partial unique index on (student_id, mentor_id) WHERE status IN ('pending','accepted').
    SELECT id INTO v_live_id
    FROM public.mentor_relationships
    WHERE student_id = v_student
      AND mentor_id  = v_owner_id
      AND status     IN ('pending', 'accepted')
    LIMIT 1;

    IF v_live_id IS NOT NULL THEN
      -- Upgrade pending to accepted if needed; accepted is a no-op UPDATE.
      UPDATE public.mentor_relationships
         SET status       = 'accepted',
             responded_at = now()
       WHERE id = v_live_id
         AND status = 'pending';
    ELSE
      -- No live row — safe to INSERT (declined/revoked rows exist at most, which
      -- are outside the partial unique index).
      SELECT email INTO v_owner_email
      FROM public.profiles
      WHERE id = v_owner_id;

      INSERT INTO public.mentor_relationships
        (student_id, mentor_id, requested_email, status, responded_at)
      VALUES
        (v_student, v_owner_id, v_owner_email, 'accepted', now());
    END IF;

  ELSE
    -- Revoke the accepted relationship so journal access is withdrawn.
    UPDATE public.mentor_relationships
       SET status     = 'revoked',
           revoked_at = now(),
           revoked_by = v_student
     WHERE student_id = v_student
       AND mentor_id  = v_owner_id
       AND status     = 'accepted';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_journal_sharing(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_journal_sharing(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.set_journal_sharing(uuid, boolean) IS
  'Toggles journal_shared flag for the caller in a space and synchronously upserts/revokes the mentor_relationship with the space owner.';
