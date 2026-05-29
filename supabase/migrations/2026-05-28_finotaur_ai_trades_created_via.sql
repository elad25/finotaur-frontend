-- ============================================
-- FINOTAUR AI — trades.created_via column
-- ============================================
-- Adds an audit/origin column to the trades table so downstream queries
-- and the UI can distinguish AI-coach-inserted trades from manual entries,
-- broker imports, CSV uploads, etc.
--
-- Safer version: ADD COLUMN without a CHECK constraint to avoid breaking
-- existing rows that may carry broker values not yet enumerated here.
-- The allowed values are documented in the COMMENT and enforced at the
-- application layer (server-side validation in the trade-mutation handler).
--
-- Used by: finotaur-server/src/routes/journal-ai/tool-execute.ts (sets 'ai_coach')
-- Read by: finotaur-frontend/src/components/journal/* (origin badge, filter)
-- ============================================

-- ── Column ───────────────────────────────────────────────────────────────────
-- IF NOT EXISTS is safe: re-running this migration on a DB that already has
-- the column is a no-op (no error, no data loss).
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN trades.created_via IS
  'Origin of this trade record. '
  'Known values: manual (default, hand-entered by user), '
  'tradovate (imported via Tradovate API), '
  'interactive_brokers (IB integration), '
  'alpaca (Alpaca Markets integration), '
  'snaptrade (SnapTrade broker passthrough), '
  'csv (bulk import via CSV upload), '
  'api (direct REST API write), '
  'ai_coach (inserted via FINOTAUR AI tool call after user confirmation in the frontend modal). '
  'Enforced at application layer; no DB CHECK to avoid blocking future broker additions.';

-- ── Index ────────────────────────────────────────────────────────────────────
-- Partial index: efficient lookup of AI-created trades for audit/filtering.
-- Covers the two most common access patterns for AI-originated trades:
--   1. "Show me trades the AI entered" — filtered by created_via = 'ai_coach'
--   2. Sorted by created_at DESC for chronological review
CREATE INDEX IF NOT EXISTS idx_trades_ai_created
  ON trades (user_id, created_at DESC)
  WHERE created_via = 'ai_coach';
