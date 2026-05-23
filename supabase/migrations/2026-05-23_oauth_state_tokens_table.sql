-- Migration: OAuth state tokens table for CSRF protection
-- Date: 2026-05-23
-- Purpose: Store short-lived state tokens generated during OAuth start, verified during callback.
-- Tokens auto-expire after 10 minutes.

CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_hmac TEXT NOT NULL UNIQUE,
  broker TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'live'
    CHECK (environment IN ('live', 'demo', 'sandbox')),
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

COMMENT ON TABLE public.oauth_state_tokens IS
  'Short-lived OAuth state tokens for CSRF protection. Created in oauth-start, verified+consumed in oauth-callback.';

-- Lookup by HMAC during callback verification
CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_hmac
  ON public.oauth_state_tokens (state_hmac);

-- Cleanup index for expired token purge
CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_expires_at
  ON public.oauth_state_tokens (expires_at)
  WHERE used_at IS NULL;

-- RLS: users can only see their own state tokens
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_state_own ON public.oauth_state_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all (used by edge functions with service_role_key)
GRANT ALL ON public.oauth_state_tokens TO service_role;
