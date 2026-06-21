-- Enable Supabase Realtime for the community backbone tables so clients can
-- subscribe to live feed activity and collaborative shared-note edits without
-- polling. Added idempotently, matching the mentorship_12 convention.
--
-- global_posts / global_post_comments / global_post_reactions  → live global feed
-- shared_notes                                                 → live 1:1 co-edit
--
-- shared_notes additionally gets REPLICA IDENTITY FULL: clients subscribe filtered
-- by review_id (a non-PK column), and UPDATE/DELETE events must carry the full old
-- row for that filter to match (default PK-only identity would drop them).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'global_posts',
    'global_post_comments',
    'global_post_reactions',
    'shared_notes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname    = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename  = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- review_id-filtered subscriptions need the full old row on UPDATE/DELETE.
ALTER TABLE public.shared_notes REPLICA IDENTITY FULL;

COMMENT ON TABLE public.shared_notes IS
  'One co-edited living note per 1:1 trade review. Revision history captured by tg_shared_notes_revision; realtime-enabled (REPLICA IDENTITY FULL) for live collaboration.';
