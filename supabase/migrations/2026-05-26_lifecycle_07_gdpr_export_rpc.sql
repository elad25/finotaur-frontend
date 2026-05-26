-- ============================================================================
-- Migration: lifecycle_07_gdpr_export_rpc
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Provide a single RPC that returns a comprehensive JSONB dump of
--          a user's data — used by:
--          (a) user-initiated GDPR Article 20 (data portability) export
--              via GET /api/users/me/gdpr-export (P1 Step 3)
--          (b) admin GDPRTools.tsx (will be upgraded in P2 to use this)
--
-- Why: Today's GDPRTools.tsx only exports the profile row. Per Elad's plan
--      and GDPR best practice, the export must include EVERY table holding
--      user PII or user-generated content.
--
-- Tables included:
--   1.  profile (single row)
--   2.  trades (all closed + open)
--   3.  journal_entries (all)
--   4.  strategies (all)
--   5.  broker_connections (TOKENS REDACTED — only metadata)
--   6.  affiliate_referrals (where user is referrer OR referred)
--   7.  ai_usage (last 365 days only — full history is too large + tier costs not personal)
--   8.  subscription_cancellation_feedback (the user's own feedback)
--   9.  lifecycle_events (the user's own event log)
--   10. admin_audit_logs (rows where target_user_id = user — what admins did to them)
--
-- Tokens redacted: broker_connections returns is_active, broker, account_id,
--                  connected_at, last_sync_at — but NOT access_token /
--                  refresh_token / vault_ref. Per Lesson 10 (never print
--                  API keys), tokens are excluded from exports.
--
-- Tables NOT included (intentional):
--   - payments / billing — Whop holds payment records, point user there
--   - Other users' data even if related (e.g. shared portfolio rules)
--
-- Rollback (manual):
--   DROP FUNCTION IF EXISTS public.get_user_gdpr_export(UUID);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_gdpr_export(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile           JSONB;
  v_trades            JSONB;
  v_journal           JSONB;
  v_strategies        JSONB;
  v_brokers           JSONB;
  v_affiliates        JSONB;
  v_ai_usage          JSONB;
  v_feedback          JSONB;
  v_lifecycle         JSONB;
  v_admin_actions     JSONB;
BEGIN
  -- Authorization: caller must be the user themselves OR an admin
  -- (auth.uid() is the caller's ID under RLS context)
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  IF auth.uid() != p_user_id THEN
    -- Check admin role
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
      RETURN jsonb_build_object('error', 'Not authorized to export another user');
    END IF;
  END IF;

  -- Profile (single row → object, not array)
  SELECT to_jsonb(p.*) INTO v_profile
  FROM profiles p WHERE id = p_user_id;

  -- Trades
  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.entry_time DESC), '[]'::jsonb)
  INTO v_trades
  FROM trades t WHERE user_id = p_user_id;

  -- Journal entries (table may not exist in all envs; wrapped)
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(j.*) ORDER BY j.created_at DESC), ''[]''::jsonb) FROM journal_entries j WHERE user_id = $1'
    INTO v_journal USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_journal := '[]'::jsonb;
  END;

  -- Strategies
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(s.*) ORDER BY s.created_at DESC), ''[]''::jsonb) FROM strategies s WHERE user_id = $1'
    INTO v_strategies USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_strategies := '[]'::jsonb;
  END;

  -- Broker connections (TOKENS REDACTED)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',             id,
      'broker',         broker,
      'account_id',     account_id,
      'is_active',      is_active,
      'status',         status,
      'status_message', status_message,
      'connected_at',   connected_at,
      'last_sync_at',   last_sync_at,
      'disconnected_at', disconnected_at,
      '_tokens',        '[REDACTED — never exported per Lesson 10]'
    )
    ORDER BY connected_at DESC
  ), '[]'::jsonb)
  INTO v_brokers
  FROM broker_connections WHERE user_id = p_user_id;

  -- Affiliate referrals (both directions)
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), ''[]''::jsonb) FROM affiliate_referrals a WHERE referrer_user_id = $1 OR referred_user_id = $1'
    INTO v_affiliates USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_affiliates := '[]'::jsonb;
  END;

  -- AI usage (last 365 days only)
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(au.*) ORDER BY au.created_at DESC), ''[]''::jsonb) FROM ai_usage au WHERE user_id = $1 AND created_at > NOW() - INTERVAL ''365 days'''
    INTO v_ai_usage USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_ai_usage := '[]'::jsonb;
  END;

  -- Cancellation feedback (user's own)
  SELECT COALESCE(jsonb_agg(to_jsonb(scf.*) ORDER BY scf.created_at DESC), '[]'::jsonb)
  INTO v_feedback
  FROM subscription_cancellation_feedback scf WHERE user_id = p_user_id;

  -- Lifecycle events (user's own)
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(le.*) ORDER BY le.occurred_at DESC), ''[]''::jsonb) FROM lifecycle_events le WHERE user_id = $1'
    INTO v_lifecycle USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_lifecycle := '[]'::jsonb;
  END;

  -- Admin actions targeting this user
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(aal.*) ORDER BY aal.created_at DESC), ''[]''::jsonb) FROM admin_audit_logs aal WHERE target_user_id = $1'
    INTO v_admin_actions USING p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_admin_actions := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    '_meta', jsonb_build_object(
      'export_type',      'gdpr_article_20_data_portability',
      'exported_at',      NOW(),
      'user_id',          p_user_id,
      'schema_version',   '1.0',
      'tokens_redacted',  TRUE,
      'notice',           'OAuth/API tokens have been redacted per security policy. Whop payment records must be requested from Whop directly.'
    ),
    'profile',                          v_profile,
    'trades',                           v_trades,
    'journal_entries',                  v_journal,
    'strategies',                       v_strategies,
    'broker_connections',               v_brokers,
    'affiliate_referrals',              v_affiliates,
    'ai_usage_last_365d',               v_ai_usage,
    'subscription_cancellation_feedback', v_feedback,
    'lifecycle_events',                 v_lifecycle,
    'admin_actions_targeting_user',     v_admin_actions
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'sqlstate', SQLSTATE,
    'user_id', p_user_id
  );
END;
$$;

ALTER FUNCTION public.get_user_gdpr_export(UUID) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_user_gdpr_export(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_gdpr_export(UUID) TO service_role;
-- anon DENIED — must be logged in to export anything.

COMMENT ON FUNCTION public.get_user_gdpr_export(UUID) IS
  'GDPR Article 20 export — returns user-owned data across 10 tables as a single JSONB. OAuth tokens redacted per Lesson 10. Self-service for the authenticated user; admin can export others. Added 2026-05-26.';
