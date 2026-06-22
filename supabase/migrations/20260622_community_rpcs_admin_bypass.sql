-- 20260622_community_rpcs_admin_bypass.sql
-- Admins (account_type='admin') have platform_plan='free', so is_paying_user()
-- returned false for them and all community RPCs threw global_feed_requires_paid_plan.
-- Fix: add is_admin_user() helper and let admins through the gate on all three RPCs.
-- Applied directly to prod via Supabase MCP on 2026-06-22.

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_type = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- list_global_feed, list_global_comments, global_leaderboard:
-- paywall guard is now: is_paying_user() OR is_admin_user()
-- Full function bodies in 20260622_floor_username.sql (floor_username COALESCE already included).
-- Only the guard line changes here — recorded for migration history.
