-- ═══════════════════════════════════════════════════════════════
-- A.5 — copier_access_audit table for subscription gate enforcement
-- ═══════════════════════════════════════════════════════════════
-- Background:
--   Trade Copier endpoints (/api/copy-engine/accounts, /flatten-all,
--   /flatten/:credentialId) previously checked JWT only. Frontend
--   shows "Premium required" but a direct curl from a no-subscription
--   user passed unchecked through requireAuth and reached the engine.
--
-- Fix lives in finotaur-server `src/middleware/requireActiveSubscription.js`.
-- This migration provides the audit sink so every denied 403 is
-- recorded with route + subscription_status snapshot for later review.
--
-- Writers: only finotaur-server with SERVICE_ROLE_KEY.
-- Readers: admins via service_role; users see their own rows only.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.copier_access_audit (
  id                            BIGSERIAL PRIMARY KEY,
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route                         TEXT NOT NULL,
  method                        TEXT NOT NULL,
  reason                        TEXT NOT NULL,
  subscription_status           TEXT,
  platform_subscription_status  TEXT,
  ip                            INET,
  user_agent                    TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copier_audit_user_created
  ON public.copier_access_audit(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copier_audit_created
  ON public.copier_access_audit(created_at DESC);

COMMENT ON TABLE public.copier_access_audit IS
  'Audit log for /api/copy-engine subscription-gate denials. Written by '
  'finotaur-server requireActiveSubscription middleware via SERVICE_ROLE_KEY. '
  'Added 2026-05-16 as part of A.5 (Phase A pre-100-users hardening).';

-- ── RLS ──
ALTER TABLE public.copier_access_audit ENABLE ROW LEVEL SECURITY;

-- service_role: full access (writes from server middleware, reads for admin)
DROP POLICY IF EXISTS "copier_access_audit service_role full" ON public.copier_access_audit;
CREATE POLICY "copier_access_audit service_role full"
  ON public.copier_access_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated users: read own rows only (for future "why was I blocked?" UI)
DROP POLICY IF EXISTS "copier_access_audit users read own" ON public.copier_access_audit;
CREATE POLICY "copier_access_audit users read own"
  ON public.copier_access_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
