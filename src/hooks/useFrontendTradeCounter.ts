// ================================================
// 🔥 FRONTEND TRADE COUNTER - FIXED v2.2.0
// ================================================
// ✅ Proper types from database.ts
// ✅ All TypeScript errors fixed
// ✅ Full error handling
// ================================================

import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentSession, verifyAuthState } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types/database';

const isDev = import.meta.env.DEV;

export interface FrontendTradeCount {
  total: number;           
  monthly: number;         
  accountType: 'free' | 'basic' | 'premium';
  limit: number;           
  remaining: number;       
  canCreate: boolean;      
  isUnlimited: boolean;
  error: string | null;
  isLoading: boolean;
}

// 🔥 DEFAULT STATE
const DEFAULT_STATE: FrontendTradeCount = {
  total: 0,
  monthly: 0,
  accountType: 'free',
  limit: 10,
  remaining: 10,
  canCreate: true,
  isUnlimited: false,
  error: null,
  isLoading: true,
};

export function useFrontendTradeCounter() {
  const { user } = useAuth();
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [authIssues, setAuthIssues] = useState<string[]>([]);
  
  // 🔥 Verify auth state on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const verify = async () => {
      const { isAuthenticated, issues } = await verifyAuthState();
      
      if (!isAuthenticated && issues.length > 0) {
        setAuthIssues(issues);
        
        if (isDev) {
          console.error('🚨 Auth Issues Detected:', issues);
        }
      } else {
        setAuthIssues([]);
      }
    };
    
    verify();
  }, [user?.id]);
  
  // 📊 Fetch actual count from DB
  const { data: dbCount, refetch, isLoading, error: queryError } = useQuery({
    queryKey: ['frontend-trade-count', user?.id],
    queryFn: async (): Promise<FrontendTradeCount> => {
      if (!user?.id) {
        if (isDev) {
          console.warn('⚠️ [Frontend Counter] No user ID');
        }
        return { ...DEFAULT_STATE, error: 'Not authenticated' };
      }
      
      if (isDev) {
        console.log('📊 [Frontend Counter] Fetching for user:', user.id);
      }
      
      // 🔥 STEP 1: Verify session
      const { userId, accessToken, error: sessionError } = await getCurrentSession();
      
      if (sessionError || !userId) {
        if (isDev) {
          console.error('❌ [Frontend Counter] Session error:', sessionError);
        }
        
        return {
          ...DEFAULT_STATE,
          error: sessionError || 'No active session',
          isLoading: false,
        };
      }
      
      // 🔥 STEP 2: Get profile with explicit type
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_type, role, trade_count, current_month_trades_count, max_trades')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileError) {
          if (isDev) {
            console.error('❌ [Frontend Counter] Profile error:', profileError);
          }
          
          return {
            ...DEFAULT_STATE,
            error: `Profile error: ${profileError.message}`,
            isLoading: false,
          };
        }
        
        if (!profile) {
          if (isDev) {
            console.error('❌ [Frontend Counter] Profile not found');
          }
          
          return {
            ...DEFAULT_STATE,
            error: 'Profile not found',
            isLoading: false,
          };
        }
        
        // 🔥 Type assertion for profile data
        const typedProfile = profile as Pick<Profile, 'account_type' | 'role' | 'trade_count' | 'current_month_trades_count' | 'max_trades'>;
        
        // 🔥 STEP 3: Calculate limits
        const isUnlimited = 
          typedProfile.account_type === 'premium' ||
          typedProfile.account_type === 'admin' ||
          typedProfile.role === 'admin' ||
          typedProfile.role === 'super_admin';
        
        // FREE: lifetime count, BASIC: monthly count
        const usedCount = typedProfile.account_type === 'free' 
          ? (typedProfile.trade_count || 0)
          : (typedProfile.current_month_trades_count || 0);
        
        const limit = isUnlimited ? 999999 : (typedProfile.max_trades || 10);
        const remaining = Math.max(0, limit - usedCount);
        
        const result: FrontendTradeCount = {
          total: typedProfile.trade_count || 0,
          monthly: typedProfile.current_month_trades_count || 0,
          accountType: typedProfile.account_type as 'free' | 'basic' | 'premium',
          limit,
          remaining,
          canCreate: isUnlimited || remaining > 0,
          isUnlimited,
          error: null,
          isLoading: false,
        };
        
        if (isDev) {
          console.log('✅ [Frontend Counter] Result:', result);
        }
        
        // Backup to localStorage
        try {
          localStorage.setItem('finotaur_trade_count', JSON.stringify(result));
        } catch (e) {
          // Ignore localStorage errors
        }
        
        return result;
        
      } catch (error: any) {
        if (isDev) {
          console.error('❌ [Frontend Counter] Unexpected error:', error);
        }
        
        return {
          ...DEFAULT_STATE,
          error: error?.message || 'Unknown error',
          isLoading: false,
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
  
  // 🔔 Listen to realtime inserts
  useEffect(() => {
    if (!user?.id) return;
    
    if (isDev) {
      console.log('🔔 [Frontend Counter] Setting up realtime listener');
    }
    
    const channel = supabase
      .channel(`frontend-counter:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (isDev) {
            console.log('🔔 [Frontend Counter] New trade detected!', payload);
          }
          
          // Immediate local increment
          if (dbCount) {
            const newCount = {
              ...dbCount,
              total: dbCount.total + 1,
              monthly: dbCount.monthly + 1,
              remaining: Math.max(0, dbCount.remaining - 1),
              canCreate: dbCount.isUnlimited || dbCount.remaining > 1,
            };
            
            setLocalCount(newCount.total);
            
            try {
              localStorage.setItem('finotaur_trade_count', JSON.stringify(newCount));
            } catch (e) {
              // Ignore
            }
            
            if (isDev) {
              console.log('⚡ [Frontend Counter] Local increment:', newCount);
            }
          }
          
          // Refresh from DB after 500ms
          setTimeout(() => refetch(), 500);
        }
      )
      .subscribe((status) => {
        if (isDev) {
          console.log('🔔 [Frontend Counter] Subscription status:', status);
        }
      });
    
    return () => {
      if (isDev) {
        console.log('🔕 [Frontend Counter] Removing listener');
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, dbCount, refetch]);
  
  // 🎯 Return state
  const current = dbCount || DEFAULT_STATE;
  
  // 🚨 Add auth issues to error
  const finalError = authIssues.length > 0
    ? `Auth issues: ${authIssues.join(', ')}`
    : current.error;
  
  if (isDev && isLoading) {
    console.log('⏳ [Frontend Counter] Loading...');
  }
  
  if (isDev && queryError) {
    console.error('❌ [Frontend Counter] Query error:', queryError);
  }
  
  return {
    ...current,
    error: finalError,
    refresh: refetch,
    localCount,
    isLoading,
    authIssues,
  };
}