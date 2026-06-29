-- ============================================================================
-- Automation Agent Endpoints — Session 2 ("The Hands + Pairing")
-- Server-side contract for the local NinjaScript desktop agent.
--
-- ADDITIVE ONLY. No table schema changes (S1 tables already live).
-- Adds 3 RPCs:
--   1. automation_generate_pairing_code(text)  — USER-scoped (RLS via auth.uid()),
--      called from the web to mint a one-time, short-lived pairing code + device row.
--   2. automation_redeem_pairing_code(...)      — SERVICE-ROLE only, called from the
--      automation-pair edge function when the agent redeems a code for a device token.
--      Stores ONLY the SHA-256 hash of the token (never the raw token).
--   3. automation_get_config(uuid)              — SERVICE-ROLE only, called from the
--      automation-agent edge function after it verifies the device token. Returns the
--      full config the agent enforces locally.
--
-- COMPLIANCE: nothing here executes orders. The agent executes locally inside the
-- user's own NinjaTrader (NinjaScript), never via the broker cloud API. Device tokens
-- are stored as hashes only. kill_switch_engaged / master_enabled are surfaced in the
-- config so the agent hard-stops locally.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. automation_generate_pairing_code — USER-scoped. Creates an 'unpaired' device
--    row with a fresh one-time code (10-min TTL). Returns the code for the web to
--    display (QR / countdown). The web then polls the device row (RLS) until it
--    flips to 'online' (redeemed by the agent).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_generate_pairing_code(
  p_device_name text DEFAULT NULL
)
RETURNS TABLE (device_id uuid, pairing_code text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_code    text;
  v_expires timestamptz := now() + interval '10 minutes';
  -- ambiguity-free alphabet (no 0/O/1/I)
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  -- 8-char code, formatted XXXX-XXXX for readability
  v_code := '';
  FOR i IN 1..8 LOOP
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  END LOOP;
  v_code := substr(v_code,1,4) || '-' || substr(v_code,5,4);

  INSERT INTO public.automation_agent_devices
    (user_id, device_name, platform, pairing_code, pairing_code_expires_at, status)
  VALUES
    (v_uid, COALESCE(NULLIF(p_device_name,''),'NinjaTrader Agent'),
     'ninjatrader', v_code, v_expires, 'unpaired')
  RETURNING id INTO device_id;

  pairing_code := v_code;
  expires_at   := v_expires;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_generate_pairing_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_generate_pairing_code(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. automation_redeem_pairing_code — SERVICE-ROLE only. Atomically validates the
--    code (exists, unexpired, still unpaired) and binds the device token HASH.
--    Single-use: clears the pairing_code so it cannot be redeemed twice.
--    Returns the device_id + user_id on success; raises on invalid/expired/used.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_redeem_pairing_code(
  p_code        text,
  p_token_hash  text,
  p_device_name text DEFAULT NULL,
  p_version     text DEFAULT NULL
)
RETURNS TABLE (device_id uuid, user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public.automation_agent_devices%ROWTYPE;
BEGIN
  IF p_code IS NULL OR p_token_hash IS NULL THEN
    RAISE EXCEPTION 'missing_args' USING errcode = '22023';
  END IF;

  SELECT * INTO v_row
    FROM public.automation_agent_devices
   WHERE pairing_code = upper(p_code)
     AND status = 'unpaired'
     AND device_token_hash IS NULL
     AND pairing_code_expires_at > now()
   FOR UPDATE
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_code' USING errcode = '22023';
  END IF;

  UPDATE public.automation_agent_devices
     SET device_token_hash       = p_token_hash,
         status                  = 'online',
         last_heartbeat_at       = now(),
         agent_version           = COALESCE(p_version, agent_version),
         device_name             = COALESCE(NULLIF(p_device_name,''), device_name),
         pairing_code            = NULL,
         pairing_code_expires_at = NULL,
         updated_at              = now()
   WHERE id = v_row.id;

  device_id := v_row.id;
  user_id   := v_row.user_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text) FROM PUBLIC;
-- service_role only (called by the automation-pair edge function). NOT granted to authenticated.

-- ----------------------------------------------------------------------------
-- 3. automation_get_config — SERVICE-ROLE only. Called by the automation-agent edge
--    function AFTER it has verified the device token and resolved p_user_id. Returns
--    the full config the agent needs: global switches (incl. kill-switch), active risk
--    rules, active copier routes + targets, and the user's broker connections (so the
--    agent can map config to local NinjaTrader accounts by account_id).
--    The agent HARD-STOPS when kill_switch_engaged OR NOT master_enabled.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_get_config(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settings    jsonb;
  v_rules       jsonb;
  v_routes      jsonb;
  v_connections jsonb;
BEGIN
  -- settings (default to disabled if no row yet)
  SELECT to_jsonb(s) INTO v_settings
    FROM public.automation_settings s
   WHERE s.user_id = p_user_id;
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object(
      'master_enabled', false, 'kill_switch_engaged', false, 'updated_at', null);
  END IF;

  -- active risk rules
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_rules
    FROM public.automation_risk_rules r
   WHERE r.user_id = p_user_id AND r.is_active = true;

  -- active copier routes + their active targets
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

  -- broker connections (for local account mapping; no secrets)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id, 'broker', c.broker, 'environment', c.environment,
           'account_id', c.account_id, 'is_active', c.is_active, 'status', c.status
         ) ORDER BY c.created_at), '[]'::jsonb)
    INTO v_connections
    FROM public.broker_connections c
   WHERE c.user_id = p_user_id;

  RETURN jsonb_build_object(
    'settings',     v_settings,
    'risk_rules',   v_rules,
    'copier_routes', v_routes,
    'connections',  v_connections,
    'served_at',    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.automation_get_config(uuid) FROM PUBLIC;
-- service_role only (called by the automation-agent edge function after token verification).

COMMENT ON FUNCTION public.automation_generate_pairing_code(text) IS
  'User-scoped: mint a one-time 10-min pairing code + unpaired device row. Web displays it.';
COMMENT ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text) IS
  'Service-role only: agent redeems a pairing code for a device token (hash stored only).';
COMMENT ON FUNCTION public.automation_get_config(uuid) IS
  'Service-role only: full agent config (settings+kill-switch, risk rules, copier routes+targets, connections).';
