// src/pages/onboarding/WelcomeScreen.tsx
// =====================================================
// WELCOME SCREEN — Thin route wrapper for the onboarding carousel.
// Guards against re-showing: if the user has already seen onboarding
// (localStorage flag set by OnboardingCarousel's finish handler),
// redirect straight to the app.
// =====================================================

import { Navigate } from 'react-router-dom';
import OnboardingCarousel, { ONBOARDING_SEEN_KEY } from '@/components/onboarding/OnboardingCarousel';

export default function WelcomeScreen() {
  if (localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true') {
    return <Navigate to="/app/top-secret" replace />;
  }

  return <OnboardingCarousel />;
}
