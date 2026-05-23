-- Migration: Add OAuth-specific columns to broker_connections
-- Date: 2026-05-23
-- Purpose: Support OAuth 2.0 authentication flow alongside existing legacy username/password flow.
-- All columns are additive; no existing data affected.

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'legacy'
    CHECK (auth_method IN ('legacy', 'oauth')),
  ADD COLUMN IF NOT EXISTS oauth_scope TEXT NULL,
  ADD COLUMN IF NOT EXISTS oauth_provider_user_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_prop_firm BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.broker_connections.auth_method IS
  'Authentication method: legacy (username/password) or oauth (OAuth 2.0 authorization code flow). Default legacy for backward compat.';
COMMENT ON COLUMN public.broker_connections.oauth_scope IS
  'OAuth scopes granted by user during authorize flow (space-separated). NULL for legacy auth.';
COMMENT ON COLUMN public.broker_connections.oauth_provider_user_id IS
  'Stable user identifier returned by OAuth provider (e.g., Tradovate user ID). Used to detect account changes.';
COMMENT ON COLUMN public.broker_connections.is_prop_firm IS
  'True if this connection is detected as a prop firm account (Apex/Topstep/MFFU). Currently informational only — UX blocks them.';
COMMENT ON COLUMN public.broker_connections.migration_required IS
  'True for legacy connections that must re-auth via OAuth. Set in bulk during Phase 4 migration.';

-- Index for finding connections needing OAuth migration
CREATE INDEX IF NOT EXISTS idx_bc_migration_required
  ON public.broker_connections (user_id)
  WHERE migration_required = true;
