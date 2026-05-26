-- ============================================================================
-- Migration: lifecycle_08_emit_lifecycle_helpers
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Helper RPCs to emit rows into lifecycle_events. Wraps the INSERT
--          with validation, defaults, and SECURITY DEFINER so server code
--          (Node.js Express, edge functions) and admin tools can call it
--          without direct table grants.
--
-- Why: A function-based emit pattern lets us:
--   1. Validate event_type against the CHECK constraint at function level
--      with a friendlier error message
--   2. Default source from caller context (service_role → 'system', etc.)
--   3. Centralize any future cross-cutting concern (e.g. anomaly detection)
--   4. Keep direct INSERTs to lifecycle_events service-role-only
--
-- Functions added:
--   - emit_lifecycle_event(user_id, event_type, event_data, source, source_id)
--     — general-purpose emitter
--   - emit_lifecycle_signup(user_id, source_data)
--     — convenience: signup_completed shortcut
--   - emit_lifecycle_subscription_change(user_id, from_tier, to_tier, source)
--     — convenience: tier_upgrade or tier_downgrade based on direction
--
-- Rollback (manual):
--   DROP FUNCTION IF EXISTS public.emit_lifecycle_event(UUID, TEXT, JSONB, TEXT, TEXT);
--   DROP FUNCTION IF EXISTS public.emit_lifecycle_signup(UUID, JSONB);
--   DROP FUNCTION IF EXISTS public.emit_lifecycle_subscription_change(UUID, TEXT, TEXT, TEXT);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.emit_lifecycle_event(
  p_user_id      UUID,
  p_event_type   TEXT,
  p_event_data   JSONB DEFAULT '{}'::jsonb,
  p_source       TEXT  DEFAULT 'system',
  p_source_id    TEXT  DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id BIGINT;
BEGIN
  INSERT INTO lifecycle_events (user_id, event_type, event_data, source, source_id)
  VALUES (p_user_id, p_event_type, COALESCE(p_event_data, '{}'::jsonb), p_source, p_source_id)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;

EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'Invalid event_type=% (must match lifecycle_events.event_type CHECK constraint)', p_event_type
    USING HINT = 'See migration 2026-05-26_lifecycle_01_lifecycle_events.sql for the full enum list.';
END;
$$;

ALTER FUNCTION public.emit_lifecycle_event(UUID, TEXT, JSONB, TEXT, TEXT) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.emit_lifecycle_event(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_lifecycle_event(UUID, TEXT, JSONB, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.emit_lifecycle_event(UUID, TEXT, JSONB, TEXT, TEXT) IS
  'Insert a row into lifecycle_events with validation. Used by Whop webhook handler, user-action endpoints, cron jobs, and admin tools. Added 2026-05-26.';

-- Convenience: signup
CREATE OR REPLACE FUNCTION public.emit_lifecycle_signup(
  p_user_id     UUID,
  p_source_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.emit_lifecycle_event(
    p_user_id,
    'signup_completed',
    p_source_data,
    'user_action',
    NULL
  );
END;
$$;

ALTER FUNCTION public.emit_lifecycle_signup(UUID, JSONB) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.emit_lifecycle_signup(UUID, JSONB) TO service_role;

-- Convenience: tier change (auto-detect direction)
CREATE OR REPLACE FUNCTION public.emit_lifecycle_subscription_change(
  p_user_id   UUID,
  p_from_tier TEXT,
  p_to_tier   TEXT,
  p_source    TEXT DEFAULT 'whop_webhook',
  p_source_id TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_rank    JSONB := '{"free":0,"core":1,"pro":2,"finotaur":3,"elite":4,"enterprise":5}'::jsonb;
  v_from_rank    INTEGER;
  v_to_rank      INTEGER;
  v_event_type   TEXT;
BEGIN
  v_from_rank := COALESCE((v_tier_rank ->> p_from_tier)::INTEGER, -1);
  v_to_rank   := COALESCE((v_tier_rank ->> p_to_tier)::INTEGER, -1);

  IF v_to_rank > v_from_rank THEN
    v_event_type := 'tier_upgrade';
  ELSIF v_to_rank < v_from_rank THEN
    v_event_type := 'tier_downgrade';
  ELSE
    v_event_type := 'subscription_renewed';
  END IF;

  RETURN public.emit_lifecycle_event(
    p_user_id,
    v_event_type,
    jsonb_build_object('from_tier', p_from_tier, 'to_tier', p_to_tier),
    p_source,
    p_source_id
  );
END;
$$;

ALTER FUNCTION public.emit_lifecycle_subscription_change(UUID, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.emit_lifecycle_subscription_change(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.emit_lifecycle_subscription_change(UUID, TEXT, TEXT, TEXT, TEXT) IS
  'Auto-detects tier_upgrade vs tier_downgrade vs subscription_renewed based on from/to tier rank. Tier ranking: free<core<pro<finotaur<elite<enterprise.';
