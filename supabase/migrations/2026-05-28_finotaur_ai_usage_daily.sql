-- ============================================
-- FINOTAUR AI — Daily Usage Counters + Limit RPC
-- ============================================
-- Per-user, per-service, per-day usage counters for the Journal Coach.
-- Write path is service_role only (backend increments via upsert).
-- Read path is open to authenticated users (for "X of Y messages used today" UI).
--
-- Used by: finotaur-server/src/lib/journalAiGate.ts (increment on every AI call)
-- Read by: finotaur-frontend/src/components/journal/ai/UsageBadge.tsx
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id   uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service   text    NOT NULL,
  date      date    NOT NULL DEFAULT CURRENT_DATE,
  count     int     NOT NULL DEFAULT 0,
  tokens    int     NOT NULL DEFAULT 0,
  cost_usd  numeric(10, 6) NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, service, date)
);

-- Primary access pattern: load today's usage for a user across all services
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON ai_usage_daily (user_id, date DESC);

-- ============================================
-- RLS: users read own rows; only service_role can write
-- ============================================
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own counters (for display in the UI)
DROP POLICY IF EXISTS "users_read_own_usage" ON ai_usage_daily;
CREATE POLICY "users_read_own_usage" ON ai_usage_daily
  FOR SELECT USING (user_id = auth.uid());

-- Only service_role may INSERT or UPDATE — anon/authenticated are blocked from writes
DROP POLICY IF EXISTS "service_role_write_usage" ON ai_usage_daily;
CREATE POLICY "service_role_write_usage" ON ai_usage_daily
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE  ai_usage_daily IS 'Per-user per-service daily call/token/cost counters for Journal Coach. Incremented by service_role backend; read by frontend usage badge.';
COMMENT ON COLUMN ai_usage_daily.service IS 'Logical service key: journal_coach_chat | journal_coach_briefing';
COMMENT ON COLUMN ai_usage_daily.count IS 'Number of AI calls made by this user for this service today';
COMMENT ON COLUMN ai_usage_daily.tokens IS 'Total tokens (input + output) consumed today for this service';
COMMENT ON COLUMN ai_usage_daily.cost_usd IS 'Estimated USD cost for today (computed from per-model pricing table, not provider invoice)';

-- ============================================
-- RPC: check_journal_ai_limit
-- Called by journalAiGate.ts before every AI call to enforce daily limits.
-- SECURITY DEFINER so the function can read ai_usage_daily regardless of
-- the caller's RLS context (gate must work even for service_role calls).
-- ============================================
CREATE OR REPLACE FUNCTION check_journal_ai_limit(
  p_user_id uuid,
  p_service  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_limit int;
BEGIN
  -- Hardcoded per-service Premium limits.
  -- Admin / lifetime override is handled upstream in journalAiGate.ts
  -- (those callers skip this function entirely).
  v_limit := CASE p_service
    WHEN 'journal_coach_chat'     THEN 7
    WHEN 'journal_coach_briefing' THEN 1
    ELSE 0   -- unknown service → always blocked
  END;

  SELECT COALESCE(count, 0)
    INTO v_count
    FROM ai_usage_daily
   WHERE user_id = p_user_id
     AND service  = p_service
     AND date     = CURRENT_DATE;

  -- COALESCE again in case the SELECT found no row (variable stays NULL from INTO)
  v_count := COALESCE(v_count, 0);

  RETURN jsonb_build_object(
    'count',     v_count,
    'limit',     v_limit,
    'allowed',   v_count < v_limit,
    'remaining', GREATEST(v_limit - v_count, 0)
  );
END;
$$;

-- Grant EXECUTE to authenticated so the frontend can call this via supabase.rpc()
-- if needed (e.g. to pre-flight disable the "Ask" button before sending a message).
GRANT EXECUTE ON FUNCTION check_journal_ai_limit(uuid, text) TO authenticated;

COMMENT ON FUNCTION check_journal_ai_limit(uuid, text) IS
  'Returns { count, limit, allowed, remaining } for a user+service combo today. '
  'Hardcoded Premium limits: journal_coach_chat=7, journal_coach_briefing=1. '
  'Admin/lifetime bypass is enforced upstream in middleware, not here.';
