-- Mentor Mode: relationship table + status enum.
-- A student requests a mentor by email; the mentor must accept before any access.
-- mentor_id is the resolved authority (not the email). requested_email is an audit snapshot.
-- NOTE: already applied to production via Supabase MCP (migration name: mentor_01_relationships_table).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mentor_relationship_status') THEN
    CREATE TYPE public.mentor_relationship_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.mentor_relationships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_email text NOT NULL,
  status          public.mentor_relationship_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  revoked_at      timestamptz,
  revoked_by      uuid REFERENCES public.profiles(id),
  CONSTRAINT mentor_not_self CHECK (student_id <> mentor_id)
);

-- One live link per (student, mentor) pair; allows re-request after declined/revoked.
CREATE UNIQUE INDEX IF NOT EXISTS mentor_rel_one_live_link
  ON public.mentor_relationships (student_id, mentor_id)
  WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS idx_mentor_rel_mentor_accepted
  ON public.mentor_relationships (mentor_id)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_mentor_rel_student
  ON public.mentor_relationships (student_id);

ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;
