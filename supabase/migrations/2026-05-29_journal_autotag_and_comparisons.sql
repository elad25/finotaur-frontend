-- 2026-05-29_journal_autotag_and_comparisons.sql
-- Deterministic auto-tagger rules + saved A/B comparisons.

-- ============================================================
-- TABLE: journal_autotag_rules
-- User-defined rules that deterministically assign tags to trades.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_autotag_rules (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag        TEXT        NOT NULL,
  conditions JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  "order"    INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_autotag_rules IS
  'Deterministic auto-tagger rules + saved A/B comparisons.';

CREATE INDEX IF NOT EXISTS idx_journal_autotag_rules_user_id
  ON public.journal_autotag_rules (user_id);

ALTER TABLE public.journal_autotag_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autotag_rules_select_own" ON public.journal_autotag_rules;
CREATE POLICY "autotag_rules_select_own" ON public.journal_autotag_rules
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "autotag_rules_insert_own" ON public.journal_autotag_rules;
CREATE POLICY "autotag_rules_insert_own" ON public.journal_autotag_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "autotag_rules_update_own" ON public.journal_autotag_rules;
CREATE POLICY "autotag_rules_update_own" ON public.journal_autotag_rules
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "autotag_rules_delete_own" ON public.journal_autotag_rules;
CREATE POLICY "autotag_rules_delete_own" ON public.journal_autotag_rules
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: journal_saved_comparisons
-- Saved A/B group comparisons for the trade analysis UI.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_saved_comparisons (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  group_a    JSONB       NOT NULL,
  group_b    JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_saved_comparisons IS
  'Saved A/B trade group comparisons for the journal analysis surface.';

CREATE INDEX IF NOT EXISTS idx_journal_saved_comparisons_user_id
  ON public.journal_saved_comparisons (user_id);

ALTER TABLE public.journal_saved_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_comparisons_select_own" ON public.journal_saved_comparisons;
CREATE POLICY "saved_comparisons_select_own" ON public.journal_saved_comparisons
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_comparisons_insert_own" ON public.journal_saved_comparisons;
CREATE POLICY "saved_comparisons_insert_own" ON public.journal_saved_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_comparisons_update_own" ON public.journal_saved_comparisons;
CREATE POLICY "saved_comparisons_update_own" ON public.journal_saved_comparisons
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_comparisons_delete_own" ON public.journal_saved_comparisons;
CREATE POLICY "saved_comparisons_delete_own" ON public.journal_saved_comparisons
  FOR DELETE USING (auth.uid() = user_id);
