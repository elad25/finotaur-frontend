// src/hooks/useAdminAuth.ts
// v1.1.0 - Production ready - No console logs
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/admin';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  async function checkAdminStatus() {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!user) {
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          role: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Check if user has admin role in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          role: null,
          isLoading: false,
          error: 'Failed to verify admin status',
        });
        return;
      }

      const role = profile?.role as UserRole;
      const isAdmin = role === 'admin' || role === 'super_admin';
      const isSuperAdmin = role === 'super_admin';

      setState({
        isAdmin,
        isSuperAdmin,
        role,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        role: null,
        isLoading: false,
        error: err.message || 'Unknown error',
      });
    }
  }

  return {
    ...state,
    isLoading: state.isLoading || authLoading,
    refresh: checkAdminStatus,
  };
}