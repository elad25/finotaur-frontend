-- ═══════════════════════════════════════════════════════════════
-- IB OAuth2 Vault RPCs — atomic upsert + read
-- OQ-VAULT-DRIFT pattern (see 2026-05-11_vault_drift_fix_atomic_upsert.sql)
-- ═══════════════════════════════════════════════════════════════
-- Mirrors tradovate_vault_upsert_atomic exactly. Two separate functions
-- so IB and Tradovate vault entries stay isolated and can be audited,
-- rotated, or dropped independently.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ib_vault_upsert_atomic ───────────────────────────────
-- Atomically writes (or in-place updates) an IB OAuth token blob in
-- vault.secrets AND realigns broker_connections.connection_data
-- .vault_secret_id in the same transaction. Eliminates the drift window
-- that caused session terminations at token-refresh cadence (OQ-VAULT-DRIFT).

CREATE OR REPLACE FUNCTION public.ib_vault_upsert_atomic(
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

GRANT EXECUTE ON FUNCTION public.ib_vault_upsert_atomic(UUID, TEXT, TEXT)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.ib_vault_upsert_atomic(UUID, TEXT, TEXT)
  FROM authenticated, anon;

COMMENT ON FUNCTION public.ib_vault_upsert_atomic IS
  'Atomically updates the Interactive Brokers Vault secret AND realigns '
  'broker_connections.connection_data.vault_secret_id in one txn. '
  'Mirrors OQ-VAULT-DRIFT pattern from tradovate_vault_upsert_atomic (2026-05-11). '
  'service_role only.';

-- ─── 2. ib_vault_read ────────────────────────────────────────
-- Reads the decrypted IB OAuth token blob from vault.decrypted_secrets.
-- Returns NULL if the secret_id does not exist (caller must handle null = revoked).

CREATE OR REPLACE FUNCTION public.ib_vault_read(
  p_secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id
  LIMIT 1;

  RETURN v_secret; -- NULL if not found
END;
$$;

GRANT EXECUTE ON FUNCTION public.ib_vault_read(UUID)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.ib_vault_read(UUID)
  FROM authenticated, anon;

COMMENT ON FUNCTION public.ib_vault_read IS
  'Reads a decrypted IB OAuth token blob from vault.decrypted_secrets by UUID. '
  'Returns NULL if not found (treat as revoked/missing connection). '
  'OQ-VAULT-DRIFT pattern. service_role only.';
