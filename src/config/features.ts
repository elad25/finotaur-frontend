/**
 * Feature flags for runtime behavior gating.
 *
 * AFFILIATE_TRACKING: false — disabled until Stripe migration (~6 months).
 * Whop today = checkout only, no affiliate program. Existing UI hidden,
 * code/schema preserved. See plan v4 LAYER 7 for re-enable roadmap.
 *
 * COPILOT_DAILY_BRIEF: false — Phase 1 foundation (primitives only).
 * Set VITE_COPILOT_DAILY_BRIEF=true in .env.local to enable during development.
 */
export const FEATURES = {
  AFFILIATE_TRACKING: false,
  COPILOT_DAILY_BRIEF: import.meta.env.VITE_COPILOT_DAILY_BRIEF === 'true' || false,
} as const;
