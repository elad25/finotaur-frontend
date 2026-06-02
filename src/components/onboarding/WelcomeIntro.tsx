// src/components/onboarding/WelcomeIntro.tsx
// ================================================
// Full-screen welcome screen that precedes the spotlight tour.
// Shown once, before the carousel (now replaced by SpotlightTour).
//
// "Begin" → sets TOUR_ACTIVE_KEY in sessionStorage then navigates to
//   /app/top-secret (SpotlightTour opens the drawer from there).
// "Skip for now" → calls finishOnboarding() and navigates to /app/top-secret.
// ================================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { TOUR_ACTIVE_KEY, finishOnboarding } from './onboardingFlags';

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Derive firstName — same logic as OnboardingCarousel / WelcomeScreen
  const firstName = (() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const full =
      typeof meta.full_name === 'string'
        ? meta.full_name
        : typeof meta.name === 'string'
        ? meta.name
        : '';
    if (full) return full.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return '';
  })();

  const handleBegin = () => {
    sessionStorage.setItem(TOUR_ACTIVE_KEY, '1');
    // Navigate to a known-valid route; SpotlightTour opens the drawer
    // and spotlights the first item regardless of current route.
    navigate('/app/top-secret', { replace: true });
  };

  const handleSkip = () => {
    finishOnboarding();
    navigate('/app/top-secret', { replace: true });
  };

  return (
    // Full-screen backdrop — bg-surface-base is the deepest DS layer
    <div className="fixed inset-0 z-[9990] bg-surface-base flex items-center justify-center p-4 overflow-hidden">
      {/* Gold blur orbs — DS gold token only */}
      <div
        className="absolute top-0 left-0 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: 'rgba(201,166,70,0.15)',
          filter: 'blur(180px)',
          transform: 'translate(-30%, -25%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: 'rgba(201,166,70,0.15)',
          filter: 'blur(180px)',
          transform: 'translate(30%, 25%)',
        }}
      />

      {/* Card frame */}
      <Card
        variant="featured"
        padding="spacious"
        className="relative w-full shadow-glow-gold-resting"
        style={{
          maxWidth: 'min(560px, calc(100vw - 2rem))',
        }}
      >
        <div className="flex flex-col items-center text-center gap-6">
          <Eyebrow>WELCOME</Eyebrow>

          {/* Headline */}
          <h1 className="text-2xl md:text-4xl font-bold text-ink-primary tracking-tight leading-tight">
            {firstName ? `Welcome, ${firstName}` : 'Welcome to Finotaur'}
          </h1>

          {/* Brand line — gold gradient text */}
          <p
            className="text-base md:text-lg font-medium"
            style={{
              background: 'linear-gradient(135deg, #F4D97B, #C9A646)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            You're not a trader anymore — you're a Finotaur.
          </p>

          {/* Motivational body */}
          <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-md">
            Great that you're taking your future one step forward. In the next
            30 seconds we'll walk you through the rooms where your edge gets
            built.
          </p>

          {/* CTAs — stacked on mobile, row on sm+ */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
            <Button
              variant="gold"
              size="xl"
              showArrow={false}
              onClick={handleBegin}
              className="flex-1 sm:flex-initial"
            >
              Begin
            </Button>

            <button
              type="button"
              onClick={handleSkip}
              className="px-5 py-2 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
