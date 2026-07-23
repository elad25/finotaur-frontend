-- Multi-broker connections — Phase 1
-- Goal: let any user (all tiers) hold MULTIPLE active journal broker connections,
-- and make the single-owner supersede scoped to WITHIN one user (never cross-user).
--
-- Changes:
--   1. Drop the per-user connection-count cap trigger + function.
--   2. Redefine oauth_vault_upsert_atomic WITHOUT the duplicate cap block.
--   3. Scope enforce_single_owner_per_broker_account() to the same user_id.
--
-- Reversible: recreate the dropped trigger/function and re-add the cap block if needed.

BEGIN;

-- 1. Remove the per-user connection cap (backstop trigger on non-RPC insert paths).
DROP TRIGGER IF EXISTS zz_enforce_broker_connection_limit ON public.broker_connections;
DROP FUNCTION IF EXISTS public.enforce_broker_connection_limit();

-- 2. Redefine the vault upsert RPC without the cap check (cap block removed;
--    unused v_acct_type / v_active_cnt declarations dropped). Everything else
--    is byte-for-byte the live definition.
CREATE OR REPLACE FUNCTION public.oauth_vault_upsert_atomic(
  p_connection_id uuid,
  p_user_id uuid,
  p_broker text,
  p_environment text,
  p_secret_name text,
  p_secret_payload text,
  p_token_expires_at timestamp with time zone,
  p_oauth_scope text,
  p_oauth_provider_user_id text,
  p_account_id text,
  p_account_name text,
  p_connection_name text,
  p_is_prop_firm boolean
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

-- 3. Scope the single-owner supersede to the SAME user (no cross-user silent supersede).
CREATE OR REPLACE FUNCTION public.enforce_single_owner_per_broker_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
       AND user_id    = NEW.user_id      -- Phase 1: scope supersede to the same user only.
       AND id        != NEW.id
       AND is_active  = true
       AND broker     IN ('tradovate', 'ninja_trader');
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
