-- ============================================================================
-- admin_get_user_details RPC (2026-07-10)
-- Fixes: admin CRM user-details page hung on skeleton for every non-self user.
-- Root cause: getUserById used a direct RLS-subject profiles query; the
-- profiles SELECT policy admin branch requires app.admin_mode which is only
-- set inside SECURITY DEFINER RPCs — so REST reads of other users return 0
-- rows silently. This RPC mirrors admin_list_users' projection for ONE user,
-- WITHOUT the deleted_at filter (admins may open soft-deleted accounts; the
-- UI labels them).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_user_details(p_user_id uuid)
 RETURNS TABLE(
   id uuid, email text, display_name text, created_at timestamptz,
   account_type text, subscription_status text, whop_membership_id text,
   is_in_trial boolean, trial_ends_at timestamptz,
   subscription_cancel_at_period_end boolean, subscription_started_at timestamptz,
   total_pnl numeric, initial_portfolio numeric, current_portfolio numeric,
   risk_mode text, risk_percentage numeric,
   newsletter_status text, newsletter_whop_membership_id text,
   newsletter_enabled boolean, newsletter_paid boolean,
   newsletter_trial_ends_at timestamptz, newsletter_cancel_at_period_end boolean,
   newsletter_expires_at timestamptz,
   top_secret_status text, top_secret_whop_membership_id text,
   top_secret_enabled boolean, top_secret_is_in_trial boolean,
   top_secret_trial_ends_at timestamptz, top_secret_cancel_at_period_end boolean,
   top_secret_started_at timestamptz, top_secret_expires_at timestamptz,
   platform_plan text, platform_subscription_status text,
   platform_is_in_trial boolean, platform_trial_ends_at timestamptz,
   platform_cancel_at_period_end boolean,
   last_login_at timestamptz, trade_count integer, win_rate numeric,
   subscription_interval text, subscription_expires_at timestamptz,
   role text, is_banned boolean, deleted_at timestamptz
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT p.role IN ('admin', 'super_admin') AND COALESCE(p.is_banned, false) = false
  INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email::TEXT,
    p.display_name::TEXT,
    p.created_at,
    p.account_type::TEXT,
    p.subscription_status::TEXT,
    p.whop_membership_id::TEXT,
    COALESCE(p.is_in_trial, false),
    p.trial_ends_at,
    COALESCE(p.subscription_cancel_at_period_end, false),
    p.subscription_started_at,
    COALESCE(p.total_pnl, 0),
    COALESCE(p.initial_portfolio, 10000),
    COALESCE(p.current_portfolio, 10000),
    COALESCE(p.risk_mode, 'percentage')::TEXT,
    COALESCE(p.risk_percentage, 1)::NUMERIC,
    p.newsletter_status::TEXT,
    p.newsletter_whop_membership_id::TEXT,
    p.newsletter_enabled,
    COALESCE(p.newsletter_paid, false),
    p.newsletter_trial_ends_at,
    COALESCE(p.newsletter_cancel_at_period_end, false),
    p.newsletter_expires_at,
    p.top_secret_status::TEXT,
    p.top_secret_whop_membership_id::TEXT,
    p.top_secret_enabled,
    COALESCE(p.top_secret_is_in_trial, false),
    p.top_secret_trial_ends_at,
    COALESCE(p.top_secret_cancel_at_period_end, false),
    p.top_secret_started_at,
    p.top_secret_expires_at,
    p.platform_plan::TEXT,
    p.platform_subscription_status::TEXT,
    COALESCE(p.platform_is_in_trial, false),
    p.platform_trial_ends_at,
    COALESCE(p.platform_cancel_at_period_end, false),
    p.last_login_at,
    COALESCE(p.trade_count, 0),
    COALESCE(public.admin_user_win_rate(p.id), 0),
    p.subscription_interval::TEXT,
    p.subscription_expires_at,
    p.role::TEXT,
    COALESCE(p.is_banned, false),
    p.deleted_at
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_details(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(uuid) TO authenticated;
