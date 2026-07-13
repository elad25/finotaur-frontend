/**
 * Feature flags for runtime behavior gating.
 *
 * AFFILIATE_TRACKING: true — affiliate program GO-LIVE 2026-07-13 (Elad).
 * Enables click attribution (AffiliateTracker mounts in App.tsx), the public
 * /affiliate page, the footer link, and the Settings › Affiliates tab.
 * Commission creation is live via the Whop webhook → SQL RPC. NOTE: real PayPal
 * payouts require PAYPAL_MODE=live + PayPal/Whop edge-function secrets set in
 * production (see MASTER_PLAN); payouts run monthly (day 15) and are admin-triggered.
 *
 * COPILOT_DAILY_BRIEF: enabled for all subscribers (COPILOT daily brief E2E launch 2026-05-30).
 */
export const FEATURES = {
  AFFILIATE_TRACKING: true,
  // Enabled for all subscribers (COPILOT daily brief E2E launch 2026-05-30).
  COPILOT_DAILY_BRIEF: true,
} as const;
