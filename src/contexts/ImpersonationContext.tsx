// src/contexts/ImpersonationContext.tsx
// ================================================
// OPTIMIZED IMPERSONATION CONTEXT - FIXED v1.4
// ✅ Doesn't sign out on validation failure during refresh
// ================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: {
    id: string;
    email: string;
    name?: string;
  } | null;
  originalAdminId: string | null;
  startImpersonation: (userId: string, userEmail: string, userName?: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'imp_session_token';
const LAST_CHECK_KEY = 'imp_last_check';
const USER_DATA_KEY = 'imp_user_data';
const VALIDATION_INTERVAL = 10 * 60 * 1000;

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({
    isImpersonating: false,
    impersonatedUser: null as {
      id: string;
      email: string;
      name?: string;
    } | null,
    originalAdminId: null as string | null,
    isValidating: true,
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const validationInProgress = useRef(false);

  const validateSession = useCallback(async () => {
    if (validationInProgress.current) {
      console.log('⏭️ Validation already in progress, skipping...');
      return;
    }

    try {
      validationInProgress.current = true;

      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const storedUserData = sessionStorage.getItem(USER_DATA_KEY);
      
      if (!sessionToken) {
        console.log('ℹ️ No session token found');
        setState(prev => ({ ...prev, isValidating: false }));
        return;
      }

      // 🔥 FALLBACK: If we have user data in storage, use it temporarily
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          console.log('📦 Using cached user data during validation');
          setState({
            isImpersonating: true,
            impersonatedUser: userData,
            originalAdminId: null, // We'll get this from validation
            isValidating: false,
          });
        } catch (err) {
          console.error('Failed to parse stored user data:', err);
        }
      }

      console.log('🔍 Validating impersonation session...');

      const { data, error } = await supabase
        .rpc('get_active_impersonation_session', {
          p_session_token: sessionToken
        });

      if (error || !data || data.length === 0) {
        console.warn('⚠️ Session validation failed:', error);
        // 🔥 DON'T cleanup immediately - validation might have failed due to network
        setState(prev => ({ ...prev, isValidating: false }));
        return;
      }

      const session = data[0];

      if (new Date(session.expires_at) < new Date()) {
        console.log('⏰ Session expired');
        await cleanupSession();
        return;
      }

      console.log('✅ Session valid:', session);

      const userData = {
        id: session.impersonated_user_id,
        email: session.impersonated_user_email,
        name: session.impersonated_user_name
      };
      
      sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      setState({
        isImpersonating: true,
        impersonatedUser: userData,
        originalAdminId: session.admin_id,
        isValidating: false,
      });

      sessionStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

    } catch (error) {
      console.error('Error validating session:', error);
      // 🔥 DON'T cleanup on error - just mark as not validating
      setState(prev => ({ ...prev, isValidating: false }));
    } finally {
      validationInProgress.current = false;
    }
  }, []);

  const cleanupSession = useCallback(async () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(LAST_CHECK_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);
    
    setState({
      isImpersonating: false,
      impersonatedUser: null,
      originalAdminId: null,
      isValidating: false,
    });
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  useEffect(() => {
    if (!state.isImpersonating) return;

    const checkIfValidationNeeded = () => {
      const lastCheck = sessionStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();
      
      if (!lastCheck || now - parseInt(lastCheck) > VALIDATION_INTERVAL) {
        console.log('⏱️ Time to validate session (activity detected)');
        validateSession();
      }
    };

    const handleFocus = () => {
      console.log('👀 Window focused, checking session...');
      checkIfValidationNeeded();
    };

    const handleClick = () => {
      checkIfValidationNeeded();
      setTimeout(() => {
        window.addEventListener('click', handleClick, { once: true, capture: true });
      }, VALIDATION_INTERVAL);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('click', handleClick, { once: true, capture: true });

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleClick);
    };
  }, [state.isImpersonating, validateSession]);

  const startImpersonation = useCallback(async (userId: string, userEmail: string, userName?: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('You must be logged in');
        return;
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('account_type, role, email')
        .eq('id', currentUser.id)
        .single();

      const isAdmin = 
        currentProfile?.account_type === 'admin' || 
        currentProfile?.role === 'admin' ||
        currentProfile?.role === 'super_admin';

      if (!isAdmin) {
        toast.error('Only admins can impersonate users');
        return;
      }

      console.log('🎭 Starting secure impersonation session...', {
        adminId: currentUser.id,
        adminEmail: currentProfile.email,
        targetUserId: userId,
        targetUserEmail: userEmail
      });

      const { data: sessionData, error: sessionError } = await supabase
        .rpc('start_impersonation_session_v1', {
          p_user_id: userId,
          p_admin_email: currentProfile.email
        });

      if (sessionError) {
        console.error('Failed to create session:', sessionError);
        toast.error('Failed to start impersonation');
        return;
      }

      if (!sessionData || sessionData.length === 0) {
        console.error('No session data returned');
        toast.error('Failed to create session');
        return;
      }

      const session = sessionData[0];
      console.log('✅ Session created:', session);

      const sessionToken = session.access_token;

      if (!sessionToken) {
        console.error('No session token in response');
        toast.error('Failed to create session');
        return;
      }

      const userData = { id: userId, email: userEmail, name: userName };
      sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      sessionStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

      setState({
        isImpersonating: true,
        impersonatedUser: userData,
        originalAdminId: currentUser.id,
        isValidating: false,
      });

      toast.success(`Now viewing as ${userEmail}`, {
        description: 'Session expires in 2 hours'
      });

      // 🔥 CRITICAL: Clear cache and invalidate queries
      console.log('🔄 Clearing cache and invalidating queries...');
      queryClient.clear();
      queryClient.invalidateQueries();

      navigate('/app/journal/overview', { replace: true });

      // 🔥 Dispatch after everything is ready
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('impersonation-started'));
      }, 150);

    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast.error('Failed to start impersonation');
    }
  }, [navigate, queryClient]);

  const stopImpersonation = useCallback(async () => {
    try {
      console.log('🎭 Stopping impersonation session...');

      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);

      if (sessionToken) {
        try {
          const { error } = await supabase.rpc('end_impersonation_session', {
            p_session_token: sessionToken
          });
          
          if (error) {
            console.error('Failed to end session in DB:', error);
          }
        } catch (err) {
          console.error('Failed to end session in DB:', err);
        }
      }

      await cleanupSession();

      toast.success('Returned to admin view');

      // 🔥 CRITICAL: Clear cache when stopping
      console.log('🔄 Clearing cache and returning to admin view...');
      queryClient.clear();
      queryClient.invalidateQueries();

      navigate('/app/journal/admin/users', { replace: true });

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('impersonation-stopped'));
      }, 150);

    } catch (error) {
      console.error('Error stopping impersonation:', error);
      toast.error('Failed to stop impersonation');
    }
  }, [navigate, cleanupSession, queryClient]);

  const refreshSession = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  if (state.isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C9A646] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-[#A0A0A0] text-sm">Validating session...</div>
        </div>
      </div>
    );
  }

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: state.isImpersonating,
        impersonatedUser: state.impersonatedUser,
        originalAdminId: state.originalAdminId,
        startImpersonation,
        stopImpersonation,
        refreshSession
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
};