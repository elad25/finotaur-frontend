-- ============================================================================
-- Journal 14-day App-Granted Trial — Phase 1: Infrastructure (2026-07-22)
-- Part of the auto-trial program: every new signup gets 14 days of full
-- Trader (journal premium) + Investor (Top Secret) access, no Whop involved
-- until payment. This file is DARK — it only extends read paths and adds
-- new inert objects. No existing behavior changes and no rows are written
-- with new trial semantics until 20260722110000_journal_trial_grant_enable.sql
-- flips the switch (handle_new_user + activate_whop_subscription + cron).
--
-- Contents:
--   1) get_user_subscription_status: +3 columns (is_in_trial, trial_ends_at,
--      trial_used). Requires DROP+CREATE because RETURNS TABLE changes shape;
--      grants are re-issued after.
--   2a) Widen profiles_top_secret_status_check to allow 'trial' (see deviation
--       note below — required for the whole program, not optional).
--   2b) get_top_secret_status: is_active also true when top_secret_status='trial'.
--   3) expire_journal_trials(): hourly sweep function (not scheduled here).
--   4) profiles_trial_expiry_idx: partial index to make the sweep's WHERE
--      clause cheap.
--   5) trial_broker_fingerprints: service-role-only table to detect the same
--      broker account being used to claim multiple journal trials.
--   6) claim_trial_broker_fingerprint(): SECURITY DEFINER helper for #5.
--
-- ----------------------------------------------------------------------------
-- DEVIATIONS from the literal spec (read CURRENT_SCHEMA.sql before writing —
-- both required to make the plan's own SQL legal, not scope creep):
--
--   D1. profiles_top_secret_status_check (CURRENT_SCHEMA.sql ~L18687) only
--       allowed ('inactive','active','cancelled') — it did NOT allow 'trial',
--       even though several existing RPCs already filter on
--       top_secret_status = 'trial' (get_top_secret_users, admin dashboard
--       aggregates, etc. — pre-existing debt). Since every file in this
--       program writes top_secret_status='trial', the constraint had to be
--       widened here (step 2a) or nothing else in the program would be
--       legal to write. This is an additive, inert change (existing rows
--       unaffected, no behavior change until 20260722110000 starts writing
--       'trial').
--   D2. The task's expire_journal_trials spec asks for
--       top_secret_status = '<expired-or-cancelled per CHECK>'. Per D1, the
--       (now-widened) legal values are inactive/active/cancelled/trial —
--       'expired' is still not legal for this column — so the sweep uses
--       'cancelled', exactly as the fallback the task specified.
--   D3. subscription_events.valid_event_type CHECK (CURRENT_SCHEMA.sql
--       ~L24196) allows 'trial_started' and 'trial_ended' but NOT
--       'trial_expired'. expire_journal_trials() therefore logs
--       event_type='trial_ended' instead of 'trial_expired'.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 1) get_user_subscription_status — add is_in_trial, trial_ends_at, trial_used
-- ============================================================================
-- DROP required: RETURNS TABLE column list is changing shape.

DROP FUNCTION IF EXISTS public.get_user_subscription_status(uuid);

CREATE FUNCTION public.get_user_subscription_status(p_user_id uuid)
RETURNS TABLE(
  account_type text,
  subscription_status text,
  subscription_interval text,
  subscription_expires_at timestamp with time zone,
  subscription_started_at timestamp with time zone,
  subscription_cancel_at_period_end boolean,
  pending_downgrade_plan text,
  cancellation_reason text,
  is_lifetime boolean,
  max_trades integer,
  current_month_trades_count integer,
  trade_count integer,
  remaining integer,
  used integer,
  plan text,
  reset_date date,
  billing_cycle_start date,
  current_month_active_days integer,
  payment_provider text,
  whop_user_id text,
  whop_membership_id text,
  whop_product_id text,
  whop_plan_id text,
  whop_customer_email text,
  initial_portfolio numeric,
  current_portfolio numeric,
  portfolio_size numeric,
  total_pnl numeric,
  risk_mode text,
  risk_percentage numeric,
  fixed_risk_amount numeric,
  role text,
  newsletter_paid boolean,
  newsletter_status text,
  newsletter_expires_at timestamp with time zone,
  top_secret_enabled boolean,
  top_secret_status text,
  top_secret_expires_at timestamp with time zone,
  platform_plan text,
  platform_subscription_status text,
  platform_billing_interval text,
  platform_subscription_started_at timestamp with time zone,
  platform_subscription_expires_at timestamp with time zone,
  platform_trial_ends_at timestamp with time zone,
  platform_is_in_trial boolean,
  platform_trial_days_remaining integer,
  platform_cancel_at_period_end boolean,
  platform_cancelled_at timestamp with time zone,
  platform_whop_membership_id text,
  platform_finotaur_trial_eligible boolean,
  platform_core_trial_eligible boolean,
  platform_bundle_journal_granted boolean,
  platform_bundle_newsletter_granted boolean,
  is_in_trial boolean,
  trial_ends_at timestamp with time zone,
  trial_used boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_platform_trial_days_remaining INTEGER;
BEGIN
  -- Calculate Platform trial days remaining
  SELECT
    CASE
      WHEN p.platform_is_in_trial AND p.platform_trial_ends_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM (p.platform_trial_ends_at - NOW()))::INTEGER)
      ELSE NULL
    END
  INTO v_platform_trial_days_remaining
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    -- Basic subscription info
    COALESCE(p.account_type, 'free')::TEXT,
    p.subscription_status::TEXT,
    p.subscription_interval::TEXT,
    p.subscription_expires_at,
    p.subscription_started_at,
    COALESCE(p.subscription_cancel_at_period_end, FALSE),
    p.pending_downgrade_plan::TEXT,
    p.cancellation_reason::TEXT,
    COALESCE(p.is_lifetime, FALSE),

    -- Trade limits (v8.5.0: FREE=15 lifetime)
    COALESCE(p.max_trades, 15),
    COALESCE(p.current_month_trades_count, 0),
    COALESCE(p.trade_count, 0),

    -- Computed trade fields (v8.5.0: default 15 for FREE tier)
    GREATEST(0, COALESCE(p.max_trades, 15) - COALESCE(p.current_month_trades_count, 0))::INTEGER,
    COALESCE(p.current_month_trades_count, 0)::INTEGER,
    COALESCE(p.account_type, 'free')::TEXT,
    (COALESCE(p.billing_cycle_start, DATE_TRUNC('month', NOW())::DATE) + INTERVAL '1 month')::DATE,

    -- Billing
    COALESCE(p.billing_cycle_start, DATE_TRUNC('month', NOW())::DATE),
    COALESCE(p.current_month_active_days, 0),

    -- Payment provider
    p.payment_provider::TEXT,

    -- Whop identifiers (Journal)
    p.whop_user_id::TEXT,
    p.whop_membership_id::TEXT,
    p.whop_product_id::TEXT,
    p.whop_plan_id::TEXT,
    p.whop_customer_email::TEXT,

    -- Portfolio & Risk
    COALESCE(p.initial_portfolio, 10000)::NUMERIC,
    COALESCE(p.current_portfolio, 10000)::NUMERIC,
    COALESCE(p.portfolio_size, 10000)::NUMERIC,
    COALESCE(p.total_pnl, 0)::NUMERIC,
    COALESCE(p.risk_mode, 'percentage')::TEXT,
    COALESCE(p.risk_percentage, 1.0)::NUMERIC,
    p.fixed_risk_amount::NUMERIC,

    -- User role
    COALESCE(p.role, 'user')::TEXT,

    -- Newsletter
    COALESCE(p.newsletter_paid, FALSE),
    COALESCE(p.newsletter_status, 'inactive')::TEXT,
    p.newsletter_expires_at,

    -- Top Secret
    COALESCE(p.top_secret_enabled, FALSE),
    COALESCE(p.top_secret_status, 'inactive')::TEXT,
    p.top_secret_expires_at,

    -- ═══════════════════════════════════════════
    -- 🔥 PLATFORM FIELDS
    -- ═══════════════════════════════════════════
    COALESCE(p.platform_plan, 'free')::TEXT,
    COALESCE(p.platform_subscription_status, 'inactive')::TEXT,
    p.platform_billing_interval::TEXT,
    p.platform_subscription_started_at,
    p.platform_subscription_expires_at,
    p.platform_trial_ends_at,
    COALESCE(p.platform_is_in_trial, FALSE),
    v_platform_trial_days_remaining,
    COALESCE(p.platform_cancel_at_period_end, FALSE),
    p.platform_cancelled_at,
    p.platform_whop_membership_id::TEXT,

    -- Trial eligibility (NULL = eligible, NOT NULL = already used)
    (p.platform_finotaur_trial_used_at IS NULL),
    (p.platform_core_trial_used_at IS NULL),

    -- Bundle status
    COALESCE(p.platform_bundle_journal_granted, FALSE),
    COALESCE(p.platform_bundle_newsletter_granted, FALSE),

    -- ═══════════════════════════════════════════
    -- 🆕 JOURNAL AUTO-TRIAL FIELDS (2026-07-22)
    -- ═══════════════════════════════════════════
    COALESCE(p.is_in_trial, FALSE),
    p.trial_ends_at,
    COALESCE(p.trial_used, FALSE)

  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$;

ALTER FUNCTION public.get_user_subscription_status(uuid) OWNER TO postgres;

-- Re-issue grants (dropped along with the function)
GRANT ALL ON FUNCTION public.get_user_subscription_status(uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_subscription_status(uuid) TO service_role;


-- ============================================================================
-- 2a) Widen profiles_top_secret_status_check to allow 'trial' — see D1 above.
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_top_secret_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_top_secret_status_check
  CHECK (top_secret_status IS NULL OR top_secret_status IN ('inactive', 'active', 'cancelled', 'trial'));


-- ============================================================================
-- 2b) get_top_secret_status — is_active also true while status='trial'
-- ============================================================================
-- Same signature/return shape as before → CREATE OR REPLACE is legal, no DROP.

CREATE OR REPLACE FUNCTION public.get_top_secret_status(p_user_id uuid)
RETURNS TABLE(
  top_secret_enabled boolean,
  top_secret_status text,
  top_secret_whop_membership_id text,
  top_secret_started_at timestamp with time zone,
  top_secret_expires_at timestamp with time zone,
  top_secret_interval text,
  top_secret_cancel_at_period_end boolean,
  days_until_expiry integer,
  is_active boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.top_secret_enabled, FALSE),
    COALESCE(p.top_secret_status, 'inactive'),
    p.top_secret_whop_membership_id,
    p.top_secret_started_at,
    p.top_secret_expires_at,
    p.top_secret_interval,
    COALESCE(p.top_secret_cancel_at_period_end, FALSE),
    CASE
      WHEN p.top_secret_expires_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM p.top_secret_expires_at - NOW())::INTEGER)
      ELSE NULL
    END,
    COALESCE(p.top_secret_enabled, FALSE) = TRUE
      AND COALESCE(p.top_secret_status, 'inactive') IN ('active', 'trial')
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$;

ALTER FUNCTION public.get_top_secret_status(uuid) OWNER TO postgres;


-- ============================================================================
-- 3) expire_journal_trials() — hourly sweep (scheduling happens in the next
--    migration file, 20260722110000_journal_trial_grant_enable.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_journal_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clause1_count integer := 0;
  v_clause2_count integer := 0;
BEGIN
  -- Clause 1: journal trial has expired and was never converted to a paid
  -- Whop subscription (whop_membership_id IS NULL) → fall back to free.
  -- Also unwinds any opportunistic Top Secret trial that rode along with the
  -- journal trial, unless the user has since paid for Top Secret separately.
  WITH expired AS (
    UPDATE public.profiles
    SET
      account_type = 'free',
      is_in_trial = false,
      subscription_status = 'expired',
      max_trades = 10,
      top_secret_enabled = CASE
        WHEN top_secret_status = 'trial' AND top_secret_whop_membership_id IS NULL THEN false
        ELSE top_secret_enabled
      END,
      -- 'cancelled' per D2 above — 'expired' is not a legal value for this column.
      top_secret_status = CASE
        WHEN top_secret_status = 'trial' AND top_secret_whop_membership_id IS NULL THEN 'cancelled'
        ELSE top_secret_status
      END,
      newsletter_status = CASE
        WHEN newsletter_status = 'trial'
             AND top_secret_status = 'trial'
             AND top_secret_whop_membership_id IS NULL
        THEN NULL
        ELSE newsletter_status
      END,
      updated_at = NOW()
    WHERE account_type = 'trial'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < NOW()
      AND whop_membership_id IS NULL
    RETURNING id
  )
  INSERT INTO public.subscription_events (user_id, event_type, old_plan, new_plan, metadata)
  SELECT id, 'trial_ended', 'trial', 'free', jsonb_build_object('source', 'expire_journal_trials')
  FROM expired;

  GET DIAGNOSTICS v_clause1_count = ROW_COUNT;

  -- Clause 2: user already converted to a paid Trader plan (account_type <>
  -- 'trial') but their opportunistic Top Secret trial window (independent of
  -- the journal trial) has now expired without a Top Secret payment.
  UPDATE public.profiles
  SET
    top_secret_enabled = false,
    -- 'cancelled' (not 'expired') per D2. Also prevents this row from
    -- matching clause 2 again on every hourly sweep (updated_at churn).
    top_secret_status = 'cancelled',
    newsletter_status = CASE WHEN newsletter_status = 'trial' THEN NULL ELSE newsletter_status END,
    updated_at = NOW()
  WHERE account_type <> 'trial'
    AND top_secret_status = 'trial'
    AND top_secret_whop_membership_id IS NULL
    AND top_secret_expires_at IS NOT NULL
    AND top_secret_expires_at < NOW();

  GET DIAGNOSTICS v_clause2_count = ROW_COUNT;

  RETURN v_clause1_count + v_clause2_count;
END;
$$;

ALTER FUNCTION public.expire_journal_trials() OWNER TO postgres;

COMMENT ON FUNCTION public.expire_journal_trials() IS
  'Hourly sweep: falls journal-trial users whose trial_ends_at has passed back to free (and unwinds any rider Top Secret trial), and separately clears a lingering Top Secret trial for users who already converted to paid Trader. Returns total rows affected. Scheduled via pg_cron in 20260722110000_journal_trial_grant_enable.sql.';


-- ============================================================================
-- 4) Partial index to keep the sweep's WHERE clause cheap
-- ============================================================================

CREATE INDEX IF NOT EXISTS profiles_trial_expiry_idx
  ON public.profiles (trial_ends_at)
  WHERE account_type = 'trial';


-- ============================================================================
-- 5) trial_broker_fingerprints — service-role-only, detects the same broker
--    account being used to farm multiple journal trials
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trial_broker_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_kind text NOT NULL,
  fingerprint text NOT NULL,
  first_trial_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (broker_kind, fingerprint)
);

ALTER TABLE public.trial_broker_fingerprints ENABLE ROW LEVEL SECURITY;

-- No policies are defined on purpose: with RLS enabled and zero policies,
-- anon/authenticated get zero rows even before the REVOKE below. The REVOKE
-- is defense-in-depth against any future table-level GRANT to those roles.
REVOKE ALL ON public.trial_broker_fingerprints FROM anon, authenticated;

COMMENT ON TABLE public.trial_broker_fingerprints IS
  'Service-role-only. Maps (broker_kind, fingerprint) -> the first trial user who connected that broker account, so claim_trial_broker_fingerprint() can flag repeat trial abuse via the same broker account.';


-- ============================================================================
-- 6) claim_trial_broker_fingerprint() — SECURITY DEFINER helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_trial_broker_fingerprint(
  p_user_id uuid,
  p_broker_kind text,
  p_fingerprint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_type text;
  v_first_trial_user_id uuid;
BEGIN
  SELECT account_type INTO v_account_type
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_account_type IS DISTINCT FROM 'trial' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'not_trial');
  END IF;

  INSERT INTO public.trial_broker_fingerprints (broker_kind, fingerprint, first_trial_user_id)
  VALUES (p_broker_kind, p_fingerprint, p_user_id)
  ON CONFLICT (broker_kind, fingerprint) DO NOTHING;

  SELECT first_trial_user_id INTO v_first_trial_user_id
  FROM public.trial_broker_fingerprints
  WHERE broker_kind = p_broker_kind AND fingerprint = p_fingerprint;

  IF v_first_trial_user_id = p_user_id THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'ok');
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'claimed_by_other_trial');
  END IF;
END;
$$;

ALTER FUNCTION public.claim_trial_broker_fingerprint(uuid, text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_trial_broker_fingerprint(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_broker_fingerprint(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.claim_trial_broker_fingerprint(uuid, text, text) IS
  'Service-role only. Called when a trial user connects a broker account; returns allowed=false if that (broker_kind, fingerprint) pair was already claimed by a different trial user, so callers can flag/limit trial-farming.';
