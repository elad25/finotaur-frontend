// src/components/OnboardingGuard.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // ✅ Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    // ✅ Prevent multiple checks
    if (hasChecked.current) {
      return;
    }

    const checkOnboarding = async () => {
      try {
        // Don't check on public pages
        const publicPaths = ['/auth/login', '/auth/register', '/pricing-selection', '/', '/forgot-password', '/reset-password'];
        if (publicPaths.some(path => location.pathname.startsWith(path))) {
          setShouldRender(true);
          setChecking(false);
          return;
        }

        if (!user) {
          console.log('🔒 OnboardingGuard: No user, redirecting to login');
          setChecking(false); // ✅ FIX: Always set checking to false
          navigate('/auth/login', { replace: true });
          return;
        }

        hasChecked.current = true;

        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, account_type, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          // On error, allow access
          setShouldRender(true);
          setChecking(false);
          return;
        }

        console.log('🔍 OnboardingGuard: User status:', data);

        // If onboarding not completed, redirect to pricing selection
        if (!data?.onboarding_completed) {
          console.log('⚠️ OnboardingGuard: Onboarding not completed');
          setChecking(false); // ✅ FIX
          navigate('/pricing-selection', { replace: true });
          return;
        }

        // If no plan selected
        const hasPlan = data.account_type && data.account_type !== '';
        if (!hasPlan) {
          console.log('⚠️ OnboardingGuard: No plan selected');
          setChecking(false); // ✅ FIX
          navigate('/pricing-selection', { replace: true });
          return;
        }

        // All checks passed
        console.log('✅ OnboardingGuard: All checks passed');
        setShouldRender(true);
        setChecking(false);
        
      } catch (error) {
        console.error('❌ OnboardingGuard: Error:', error);
        // On error, allow access
        setShouldRender(true);
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading, navigate, location.pathname]);

  // ✅ Reset hasChecked when user changes
  useEffect(() => {
    hasChecked.current = false;
  }, [user?.id]);

  // ✅ Show loading only while auth is loading OR checking
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return shouldRender ? <>{children}</> : null;
}