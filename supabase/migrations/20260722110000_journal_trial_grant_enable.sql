-- ============================================================================
-- Journal 14-day App-Granted Trial — Phase 2: Grant + Enable (2026-07-22)
-- THE SWITCH: every new signup from here gets a 14-day trial with full Trader
-- (journal premium) + Investor (Top Secret) access, no Whop involved.
--
-- RECONCILED 2026-07-22 to match what was actually applied to production via
-- Supabase MCP (migration name: journal_trial_grant_enable):
--   * handle_new_user() is rebuilt from the LIVE production definition, which
--     already resolved first_name/last_name/given_name/family_name and set the
--     first_name/last_name columns + a rich display_name COALESCE chain. The
--     earlier draft of this file was based on the stale 2026-05-01 version and
--     would have REGRESSED name population — do NOT restore it.
--   * The activate_whop_subscription() replacement was DELIBERATELY DROPPED.
--     Leaving is_in_trial stale on a paid account is harmless: every gate keys
--     on account_type (a paid user is 'premium'/'basic', never 'trial'), and
--     the expiry sweep excludes whop_membership_id IS NOT NULL. Replacing the
--     live ~11k-char revenue function from a possibly-stale schema dump was not
--     worth the divergence risk. If a cosmetic cleanup of the stale flag is ever
--     wanted, patch the LIVE definition in place (inject is_in_trial=FALSE,
--     trial_used=TRUE into STEP 4), never CREATE OR REPLACE from a dump.
-- Relies on 20260722100000_journal_trial_infra.sql (widened top_secret CHECK,
-- expire_journal_trials()). Idempotent: safe to replay.
-- ============================================================================

-- 1) handle_new_user() v2 — grant the trial on signup (built on the LIVE body)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first text := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name'
  );
  v_last text := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name'
  );
  v_display text := COALESCE(
    NULLIF(trim(concat_ws(' ', v_first, v_last)), ''),
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, first_name, last_name,
    account_type, subscription_status, is_in_trial, trial_ends_at, trial_used, max_trades,
    top_secret_enabled, top_secret_status, top_secret_started_at, top_secret_expires_at,
    newsletter_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_display,
    v_first,
    v_last,
    'trial',
    'trial',
    true,
    NOW() + interval '14 days',
    true,
    999999,
    true,
    'trial',
    NOW(),
    NOW() + interval '14 days',
    'trial'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for auth.users.id=%: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;  -- never block signup
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates profiles row on auth.users INSERT. Grants a 14-day app trial (account_type=trial, full Trader + Top Secret access, trial_ends_at=NOW()+14d). Preserves first_name/last_name/display_name resolution from the pre-2026-07-22 live version. Never blocks signup on failure.';

-- 2) Schedule the hourly sweep (idempotent unschedule-then-schedule)
DO $$
BEGIN
  PERFORM cron.unschedule('journal-trial-expiry');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'journal-trial-expiry',
  '7 * * * *',
  $$SELECT public.expire_journal_trials();$$
);
