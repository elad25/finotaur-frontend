-- Account-level copier sync to the journal (Elad, 2026-06-26).
-- The copier now keys off the SAME per-account identity the journal shows (public.portfolios),
-- NOT broker_connections (which only holds the OAuth anchor account, so the copier saw ~2
-- accounts while the journal shows ~65). 0 existing routes/targets → additive ALTER is safe.
-- Identity = the Tradovate account: account_id (= portfolios.tradovate_account_id) + account_name
-- (= portfolios.name, the NinjaTrader-usable account name). Execution stays LOCAL (NinjaScript).

-- ── 1. routes: add account identity; relax the (now-optional) connection FK ──────────────
ALTER TABLE public.automation_copier_routes
  ALTER COLUMN source_connection_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_account_id    text,
  ADD COLUMN IF NOT EXISTS source_account_name  text,
  ADD COLUMN IF NOT EXISTS source_broker        text,
  ADD COLUMN IF NOT EXISTS source_environment   text;

-- ── 2. targets: add account identity; relax FK; swap uniqueness connection→account ───────
ALTER TABLE public.automation_copier_route_targets
  ALTER COLUMN destination_connection_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS destination_account_id   text,
  ADD COLUMN IF NOT EXISTS destination_account_name text,
  ADD COLUMN IF NOT EXISTS destination_broker       text,
  ADD COLUMN IF NOT EXISTS destination_environment  text;

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.automation_copier_route_targets'::regclass AND contype = 'u'
     AND pg_get_constraintdef(oid) ILIKE '%destination_connection_id%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.automation_copier_route_targets DROP CONSTRAINT %I', c);
  END IF;
END$$;
ALTER TABLE public.automation_copier_route_targets
  DROP CONSTRAINT IF EXISTS acrt_route_dest_acct_uniq;
ALTER TABLE public.automation_copier_route_targets
  ADD CONSTRAINT acrt_route_dest_acct_uniq UNIQUE (route_id, destination_account_id);

-- ── 3. ownership helper: does this user own this account? (via journal portfolios OR broker_connections) ──
CREATE OR REPLACE FUNCTION public._automation_user_owns_account(p_uid uuid, p_account_id text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.portfolios p
                  WHERE p.user_id = p_uid AND p.tradovate_account_id::text = p_account_id)
      OR EXISTS (SELECT 1 FROM public.broker_connections c
                  WHERE c.user_id = p_uid AND c.account_id = p_account_id);
$$;
REVOKE ALL ON FUNCTION public._automation_user_owns_account(uuid, text) FROM PUBLIC, anon, authenticated;

-- ── 4. upsert RPC — account-based, ownership validated via portfolios/broker_connections ──
DROP FUNCTION IF EXISTS public.automation_upsert_copier_route(uuid,uuid,text,text[],boolean,boolean,boolean,boolean,jsonb);

CREATE OR REPLACE FUNCTION public.automation_upsert_copier_route(
  p_route_id            uuid,
  p_source_account_id   text,
  p_source_account_name text,
  p_source_broker       text,
  p_source_environment  text,
  p_label               text,
  p_symbol_filter       text[],
  p_copy_opens          boolean,
  p_copy_closes         boolean,
  p_reverse             boolean,
  p_is_active           boolean,
  p_targets             jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_route uuid;
  v_t     jsonb;
  v_dest  text;
  v_keep  text[] := ARRAY[]::text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF p_source_account_id IS NULL THEN RAISE EXCEPTION 'missing_source_account' USING errcode = '22023'; END IF;
  IF NOT public._automation_user_owns_account(v_uid, p_source_account_id) THEN
    RAISE EXCEPTION 'source_not_owned' USING errcode = '42501';
  END IF;

  IF p_route_id IS NULL THEN
    INSERT INTO public.automation_copier_routes
      (user_id, source_account_id, source_account_name, source_broker, source_environment,
       label, symbol_filter, copy_opens, copy_closes, reverse, is_active)
    VALUES
      (v_uid, p_source_account_id, p_source_account_name, p_source_broker, p_source_environment,
       p_label, p_symbol_filter, COALESCE(p_copy_opens,true), COALESCE(p_copy_closes,true),
       COALESCE(p_reverse,false), COALESCE(p_is_active,true))
    RETURNING id INTO v_route;
  ELSE
    UPDATE public.automation_copier_routes
       SET source_account_id = p_source_account_id, source_account_name = p_source_account_name,
           source_broker = p_source_broker, source_environment = p_source_environment,
           label = p_label, symbol_filter = p_symbol_filter,
           copy_opens = COALESCE(p_copy_opens,true), copy_closes = COALESCE(p_copy_closes,true),
           reverse = COALESCE(p_reverse,false), is_active = COALESCE(p_is_active,true), updated_at = now()
     WHERE id = p_route_id AND user_id = v_uid
     RETURNING id INTO v_route;
    IF v_route IS NULL THEN RAISE EXCEPTION 'route_not_owned' USING errcode = '42501'; END IF;
  END IF;

  IF p_targets IS NOT NULL THEN
    FOR v_t IN SELECT * FROM jsonb_array_elements(p_targets) LOOP
      v_dest := v_t->>'destination_account_id';
      IF v_dest IS NULL OR v_dest = '' THEN CONTINUE; END IF;
      IF v_dest = p_source_account_id THEN RAISE EXCEPTION 'source_equals_destination' USING errcode = '22023'; END IF;
      IF NOT public._automation_user_owns_account(v_uid, v_dest) THEN
        RAISE EXCEPTION 'destination_not_owned' USING errcode = '42501';
      END IF;
      INSERT INTO public.automation_copier_route_targets
        (route_id, destination_account_id, destination_account_name, destination_broker,
         destination_environment, scale_ratio, max_contracts, is_active)
      VALUES
        (v_route, v_dest, v_t->>'destination_account_name', v_t->>'destination_broker',
         v_t->>'destination_environment', COALESCE((v_t->>'scale_ratio')::numeric, 1.0),
         NULLIF(v_t->>'max_contracts','')::int, COALESCE((v_t->>'is_active')::boolean, true))
      ON CONFLICT (route_id, destination_account_id) DO UPDATE
        SET destination_account_name = EXCLUDED.destination_account_name,
            destination_broker       = EXCLUDED.destination_broker,
            destination_environment  = EXCLUDED.destination_environment,
            scale_ratio              = EXCLUDED.scale_ratio,
            max_contracts            = EXCLUDED.max_contracts,
            is_active                = EXCLUDED.is_active;
      v_keep := array_append(v_keep, v_dest);
    END LOOP;
  END IF;

  DELETE FROM public.automation_copier_route_targets
   WHERE route_id = v_route AND NOT (destination_account_id = ANY(v_keep));

  RETURN v_route;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_upsert_copier_route(uuid,text,text,text,text,text,text[],boolean,boolean,boolean,boolean,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_upsert_copier_route(uuid,text,text,text,text,text,text[],boolean,boolean,boolean,boolean,jsonb) TO authenticated;

-- ── 5. agent config — return accounts[] from the journal portfolios + bump version on portfolio change ──
CREATE OR REPLACE FUNCTION public.automation_get_config(
  p_user_id        uuid,
  p_known_version  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_version     text;
  v_settings    jsonb;
  v_rules       jsonb;
  v_routes      jsonb;
  v_connections jsonb;
  v_accounts    jsonb;
  v_master      boolean;
  v_kill        boolean;
BEGIN
  SELECT to_char(
           COALESCE(GREATEST(
             (SELECT max(updated_at) FROM public.automation_settings           WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_risk_rules          WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.automation_copier_routes       WHERE user_id = p_user_id),
             (SELECT max(t.created_at) FROM public.automation_copier_route_targets t
                JOIN public.automation_copier_routes r ON r.id = t.route_id
               WHERE r.user_id = p_user_id),
             (SELECT max(updated_at) FROM public.broker_connections             WHERE user_id = p_user_id),
             (SELECT max(updated_at) FROM public.portfolios                     WHERE user_id = p_user_id)
           ), timestamptz 'epoch'),
           'YYYYMMDDHH24MISSUS')
    INTO v_version;

  SELECT s.master_enabled, s.kill_switch_engaged INTO v_master, v_kill
    FROM public.automation_settings s WHERE s.user_id = p_user_id;
  v_master := COALESCE(v_master, false);
  v_kill   := COALESCE(v_kill,   false);

  IF p_known_version IS NOT NULL AND p_known_version = v_version THEN
    RETURN jsonb_build_object(
      'unchanged', true, 'config_version', v_version,
      'master_enabled', v_master, 'kill_switch_engaged', v_kill, 'served_at', now());
  END IF;

  SELECT to_jsonb(s) INTO v_settings FROM public.automation_settings s WHERE s.user_id = p_user_id;
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object('master_enabled', false, 'kill_switch_engaged', false, 'updated_at', null);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_rules FROM public.automation_risk_rules r
   WHERE r.user_id = p_user_id AND r.is_active = true;

  SELECT COALESCE(jsonb_agg(
           to_jsonb(rt) || jsonb_build_object('targets',
             COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at)
                         FROM public.automation_copier_route_targets t
                        WHERE t.route_id = rt.id AND t.is_active = true), '[]'::jsonb))
           ORDER BY rt.created_at), '[]'::jsonb)
    INTO v_routes FROM public.automation_copier_routes rt
   WHERE rt.user_id = p_user_id AND rt.is_active = true;

  -- accounts = the journal's tradeable account universe (same as the Trader dropdown)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'account_id',   p.tradovate_account_id::text,
           'account_name', p.name,
           'broker',       p.source,
           'environment',  p.environment,
           'is_active',    p.is_active
         ) ORDER BY p.name), '[]'::jsonb)
    INTO v_accounts FROM public.portfolios p
   WHERE p.user_id = p_user_id AND p.is_active = true
     AND p.source = 'tradovate' AND p.tradovate_account_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id, 'broker', c.broker, 'environment', c.environment,
           'account_id', c.account_id, 'is_active', c.is_active, 'status', c.status
         ) ORDER BY c.created_at), '[]'::jsonb)
    INTO v_connections FROM public.broker_connections c WHERE c.user_id = p_user_id;

  RETURN jsonb_build_object(
    'unchanged', false, 'config_version', v_version,
    'settings', v_settings, 'risk_rules', v_rules, 'copier_routes', v_routes,
    'accounts', v_accounts, 'connections', v_connections,
    'master_enabled', v_master, 'kill_switch_engaged', v_kill, 'served_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.automation_get_config(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.automation_get_config(uuid, text) TO service_role;

COMMENT ON FUNCTION public.automation_upsert_copier_route(uuid,text,text,text,text,text,text[],boolean,boolean,boolean,boolean,jsonb) IS
  'Account-level copier route upsert. Source/targets are journal accounts (portfolios.tradovate_account_id + name); ownership validated via portfolios/broker_connections. Local NinjaScript execution.';
COMMENT ON FUNCTION public.automation_get_config(uuid, text) IS
  'Service-role only. Adds accounts[] (the journal tradeable account universe from portfolios) so the agent + copier UI see exactly the journal accounts; version bumps on portfolio changes.';
