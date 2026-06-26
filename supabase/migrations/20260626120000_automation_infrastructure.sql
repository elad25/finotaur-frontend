-- ============================================================================
-- Automation Infrastructure — Session 1 ("The Brain")
-- Web control-plane for Risk Management + Trade Copier.
-- ADDITIVE ONLY. Read-only relative to brokers. No execution. Beta-gated in app.
-- Separate from legacy portfolio_copy_rules / process_copy_rules (journal-row copy).
-- Tables: automation_settings, automation_risk_rules, automation_copier_routes,
--         automation_copier_route_targets, automation_agent_devices, automation_events
-- RLS: per-user (user_id = auth.uid()) + admin override (rls_check_admin + admin_mode).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. automation_settings — per-user global switches (master + kill-switch)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_settings (
  user_id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  master_enabled       boolean NOT NULL DEFAULT false,
  kill_switch_engaged  boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. automation_risk_rules — risk limits (per-user; optional per-connection)
--    broker_connection_id NULL = the user's global default rule-set.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_risk_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broker_connection_id  uuid REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  label                 text,
  daily_loss_limit_usd  numeric(15,2),
  max_contracts         integer,
  max_position_usd      numeric(15,2),
  max_trades_per_day    integer,
  tilt_loss_streak      integer,
  tilt_cooldown_minutes integer,
  enforce               boolean NOT NULL DEFAULT false,  -- false=monitor only; true=agent enforces (S2+)
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
-- one rule-set per (user, connection); one global rule-set per user (connection IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS automation_risk_rules_user_conn_uniq
  ON public.automation_risk_rules (user_id, broker_connection_id)
  WHERE broker_connection_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS automation_risk_rules_user_global_uniq
  ON public.automation_risk_rules (user_id)
  WHERE broker_connection_id IS NULL;

-- ----------------------------------------------------------------------------
-- 3. automation_copier_routes — source account -> (targets). user-to-self only.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_copier_routes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_connection_id  uuid NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  label                 text,
  symbol_filter         text[],                          -- NULL = all symbols
  copy_opens            boolean NOT NULL DEFAULT true,
  copy_closes           boolean NOT NULL DEFAULT true,
  reverse               boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_copier_routes_user_idx
  ON public.automation_copier_routes (user_id);

-- 3b. route targets (one row per destination account; per-target scale + cap)
CREATE TABLE IF NOT EXISTS public.automation_copier_route_targets (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                  uuid NOT NULL REFERENCES public.automation_copier_routes(id) ON DELETE CASCADE,
  destination_connection_id uuid NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  scale_ratio               numeric(6,3) NOT NULL DEFAULT 1.0,
  max_contracts             integer,
  is_active                 boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, destination_connection_id)
);

-- ----------------------------------------------------------------------------
-- 4. automation_agent_devices — desktop agent registry (created now; written S2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_agent_devices (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name              text,
  platform                 text NOT NULL DEFAULT 'ninjatrader'
                             CHECK (platform IN ('ninjatrader')),
  pairing_code             text,
  pairing_code_expires_at  timestamptz,
  device_token_hash        text,                         -- hash only; never raw token
  status                   text NOT NULL DEFAULT 'unpaired'
                             CHECK (status IN ('unpaired','online','offline','error')),
  last_heartbeat_at        timestamptz,
  agent_version            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_agent_devices_user_idx
  ON public.automation_agent_devices (user_id);

-- ----------------------------------------------------------------------------
-- 5. automation_events — audit log (created now; agent writes in S2/S3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id             uuid REFERENCES public.automation_agent_devices(id) ON DELETE SET NULL,
  event_type            text NOT NULL
                          CHECK (event_type IN ('risk_alert','risk_enforced','copy_executed','copy_failed','agent_status','kill_switch')),
  severity              text NOT NULL DEFAULT 'info'
                          CHECK (severity IN ('info','warning','critical')),
  broker_connection_id  uuid REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  symbol                text,
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_events_user_created_idx
  ON public.automation_events (user_id, created_at DESC);

-- ============================================================================
-- RLS — enable + per-user owner policies (+ admin override)
-- ============================================================================
ALTER TABLE public.automation_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_risk_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_copier_routes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_copier_route_targets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_agent_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events                ENABLE ROW LEVEL SECURITY;

-- owner-or-admin, applied for ALL commands. Helper: rls_check_admin/admin_mode.
-- automation_settings
DROP POLICY IF EXISTS automation_settings_owner ON public.automation_settings;
CREATE POLICY automation_settings_owner ON public.automation_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()))
  WITH CHECK (user_id = auth.uid());

-- automation_risk_rules
DROP POLICY IF EXISTS automation_risk_rules_owner ON public.automation_risk_rules;
CREATE POLICY automation_risk_rules_owner ON public.automation_risk_rules
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()))
  WITH CHECK (user_id = auth.uid());

-- automation_copier_routes
DROP POLICY IF EXISTS automation_copier_routes_owner ON public.automation_copier_routes;
CREATE POLICY automation_copier_routes_owner ON public.automation_copier_routes
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()))
  WITH CHECK (user_id = auth.uid());

-- automation_copier_route_targets (ownership via parent route)
DROP POLICY IF EXISTS automation_copier_route_targets_owner ON public.automation_copier_route_targets;
CREATE POLICY automation_copier_route_targets_owner ON public.automation_copier_route_targets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.automation_copier_routes r
            WHERE r.id = route_id AND r.user_id = auth.uid())
    OR (public.rls_check_admin() AND public.rls_check_admin_mode())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.automation_copier_routes r
            WHERE r.id = route_id AND r.user_id = auth.uid())
  );

-- automation_agent_devices
DROP POLICY IF EXISTS automation_agent_devices_owner ON public.automation_agent_devices;
CREATE POLICY automation_agent_devices_owner ON public.automation_agent_devices
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()))
  WITH CHECK (user_id = auth.uid());

-- automation_events (insert by owner; agent service path added in S2)
DROP POLICY IF EXISTS automation_events_owner ON public.automation_events;
CREATE POLICY automation_events_owner ON public.automation_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()))
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_settings              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_risk_rules            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_copier_routes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_copier_route_targets  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_agent_devices         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_events                TO authenticated;

-- ============================================================================
-- RPC — atomic copier route upsert (route + targets) with ownership validation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.automation_upsert_copier_route(
  p_route_id      uuid,
  p_source        uuid,
  p_label         text,
  p_symbol_filter text[],
  p_copy_opens    boolean,
  p_copy_closes   boolean,
  p_reverse       boolean,
  p_is_active     boolean,
  p_targets       jsonb   -- [{destination_connection_id, scale_ratio, max_contracts, is_active}]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_route uuid;
  v_t     jsonb;
  v_dest  uuid;
  v_keep  uuid[] := ARRAY[]::uuid[];
BEGIN
  -- source must belong to the caller
  IF NOT EXISTS (SELECT 1 FROM public.broker_connections c
                 WHERE c.id = p_source AND c.user_id = v_uid) THEN
    RAISE EXCEPTION 'source_not_owned' USING errcode = '42501';
  END IF;

  IF p_route_id IS NULL THEN
    INSERT INTO public.automation_copier_routes
      (user_id, source_connection_id, label, symbol_filter, copy_opens, copy_closes, reverse, is_active)
    VALUES
      (v_uid, p_source, p_label, p_symbol_filter, COALESCE(p_copy_opens,true),
       COALESCE(p_copy_closes,true), COALESCE(p_reverse,false), COALESCE(p_is_active,true))
    RETURNING id INTO v_route;
  ELSE
    UPDATE public.automation_copier_routes
       SET source_connection_id = p_source,
           label = p_label, symbol_filter = p_symbol_filter,
           copy_opens = COALESCE(p_copy_opens,true), copy_closes = COALESCE(p_copy_closes,true),
           reverse = COALESCE(p_reverse,false), is_active = COALESCE(p_is_active,true),
           updated_at = now()
     WHERE id = p_route_id AND user_id = v_uid
     RETURNING id INTO v_route;
    IF v_route IS NULL THEN
      RAISE EXCEPTION 'route_not_owned' USING errcode = '42501';
    END IF;
  END IF;

  -- upsert targets
  IF p_targets IS NOT NULL THEN
    FOR v_t IN SELECT * FROM jsonb_array_elements(p_targets) LOOP
      v_dest := (v_t->>'destination_connection_id')::uuid;
      IF v_dest = p_source THEN
        RAISE EXCEPTION 'source_equals_destination' USING errcode = '22023';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.broker_connections c
                     WHERE c.id = v_dest AND c.user_id = v_uid) THEN
        RAISE EXCEPTION 'destination_not_owned' USING errcode = '42501';
      END IF;

      INSERT INTO public.automation_copier_route_targets
        (route_id, destination_connection_id, scale_ratio, max_contracts, is_active)
      VALUES
        (v_route, v_dest, COALESCE((v_t->>'scale_ratio')::numeric, 1.0),
         NULLIF(v_t->>'max_contracts','')::int, COALESCE((v_t->>'is_active')::boolean, true))
      ON CONFLICT (route_id, destination_connection_id) DO UPDATE
        SET scale_ratio = EXCLUDED.scale_ratio,
            max_contracts = EXCLUDED.max_contracts,
            is_active = EXCLUDED.is_active;

      v_keep := array_append(v_keep, v_dest);
    END LOOP;
  END IF;

  -- prune targets no longer present
  DELETE FROM public.automation_copier_route_targets
   WHERE route_id = v_route
     AND NOT (destination_connection_id = ANY(v_keep));

  RETURN v_route;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_upsert_copier_route(uuid,uuid,text,text[],boolean,boolean,boolean,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_upsert_copier_route(uuid,uuid,text,text[],boolean,boolean,boolean,boolean,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.automation_delete_copier_route(p_route_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.automation_copier_routes
   WHERE id = p_route_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'route_not_owned' USING errcode = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_delete_copier_route(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_delete_copier_route(uuid) TO authenticated;

-- NOTE (contract for S2): automation_get_config(device_token) — the desktop agent's
-- read endpoint — is intentionally NOT created here. It is security-sensitive
-- (device-token auth, service_role read path) and will be authored in Session 2.
-- Shape it will return: { settings, risk_rules[], copier_routes[ {..., targets[]} ] }.

COMMENT ON TABLE public.automation_settings IS 'Per-user automation master switch + kill-switch (web control-plane). Session 1.';
COMMENT ON TABLE public.automation_risk_rules IS 'Per-user (optionally per-connection) risk limits. enforce=false => monitor-only. Session 1.';
COMMENT ON TABLE public.automation_copier_routes IS 'User-to-self copier routes (source connection). Executed locally by desktop agent (S3), NOT via broker cloud API. Session 1.';
COMMENT ON TABLE public.automation_agent_devices IS 'Desktop NinjaScript agent registry. Pairing/heartbeat wired in Session 2.';
COMMENT ON TABLE public.automation_events IS 'Audit of monitor alerts + (S2/S3) agent enforcement/copy actions.';
