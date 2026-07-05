-- =====================================================
-- INVESTOR TIER — usage limits (pricing restructure v9, 2026-07)
-- =====================================================
-- The Top Secret product ($50/mo) is rebranded as the "Investor" tier and now
-- grants limited platform AI access on top of the intelligence envelope:
--   * Stock Analyzer: 10/day  (free stays 3/day)
--   * Sector Analyzer: 10/month (new — was 0 outside Finotaur)
-- Finotaur ($89/mo) becomes UNLIMITED AI (stock analysis was capped at 7/day).
--
-- A user is "Investor" when profiles.platform_plan is free/null AND they hold
-- an active Top Secret subscription (or a legacy WAR ZONE newsletter sub —
-- merged into Top Secret 2026-06). No profiles.platform_plan value is written;
-- the tier is derived, so churned Top Secret subs fall back to free automatically.
--
-- Frontend counterpart: usePlatformAccess v3 (platform_investor tier) applies
-- the same elevation client-side; this migration makes the limits authoritative.
-- =====================================================

-- Helper: effective platform plan, deriving 'platform_investor' from Top Secret status
CREATE OR REPLACE FUNCTION "public"."get_effective_platform_plan"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_plan TEXT;
  v_role TEXT;
  v_top_secret BOOLEAN;
BEGIN
  SELECT
    COALESCE(p.platform_plan, 'free'),
    p.role,
    (
      (p.top_secret_enabled IS TRUE AND p.top_secret_status IN ('active', 'trial'))
      OR p.newsletter_status IN ('active', 'trial', 'trialing')  -- legacy WAR ZONE grants Top Secret
    )
  INTO v_plan, v_role, v_top_secret
  FROM profiles p WHERE p.id = p_user_id;

  -- Admin/super_admin always gets full enterprise access
  IF v_role IN ('admin', 'super_admin') THEN
    RETURN 'platform_enterprise';
  END IF;

  -- Core tier removed 2026-06 — normalize to free before the Investor check
  IF v_plan IN ('platform_core', 'core') OR v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  IF v_plan = 'free' AND COALESCE(v_top_secret, FALSE) THEN
    RETURN 'platform_investor';
  END IF;

  RETURN v_plan;
END;
$$;

ALTER FUNCTION "public"."get_effective_platform_plan"("p_user_id" "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."get_effective_platform_plan"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_effective_platform_plan"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_platform_plan"("p_user_id" "uuid") TO "service_role";

-- get_usage_status: return the effective plan + Investor/unlimited-Finotaur limits
CREATE OR REPLACE FUNCTION "public"."get_usage_status"("p_user_id" "uuid") RETURNS TABLE("platform_plan" "text", "stock_analysis_today" integer, "stock_analysis_limit" integer, "sector_analysis_month" integer, "sector_analysis_limit" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_plan TEXT;
BEGIN
  v_plan := get_effective_platform_plan(p_user_id);

  RETURN QUERY
  SELECT
    v_plan,
    COALESCE((
      SELECT ut.usage_count FROM usage_tracking ut
      WHERE ut.user_id = p_user_id AND ut.feature = 'stock_analysis' AND ut.usage_date = CURRENT_DATE
    ), 0)::INTEGER,
    (CASE v_plan
      WHEN 'free' THEN 3
      WHEN 'platform_investor' THEN 10
      WHEN 'platform_finotaur' THEN 999999   -- v9: unlimited (was 7)
      WHEN 'platform_enterprise' THEN 999999
      ELSE 3
    END)::INTEGER,
    COALESCE((
      SELECT mut.usage_count FROM monthly_usage_tracking mut
      WHERE mut.user_id = p_user_id AND mut.feature = 'sector_analysis'
        AND mut.usage_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
    ), 0)::INTEGER,
    (CASE v_plan
      WHEN 'platform_investor' THEN 10
      WHEN 'platform_finotaur' THEN 999999
      WHEN 'platform_enterprise' THEN 999999
      ELSE 0
    END)::INTEGER;
END;
$$;

-- increment_daily_usage: same limit table as get_usage_status
CREATE OR REPLACE FUNCTION "public"."increment_daily_usage"("p_user_id" "uuid", "p_feature" "text") RETURNS TABLE("current_count" integer, "allowed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_platform_plan TEXT;
  v_daily_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  v_platform_plan := get_effective_platform_plan(p_user_id);

  IF p_feature = 'stock_analysis' THEN
    v_daily_limit := CASE v_platform_plan
      WHEN 'free' THEN 3
      WHEN 'platform_investor' THEN 10
      WHEN 'platform_finotaur' THEN 999999   -- v9: unlimited (was 7)
      WHEN 'platform_enterprise' THEN 999999
      ELSE 3
    END;
  ELSE
    v_daily_limit := 999999;
  END IF;

  INSERT INTO usage_tracking (user_id, feature, usage_date, usage_count)
  VALUES (p_user_id, p_feature, CURRENT_DATE, 1)
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET
    usage_count = usage_tracking.usage_count + 1,
    updated_at = NOW();

  SELECT ut.usage_count INTO v_current_count
  FROM usage_tracking ut
  WHERE ut.user_id = p_user_id
    AND ut.feature = p_feature
    AND ut.usage_date = CURRENT_DATE;

  RETURN QUERY SELECT v_current_count, (v_current_count <= v_daily_limit);
END;
$$;

-- increment_monthly_usage: Investor gets 10 sector analyses/month
CREATE OR REPLACE FUNCTION "public"."increment_monthly_usage"("p_user_id" "uuid", "p_feature" "text") RETURNS TABLE("current_count" integer, "allowed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_platform_plan TEXT;
  v_monthly_limit INTEGER;
  v_current_count INTEGER;
  v_month_start DATE;
BEGIN
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  v_platform_plan := get_effective_platform_plan(p_user_id);

  IF p_feature = 'sector_analysis' THEN
    v_monthly_limit := CASE v_platform_plan
      WHEN 'platform_investor' THEN 10
      WHEN 'platform_finotaur' THEN 999999
      WHEN 'platform_enterprise' THEN 999999
      ELSE 0
    END;
  ELSE
    v_monthly_limit := 999999;
  END IF;

  INSERT INTO monthly_usage_tracking (user_id, feature, usage_month, usage_count)
  VALUES (p_user_id, p_feature, v_month_start, 1)
  ON CONFLICT (user_id, feature, usage_month)
  DO UPDATE SET
    usage_count = monthly_usage_tracking.usage_count + 1,
    updated_at = NOW();

  SELECT mut.usage_count INTO v_current_count
  FROM monthly_usage_tracking mut
  WHERE mut.user_id = p_user_id
    AND mut.feature = p_feature
    AND mut.usage_month = v_month_start;

  RETURN QUERY SELECT v_current_count, (v_current_count <= v_monthly_limit);
END;
$$;
