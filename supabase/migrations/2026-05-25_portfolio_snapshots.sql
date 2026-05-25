-- portfolio_snapshots — one row per (broker_connection_id, snapshot_date)
-- Powers the COPILOT performance chart with real historical data instead of flat-line fallback.
-- Written by edge function `interactive-brokers-sync` on each successful sync (source='live')
-- and by the backfill_from_trades mode (source='backfill_trades').
-- Read by the COPILOT `usePortfolioData` hook, range-filtered per time-range button.

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_connection_id uuid NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  snapshot_date        date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  total_value          numeric(20, 4) NOT NULL,
  cash                 numeric(20, 4),
  buying_power         numeric(20, 4),
  source               text NOT NULL DEFAULT 'live'
                         CHECK (source IN ('live', 'backfill_trades', 'manual')),
  metadata             jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_snapshots_unique_per_day UNIQUE (broker_connection_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS portfolio_snapshots_user_date_idx
  ON public.portfolio_snapshots (user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS portfolio_snapshots_conn_date_idx
  ON public.portfolio_snapshots (broker_connection_id, snapshot_date DESC);

-- RLS: users see only their own snapshots. Writes are service-role only (edge functions).
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "users read own portfolio snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE  public.portfolio_snapshots IS
  'Daily portfolio value snapshots per broker connection. Powers COPILOT performance chart range-filtering.';
COMMENT ON COLUMN public.portfolio_snapshots.source IS
  'live = written by daily sync; backfill_trades = derived from cumulative trade P&L; manual = admin entry';
