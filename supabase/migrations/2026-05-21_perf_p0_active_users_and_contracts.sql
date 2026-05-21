-- ════════════════════════════════════════════════════════════════════════════
-- Perf P0 — Active-User RPC + Tradovate Contracts Cache
-- Session: perf-optimization-P0-cron-and-cache (2026-05-21)
-- Plan:    ~/.claude/plans/perf-optimization-report-rippling-scott.md
-- Source:  finotaur/.claude/plans/2026-05-21_perf-optimization-scale-cache.md (B2 + B4)
--
-- Ceiling lift: 1.5K → 10K active paying users.
-- Replaces:
--   • B4 — `select user_id from trades where created_at > 7d ago` scan in
--     tradovate-sync (was pulling tens of MB per cron tick) → DISTINCT RPC
--     backed by partial index (indexes live in the sibling _indexes.sql).
--   • B2 — global contract cache so the 3-call /contract/item /maturity /product
--     trio isn't repeated per-user per-cron-tick for the same MNQM6 / ESM6 etc.
-- ════════════════════════════════════════════════════════════════════════════

-- B4 — Active-user RPC
-- Returns DISTINCT user_ids who have ANY tradovate trade in the lookback window.
-- Postgres planner uses index-only scan via the partial idx in _indexes.sql.
CREATE OR REPLACE FUNCTION public.get_active_tradovate_user_ids(
  p_lookback interval DEFAULT '7 days'::interval
)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.user_id
  FROM public.trades t
  WHERE t.broker = 'tradovate'
    AND t.created_at > (now() - p_lookback);
$$;

COMMENT ON FUNCTION public.get_active_tradovate_user_ids(interval) IS
'B4 perf fix — replaces full-row trades scan in tradovate-sync active-user filter. Backed by idx_trades_active_traders partial index.';

REVOKE ALL ON FUNCTION public.get_active_tradovate_user_ids(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_tradovate_user_ids(interval) TO service_role;

-- B2 — Tradovate contracts cache table
-- One row per contract_id (e.g. MNQM6 = a specific UUID Tradovate assigns).
-- fetched_at lets cache TTL be enforced at the edge fn (we currently use 7d).
-- source distinguishes API-fetched rows from hardcoded multiplier fallbacks
-- (KNOWN_FUTURES_MULTIPLIERS in tradovate-sync/index.ts:147) — so we can audit
-- how often the API path runs vs the fallback.
CREATE TABLE IF NOT EXISTS public.tradovate_contracts (
  contract_id      bigint    PRIMARY KEY,
  name             text      NOT NULL,
  full_point_value numeric   NOT NULL,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  source           text      NOT NULL DEFAULT 'api'
    CHECK (source IN ('api', 'hardcoded'))
);

COMMENT ON TABLE public.tradovate_contracts IS
'B2 perf fix — global cache of Tradovate contract metadata (name + fullPointValue). Avoids the 3-call /contract/item → /contractMaturity/item → /product/item trio per fill across users. Populated lazily by tradovate-sync.';

ALTER TABLE public.tradovate_contracts ENABLE ROW LEVEL SECURITY;

-- service_role only — cron + edge fn writes; no user-side reads needed
-- (user-facing trades already have multiplier denormalized onto trade rows).
DROP POLICY IF EXISTS tradovate_contracts_service_role_all ON public.tradovate_contracts;
CREATE POLICY tradovate_contracts_service_role_all
  ON public.tradovate_contracts
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
