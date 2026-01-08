// src/hooks/useAdminAuth.ts
// =====================================================
// 🔥 v2.0: BETA ACCESS SYSTEM
// =====================================================
// 
// This hook provides admin and beta access checks.
// Beta access is granted to:
// - Admin users (role: 'admin' or 'super_admin')
// - VIP users (account_type: 'vip')
// - Users with account_type: 'beta' (NEW!)
// 
// Usage:
// const { isAdmin, isSuperAdmin, hasBetaAccess } = useAdminAuth();
// =====================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasBetaAccess: boolean;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  accountType: string | null;
}

// Cache to prevent repeated queries
const adminAuthCache = new Map<string, AdminAuthState>();

export function useAdminAuth() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    hasBetaAccess: false,
    isLoading: true,
    error: null,
    role: null,
    accountType: null,
  });
  
  const checkedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        hasBetaAccess: false,
        isLoading: false,
        error: null,
        role: null,
        accountType: null,
      });
      return;
    }

    // Check cache first
    const cached = adminAuthCache.get(user.id);
    if (cached && checkedUserRef.current === user.id) {
      setState(cached);
      return;
    }

    // Skip if already checked for this user
    if (checkedUserRef.current === user.id && !state.isLoading) {
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, account_type')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[useAdminAuth] Error:', error);
          const errorState: AdminAuthState = {
            isAdmin: false,
            isSuperAdmin: false,
            hasBetaAccess: false,
            isLoading: false,
            error: error.message,
            role: null,
            accountType: null,
          };
          setState(errorState);
          return;
        }

        const role = profile?.role || 'user';
        const accountType = profile?.account_type || 'free';
        
        // 🔥 Admin check
        const isAdmin = role === 'admin' || role === 'super_admin';
        const isSuperAdmin = role === 'super_admin';
        
        // 🔥 BETA ACCESS CHECK
        // Beta access is granted to:
        // 1. Admin/Super Admin users
        // 2. VIP users
        // 3. Users with account_type 'beta' (NEW!)
        const hasBetaAccess = 
          isAdmin || 
          accountType === 'vip' || 
          accountType === 'admin' ||
          accountType === 'beta';

        const newState: AdminAuthState = {
          isAdmin,
          isSuperAdmin,
          hasBetaAccess,
          isLoading: false,
          error: null,
          role,
          accountType,
        };

        // Cache the result
        adminAuthCache.set(user.id, newState);
        checkedUserRef.current = user.id;
        
        setState(newState);

        if (import.meta.env.DEV) {
          console.log('[useAdminAuth] ✅ Status:', {
            userId: user.id,
            role,
            accountType,
            isAdmin,
            hasBetaAccess,
          });
        }
      } catch (err) {
        console.error('[useAdminAuth] Exception:', err);
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          hasBetaAccess: false,
          isLoading: false,
          error: 'Failed to check admin status',
          role: null,
          accountType: null,
        });
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  return state;
}

// =====================================================
// 🔥 Utility function to clear cache (for testing)
// =====================================================
export function clearAdminAuthCache() {
  adminAuthCache.clear();
}