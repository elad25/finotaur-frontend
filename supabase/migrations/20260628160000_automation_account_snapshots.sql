-- ============================================================================
-- Automation Account Snapshots — live per-account telemetry from the desktop agent
-- ADDITIVE ONLY. Read-only relative to brokers. No execution.
-- The NinjaScript agent reads positions / balance / realized+unrealized PnL from
-- the NT8 Cbi API and POSTs them here (via the automation-agent edge function,
-- action:'account_snapshot', service_role write). The copier dashboard reads the
-- latest row per (device, account) to render real live numbers.
-- One row per (device_id, account_name) — upserted ("latest snapshot" semantics).
-- RLS: SELECT for owner (user_id = auth.uid()) + admin override. Writes go through
-- service_role (edge function) which bypasses RLS, so no INSERT/UPDATE grant here.
-- (Applied to prod 2026-06-28 via MCP under name automation_account_snapshots.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_account_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id     uuid NOT NULL REFERENCES public.automation_agent_devices(id) ON DELETE CASCADE,
  account_name  text NOT NULL,                      -- broker account name (join key to portfolios.name)
  env           text,                               -- 'live' | 'demo' (informational)
  balance       numeric(15,2),                      -- account cash balance (USD)
  day_pnl       numeric(15,2),                      -- session realized P&L (USD)
  open_pnl      numeric(15,2),                      -- unrealized P&L on open positions (USD)
  positions     jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ symbol, qty, isLong, avgPrice, openPnl }]
  captured_at   timestamptz NOT NULL DEFAULT now(), -- when the agent sampled NT8 (freshness => online/offline)
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, account_name)
);

CREATE INDEX IF NOT EXISTS automation_account_snapshots_user_idx
  ON public.automation_account_snapshots (user_id, account_name);

-- ============================================================================
-- RLS — SELECT for owner + admin override. No write grant (service_role only).
-- ============================================================================
ALTER TABLE public.automation_account_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_account_snapshots_owner_read ON public.automation_account_snapshots;
CREATE POLICY automation_account_snapshots_owner_read ON public.automation_account_snapshots
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.rls_check_admin() AND public.rls_check_admin_mode()));

GRANT SELECT ON public.automation_account_snapshots TO authenticated;

COMMENT ON TABLE public.automation_account_snapshots IS
  'Live per-account telemetry (positions/balance/PnL) from the desktop NinjaScript agent. Upserted one row per (device,account). Read-only dashboard source; written by automation-agent edge fn via service_role.';
