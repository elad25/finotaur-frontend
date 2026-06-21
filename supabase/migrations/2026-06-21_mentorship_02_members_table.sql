-- Space membership: tracks who belongs to a mentor_space and in what capacity.
-- journal_shared drives the mentor_relationships bridge (see file 11).

CREATE TABLE IF NOT EXISTS public.space_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'student'
                              CHECK (role IN ('owner', 'co_mentor', 'moderator', 'student')),
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'banned', 'left')),
  journal_shared  boolean     NOT NULL DEFAULT false,
  invited_by      uuid        REFERENCES public.profiles(id),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_user_id
  ON public.space_members (user_id);

CREATE INDEX IF NOT EXISTS idx_space_members_space_id
  ON public.space_members (space_id);

ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_members IS
  'Membership roster for a mentor_space. One row per (space, user) pair; role and status are mutable.';
