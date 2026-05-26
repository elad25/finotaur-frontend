-- ============================================================================
-- Migration: lifecycle_01_lifecycle_events
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
-- Tree: Cross-cutting (lifecycle observability platform)
--
-- Purpose: Create the analytical backbone for subscription lifecycle —
--          every signup, paywall hit, cancel, expire, reactivate, delete event
--          gets a row here. Read by Admin CRM (P2), Weekly Claude Report (P2),
--          and churn-cohort analytics.
--
-- Why: Today the only "what happened to this user" trail lives across 4-5
--      tables (profiles columns, subscription_cancellation_feedback,
--      admin_audit_logs, ai_usage). No single chronological timeline.
--      This table consolidates by event_type + occurred_at.
--
-- Design:
--   - service_role + emit_lifecycle_event() RPC write
--   - authenticated users read only their own events (RLS)
--   - admin reads all via admin_audit_logs_enriched-style view (P2)
--   - event_data JSONB for flexible payload per event type
--   - source enum-ish: whop_webhook | user_action | cron | admin | system
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS public.lifecycle_events;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  event_data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  source          TEXT NOT NULL CHECK (source IN (
                    'whop_webhook',
                    'user_action',
                    'cron',
                    'admin',
                    'system',
                    'frontend'
                  )),
  source_id       TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT lifecycle_events_event_type_check CHECK (event_type IN (
    -- Signup / activation
    'signup_started',
    'signup_completed',
    'onboarding_completed',
    'first_login',
    'first_trade',
    'first_paid',

    -- Subscription lifecycle
    'subscription_created',
    'subscription_renewed',
    'tier_upgrade',
    'tier_downgrade',
    'payment_succeeded',
    'payment_failed',
    'refund_issued',

    -- Cancel / expire / reactivate
    'cancel_requested',
    'cancel_effective',
    'reactivated',
    'about_to_expire_reminder_sent',
    'subscription_expired',

    -- Win-back
    'winback_email_sent',
    'winback_clicked',

    -- Delete / archive
    'delete_requested',
    'delete_cancelled',
    'delete_effective',
    'archived',
    'anonymized',
    'permanently_deleted',

    -- Engagement / churn signals
    'paywall_hit',
    'churn_signal_low_activity',
    'feedback_submitted',
    'data_exported'
  ))
);

-- Indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_user_id_occurred
  ON public.lifecycle_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_event_type_occurred
  ON public.lifecycle_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_source_occurred
  ON public.lifecycle_events (source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_event_data_gin
  ON public.lifecycle_events USING GIN (event_data);

-- RLS
ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Users can read their OWN events only
CREATE POLICY "lifecycle_events_user_own_read"
  ON public.lifecycle_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS by default — no explicit policy needed for writes.
-- Admin reads handled by SECURITY DEFINER view in a P2 migration.

COMMENT ON TABLE public.lifecycle_events IS
  'Append-only analytical event log for user lifecycle (signup→cancel→delete). Written by emit_lifecycle_event() RPC + Whop webhook handler. Read by Admin CRM Lifecycle Timeline and Weekly Claude Report. Added 2026-05-26 account-cancellation-flow session.';

COMMENT ON COLUMN public.lifecycle_events.source IS
  'Origin of the event. whop_webhook=Whop POSTed it; user_action=in-app user click; cron=scheduled job; admin=admin tool; system=internal trigger; frontend=client-side telemetry.';

COMMENT ON COLUMN public.lifecycle_events.source_id IS
  'Optional reference back to the originating record (e.g. whop_event_log.event_id, admin_audit_logs.id). Free-form text to allow cross-table references.';

COMMENT ON COLUMN public.lifecycle_events.event_data IS
  'Per-event-type payload. Example for cancel_requested: {"plan":"finotaur","reason_id":"too_expensive","duration_days":127}. Schema enforced in application layer.';
