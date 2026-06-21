-- Space messages: immutable-body messages posted within a space channel.
-- deleted_at is a soft-delete marker; deleted rows are excluded from queries.
-- space_id is denormalized here to simplify CASCADE on space deletion.

CREATE TABLE IF NOT EXISTS public.space_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   uuid        NOT NULL REFERENCES public.space_channels(id) ON DELETE CASCADE,
  space_id     uuid        NOT NULL REFERENCES public.mentor_spaces(id) ON DELETE CASCADE,
  author_id    uuid        NOT NULL REFERENCES public.profiles(id),
  body         text        NOT NULL,
  attachments  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  pinned       boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  edited_at    timestamptz,
  deleted_at   timestamptz
);

-- Primary read path: paginated history for a channel, newest first.
CREATE INDEX IF NOT EXISTS space_messages_channel_created
  ON public.space_messages (channel_id, created_at DESC);

ALTER TABLE public.space_messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.space_messages IS
  'Messages within space_channels. Soft-deleted via deleted_at; realtime-enabled (see file 12).';
