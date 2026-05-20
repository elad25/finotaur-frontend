-- ============================================================================
-- Migration: broker_connection_single_owner_trigger
-- Date: 2026-05-20
-- Session: tradovate-roundtrip-fix (Bug B work)
-- Applied to prod via Supabase MCP on 2026-05-20 (this file backfills git tracking)
--
-- Purpose: Enforce "last connector wins" for shared Tradovate/NinjaTrader
--          accounts. When user A connects to account X, any other user's
--          active connection to the same account is auto-superseded.
--
-- Why: Multiple users (elad/8e491450, 849f60ba, 915e0efb) had active
--      broker_connections to the same Tradovate account 49530242. Every
--      cron tick ran syncCredential 3 times — once per user — each writing
--      trades + tradovate_position_state under its own user_id. Race
--      conditions on position_state caused roundtrip aggregation to fail
--      silently. See SESSION_END_2026-05-20_tradovate-roundtrip-fix.md.
--
-- Note: status_message field carries the "Superseded by..." marker because
--       broker_connections_status_check does not allow a "superseded" enum.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_single_owner_per_broker_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true
     AND NEW.broker IN ('tradovate', 'ninja_trader')
     AND NEW.account_id IS NOT NULL
  THEN
    UPDATE public.broker_connections
       SET is_active       = false,
           status          = 'disconnected',
           status_message  = 'Superseded by newer connection ' || NEW.id::text
                             || ' (user ' || NEW.user_id::text || ')'
                             || ' at ' || NOW()::text,
           disconnected_at = NOW(),
           updated_at      = NOW()
     WHERE account_id = NEW.account_id
       AND id        != NEW.id
       AND is_active  = true
       AND broker     IN ('tradovate', 'ninja_trader');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS broker_connection_single_owner_trigger ON public.broker_connections;
CREATE TRIGGER broker_connection_single_owner_trigger
  BEFORE INSERT OR UPDATE OF is_active, broker, account_id
  ON public.broker_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_owner_per_broker_account();

COMMENT ON FUNCTION public.enforce_single_owner_per_broker_account() IS
  'Single-owner-per-account enforcement: when a tradovate/ninja_trader connection becomes active, all OTHER active connections to the same account_id are flipped to is_active=false + status=disconnected. Added 2026-05-20 (Bug B fix).';
