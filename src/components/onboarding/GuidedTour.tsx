// src/components/onboarding/GuidedTour.tsx
// ================================================
// 🎯 GUIDED TOUR — Post-registration walkthrough
// Navigates user through: Top Secret → War Zone → Journal → AI
// Tooltip positioned below the relevant nav tab
// Nav area (top nav + sub nav) stays visible — rest is blurred
// Design: Black + Gold only, full backdrop blur
// ================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { startWelcomeOffer } from './WelcomeOffer';

// =====================================================
// TOUR STEPS CONFIGURATION
// =====================================================
const TOUR_STEPS = [
  {
    path: '/app/top-secret',
    title: 'Top Secret',
    tabLabel: 'Top Secret',
    description: 'Premium monthly intelligence report. Deep institutional analysis, hidden opportunities, and strategic plays that most traders never see.',
    tooltipSide: 'center' as const,
  },
  {
    path: '/app/all-markets/warzone',
    title: 'War Zone',
    tabLabel: 'War Zone',
    description: 'Your daily market briefing. Pre-market overview, global macro analysis, and key levels — every morning at 9:00 AM.',
    tooltipSide: 'center' as const,
  },
  {
    path: '/app/journal/overview',
    title: 'Trading Journal',
    tabLabel: 'Journal',
    description: 'Log every trade, track your P&L, and let AI analyze your patterns. The tool that turns losing streaks into winning systems.',
    tooltipSide: 'center' as const,
  },
  {
    path: '/app/ai/stock-analyzer',
    title: 'AI Suite',
    tabLabel: 'AI Insights',
    description: 'Institutional-grade AI analysis in 30 seconds. Stock analyzer, sector scanner, macro insights — what takes analysts hours, AI delivers instantly.',
    tooltipSide: 'center' as const,
  },
];

const TOUR_STORAGE_KEY = 'finotaur_guided_tour';
const TOUR_STEP_KEY = 'finotaur_tour_step';

// =====================================================
// PUBLIC API
// =====================================================
export const startGuidedTour = () => {
  sessionStorage.setItem(TOUR_STORAGE_KEY, 'active');
  sessionStorage.setItem(TOUR_STEP_KEY, '0');
};

export const isGuidedTourActive = () => {
  return sessionStorage.getItem(TOUR_STORAGE_KEY) === 'active';
};

export const clearGuidedTour = () => {
  sessionStorage.removeItem(TOUR_STORAGE_KEY);
  sessionStorage.removeItem(TOUR_STEP_KEY);
};

// =====================================================
// HELPER: Find the bottom edge of the nav area
// Looks for the sub-nav scrollable row or falls back to
// a fixed height estimate
// =====================================================
function getNavBottomY(): number {
  // Try to find the sub-nav container (horizontal scrollable tabs row)
  // Common patterns: a scrollable div with role="tablist", or a 
  // horizontal overflow container near the top
  const candidates = [
    // Sub-nav scroll container — usually has overflow-x-auto near top
    ...document.querySelectorAll('[role="tablist"]'),
    // Fallback: any horizontal scroll container in the top 200px
    ...document.querySelectorAll('.overflow-x-auto, .overflow-x-scroll'),
  ];

  let maxBottom = 0;
  for (const el of candidates) {
    const rect = (el as HTMLElement).getBoundingClientRect();
    // Only consider elements near the top of the page (nav area)
    if (rect.top < 200 && rect.bottom > maxBottom) {
      maxBottom = rect.bottom;
    }
  }

  // If we found something, add a small padding
  if (maxBottom > 0) return maxBottom + 4;

  // Last resort: estimate based on typical nav heights
  // Top nav (~64px) + sub nav (~48px) + some padding
  return 120;
}

// =====================================================
// GUIDED TOUR COMPONENT
// =====================================================
export default function GuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowLeft: number } | null>(null);
  const [navCutoutBottom, setNavCutoutBottom] = useState(120);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour is active — re-check on every route change
  useEffect(() => {
    const active = sessionStorage.getItem(TOUR_STORAGE_KEY) === 'active';
    const step = parseInt(sessionStorage.getItem(TOUR_STEP_KEY) || '0', 10);
    setIsActive(active);
    setCurrentStep(step);
  }, [location.pathname]);

  // Position tooltip below the relevant tab
  const positionTooltip = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    // Find the tab by matching its visible text content
    let el: HTMLElement | null = null;
    const allButtons = document.querySelectorAll('button, a');
    for (const btn of allButtons) {
      const text = btn.textContent?.trim();
      if (text && text.startsWith(step.tabLabel) && (btn as HTMLElement).offsetParent !== null) {
        el = btn as HTMLElement;
        break;
      }
    }

    // Calculate nav area bottom for cutout
    const navBottom = getNavBottomY();
    setNavCutoutBottom(navBottom);

    if (el) {
      const rect = el.getBoundingClientRect();
      const tabCenterX = rect.left + rect.width / 2;
      const tooltipWidth = 340;

      let left: number;
      // Center under the tab
      left = tabCenterX - tooltipWidth / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

      // Arrow offset: distance from tooltip left edge to tab center
      const arrowLeft = Math.max(14, Math.min(tabCenterX - left, tooltipWidth - 14));

      // Position tooltip below the nav area (not just below the tab)
      // Use whichever is lower: tab bottom or nav bottom
      const tooltipTop = Math.max(rect.bottom + 12, navBottom + 8);

      setTooltipPos({
        top: tooltipTop,
        left,
        arrowLeft,
      });
    } else {
      // Fallback
      setTooltipPos({
        top: navBottom + 8,
        left: 72,
        arrowLeft: 30,
      });
    }
  }, [currentStep]);

  // When location changes, show tooltip after page loads
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    if (location.pathname === step.path) {
      // Delay to let page render + sidebar populate
      const timer = setTimeout(() => {
        positionTooltip();
        setIsVisible(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isActive, currentStep, positionTooltip]);

  // Navigate to correct page when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    if (location.pathname !== step.path) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        navigate(step.path, { replace: true });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep]);

  // Reposition on resize
  useEffect(() => {
    if (!isVisible) return;
    const handleResize = () => positionTooltip();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, positionTooltip]);

  // Block scrolling during tour
  useEffect(() => {
    if (isActive && isVisible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isActive, isVisible]);

  const handleNext = useCallback(() => {
    setIsVisible(false);

    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      sessionStorage.setItem(TOUR_STEP_KEY, String(nextStep));
    } else {
      // Tour complete — start welcome offer & stay on last page
      clearGuidedTour();
      setIsActive(false);
      startWelcomeOffer();
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    clearGuidedTour();
    setIsActive(false);
    startWelcomeOffer();
  }, []);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Build clip-path that cuts out the nav area
  // The overlay covers the full screen EXCEPT the nav strip at the top
  const W = '100vw';
  const navH = navCutoutBottom;
  // clip-path polygon: full screen minus the nav rectangle
  // Draw outer rectangle clockwise, then inner rectangle counter-clockwise
  const clipPath = `polygon(
    0% 0%, 
    100% 0%, 
    100% 100%, 
    0% 100%, 
    0% ${navH}px, 
    100% ${navH}px, 
    100% 0%, 
    0% 0%
  )`;

  return (
    <>
      {/* ============================================= */}
      {/* OVERLAY: Blurs everything BELOW the nav area  */}
      {/* Nav stays crisp and visible                   */}
      {/* ============================================= */}
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Dark overlay BELOW nav — with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-[9998]"
              style={{
                top: navCutoutBottom,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
              onClick={handleSkip}
            />

            {/* Subtle darkening on the nav area — NO blur, just slight dim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed left-0 right-0 z-[9998]"
              style={{
                top: 0,
                height: navCutoutBottom,
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                // No blur — nav stays crisp
                pointerEvents: 'none',
              }}
            />

            {/* Gold line separator at the bottom of the nav cutout */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="fixed left-0 right-0 z-[9998] h-[1px]"
              style={{
                top: navCutoutBottom,
                background: 'linear-gradient(90deg, transparent 5%, rgba(201,166,70,0.4) 30%, rgba(201,166,70,0.6) 50%, rgba(201,166,70,0.4) 70%, transparent 95%)',
                transformOrigin: 'center',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ============================================= */}
      {/* TOOLTIP — positioned below nav, arrow to tab  */}
      {/* ============================================= */}
      <AnimatePresence>
        {isVisible && tooltipPos && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.05 }}
            className="fixed z-[9999] w-[340px] max-w-[calc(100vw-1.5rem)]"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointing up to the tab */}
            <div
              className="absolute -top-[6px]"
              style={{
                left: tooltipPos.arrowLeft,
                transform: 'translateX(-7px)',
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderBottom: '7px solid rgba(201,166,70,0.4)',
              }}
            />

            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
                border: '1px solid rgba(201,166,70,0.35)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,166,70,0.08)',
              }}
            >
              {/* Gold accent line at top */}
              <div
                className="h-[2px] w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, #C9A646, #D4AF37, #C9A646, transparent)',
                }}
              />

              {/* Content */}
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-lg font-bold tracking-tight"
                    style={{ color: '#C9A646' }}
                  >
                    {step.title}
                  </h3>
                  <button
                    onClick={handleSkip}
                    className="p-1 rounded-md hover:bg-white/5 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                  {step.description}
                </p>

                {/* Footer: Progress + Actions */}
                <div className="flex items-center justify-between">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2">
                    {TOUR_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className="h-1 rounded-full transition-all duration-500"
                        style={{
                          width: i === currentStep ? 20 : 6,
                          backgroundColor:
                            i === currentStep
                              ? '#C9A646'
                              : i < currentStep
                              ? 'rgba(201,166,70,0.4)'
                              : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                    <span className="text-zinc-600 text-[11px] font-medium ml-1">
                      {currentStep + 1}/{TOUR_STEPS.length}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSkip}
                      className="px-2.5 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleNext}
                      className="group flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all duration-200 hover:brightness-110"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646, #D4AF37)',
                      }}
                    >
                      {isLastStep ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Let's Go!
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}