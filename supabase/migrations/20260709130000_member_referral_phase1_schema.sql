-- ============================================
-- MEMBER REFERRAL PHASE 1 — SCHEMA
-- ============================================
-- Purpose: schema additions for the member-refers-friend program —
--          allow affiliate_type='member', track Whop promo provisioning
--          errors/retries, and add the ensure_member_affiliate() RPC that
--          self-serve-provisions a paying member's own referral coupon.
-- Date: 2026-07-09
--
-- 🔴 Still gated by the Phase 0 kill-switch: affiliate_config.member_referral
-- .enabled remains false until flipped. ensure_member_affiliate() reads that
-- flag first and refuses to do anything while it is false. This migration
-- ships schema only — it does NOT turn the feature on.
--
-- Do NOT apply to any DB. This file is authored for review only.
-- ============================================

-- Needed for gen_random_bytes() used in the affiliate-code suffix generator below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================
-- 1) affiliate_type — allow 'member' alongside 'regular' / 'admin'
-- ============================================
-- The original CHECK constraint was declared inline on the column
-- (complete-migration-6 Affiliate, ~line 457) with no explicit name, so
-- Postgres auto-named it. Discover the real name from pg_constraint rather
-- than assuming the auto-generated default — safer across environments
-- where the table may have been re-created or the constraint re-added by
-- a later ad-hoc migration.

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'affiliates'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%affiliate_type%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE affiliates DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  EXECUTE $sql$
    ALTER TABLE affiliates
      ADD CONSTRAINT affiliates_affiliate_type_check
      CHECK (affiliate_type IN ('regular', 'admin', 'member'))
  $sql$;
END $$;


-- ============================================
-- 2) affiliates — promo provisioning error/retry tracking
-- ============================================

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS promo_provision_error TEXT,
  ADD COLUMN IF NOT EXISTS promo_provision_attempts INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN affiliates.promo_provision_error IS
  'Last Whop promo-code API error for this affiliate''s coupon (member-referral self-serve provisioning). NULL when the last attempt succeeded or none has been made yet.';
COMMENT ON COLUMN affiliates.promo_provision_attempts IS
  'Count of failed Whop promo-code provisioning attempts for this affiliate. Reset is not automatic — cleared only when a provisioning attempt succeeds (promo_provision_error set back to NULL).';

-- 🔎 Discovered gap (not part of the original task list, added defensively):
-- supabase/functions/create-whop-promo/index.ts and
-- src/features/affiliate/hooks/useAffiliateAdmin.ts both already read/write
-- affiliates.whop_promo_id, but no migration file in this repo declares that
-- column — it must have been added directly against the live DB outside of
-- version control. Adding it here (idempotent, additive) so this migration
-- and the Phase 1 edge-function work are self-consistent; flagged for Elad
-- as an untracked-schema-drift item, not something this migration invented.
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS whop_promo_id TEXT;


-- ============================================
-- 3) ensure_member_affiliate(p_user_id) — idempotent self-serve provisioning
-- ============================================
-- Called by create-whop-promo (member path) before it talks to the Whop API.
-- Creates (or returns the existing) affiliates row for a paying member so
-- they have their own affiliate_code/coupon_code to hand out.

CREATE OR REPLACE FUNCTION ensure_member_affiliate(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_profile RECORD;
  v_is_paying BOOLEAN;
  v_existing RECORD;
  v_display_name TEXT;
  v_base_code TEXT;
  v_suffix TEXT;
  v_code TEXT;
  v_attempt INT := 0;
  v_new_id UUID;
  v_i INT;
  v_alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; -- base32 (Crockford-ish, no 0/1/8/9)
BEGIN
  -- 1) Kill-switch
  SELECT COALESCE((config_value->>'enabled')::boolean, FALSE)
  INTO v_enabled
  FROM affiliate_config
  WHERE config_key = 'member_referral';

  IF v_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled');
  END IF;

  -- 2) Paying-member check.
  -- "Paying" = an ACTIVE paid product, i.e. any of: journal subscription
  -- (account_type != 'free' AND subscription_status = 'active'), newsletter
  -- (newsletter_status = 'active'), Top Secret (top_secret_status = 'active'),
  -- or the unified Platform plan (platform_plan != 'free' AND
  -- platform_subscription_status = 'active'). Trials are deliberately
  -- excluded — a member should have completed a real payment before they can
  -- hand out a referral coupon for a discount funded by commission on real
  -- revenue.
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_paying');
  END IF;

  v_is_paying := (
    (COALESCE(v_profile.account_type, 'free') <> 'free' AND COALESCE(v_profile.subscription_status, '') = 'active')
    OR COALESCE(v_profile.newsletter_status, '') = 'active'
    OR COALESCE(v_profile.top_secret_status, '') = 'active'
    OR (COALESCE(v_profile.platform_plan, 'free') <> 'free' AND COALESCE(v_profile.platform_subscription_status, '') = 'active')
  );

  IF NOT v_is_paying THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_paying');
  END IF;

  -- 3) Idempotent: return the existing row if this user already has one.
  SELECT * INTO v_existing FROM affiliates WHERE user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'existing', true,
      'affiliate_code', v_existing.affiliate_code,
      'coupon_code', v_existing.coupon_code,
      'whop_promo_id', v_existing.whop_promo_id
    );
  END IF;

  -- 4) Build the base code from the member's display name, falling back to
  -- the local part of their email. affiliates has no first_name/full_name —
  -- profiles.display_name is the closest analogue (see handle_new_user()).
  v_display_name := COALESCE(NULLIF(TRIM(v_profile.display_name), ''), split_part(v_profile.email, '@', 1));
  v_base_code := UPPER(REGEXP_REPLACE(v_display_name, '[^A-Za-z]', '', 'g'));

  IF v_base_code IS NULL OR v_base_code = '' THEN
    v_base_code := 'MEMBER';
  END IF;

  IF LENGTH(v_base_code) > 8 THEN
    v_base_code := SUBSTRING(v_base_code FROM 1 FOR 8);
  END IF;

  -- 5) Generate a unique code (base + 4-char random base32 suffix), retrying
  -- up to 5 times on a unique_violation (affiliate_code / coupon_code are
  -- both UNIQUE on the affiliates table).
  LOOP
    v_attempt := v_attempt + 1;

    v_suffix := '';
    FOR v_i IN 1..4 LOOP
      v_suffix := v_suffix || SUBSTRING(v_alphabet FROM (GET_BYTE(gen_random_bytes(1), 0) % 32) + 1 FOR 1);
    END LOOP;

    v_code := v_base_code || v_suffix;

    BEGIN
      INSERT INTO affiliates (
        user_id, display_name, email,
        affiliate_code, coupon_code, referral_link,
        status, affiliate_type, commission_enabled
      ) VALUES (
        p_user_id,
        COALESCE(NULLIF(TRIM(v_profile.display_name), ''), v_code),
        v_profile.email,
        v_code, v_code,
        'https://finotaur.com/?ref=' || v_code,
        'active', 'member', TRUE
      )
      RETURNING id INTO v_new_id;

      RETURN jsonb_build_object(
        'ok', true,
        'existing', false,
        'affiliate_code', v_code,
        'coupon_code', v_code,
        'whop_promo_id', NULL
      );
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 5 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'code_generation_failed');
      END IF;
      -- loop again with a fresh random suffix
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_member_affiliate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_member_affiliate(UUID) TO service_role;


-- ============================================
-- 4) RLS — member dashboard read access (VERIFIED, no changes needed)
-- ============================================
-- Cross-checked against complete-migration-6 Affiliate (~lines 3535-3587):
--   - affiliates            "Users can view own affiliate"    -> user_id = auth.uid() OR is_admin()
--   - affiliate_referrals   "Affiliates can view own referrals" -> affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) OR referred_user_id = auth.uid() OR is_admin()
--   - affiliate_commissions "Affiliates can view own commissions" -> affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) OR is_admin()
-- All three are data-shape agnostic (they filter on user_id / affiliate_id,
-- not affiliate_type), so they already cover 'member'-type affiliates for
-- the upcoming member referral dashboard ("my code", "my referrals", "my
-- commissions") with zero changes. No new policies created by this file.
