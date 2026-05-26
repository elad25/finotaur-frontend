-- ============================================================================
-- Migration: lifecycle_06_extend_cancellation_feedback
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Add 4 new columns to subscription_cancellation_feedback to capture
--          the richer signal Elad wants for the Weekly Claude Report:
--          - would_have_stayed_text (free text: "what would have kept you?")
--          - nps_score (0-10, how likely to recommend us anyway?)
--          - source_action (how did this cancel happen)
--          - competitor_name (optional, when reason=switching_competitor)
--
-- Why: The existing reason_id + reason_label + feedback_text combo loses two
--      important signals:
--      (1) the COUNTERFACTUAL — what change would have prevented churn
--      (2) the DESTINATION — for "switching competitor", which one
--      Plus NPS gives us a sentiment baseline even from churned users.
--
-- Also: source_action distinguishes user-initiated cancels (the high-quality
--       feedback) from passive expirations (zero feedback, just timestamp).
--
-- Rollback (manual):
--   ALTER TABLE public.subscription_cancellation_feedback
--     DROP COLUMN IF EXISTS would_have_stayed_text,
--     DROP COLUMN IF EXISTS nps_score,
--     DROP COLUMN IF EXISTS source_action,
--     DROP COLUMN IF EXISTS competitor_name;
-- ============================================================================

ALTER TABLE public.subscription_cancellation_feedback
  ADD COLUMN IF NOT EXISTS would_have_stayed_text TEXT,
  ADD COLUMN IF NOT EXISTS nps_score             SMALLINT,
  ADD COLUMN IF NOT EXISTS source_action         TEXT,
  ADD COLUMN IF NOT EXISTS competitor_name       TEXT;

-- NPS scale validation: 0-10 per standard NPS methodology
ALTER TABLE public.subscription_cancellation_feedback
  DROP CONSTRAINT IF EXISTS subscription_cancellation_feedback_nps_score_check;

ALTER TABLE public.subscription_cancellation_feedback
  ADD CONSTRAINT subscription_cancellation_feedback_nps_score_check
  CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10));

-- source_action validation
ALTER TABLE public.subscription_cancellation_feedback
  DROP CONSTRAINT IF EXISTS subscription_cancellation_feedback_source_action_check;

ALTER TABLE public.subscription_cancellation_feedback
  ADD CONSTRAINT subscription_cancellation_feedback_source_action_check
  CHECK (source_action IS NULL OR source_action IN (
    'user_initiated_in_app',     -- User clicked Cancel in our settings page
    'admin_initiated',           -- Admin cancelled on user's behalf (refund, abuse, etc.)
    'whop_direct',               -- User cancelled directly on Whop dashboard
    'auto_expire',               -- Subscription naturally expired (no renewal)
    'payment_failed_terminal',   -- Dunning sequence ended without recovery
    'account_deletion'           -- User invoked delete-account → implicit cancel
  ));

CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_source_action
  ON public.subscription_cancellation_feedback (source_action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_nps
  ON public.subscription_cancellation_feedback (nps_score)
  WHERE nps_score IS NOT NULL;

COMMENT ON COLUMN public.subscription_cancellation_feedback.would_have_stayed_text IS
  'Free-text answer to "What would have kept you?" — highest-quality churn signal for Weekly Claude Report trend extraction.';

COMMENT ON COLUMN public.subscription_cancellation_feedback.nps_score IS
  '0-10 NPS-style score: "How likely are you to recommend Finotaur despite cancelling?" — detractors vs passives vs promoters.';

COMMENT ON COLUMN public.subscription_cancellation_feedback.source_action IS
  'How this cancel was initiated. user_initiated_in_app = rich feedback expected; auto_expire = no feedback, timestamp only.';

COMMENT ON COLUMN public.subscription_cancellation_feedback.competitor_name IS
  'Optional. Populated when reason_id=switching_competitor — name of the competitor user is moving to.';
