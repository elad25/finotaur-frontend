// src/hooks/useEffectiveUser.ts
// ================================================
// EFFECTIVE USER HOOK - OPTIMIZED v2.0
// ✅ FIXED: Proper memoization to prevent infinite re-renders
// ✅ FIXED: Stable reference return
// ✅ FIXED: Debug logging only in dev and throttled
// ================================================

import { useMemo, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useMentorView } from '@/contexts/MentorViewContext';

interface EffectiveUser {
  id: string | undefined;
  email: string | undefined;
  isImpersonating: boolean;
  isMentorView: boolean;
  isLoading: boolean;
}

// Throttle logging to prevent console spam
let lastLogTime = 0;
const LOG_THROTTLE_MS = 2000;

/**
 * Returns the effective user ID and email to use for queries
 * - If impersonating: returns impersonated user
 * - Otherwise: returns actual logged-in user
 * - Includes loading state from auth context
 * 
 * ✅ OPTIMIZED: Uses useMemo with primitive dependencies to prevent re-renders
 */
export function useEffectiveUser(): EffectiveUser {
  const { user, isLoading: authLoading } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const { isMentorView, studentUserId, studentEmail } = useMentorView();

  // Track previous values for comparison
  const prevResultRef = useRef<EffectiveUser | null>(null);

  // Extract primitive values to use as dependencies
  const userId = user?.id;
  const userEmail = user?.email;
  const impersonatedId = impersonatedUser?.id;
  const impersonatedEmail = impersonatedUser?.email;
  const mentorStudentId = studentUserId ?? undefined;
  const mentorStudentEmail = studentEmail ?? undefined;

  // Memoize the result with primitive dependencies only.
  // Precedence: Mentor View > Impersonation > Session.
  const result = useMemo((): EffectiveUser => {
    const effectiveUserId = isMentorView && mentorStudentId
      ? mentorStudentId
      : isImpersonating && impersonatedId
        ? impersonatedId
        : userId;

    const effectiveEmail = isMentorView && mentorStudentId
      ? mentorStudentEmail
      : isImpersonating && impersonatedEmail
        ? impersonatedEmail
        : userEmail;

    return {
      id: effectiveUserId,
      email: effectiveEmail,
      isImpersonating,
      isMentorView: isMentorView && !!mentorStudentId,
      isLoading: authLoading,
    };
  }, [userId, userEmail, impersonatedId, impersonatedEmail, isImpersonating, isMentorView, mentorStudentId, mentorStudentEmail, authLoading]);

  // Throttled debug logging (only in development)
  if (import.meta.env.DEV) {
    const now = Date.now();
    const hasChanged = !prevResultRef.current || 
      prevResultRef.current.id !== result.id ||
      prevResultRef.current.isImpersonating !== result.isImpersonating ||
      prevResultRef.current.isLoading !== result.isLoading;

    if (hasChanged && now - lastLogTime > LOG_THROTTLE_MS) {
      lastLogTime = now;
      console.log('🔍 useEffectiveUser:', {
        userId: result.id,
        email: result.email,
        isImpersonating: result.isImpersonating,
        isLoading: result.isLoading,
      });
    }
    
    prevResultRef.current = result;
  }

  return result;
}