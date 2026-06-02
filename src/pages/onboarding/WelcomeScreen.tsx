// src/pages/onboarding/WelcomeScreen.tsx
// =====================================================
// WELCOME SCREEN — Thin route wrapper for the onboarding flow.
// Guards against re-showing: if the user has already seen onboarding
// (localStorage flag set by finishOnboarding), redirect to the app.
//
// Renders WelcomeIntro (full-screen welcome card) which on "Begin"
// sets TOUR_ACTIVE_KEY in sessionStorage and navigates to the first
// tour step route, activating SpotlightTour in ProtectedAppLayout.
// =====================================================

import { Navigate } from 'react-router-dom';
import { ONBOARDING_SEEN_KEY } from '@/components/onboarding/onboardingFlags';
import WelcomeIntro from '@/components/onboarding/WelcomeIntro';

export default function WelcomeScreen() {
  if (localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true') {
    return <Navigate to="/app/top-secret" replace />;
  }

  return <WelcomeIntro />;
}
