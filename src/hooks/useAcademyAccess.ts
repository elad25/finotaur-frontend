// src/hooks/useAcademyAccess.ts
// Entitlement check for gated Academy content. "Basic and up" = any paid
// plan from Basic upward (Journal + Platform tiers, plus admin/lifetime).
// Safe on public pages: useSubscription is gated by `enabled: !!user`, so
// anonymous visitors simply resolve to no access (no fetch, no error).
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import type { AccessLevel } from "@/content/academy/curriculum";

export interface AcademyAccess {
  isLoggedIn: boolean;
  /** True if the user is Basic tier or above (any paid plan). */
  hasBasicPlus: boolean;
  isLoading: boolean;
  /** Returns true if the given access level is unlocked for this user. */
  canRead: (level: AccessLevel) => boolean;
}

export function useAcademyAccess(): AcademyAccess {
  const { user, isLoading: authLoading } = useAuth();
  const { isBasic, isPremium, isAdmin, isLifetimeUser, isLoading: subLoading } =
    useSubscription();

  const hasBasicPlus = Boolean(isBasic || isPremium || isAdmin || isLifetimeUser);

  return {
    isLoggedIn: Boolean(user),
    hasBasicPlus,
    isLoading: authLoading || subLoading,
    canRead: (level) => level === "free" || hasBasicPlus,
  };
}
