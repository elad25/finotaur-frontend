-- ============================================================================
-- Journal 14-day App-Granted Trial — Phase 3: One-time Backfill (2026-07-22)
-- Grants the 14-day trial to existing FREE users who never used a trial,
-- never paid via Whop, aren't lifetime/admin/banned/already-bundle-granted.
-- Runs ONCE. Safe to re-run (idempotent): the WHERE clause excludes anyone
-- already touched (trial_used=true after the first run).
--
-- Guard columns verified present in CURRENT_SCHEMA.sql before writing this
-- file (no adaptation needed — all 4 exist exactly as named in the spec):
--   - is_lifetime (boolean, ~L18573)
--   - role (text, ~L18492, CHECK IN ('user','admin','super_admin'))
--   - is_banned (boolean, ~L18495)
--   - platform_bundle_journal_granted (boolean, ~L18600)
--
-- event_type='trial_started' is a legal subscription_events.valid_event_type
-- value (CURRENT_SCHEMA.sql ~L24196) — no adaptation needed there either.
-- ============================================================================

WITH backfilled AS (
  UPDATE public.profiles
  SET
    account_type = 'trial',
    subscription_status = 'trial',
    is_in_trial = true,
    trial_ends_at = NOW() + interval '14 days',
    trial_used = true,
    max_trades = 999999,
    top_secret_enabled = CASE
      WHEN top_secret_whop_membership_id IS NULL AND COALESCE(top_secret_status, '') <> 'active'
      THEN true
      ELSE top_secret_enabled
    END,
    top_secret_status = CASE
      WHEN top_secret_whop_membership_id IS NULL AND COALESCE(top_secret_status, '') <> 'active'
      THEN 'trial'
      ELSE top_secret_status
    END,
    top_secret_started_at = CASE
      WHEN top_secret_whop_membership_id IS NULL AND COALESCE(top_secret_status, '') <> 'active'
      THEN NOW()
      ELSE top_secret_started_at
    END,
    top_secret_expires_at = CASE
      WHEN top_secret_whop_membership_id IS NULL AND COALESCE(top_secret_status, '') <> 'active'
      THEN NOW() + interval '14 days'
      ELSE top_secret_expires_at
    END,
    newsletter_status = CASE
      WHEN newsletter_status IS NULL OR newsletter_status NOT IN ('active', 'trialing')
      THEN 'trial'
      ELSE newsletter_status
    END,
    updated_at = NOW()
  WHERE (account_type = 'free' OR account_type IS NULL)
    AND COALESCE(trial_used, false) = false
    AND whop_membership_id IS NULL
    AND COALESCE(is_lifetime, false) = false
    AND role = 'user'
    AND COALESCE(is_banned, false) = false
    AND COALESCE(platform_bundle_journal_granted, false) = false
  RETURNING id
)
INSERT INTO public.subscription_events (user_id, event_type, old_plan, new_plan, metadata)
SELECT id, 'trial_started', 'free', 'trial', jsonb_build_object('source', 'backfill_20260721')
FROM backfilled;
