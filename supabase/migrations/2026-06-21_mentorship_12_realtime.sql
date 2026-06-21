-- Enable Supabase Realtime for space_messages so clients can subscribe to
-- new message events without polling. Added idempotently.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'space_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.space_messages;
  END IF;
END $$;

COMMENT ON TABLE public.space_messages IS
  'Messages within space_channels. Soft-deleted via deleted_at; realtime-enabled via supabase_realtime publication.';
