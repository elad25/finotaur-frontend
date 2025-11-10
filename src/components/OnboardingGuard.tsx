// src/components/OnboardingGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Don't check on public pages
      const publicPaths = ['/auth/login', '/auth/register', '/pricing-selection', '/', '/forgot-password', '/reset-password'];
      if (publicPaths.some(path => location.pathname.startsWith(path))) {
        setShouldRender(true);
        setChecking(false);
        return;
      }

      if (!user) {
        console.log('🔒 OnboardingGuard: No user, redirecting to login');
        navigate('/auth/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, account_type, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          // On error, allow access but log it
          setShouldRender(true);
          setChecking(false);
          return;
        }

        console.log('🔍 OnboardingGuard: User status:', {
          onboarding_completed: data?.onboarding_completed,
          account_type: data?.account_type,
          subscription_status: data?.subscription_status
        });

        // If onboarding not completed, redirect to pricing selection
        if (!data?.onboarding_completed) {
          console.log('⚠️ OnboardingGuard: Onboarding not completed, redirecting to pricing');
          navigate('/pricing-selection');
          return;
        }

        // If onboarding completed but no subscription chosen yet
        const hasPlan = data.account_type && data.account_type !== '';
        if (!hasPlan) {
          console.log('⚠️ OnboardingGuard: No plan selected, redirecting to pricing');
          navigate('/pricing-selection');
          return;
        }

        // All checks passed
        console.log('✅ OnboardingGuard: All checks passed');
        setShouldRender(true);
      } catch (error) {
        console.error('❌ OnboardingGuard: Error checking status:', error);
        // On error, allow access
        setShouldRender(true);
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, navigate, location.pathname]);

  if (checking) {
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