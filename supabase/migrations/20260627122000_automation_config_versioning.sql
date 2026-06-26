-- Scale hardening (server side): config versioning for the agent's config pull.
-- Goal: with many users × up to ~60 connections each polling every few seconds, do
-- NOT rebuild + re-send the full config on every poll. The agent sends its last-seen
-- config_version; if nothing changed we return a tiny {unchanged:true,...} payload.
--
-- The version is the max updated_at across every config-affecting row for the user
-- (settings, risk rules, copier routes + targets, broker connections). Any edit bumps it.
-- kill_switch_engaged + master_enabled are ALWAYS returned (even on 'unchanged') so the
-- agent has a cheap, authoritative safety check on every single poll.
--
-- service_role only (called by the automation-agent edge function after token verification).

DROP FUNCTION IF EXISTS public.automation_get_config(uuid);

CREATE OR REPLACE FUNCTION public.automation_get_config(
  p_user_id        uuid,
  p_known_version  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_version     text;
  v_settings    jsonb;
  v_rules       jsonb;
  v_routes      jsonb;
  v_connections jsonb;
  v_master      boolean;
  v_kill        boolean;
BEGIN
  -- version = max updated_at across all config-affecting rows (microsecond precision).
  -- GREATEST ignores NULLs; COALESCE to epoch so a brand-new user gets a stable value.
  SELECT to_char(
           COALESCE(GREATEST(
             (SELECT max(updated_at) FROM public.automation_settings           WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_risk_rules          WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_copier_routes       WHERE user_id = p_user_id),
             (SELECT max(t.created_at) FROM public.automation_copier_route_targets t
                JOIN public.automation_copier_routes r ON r.id = t.route_id
               WHERE r.user_id = p_user_id),
             (SELECT max(updated_at) FROM public.broker_connections             WHERE user_id = p_user_id)
           ), timestamptz 'epoch'),
           'YYYYMMDDHH24MISSUS')
    INTO v_version;

  -- switches (always returned; safety-critical)
  SELECT s.master_enabled, s.kill_switch_engaged INTO v_master, v_kill
    FROM public.automation_settings s WHERE s.user_id = p_user_id;
  v_master := COALESCE(v_master, false);
  v_kill   := COALESCE(v_kill,   false);

  -- short-circuit: config unchanged since the agent last pulled
  IF p_known_version IS NOT NULL AND p_known_version = v_version THEN
    RETURN jsonb_build_object(
      'unchanged',           true,
      'config_version',      v_version,
      'master_enabled',      v_master,
      'kill_switch_engaged', v_kill,
      'served_at',           now()
    );
  END IF;

  -- ---- full build ----
  SELECT to_jsonb(s) INTO v_settings
    FROM public.automation_settings s WHERE s.user_id = p_user_id;
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object(
      'master_enabled', false, 'kill_switch_engaged', false, 'updated_at', null);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_rules
    FROM public.automation_risk_rules r
   WHERE r.user_id = p_user_id AND r.is_active = true;

  SELECT COALESCE(jsonb_agg(
           to_jsonb(rt) || jsonb_build_object(
             'targets',
             COALESCE((
               SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at)
                 FROM public.automation_copier_route_targets t
                WHERE t.route_id = rt.id AND t.is_active = true
             ), '[]'::jsonb)
           )
           ORDER BY rt.created_at), '[]'::jsonb)
    INTO v_routes
    FROM public.automation_copier_routes rt
   WHERE rt.user_id = p_user_id AND rt.is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id, 'broker', c.broker, 'environment', c.environment,
           'account_id', c.account_id, 'is_active', c.is_active, 'status', c.status
         ) ORDER BY c.created_at), '[]'::jsonb)
    INTO v_connections
    FROM public.broker_connections c
   WHERE c.user_id = p_user_id;

  RETURN jsonb_build_object(
    'unchanged',           false,
    'config_version',      v_version,
    'settings',            v_settings,
    'risk_rules',          v_rules,
    'copier_routes',       v_routes,
    'connections',         v_connections,
    'master_enabled',      v_master,
    'kill_switch_engaged', v_kill,
    'served_at',           now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.automation_get_config(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.automation_get_config(uuid, text) TO service_role;

COMMENT ON FUNCTION public.automation_get_config(uuid, text) IS
  'Service-role only. Agent config pull with versioning: pass p_known_version to get {unchanged:true} when config has not changed. Always returns master/kill switches for a cheap per-poll safety check.';
