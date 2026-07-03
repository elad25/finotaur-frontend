// src/pages/onboarding/WelcomeScreen.tsx
// =====================================================
// WELCOME SCREEN — thin route shim.
// New users: flag the welcome overlay active and enter the app; the overlay
// (WelcomeIntro, mounted in ProtectedAppLayout) then renders ON TOP of the
// real app so its frosted backdrop blurs the page behind it.
// Returning users (onboarding already seen) go straight to the app home.
// =====================================================

import { Navigate } from 'react-router-dom';
import {
  ONBOARDING_SEEN_KEY,
  WELCOME_ACTIVE_KEY,
} from '@/components/onboarding/onboardingFlags';

export default function WelcomeScreen() {
  if (localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true') {
    return <Navigate to="/app/home" replace />;
  }
  try {
    sessionStorage.setItem(WELCOME_ACTIVE_KEY, '1');
  } catch {
    /* ignore */
  }
  return <Navigate to="/app/home" replace />;
}
