-- ============================================================================
-- Trade Copier premium gate (server-side enforcement)
--
-- Only Journal-Premium users may run the copier. Enforced in the config the
-- local agent pulls, so a lapsed subscriber with an already-installed/paired
-- agent simply receives master_enabled=false + zero routes and cannot copy.
--
-- Entitlement is folded into config_version (suffix -E1/-E0) so an entitlement
-- change forces a FULL config refetch (profiles is not in the version's
-- GREATEST set), which rebuilds the agent's cached config via ApplyConfig.
--
-- Applied to prod via Supabase MCP 2026-06-27; this file keeps the repo in sync.
-- ============================================================================

-- 1) Canonical "is this user Journal-Premium" check. Mirrors the frontend
--    isPremium rule in useSubscription.ts EXACTLY (admin / lifetime / platform
--    journal-bundle / direct premium subscription) reading raw profiles columns.
CREATE OR REPLACE FUNCTION public.automation_user_is_entitled(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        -- isAdmin
        p.role IN ('admin','super_admin') OR p.account_type IN ('admin','vip')
        -- isLifetimeUser (account_type='vip' already covered above)
        OR p.payment_provider = 'lifetime'
        -- hasJournalFromBundle
        OR p.platform_bundle_journal_granted = true
        OR ( p.platform_plan IN ('finotaur','enterprise','platform_finotaur','platform_enterprise')
             AND p.platform_subscription_status IN ('active','trial','trialing') )
        -- hasDirectJournalSubscription AND effectiveJournalPlan='premium'
        OR ( p.account_type = 'premium'
             AND p.subscription_status = 'active'
             AND p.whop_membership_id IS NOT NULL )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.automation_user_is_entitled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_user_is_entitled(uuid) TO service_role;

-- 2) automation_get_config — same as the versioned config function, plus the gate.
CREATE OR REPLACE FUNCTION public.automation_get_config(p_user_id uuid, p_known_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_version     text;
  v_settings    jsonb;
  v_rules       jsonb;
  v_routes      jsonb;
  v_connections jsonb;
  v_accounts    jsonb;
  v_master      boolean;
  v_kill        boolean;
  v_entitled    boolean;
BEGIN
  SELECT to_char(
           COALESCE(GREATEST(
             (SELECT max(updated_at) FROM public.automation_settings           WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_risk_rules          WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_copier_routes       WHERE user_id = p_user_id),
             (SELECT max(t.created_at) FROM public.automation_copier_route_targets t
                JOIN public.automation_copier_routes r ON r.id = t.route_id
               WHERE r.user_id = p_user_id),
             (SELECT max(updated_at) FROM public.broker_connections             WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.portfolios                     WHERE user_id = p_user_id)
           ), timestamptz 'epoch'),
           'YYYYMMDDHH24MISSUS')
    INTO v_version;

  SELECT s.master_enabled, s.kill_switch_engaged INTO v_master, v_kill
    FROM public.automation_settings s WHERE s.user_id = p_user_id;
  v_master := COALESCE(v_master, false);
  v_kill   := COALESCE(v_kill,   false);

  -- PREMIUM GATE: non-entitled users get master forced off. Entitlement is
  -- folded into the version so any change forces a full refetch + rebuild.
  v_entitled := public.automation_user_is_entitled(p_user_id);
  v_master   := v_master AND v_entitled;
  v_version  := v_version || '-E' || (CASE WHEN v_entitled THEN '1' ELSE '0' END);

  IF p_known_version IS NOT NULL AND p_known_version = v_version THEN
    RETURN jsonb_build_object(
      'unchanged', true, 'config_version', v_version,
      'master_enabled', v_master, 'kill_switch_engaged', v_kill,
      'entitled', v_entitled, 'served_at', now());
  END IF;

  SELECT to_jsonb(s) INTO v_settings FROM public.automation_settings s WHERE s.user_id = p_user_id;
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object('master_enabled', false, 'kill_switch_engaged', false, 'updated_at', null);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_rules FROM public.automation_risk_rules r
   WHERE r.user_id = p_user_id AND r.is_active = true;

  SELECT COALESCE(jsonb_agg(
           to_jsonb(rt) || jsonb_build_object('targets',
             COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at)
                         FROM public.automation_copier_route_targets t
                        WHERE t.route_id = rt.id AND t.is_active = true), '[]'::jsonb))
           ORDER BY rt.created_at), '[]'::jsonb)
    INTO v_routes FROM public.automation_copier_routes rt
   WHERE rt.user_id = p_user_id AND rt.is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'account_id',   p.tradovate_account_id::text,
           'account_name', p.name,
           'broker',       p.source,
           'environment',  p.environment,
           'is_active',    p.is_active
         ) ORDER BY p.name), '[]'::jsonb)
    INTO v_accounts FROM public.portfolios p
   WHERE p.user_id = p_user_id AND p.is_active = true
     AND p.source = 'tradovate' AND p.tradovate_account_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id, 'broker', c.broker, 'environment', c.environment,
           'account_id', c.account_id, 'is_active', c.is_active, 'status', c.status
         ) ORDER BY c.created_at), '[]'::jsonb)
    INTO v_connections FROM public.broker_connections c WHERE c.user_id = p_user_id;

  -- PREMIUM GATE (full path): no copier routes / risk rules for non-entitled
  -- users, so even a stale cached agent rebuilds to an empty, inert config.
  IF NOT v_entitled THEN
    v_routes := '[]'::jsonb;
    v_rules  := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'unchanged', false, 'config_version', v_version,
    'settings', v_settings, 'risk_rules', v_rules, 'copier_routes', v_routes,
    'accounts', v_accounts, 'connections', v_connections,
    'master_enabled', v_master, 'kill_switch_engaged', v_kill,
    'entitled', v_entitled, 'served_at', now());
END;
$function$;
