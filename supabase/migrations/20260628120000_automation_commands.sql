-- ============================================================================
-- Automation Commands — customer-initiated one-shot commands for the desktop agent
--
-- Adds a command channel on top of the existing config-pull architecture. The web
-- (user) enqueues a command (e.g. FLATTEN ALL); the local NinjaScript agent claims
-- pending commands on its next poll (via the automation-agent edge function),
-- executes them LOCALLY in NinjaTrader, and reports the result back.
--
-- COMPLIANCE: nothing here executes orders. Execution happens locally inside the
-- user's own NinjaTrader (NinjaScript), customer-initiated (NinjaTrader §1).
-- The cloud only carries the intent + the result for UI feedback.
--
-- RPCs:
--   1. automation_enqueue_command(text,text)  — USER-scoped. Queues a command for
--      every ONLINE device the user owns. Returns the inserted command rows.
--   2. automation_claim_commands(uuid)        — SERVICE-ROLE. Atomically flips a
--      device's pending commands to 'executing' and returns them (at-least-once).
--   3. automation_complete_command(uuid,text,text) — SERVICE-ROLE. Marks a command
--      executed/failed with an optional error message.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_commands (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id)                ON DELETE CASCADE,
  device_id     uuid NOT NULL REFERENCES public.automation_agent_devices(id) ON DELETE CASCADE,
  command_type  text NOT NULL CHECK (command_type IN ('flatten_all','flatten_symbol','cancel_orders')),
  symbol        text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','executing','executed','failed')),
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  claimed_at    timestamptz,
  executed_at   timestamptz
);

-- fast lookup of a device's pending queue (partial index — only pending rows)
CREATE INDEX IF NOT EXISTS idx_automation_commands_device_pending
  ON public.automation_commands (device_id) WHERE status = 'pending';
-- user's recent commands (UI status feed)
CREATE INDEX IF NOT EXISTS idx_automation_commands_user_recent
  ON public.automation_commands (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- RLS — users may READ their own commands (UI status). All writes go through the
-- SECURITY DEFINER RPCs below; no direct user INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------
ALTER TABLE public.automation_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_commands_select_own ON public.automation_commands;
CREATE POLICY automation_commands_select_own ON public.automation_commands
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 1. automation_enqueue_command — USER-scoped. Queues a command for EVERY online
--    device the caller owns. FLATTEN is an exit/safety action, so it is NOT gated
--    behind the copier entitlement — a user must always be able to close their own
--    positions. Returns the inserted rows so the web can track status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_enqueue_command(
  p_command_type text,
  p_symbol       text DEFAULT NULL
)
RETURNS SETOF public.automation_commands
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  IF p_command_type NOT IN ('flatten_all','flatten_symbol','cancel_orders') THEN
    RAISE EXCEPTION 'invalid_command_type' USING errcode = '22023';
  END IF;

  IF p_command_type = 'flatten_symbol' AND COALESCE(NULLIF(p_symbol,''), NULL) IS NULL THEN
    RAISE EXCEPTION 'symbol_required_for_flatten_symbol' USING errcode = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO public.automation_commands (user_id, device_id, command_type, symbol)
  SELECT v_uid, d.id, p_command_type, NULLIF(p_symbol,'')
    FROM public.automation_agent_devices d
   WHERE d.user_id = v_uid
     AND d.status  = 'online'
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_enqueue_command(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_enqueue_command(text,text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. automation_claim_commands — SERVICE-ROLE. Called by the automation-agent edge
--    function (after device-token verification) on each poll. Atomically flips this
--    device's pending commands to 'executing' and returns them. At-least-once:
--    flatten/cancel are effectively idempotent (flattening a flat account is a no-op).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_claim_commands(p_device_id uuid)
RETURNS SETOF public.automation_commands
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.automation_commands c
     SET status = 'executing', claimed_at = now()
   WHERE c.id IN (
     SELECT id FROM public.automation_commands
      WHERE device_id = p_device_id AND status = 'pending'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_claim_commands(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_claim_commands(uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. automation_complete_command — SERVICE-ROLE. Called by the edge function when
--    the agent reports a command result. Only transitions rows still 'executing'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_complete_command(
  p_command_id uuid,
  p_status     text,
  p_error      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('executed','failed') THEN
    RAISE EXCEPTION 'invalid_status' USING errcode = '22023';
  END IF;

  UPDATE public.automation_commands
     SET status        = p_status,
         error_message = NULLIF(p_error,''),
         executed_at   = now()
   WHERE id = p_command_id
     AND status = 'executing';
END;
$$;

REVOKE ALL ON FUNCTION public.automation_complete_command(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_complete_command(uuid,text,text) TO service_role;

COMMENT ON TABLE  public.automation_commands IS
  'Customer-initiated one-shot commands (flatten_all/flatten_symbol/cancel_orders) for the local desktop agent. Execution is local in NinjaTrader; cloud only carries intent + result.';
COMMENT ON FUNCTION public.automation_enqueue_command(text,text) IS
  'User-scoped: queue a command for every online device the caller owns. Not entitlement-gated (flatten is a safety/exit action).';
COMMENT ON FUNCTION public.automation_claim_commands(uuid) IS
  'Service-role only: atomically claim a device pending commands (pending->executing) and return them.';
COMMENT ON FUNCTION public.automation_complete_command(uuid,text,text) IS
  'Service-role only: mark a claimed command executed/failed with optional error.';
