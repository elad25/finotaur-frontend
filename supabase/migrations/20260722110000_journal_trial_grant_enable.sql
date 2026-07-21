-- ============================================================================
-- Journal 14-day App-Granted Trial — Phase 2: Grant + Enable (2026-07-22)
-- This is the switch: every NEW signup from this point on is granted a
-- 14-day trial with full Trader (journal premium) + Investor (Top Secret)
-- access, no Whop involved. It relies on the infra shipped in
-- 20260722100000_journal_trial_infra.sql (widened CHECK, expire_journal_trials()).
--
-- Contents:
--   1) handle_new_user() v2 — new signups get account_type='trial' + full
--      access instead of account_type='free'.
--   2) activate_whop_subscription() — patched so a real Whop purchase clears
--      is_in_trial/trial_used, since the user is no longer "in trial", they
--      are a paying customer. (handle_whop_payment() does NOT touch any
--      profiles/journal columns at all — it only manages affiliate
--      commissions — so it needs no patch; see deviation note below.)
--   3) pg_cron schedule for expire_journal_trials(), hourly at :07.
--
-- ----------------------------------------------------------------------------
-- DEVIATION: handle_whop_payment(p_whop_membership_id, p_payment_amount,
-- p_is_first_payment, p_promo_code) was checked in full
-- (CURRENT_SCHEMA.sql ~L12780-12932) per the task's instruction to verify
-- whether it updates journal columns. It does not — its entire body only
-- reads profiles (to resolve v_user_id/v_subscription_type) and writes to
-- affiliate_referrals / affiliate_commissions / affiliates /
-- affiliate_activity_log. It never UPDATEs public.profiles. No patch applied.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 1) handle_new_user() v2 — grant the trial on signup
-- ============================================================================
-- Same signature/trigger return type (TRIGGER) as before → CREATE OR REPLACE
-- is legal, no DROP needed. EXCEPTION guard preserved verbatim (never block
-- signup on failure — see 2026-05-01_handle_new_user_trigger.sql).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, account_type,
    subscription_status, is_in_trial, trial_ends_at, trial_used, max_trades,
    top_secret_enabled, top_secret_status, top_secret_started_at, top_secret_expires_at,
    newsletter_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
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
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates profiles row on auth.users INSERT. Grants a 14-day app trial (account_type=trial, full Trader + Top Secret access, trial_ends_at=NOW()+14d). Other fields filled by chained triggers on profiles. Never blocks signup on failure. (Was: account_type=free minimal row, until 2026-07-22 journal auto-trial program.)';


-- ============================================================================
-- 2) activate_whop_subscription() — clear trial flags on real payment
-- ============================================================================
-- Full body reproduced from CURRENT_SCHEMA.sql (~L1026-1326) identical
-- except for the two added lines in STEP 4's UPDATE (is_in_trial, trial_used).

CREATE OR REPLACE FUNCTION public.activate_whop_subscription(
  p_user_email text,
  p_whop_user_id text,
  p_whop_membership_id text,
  p_whop_product_id text,
  p_finotaur_user_id text DEFAULT NULL::text,
  p_affiliate_code text DEFAULT NULL::text,
  p_click_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_plan_info RECORD;
  v_subscription_ends_at TIMESTAMPTZ;
  v_max_trades INTEGER;
  v_affiliate_id UUID;
  v_referral_id UUID;
  v_retry_count INTEGER := 0;
  v_lookup_method TEXT := 'none';
  v_old_plan TEXT;
BEGIN
  -- ========================================
  -- STEP 1: Find User (MULTIPLE METHODS)
  -- Priority: finotaur_user_id → email → whop_customer_email → membership_id → retry
  -- ========================================

  -- Method 1: Try finotaur_user_id from metadata (BEST - user logged in during checkout)
  IF p_finotaur_user_id IS NOT NULL AND p_finotaur_user_id != '' THEN
    BEGIN
      SELECT id INTO v_user_id
      FROM profiles
      WHERE id = p_finotaur_user_id::UUID;

      IF v_user_id IS NOT NULL THEN
        v_lookup_method := 'finotaur_user_id';
        RAISE NOTICE '✅ Found user by finotaur_user_id: %', v_user_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Invalid finotaur_user_id format: %', p_finotaur_user_id;
    END;
  END IF;

  -- Method 2: Try exact email match (user registered with same email)
  IF v_user_id IS NULL AND p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE LOWER(email) = LOWER(p_user_email);

    IF v_user_id IS NOT NULL THEN
      v_lookup_method := 'email_exact';
      RAISE NOTICE '✅ Found user by email: %', v_user_id;
    END IF;
  END IF;

  -- Method 3: Try whop_customer_email (returning customer with different Whop email)
  IF v_user_id IS NULL AND p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE LOWER(whop_customer_email) = LOWER(p_user_email);

    IF v_user_id IS NOT NULL THEN
      v_lookup_method := 'whop_customer_email';
      RAISE NOTICE '✅ Found user by whop_customer_email: %', v_user_id;
    END IF;
  END IF;

  -- Method 4: Try membership_id (renewal/reactivation of existing subscription)
  IF v_user_id IS NULL AND p_whop_membership_id IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE whop_membership_id = p_whop_membership_id;

    IF v_user_id IS NOT NULL THEN
      v_lookup_method := 'whop_membership_id';
      RAISE NOTICE '✅ Found user by membership_id: %', v_user_id;
    END IF;
  END IF;

  -- Method 5: Retry with delay (race condition - user might be registering right now)
  IF v_user_id IS NULL AND p_user_email IS NOT NULL AND p_user_email != '' THEN
    LOOP
      EXIT WHEN v_retry_count >= 3;  -- Max 3 retries = 6 seconds total

      v_retry_count := v_retry_count + 1;
      RAISE NOTICE '⏳ User not found, retry % of 3 in 2 seconds...', v_retry_count;
      PERFORM pg_sleep(2);

      -- Try all methods again after delay
      SELECT id INTO v_user_id
      FROM profiles
      WHERE LOWER(email) = LOWER(p_user_email)
         OR LOWER(whop_customer_email) = LOWER(p_user_email);

      EXIT WHEN v_user_id IS NOT NULL;
    END LOOP;

    IF v_user_id IS NOT NULL THEN
      v_lookup_method := 'email_retry_' || v_retry_count;
      RAISE NOTICE '✅ Found user after % retries: %', v_retry_count, v_user_id;
    END IF;
  END IF;

  -- ========================================
  -- STEP 2: User NOT found = Return Error
  -- (Cannot auto-create due to FK constraint to auth.users)
  -- ========================================

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found. User must register on Finotaur before purchasing.',
      'error_code', 'USER_NOT_FOUND',
      'lookup_attempted', jsonb_build_object(
        'finotaur_user_id', p_finotaur_user_id,
        'email', p_user_email,
        'membership_id', p_whop_membership_id
      ),
      'retries', v_retry_count,
      'suggestion', 'Ensure checkout URL includes finotaur_user_id in metadata, or user registers with same email before purchase'
    );
  END IF;

  -- ========================================
  -- STEP 3: Get Plan Info from Mapping
  -- ========================================

  SELECT * INTO v_plan_info
  FROM whop_plan_mapping
  WHERE whop_product_id = p_whop_product_id AND is_active = TRUE;

  IF v_plan_info IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unknown Whop product ID: ' || p_whop_product_id,
      'error_code', 'UNKNOWN_PRODUCT',
      'user_id', v_user_id,
      'lookup_method', v_lookup_method
    );
  END IF;

  -- Calculate subscription end date
  v_subscription_ends_at := CASE
    WHEN COALESCE(v_plan_info.trial_days, 0) > 0 THEN NOW() + (v_plan_info.trial_days || ' days')::INTERVAL
    WHEN v_plan_info.billing_interval = 'monthly' THEN NOW() + INTERVAL '1 month'
    ELSE NOW() + INTERVAL '1 year'
  END;

  -- Calculate max trades (-1 means unlimited)
  v_max_trades := CASE
    WHEN v_plan_info.max_trades = -1 THEN 999999
    ELSE v_plan_info.max_trades
  END;

  -- Get old plan for logging
  SELECT account_type INTO v_old_plan FROM profiles WHERE id = v_user_id;

  -- ========================================
  -- STEP 4: Update User Profile
  -- ========================================

  UPDATE profiles SET
    -- Subscription info
    account_type = v_plan_info.finotaur_plan,
    subscription_status = 'active',
    subscription_interval = v_plan_info.billing_interval,
    subscription_started_at = COALESCE(subscription_started_at, NOW()),
    subscription_expires_at = v_subscription_ends_at,
    subscription_cancel_at_period_end = FALSE,
    pending_downgrade_plan = NULL,
    cancellation_reason = NULL,
    -- Whop identifiers
    whop_user_id = p_whop_user_id,
    whop_membership_id = p_whop_membership_id,
    whop_product_id = p_whop_product_id,
    whop_customer_email = p_user_email,
    -- Payment info
    payment_provider = 'whop',
    -- Trade limits
    max_trades = v_max_trades,
    current_month_trades_count = 0,
    billing_cycle_start = CURRENT_DATE,
    -- Journal auto-trial reconciliation (2026-07-22): a real Whop purchase
    -- ends the app-granted trial state, regardless of which trial state the
    -- user was in.
    is_in_trial = FALSE,
    trial_used = TRUE,
    -- Timestamp
    updated_at = NOW()
  WHERE id = v_user_id;

  -- ========================================
  -- STEP 5: Log Subscription Event
  -- ========================================

  INSERT INTO subscription_events (
    user_id, event_type, old_plan, new_plan, metadata
  ) VALUES (
    v_user_id,
    'payment_succeeded',
    COALESCE(v_old_plan, 'free'),
    v_plan_info.finotaur_plan,
    jsonb_build_object(
      'whop_membership_id', p_whop_membership_id,
      'whop_product_id', p_whop_product_id,
      'whop_user_id', p_whop_user_id,
      'lookup_method', v_lookup_method,
      'retries_needed', v_retry_count,
      'finotaur_user_id_provided', p_finotaur_user_id IS NOT NULL,
      'price_usd', v_plan_info.price_usd
    )
  );

  -- ========================================
  -- STEP 6: Process Affiliate if Provided
  -- ========================================

  IF p_affiliate_code IS NOT NULL AND p_affiliate_code != '' THEN
    -- Find affiliate by code or coupon
    SELECT id INTO v_affiliate_id FROM affiliates
    WHERE (UPPER(affiliate_code) = UPPER(p_affiliate_code) OR UPPER(coupon_code) = UPPER(p_affiliate_code))
      AND status = 'active';

    IF v_affiliate_id IS NOT NULL THEN
      -- Check for existing referral
      SELECT id INTO v_referral_id FROM affiliate_referrals WHERE referred_user_id = v_user_id;

      IF v_referral_id IS NOT NULL THEN
        -- Update existing referral
        UPDATE affiliate_referrals SET
          whop_membership_id = p_whop_membership_id,
          whop_user_id = p_whop_user_id,
          whop_product_id = p_whop_product_id,
          subscription_plan = v_plan_info.finotaur_plan,
          subscription_type = v_plan_info.billing_interval,
          subscription_price_usd = v_plan_info.price_usd,
          subscription_started_at = NOW(),
          coupon_code_used = p_affiliate_code,
          updated_at = NOW()
        WHERE id = v_referral_id;
      ELSE
        -- Create new referral
        INSERT INTO affiliate_referrals (
          affiliate_id, referred_user_id, referred_user_email, click_id,
          signup_date, signup_plan, coupon_code_used,
          whop_membership_id, whop_user_id, whop_product_id,
          subscription_plan, subscription_type, subscription_price_usd,
          subscription_started_at, status, commission_eligible
        ) VALUES (
          v_affiliate_id, v_user_id, p_user_email, p_click_id,
          NOW(), v_plan_info.finotaur_plan, p_affiliate_code,
          p_whop_membership_id, p_whop_user_id, p_whop_product_id,
          v_plan_info.finotaur_plan, v_plan_info.billing_interval, v_plan_info.price_usd,
          NOW(), 'pending', TRUE
        )
        RETURNING id INTO v_referral_id;

        -- Update affiliate stats
        UPDATE affiliates SET
          total_signups = COALESCE(total_signups, 0) + 1,
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE id = v_affiliate_id;

        -- Log activity
        INSERT INTO affiliate_activity_log (affiliate_id, activity_type, description, metadata, is_system_action)
        VALUES (v_affiliate_id, 'new_signup',
          'New signup via Whop: ' || p_user_email || ' (' || v_plan_info.finotaur_plan || ')',
          jsonb_build_object(
            'user_email', p_user_email,
            'plan', v_plan_info.finotaur_plan,
            'interval', v_plan_info.billing_interval,
            'price_usd', v_plan_info.price_usd,
            'coupon_code', p_affiliate_code
          ),
          TRUE
        );
      END IF;
    END IF;
  END IF;

  -- ========================================
  -- STEP 7: Return Success Result
  -- ========================================

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'plan', v_plan_info.finotaur_plan,
    'interval', v_plan_info.billing_interval,
    'price_usd', v_plan_info.price_usd,
    'expires_at', v_subscription_ends_at,
    'max_trades', v_max_trades,
    'lookup_method', v_lookup_method,
    'retries_needed', v_retry_count,
    'affiliate_id', v_affiliate_id,
    'referral_id', v_referral_id,
    'old_plan', v_old_plan
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE,
    'email', p_user_email,
    'finotaur_user_id', p_finotaur_user_id,
    'lookup_method', v_lookup_method,
    'retries', v_retry_count
  );
END;
$$;

ALTER FUNCTION public.activate_whop_subscription(text, text, text, text, text, text, uuid) OWNER TO postgres;


-- ============================================================================
-- 3) Schedule the hourly sweep (idempotent unschedule-then-schedule)
-- ============================================================================

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
