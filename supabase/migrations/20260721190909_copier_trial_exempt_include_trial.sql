-- Add 'trial' to copier_trial_exempt so app-granted 14-day full-access trial
-- users are not hard-locked by the 15-free-copies cap during their trial.
-- On day 14 they flip to account_type='free' and automatically stop being
-- exempt, restoring Free-tier copier behavior. Reversible: re-run without
-- 'trial'. Applied to production via Supabase MCP on 2026-07-21.
CREATE OR REPLACE FUNCTION public.copier_trial_exempt(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user
      AND (
        account_type IN ('premium', 'admin', 'vip', 'trial')
        OR role IN ('admin', 'super_admin')
        OR payment_provider = 'lifetime'
      )
  );
$function$;
