-- Migration: Atomic OAuth vault revoke RPC
-- Date: 2026-05-23
-- Purpose: Atomically delete vault secret + mark broker_connections disconnected.
-- Pairs with oauth_vault_upsert_atomic — same SECURITY DEFINER pattern, same locked search_path.

CREATE OR REPLACE FUNCTION public.oauth_vault_revoke_atomic(
  p_connection_id UUID,
  p_user_id       UUID   -- defense-in-depth ownership check (edge function also checks)
)
RETURNS BOOLEAN          -- true on revoke, false if not found or ownership mismatch
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_vault_secret_id UUID;
  v_owner_id        UUID;
BEGIN
  -- Lookup current vault_secret_id + owner
  SELECT
    NULLIF(connection_data->>'vault_secret_id', '')::UUID,
    user_id
  INTO v_vault_secret_id, v_owner_id
  FROM public.broker_connections
  WHERE id = p_connection_id;

  IF v_owner_id IS NULL THEN
    RETURN false;  -- connection not found
  END IF;

  IF v_owner_id <> p_user_id THEN
    RETURN false;  -- ownership mismatch
  END IF;

  -- Delete vault secret if it exists
  IF v_vault_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_vault_secret_id;
  END IF;

  -- Mark connection as disconnected; clear vault_secret_id from connection_data
  UPDATE public.broker_connections
     SET status              = 'disconnected',
         connection_data     = (COALESCE(connection_data, '{}'::jsonb) - 'vault_secret_id'),
         token_expires_at    = NULL,
         last_error          = NULL,
         last_error_at       = NULL
   WHERE id = p_connection_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.oauth_vault_revoke_atomic IS
  'User-initiated OAuth revoke: deletes vault secret + marks broker_connections disconnected. Atomic.';

GRANT EXECUTE ON FUNCTION public.oauth_vault_revoke_atomic TO service_role;
