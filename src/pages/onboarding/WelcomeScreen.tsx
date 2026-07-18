// src/pages/onboarding/WelcomeScreen.tsx
// =====================================================
// WELCOME SCREEN — thin route shim.
//
// The gate is per-ACCOUNT (DB), not per-browser: we read
// `profiles.onboarding_completed` for the signed-in user and only skip the
// tour if that account has actually completed it. This fixes the bug where
// a NEW account signing up in a browser that had already completed/skipped
// onboarding for a DIFFERENT account would silently never see the tour —
// the old logic keyed entirely off a browser-wide localStorage flag.
//
// localStorage (ONBOARDING_SEEN_KEY) is now only an error fallback: if the
// profile query fails (offline, flaky network), we fall back to it so a
// returning/veteran user is never blocked from navigating and never shown
// the tour again by accident.
//
// New users: flag the welcome overlay active and enter the app; the overlay
// (WelcomeIntro, mounted in ProtectedAppLayout) then renders ON TOP of the
// real app so its frosted backdrop blurs the page behind it.
// Returning accounts (onboarding already completed) go straight to app home.
// =====================================================

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import {
  ONBOARDING_SEEN_KEY,
  WELCOME_ACTIVE_KEY,
} from '@/components/onboarding/onboardingFlags';

type Decision = 'pending' | 'welcome' | 'skip';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const [decision, setDecision] = useState<Decision>('pending');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const resolveDecision = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setDecision(data?.onboarding_completed === true ? 'skip' : 'welcome');
      } catch {
        if (cancelled) return;
        // Query failed (offline/flaky) — fall back to the legacy browser
        // flag so we never block navigation or re-show the tour forever.
        const legacySeen = localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
        setDecision(legacySeen ? 'skip' : 'welcome');
      }
    };

    void resolveDecision();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (decision === 'pending') {
    return <RouteSkeleton />;
  }

  if (decision === 'welcome') {
    try {
      sessionStorage.setItem(WELCOME_ACTIVE_KEY, '1');
    } catch {
      /* ignore */
    }
    return <Navigate to="/app/home" replace />;
  }

  return <Navigate to="/app/home" replace />;
}
