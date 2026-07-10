-- ============================================
-- MEMBER REFERRAL PHASE 2 — REFUND CLAWBACK + $50 PAYOUT MINIMUM
-- ============================================
-- Purpose: (1) lower the affiliate minimum payout threshold from $100 to
--          $50, live-configured via affiliate_config.payout_settings and
--          read dynamically by generate_monthly_payouts() (this file) and by
--          process-affiliate-payout (edge function — updated alongside this
--          migration, not part of this file); (2) add
--          reverse_commissions_for_refund() — a Whop-webhook-triggered RPC
--          that cancels not-yet-paid commissions for a refunded/disputed
--          membership and mirrors the affiliates running-total decrement.
-- Date: 2026-07-10
--
-- Approved-pending: this file is authored for review only. Do NOT apply to
-- any DB until Elad reviews and approves.
-- ============================================


-- ============================================
-- 1) affiliate_config.payout_settings — min_payout_usd 100 -> 50
-- ============================================
-- jsonb_set preserves the other keys (payout_day, payment_methods) exactly
-- as they are today — only min_payout_usd changes.

UPDATE affiliate_config
SET config_value = jsonb_set(config_value, '{min_payout_usd}', '50', true),
    updated_at = NOW()
WHERE config_key = 'payout_settings';


-- ============================================
-- 2) generate_monthly_payouts() — read the threshold from affiliate_config
-- ============================================
-- Identical to complete-migration-6 Affiliate (~line 2866) except the
-- hardcoded `min_payout NUMERIC(10,2) := 100.00;` is replaced with a read
-- of affiliate_config.payout_settings.min_payout_usd (falls back to 50 if
-- the config row is ever missing). Everything else — loop, confirmed-only
-- commission sum, bonus sum, ON CONFLICT DO NOTHING — is unchanged.

CREATE OR REPLACE FUNCTION generate_monthly_payouts(for_period DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  aff_record RECORD;
  pending_commissions NUMERIC(12,2);
  pending_bonuses NUMERIC(12,2);
  total_payout NUMERIC(12,2);
  payouts_created INTEGER := 0;
  min_payout NUMERIC(10,2);
BEGIN
  min_payout := COALESCE(
    (SELECT (config_value->>'min_payout_usd')::numeric
     FROM affiliate_config
     WHERE config_key = 'payout_settings'),
    50
  );

  FOR aff_record IN
    SELECT a.*
    FROM affiliates a
    WHERE a.status = 'active'
      AND a.commission_enabled = TRUE
      -- 'member' added (Phase 2): the original predates member-type
      -- affiliates — without this, member referrers would never be queued
      -- for payout. 'admin' rows stay excluded.
      AND a.affiliate_type IN ('regular', 'member')
  LOOP
    -- Sum confirmed commissions
    SELECT COALESCE(SUM(commission_amount_usd), 0) INTO pending_commissions
    FROM affiliate_commissions
    WHERE affiliate_id = aff_record.id
      AND status = 'confirmed'
      AND payout_id IS NULL;

    -- Sum pending bonuses
    SELECT COALESCE(SUM(bonus_amount_usd), 0) INTO pending_bonuses
    FROM affiliate_bonuses
    WHERE affiliate_id = aff_record.id
      AND status = 'pending'
      AND payout_id IS NULL;

    total_payout := pending_commissions + pending_bonuses;

    -- Create payout if meets minimum
    IF total_payout >= min_payout THEN
      INSERT INTO affiliate_payouts (
        affiliate_id,
        payout_period,
        commissions_amount_usd,
        bonuses_amount_usd,
        total_amount_usd,
        payment_method,
        payment_email,
        scheduled_date,
        status
      ) VALUES (
        aff_record.id,
        for_period,
        pending_commissions,
        pending_bonuses,
        total_payout,
        aff_record.payment_method,
        aff_record.paypal_email,
        DATE_TRUNC('month', for_period) + INTERVAL '14 days',
        'pending'
      )
      ON CONFLICT (affiliate_id, payout_period) DO NOTHING;

      IF FOUND THEN
        payouts_created := payouts_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN payouts_created;
END;
$$;


-- ============================================
-- 3) reverse_commissions_for_refund() — refund/dispute clawback
-- ============================================
-- Called by whop-webhook's handleRefundOrDispute() on payment.refunded /
-- refund.* / payment.disputed / dispute.* / payment.chargeback events.
--
-- Cancels every NOT-YET-PAID commission (status 'pending' or 'confirmed')
-- tied to the affiliate_referrals row for p_whop_membership_id, decrements
-- the owning affiliate's running totals to match, and marks the referral
-- dead for any future commission (commission_eligible = false).
--
-- Decrement mirrors exactly what commission CREATION increments, split by
-- the status the commission is cancelled FROM:
--   - handle_whop_payment() (complete-migration-8 Whop, ~1328-1330 /
--     ~1374-1377 / ~1411-1414) increments BOTH total_pending_usd AND
--     total_earnings_usd by the commission amount at CREATION time (status
--     'pending').
--   - qualify_verified_referrals() (complete-migration-6 Affiliate,
--     ~1515-1521) later decrements ONLY total_pending_usd (by the same
--     amount) when a commission transitions pending -> confirmed;
--     total_earnings_usd is a lifetime figure and is never touched there.
-- So: cancelling a still-'pending' commission must decrement BOTH
-- total_pending_usd and total_earnings_usd; cancelling an already-
-- 'confirmed' commission must decrement ONLY total_earnings_usd (its
-- total_pending_usd share was already removed at qualify time) — otherwise
-- total_pending_usd would be double-decremented and go negative-clamped
-- prematurely. GREATEST(0, ...) is used throughout, matching the existing
-- qualify_verified_referrals() defensive pattern, so a totals drift never
-- produces a negative running total.
--
-- 'paid' commissions are NEVER touched — real money already left the door.
-- Their count is returned as paid_untouched_count so the caller (the edge
-- function) can flag the event for manual review.
--
-- Idempotent: if a prior call already cancelled every pending/confirmed
-- commission for this referral, this call finds zero such rows and returns
-- immediately with cancelled_count 0 — it does not re-flip the referral
-- status or re-append a notes line.

CREATE OR REPLACE FUNCTION reverse_commissions_for_refund(
  p_whop_membership_id TEXT,
  p_reason TEXT DEFAULT 'refund'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_pending_usd NUMERIC(12,2) := 0;
  v_confirmed_usd NUMERIC(12,2) := 0;
  v_cancelled_count INT := 0;
  v_paid_count INT := 0;
  v_new_status referral_status;
  v_note_line TEXT;
BEGIN
  SELECT * INTO v_referral
  FROM affiliate_referrals
  WHERE whop_membership_id = p_whop_membership_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_referral');
  END IF;

  SELECT
    COALESCE(SUM(commission_amount_usd) FILTER (WHERE status = 'pending'), 0),
    COALESCE(SUM(commission_amount_usd) FILTER (WHERE status = 'confirmed'), 0),
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed')),
    COUNT(*) FILTER (WHERE status = 'paid')
  INTO v_pending_usd, v_confirmed_usd, v_cancelled_count, v_paid_count
  FROM affiliate_commissions
  WHERE referral_id = v_referral.id;

  -- Idempotent short-circuit — nothing cancellable left (either a fresh
  -- referral with zero commissions, or a prior call already reversed them).
  IF v_cancelled_count = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'cancelled_count', 0,
      'cancelled_usd', 0,
      'paid_untouched_count', v_paid_count,
      'referral_id', v_referral.id
    );
  END IF;

  UPDATE affiliate_commissions
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = p_reason
  WHERE referral_id = v_referral.id
    AND status IN ('pending', 'confirmed');

  UPDATE affiliates
  SET total_pending_usd = GREATEST(0, COALESCE(total_pending_usd, 0) - v_pending_usd),
      total_earnings_usd = GREATEST(0, COALESCE(total_earnings_usd, 0) - (v_pending_usd + v_confirmed_usd)),
      updated_at = NOW()
  WHERE id = v_referral.affiliate_id;

  -- Mark the referral dead for future commissions. verification_pending ->
  -- verification_failed (never made it past the 7-day window); anything
  -- further along -> refunded (live enum has a dedicated value for this).
  v_new_status := CASE
    WHEN v_referral.status = 'verification_pending' THEN 'verification_failed'::referral_status
    ELSE 'refunded'::referral_status
  END;

  v_note_line := '[' || NOW()::TEXT || '] ' || p_reason || ' — reversed ' ||
    v_cancelled_count || ' commission(s), $' || (v_pending_usd + v_confirmed_usd) ||
    '. Referral marked ' || v_new_status::TEXT || '.';

  UPDATE affiliate_referrals
  SET status = v_new_status,
      commission_eligible = FALSE,
      churned_at = COALESCE(churned_at, NOW()),
      notes = COALESCE(notes || E'\n', '') || v_note_line,
      updated_at = NOW()
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'ok', true,
    'cancelled_count', v_cancelled_count,
    'cancelled_usd', v_pending_usd + v_confirmed_usd,
    'paid_untouched_count', v_paid_count,
    'referral_id', v_referral.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reverse_commissions_for_refund(TEXT, TEXT) TO service_role;
