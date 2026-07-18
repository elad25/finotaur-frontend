// src/pages/app/ai/copilot/components/AIRecommendationsDrawer.tsx
// =========================================================
// Right-edge slide-out drawer wrapping AIRecommendationsCard content.
// Mirrors AiAdvicesDrawer's architecture (collapsed pull-tab / open panel),
// but styled gold-forward so it reads as a distinct, premium surface and
// stacked BELOW the AI Advices tab so the two never overlap.
//
// Collapsed: vertical pull-tab fixed to right viewport edge (z-40).
// Open:      panel slides in from right (z-50), full height, w-[380px].
// State: localStorage key `copilot_ai_recs_open`.
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Gem } from 'lucide-react';
import { AIRecommendationsCard } from './AIRecommendationsCard';

const LS_KEY = 'copilot_ai_recs_open';

// Note: AiAdvicesDrawer does not expose a close hook to coordinate with, and
// per scope it isn't refactored beyond the relativeTime import change — so
// both panels can be open simultaneously. Each drawer's own pull-tab/backdrop
// lets the user close it independently.

export function AIRecommendationsDrawer() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(isOpen));
    } catch {
      // storage unavailable — no-op
    }
  }, [isOpen]);

  // Esc key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <>
      {/* ── Pull tab (hidden when panel is open) ────────────────────────── */}
      {!isOpen && (
        <button
          onClick={open}
          aria-label="Open AI Recommendations panel"
          className={[
            'fixed right-0 top-[calc(50%+8.5rem)] z-40',
            'flex flex-col items-center justify-center gap-1.5',
            'h-28 w-9 rounded-l-[6px]',
            'border border-r-0 border-gold-primary/60',
            'bg-gradient-to-b from-gold-primary/25 via-[#070604]/95 to-gold-primary/25',
            'backdrop-blur-sm',
            'shadow-[-6px_0_24px_rgba(0,0,0,0.55),-2px_0_10px_rgba(244,217,123,0.25)]',
            'transition-colors hover:from-gold-primary/35 hover:to-gold-primary/35',
          ].join(' ')}
        >
          <Gem className="h-3.5 w-3.5 text-gold-bright flex-none" />
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.18em] text-gold-bright"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            AI RECOMMENDATIONS
          </span>
        </button>
      )}

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="AI Recommendations"
        aria-modal="true"
        className={[
          'fixed right-0 top-0 h-full w-[380px] max-w-[90vw] z-50',
          'flex flex-col',
          'bg-[#070604]/97 backdrop-blur-md',
          'border-l border-gold-primary/25',
          'shadow-[-20px_0_60px_rgba(0,0,0,0.70)]',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-none">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-gold-primary" />
            <p className="text-base font-bold text-gold-primary tracking-wide">AI RECOMMENDATIONS</p>
          </div>
          <button
            onClick={close}
            aria-label="Close AI Recommendations panel"
            className="flex items-center justify-center h-7 w-7 rounded-full border border-white/10 bg-white/5 text-ink-tertiary hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card content — fills remaining height */}
        <div className="relative flex flex-col flex-1 overflow-hidden px-5 pb-5">
          {/* Toggle: close from inside the panel */}
          <div
            role="none"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full"
          >
            <button
              onClick={toggle}
              aria-label="Toggle AI Recommendations panel"
              className="flex items-center justify-center h-8 w-5 rounded-l-[4px] border border-r-0 border-gold-primary/30 bg-[#070604]/90 text-gold-primary/60 hover:text-gold-primary transition-colors"
            >
              {/* chevron pointing left when open */}
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                <path d="M6 2L2 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <AIRecommendationsCard frameless />
        </div>
      </div>
    </>
  );
}
