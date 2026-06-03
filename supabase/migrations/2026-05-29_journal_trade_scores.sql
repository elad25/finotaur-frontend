-- 2026-05-29_journal_trade_scores.sql
-- Per-trade and per-user scoring (FINOTAUR Scale). Separate from trades core table.

-- ============================================================
-- TABLE: journal_trade_scores
-- Computed FINOTAUR Scale score for each trade. PK is trade_id.
-- user_id is carried for RLS (auth.uid() = user_id pattern).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_trade_scores (
  trade_id    UUID           NOT NULL PRIMARY KEY REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id     UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       NUMERIC(5,2)   NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown   JSONB          NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_trade_scores IS
  'Per-trade and per-user scoring (FINOTAUR Scale). Separate from trades core table.';

CREATE INDEX IF NOT EXISTS idx_journal_trade_scores_user_id
  ON public.journal_trade_scores (user_id);

ALTER TABLE public.journal_trade_scores ENABLE ROW LEVEL SECURITY;

-- Policies key on user_id even though PK is trade_id, so RLS is scoped to the owning user.
DROP POLICY IF EXISTS "trade_scores_select_own" ON public.journal_trade_scores;
CREATE POLICY "trade_scores_select_own" ON public.journal_trade_scores
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_scores_insert_own" ON public.journal_trade_scores;
CREATE POLICY "trade_scores_insert_own" ON public.journal_trade_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_scores_update_own" ON public.journal_trade_scores;
CREATE POLICY "trade_scores_update_own" ON public.journal_trade_scores
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_scores_delete_own" ON public.journal_trade_scores;
CREATE POLICY "trade_scores_delete_own" ON public.journal_trade_scores
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: journal_scoring_config
-- Per-user weight configuration for the FINOTAUR Scale.
-- PK is user_id (one config row per user).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_scoring_config (
  user_id    UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weights    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.journal_scoring_config IS
  'Per-user weight configuration for the FINOTAUR Scale scoring model. One row per user.';

ALTER TABLE public.journal_scoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scoring_config_select_own" ON public.journal_scoring_config;
CREATE POLICY "scoring_config_select_own" ON public.journal_scoring_config
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scoring_config_insert_own" ON public.journal_scoring_config;
CREATE POLICY "scoring_config_insert_own" ON public.journal_scoring_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scoring_config_update_own" ON public.journal_scoring_config;
CREATE POLICY "scoring_config_update_own" ON public.journal_scoring_config
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scoring_config_delete_own" ON public.journal_scoring_config;
CREATE POLICY "scoring_config_delete_own" ON public.journal_scoring_config
  FOR DELETE USING (auth.uid() = user_id);
