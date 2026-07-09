-- ============================================================================
-- FREE Tier Lockdown — 10-trade lifetime cap (2026-07-09)
-- 1) get_trade_limit: free 15 -> 10
-- 2) can_create_trade: free lifetime check 15 -> 10
-- 3) NEW enforce_free_trade_cap BEFORE INSERT trigger on trades:
--    hard DB-level enforcement (previously client-only). Raises 42501,
--    which the frontend (New.tsx) already maps to the upgrade modal.
-- Applied to prod via Supabase MCP apply_migration after explicit approval.
-- ============================================================================

-- 1) get_trade_limit ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trade_limit(p_account_type text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN CASE LOWER(COALESCE(p_account_type, 'free'))
    WHEN 'free' THEN 10
    WHEN 'basic' THEN 25
    WHEN 'premium' THEN 999999
    WHEN 'admin' THEN 999999
    WHEN 'vip' THEN 999999
    WHEN 'beta' THEN 999999
    ELSE 10  -- Default = free (10 lifetime)
  END;
END;
$function$;

-- 2) can_create_trade: only the free-branch literal changes (15 -> 10) ------
-- Full body re-stated identical to live prod definition except the free cap.
CREATE OR REPLACE FUNCTION public.can_create_trade(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type         TEXT;
  v_role                 TEXT;
  v_subscription_status  TEXT;
  v_is_in_trial          BOOLEAN;
  v_trial_ends_at        TIMESTAMPTZ;
  v_subscription_expires TIMESTAMPTZ;
  v_max_trades           INTEGER;
  v_monthly_count        INTEGER;
  v_lifetime_trades      BIGINT;
  v_platform_plan        TEXT := NULL;
  v_platform_status      TEXT := NULL;
  v_has_platform_cols    BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'platform_plan'
  ) INTO v_has_platform_cols;

  SELECT
    account_type, role, subscription_status,
    is_in_trial, trial_ends_at, subscription_expires_at,
    max_trades, current_month_trades_count
  INTO
    v_account_type, v_role, v_subscription_status,
    v_is_in_trial, v_trial_ends_at, v_subscription_expires,
    v_max_trades, v_monthly_count
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_lifetime_trades
  FROM public.trades
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  IF v_has_platform_cols THEN
    EXECUTE format(
      'SELECT platform_plan, platform_subscription_status FROM public.profiles WHERE id = %L',
      p_user_id
    ) INTO v_platform_plan, v_platform_status;
  END IF;

  -- Admins = unlimited
  IF v_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Premium/VIP/Beta/Admin/Trial = unlimited
  IF v_account_type IN ('premium', 'admin', 'vip', 'beta', 'trial') THEN
    RETURN TRUE;
  END IF;

  -- Platform Finotaur/Enterprise = unlimited
  IF v_platform_plan IN ('finotaur', 'platform_finotaur', 'enterprise', 'platform_enterprise')
     AND v_platform_status IN ('active', 'trial', 'trialing') THEN
    RETURN TRUE;
  END IF;

  -- Platform Core = 50/month
  IF v_platform_plan IN ('core', 'platform_core')
     AND v_platform_status IN ('active', 'trial', 'trialing') THEN
    RETURN COALESCE(v_monthly_count, 0) < 50;
  END IF;

  -- Free / platform_free / NULL = 10 lifetime
  IF v_account_type IN ('free', 'platform_free') OR v_account_type IS NULL THEN
    RETURN COALESCE(v_lifetime_trades, 0) < 10;
  END IF;

  -- Basic
  IF v_account_type = 'basic' THEN
    IF (v_subscription_status = 'trial' OR COALESCE(v_is_in_trial, FALSE))
       AND v_trial_ends_at IS NOT NULL
       AND v_trial_ends_at < NOW() THEN
      RETURN FALSE;
    END IF;
    IF v_subscription_status = 'expired' THEN
      RETURN FALSE;
    END IF;
    IF v_subscription_status = 'cancelled'
       AND (v_subscription_expires IS NULL
            OR v_subscription_expires < NOW()) THEN
      RETURN FALSE;
    END IF;
    RETURN COALESCE(v_monthly_count, 0) < COALESCE(v_max_trades, 25);
  END IF;

  RETURN FALSE;
END;
$function$;

-- 3) Hard DB enforcement: BEFORE INSERT trigger ------------------------------
-- Only blocks owners whose account_type is free/platform_free/NULL and who
-- already have >= 10 live (non-deleted) trades. Admin roles bypass.
-- ERRCODE 42501 (insufficient_privilege) — the frontend already shows the
-- upgrade modal on this code (New.tsx catch fallback).
CREATE OR REPLACE FUNCTION public.enforce_free_trade_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type TEXT;
  v_role         TEXT;
  v_count        BIGINT;
BEGIN
  SELECT account_type, role
  INTO v_account_type, v_role
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Unknown profile: let existing FK/RLS handle it
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_role IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF v_account_type IN ('free', 'platform_free') OR v_account_type IS NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.trades
    WHERE user_id = NEW.user_id AND deleted_at IS NULL;

    IF v_count >= 10 THEN
      RAISE EXCEPTION 'Free plan trade limit reached (10 trades). Upgrade to add more trades.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_free_trade_cap_before_insert ON public.trades;
CREATE TRIGGER enforce_free_trade_cap_before_insert
  BEFORE INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_trade_cap();
