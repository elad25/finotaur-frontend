-- ============================================================================
-- Block pairing-code generation for non-Journal-Premium users (defense in depth;
-- the config gate already prevents copying, this stops pairing from even starting).
-- Applied to prod via Supabase MCP 2026-06-27; this file keeps the repo in sync.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.automation_generate_pairing_code(p_device_name text DEFAULT NULL::text)
 RETURNS TABLE(device_id uuid, pairing_code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_code    text;
  v_expires timestamptz := now() + interval '10 minutes';
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  -- Premium gate: only Journal-Premium users may pair an agent.
  IF NOT public.automation_user_is_entitled(v_uid) THEN
    RAISE EXCEPTION 'subscription_required' USING errcode = '42501';
  END IF;

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
$function$;
