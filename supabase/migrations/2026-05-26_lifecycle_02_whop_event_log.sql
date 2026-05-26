-- ============================================================================
-- Migration: lifecycle_02_whop_event_log
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Idempotency + audit log for inbound Whop webhook events.
--          Every POST /api/webhooks/whop event_id lands here first; second
--          delivery of the same event_id is detected and skipped.
--
-- Why: Whop (like every webhook provider) may re-deliver events on network
--      hiccup. Without idempotency we'd double-process: double-email,
--      double-cancel, double-charge attempts. This table is the source of
--      truth for "did we already handle this event?"
--
-- Design:
--   - PRIMARY KEY on event_id (Whop's UUID) — second insert fails with
--     unique violation → handler returns 200 OK silently
--   - signature stored for forensic audit (debugging signature mismatches)
--   - payload kept JSONB for full forensic replay
--   - processed_at NULL until handler completes successfully
--   - processing_error captures the SQLSTATE/message if a handler crashed
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS public.whop_event_log;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whop_event_log (
  event_id            TEXT PRIMARY KEY,
  event_type          TEXT NOT NULL,
  signature           TEXT,
  payload             JSONB NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  processing_error    TEXT,
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  related_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_whop_event_log_event_type_received
  ON public.whop_event_log (event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_whop_event_log_unprocessed
  ON public.whop_event_log (received_at DESC)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whop_event_log_related_user
  ON public.whop_event_log (related_user_id, received_at DESC)
  WHERE related_user_id IS NOT NULL;

-- RLS
ALTER TABLE public.whop_event_log ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated read — webhook log is service-role-only + admin view (P2).

COMMENT ON TABLE public.whop_event_log IS
  'Inbound Whop webhook events. Idempotency via event_id PRIMARY KEY. Service-role write only; admin reads via SECURITY DEFINER view (P2). Added 2026-05-26.';

COMMENT ON COLUMN public.whop_event_log.signature IS
  'X-Whop-Signature header value at receive time. Stored for forensic audit if signature verification ever fails in prod.';

COMMENT ON COLUMN public.whop_event_log.processed_at IS
  'NULL = received but handler did not complete. Non-null = handler finished successfully. Combined with processing_error to triage failures.';

COMMENT ON COLUMN public.whop_event_log.attempt_count IS
  'Incremented each time the handler re-runs (e.g. via manual replay tool). 0 = never attempted.';
