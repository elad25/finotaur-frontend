// src/components/onboarding/onboardingFlags.ts
// ================================================
// Shared onboarding constants and helpers.
// Moved out of OnboardingCarousel so SpotlightTour and WelcomeIntro
// can import them without pulling in the full carousel UI.
// ================================================

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

/** Set to 'true' in localStorage once the user has completed onboarding. */
export const ONBOARDING_SEEN_KEY = 'finotaur_onboarding_seen';

/** Set to '1' in sessionStorage while the spotlight tour is in progress. */
export const TOUR_ACTIVE_KEY = 'finotaur_tour_active';

/** Set to '1' in sessionStorage while the welcome intro overlay should show. */
export const WELCOME_ACTIVE_KEY = 'finotaur_welcome_active';

/** Set to '1' in localStorage right after onboarding completes; consumed once
 *  by ProtectedAppLayout to show the one-time ConnectBrokerNudge, then cleared. */
export const CONNECT_NUDGE_PENDING_KEY = 'finotaur_connect_nudge_pending';

// ---------------------------------------------------------------------------
// recordOnboardingCompletion
// Best-effort: if the user is not authenticated or the request fails we still
// proceed cleanly.
// ---------------------------------------------------------------------------
export const recordOnboardingCompletion = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const completedAt = new Date().toISOString();
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', user.id);
  } catch (err) {
    console.warn('onboardingFlags: failed to record onboarding completion', err);
  }
};

// ---------------------------------------------------------------------------
// finishOnboarding
// Single call-site for both "Finish" and "Skip" paths:
//   1. Write profiles.onboarding_completed_at (async, best-effort)
//   2. Arm the one-time ConnectBrokerNudge (IntroOffer countdown removed
//      2026-07 — full-price-only decision)
//   3. Mark onboarding as seen in localStorage
//   4. Clear tour-active flag from sessionStorage
// ---------------------------------------------------------------------------
export const finishOnboarding = (): void => {
  void recordOnboardingCompletion();
  localStorage.setItem(CONNECT_NUDGE_PENDING_KEY, '1');
  localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  sessionStorage.removeItem(TOUR_ACTIVE_KEY);
};
