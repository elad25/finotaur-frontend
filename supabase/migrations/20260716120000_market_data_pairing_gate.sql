-- ═══════════════════════════════════════════════════════════════════
-- Market Data pairing gate — broaden automation_generate_pairing_code
-- from Journal-Premium-only to ANY paid tier (Elad decision 2026-07-16,
-- plan: .claude/plans/2026-07-14-arena-market-data-connect.md v2, A3).
--
-- WHY: the Trading Arena "Connect Live Market Data" flow reuses the
-- agent pairing RPC, but that RPC was gated by automation_user_is_entitled
-- (copier gate = Journal Premium only). Market-data streaming from the
-- user's own NT8 feed is included in every paid plan, so pairing must be
-- allowed for: paid Journal (basic/premium/trial) OR paid+active
-- platform-only plans. The COPIER stays Premium-only: automation_get_config
-- still gates copying via automation_user_is_entitled (non-entitled agents
-- get master_enabled=false and zero routes) — this migration does NOT
-- touch automation_user_is_entitled or automation_get_config.
--
-- Mirrors frontend rule in src/components/routes/MarketDataGate.tsx:
--   allowed = !isFreeJournal OR (isPlatformPaid AND isPlatformActive)
-- (useSubscription.ts: isFreeJournal = not admin/lifetime/direct-sub/
--  journal-trial/bundle; isPlatformPaid = platform_plan != 'free';
--  isPlatformActive = platform_subscription_status in active/trial/trialing)
--
-- ROLLBACK: re-create automation_generate_pairing_code with the previous
-- gate line, which was exactly:
--   IF NOT public.automation_user_is_entitled(v_uid) THEN
--     RAISE EXCEPTION 'subscription_required' USING errcode = '42501';
--   END IF;
-- and DROP FUNCTION public.market_data_user_is_entitled(uuid);
-- ═══════════════════════════════════════════════════════════════════

-- 1) New entitlement check: any paid tier may pair a market-data agent.
CREATE OR REPLACE FUNCTION public.market_data_user_is_entitled(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        -- isAdmin
        p.role IN ('admin','super_admin') OR p.account_type IN ('admin','vip')
        -- isLifetimeUser (account_type='vip' already covered above)
        OR p.payment_provider = 'lifetime'
        -- hasDirectJournalSubscription (basic OR premium, active, via Whop)
        OR ( p.account_type IN ('basic','premium')
             AND p.subscription_status = 'active'
             AND p.whop_membership_id IS NOT NULL )
        -- hasJournalTrial
        OR ( p.account_type = 'basic'
             AND p.subscription_status = 'trial'
             AND p.is_in_trial = true
             AND p.whop_membership_id IS NOT NULL )
        -- hasJournalFromBundle
        OR p.platform_bundle_journal_granted = true
        -- any PAID + ACTIVE platform plan (D1b: platform-only paid users included)
        OR ( p.platform_plan IS NOT NULL
             AND p.platform_plan <> 'free'
             AND p.platform_subscription_status IN ('active','trial','trialing') )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.market_data_user_is_entitled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.market_data_user_is_entitled(uuid) TO authenticated, service_role;

-- 2) Re-create the pairing RPC with the widened gate.
--    Body identical to production as of 2026-07-16 EXCEPT the gate line.
CREATE OR REPLACE FUNCTION public.automation_generate_pairing_code(p_device_name text DEFAULT NULL::text)
RETURNS TABLE(device_id uuid, pairing_code text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_code    text;
  v_expires timestamptz := now() + interval '10 minutes';
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  -- Paid gate: any paid tier may pair (market data). Copying itself
  -- remains Premium-gated downstream in automation_get_config.
  IF NOT (public.automation_user_is_entitled(v_uid)
          OR public.market_data_user_is_entitled(v_uid)) THEN
    RAISE EXCEPTION 'subscription_required' USING errcode = '42501';
  END IF;

  v_code := '';
  FOR i IN 1..8 LOOP
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  END LOOP;
  v_code := substr(v_code,1,4) || '-' || substr(v_code,5,4);

  INSERT INTO public.automation_agent_devices
    (user_id, device_name, platform, pairing_code, pairing_code_expires_at, status)
  VALUES
    (v_uid, COALESCE(NULLIF(p_device_name,''),'NinjaTrader Agent'),
     'ninjatrader', v_code, v_expires, 'unpaired')
  RETURNING id INTO device_id;

  pairing_code := v_code;
  expires_at   := v_expires;
  RETURN NEXT;
END;
$function$;
