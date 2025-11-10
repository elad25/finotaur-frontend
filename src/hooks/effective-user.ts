// ================================================
// 🔥 FIXED: useEffectiveUser - Proper Impersonation
// ================================================
// ✅ Works with sessionStorage-based impersonation
// ✅ Returns correct user ID for all data fetching
// ✅ Syncs with ImpersonationContext
// ================================================

import { useAuth } from '@/hooks/useAuth';

/**
 * Hook that returns the effective user ID and info based on impersonation state.
 * Use this instead of useAuth() when you need user data that should respect VIEW AS mode.
 * 
 * @example
 * const { userId } = useEffectiveUser();
 * const { data: trades } = useTrades(userId);
 */
export function useEffectiveUser() {
  const { 
    user, 
    viewingUserId, 
    impersonatedUserEmail,
    isImpersonating 
  } = useAuth();
  
  // ✅ Determine effective user ID
  const effectiveUserId = viewingUserId || user?.id || null;
  
  // ✅ Build effective user object
  const effectiveUser = isImpersonating && viewingUserId 
    ? {
        id: viewingUserId,
        email: impersonatedUserEmail || 'Unknown User',
        name: impersonatedUserEmail?.split('@')[0] || 'Unknown',
      }
    : user;
  
  return {
    // ✅ The ID to use for ALL data fetching
    userId: effectiveUserId,
    
    // ✅ User info (either impersonated or actual)
    effectiveUser,
    
    // ✅ State flags
    isImpersonating,
    
    // ✅ Original admin user (when impersonating)
    actualUser: user,
    
    // ✅ The user being viewed (when impersonating)
    impersonatedUser: isImpersonating && viewingUserId ? {
      id: viewingUserId,
      email: impersonatedUserEmail || 'Unknown',
    } : null,
  };
}