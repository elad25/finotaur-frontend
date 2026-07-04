-- ─────────────────────────────────────────────────────────────────────────────
-- portfolios.kill_switch_locked_until
--
-- A manual kill-switch lock is a *commitment* until the next CME futures session
-- open (5:00 PM America/Chicago). There is no manual unlock — the lock releases
-- automatically once this timestamp passes. Enforcement is derived, not reset:
-- every consumer that gates on kill_switch_active also checks this column, so
-- the lock expires by wall-clock comparison with zero dependency on the desktop
-- agent or a scheduled job.
--
-- Set to nextSessionOpen(now) at lock time by the client. A row with
-- kill_switch_active = true but kill_switch_locked_until = null (legacy locks
-- created before this migration) is treated as UNLOCKED (fail-open) so no
-- account is ever stranded locked after the manual-unlock control is removed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS kill_switch_locked_until timestamptz;

COMMENT ON COLUMN public.portfolios.kill_switch_locked_until IS
  'Manual kill-switch auto-release instant (next CME session open, 5PM CT). Lock is effective only while kill_switch_active AND kill_switch_locked_until > now(). NULL = no active manual commitment (fail-open).';
