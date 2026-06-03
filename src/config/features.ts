/**
 * Feature flags for runtime behavior gating.
 *
 * AFFILIATE_TRACKING: false — disabled until Stripe migration (~6 months).
 * Whop today = checkout only, no affiliate program. Existing UI hidden,
 * code/schema preserved. See plan v4 LAYER 7 for re-enable roadmap.
 *
 * COPILOT_DAILY_BRIEF: enabled for all subscribers (COPILOT daily brief E2E launch 2026-05-30).
 */
export const FEATURES = {
  AFFILIATE_TRACKING: false,
  // Enabled for all subscribers (COPILOT daily brief E2E launch 2026-05-30).
  COPILOT_DAILY_BRIEF: true,
} as const;
