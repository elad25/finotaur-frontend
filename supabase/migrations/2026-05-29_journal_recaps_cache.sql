-- 2026-05-29_journal_recaps_cache.sql
-- DRAFT — not applied. Phase D of journal-reports-hub sprint.
-- Apply via: supabase db push  (after explicit approval).

CREATE TABLE IF NOT EXISTS public.journal_recaps_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trade_count_hash TEXT NOT NULL,
  UNIQUE (user_id, period, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_journal_recaps_cache_user_period
  ON public.journal_recaps_cache (user_id, period, generated_at DESC);

ALTER TABLE public.journal_recaps_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recaps_cache_select_own" ON public.journal_recaps_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Insert/update via service_role only (edge function) — no client policy.

COMMENT ON TABLE public.journal_recaps_cache IS
  'Cache of AI-generated period recaps. TTL=24h enforced in edge function. Insert via service_role only.';
