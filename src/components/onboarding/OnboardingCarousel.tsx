// src/components/onboarding/OnboardingCarousel.tsx
// ================================================
// ONBOARDING CAROUSEL — Post-registration walkthrough modal.
// Self-contained; no nav DOM queries. 6 slides, animated with
// Framer Motion AnimatePresence. Replaces the old GuidedTour overlay.
//
// On finish/skip:
//   1. recordOnboardingCompletion() — writes profiles.onboarding_completed_at
//      so the WelcomePopup (Risk Setup) can gate-fire after 1h.
//   2. startWelcomeOffer()          — starts the 30-min discount countdown.
//   3. localStorage 'finotaur_onboarding_seen' = 'true'
//   4. navigate('/app/top-secret')
// ================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Swords,
  Sparkles,
  NotebookPen,
  PartyPopper,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { startWelcomeOffer } from './WelcomeOffer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ONBOARDING_SEEN_KEY = 'finotaur_onboarding_seen';

// ---------------------------------------------------------------------------
// recordOnboardingCompletion — copied verbatim from GuidedTour.tsx.
// Best-effort: if the user is not authenticated or the request fails, we
// still end the carousel cleanly. The downstream WelcomePopup gates on this.
// ---------------------------------------------------------------------------
const recordOnboardingCompletion = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (err) {
    console.warn('OnboardingCarousel: failed to record onboarding completion', err);
  }
};

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------

type SlideKind = 'greeting' | 'tool' | 'closing';

interface SlideData {
  kind: SlideKind;
  eyebrow: string;
  title: string;
  body: string;
  /** React element for the icon circle — only tool slides use this */
  icon?: React.ReactNode;
}

// Tool slides that show in the progress indicator (slides 1-4)
const TOOL_SLIDES: SlideData[] = [
  {
    kind: 'tool',
    eyebrow: 'STEP 1 OF 4',
    title: 'Top Secret',
    body: 'Your monthly edge. Deep institutional analysis, hidden setups, and the strategic plays most traders never see — delivered once a month.',
    icon: <Lock className="w-7 h-7 text-gold-primary" aria-hidden="true" />,
  },
  {
    kind: 'tool',
    eyebrow: 'STEP 2 OF 4',
    title: 'War Zone',
    body: 'Start every session ready. A pre-market briefing with global macro, key levels, and what actually matters — in your inbox by 9:00 AM.',
    icon: <Swords className="w-7 h-7 text-gold-primary" aria-hidden="true" />,
  },
  {
    kind: 'tool',
    eyebrow: 'STEP 3 OF 4',
    title: 'AI Suite',
    body: 'Hours of analyst work, in 30 seconds. Analyze any stock, scan sectors, and read the macro picture — instant, institutional-grade AI.',
    icon: <Sparkles className="w-7 h-7 text-gold-primary" aria-hidden="true" />,
  },
  {
    kind: 'tool',
    eyebrow: 'STEP 4 OF 4',
    title: 'Trading Journal',
    body: 'Where discipline compounds. Log every trade, track your P&L in R, and let AI surface the patterns that turn losing streaks into systems.',
    icon: <NotebookPen className="w-7 h-7 text-gold-primary" aria-hidden="true" />,
  },
];

// ---------------------------------------------------------------------------
// ProgressDots sub-component
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
  total: number;
  /** 0-indexed among tool slides (not overall slide index) */
  activeToolIndex: number;
}

function ProgressDots({ total, activeToolIndex }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Tour progress">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === activeToolIndex}
          className="h-1 rounded-full transition-all duration-500"
          style={{
            width: i === activeToolIndex ? 32 : 6,
            backgroundColor:
              i === activeToolIndex
                ? 'rgb(var(--gold-primary-rgb, 201 166 70))'
                : i < activeToolIndex
                ? 'rgba(201,166,70,0.50)'
                : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Slide indices:
//   0 = greeting
//   1-4 = tool slides (TOOL_SLIDES[0-3])
//   5 = closing
const TOTAL_SLIDES = 6;
const FIRST_TOOL_SLIDE = 1;
const LAST_TOOL_SLIDE = 4;
const CLOSING_SLIDE = 5;

export default function OnboardingCarousel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);

  // Derive firstName using the same logic as WelcomeScreen.tsx
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

  // Shared finish handler — called from both "Skip" (slide 0) and "Enter Finotaur" (slide 5)
  const handleFinish = () => {
    void recordOnboardingCompletion();
    startWelcomeOffer();
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigate('/app/top-secret', { replace: true });
  };

  const handleNext = () => {
    if (slideIndex < CLOSING_SLIDE) {
      setSlideIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    }
  };

  // Tool slide index (0-3) for ProgressDots, or null when not a tool slide
  const toolSlideIndex =
    slideIndex >= FIRST_TOOL_SLIDE && slideIndex <= LAST_TOOL_SLIDE
      ? slideIndex - FIRST_TOOL_SLIDE
      : null;

  // Current tool slide data (if applicable)
  const currentTool =
    toolSlideIndex !== null ? TOOL_SLIDES[toolSlideIndex] : null;

  // -----------------------------------------------------------------------
  // Animation variants — horizontal slide+fade
  // -----------------------------------------------------------------------
  const variants = {
    enter: { opacity: 0, x: 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  const spring = { type: 'spring' as const, stiffness: 350, damping: 30 };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    // Full-screen backdrop — bg-surface-base is the deepest DS layer
    <div className="fixed inset-0 z-[9990] bg-surface-base flex items-center justify-center p-4 overflow-hidden">
      {/* Gold blur orbs — using DS gold token, NOT yellow-500 */}
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

      {/* Card frame — stays mounted; only inner content animates */}
      <Card
        variant="featured"
        padding="spacious"
        className="relative w-full shadow-glow-gold-resting"
        style={{
          maxWidth: 'min(560px, calc(100vw - 2rem))',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >
            {/* ─── SLIDE 0: Greeting ──────────────────────────────────── */}
            {slideIndex === 0 && (
              <GreetingSlide
                firstName={firstName}
                onTakeTour={handleNext}
                onSkip={handleFinish}
              />
            )}

            {/* ─── SLIDES 1-4: Tool slides ────────────────────────────── */}
            {currentTool !== null && toolSlideIndex !== null && (
              <ToolSlide
                slide={currentTool}
                toolIndex={toolSlideIndex}
                totalTools={TOOL_SLIDES.length}
                isLast={slideIndex === LAST_TOOL_SLIDE}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleFinish}
              />
            )}

            {/* ─── SLIDE 5: Closing ───────────────────────────────────── */}
            {slideIndex === CLOSING_SLIDE && (
              <ClosingSlide
                onEnter={handleFinish}
                onBack={handleBack}
                toolCount={TOOL_SLIDES.length}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GreetingSlide
// ---------------------------------------------------------------------------

interface GreetingSlideProps {
  firstName: string;
  onTakeTour: () => void;
  onSkip: () => void;
}

function GreetingSlide({ firstName, onTakeTour, onSkip }: GreetingSlideProps) {
  return (
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

      <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-md">
        Here's a 60-second look at the four tools that will change how you
        trade. Or jump straight in.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
        <Button
          variant="gold"
          size="xl"
          showArrow={false}
          onClick={onTakeTour}
          className="flex-1 sm:flex-initial"
        >
          Take the tour
        </Button>
        <Button
          variant="goldOutline"
          size="xl"
          showArrow={false}
          onClick={onSkip}
          className="flex-1 sm:flex-initial"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolSlide
// ---------------------------------------------------------------------------

interface ToolSlideProps {
  slide: SlideData;
  toolIndex: number;
  totalTools: number;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function ToolSlide({
  slide,
  toolIndex,
  totalTools,
  isLast,
  onNext,
  onBack,
  onSkip,
}: ToolSlideProps) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <Eyebrow>{slide.eyebrow}</Eyebrow>

      {/* Icon circle */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(201,166,70,0.10)',
          border: '1px solid rgba(201,166,70,0.20)',
        }}
        aria-hidden="true"
      >
        {slide.icon}
      </div>

      {/* Headline */}
      <h2 className="text-2xl md:text-4xl font-bold text-ink-primary tracking-tight leading-tight">
        {slide.title}
      </h2>

      <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-md">
        {slide.body}
      </p>

      {/* Progress dots */}
      <ProgressDots total={totalTools} activeToolIndex={toolIndex} />

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
        {/* Back — secondary action, text-only style */}
        {toolIndex > 0 && (
          <button
            onClick={onBack}
            className="px-5 py-2 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
          >
            Back
          </button>
        )}

        <Button
          variant="gold"
          size="xl"
          showArrow={!isLast}
          onClick={onNext}
          className="flex-1 sm:flex-initial"
        >
          {isLast ? 'See your summary' : 'Next'}
        </Button>

        <button
          onClick={onSkip}
          className="px-5 py-2 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClosingSlide
// ---------------------------------------------------------------------------

interface ClosingSlideProps {
  onEnter: () => void;
  onBack: () => void;
  toolCount: number;
}

function ClosingSlide({ onEnter, onBack, toolCount }: ClosingSlideProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Eyebrow>YOU'RE ALL SET</Eyebrow>

      {/* Closing icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(201,166,70,0.10)',
          border: '1px solid rgba(201,166,70,0.20)',
        }}
        aria-hidden="true"
      >
        <PartyPopper className="w-7 h-7 text-gold-primary" aria-hidden="true" />
      </div>

      {/* Progress dots — all completed */}
      <ProgressDots total={toolCount} activeToolIndex={toolCount} />

      <h2 className="text-2xl md:text-4xl font-bold text-ink-primary tracking-tight leading-tight">
        You're ready.
      </h2>

      <p className="text-ink-secondary text-sm md:text-base leading-relaxed max-w-md">
        That's the core of Finotaur. Dive in — and keep an eye out for a
        welcome gift waiting for you.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
        <button
          onClick={onBack}
          className="px-5 py-2 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          Back
        </button>
        <Button
          variant="gold"
          size="xl"
          showArrow={false}
          onClick={onEnter}
          className="flex-1 sm:flex-initial"
        >
          Enter Finotaur
        </Button>
      </div>
    </div>
  );
}
