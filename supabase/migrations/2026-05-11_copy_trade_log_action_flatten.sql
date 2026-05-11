-- Migration: add 'flatten' to copy_trade_log_action_check
-- Date:      2026-05-11
-- Author:    pre-customer-integrated-test-prep session
-- Reason:    engine.js (master 1c70932) writes action='flatten' from D-15 auto-flatten
--            audit path (engine.js:171). The existing CHECK constraint
--            {open, close, skipped, error} silently rejects these inserts.
--            Auto-flatten itself works; only the audit log fails. This widens the
--            CHECK to allow 'flatten' so D-15 risk-gate events are recorded for the
--            customer #1 onboarding test and beyond.
--
-- Forward-compatible (additive): widens the allowed set, never narrows.
-- Idempotent: safe to re-run; uses DROP IF EXISTS then ADD.
-- Reversible: see DOWN block at bottom (commented out — apply manually if rollback needed).

BEGIN;

-- UP: replace the CHECK with the wider enum
ALTER TABLE public.copy_trade_log
  DROP CONSTRAINT IF EXISTS copy_trade_log_action_check;

ALTER TABLE public.copy_trade_log
  ADD CONSTRAINT copy_trade_log_action_check
  CHECK (action = ANY (ARRAY[
    'open'::text,
    'close'::text,
    'skipped'::text,
    'error'::text,
    'flatten'::text
  ]));

COMMIT;

-- Verification (run after apply):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'copy_trade_log_action_check';
--
-- Expected:
--   CHECK ((action = ANY (ARRAY['open'::text, 'close'::text, 'skipped'::text, 'error'::text, 'flatten'::text])))

-- DOWN (manual; uncomment + run if rollback needed):
--   BEGIN;
--   ALTER TABLE public.copy_trade_log
--     DROP CONSTRAINT IF EXISTS copy_trade_log_action_check;
--   ALTER TABLE public.copy_trade_log
--     ADD CONSTRAINT copy_trade_log_action_check
--     CHECK (action = ANY (ARRAY['open'::text, 'close'::text, 'skipped'::text, 'error'::text]));
--   -- NOTE: any existing rows with action='flatten' will block the DOWN.
--   --       DELETE them first if rollback is intentional.
--   COMMIT;
