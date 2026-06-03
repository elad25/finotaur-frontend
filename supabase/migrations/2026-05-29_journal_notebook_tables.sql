-- 2026-05-29_journal_notebook_tables.sql
-- Global Notebook with folders + tags. Independent of trades.notes.

-- ============================================================
-- TABLE: journal_notebook_folders
-- User-defined folders for organising notebook entries.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_notebook_folders (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) <= 80),
  color      TEXT,
  "order"    INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_notebook_folders IS
  'Global Notebook with folders + tags. Independent of trades.notes.';

CREATE INDEX IF NOT EXISTS idx_journal_notebook_folders_user_id
  ON public.journal_notebook_folders (user_id);

ALTER TABLE public.journal_notebook_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nb_folders_select_own" ON public.journal_notebook_folders;
CREATE POLICY "nb_folders_select_own" ON public.journal_notebook_folders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_folders_insert_own" ON public.journal_notebook_folders;
CREATE POLICY "nb_folders_insert_own" ON public.journal_notebook_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_folders_update_own" ON public.journal_notebook_folders;
CREATE POLICY "nb_folders_update_own" ON public.journal_notebook_folders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_folders_delete_own" ON public.journal_notebook_folders;
CREATE POLICY "nb_folders_delete_own" ON public.journal_notebook_folders
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: journal_notebook_entries
-- Free-form notebook entries with optional folder, tags, and pin state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_notebook_entries (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id  UUID        REFERENCES public.journal_notebook_folders(id) ON DELETE SET NULL,
  title      TEXT        NOT NULL DEFAULT '',
  content    TEXT        NOT NULL DEFAULT '',
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  pinned     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_notebook_entries IS
  'Free-form notebook entries belonging to a user. Supports folders, tags array, and pin flag.';

-- Fast tag containment / overlap queries
CREATE INDEX IF NOT EXISTS idx_journal_notebook_entries_tags
  ON public.journal_notebook_entries USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_journal_notebook_entries_user_folder
  ON public.journal_notebook_entries (user_id, folder_id);

ALTER TABLE public.journal_notebook_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nb_entries_select_own" ON public.journal_notebook_entries;
CREATE POLICY "nb_entries_select_own" ON public.journal_notebook_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_entries_insert_own" ON public.journal_notebook_entries;
CREATE POLICY "nb_entries_insert_own" ON public.journal_notebook_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_entries_update_own" ON public.journal_notebook_entries;
CREATE POLICY "nb_entries_update_own" ON public.journal_notebook_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nb_entries_delete_own" ON public.journal_notebook_entries;
CREATE POLICY "nb_entries_delete_own" ON public.journal_notebook_entries
  FOR DELETE USING (auth.uid() = user_id);
