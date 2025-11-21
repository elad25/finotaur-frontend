// src/hooks/useEffectiveUser.ts
// ================================================
// EFFECTIVE USER HOOK WITH LOADING STATE
// ✅ FIXED: Properly returns impersonated user ID
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

  // 🔥 CRITICAL FIX: Always use impersonated user if available
  const effectiveUserId = isImpersonating && impersonatedUser?.id 
    ? impersonatedUser.id 
    : user?.id;
  
  const effectiveEmail = isImpersonating && impersonatedUser?.email 
    ? impersonatedUser.email 
    : user?.email;

  // 🔍 Debug logging
  console.log('🔍 useEffectiveUser:', {
    userId: effectiveUserId,
    email: effectiveEmail,
    isImpersonating,
    isLoading: authLoading,
    impersonatedUser: impersonatedUser ? { id: impersonatedUser.id, email: impersonatedUser.email } : null,
    actualUser: user ? { id: user.id, email: user.email } : null,
  });

  return {
    id: effectiveUserId,
    email: effectiveEmail,
    isImpersonating,
    isLoading: authLoading,
  };
}