-- ════════════════════════════════════════════════════════════════════════════
-- Perf P0 — Indexes (CONCURRENT, separated from sibling migration)
-- Session: perf-optimization-P0-cron-and-cache (2026-05-21)
--
-- Both CREATE INDEX CONCURRENTLY statements must run OUTSIDE a transaction
-- — Supabase MCP apply_migration wraps the file in a single tx, which will
-- fail with `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.
-- Apply via execute_sql, one statement at a time.
--
-- Both indexes are PARTIAL — keeps them small + planner picks them via the
-- WHERE clause matching the SELECT predicate.
-- ════════════════════════════════════════════════════════════════════════════

-- IDX-1 — supports tradovate_position_state SELECTs at tradovate-sync lines
-- 271-279 and 434-442 (per-fill opposite-side position lookup, exact equality
-- on user_id + tradovate_account_id + symbol + side, and the WHERE clause
-- always carries open_quantity > 0).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_state_user_acct_sym_side
  ON public.tradovate_position_state (user_id, tradovate_account_id, symbol, side)
  WHERE open_quantity > 0;

-- IDX-2 — backs get_active_tradovate_user_ids(interval).
-- Partial WHERE broker='tradovate' keeps it tiny vs full table.
-- Order (user_id, created_at DESC) means DISTINCT user_id can be served via
-- index-only loose-scan once cardinality is known.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_active_traders
  ON public.trades (user_id, created_at DESC)
  WHERE broker = 'tradovate';
