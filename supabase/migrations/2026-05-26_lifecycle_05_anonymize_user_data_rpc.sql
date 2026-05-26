-- ============================================================================
-- Migration: lifecycle_05_anonymize_user_data_rpc
-- Date: 2026-05-26
-- Session: account-cancellation-flow (P1 Step 1)
--
-- Purpose: Implements the GDPR-compliant "anonymize on permanent delete"
--          policy chosen by Elad (option B in PLAN). Instead of cascading
--          delete on trades/journal/strategies, we NULL out PII on the
--          profile row while keeping the user_id as a stable handle for
--          aggregate analytics.
--
-- Why: Option A (cascade delete) destroys the analytical value of historical
--      trades. Option C (orphan rows) is a GDPR risk + zombie FKs.
--      Option B keeps the row but removes everything that could re-identify
--      the user (email, name, avatar, payment IDs, IP-bearing fields).
--
-- What gets anonymized (profiles_archive row — runs AFTER archive cron has
--   moved the soft-deleted profile from profiles to profiles_archive):
--   - email             → 'deleted_user_<short_hash>@anonymized.local'
--   - display_name      → 'Deleted User <short_hash>'
--   - avatar_url        → NULL
--   - metadata          → '{}' (may contain IP, UA, source)
--   - subscription_started_at preserved (anonymized cohort analytics)
--   - account_type      preserved (anonymized aggregate analytics)
--   - is_anonymized     → TRUE (new column added below)
--   - anonymized_at     → NOW()
--
-- What does NOT get touched:
--   - trades.user_id (still points to this anonymized row — analytics OK)
--   - journal_entries.user_id (same)
--   - strategies.user_id (same)
--   - lifecycle_events.user_id (same — these are append-only audit)
--
-- What MUST be deleted before anonymize (separate concern, P2):
--   - broker_connections (contains OAuth tokens; cannot be anonymized,
--     must be DELETE'd outright)
--   - Any other table holding fresh PII
--
-- Rollback (manual):
--   DROP FUNCTION IF EXISTS public.anonymize_user_data(UUID);
--   ALTER TABLE public.profiles_archive DROP COLUMN IF EXISTS is_anonymized;
--   ALTER TABLE public.profiles_archive DROP COLUMN IF EXISTS anonymized_at;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_anonymized;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS anonymized_at;
-- ============================================================================

-- Add anonymization markers to BOTH profiles and profiles_archive
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

ALTER TABLE public.profiles_archive
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_archive_anonymized
  ON public.profiles_archive (is_anonymized, anonymized_at DESC)
  WHERE is_anonymized = TRUE;

-- The anonymization RPC
CREATE OR REPLACE FUNCTION public.anonymize_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_table TEXT;
  v_short_hash   TEXT;
  v_broker_count INTEGER;
  v_already_anonymized BOOLEAN;
BEGIN
  -- 8-char short hash from UUID — stable, deterministic, non-reversible
  v_short_hash := LEFT(MD5(p_user_id::TEXT), 8);

  -- Determine which table holds the user (profiles or profiles_archive)
  IF EXISTS (SELECT 1 FROM profiles_archive WHERE id = p_user_id) THEN
    v_target_table := 'profiles_archive';

    SELECT is_anonymized INTO v_already_anonymized
    FROM profiles_archive WHERE id = p_user_id;

    IF v_already_anonymized THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'noop', TRUE,
        'message', 'User already anonymized',
        'user_id', p_user_id
      );
    END IF;

    UPDATE profiles_archive
    SET
      email          = 'deleted_user_' || v_short_hash || '@anonymized.local',
      display_name   = 'Deleted User ' || v_short_hash,
      avatar_url     = NULL,
      metadata       = '{}'::jsonb,
      is_anonymized  = TRUE,
      anonymized_at  = NOW()
    WHERE id = p_user_id;

  ELSIF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    v_target_table := 'profiles';

    SELECT is_anonymized INTO v_already_anonymized
    FROM profiles WHERE id = p_user_id;

    IF v_already_anonymized THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'noop', TRUE,
        'message', 'User already anonymized',
        'user_id', p_user_id
      );
    END IF;

    UPDATE profiles
    SET
      email          = 'deleted_user_' || v_short_hash || '@anonymized.local',
      display_name   = 'Deleted User ' || v_short_hash,
      avatar_url     = NULL,
      metadata       = '{}'::jsonb,
      is_anonymized  = TRUE,
      anonymized_at  = NOW()
    WHERE id = p_user_id;

  ELSE
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found in profiles or profiles_archive',
      'user_id', p_user_id
    );
  END IF;

  -- Hard-delete broker_connections (OAuth tokens cannot be anonymized)
  DELETE FROM broker_connections WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_broker_count = ROW_COUNT;

  -- Log the anonymization event (function emit_lifecycle_event added in migration #8)
  -- This is a soft-dependency; if emit_lifecycle_event does not yet exist,
  -- the INSERT will be skipped via the EXCEPTION block below.
  BEGIN
    INSERT INTO lifecycle_events (user_id, event_type, event_data, source)
    VALUES (
      p_user_id,
      'anonymized',
      jsonb_build_object(
        'target_table', v_target_table,
        'short_hash', v_short_hash,
        'broker_connections_deleted', v_broker_count
      ),
      'system'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'lifecycle_events table not yet available (this is expected during initial migration ordering)';
  END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'target_table', v_target_table,
    'short_hash', v_short_hash,
    'broker_connections_deleted', v_broker_count,
    'anonymized_at', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'sqlstate', SQLSTATE,
    'user_id', p_user_id
  );
END;
$$;

ALTER FUNCTION public.anonymize_user_data(UUID) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.anonymize_user_data(UUID) TO service_role;
-- Intentionally NOT granted to anon/authenticated — admin/server-side only.

COMMENT ON FUNCTION public.anonymize_user_data(UUID) IS
  'GDPR-compliant anonymization: NULLs PII on profile (or profiles_archive) row, hard-deletes broker_connections (OAuth tokens). Trades/journal_entries/strategies preserved with anonymized user_id for aggregate analytics. Added 2026-05-26.';
