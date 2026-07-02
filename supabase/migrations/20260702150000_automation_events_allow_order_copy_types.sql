-- Capture of a fix applied live via MCP on 2026-07-02 (repo/live drift repair).
--
-- The original automation_events_event_type_check (20260626120000, line ~110)
-- allowed only the 6 launch event types. The 4 order_copy_* types added for
-- working-order mirroring were accepted by the edge function's allowlist but
-- REJECTED by this DB constraint -> the edge returned 500 and the agent
-- dropped every order_copy_* event silently. Root-cause of "zero order_copy
-- events ever" found during the 2026-07-02 copier E2E certification.
--
-- Idempotent: safe to run against the live DB (matches the already-applied
-- constraint) and against fresh environments.

ALTER TABLE public.automation_events
  DROP CONSTRAINT IF EXISTS automation_events_event_type_check;

ALTER TABLE public.automation_events
  ADD CONSTRAINT automation_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'risk_alert'::text,
    'risk_enforced'::text,
    'copy_executed'::text,
    'copy_failed'::text,
    'agent_status'::text,
    'kill_switch'::text,
    'order_copy_executed'::text,
    'order_copy_failed'::text,
    'order_copy_modified'::text,
    'order_copy_cancelled'::text
  ]));
