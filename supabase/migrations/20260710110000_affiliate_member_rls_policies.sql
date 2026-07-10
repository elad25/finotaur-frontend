-- ============================================
-- MEMBER REFERRAL — RLS POLICIES (applied to prod 2026-07-10)
-- ============================================
-- Discovery: prod had RLS ENABLED with ZERO policies on affiliates,
-- affiliate_referrals, affiliate_commissions, affiliate_payouts and
-- affiliate_config (deny-all for client reads). The policies written in
-- "complete-migration-6 Affiliate" were never applied — schema drift.
-- Symptom: the referral blocks always showed the provision CTA because the
-- client-side own-row SELECT returned empty, while the edge-function path
-- (service role, bypasses RLS) worked.
--
-- Scope (approved by Elad in chat, 2026-07-10): minimal own-row read access
-- for the member dashboard + paypal_email-only column update. Payouts and
-- config stay closed to clients. Edge functions (service role) unaffected.
-- ============================================

CREATE POLICY member_select_own_affiliate ON affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY member_select_own_referrals ON affiliate_referrals
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY member_select_own_commissions ON affiliate_commissions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- paypal_email is the ONLY column members may update, and only on their own
-- row. Column-level grant + own-row policy together enforce both axes.
REVOKE UPDATE ON affiliates FROM authenticated;
GRANT UPDATE (paypal_email) ON affiliates TO authenticated;
CREATE POLICY member_update_own_paypal ON affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
