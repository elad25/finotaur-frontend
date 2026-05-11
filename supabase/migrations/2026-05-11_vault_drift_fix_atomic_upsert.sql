-- ═══════════════════════════════════════════════════════════════
-- OQ-VAULT-DRIFT — atomic vault upsert + broker_connections pointer
-- ═══════════════════════════════════════════════════════════════
-- Problem (production-observed 2026-05-11):
--   public.tradovate_vault_upsert(p_name, p_secret) returns a NEW UUID
--   every call (DELETE-then-CREATE). The edge function then performs a
--   SEPARATE Supabase client UPDATE on broker_connections.connection_data
--   .vault_secret_id. Between the two calls there is a drift window
--   (tens of ms) where the DB pointer references a vault entry that no
--   longer exists. The engine reads NULL → session terminates → customer
--   disconnected. Repeats every ~75 min (token-refresh cron cadence).
--
-- Fix:
--   New RPC public.tradovate_vault_upsert_atomic(p_connection_id, p_name,
--   p_secret) that performs both the vault mutation AND the broker_-
--   connections pointer write in ONE PL/pgSQL transaction. Uses
--   vault.update_secret() for true in-place update when a row with the
--   given name already exists (same UUID forever per connection). Only
--   creates a new vault row on first connect.
--
--   Old public.tradovate_vault_upsert is left in place during transition
--   (no callers will use it after the edge function is redeployed) — to
--   be dropped in a follow-up cleanup migration once observability
--   confirms the new path is exercised exclusively.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.tradovate_vault_upsert_atomic(
  p_connection_id UUID,
  p_name          TEXT,
  p_secret        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Find existing entry by name (one-to-one per credential)
  SELECT id INTO v_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_id IS NULL THEN
    -- First-time create
    SELECT vault.create_secret(p_secret, p_name) INTO v_id;
  ELSE
    -- TRUE in-place update — same UUID, only the encrypted bytes change.
    -- vault.update_secret signature:
    --   (secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid)
    -- NULLs leave name/description/key_id unchanged.
    PERFORM vault.update_secret(v_id, p_secret, NULL, NULL, NULL);
  END IF;

  -- Atomically align the pointer in broker_connections (same txn as vault op).
  -- Skipped when caller does not know the connection_id yet (e.g., first-time
  -- login path that upserts broker_connections itself with the returned UUID).
  IF p_connection_id IS NOT NULL THEN
    UPDATE broker_connections
    SET connection_data = jsonb_set(
      COALESCE(connection_data, '{}'::jsonb),
      '{vault_secret_id}',
      to_jsonb(v_id::text),
      true
    )
    WHERE id = p_connection_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tradovate_vault_upsert_atomic(UUID, TEXT, TEXT)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.tradovate_vault_upsert_atomic(UUID, TEXT, TEXT)
  FROM authenticated, anon;

COMMENT ON FUNCTION public.tradovate_vault_upsert_atomic IS
  'Atomically updates the Tradovate Vault secret AND realigns broker_connections '
  'connection_data.vault_secret_id in one txn. Fixes OQ-VAULT-DRIFT (2026-05-11). '
  'service_role only.';
