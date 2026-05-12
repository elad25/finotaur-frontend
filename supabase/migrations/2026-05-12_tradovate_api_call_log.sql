-- 2026-05-12: Tradovate API call observability table.
-- Phase 1A.2 of scale-readiness (see MASTER_PLAN OQ-64).
--
-- PURPOSE
-- =======
-- Persistent log of Tradovate API responses that signal rate-limit pressure
-- (HTTP 429 + Tradovate's `p-time` / `p-ticket` headers) and other non-2xx
-- outcomes. Drives:
--   1. C.1 measurement — what's our actual per-IP 429 threshold?
--   2. Per-user backoff intelligence — which users / endpoints hit limits?
--   3. Capacity planning — at what point does rate pressure start?
--
-- WRITE PATTERN
-- =============
-- Edge functions tradovate-sync and tradovate-auth call this via fire-and-
-- forget INSERT (errors swallowed; logging never blocks the sync). The
-- shared `_shared/fetchWithRetry.ts` helper handles the insertion when its
-- caller wires an admin client + userId via opts.
--
-- RETENTION
-- =========
-- 90-day rolling window (pruned by a future cron job — separate session).
-- Not retained beyond that — observability data, not audit trail.
--
-- RLS
-- ===
-- Service role only (writes happen from edge function with SUPABASE_SERVICE_ROLE_KEY).
-- No anon / authenticated access. Admin dashboard would read via service role.
--
-- ROLLBACK
-- ========
-- DROP TABLE IF EXISTS public.tradovate_api_call_log;

CREATE TABLE IF NOT EXISTS public.tradovate_api_call_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  endpoint        text        NOT NULL,
  http_status     smallint    NOT NULL,
  attempt         smallint    NOT NULL DEFAULT 1,
  -- duration of THIS attempt only (not cumulative across retries)
  duration_ms     integer,
  -- Tradovate 429 fields — null when status != 429
  p_time_sec      numeric,
  p_ticket_present boolean,
  -- Caller context — both nullable so the table is usable from unattributed paths
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connection_id   uuid,  -- broker_connections.id when known
  label           text,  -- "tradovate-sync" | "tradovate-auth" | other
  error_msg       text   -- short error string, e.g. "TOKEN_EXPIRED", "Fill fetch failed: 503"
);

-- Time-series scan: "show me last 24h of API activity"
CREATE INDEX IF NOT EXISTS idx_tradovate_api_call_log_created_at
  ON public.tradovate_api_call_log (created_at DESC);

-- 429 / 5xx detection: "how many 429s in the last hour?"
-- Partial index keeps it cheap — 99%+ of calls are 200 OK.
CREATE INDEX IF NOT EXISTS idx_tradovate_api_call_log_errors
  ON public.tradovate_api_call_log (http_status, created_at DESC)
  WHERE http_status >= 400;

-- Per-user / per-connection investigation: "which connection is hitting 429s?"
CREATE INDEX IF NOT EXISTS idx_tradovate_api_call_log_user_created
  ON public.tradovate_api_call_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.tradovate_api_call_log ENABLE ROW LEVEL SECURITY;

-- Service role only. Edge functions write via SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS, so this policy is documentation more than enforcement.
DROP POLICY IF EXISTS "service_role_full_access" ON public.tradovate_api_call_log;
CREATE POLICY "service_role_full_access" ON public.tradovate_api_call_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.tradovate_api_call_log IS
  'Tradovate API observability — captures 429s + non-2xx responses for rate-limit '
  'measurement and capacity planning. Phase 1A.2 of scale-readiness (OQ-64). '
  'Writes are fire-and-forget from edge functions via shared/fetchWithRetry.ts. '
  '90-day retention (pruning cron TBD).';
