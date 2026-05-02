/**
 * Feature flags for runtime behavior gating.
 *
 * AFFILIATE_TRACKING: false — disabled until Stripe migration (~6 months).
 * Whop today = checkout only, no affiliate program. Existing UI hidden,
 * code/schema preserved. See plan v4 LAYER 7 for re-enable roadmap.
 */
export const FEATURES = {
  AFFILIATE_TRACKING: false,
} as const;
