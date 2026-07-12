-- ============================================
-- CHECK REFERRAL CODE AVAILABILITY (live preview RPC)
-- ============================================
-- Purpose: "full customer choice of referral code" — the customer picks
--          their own code (format + reserved-list + uniqueness are the
--          only constraints, no admin involved). The UI needs a live
--          "is this code available?" check while the customer is still
--          typing, BEFORE they submit and actually provision anything.
--
-- Why this can't be a client-side query: `affiliates` and
-- `affiliate_applications` are both RLS-protected (a member can only see
-- their OWN affiliates row; the applications table has no public SELECT
-- policy). A direct `.from('affiliates').select(...)` from the browser
-- silently returns an empty result set for rows that belong to OTHER
-- users — not an error, just zero rows — which made every "already taken"
-- code look "available". Only a SECURITY DEFINER RPC can see across all
-- rows to answer the availability question correctly.
--
-- Mirrors the exact validation `ensure_member_affiliate(uuid, text)`
-- performs at provisioning time (20260711120000_referral_beats_intro.sql):
-- format regex, reserved list, and uniqueness against the same two
-- tables/columns. This RPC is read-only and never inserts/reserves
-- anything — a race between "checked available" and "someone else takes
-- it a second later" is still possible and is handled as a backstop by
-- the real `code_taken` error from ensure_member_affiliate() at submit
-- time (unchanged).
--
-- Date: 2026-07-12
--
-- Do NOT apply to any DB. This file is authored for review only.
-- ============================================

CREATE OR REPLACE FUNCTION public.check_referral_code_availability(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_reserved_codes CONSTANT TEXT[] := ARRAY[
    'TRADER30', 'INTRO30', 'FINOTAUR50', 'WELCOMEBACK', 'WELCOME',
    'FINOTAUR', 'TRADER', 'INTRO', 'ADMIN', 'TEST'
  ];
  v_code_exists BOOLEAN;
BEGIN
  v_code := UPPER(TRIM(p_code));

  IF v_code !~ '^[A-Z0-9]{4,15}$' THEN
    RETURN jsonb_build_object('available', false, 'reason', 'invalid');
  END IF;

  IF v_code = ANY(v_reserved_codes) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'reserved');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM affiliates
    WHERE UPPER(affiliate_code) = v_code
       OR UPPER(coupon_code) = v_code
    UNION ALL
    SELECT 1 FROM affiliate_applications
    WHERE UPPER(requested_code) = v_code
  ) INTO v_code_exists;

  IF v_code_exists THEN
    RETURN jsonb_build_object('available', false, 'reason', 'taken');
  END IF;

  RETURN jsonb_build_object('available', true, 'reason', NULL);
END;
$$;

-- `anon` grant is required: AffiliateApplicationForm's requested-code field
-- can be filled out by a signed-out visitor filling the public affiliate
-- application form, not only by an authenticated member.
GRANT EXECUTE ON FUNCTION public.check_referral_code_availability(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_referral_code_availability(TEXT) TO anon;
