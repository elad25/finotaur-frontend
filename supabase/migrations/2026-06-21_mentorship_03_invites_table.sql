-- Space invites: time-limited tokens that grant entry to a mentor_space.
-- A token is consumed (used_at set) exactly once; email is optional targeting.

CREATE TABLE IF NOT EXISTS public.space_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  email       text,
  role        text        NOT NULL DEFAULT 'student'
                          CHECK (role IN ('co_mentor', 'moderator', 'student')),
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at     timestamptz,
  used_by     uuid        REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_invites_token
  ON public.space_invites (token);

CREATE INDEX IF NOT EXISTS idx_space_invites_space_id
  ON public.space_invites (space_id);

ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_invites IS
  'Single-use invite tokens for mentor_spaces. Expire after 14 days by default.';
