-- Migration: Universal BEFORE INSERT backstop for the broker-connection limit
-- Date: 2026-06-20
-- Applied to prod via Supabase MCP on 2026-06-20 (this file documents/version-controls it).
--
-- Gates EVERY broker_connections insert path (OAuth RPC, tradovate-auth legacy
-- username/password login, any future path) — not just the RPC. Non-premium
-- (free/trial/basic) journal users may hold only ONE active journal connection.
--
-- Reconnect-safe: tradovate-auth uses INSERT ... ON CONFLICT DO UPDATE, and BEFORE
-- INSERT fires before conflict resolution, so we skip when a row already exists for
-- the natural key (that insert becomes an UPDATE = a reconnect, never blocked).
-- Grandfather: only INSERTs are gated; existing rows are never touched.
-- Copier (purpose <> 'journal') and premium/admin/vip are unaffected.

CREATE OR REPLACE FUNCTION public.enforce_broker_connection_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acct_type text;
  v_active_cnt int;
BEGIN
  -- Only gate active journal connections.
  IF NEW.purpose IS DISTINCT FROM 'journal' OR NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Reconnect / ON CONFLICT update path: target row already exists -> allow.
  IF EXISTS (
    SELECT 1 FROM public.broker_connections
     WHERE user_id = NEW.user_id
       AND broker  = NEW.broker
       AND account_id IS NOT DISTINCT FROM NEW.account_id
       AND purpose = 'journal'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT account_type INTO v_acct_type FROM public.profiles WHERE id = NEW.user_id;

  SELECT COUNT(*) INTO v_active_cnt
    FROM public.broker_connections
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND purpose = 'journal';

  IF COALESCE(v_acct_type, 'free') IN ('free', 'trial', 'basic') AND v_active_cnt >= 1 THEN
    RAISE EXCEPTION 'broker_connection_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_enforce_broker_connection_limit ON public.broker_connections;
CREATE TRIGGER zz_enforce_broker_connection_limit
  BEFORE INSERT ON public.broker_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_broker_connection_limit();

COMMENT ON FUNCTION public.enforce_broker_connection_limit() IS
  'Backstop limit: non-premium (free/trial/basic) users may hold only one active journal broker_connection. Gates all INSERT paths; skips reconnects (existing natural key) and copier connections. Added 2026-06-20.';
