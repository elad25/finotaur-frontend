// src/components/onboarding/SpotlightTour.tsx
// ================================================
// SPOTLIGHT TOUR — drawer-based onboarding overlay.
//
// Mounts in ProtectedAppLayout. Renders null unless
// sessionStorage 'finotaur_tour_active' === '1'.
//
// Flow:
//   1. Sets tourMode=true (drawer open/close is managed per-step).
//   2. Step 'menu': drawer is CLOSED — hamburger is visible in the top bar.
//   3. Steps 'drawer-product-*': drawer is OPEN — spotlights each product.
//   4. Step 'fino': drawer stays OPEN — spotlights the Ask Fino top-bar button.
//   5. On finish/skip: setTourMode(false) → close() → finishOnboarding()
//      → navigate to /app/stocks/overview.
//
// Spotlight is a box-shadow cutout — purely visual, pointer-events:none.
// The hero card is the only interactive element above the overlay.
//
// Step placement:
//   menu / fino: top-bar targets → hero card placed BELOW the target.
//     menu: card left-aligned to button.
//     fino: card right-aligned (right edge of card = right edge of button).
//   drawer-product-*: drawer item buttons on the left edge → hero card
//     placed to the RIGHT of the drawer panel with the arrow pointing left.
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

// Order mirrors the sidebar top-to-bottom (Home → Markets → AI Arena →
// War Zone → Top Secret → Journal), bookended by the menu intro and Fino last.
const STEPS: TourStep[] = [
  {
    key: 'menu',
    title: 'Your menu',
    body: 'Every tool lives here. Tap this button anytime to jump between Markets, the AI Arena, your Journal and more.',
    breadcrumb: 'Top bar → Menu',
  },
  {
    key: 'drawer-home',
    title: 'Home',
    body: 'Your command center — jump into any product, ask Fino, and pick up where you left off.',
    breadcrumb: 'Open the menu → Home',
  },
  {
    key: 'drawer-product-markets',
    title: 'Markets',
    body: 'Your command center for every market — indices, movers, sentiment and the macro picture, all in one hub.',
    breadcrumb: 'Open the menu → Markets',
  },
  {
    key: 'drawer-product-ai',
    title: 'AI Arena',
    body: 'Hours of analyst work in 30 seconds. Analyze any stock, scan sectors, read the macro — instant, institutional-grade AI.',
    breadcrumb: 'Open the menu → AI Arena',
  },
  {
    key: 'drawer-product-top-secret',
    title: 'Top Secret',
    body: 'Your daily edge — a WAR ZONE pre-market briefing every morning, plus institutional-grade research: ISM macro, crypto and deep-dive reports.',
    breadcrumb: 'Open the menu → Top Secret',
  },
  {
    key: 'drawer-product-journal',
    title: 'Trading Journal',
    body: "Where discipline compounds. Log trades, track P&L in R, and let AI surface your patterns. It's free to try — jump in.",
    breadcrumb: 'Open the menu → Journal',
  },
  {
    key: 'fino',
    title: 'Meet Fino',
    body: 'Ask me anything — a ticker, a setup, or a macro question — and get an instant, grounded answer.',
    breadcrumb: 'Top bar → Ask Fino',
    isLast: true,
  },
];

// ---------------------------------------------------------------------------
// Spotlight overlay — box-shadow cutout, pointer-events:none (purely visual)
// ---------------------------------------------------------------------------

const PAD = 6; // px padding around the target

// Smooth glide between steps so the spotlight/card never "jumps" (and never
// detours through the centered layout) when moving from one target to the next.
const GLIDE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const SPOT_TRANSITION = `left 0.4s ${GLIDE_EASE}, top 0.4s ${GLIDE_EASE}, width 0.4s ${GLIDE_EASE}, height 0.4s ${GLIDE_EASE}`;
const POS_TRANSITION = `left 0.4s ${GLIDE_EASE}, top 0.4s ${GLIDE_EASE}`;

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
        // Mostly-transparent dim — the page stays visible; the spotlighted
        // target is lit by a translucent white halo (Elad 2026-07-18: not gold)
        // instead of drowned in black.
        background: 'rgba(255,255,255,0.08)',
        boxShadow:
          '0 0 0 9999px rgba(0,0,0,0.35), 0 0 28px 6px rgba(255,255,255,0.30), inset 0 0 18px rgba(255,255,255,0.14)',
        border: '2px solid rgba(255,255,255,0.85)',
        borderRadius: 8,
        filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.45))',
        transition: SPOT_TRANSITION,
        zIndex: 9990,
      }}
    />
  );
}

// Frosted backdrop — blurs the whole viewport EXCEPT the spotlighted target
// rect (four strips around the cutout), so the highlighted element stays crisp
// while the rest of the page reads as soft frosted glass. Purely visual.
function SpotlightBlur({ rect }: SpotlightProps) {
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const base: React.CSSProperties = {
    position: 'fixed',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    transition: SPOT_TRANSITION,
    zIndex: 9988,
    pointerEvents: 'none',
  };
  return (
    <div aria-hidden="true">
      <div style={{ ...base, left: 0, top: 0, width: '100vw', height: Math.max(0, y) }} />
      <div style={{ ...base, left: 0, top: y + h, width: '100vw', height: `calc(100vh - ${y + h}px)` }} />
      <div style={{ ...base, left: 0, top: y, width: Math.max(0, x), height: h }} />
      <div style={{ ...base, left: x + w, top: y, width: `calc(100vw - ${x + w}px)`, height: h }} />
    </div>
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
  // For menu/fino (card below target): arrow sits below the target, pointing up.
  if (cardIsRight) {
    const arrowX = targetRect.right + 6;
    const arrowY = targetRect.top + targetRect.height / 2 - 12;
    return (
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{ left: arrowX, top: arrowY, zIndex: 9991, color: '#C9A646', transition: POS_TRANSITION }}
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

  // menu/fino: card is below, arrow points up toward button
  const arrowX = targetRect.left + targetRect.width / 2 - 12;
  const arrowY = targetRect.bottom + 6;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed"
      style={{ left: arrowX, top: arrowY, zIndex: 9991, color: '#C9A646', transition: POS_TRANSITION }}
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

const CARD_ESTIMATE_H = 300; // slightly taller to accommodate Fino lens
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

  // Top-bar steps: menu and fino both sit BELOW their respective buttons
  const isTopBarStep = step.key === 'menu' || step.key === 'fino';

  if (mode === 'spotlight' && targetRect) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    if (isTopBarStep) {
      const cardTop = targetRect.bottom + PAD + 12;

      let cardLeft: number;
      if (step.key === 'menu') {
        // Left-align the card to the hamburger button
        cardLeft = Math.max(12, Math.min(targetRect.left, vpW - CARD_WIDTH - 12));
      } else {
        // fino: right-align (right edge of card = right edge of button)
        cardLeft = targetRect.right - CARD_WIDTH;
        cardLeft = Math.max(12, Math.min(cardLeft, vpW - CARD_WIDTH - 12));
      }

      cardStyle = {
        position: 'fixed',
        top: Math.min(cardTop, vpH - CARD_ESTIMATE_H - 12),
        left: cardLeft,
        width: CARD_WIDTH,
        transition: POS_TRANSITION,
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
          transition: POS_TRANSITION,
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

  const isFinoStep = step.key === 'fino';

  return (
    <div style={cardStyle}>
      <Card
        variant="featured"
        padding="spacious"
        className="relative shadow-glow-gold-resting"
        // Force a fully opaque panel so dimmed page content never bleeds
        // through the card (DS surface-1 is intentionally semi-transparent).
        style={{ backgroundColor: '#0F0F0F' }}
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
          {/* Fino mascot lens — only on the fino step */}
          {isFinoStep && (
            <div className="flex justify-center">
              <div className="relative" style={{ width: 112, height: 112 }}>
                {/* Avatar lens — stays put (gentle float only) */}
                <motion.div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #C9A646',
                    boxShadow: '0 0 24px rgba(201,166,70,0.45)',
                  }}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img
                    src="/fino-avatar.png"
                    alt="Fino"
                    className="h-full w-full object-cover scale-110"
                  />
                </motion.div>

                {/* Waving hand — a real "hello" wave, pivoting at the wrist */}
                <motion.span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 select-none"
                  style={{ fontSize: 34, transformOrigin: '70% 80%' }}
                  animate={{ rotate: [0, 18, -8, 18, -8, 0] }}
                  transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.7, ease: 'easeInOut' }}
                >
                  👋
                </motion.span>
              </div>
            </div>
          )}

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
  const navigate = useNavigate();
  const location = useLocation();

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

  // ── Activate: set tourMode only (drawer managed per-step below) ────────
  useEffect(() => {
    if (!active) return;
    setTourMode(true);
    // Intentionally NOT opening the drawer here — the per-step effect handles it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── Per-step drawer orchestration + rAF tracking ───────────────────────
  //
  // 'menu' step: drawer CLOSED so the hamburger is fully visible.
  // All other steps: drawer OPEN (products are in the drawer; fino keeps it open too).
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

    // Open/close drawer based on step
    if (currentStep.key === 'menu') {
      closeDrawer();
    } else {
      openDrawer();
    }

    // Keep the previous targetRect in place so the spotlight + hero card
    // GLIDE to the new target (CSS transition) instead of detouring through
    // the centered (null-rect) layout — which caused visible "jumps" between
    // steps, especially 4→5→6 where the targets are far apart.
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
    navigate('/app/home', { replace: true });
  }, [setTourMode, closeDrawer, navigate]);

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

  // Determine arrow direction:
  // Drawer items (card to the right of drawer) → cardIsRight=true → arrow points left toward item.
  // menu & fino (card below top-bar target) → cardIsRight=false → arrow points up toward button.
  const cardIsRight =
    currentStep.key.startsWith('drawer-product-') ||
    currentStep.key === 'drawer-home';

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
          <>
            <SpotlightBlur rect={targetRect} />
            <SpotlightHighlight rect={targetRect} />
          </>
        ) : mode === 'fallback' ? (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none"
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
