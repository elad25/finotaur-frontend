// src/contexts/AuthContext.tsx - OPTIMIZED + IMPERSONATION SUPPORT
import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseCache } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, affiliateCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔥 MOVED OUTSIDE - Prevent recreation on every render
async function processAffiliateCode(userId: string, affiliateCode: string): Promise<boolean> {
  try {
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id, referral_count')
      .eq('affiliate_code', affiliateCode)
      .single();

    if (referrerError || !referrerProfile || referrerProfile.id === userId) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: affiliateCode })
      .eq('id', userId);

    if (updateError) return false;

    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerProfile.id,
        referred_id: userId,
        referral_code: affiliateCode,
        status: 'pending',
        reward_granted_to_referrer: false,
        reward_granted_to_referred: false,
        signed_up_at: new Date().toISOString(),
        discount_applied: false,
        converted_to_paid: false
      });

    if (referralError) return false;

    const { error: countError } = await supabase
      .from('profiles')
      .update({ referral_count: (referrerProfile.referral_count || 0) + 1 })
      .eq('id', referrerProfile.id);

    return !countError;
  } catch (error) {
    console.error('Affiliate code error:', error);
    return false;
  }
}

async function generateAffiliateCode(name: string): Promise<string> {
  const base = name.substring(0, 3).toUpperCase() || 'FNT';
  let code = '';
  let attempts = 0;

  while (attempts < 10) {
    code = base + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const { data } = await supabase
      .from('profiles')
      .select('affiliate_code')
      .eq('affiliate_code', code)
      .single();

    if (!data) break;
    attempts++;
  }

  return code || 'FNT' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

// 🔥 GLOBAL SINGLETON למנוע duplicate tracking
let globalSnapTradeInterval: NodeJS.Timeout | null = null;
let globalSnapTradeUserId: string | null = null;

function startSnapTradeTracking(userId: string): void {
  // Prevent duplicate tracking
  if (globalSnapTradeInterval && globalSnapTradeUserId === userId) {
    return;
  }

  // Cleanup old interval if exists
  if (globalSnapTradeInterval) {
    clearInterval(globalSnapTradeInterval);
  }

  globalSnapTradeUserId = userId;

  const updateActivity = async () => {
    try {
      await supabase
        .from('snaptrade_activity')
        .upsert(
          {
            user_id: userId,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );
    } catch (error) {
      console.error('[SnapTrade] Update failed:', error);
    }
  };

  updateActivity();
  globalSnapTradeInterval = setInterval(updateActivity, 5 * 60 * 1000);

  if (import.meta.env.DEV) {
    console.log('[SnapTrade] Tracking started (singleton)');
  }
}

function stopSnapTradeTracking(): void {
  if (globalSnapTradeInterval) {
    clearInterval(globalSnapTradeInterval);
    globalSnapTradeInterval = null;
    globalSnapTradeUserId = null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  
  const isSubscribedRef = useRef(false);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  // 🔥 SnapTrade tracking - SINGLETON
  useEffect(() => {
    if (!user) {
      stopSnapTradeTracking();
      return;
    }

    startSnapTradeTracking(user.id);

    return () => {
      stopSnapTradeTracking();
    };
  }, [user?.id]);

  // 🔥 VISIBILITY TRACKING - Optimized with ref
  useEffect(() => {
    if (!user) return;

    // Remove old handler if exists
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await supabase
            .from('snaptrade_activity')
            .upsert(
              {
                user_id: user.id,
                last_activity_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        } catch (error) {
          console.error('[SnapTrade] Visibility update failed:', error);
        }
      }
    };

    visibilityHandlerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
    };
  }, [user?.id]);

  // 🔥 AUTH STATE - SINGLETON subscription
  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (import.meta.env.DEV) {
          console.log('Auth:', event);
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          localStorage.setItem('finotaur_user_id', userId);

          const pendingAffiliateCode = localStorage.getItem('pending_affiliate_code');
          if (pendingAffiliateCode) {
            await processAffiliateCode(userId, pendingAffiliateCode);
            localStorage.removeItem('pending_affiliate_code');
          }

          if (session.user.app_metadata.provider === 'google') {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .single();

            if (!existingProfile) {
              const displayName = 
                session.user.user_metadata?.full_name || 
                session.user.user_metadata?.name || 
                session.user.email?.split('@')[0] || 
                'User';

              const affiliateCode = await generateAffiliateCode(displayName);

              await supabase.from('profiles').insert({
                id: userId,
                display_name: displayName,
                email: session.user.email,
                affiliate_code: affiliateCode,
                account_type: 'free',
                max_trades: 10,
                trade_count: 0,
                role: 'user',
                login_count: 0,
                is_banned: false,
                referral_count: 0,
                free_months_available: 0
              });
            }
          }
        } else if (event === 'SIGNED_OUT') {
          queryClient.clear();
          supabaseCache.clear();
          
          const userId = localStorage.getItem('finotaur_user_id');
          if (userId) {
            localStorage.removeItem(`finotaur_trades_${userId}`);
            localStorage.removeItem(`finotaur_strategies_${userId}`);
            localStorage.removeItem('finotaur_user_id');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      isSubscribedRef.current = false;
    };
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }, []);

  const register = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    affiliateCode?: string
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed - no user returned');

      const newAffiliateCode = await generateAffiliateCode(name);

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email,
        display_name: name,
        affiliate_code: newAffiliateCode,
        referred_by: affiliateCode || null,
        account_type: 'free',
        max_trades: 10,
        trade_count: 0,
        role: 'user',
        login_count: 0,
        is_banned: false,
        referral_count: 0,
        free_months_available: 0
      });

      if (profileError) throw profileError;

      if (affiliateCode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await processAffiliateCode(authData.user.id, affiliateCode);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ================================================
// 🔥 MODIFIED useAuth - IMPERSONATION AWARE
// ================================================

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // 🔥 Get impersonation data from sessionStorage
  // This avoids circular dependency while being reactive
  const [impersonationData, setImpersonationData] = useState<{
    id: string;
    email: string;
    name?: string;
  } | null>(() => {
    try {
      const data = sessionStorage.getItem('imp_user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  // 🔥 Listen to impersonation events to trigger re-render
  useEffect(() => {
    const handleImpersonationChange = () => {
      try {
        const data = sessionStorage.getItem('imp_user_data');
        setImpersonationData(data ? JSON.parse(data) : null);
      } catch {
        setImpersonationData(null);
      }
    };

    window.addEventListener('impersonation-started', handleImpersonationChange);
    window.addEventListener('impersonation-stopped', handleImpersonationChange);

    return () => {
      window.removeEventListener('impersonation-started', handleImpersonationChange);
      window.removeEventListener('impersonation-stopped', handleImpersonationChange);
    };
  }, []);

  // 🔥 If impersonating, return the impersonated user
  const effectiveUser = useMemo(() => {
    if (impersonationData) {
      // Create a mock User object that matches Supabase's User type
      return {
        id: impersonationData.id,
        email: impersonationData.email,
        user_metadata: {
          display_name: impersonationData.name || impersonationData.email,
          full_name: impersonationData.name || impersonationData.email,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;
    }
    
    return context.user;
  }, [context.user, impersonationData]);

  return {
    ...context,
    user: effectiveUser,
  };
}