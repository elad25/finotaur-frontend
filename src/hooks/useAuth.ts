// src/hooks/useAuth.ts - OPTIMIZED
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, cachedQuery, supabaseCache } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type ExtendedUser = User & { name?: string };

const SESSION_TOKEN_KEY = 'imp_session_token';
const IMPERSONATION_CHECK_INTERVAL = 30000; // 30 seconds

// 🔥 SHARED STATE - singleton למנוע duplicate checks בין instances
let sharedImpersonationState: {
  viewingUserId: string | null;
  impersonatedUserEmail: string | null;
  lastCheck: number;
} = {
  viewingUserId: null,
  impersonatedUserEmail: null,
  lastCheck: 0
};

// 🔥 GLOBAL FLAG למנוע multiple subscriptions
let globalAuthSubscription: { unsubscribe: () => void } | null = null;

export function useAuth() {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(
    sharedImpersonationState.viewingUserId
  );
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(
    sharedImpersonationState.impersonatedUserEmail
  );
  const navigate = useNavigate();
  
  const isInitializedRef = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 OPTIMIZED: Check impersonation עם aggressive caching
  const checkImpersonation = useCallback(async (force = false) => {
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    
    if (!sessionToken) {
      setViewingUserId(null);
      setImpersonatedUserEmail(null);
      sharedImpersonationState = { 
        viewingUserId: null, 
        impersonatedUserEmail: null, 
        lastCheck: Date.now() 
      };
      return;
    }

    // ✅ Use shared state if valid (30 seconds)
    const now = Date.now();
    if (!force && now - sharedImpersonationState.lastCheck < IMPERSONATION_CHECK_INTERVAL) {
      setViewingUserId(sharedImpersonationState.viewingUserId);
      setImpersonatedUserEmail(sharedImpersonationState.impersonatedUserEmail);
      return;
    }

    try {
      const cacheKey = `impersonation:${sessionToken}`;
      const data = await cachedQuery(
        cacheKey,
        async () => {
          const { data, error } = await supabase.rpc('get_active_impersonation_session', {
            p_session_token: sessionToken
          });
          
          if (error || !data || data.length === 0) return null;
          return data[0];
        },
        IMPERSONATION_CHECK_INTERVAL
      );

      if (!data) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setViewingUserId(null);
        setImpersonatedUserEmail(null);
        sharedImpersonationState = { 
          viewingUserId: null, 
          impersonatedUserEmail: null, 
          lastCheck: now 
        };
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        supabaseCache.invalidate('impersonation:');
        setViewingUserId(null);
        setImpersonatedUserEmail(null);
        sharedImpersonationState = { 
          viewingUserId: null, 
          impersonatedUserEmail: null, 
          lastCheck: now 
        };
        return;
      }

      setViewingUserId(data.impersonated_user_id);
      setImpersonatedUserEmail(data.impersonated_user_email);
      sharedImpersonationState = {
        viewingUserId: data.impersonated_user_id,
        impersonatedUserEmail: data.impersonated_user_email,
        lastCheck: now
      };
      
    } catch (error) {
      console.error('❌ Error checking impersonation:', error);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      supabaseCache.invalidate('impersonation:');
    }
  }, []);

  // 🔥 OPTIMIZATION: Event-driven checks only (no polling)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    checkImpersonation();

    const handleImpersonationChange = () => checkImpersonation(true);
    const handleFocus = () => {
      // Only check if last check was > 30s ago
      const timeSinceLastCheck = Date.now() - sharedImpersonationState.lastCheck;
      if (timeSinceLastCheck > IMPERSONATION_CHECK_INTERVAL) {
        checkImpersonation(true);
      }
    };

    window.addEventListener('impersonation-changed', handleImpersonationChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('impersonation-changed', handleImpersonationChange);
      window.removeEventListener('focus', handleFocus);
      isInitializedRef.current = false;
      
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [checkImpersonation]);

  // 🔥 MEMOIZED user enrichment
  const enrichUser = useCallback((userData: User | null): ExtendedUser | null => {
    if (!userData) return null;
    return {
      ...userData,
      name: userData.user_metadata?.name || userData.email?.split('@')[0]
    };
  }, []);

  // 🔥 SINGLETON AUTH SUBSCRIPTION
  useEffect(() => {
    // Prevent multiple subscriptions across all useAuth instances
    if (globalAuthSubscription) {
      // Just sync local state with current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const enrichedUser = enrichUser(session?.user || null);
        setUser(enrichedUser);
        setIsLoading(false);
      });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const enrichedUser = enrichUser(session?.user || null);
      setUser(enrichedUser);
      setIsLoading(false);
      checkImpersonation();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const enrichedUser = enrichUser(session?.user || null);
      setUser(enrichedUser);
      setIsLoading(false);
      
      // Broadcast state change to all useAuth instances
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { user: enrichedUser } 
      }));
    });

    globalAuthSubscription = subscription;

    return () => {
      if (globalAuthSubscription) {
        globalAuthSubscription.unsubscribe();
        globalAuthSubscription = null;
      }
    };
  }, [enrichUser, checkImpersonation]);

  // 🔥 Listen for auth changes from other instances
  useEffect(() => {
    const handleAuthChange = (e: CustomEvent) => {
      setUser(e.detail.user);
    };

    window.addEventListener('auth-state-changed', handleAuthChange as EventListener);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange as EventListener);
    };
  }, []);

  const getEffectiveUserId = useCallback((): string | null => {
    return viewingUserId || user?.id || null;
  }, [viewingUserId, user?.id]);

  const logout = useCallback(async () => {
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem('impersonation_data');
      localStorage.removeItem('impersonated_user_id');
      
      supabaseCache.clear();
      
      setViewingUserId(null);
      setImpersonatedUserEmail(null);
      sharedImpersonationState = {
        viewingUserId: null,
        impersonatedUserEmail: null,
        lastCheck: 0
      };
      
      await supabase.auth.signOut();
      setUser(null);
      navigate('/auth/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, [navigate]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    logout,
    register,
    login,
    getEffectiveUserId,
    viewingUserId,
    impersonatedUserEmail,
    isImpersonating: !!viewingUserId,
  }), [
    user, 
    isLoading, 
    logout, 
    register, 
    login, 
    getEffectiveUserId, 
    viewingUserId, 
    impersonatedUserEmail
  ]);
}