-- Trade Annotation Taxonomy: ratings + strategy params + mistake/mental tag taxonomy
-- Additive only. All columns nullable, all tables guarded with IF NOT EXISTS. Fully reversible.
-- Note: journal_notebook_{folders,entries} already exist in the live DB (CURRENT_SCHEMA.sql is stale),
-- so this migration only references them via FK; it does NOT recreate them.

-- ===== 1. Strategies: persist parameters the modal collects but currently drops =====
ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS confirmation_signals text[],
  ADD COLUMN IF NOT EXISTS checklist            jsonb,   -- [{ "id": "uuid", "label": "..." }] verification items
  ADD COLUMN IF NOT EXISTS position_sizing_rule text,
  ADD COLUMN IF NOT EXISTS expected_win_rate    numeric,
  ADD COLUMN IF NOT EXISTS avg_rr_goal          numeric,
  ADD COLUMN IF NOT EXISTS psychological_notes  text,
  ADD COLUMN IF NOT EXISTS typical_session      text;

-- ===== 2. Trades: setup-quality rating + mental state + per-trade checklist adherence =====
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS setup_quality_rating smallint CHECK (setup_quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS mental_state         smallint CHECK (mental_state         BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS checklist_results    jsonb;   -- { "<checklist_item_id>": true|false }

-- ===== 3. Tag taxonomy (Mistakes + Mental); mental tags optionally link to a notebook entry =====
CREATE TABLE IF NOT EXISTS public.journal_tags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category          text NOT NULL CHECK (category IN ('mistake','mental')),
  name              text NOT NULL,
  notebook_entry_id uuid REFERENCES public.journal_notebook_entries(id) ON DELETE SET NULL,
  color             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, name)
);

-- ===== 4. Trade <-> tag junction =====
CREATE TABLE IF NOT EXISTS public.trade_tag_links (
  trade_id uuid NOT NULL REFERENCES public.trades(id)       ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES public.journal_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);

-- ===== 5. Indexes =====
CREATE INDEX IF NOT EXISTS idx_journal_tags_user_cat ON public.journal_tags(user_id, category);
CREATE INDEX IF NOT EXISTS idx_trade_tag_links_trade ON public.trade_tag_links(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tag_links_tag   ON public.trade_tag_links(tag_id);

-- ===== 6. RLS — owner-only =====
ALTER TABLE public.journal_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_tags_owner ON public.journal_tags;
CREATE POLICY journal_tags_owner ON public.journal_tags
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS trade_tag_links_owner ON public.trade_tag_links;
CREATE POLICY trade_tag_links_owner ON public.trade_tag_links
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid()));
