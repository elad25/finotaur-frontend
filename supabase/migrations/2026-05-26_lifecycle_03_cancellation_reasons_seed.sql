-- ============================================================================
-- Migration: lifecycle_03_cancellation_reasons_seed
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Standardized lookup table for cancellation reasons. Replaces the
--          ad-hoc reason_id TEXT field in subscription_cancellation_feedback
--          with a canonical list (radio buttons in the cancel modal, P2).
--
-- Why: Free-form reason strings make analytics impossible. With a fixed set,
--      we can build "top reasons last 30 days" charts in Admin CRM and feed
--      them to the Weekly Claude Report for trend detection.
--
-- Seed list curated for Finotaur (B2C trading SaaS). 10 reasons covering
-- pricing, fit, competition, life changes, and unclear value. Order matters:
-- shown to user in this sequence in the cancel modal.
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS public.cancellation_reasons;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
  id          TEXT PRIMARY KEY,
  label_he    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the canonical list (idempotent via ON CONFLICT)
INSERT INTO public.cancellation_reasons (id, label_he, label_en, sort_order) VALUES
  ('too_expensive',        'יקר מדי',                          'Too expensive',                   1),
  ('not_using',            'לא משתמש מספיק',                   'Not using it enough',             2),
  ('missing_feature',      'חסרה לי תכונה חשובה',              'Missing a feature I need',        3),
  ('bug_or_issue',         'נתקלתי בבאגים / חוויה לא טובה',    'Bugs / poor experience',          4),
  ('switching_competitor', 'עובר למתחרה',                     'Switching to a competitor',       5),
  ('temporary_break',      'הפסקה זמנית — אחזור',              'Temporary break — will return',   6),
  ('business_change',      'שינוי במצב הפיננסי / אישי',        'Financial or personal change',    7),
  ('never_intended',       'נרשמתי בטעות / רק בשביל הטרייאל',  'Never intended to keep it',       8),
  ('unclear_value',        'לא הבנתי איך זה עוזר לי',          'Did not understand the value',    9),
  ('other',                'סיבה אחרת',                       'Other',                          99)
ON CONFLICT (id) DO UPDATE SET
  label_he   = EXCLUDED.label_he,
  label_en   = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order;

-- RLS
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Public read so cancel modal can fetch options without auth
CREATE POLICY "cancellation_reasons_public_read"
  ON public.cancellation_reasons
  FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

-- No write policy — admin manages via direct SQL / Studio.

COMMENT ON TABLE public.cancellation_reasons IS
  'Canonical list of cancellation reasons shown as radio buttons in the cancel modal. Linked to subscription_cancellation_feedback.reason_id. Added 2026-05-26.';
