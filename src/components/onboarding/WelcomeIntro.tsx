// src/components/onboarding/WelcomeIntro.tsx
// ================================================
// Full-screen welcome screen that precedes the spotlight tour.
// Fires the same celebratory confetti as the first-trade moment.
//
// "Let's Start!" → sets TOUR_ACTIVE_KEY in sessionStorage then navigates
//   to /app/stocks/overview (SpotlightTour opens the drawer from there).
// ================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Newspaper,
  Brain,
  Filter,
  LineChart,
  BookOpen,
  CalendarDays,
  LayoutGrid,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Wordmark } from '@/components/ds/Wordmark';
import { TOUR_ACTIVE_KEY } from './onboardingFlags';

// The scattered tools a trader/investor usually juggles across many apps —
// now unified inside Finotaur. Shown as a quick visual on the welcome screen.
const CAPABILITIES: { icon: LucideIcon; label: string }[] = [
  { icon: Newspaper, label: 'Research' },
  { icon: Brain, label: 'AI Analysis' },
  { icon: Filter, label: 'Screeners' },
  { icon: LineChart, label: 'Live Charts' },
  { icon: BookOpen, label: 'Trade Journal' },
  { icon: CalendarDays, label: 'Economic Calendar' },
  { icon: LayoutGrid, label: 'Sector Maps' },
  { icon: Bell, label: 'Smart Alerts' },
];

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

  // Celebrate the welcome — same dual-cannon gold confetti used for the
  // first journal trade (src/pages/app/journal/New.tsx). Imported lazily so
  // it never blocks first paint; cleaned up on unmount.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    import('canvas-confetti')
      .then((m) => {
        if (cancelled) return;
        const confetti = m.default;
        const end = Date.now() + 1500;
        const colors = ['#C9A646', '#E6C675', '#B8944E', '#FFD700'];
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors, zIndex: 10000 });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors, zIndex: 10000 });
          if (!cancelled && Date.now() < end) {
            raf = requestAnimationFrame(frame);
          }
        })();
      })
      .catch(() => {
        /* confetti is non-essential — silent fail */
      });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleStart = () => {
    sessionStorage.setItem(TOUR_ACTIVE_KEY, '1');
    // Navigate to Research Lab — the tour's backdrop and destination.
    // SpotlightTour opens the drawer and spotlights the first item from there.
    navigate('/app/all-markets/overview', { replace: true });
  };

  return (
    // Full-screen backdrop — bg-surface-base is the deepest DS layer
    <div className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden">
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

      {/* Card entrance animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
      >
        {/* Card frame */}
        <Card
          variant="featured"
          padding="spacious"
          className="relative w-full shadow-glow-gold-resting overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #121212 0%, #0c0c0c 100%)',
          }}
        >
          {/* Top gold accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: 2,
              background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)',
            }}
          />

          <div className="flex flex-col items-center text-center gap-6 pt-2">
            {/* Wordmark with soft radial gold glow behind it */}
            <div className="relative flex items-center justify-center">
              {/* Radial gold glow orb behind the wordmark */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: 220,
                  height: 80,
                  background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.28) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                }}
              />
              <Wordmark size="large" tone="gradient" />
            </div>

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

            {/* Mission body — what Finotaur is & why it exists */}
            <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-md">
              Finotaur is your central terminal for trading and investing —
              every tool a trader and investor needs, finally in one place.
              In the next 30 seconds we'll walk you through the rooms where
              your edge gets built.
            </p>

            {/* Capability grid — the scattered tools Finotaur unifies */}
            <div className="w-full pt-1">
              <p
                className="text-[11px] font-medium tracking-[0.18em] uppercase mb-3"
                style={{ color: '#808080' }}
              >
                Everything in one terminal
              </p>
              <div className="grid grid-cols-4 gap-y-3 gap-x-2">
                {CAPABILITIES.map(({ icon: Icon, label }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.3 + i * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        background: 'rgba(201,166,70,0.10)',
                        border: '1px solid rgba(201,166,70,0.22)',
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: '#C9A646' }} />
                    </span>
                    <span className="text-[10px] leading-tight text-ink-secondary">
                      {label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              variant="gold"
              size="xl"
              showArrow={false}
              onClick={handleStart}
              className="w-full sm:w-auto"
            >
              Let's Start!
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
