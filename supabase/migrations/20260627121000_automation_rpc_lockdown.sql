-- Security hardening for the Session-2 automation RPCs.
-- Supabase ALTER DEFAULT PRIVILEGES grants EXECUTE on new public functions to
-- anon + authenticated automatically, so REVOKE ... FROM PUBLIC alone did NOT
-- lock down the service-role-only functions. The security advisor (lint 0028/0029)
-- flagged that automation_get_config + automation_redeem_pairing_code were callable
-- by any authenticated/anon caller via /rest/v1/rpc — which would let a caller pass an
-- arbitrary p_user_id and read another user's config. Lock them to service_role only.
--
-- automation_generate_pairing_code stays executable by authenticated (it derives the
-- owner from auth.uid() internally — same safe pattern as automation_upsert_copier_route).

REVOKE ALL ON FUNCTION public.automation_get_config(uuid)            FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.automation_get_config(uuid)        TO service_role;

REVOKE ALL ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.automation_redeem_pairing_code(text,text,text,text) TO service_role;
