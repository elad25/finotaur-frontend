// src/components/onboarding/WelcomeIntro.tsx
// ================================================
// Full-screen welcome screen that precedes the spotlight tour.
// Fires the same celebratory confetti as the first-trade moment.
//
// "Let's Start!" → sets TOUR_ACTIVE_KEY in sessionStorage then navigates
//   to /app/home (SpotlightTour opens the drawer from there).
// ================================================

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Link2,
  ShieldCheck,
  Gift,
  FileText,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Wordmark } from '@/components/ds/Wordmark';
import { TOUR_ACTIVE_KEY, WELCOME_ACTIVE_KEY } from './onboardingFlags';

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

// What's included in the 14-day app-granted trial — shown as a scannable
// bullet list to new trial users so the welcome screen doubles as an
// explanation, not just a celebration.
const TRIAL_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LineChart,
    title: 'Full Trader access',
    body:
      'Connect your broker, trades sync automatically, unlimited journaling, trade copier, Shadow, Revenge Radar, Leak Detector, and risk tools.',
  },
  {
    icon: FileText,
    title: 'Full Investor access',
    body: 'Top Secret research and WAR ZONE reports, fully unlocked during your trial.',
  },
  {
    icon: CreditCard,
    title: 'No credit card, ever',
    body: 'Nothing is charged. The trial simply ends after 14 days.',
  },
  {
    icon: Gift,
    title: 'You keep a free plan',
    body:
      'After 14 days your journal history stays, plus 10 manual trades and preview mode. Upgrade anytime to keep full access.',
  },
  {
    icon: Link2,
    title: 'Best first step',
    body: 'Connect your broker now so every screen fills with your real trading data.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data is safe',
    body: 'Bank-grade security. We never share your data. You are always in control.',
  },
];

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAppTrial } = useSubscription();
  const [active, setActive] = useState(
    () => sessionStorage.getItem(WELCOME_ACTIVE_KEY) === '1',
  );
  useEffect(() => {
    if (sessionStorage.getItem(WELCOME_ACTIVE_KEY) === '1') setActive(true);
  }, [location.pathname]);

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
    if (!active) return;
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
  }, [active]);

  const handleStart = () => {
    try {
      sessionStorage.removeItem(WELCOME_ACTIVE_KEY);
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(TOUR_ACTIVE_KEY, '1');
    setActive(false);
    // Navigate to Home — the tour's backdrop and destination. Must NOT be a
    // Markets research path: the beta gate (MARKETS_BETA_ONLY) redirects
    // non-beta users from there to /app/upgrade, which made the tour run on
    // top of the pricing page for every fresh signup.
    // SpotlightTour opens the drawer and spotlights the first item from here.
    navigate('/app/home', { replace: true });
  };

  // Primary CTA for trial users — dismiss the welcome overlay and go straight
  // to the journal, which auto-opens AddBrokerPopup via ?connect_broker=1
  // (see src/pages/app/journal/Overview.tsx). Skips the spotlight tour since
  // the user is already headed somewhere specific.
  const handleConnectBroker = () => {
    try {
      sessionStorage.removeItem(WELCOME_ACTIVE_KEY);
    } catch {
      /* ignore */
    }
    setActive(false);
    navigate('/app/journal/overview?connect_broker=1', { replace: true });
  };

  if (!active) return null;

  return (
    // Full-screen backdrop — bg-surface-base is the deepest DS layer
    <div className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden">
      {/* Gold blur orbs — DS gold token only */}
      <div
        className="absolute top-0 left-0 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: 'rgba(201,166,70,0.08)',
          filter: 'blur(180px)',
          transform: 'translate(-30%, -25%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: 'rgba(201,166,70,0.08)',
          filter: 'blur(180px)',
          transform: 'translate(30%, 25%)',
        }}
      />

      {/* Card entrance animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: isAppTrial
            ? 'min(980px, calc(100vw - 2rem))'
            : 'min(560px, calc(100vw - 2rem))',
        }}
      >
        {/* Card frame */}
        <Card
          variant="featured"
          padding="spacious"
          className="relative w-full overflow-x-hidden overflow-y-auto max-h-[90vh]"
          style={{
            background: 'linear-gradient(180deg, #121212 0%, #0c0c0c 100%)',
            boxShadow: '0 0 30px rgba(201,166,70,0.07)',
          }}
        >
          {/* Top gold accent line */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.45), rgba(201,166,70,0.6), rgba(201,166,70,0.45), transparent)',
            }}
          />

          {/* Brand bull on the right side of the modal (trial view). screen blend
              drops the asset's black background so only the gold bull shows; the
              left-fade mask keeps text legible. */}
          {isAppTrial && (
            <img
              src="/BULL%20ONLY.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-1/2 z-0 hidden h-[78%] w-auto -translate-y-1/2 select-none md:block"
              style={{
                mixBlendMode: 'screen',
                opacity: 0.55,
                maskImage: 'linear-gradient(to left, black 45%, transparent 92%)',
                WebkitMaskImage: 'linear-gradient(to left, black 45%, transparent 92%)',
              }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center text-center gap-6 pt-2">
            {/* Wordmark with soft radial gold glow behind it, centered. */}
            <div className="relative flex items-center justify-center">
              {/* Radial gold glow orb behind the wordmark */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: 220,
                  height: 80,
                  background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.14) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                }}
              />
              <Wordmark size="large" tone="gradient" />
            </div>

            {isAppTrial ? (
              <>
                {/* Trial welcome — detailed explanation is the first thing a
                    new trial user sees, per the trial-phase1 spec. Wide
                    3-column layout, no bull graphic — the Wordmark above
                    carries the brand. */}
                <p className="text-sm font-medium text-ink-secondary">
                  {firstName ? `Welcome, ${firstName}` : 'Welcome to Finotaur'}
                </p>

                {/* Headline */}
                <h1 className="text-3xl md:text-4xl font-bold text-ink-primary tracking-tight leading-tight">
                  Everything is unlocked for the next 14 days.
                </h1>

                {/* Subhead */}
                <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                  Explore every tool, every feature, and every edge Finotaur has to
                  offer. No limits. No payments. Just your full trading advantage.
                </p>

                {/* Detail cards — scannable explanation of what's included */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-left">
                  {TRIAL_POINTS.map(({ icon: Icon, title, body }, i) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.2 + i * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Card variant="default" padding="compact" className="h-full">
                        <div className="flex items-start gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: 'rgba(201,166,70,0.10)',
                              border: '1px solid rgba(201,166,70,0.22)',
                            }}
                          >
                            <Icon className="h-4 w-4" style={{ color: '#C9A646' }} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink-primary leading-tight">
                              {title}
                            </p>
                            <p className="text-xs text-ink-secondary leading-snug mt-1">
                              {body}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom CTA bar — horizontal on desktop, stacked on mobile */}
                <Card
                  variant="featured"
                  padding="compact"
                  className="w-full text-left"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">
                        Let's get you connected
                      </p>
                      <p className="text-sm text-ink-secondary">
                        Connect your broker and start seeing your data in real-time.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <Button
                        variant="gold"
                        size="compact"
                        showArrow
                        onClick={handleConnectBroker}
                        className="w-full md:w-auto"
                      >
                        Connect your broker
                      </Button>
                      <Button
                        variant="goldOutline"
                        size="compact"
                        showArrow={false}
                        onClick={handleStart}
                        className="w-full md:w-auto"
                      >
                        Explore the app first
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <>
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
                  Every trading and investing tool, in one terminal. Here's your 30-second tour.
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
              </>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
