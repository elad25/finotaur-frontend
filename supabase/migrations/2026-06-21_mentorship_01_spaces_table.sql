-- Mentorship Spaces: the top-level container for a mentor's community.
-- Each space is owned by one mentor and contains members, channels, and messages.
-- Visibility is 'invite_only' by default; only invite-only and private modes are
-- supported (no fully public spaces in v1).

CREATE TABLE IF NOT EXISTS public.mentor_spaces (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug         text        NOT NULL UNIQUE,
  name         text        NOT NULL,
  description  text,
  avatar_url   text,
  banner_url   text,
  visibility   text        NOT NULL DEFAULT 'invite_only'
                           CHECK (visibility IN ('invite_only', 'private')),
  tier_gate    text        NOT NULL DEFAULT 'platform_finotaur',
  settings     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_archived  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_spaces_owner_id
  ON public.mentor_spaces (owner_id);

ALTER TABLE public.mentor_spaces ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.mentor_spaces IS
  'Top-level mentorship space container. One owner (mentor) per space; members join via invite.';
