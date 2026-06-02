// src/components/onboarding/SpotlightTour.tsx
// ================================================
// SPOTLIGHT TOUR — drawer-based onboarding overlay.
//
// Mounts in ProtectedAppLayout. Renders null unless
// sessionStorage 'finotaur_tour_active' === '1'.
//
// Flow:
//   1. Sets tourMode=true, opens the ProductDrawer.
//   2. Spotlights each drawer product button in sequence.
//   3. Advancement is exclusively via the hero card "Next" button —
//      the dim overlay captures pointer events so stray clicks on
//      spotlighted items cannot navigate or close the drawer.
//   4. On finish/skip: setTourMode(false) → close() → finishOnboarding().
//
// Spotlight is a box-shadow cutout — purely visual, pointer-events:none.
// The hero card is the only interactive element above the overlay.
//
// Steps 1-4, 6: drawer item buttons on the left edge → hero card placed
//   to the RIGHT of the drawer panel with the arrow pointing left.
// Step 5 (Fino): top-right button → hero card placed below-left.
//
// Positioning fix (animation race):
//   The ProductDrawer slides in over ~200ms. A one-shot getBoundingClientRect
//   mid-animation yields a stale rect (e.g. right≈4 instead of ≈280).
//   We run a requestAnimationFrame loop for up to 1500ms after the element
//   first appears (well past the 200ms slide), updating targetRect every
//   frame so the card/ring always reflect the SETTLED position.
//   The hero card is additionally anchored to [data-tour="drawer-panel"]
//   right edge (not the item rect) so it never overlaps the drawer.
// ================================================

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { TOUR_ACTIVE_KEY, finishOnboarding } from './onboardingFlags';
import { useProductDrawer } from '@/contexts/ProductDrawerContext';

// ---------------------------------------------------------------------------
// Step data
// ---------------------------------------------------------------------------

interface TourStep {
  key: string;
  title: string;
  body: string;
  breadcrumb: string;
  isLast?: boolean;
}

const STEPS: TourStep[] = [
  {
    key: 'drawer-product-markets',
    title: 'Markets',
    body: 'Your command center for every market — indices, movers, sentiment and the macro picture, all in one hub.',
    breadcrumb: 'Open the menu → Markets',
  },
  {
    key: 'drawer-product-top-secret',
    title: 'Top Secret',
    body: 'Your monthly edge. Deep institutional analysis and the hidden setups most traders never see.',
    breadcrumb: 'Open the menu → Top Secret',
  },
  {
    key: 'drawer-product-war-zone',
    title: 'War Zone',
    body: 'Start every session ready — a pre-market briefing with global macro and the key levels that matter.',
    breadcrumb: 'Open the menu → War Zone',
  },
  {
    key: 'drawer-product-ai',
    title: 'AI Arena',
    body: 'Hours of analyst work in 30 seconds. Analyze any stock, scan sectors, read the macro — instant, institutional-grade AI.',
    breadcrumb: 'Open the menu → AI Arena',
  },
  {
    key: 'fino',
    title: 'Meet Fino',
    body: 'Your AI trading assistant. Ask it anything — a ticker, a setup, a macro question — and get an instant answer.',
    breadcrumb: 'Top bar → Ask Fino',
  },
  {
    key: 'drawer-product-journal',
    title: 'Trading Journal',
    body: "Where discipline compounds. Log trades, track P&L in R, and let AI surface your patterns. It's free to try — jump in.",
    breadcrumb: 'Open the menu → Journal',
    isLast: true,
  },
];

// ---------------------------------------------------------------------------
// Spotlight overlay — box-shadow cutout, pointer-events:none (purely visual)
// ---------------------------------------------------------------------------

const PAD = 6; // px padding around the target

interface SpotlightProps {
  rect: DOMRect;
}

function SpotlightHighlight({ rect }: SpotlightProps) {
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        boxShadow: '0 0 0 9999px rgba(10,10,10,0.72)',
        border: '2px solid #C9A646',
        borderRadius: 8,
        filter: 'drop-shadow(0 0 8px rgba(201,166,70,0.5))',
        zIndex: 9990,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Animated chevron pointer — points from the card toward the target
// ---------------------------------------------------------------------------

interface ArrowPointerProps {
  targetRect: DOMRect;
  /** true when the hero card is to the right of the target (drawer items) */
  cardIsRight: boolean;
}

function ArrowPointer({ targetRect, cardIsRight }: ArrowPointerProps) {
  // For drawer items (card to the right): arrow sits at the right edge of the
  // target, pointing right (toward the card).
  // For Fino (card below-left): arrow sits below the target, pointing up.
  if (cardIsRight) {
    const arrowX = targetRect.right + 6;
    const arrowY = targetRect.top + targetRect.height / 2 - 12;
    return (
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{ left: arrowX, top: arrowY, zIndex: 9991, color: '#C9A646' }}
        animate={{ x: [0, 6, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronLeft
          className="h-6 w-6"
          style={{
            transform: 'rotate(180deg)',
            filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.6))',
          }}
        />
      </motion.div>
    );
  }

  // Fino: card is below-left, arrow points up toward button
  const arrowX = targetRect.left + targetRect.width / 2 - 12;
  const arrowY = targetRect.bottom + 6;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed"
      style={{ left: arrowX, top: arrowY, zIndex: 9991, color: '#C9A646' }}
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ChevronLeft
        className="h-6 w-6"
        style={{
          transform: 'rotate(90deg)',
          filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.6))',
        }}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Hero card
// ---------------------------------------------------------------------------

interface HeroCardProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  mode: 'spotlight' | 'fallback';
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CARD_ESTIMATE_H = 270;
const CARD_WIDTH = 340;
// Gap between the drawer panel right edge and the hero card left edge
const PANEL_GAP = 24;

function HeroCard({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  mode,
  onNext,
  onBack,
  onSkip,
}: HeroCardProps) {
  let cardStyle: React.CSSProperties = {};

  if (mode === 'spotlight' && targetRect) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    const isFinoStep = step.key === 'fino';

    if (isFinoStep) {
      // Fino is in the top-right — place card below and to the left of it
      const cardTop = targetRect.bottom + PAD + 12;
      let cardLeft = targetRect.right - CARD_WIDTH;
      cardLeft = Math.max(12, Math.min(cardLeft, vpW - CARD_WIDTH - 12));
      cardStyle = {
        position: 'fixed',
        top: Math.min(cardTop, vpH - CARD_ESTIMATE_H - 12),
        left: cardLeft,
        width: CARD_WIDTH,
        zIndex: 9991,
      };
    } else {
      // Drawer items: anchor card to the PANEL's right edge, not the item rect.
      // This guarantees the card never overlaps the drawer regardless of when
      // the rect was sampled during the slide-in animation.
      const panelEl = document.querySelector<HTMLElement>('[data-tour="drawer-panel"]');
      const panelRight = panelEl ? panelEl.getBoundingClientRect().right : targetRect.right;

      const cardLeft = panelRight + PANEL_GAP;

      // If there's not enough room to the right (e.g. narrow/mobile viewport),
      // fall back to a centered layout so the card never clips off-screen.
      if (cardLeft + CARD_WIDTH > vpW - 12) {
        cardStyle = {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))`,
          zIndex: 9991,
        };
      } else {
        // Vertically center on the target item, clamped inside the viewport
        const targetCenterY = targetRect.top + targetRect.height / 2;
        let cardTop = targetCenterY - CARD_ESTIMATE_H / 2;
        cardTop = Math.max(8, Math.min(cardTop, vpH - CARD_ESTIMATE_H - 8));

        cardStyle = {
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: CARD_WIDTH,
          zIndex: 9991,
        };
      }
    }
  } else {
    // Fallback: centered
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))`,
      zIndex: 9991,
    };
  }

  return (
    <div style={cardStyle}>
      <Card
        variant="featured"
        padding="spacious"
        className="relative shadow-glow-gold-resting"
      >
        {/* Skip (X) button */}
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip tour"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-tertiary hover:text-ink-secondary hover:bg-surface-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4">
          <Eyebrow>
            STEP {stepIndex + 1} OF {totalSteps}
          </Eyebrow>

          <h2 className="text-xl font-bold text-ink-primary tracking-tight leading-tight pr-6">
            {step.title}
          </h2>

          <p className="text-ink-secondary text-sm leading-relaxed">
            {step.body}
          </p>

          {/* Fallback breadcrumb */}
          {mode === 'fallback' && (
            <p className="text-xs text-ink-tertiary border border-gold-border rounded px-2 py-1">
              Find it under:{' '}
              <span className="text-gold-primary">{step.breadcrumb}</span>
            </p>
          )}

          {/* Progress dots */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                role="tab"
                aria-selected={i === stepIndex}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === stepIndex ? 24 : 5,
                  backgroundColor:
                    i === stepIndex
                      ? '#C9A646'
                      : i < stepIndex
                      ? 'rgba(201,166,70,0.45)'
                      : 'rgba(255,255,255,0.10)',
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
              >
                Back
              </button>
            )}

            <div className="ml-auto">
              <Button
                variant="gold"
                size="compact"
                showArrow={!step.isLast}
                onClick={onNext}
              >
                {step.isLast ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// How long (ms) the rAF tracking loop runs after the element is FIRST found.
// Must comfortably exceed the drawer slide-in duration (~200ms). 1500ms gives
// a 7.5× safety margin and stops well before any user interaction.
const RAF_TRACK_DURATION_MS = 1500;
// Overall deadline before giving up and switching to fallback mode.
const ACQUIRE_DEADLINE_MS = 2500;

export default function SpotlightTour() {
  // Keep useNavigate/useLocation for potential future use and for the
  // location-change reactivation check.
  const navigate = useNavigate();
  const location = useLocation();
  // Suppress "unused variable" lint — navigate is kept for forward-compat.
  void navigate;

  const { open: openDrawer, close: closeDrawer, setTourMode } = useProductDrawer();

  const [active, setActive] = useState(
    () => sessionStorage.getItem(TOUR_ACTIVE_KEY) === '1',
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mode, setMode] = useState<'spotlight' | 'fallback'>('spotlight');

  // Re-check sessionStorage on location change (set just before navigate in WelcomeIntro)
  useEffect(() => {
    if (sessionStorage.getItem(TOUR_ACTIVE_KEY) === '1') {
      setActive(true);
    }
  }, [location.pathname]);

  const currentStep = STEPS[stepIndex];

  // ── Activate: set tourMode + open drawer ───────────────────────────────
  useEffect(() => {
    if (!active) return;
    setTourMode(true);
    openDrawer();
    // Only run on activation — intentionally empty dep after `active`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── Continuous rAF tracking per step ───────────────────────────────────
  //
  // Why rAF loop instead of one-shot waitForTarget:
  //   The ProductDrawer panel slides in from translateX(-100%) over ~200ms.
  //   A one-shot measurement mid-animation yields a stale rect (right≈4
  //   instead of ≈280). By running a rAF loop we update targetRect EVERY
  //   FRAME for the first RAF_TRACK_DURATION_MS after the element first
  //   appears, so the card/ring converge to the settled final position
  //   automatically — no timer guessing required.
  //
  // Lifecycle:
  //   - Start time: step change.
  //   - firstFoundAt: timestamp when element was first seen with non-zero size.
  //   - Loop continues until (now - firstFoundAt) > RAF_TRACK_DURATION_MS.
  //   - If element never found within ACQUIRE_DEADLINE_MS → fallback mode.
  //   - Cleanup (cancel): on step change or unmount.
  //   - After loop stops: scroll/resize listeners keep the rect fresh for
  //     later layout changes (e.g. user scrolls the drawer list).

  // Ref so the cleanup callback in useEffect can cancel the outstanding rAF.
  const rafIdRef = useRef<number | null>(null);

  // Whether the rAF tracking loop is still running (blocks the scroll/resize
  // listeners from racing with it).
  const rafRunningRef = useRef(false);

  useEffect(() => {
    if (!active || !currentStep) return;

    // Reset state for the new step
    setTargetRect(null);
    setMode('spotlight');

    const startTime = Date.now();
    let firstFoundAt: number | null = null;
    let stopped = false;

    const loop = () => {
      if (stopped) return;

      const now = Date.now();

      // Hard deadline — give up and show fallback
      if (now - startTime > ACQUIRE_DEADLINE_MS) {
        rafRunningRef.current = false;
        setMode('fallback');
        return;
      }

      const el = document.querySelector<HTMLElement>(`[data-tour="${currentStep.key}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          // Element found with non-zero size — record first-found time
          if (firstFoundAt === null) {
            firstFoundAt = now;
          }
          setTargetRect(rect);
          setMode('spotlight');

          // Keep tracking until RAF_TRACK_DURATION_MS has elapsed since
          // first found (covers the full slide-in animation + buffer)
          if (now - firstFoundAt < RAF_TRACK_DURATION_MS) {
            rafIdRef.current = requestAnimationFrame(loop);
          } else {
            // Settled — stop the loop, hand off to scroll/resize listeners
            rafRunningRef.current = false;
            rafIdRef.current = null;
          }
          return;
        }
      }

      // Element not yet found (or zero-size) — keep polling
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafRunningRef.current = true;
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      rafRunningRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  // ── Reposition on scroll / resize (post-rAF-loop) ──────────────────────
  const rafPending = useRef<number | null>(null);

  const reposition = useCallback(() => {
    // Don't race with the rAF tracking loop
    if (rafRunningRef.current) return;
    if (rafPending.current !== null) return;
    rafPending.current = requestAnimationFrame(() => {
      rafPending.current = null;
      if (!currentStep) return;
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${currentStep.key}"]`,
      );
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          setTargetRect(rect);
        }
      }
    });
  }, [currentStep]);

  useEffect(() => {
    if (!active || mode !== 'spotlight') return;

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    return () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
      if (rafPending.current !== null) {
        cancelAnimationFrame(rafPending.current);
        rafPending.current = null;
      }
    };
  }, [active, mode, reposition]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    setTourMode(false);
    closeDrawer();
    finishOnboarding();
    setActive(false);
  }, [setTourMode, closeDrawer]);

  const handleNext = useCallback(() => {
    if (currentStep?.isLast) {
      handleFinish();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  }, [currentStep, handleFinish]);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!active || !currentStep) return null;

  // Determine arrow direction based on step key:
  // Fino (top-right target) → card is below-left → cardIsRight=false
  // All drawer items → card is to the right → cardIsRight=true
  const cardIsRight = currentStep.key !== 'fino';

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight-tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        // Full-screen overlay. pointer-events:auto so stray clicks on the
        // dim area (including spotlighted drawer buttons) are captured and
        // do NOT navigate or close the drawer.
        className="fixed inset-0"
        style={{ zIndex: 9989, pointerEvents: 'auto' }}
        aria-live="polite"
        aria-atomic="true"
      >
        {/* ── Dim / spotlight cutout (pointer-events:none — purely visual) ── */}
        {mode === 'spotlight' && targetRect ? (
          <SpotlightHighlight rect={targetRect} />
        ) : mode === 'fallback' ? (
          <div
            className="fixed inset-0 bg-surface-base/70 pointer-events-none"
            style={{ zIndex: 9990 }}
          />
        ) : null}

        {/* ── Animated pointer arrow (spotlight mode only, pointer-events:none) ── */}
        {mode === 'spotlight' && targetRect && (
          <ArrowPointer targetRect={targetRect} cardIsRight={cardIsRight} />
        )}

        {/* ── Hero card — the single interactive element above the overlay ── */}
        <HeroCard
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={STEPS.length}
          targetRect={targetRect}
          mode={mode}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleFinish}
        />
      </motion.div>
    </AnimatePresence>
  );
}
