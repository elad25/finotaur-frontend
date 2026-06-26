// src/features/automation/hooks/useAutomationAccess.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gate: who can access the Automation module?
//
// Currently: admin users OR users with hasBetaAccess (same logic as AdminBetaGate).
// To add a premium-tier gate later: add `|| accountType === 'premium'` on the
// single line marked TIER_GATE below and update the comment.
// ─────────────────────────────────────────────────────────────────────────────

import { useAdminAuth } from '@/hooks/useAdminAuth';

export interface AutomationAccessResult {
  /** True when the current user may use the Automation module. */
  canAccess: boolean;
  /** True while useAdminAuth is still resolving the user's role/account_type. */
  isLoading: boolean;
}

export function useAutomationAccess(): AutomationAccessResult {
  const { hasBetaAccess, isLoading } = useAdminAuth();

  // TIER_GATE: extend this condition when a paid-tier requirement is added.
  const canAccess = hasBetaAccess;

  return { canAccess, isLoading };
}
