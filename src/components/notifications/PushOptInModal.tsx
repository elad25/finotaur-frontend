// src/components/notifications/PushOptInModal.tsx
// ================================================
// Web Push Notification opt-in modal.
//
// Eligibility (ALL must be true):
//   1. isLoggedIn — user has an active auth session
//   2. hasConsent('analytics') — Stage 1 cookie consent accepted
//   3. getPushPermissionState() === 'default' — not yet asked
//   4. visitCount >= 3 — returning user (anti-annoy gate)
//   5. !dismissedThisSession — user hasn't dismissed already this session
//
// Visit counting:
//   - Incremented in localStorage key 'finotaur_visit_count'
//   - Throttled to once per 30 min via 'finotaur_last_visit_inc'
//     so navigating back to the app within a session doesn't over-count.
//
// Dismiss state:
//   - sessionStorage key 'finotaur_push_opt_dismissed'
//   - Resets on new tab / browser restart — user will see it again next session.
// ================================================

import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { hasConsent } from '@/lib/consent';
import { getPushPermissionState, subscribeToPush } from '@/lib/webpush';
import { useAuth } from '@/hooks/useAuth';

// ─── Storage keys ──────────────────────────────────────────────────────────────

const VISIT_COUNT_KEY = 'finotaur_visit_count';
const LAST_VISIT_INC_KEY = 'finotaur_last_visit_inc';
const DISMISS_SESSION_KEY = 'finotaur_push_opt_dismissed';
const VISIT_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes
const VISIT_THRESHOLD = 3;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function readVisitCount(): number {
  const raw = localStorage.getItem(VISIT_COUNT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function incrementVisitCount(): number {
  const now = Date.now();
  const lastInc = parseInt(localStorage.getItem(LAST_VISIT_INC_KEY) || '0', 10);

  if (now - lastInc < VISIT_THROTTLE_MS) {
    // Within throttle window — don't increment, return current count
    return readVisitCount();
  }

  const newCount = readVisitCount() + 1;
  localStorage.setItem(VISIT_COUNT_KEY, String(newCount));
  localStorage.setItem(LAST_VISIT_INC_KEY, String(now));
  return newCount;
}

function isDismissedThisSession(): boolean {
  return sessionStorage.getItem(DISMISS_SESSION_KEY) === '1';
}

function setDismissedThisSession(): void {
  sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PushOptInModal() {
  const { user, isLoading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const handleDismiss = useCallback(() => {
    setDismissedThisSession();
    setVisible(false);
  }, []);

  // Evaluate eligibility once auth has resolved
  useEffect(() => {
    if (authLoading) return;

    const isLoggedIn = !!user;
    if (!isLoggedIn) return;
    if (!hasConsent('analytics')) return;
    if (getPushPermissionState() !== 'default') return;
    if (isDismissedThisSession()) return;

    const visitCount = incrementVisitCount();
    if (visitCount < VISIT_THRESHOLD) return;

    // All gates passed — show the modal after a short delay so the
    // rest of the page can render first (non-intrusive feel).
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [authLoading, user]);

  // Close modal via Escape key + trap focus inside the dialog
  useEffect(() => {
    if (!visible) return;

    // Move focus to the primary CTA when modal opens
    firstFocusableRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
        return;
      }

      // Simple focus trap — cycle between focusable elements
      if (e.key === 'Tab') {
        const modal = document.getElementById('push-opt-in-modal');
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleDismiss]);

  const handleEnable = useCallback(async () => {
    setSubscribing(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        setVisible(false);
        toast.success('Notifications enabled');
      } else if (result.reason === 'denied') {
        // Browser denied — update state, modal will not show again
        setVisible(false);
        toast.error('Notifications blocked in browser settings');
      } else if (result.reason === 'misconfigured') {
        // VAPID key missing — silently close, no user-facing error
        setVisible(false);
      } else {
        toast.error('Could not enable notifications — please try again');
      }
    } finally {
      setSubscribing(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Non-blocking semi-transparent backdrop */}
          <motion.div
            key="push-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />

          {/* Floating card — bottom-right */}
          <motion.div
            key="push-modal"
            id="push-opt-in-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[90vw] rounded-xl border border-gold/30 bg-zinc-950 p-5 shadow-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={handleDismiss}
              aria-label="Close notification prompt"
              className="absolute top-3 right-3 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <X size={16} aria-hidden="true" />
            </button>

            {/* Icon + heading */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 rounded-lg bg-gold/10 p-2">
                <Bell size={20} className="text-gold" aria-hidden="true" />
              </div>
              <h2
                id={headingId}
                className="text-lg font-semibold text-gold leading-snug pt-0.5"
              >
                Stay ahead of the market
              </h2>
            </div>

            {/* Body */}
            <p className="text-sm text-zinc-300 leading-relaxed mb-5">
              Get push alerts for the daily Top Secret report, AI stock analyses you
              requested, and weekly market recaps. Browser notifications only — turn
              off anytime.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                ref={firstFocusableRef}
                onClick={handleEnable}
                disabled={subscribing}
                className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-gold/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribing ? 'Enabling…' : 'Enable notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
