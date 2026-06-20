-- Migration: Broker-connection limit gate inside oauth_vault_upsert_atomic (RPC path)
-- Date: 2026-06-20
-- Applied to prod via Supabase MCP on 2026-06-20 (this file documents/version-controls it).
--
-- Non-premium journal users (account_type IN ('free','trial','basic')) may have only ONE
-- active broker connection. Premium/admin/vip are unlimited. GRANDFATHER: existing rows are
-- never touched; only a genuinely new (first-time) insertion is gated. Reconnects are never
-- blocked. A universal BEFORE INSERT trigger backstop lives in
-- 2026-06-20_broker_connection_limit_trigger.sql (covers non-RPC insert paths too).
--
-- IMPORTANT: rebuilt verbatim from the LIVE production definition (pg_get_functiondef),
-- NOT from the stale on-disk 2026-05-23 migration. The live version preserved here includes
-- (1) the per-connection vault secret name keyed by account_id (multi-Tradovate, 2026-06-19)
-- and (2) the INSERT ... ON CONFLICT DO UPDATE upsert. The ONLY additions are two DECLARE
-- vars and the NOT EXISTS-guarded limit block in the INSERT branch.

CREATE OR REPLACE FUNCTION public.oauth_vault_upsert_atomic(
  p_connection_id            uuid,
  p_user_id                  uuid,
  p_broker                   text,
  p_environment              text,
  p_secret_name              text,
  p_secret_payload           text,
  p_token_expires_at         timestamp with time zone,
  p_oauth_scope              text,
  p_oauth_provider_user_id   text,
  p_account_id               text,
  p_account_name             text,
  p_connection_name          text,
  p_is_prop_firm             boolean
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_vault_id UUID;
  v_existing_vault_id UUID;
  v_resolved_connection_id UUID;
  v_acct TEXT;
  v_secret_name TEXT;
  v_acct_type TEXT;
  v_active_cnt INT;
BEGIN
  v_acct := p_account_id;
  IF v_acct IS NULL AND p_connection_id IS NOT NULL THEN
    SELECT account_id INTO v_acct FROM public.broker_connections WHERE id = p_connection_id;
  END IF;

  IF v_acct IS NOT NULL THEN
    v_secret_name := 'oauth_' || p_broker || '_' || p_user_id::text || '_' || v_acct;
  ELSE
    v_secret_name := p_secret_name;
  END IF;

  SELECT id INTO v_existing_vault_id
    FROM vault.secrets
    WHERE name = v_secret_name
    LIMIT 1;

  IF v_existing_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_vault_id, p_secret_payload, NULL, NULL, NULL);
    v_vault_id := v_existing_vault_id;
  ELSE
    v_vault_id := vault.create_secret(p_secret_payload, v_secret_name);
  END IF;

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
    IF NOT EXISTS (
      SELECT 1 FROM public.broker_connections
       WHERE user_id = p_user_id
         AND broker  = p_broker
         AND account_id IS NOT DISTINCT FROM p_account_id
         AND purpose = 'journal'
    ) THEN
      SELECT account_type INTO v_acct_type
        FROM public.profiles
        WHERE id = p_user_id;

      SELECT COUNT(*) INTO v_active_cnt
        FROM public.broker_connections
        WHERE user_id = p_user_id
          AND is_active = true
          AND purpose = 'journal';

      IF COALESCE(v_acct_type, 'free') IN ('free', 'trial', 'basic') AND v_active_cnt >= 1 THEN
        RAISE EXCEPTION 'broker_connection_limit_exceeded' USING ERRCODE = 'P0001';
      END IF;
    END IF;

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
    ON CONFLICT (user_id, broker, account_id, purpose) DO UPDATE
      SET auth_method            = 'oauth',
          status                 = 'connected',
          connected_at           = now(),
          connection_data        = COALESCE(public.broker_connections.connection_data, '{}'::jsonb)
                                     || jsonb_build_object('vault_secret_id', v_vault_id::text),
          environment            = EXCLUDED.environment,
          token_expires_at       = EXCLUDED.token_expires_at,
          oauth_scope            = COALESCE(EXCLUDED.oauth_scope, public.broker_connections.oauth_scope),
          oauth_provider_user_id = COALESCE(EXCLUDED.oauth_provider_user_id, public.broker_connections.oauth_provider_user_id),
          account_name           = COALESCE(EXCLUDED.account_name, public.broker_connections.account_name),
          connection_name        = COALESCE(EXCLUDED.connection_name, public.broker_connections.connection_name),
          is_prop_firm           = COALESCE(EXCLUDED.is_prop_firm, public.broker_connections.is_prop_firm),
          is_active              = true,
          disconnected_at        = NULL,
          error_count            = 0
    RETURNING id INTO v_resolved_connection_id;
  END IF;

  RETURN v_vault_id;
END;
$function$;

COMMENT ON FUNCTION public.oauth_vault_upsert_atomic IS
  'Atomically upsert OAuth token secret in vault and update broker_connections row. Per-connection vault secret keyed by account_id (multi-Tradovate, 2026-06-19). Added 2026-06-20: non-premium users (free/trial/basic) are limited to one active journal connection; reconnects and ON CONFLICT updates are always allowed.';

GRANT EXECUTE ON FUNCTION public.oauth_vault_upsert_atomic TO service_role;
