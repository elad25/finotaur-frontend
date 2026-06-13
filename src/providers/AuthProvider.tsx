// src/providers/AuthProvider.tsx
// 🔥 v2: REDUCED LOGGING - Only errors and critical events
import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { FEATURES } from '@/config/features';
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/withTimeout';
import { logger } from '@/lib/logger';
import { setSentryUser } from '@/lib/sentry';
import { track } from '@/lib/analytics';
import { getFirstTouch } from '@/lib/analytics/attribution';
import { fireWelcomeEmail } from '@/services/welcomeEmailService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
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
// TIMEOUT-WARN RATE LIMITER
// ================================================

// Suppress duplicate "[Auth] getSession timeout — fallback succeeded" noise.
// Log at most once every 5 minutes per page load (module-scoped — reset on
// full page reload, not on React re-mount).
let _lastTimeoutWarnAt = 0;
const TIMEOUT_WARN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Wait for the handle_new_user trigger to create the profiles row.
 * Polls every 250ms up to 2000ms total. Returns true if found, false on timeout.
 *
 * Used after signup to gate the affiliate_code / display_name UPDATE so we don't
 * race against the trigger.
 */
async function waitForProfile(userId: string, timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (data) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) {
      // 🔥 Removed log: '[Auth] Already subscribed, skipping'
      return;
    }
    isSubscribedRef.current = true;

    logOnce('auth-init', '[Auth] Initializing auth system...');

    const initializeAuth = async () => {
      let session: Session | null = null;
      let getSessionError: unknown = null;
      try {
        // 🔥 Removed log: '[Auth] Checking for existing session...'
        const result = await withTimeout(
          supabase.auth.getSession(),
          TIMEOUTS.AUTH,
          'AuthProvider.getSession'
        );
        session = result.data.session;
        if (result.error) getSessionError = result.error;
      } catch (err) {
        getSessionError = err;
        if (err instanceof TimeoutError) {
          // P0.0 fix (OQ-93): on getSession timeout, try the lighter getUser()
          // path before declaring no-session. getUser() reads from the local
          // storage adapter without forcing a token refresh round-trip, so it
          // recovers the user when the hang is in Supabase's internal refresh
          // (hypothesis A) or in network preflight, while staying cheap when
          // localStorage itself is the bottleneck (hypothesis B). withTimeout
          // wraps it to honour ADL-040 (no unbounded promise on critical path).
          const hasStoredSession = !!localStorage.getItem('finotaur-auth-token');
          try {
            const fallback = await withTimeout(
              supabase.auth.getUser(),
              4000,
              'AuthProvider.getUser.fallback'
            );
            if (fallback.data?.user && !fallback.error) {
              // Synthesise a minimal Session from the cached user. The real
              // Session (with access_token / refresh_token) will arrive via
              // onAuthStateChange once Supabase's internal state settles —
              // this just unblocks the initial render so the user isn't stuck
              // on the login screen while the SDK recovers.
              session = { user: fallback.data.user } as Session;
              // Rate-limited warn: only log once per 5 minutes to avoid
              // spamming Sentry/console when auth lock contention is ongoing.
              const now = Date.now();
              if (now - _lastTimeoutWarnAt >= TIMEOUT_WARN_INTERVAL_MS) {
                _lastTimeoutWarnAt = now;
                logger.warn(
                  '[Auth] getSession timeout — session served via getUser fallback ' +
                  '(auth lock contention)',
                  { hasStoredSession }
                );
              }
            } else if (fallback.error) {
              logger.error('[Auth] getSession timeout and getUser fallback failed', {
                fallbackError: fallback.error,
                hasStoredSession,
              });
            }
          } catch (fallbackErr) {
            logger.error('[Auth] getSession timeout and getUser fallback failed', {
              fallbackErr,
              hasStoredSession,
            });
          }
        } else {
          logger.error('[Auth] Session fetch failed', err);
        }
      } finally {
        if (getSessionError && !(getSessionError instanceof TimeoutError)) {
          console.error('[Auth] Session check error:', getSessionError);
        }

        if (session?.user) {
          logOnce('auth-session', '[Auth] ✅ Session found:', session.user.email);
          setUser(session.user);
          logger.setContext({ userId: session.user.id, email: session.user.email });
          setSentryUser({ id: session.user.id });
        } else {
          logOnce('auth-no-session', '[Auth] No session found');
          setUser(null);
        }

        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('[Auth] state change', { event, hasSession: !!session, userId: session?.user?.id });
      // 🔥 Log each event type only once
      logOnce(`auth-event-${event}`, '[Auth] State change:', event);

      setUser(session?.user ?? null);

      if (isLoading) {
        setIsLoading(false);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id;
        // ── Critical path (synchronous-only) ──
        // These must run before the next microtask so any downstream consumer
        // of <AuthContext> (ProtectedRoute, useAuth, etc.) sees a coherent
        // logged-in state on the very next render. Sub-millisecond cost.
        logger.setContext({ userId: session.user.id, email: session.user.email });
        setSentryUser({ id: session.user.id });
        logOnce(`auth-signin-${userId}`, '[Auth] User signed in:', session.user.email);
        localStorage.setItem('finotaur_user_id', userId);
        sessionStorage.removeItem('imp_user_data'); // clear stale impersonation

        // ── Deferred path (off critical path) ──
        // P0.0 fix (OQ-93): the affiliate processing, waitForProfile (2 s poll),
        // first-sign-in profile UPDATE and generateAffiliateCode (up to 10
        // queries) used to run inline here. When TOKEN_REFRESHED races with
        // the initial getSession() — common on returning users with a session
        // older than the JWT TTL — this block could starve the event loop for
        // seconds, contributing to AuthProvider.getSession TimeoutError events
        // (Sentry MZ-2E). Wrapping in queueMicrotask lets the current
        // onAuthStateChange callback resolve immediately and any pending
        // getSession promise settle, while still running the work in this tick
        // (no UI delay). ADL-040: SIGNED_IN handler must not block render.
        queueMicrotask(async () => {
          try {
            if (FEATURES.AFFILIATE_TRACKING) {
              const pendingAffiliateCode = localStorage.getItem('pending_affiliate_code');
              if (pendingAffiliateCode) {
                await processAffiliateCode(userId, pendingAffiliateCode);
                localStorage.removeItem('pending_affiliate_code');
              }
            }

            if (session.user.app_metadata.provider === 'google') {
              const profileReady = await waitForProfile(userId);
              if (!profileReady) {
                console.warn(`[Auth] Profile not created within 2s for user ${userId}. Trigger may have failed.`);
                toast.error(
                  'Account created, but profile setup is taking longer than usual. ' +
                  'Please refresh in a moment. If the problem persists, contact support.'
                );
              } else {
                // First-sign-in gate: only populate user-specific fields when the
                // profile is freshly minted (affiliate_code IS NULL means we have
                // not run this block before). Returning users keep their data.
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('affiliate_code, terms_accepted_at')
                  .eq('id', userId)
                  .maybeSingle();

                if (existingProfile && !existingProfile.affiliate_code) {
                  const meta = session.user.user_metadata ?? {};
                  const fullName: string =
                    meta.full_name ||
                    meta.name ||
                    session.user.email?.split('@')[0] ||
                    'User';
                  // Google provides given_name/family_name; fall back to splitting full name.
                  const firstName: string = meta.given_name || fullName.split(' ')[0] || '';
                  const lastName: string =
                    meta.family_name || fullName.split(' ').slice(1).join(' ') || '';
                  const displayName =
                    [firstName, lastName].filter(Boolean).join(' ').trim() || fullName;
                  const affiliateCode = await generateAffiliateCode(displayName);

                  // Persist pre-OAuth terms acceptance (set by Register.tsx
                  // localStorage before redirect) if profile lacks them.
                  const pendingTermsAt = localStorage.getItem('pending_terms_accepted_at');
                  const pendingTermsVer = localStorage.getItem('pending_terms_version');
                  const termsFields =
                    !existingProfile.terms_accepted_at && pendingTermsAt && pendingTermsVer
                      ? { terms_accepted_at: pendingTermsAt, terms_version: pendingTermsVer }
                      : {};

                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                      affiliate_code: affiliateCode,
                      display_name: displayName,
                      first_name: firstName || null,
                      last_name: lastName || null,
                      ...termsFields,
                    })
                    .eq('id', userId);

                  if (updateError) {
                    console.error('[Auth] First-sign-in profile UPDATE failed:', updateError);
                  } else {
                    localStorage.removeItem('pending_terms_accepted_at');
                    localStorage.removeItem('pending_terms_version');
                    // Fire-and-forget: attribute this OAuth signup to its first-touch source.
                    track('signup', { method: 'oauth', ...getFirstTouch() });
                    // Fire-and-forget: trigger welcome email immediately (cron is the backstop).
                    void fireWelcomeEmail();
                  }
                }
              }
            }
          } catch (deferredErr) {
            // Never let deferred work crash the auth flow — the user is
            // already signed in by the time we get here. Log + move on.
            logger.error('[Auth] Deferred SIGNED_IN work failed', deferredErr);
          }
        });
      } else if (event === 'SIGNED_OUT') {
        logger.clearContext();
        setSentryUser(null);
        logOnce(`auth-signout-${Date.now()}`, '[Auth] User signed out');
        _authLoggedOnce.delete('auth-session');
        _authLoggedOnce.delete('auth-init');
        _authLoggedOnce.delete('auth-no-session');
        _authLoggedOnce.forEach(key => {
          if (key.startsWith('auth-signin-') || key.startsWith('auth-event-')) {
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

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // 🔥 FIX: Check if user already exists first
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This email is already registered. Please sign in instead.');
      }

      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            first_name: firstName || null,
            last_name: lastName || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed - no user returned');

      const newAffiliateCode = await generateAffiliateCode(displayName);

      const profileReady = await waitForProfile(authData.user.id);
      if (!profileReady) {
        console.warn(`[Auth] Profile not created within 2s for user ${authData.user.id}. Trigger may have failed.`);
        toast.error(
          'Account created, but profile setup is taking longer than usual. ' +
          'Please refresh in a moment. If the problem persists, contact support.'
        );
      } else {
        await supabase
          .from('profiles')
          .update({
            affiliate_code: newAffiliateCode,
          })
          .eq('id', authData.user.id);

        // Fire-and-forget: trigger welcome email immediately (cron is the backstop).
        void fireWelcomeEmail();
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
          redirectTo: `${window.location.origin}/pricing-selection`,
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
  
  // During the SEO prerender there is no AuthProvider (the prerender harness in
  // entry-server.tsx is intentionally minimal). In the browser a missing
  // provider is still a real bug, so keep throwing there; during SSR fall back
  // to an unauthenticated context so downstream gates resolve to their most
  // restrictive *public* state (e.g. PriceGate shows the licensed-data
  // placeholder, never the raw data). All hooks below run unconditionally on
  // both paths to satisfy the Rules of Hooks.
  if (context === undefined && typeof window !== 'undefined') {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  const safeContext: AuthContextType = context ?? {
    user: null,
    isLoading: false,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    signInWithGoogle: async () => {},
  };

  // 🔥 CRITICAL FIX: Only check impersonation, don't create it
  const [impersonationData, setImpersonationData] = useState<{
    id: string;
    email: string;
    name?: string;
  } | null>(() => {
    try {
      const data = sessionStorage.getItem('imp_user_data');
      // 🔥 Only use if explicitly set AND we're not currently logging in
      if (data && safeContext.user) {
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
    if (impersonationData && safeContext.user && impersonationData.id !== safeContext.user.id) {
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
    return safeContext.user;
  }, [safeContext.user, impersonationData]);

  return {
    ...safeContext,
    user: effectiveUser,
  };
}