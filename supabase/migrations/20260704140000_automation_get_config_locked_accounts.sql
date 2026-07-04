-- ─────────────────────────────────────────────────────────────────────────────
-- Wire the manual account lock through to the desktop agent.
--
-- Background: the manual kill-switch (portfolios.kill_switch_active, set by the
-- "Lock all accounts" control and the per-account Lock button) previously had no
-- live enforcement — the only server reader was the retired cloud engine.js. The
-- desktop NinjaTrader agent already has the enforcement code (FinotaurAgent WI-2 →
-- RiskEnforcer.LockAccountManual → FlattenAll + a real-time order-block guard that
-- cancels any new order, copier OR manual, until the lock expires), but it reads
-- the set of locked accounts from a `locked_accounts` field that automation_get_config
-- never emitted. This migration emits it.
--
-- `locked_accounts` = NT account_name (portfolios.name — the same identifier the
-- agent already resolves for `accounts` / risk-rule account_name) for every active
-- Tradovate account whose manual kill-switch is active AND not yet expired
-- (kill_switch_locked_until > now()). A NULL expiry is treated as unlocked
-- (fail-open) — consistent with the frontend derivation, so no account is stranded.
--
-- Returned in BOTH the "unchanged" and full branches (safety-critical, exactly like
-- master_enabled / kill_switch_engaged) because a manual lock releases purely by time
-- at 17:00 CT (kill_switch_locked_until passing) with NO row change — so config_version
-- does not bump at expiry and the agent must still learn the account dropped out.
--
-- Otherwise identical to the current premium-gate definition
-- (20260627150000_automation_copier_premium_gate.sql). No frontend or agent change.
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_locked      jsonb;
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

  v_entitled := public.automation_user_is_entitled(p_user_id);
  v_master   := v_master AND v_entitled;
  v_version  := v_version || '-E' || (CASE WHEN v_entitled THEN '1' ELSE '0' END);

  -- Manual daily-lock list (safety-critical). NT account_name for every tradovate
  -- account whose manual kill-switch is active AND not yet expired. Fail-open on NULL.
  SELECT COALESCE(jsonb_agg(p.name ORDER BY p.name), '[]'::jsonb)
    INTO v_locked
    FROM public.portfolios p
   WHERE p.user_id = p_user_id
     AND p.is_active = true
     AND p.source = 'tradovate'
     AND p.tradovate_account_id IS NOT NULL
     AND p.kill_switch_active = true
     AND p.kill_switch_locked_until IS NOT NULL
     AND p.kill_switch_locked_until > now();

  IF p_known_version IS NOT NULL AND p_known_version = v_version THEN
    RETURN jsonb_build_object(
      'unchanged', true, 'config_version', v_version,
      'master_enabled', v_master, 'kill_switch_engaged', v_kill,
      'locked_accounts', v_locked,
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

  IF NOT v_entitled THEN
    v_routes := '[]'::jsonb;
    v_rules  := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'unchanged', false, 'config_version', v_version,
    'settings', v_settings, 'risk_rules', v_rules, 'copier_routes', v_routes,
    'accounts', v_accounts, 'connections', v_connections,
    'locked_accounts', v_locked,
    'master_enabled', v_master, 'kill_switch_engaged', v_kill,
    'entitled', v_entitled, 'served_at', now());
END;
$function$;
