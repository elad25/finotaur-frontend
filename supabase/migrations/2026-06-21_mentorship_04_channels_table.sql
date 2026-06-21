-- Space channels: announcement, chat, and DM channel types within a space.
-- dm channels reference exactly two participants; a partial unique index prevents
-- duplicate DM pairs within the same space regardless of dm_a/dm_b column order.

CREATE TABLE IF NOT EXISTS public.space_channels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id   uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text        NOT NULL
                         CHECK (type IN ('announcement', 'chat', 'dm')),
  position   int         NOT NULL DEFAULT 0,
  dm_a       uuid        REFERENCES public.profiles(id),
  dm_b       uuid        REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_channels_space_id
  ON public.space_channels (space_id);

-- Enforce at most one DM channel per ordered pair of participants within a space.
CREATE UNIQUE INDEX IF NOT EXISTS space_channels_dm_pair
  ON public.space_channels (space_id, LEAST(dm_a, dm_b), GREATEST(dm_a, dm_b))
  WHERE type = 'dm';

ALTER TABLE public.space_channels ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_channels IS
  'Channels within a mentor_space. DM channels link exactly two members via dm_a/dm_b.';
