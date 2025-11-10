// src/hooks/useEffectiveUser.ts
// ================================================
// EFFECTIVE USER HOOK WITH LOADING STATE
// ================================================

import { useAuth } from '@/providers/AuthProvider';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Returns the effective user ID and email to use for queries
 * - If impersonating: returns impersonated user
 * - Otherwise: returns actual logged-in user
 * - Includes loading state from auth context
 */
export function useEffectiveUser() {
  const { user, isLoading: authLoading } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();

  // Use auth loading only (impersonation context handles its own validation)
  const isLoading = authLoading;
  const effectiveUser = isImpersonating && impersonatedUser ? impersonatedUser : user;

  // 🔍 Debug logging
  console.log('🔍 useEffectiveUser:', {
    userId: effectiveUser?.id,
    email: effectiveUser?.email,
    isImpersonating,
    isLoading,
  });

  return {
    id: effectiveUser?.id,
    email: effectiveUser?.email,
    isImpersonating,
    isLoading,
  };
}