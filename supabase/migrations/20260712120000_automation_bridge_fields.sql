-- ============================================================================
-- NT8 Market-Data Bridge — device fields
-- ADDITIVE ONLY. No breaking changes to existing columns/RPCs.
--
-- Adds two columns to automation_agent_devices for the NT8 desktop-agent's
-- LOCAL market-data WebSocket bridge (see finotaur-frontend's
-- src/components/charting/orderflow/nt8Bridge.ts):
--   - bridge_secret: a distinct credential from device_token_hash. It
--     authenticates the BROWSER to the agent's local WS server
--     (ws://127.0.0.1:<bridge_port>) — never the agent to Supabase.
--     Unlike device_token, this is stored RAW (not hashed): it must be
--     readable by the owning user's own browser via RLS (see
--     fetchBridgeConfig.ts), and it only ever authorizes a connection to a
--     process running on the user's OWN machine — a fundamentally
--     different trust boundary than device_token (which authenticates the
--     agent to FINOTAUR's servers and is therefore hashed).
--   - bridge_port: the local port the agent's bridge WebSocket server is
--     listening on (default 24888, agent may fall back up to 24892 on a
--     port conflict — reported via heartbeat).
--
-- Backward compatible: both columns are nullable, default NULL. An agent
-- running v1.10.0 (pre-bridge) that never sends bridge_secret/bridge_port
-- simply leaves these columns null forever — automation-agent's existing
-- 'config'/'heartbeat' handling is unchanged for those payloads, and
-- fetchBridgeConfig.ts (frontend) treats a device with bridge_secret IS
-- NULL as "not yet bridge-capable" (falls back to Nt8ConnectPanel's
-- "not paired" messaging).
--
-- 🔴 NOT APPLIED — this file was written but intentionally NOT run against
-- any database (dev or prod) as part of this change. Apply via
-- `supabase db push` (or the Supabase MCP/Studio) when ready to deploy the
-- NT8 bridge feature; automation-pair/automation-agent's edge-function code
-- in this same change set already assumes these columns exist once applied.
-- ============================================================================

ALTER TABLE public.automation_agent_devices
  ADD COLUMN IF NOT EXISTS bridge_secret text,
  ADD COLUMN IF NOT EXISTS bridge_port   integer;

COMMENT ON COLUMN public.automation_agent_devices.bridge_secret IS
  'RAW (not hashed) credential the browser uses to authenticate to the local NT8 agent WS bridge — distinct from device_token_hash, which authenticates the agent to Supabase. Readable by the owning user via existing RLS (automation_agent_devices_owner).';
COMMENT ON COLUMN public.automation_agent_devices.bridge_port IS
  'Local WS port the desktop agent''s market-data bridge is listening on (default 24888, may fall back up to 24892 on conflict). Reported via agent heartbeat.';

-- ----------------------------------------------------------------------------
-- automation_redeem_pairing_code — extend with an optional p_bridge_secret
-- param so automation-pair can persist the bridge secret at the SAME
-- pairing moment the device_token_hash is stored (one atomic RPC call, no
-- separate write).
--
-- Postgres resolves overloaded functions by full argument-type signature,
-- not just by name — CREATE OR REPLACE with a 5th parameter does NOT
-- replace the existing 4-arg function, it creates a SECOND overload
-- alongside it. Calling with exactly 4 named args would then be ambiguous
-- ("function ... is not unique") between the two overloads, since the
-- 5-arg version's p_bridge_secret default could also satisfy a 4-arg call.
-- automation-pair/index.ts (this change set) is the ONLY caller and is
-- updated to always pass all 5 named args, so the old 4-arg overload is
-- dropped outright rather than left to coexist.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.automation_redeem_pairing_code(text,text,text,text);

CREATE OR REPLACE FUNCTION public.automation_redeem_pairing_code(
  p_code          text,
  p_token_hash    text,
  p_device_name   text DEFAULT NULL,
  p_version       text DEFAULT NULL,
  p_bridge_secret text DEFAULT NULL
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
         bridge_secret           = COALESCE(p_bridge_secret, bridge_secret),
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

-- New 5-arg overload needs the same lockdown as the original 4-arg one
-- (20260627121000_automation_rpc_lockdown.sql) — service_role only, never
-- exposed to anon/authenticated (the pairing code itself is the proof of
-- possession; this RPC is only ever called from the automation-pair edge
-- function, which runs as service_role).
REVOKE ALL ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text,text) TO service_role;

COMMENT ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text,text) IS
  'Service-role only: agent redeems a pairing code for a device token (hash stored only) + optional NT8 bridge secret (stored raw — see bridge_secret column comment).';
