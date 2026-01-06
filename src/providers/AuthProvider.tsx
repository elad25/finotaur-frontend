// src/providers/AuthProvider.tsx
// 🔥 v2: REDUCED LOGGING - Only errors and critical events
import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, affiliateCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================================================
// 🔥 LOGGING CONTROL - Prevent duplicate logs
// ================================================

const _authLoggedOnce = new Set<string>();

function logOnce(key: string, ...args: any[]) {
  if (import.meta.env.DEV && !_authLoggedOnce.has(key)) {
    _authLoggedOnce.add(key);
    console.log(...args);
  }
}

// ================================================
// HELPERS
// ================================================

async function processAffiliateCode(userId: string, affiliateCode: string): Promise<boolean> {
  try {
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id, referral_count')
      .eq('affiliate_code', affiliateCode)
      .maybeSingle();

    if (referrerError || !referrerProfile) {
      return false;
    }

    if (referrerProfile.id === userId) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: affiliateCode })
      .eq('id', userId);

    if (updateError) {
      return false;
    }

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

    if (referralError) {
      return false;
    }

    const { error: countError } = await supabase
      .from('profiles')
      .update({ 
        referral_count: (referrerProfile.referral_count || 0) + 1 
      })
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
      .maybeSingle();

    if (!data) break;
    attempts++;
  }

  return code || 'FNT' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  
  const isSubscribedRef = useRef(false);
  const snapTradeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTrackingActiveRef = useRef(false);

  // SnapTrade tracking
  useEffect(() => {
    if (isTrackingActiveRef.current) {
      // 🔥 Removed log: '[SnapTrade] Already tracking - skipping duplicate'
      return;
    }

    if (!user) {
      if (snapTradeIntervalRef.current) {
        clearInterval(snapTradeIntervalRef.current);
        snapTradeIntervalRef.current = null;
        isTrackingActiveRef.current = false;
      }
      return;
    }

    isTrackingActiveRef.current = true;

    const updateActivity = async () => {
      try {
        const { error } = await supabase
          .from('snaptrade_activity')
          .upsert(
            {
              user_id: user.id,
              last_activity_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
              ignoreDuplicates: false,
            }
          );

        if (error) {
          // 🔥 Silent fail - removed console.error
        }
      } catch (error) {
        // 🔥 Silent fail - removed console.error
      }
    };

    updateActivity();
    snapTradeIntervalRef.current = setInterval(updateActivity, 5 * 60 * 1000);

    // 🔥 Log only once
    logOnce('snaptrade-init', '[SnapTrade] Tracking started');

    return () => {
      if (snapTradeIntervalRef.current) {
        clearInterval(snapTradeIntervalRef.current);
        snapTradeIntervalRef.current = null;
        isTrackingActiveRef.current = false;
      }
    };
   }, [user?.id]);

  // Visibility tracking
  useEffect(() => {
    if (!user) return;

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
          // 🔥 Silent fail - removed console.error
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
   }, [user?.id]);

  useEffect(() => {
    if (isSubscribedRef.current) {
      // 🔥 Removed log: '[Auth] Already subscribed, skipping'
      return;
    }
    isSubscribedRef.current = true;

    logOnce('auth-init', '[Auth] Initializing auth system...');

    const initializeAuth = async () => {
      try {
        // 🔥 Removed log: '[Auth] Checking for existing session...'
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Session check error:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          logOnce('auth-session', '[Auth] ✅ Session found:', session.user.email);
          setUser(session.user);
        } else {
          logOnce('auth-no-session', '[Auth] No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Session initialization failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 🔥 Log each event type only once
      logOnce(`auth-event-${event}`, '[Auth] State change:', event);
      
      setUser(session?.user ?? null);
      
      if (isLoading) {
        setIsLoading(false);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id;
        // 🔥 Log only once per user
        logOnce(`auth-signin-${userId}`, '[Auth] User signed in:', session.user.email);
        localStorage.setItem('finotaur_user_id', userId);

        // 🔥 CRITICAL FIX: Clear any old impersonation data on real login
        sessionStorage.removeItem('imp_user_data');

        const pendingAffiliateCode = localStorage.getItem('pending_affiliate_code');
        if (pendingAffiliateCode) {
          // 🔥 Removed log: '[Auth] Processing pending affiliate code...'
          await processAffiliateCode(userId, pendingAffiliateCode);
          localStorage.removeItem('pending_affiliate_code');
        }

        if (session.user.app_metadata.provider === 'google') {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (!existingProfile) {
  // 🔥 Creating profile for Google user with proper defaults
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
    subscription_status: null,
    max_trades: 10,
    trade_count: 0,
    current_month_trades_count: 0,
    portfolio_size: 10000,
    risk_mode: 'percentage',
    risk_percentage: 1.0,
    onboarding_completed: false,
    role: 'user',
    is_banned: false,
    // ✅ Newsletter token
    newsletter_unsubscribe_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
    newsletter_enabled: false,
    newsletter_status: 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}
        }
      } else if (event === 'SIGNED_OUT') {
        logOnce(`auth-signout-${Date.now()}`, '[Auth] User signed out');
        // 🔥 Reset the logged keys for sign-in events so they can log again on next login
        _authLoggedOnce.delete('auth-session');
        _authLoggedOnce.forEach(key => {
          if (key.startsWith('auth-signin-') || key.startsWith('auth-event-SIGNED_IN')) {
            _authLoggedOnce.delete(key);
          }
        });
        
        queryClient.clear();
        
        // 🔥 CRITICAL FIX: Clear impersonation on logout
        sessionStorage.removeItem('imp_user_data');
        
        const userId = localStorage.getItem('finotaur_user_id');
        if (userId) {
          localStorage.removeItem(`finotaur_trades_${userId}`);
          localStorage.removeItem(`finotaur_strategies_${userId}`);
          localStorage.removeItem('finotaur_user_id');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // 🔥 Removed log: '[Auth] Token refreshed successfully'
      }
    });

    return () => {
      // 🔥 Removed log: '[Auth] Cleaning up subscription'
      subscription.unsubscribe();
      isSubscribedRef.current = false;
    };
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // 🔥 Removed log: '[Auth] Attempting login for:', email
      
      // 🔥 CRITICAL FIX: Clear impersonation before login
      sessionStorage.removeItem('imp_user_data');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // 🔥 Removed log: '[Auth] Login successful'
    } catch (error: any) {
      console.error('[Auth] Login failed:', error);
      throw new Error(error.message || 'Login failed');
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, affiliateCode?: string) => {
    try {
      // 🔥 Removed log: '[Auth] Attempting registration for:', email
      
      // 🔥 FIX: Check if user already exists first
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This email is already registered. Please sign in instead.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed - no user returned');

      const newAffiliateCode = await generateAffiliateCode(name);

      // 🔥 FIX: Check again if profile was created by trigger
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileCheck) {
        // 🔥 Removed log: '[Auth] Profile already exists (created by trigger)'
      } else {
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: email,
    display_name: name,
    affiliate_code: newAffiliateCode,
    referred_by: affiliateCode || null,
    // ✅ FIX: Match handle_new_user() trigger defaults
    account_type: 'free',
    subscription_status: null,
    max_trades: 10,
    current_month_trades_count: 0,
    portfolio_size: 10000,
    risk_mode: 'percentage',
    risk_percentage: 1.0,
    onboarding_completed: false,
    role: 'user',
    is_banned: false,
    // ✅ Newsletter token
    newsletter_unsubscribe_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
    newsletter_enabled: false,
    newsletter_status: 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 🔥 FIX: Ignore 409 duplicate key errors
  if (profileError && profileError.code !== '23505') {
    throw profileError;
  }
}

      if (affiliateCode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await processAffiliateCode(authData.user.id, affiliateCode);
      }

      // 🔥 Removed log: '[Auth] Registration successful'
    } catch (error: any) {
      console.error('[Auth] Registration failed:', error);
      
      // 🔥 Better error messages
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        throw new Error('This email is already registered. Please sign in instead.');
      } else if (error.message?.includes('User already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      } else {
        throw new Error(error.message || 'Registration failed');
      }
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // 🔥 Removed log: '[Auth] Initiating Google sign-in...'
      
      // 🔥 CRITICAL FIX: Clear impersonation before Google login
      sessionStorage.removeItem('imp_user_data');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 🔥 Redirect to Top Secret (not pricing-selection)
          redirectTo: `${window.location.origin}/app/top-secret`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('[Auth] Google sign-in failed:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // 🔥 Removed log: '[Auth] Logging out...'
      
      // 🔥 CRITICAL FIX: Clear impersonation on logout
      sessionStorage.removeItem('imp_user_data');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // 🔥 Removed log: '[Auth] Logout successful'
    } catch (error: any) {
      console.error('[Auth] Logout failed:', error);
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
// 🔥 FIXED: Only use impersonation when explicitly set by admin
// ================================================

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // 🔥 CRITICAL FIX: Only check impersonation, don't create it
  const [impersonationData, setImpersonationData] = useState<{
    id: string;
    email: string;
    name?: string;
  } | null>(() => {
    try {
      const data = sessionStorage.getItem('imp_user_data');
      // 🔥 Only use if explicitly set AND we're not currently logging in
      if (data && context.user) {
        return JSON.parse(data);
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleImpersonationChange = () => {
      try {
        const data = sessionStorage.getItem('imp_user_data');
        setImpersonationData(data ? JSON.parse(data) : null);
        
        // 🔥 Log only once per impersonation
        if (data) {
          const parsed = JSON.parse(data);
          logOnce(`imp-${parsed.id}`, '🎭 Impersonation state changed:', parsed);
        }
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

  // 🔥 CRITICAL FIX: Only use impersonated user if explicitly impersonating
  const effectiveUser = useMemo(() => {
    // Only use impersonation if:
    // 1. impersonationData exists
    // 2. We have a real user (admin) logged in
    // 3. The impersonated ID is different from the real user ID
    if (impersonationData && context.user && impersonationData.id !== context.user.id) {
      // 🔥 Log only once per impersonation
      logOnce(`imp-effective-${impersonationData.id}`, '🎭 Using impersonated user:', impersonationData.id, impersonationData.email);
      
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
    
    // Otherwise, use the real logged-in user
    return context.user;
  }, [context.user, impersonationData]);

  return {
    ...context,
    user: effectiveUser,
  };
}