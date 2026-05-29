-- 2026-05-29_journal_progress_tables.sql
-- Promotes Progress Tracker from localStorage to Supabase. Mirrors ProgressRule/ProgressEntry shapes.

-- ============================================================
-- TABLE: journal_progress_rules
-- User-defined daily rules/habits tracked in the Progress Tracker.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_progress_rules (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL CHECK (char_length(text) <= 200),
  "order"    INT         NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_progress_rules IS
  'Promotes Progress Tracker from localStorage to Supabase. Mirrors ProgressRule/ProgressEntry shapes.';

CREATE INDEX IF NOT EXISTS idx_journal_progress_rules_user_id
  ON public.journal_progress_rules (user_id);

ALTER TABLE public.journal_progress_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_rules_select_own" ON public.journal_progress_rules;
CREATE POLICY "progress_rules_select_own" ON public.journal_progress_rules
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_rules_insert_own" ON public.journal_progress_rules;
CREATE POLICY "progress_rules_insert_own" ON public.journal_progress_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_rules_update_own" ON public.journal_progress_rules;
CREATE POLICY "progress_rules_update_own" ON public.journal_progress_rules
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_rules_delete_own" ON public.journal_progress_rules;
CREATE POLICY "progress_rules_delete_own" ON public.journal_progress_rules
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: journal_progress_entries
-- Per-day completion records for each progress rule.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_progress_entries (
  id         UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id    UUID    NOT NULL REFERENCES public.journal_progress_rules(id) ON DELETE CASCADE,
  date       DATE    NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE (user_id, rule_id, date)
);

COMMENT ON TABLE public.journal_progress_entries IS
  'Per-day completion records for each journal_progress_rules row. One row per (user, rule, date).';

CREATE INDEX IF NOT EXISTS idx_journal_progress_entries_user_date
  ON public.journal_progress_entries (user_id, date);

ALTER TABLE public.journal_progress_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_entries_select_own" ON public.journal_progress_entries;
CREATE POLICY "progress_entries_select_own" ON public.journal_progress_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_entries_insert_own" ON public.journal_progress_entries;
CREATE POLICY "progress_entries_insert_own" ON public.journal_progress_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_entries_update_own" ON public.journal_progress_entries;
CREATE POLICY "progress_entries_update_own" ON public.journal_progress_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_entries_delete_own" ON public.journal_progress_entries;
CREATE POLICY "progress_entries_delete_own" ON public.journal_progress_entries
  FOR DELETE USING (auth.uid() = user_id);
