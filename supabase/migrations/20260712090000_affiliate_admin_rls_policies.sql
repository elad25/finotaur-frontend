-- ============================================
-- AFFILIATE ADMIN RLS POLICIES
-- ============================================
-- Applied to prod 2026-07-12 via Supabase MCP (migration name:
-- affiliate_admin_rls_policies). This file is the repo record of that
-- migration — do NOT re-apply.
--
-- Why: the 2026-07-10 RLS hardening enabled RLS on the affiliate tables but
-- left affiliate_applications with ZERO policies (deny-all for all client
-- roles) and affiliates with only member own-row policies. Result: the whole
-- admin affiliate panel was silently broken — the Applications tab listed
-- nothing (200 + empty under RLS), and approval (client-side INSERT into
-- affiliates + UPDATE of the application) could never work.
--
-- Discovered 2026-07-12 while E2E-testing the custom-code approval flow.
-- ============================================

-- 1) Admin: full access to applications
CREATE POLICY admin_all_affiliate_applications ON public.affiliate_applications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

-- 2) Applicants: submit + view their own application
CREATE POLICY user_insert_own_application ON public.affiliate_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_select_own_application ON public.affiliate_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3) Admin: full access to affiliates (on top of the existing member
--    own-row policies from 20260710110000_affiliate_member_rls_policies)
CREATE POLICY admin_all_affiliates ON public.affiliates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

-- Known gotcha (not fixed here): approving an affiliate application whose
-- user_id IS NULL (anonymous applicant) fails — affiliates.user_id is NOT
-- NULL. Real applications submitted by logged-in users always carry user_id.
