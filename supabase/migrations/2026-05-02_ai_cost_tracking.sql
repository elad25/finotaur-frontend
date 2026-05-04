-- ============================================
-- AI Cost Tracking
-- ============================================
-- Tracks every LLM call across the platform for budget monitoring,
-- per-service cost breakdown, and per-user usage analysis.
--
-- Used by: finotaur-server/src/lib/aiGate.js
-- Read by: future admin dashboard (P2.4)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_cost_log (
  id BIGSERIAL PRIMARY KEY,

  -- Which AI service made the call
  -- e.g. 'stock_analyzer', 'copilot', 'sector_analyzer', 'top5_scanner'
  service TEXT NOT NULL,

  -- Which model was used
  -- e.g. 'gpt-4o', 'sonar-pro', 'text-embedding-3-small'
  model TEXT NOT NULL,

  -- Token counts (may be NULL for embedding-only or fire-and-forget calls)
  prompt_tokens INT,
  completion_tokens INT,

  -- Calculated cost in USD (computed in aiGate.js from per-model pricing table)
  estimated_cost_usd NUMERIC(10, 6),

  -- Optional context
  ticker TEXT,
  user_id UUID,
  duration_ms INT,

  -- Cache + correlation + outcome
  cache_status TEXT,   -- 'hit' | 'miss' | 'none' | NULL (legacy/unknown)
  request_id UUID,     -- correlates with x-request-id from requestId middleware
  status TEXT,         -- 'success' | 'failure' | 'timeout' | 'rate_limited' | NULL (legacy)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for daily spend queries (most common: SUM cost WHERE created_at > today)
CREATE INDEX IF NOT EXISTS idx_acl_daily
  ON ai_cost_log (created_at DESC);

-- Index for per-service cost breakdown
CREATE INDEX IF NOT EXISTS idx_acl_service_date
  ON ai_cost_log (service, created_at DESC);

-- Index for per-user cost tracking (only when user_id is set)
CREATE INDEX IF NOT EXISTS idx_acl_user
  ON ai_cost_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Index for request correlation (only when request_id is set)
CREATE INDEX IF NOT EXISTS idx_acl_request
  ON ai_cost_log (request_id)
  WHERE request_id IS NOT NULL;

-- ============================================
-- RLS: Service role only (backend-only writes/reads)
-- Admin reads will go through a future RPC with admin role check
-- ============================================
ALTER TABLE ai_cost_log ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (idempotent migration)
DROP POLICY IF EXISTS "Service role full access on ai_cost_log" ON ai_cost_log;

CREATE POLICY "Service role full access on ai_cost_log"
  ON ai_cost_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE  ai_cost_log IS 'Per-call tracking of every LLM/AI API call for cost monitoring';
COMMENT ON COLUMN ai_cost_log.service IS 'Logical service name: stock_analyzer, copilot, sector_analyzer, top5_scanner, catalyst_scanner, rag_search, embeddings';
COMMENT ON COLUMN ai_cost_log.model  IS 'Model identifier: gpt-4o, sonar-pro, text-embedding-3-small, claude-sonnet-4-20250514, etc.';
COMMENT ON COLUMN ai_cost_log.estimated_cost_usd IS 'Computed by aiGate.js using per-model pricing table; NOT actual provider invoice';
COMMENT ON COLUMN ai_cost_log.cache_status IS 'Anthropic prompt cache outcome (P2.6): hit | miss | none | NULL (legacy entry before column existed)';
COMMENT ON COLUMN ai_cost_log.request_id  IS 'Correlation ID from requestId middleware (P0.3); matches x-request-id header on the originating HTTP request';
COMMENT ON COLUMN ai_cost_log.status      IS 'Call outcome: success | failure | timeout | rate_limited | NULL (legacy entry before column existed)';
