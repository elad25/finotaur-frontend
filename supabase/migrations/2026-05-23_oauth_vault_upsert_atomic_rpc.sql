-- Migration: Generic OAuth vault upsert atomic RPC
-- Date: 2026-05-23
-- Purpose: Atomically store OAuth tokens in vault + update broker_connections row.
-- Modeled after tradovate_vault_upsert_atomic but accepts OAuth-specific fields.

CREATE OR REPLACE FUNCTION public.oauth_vault_upsert_atomic(
  p_connection_id            UUID,        -- broker_connections.id (nullable if first time)
  p_user_id                  UUID,        -- Required when p_connection_id is NULL
  p_broker                   TEXT,        -- 'tradovate' | 'ninja_trader' | etc.
  p_environment              TEXT,        -- 'live' | 'demo' | 'sandbox'
  p_secret_name              TEXT,        -- "oauth_<broker>_<user_id>_<env>"
  p_secret_payload           TEXT,        -- JSON: {access_token, refresh_token, expires_at, scope, provider_user_id, ...}
  p_token_expires_at         TIMESTAMPTZ, -- For indexing/cron lookup
  p_oauth_scope              TEXT,        -- Granted scopes (nullable)
  p_oauth_provider_user_id   TEXT,        -- Stable provider user id (nullable)
  p_account_id               TEXT,        -- Broker account id (nullable on first call)
  p_account_name             TEXT,        -- Display name (nullable)
  p_connection_name          TEXT,        -- User-facing label (nullable)
  p_is_prop_firm             BOOLEAN      -- Detected prop firm status
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_vault_id UUID;
  v_existing_vault_id UUID;
  v_resolved_connection_id UUID;
BEGIN
  -- Look up existing vault secret by name
  SELECT id INTO v_existing_vault_id
    FROM vault.secrets
    WHERE name = p_secret_name
    LIMIT 1;

  IF v_existing_vault_id IS NOT NULL THEN
    -- Update in-place (preserves UUID)
    PERFORM vault.update_secret(v_existing_vault_id, p_secret_payload, NULL, NULL, NULL);
    v_vault_id := v_existing_vault_id;
  ELSE
    -- Create new secret
    v_vault_id := vault.create_secret(p_secret_payload, p_secret_name);
  END IF;

  -- Atomically upsert broker_connections
  IF p_connection_id IS NOT NULL THEN
    UPDATE public.broker_connections
       SET auth_method               = 'oauth',
           status                    = 'connected',
           connected_at              = now(),
           connection_data           = COALESCE(connection_data, '{}'::jsonb)
                                        || jsonb_build_object('vault_secret_id', v_vault_id::text),
           token_expires_at          = p_token_expires_at,
           oauth_scope               = COALESCE(p_oauth_scope, oauth_scope),
           oauth_provider_user_id    = COALESCE(p_oauth_provider_user_id, oauth_provider_user_id),
           account_id                = COALESCE(p_account_id, account_id),
           account_name              = COALESCE(p_account_name, account_name),
           connection_name           = COALESCE(p_connection_name, connection_name),
           is_prop_firm              = COALESCE(p_is_prop_firm, is_prop_firm),
           migration_required        = false,
           error_count               = 0,
           retry_attempt_count       = 0,
           next_retry_at             = NULL,
           last_error                = NULL,
           last_error_at             = NULL
     WHERE id = p_connection_id;

    v_resolved_connection_id := p_connection_id;
  ELSE
    -- First-time OAuth: insert new broker_connections row
    INSERT INTO public.broker_connections (
      user_id, broker, environment, status, auth_method,
      connected_at, connection_data,
      token_expires_at, oauth_scope, oauth_provider_user_id,
      account_id, account_name, connection_name,
      is_prop_firm, is_active, auto_sync_enabled
    )
    VALUES (
      p_user_id, p_broker, p_environment, 'connected', 'oauth',
      now(), jsonb_build_object('vault_secret_id', v_vault_id::text),
      p_token_expires_at, p_oauth_scope, p_oauth_provider_user_id,
      p_account_id, p_account_name, p_connection_name,
      p_is_prop_firm, true, true
    )
    RETURNING id INTO v_resolved_connection_id;
  END IF;

  RETURN v_vault_id;
END;
$$;

COMMENT ON FUNCTION public.oauth_vault_upsert_atomic IS
  'Atomically upsert OAuth token secret in vault and update broker_connections row. Prevents vault-drift bug (see OQ-VAULT-DRIFT 2026-05-11).';

-- Grant execute to service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.oauth_vault_upsert_atomic TO service_role;
