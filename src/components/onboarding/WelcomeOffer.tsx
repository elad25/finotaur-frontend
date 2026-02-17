// src/components/onboarding/WelcomeOffer.tsx
// ================================================
// 🎁 WELCOME OFFER — Post-tour 10% discount popup
// Shows after Guided Tour ends with 30-minute countdown
// Minimizes to a floating gift icon (bottom-right)
// Timer persists via localStorage with real expiry timestamp
// ================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Clock, ArrowRight, Crown } from 'lucide-react';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { toast } from 'sonner';

// =====================================================
// CONFIGURATION
// =====================================================
const OFFER_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY_EXPIRY = 'finotaur_welcome_offer_expiry';
const STORAGE_KEY_DISMISSED = 'finotaur_welcome_offer_dismissed';
const STORAGE_KEY_USED = 'finotaur_welcome_offer_used';
const PROMO_CODE = 'WELCOME10'; // ← Your Whop promo code

// =====================================================
// PUBLIC API
// =====================================================

/** Start the offer — call from GuidedTour when tour ends */
export const startWelcomeOffer = () => {
  if (localStorage.getItem(STORAGE_KEY_USED) === 'true') return;
  if (localStorage.getItem(STORAGE_KEY_EXPIRY)) return;
  const expiry = Date.now() + OFFER_DURATION_MS;
  localStorage.setItem(STORAGE_KEY_EXPIRY, String(expiry));
  localStorage.removeItem(STORAGE_KEY_DISMISSED);
};

/** Check if offer is still valid */
export const isWelcomeOfferActive = () => {
  if (localStorage.getItem(STORAGE_KEY_USED) === 'true') return false;
  const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
  if (!expiry) return false;
  return Date.now() < Number(expiry);
};

/** Mark offer as used */
export const markWelcomeOfferUsed = () => {
  localStorage.setItem(STORAGE_KEY_USED, 'true');
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_DISMISSED);
};

const cleanupExpiredOffer = () => {
  const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
  if (expiry && Date.now() >= Number(expiry)) {
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_DISMISSED);
  }
};

const formatTime = (ms: number) => {
  if (ms <= 0) return { minutes: '00', seconds: '00' };
  const total = Math.floor(ms / 1000);
  return {
    minutes: String(Math.floor(total / 60)).padStart(2, '0'),
    seconds: String(total % 60).padStart(2, '0'),
  };
};

// =====================================================
// COMPONENT
// =====================================================
export default function WelcomeOffer() {
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pulseGift, setPulseGift] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => { markWelcomeOfferUsed(); setIsActive(false); },
    onError: (error) => { toast.error('Checkout failed', { description: error.message }); },
  });

  // ─── Tick timer ───────────────────────────────────
  const tick = useCallback(() => {
    cleanupExpiredOffer();
    const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    if (!expiry || localStorage.getItem(STORAGE_KEY_USED) === 'true') {
      setIsActive(false);
      return;
    }
    const remaining = Number(expiry) - Date.now();
    if (remaining <= 0) {
      setTimeLeft(0);
      setIsActive(false);
      localStorage.removeItem(STORAGE_KEY_EXPIRY);
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
      return;
    }
    setTimeLeft(remaining);
    setIsActive(true);
  }, []);

  useEffect(() => {
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tick]);

  // Poll for same-tab storage changes
  useEffect(() => {
    const poll = setInterval(tick, 2000);
    return () => clearInterval(poll);
  }, [tick]);

  // Restore minimized state
  useEffect(() => {
    if (isActive) {
      setIsMinimized(localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true');
    }
  }, [isActive]);

  // Pulse gift icon when minimized
  useEffect(() => {
    if (!isMinimized || !isActive) return;
    const pulse = setInterval(() => {
      setPulseGift(true);
      setTimeout(() => setPulseGift(false), 1200);
    }, 8000);
    const initial = setTimeout(() => {
      setPulseGift(true);
      setTimeout(() => setPulseGift(false), 1200);
    }, 2000);
    return () => { clearInterval(pulse); clearTimeout(initial); };
  }, [isMinimized, isActive]);

  const handleMinimize = () => {
    setIsMinimized(true);
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  };

  const handleReopen = () => {
    setIsMinimized(false);
    localStorage.removeItem(STORAGE_KEY_DISMISSED);
  };

  const handleClaim = async () => {
    await initiateCheckout({
      planName: 'platform_finotaur',
      billingInterval: 'monthly',
    });
  };

  if (!isActive) return null;

  const { minutes, seconds } = formatTime(timeLeft);
  const isUrgent = timeLeft < 5 * 60 * 1000;

  // =====================================================
  // MINIMIZED — Floating gift icon
  // =====================================================
  if (isMinimized) {
    return (
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={handleReopen}
          className="fixed bottom-[6.5rem] right-[2rem] z-[9997] group"
          aria-label="Open welcome offer"
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={pulseGift ? { scale: [1, 1.6, 1.8], opacity: [0.4, 0.15, 0] } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }}
          />

          {/* Button — solid purple circle */}
          <motion.div
            className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
              boxShadow: '0 8px 32px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.2)',
            }}
          >
            <Gift className="w-6 h-6 text-white" />
            {/* Timer badge */}
            <div
              className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: isUrgent ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #C9A646, #D4AF37)',
                color: isUrgent ? '#fff' : '#000',
                boxShadow: isUrgent ? '0 2px 8px rgba(239,68,68,0.5)' : '0 2px 8px rgba(201,166,70,0.4)',
              }}
            >
              {minutes}:{seconds}
            </div>
          </motion.div>

          {/* Hover tooltip */}
          <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div
              className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              🎁 Your 10% discount is waiting!
            </div>
          </div>
        </motion.button>
      </AnimatePresence>
    );
  }

  // =====================================================
  // EXPANDED — Full offer popup
  // =====================================================
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={handleMinimize}
        />

        {/* Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gold top line */}
          <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)' }} />

          {/* Close */}
          <button onClick={handleMinimize} className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 pt-8 text-center">
            {/* Gift icon */}
            <div className="relative inline-flex items-center justify-center mb-5">
              <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: 'rgba(201,166,70,0.15)', transform: 'scale(2.5)' }} />
              <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))', border: '1px solid rgba(201,166,70,0.3)' }}
              >
                <Gift className="w-8 h-8 text-[#C9A646]" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-2">
              <span className="text-white">Welcome Gift: </span>
              <span style={{ background: 'linear-gradient(135deg, #F4D97B, #C9A646)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                10% Off for 3 Months
              </span>
            </h2>

            <p className="text-zinc-400 text-sm leading-relaxed mb-4 max-w-sm mx-auto">
              As a new member, use this exclusive promo code at checkout to get 10% off your first 3 payments.
            </p>

            {/* Promo Code Display */}
            <button
              onClick={() => {
                navigator.clipboard.writeText('WELCOME10');
                toast.success('Promo code copied!');
              }}
              className="group inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-6 cursor-pointer transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(201,166,70,0.08)',
                border: '1px dashed rgba(201,166,70,0.4)',
              }}
            >
              <span className="text-lg font-mono font-bold tracking-widest" style={{ color: '#F4D97B' }}>
                WELCOME10
              </span>
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                tap to copy
              </span>
            </button>

            {/* Timer */}
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-6"
              style={{
                background: isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(201,166,70,0.06)',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(201,166,70,0.2)'}`,
              }}
            >
              <Clock className="w-4 h-4" style={{ color: isUrgent ? '#ef4444' : '#C9A646' }} />
              <div className="flex items-center gap-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono font-bold"
                  style={{ background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(201,166,70,0.1)', color: isUrgent ? '#ef4444' : '#F4D97B' }}
                >
                  {minutes}
                </div>
                <span className="text-lg font-bold mx-0.5" style={{ color: isUrgent ? '#ef4444' : '#C9A646' }}>:</span>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-mono font-bold"
                  style={{ background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(201,166,70,0.1)', color: isUrgent ? '#ef4444' : '#F4D97B' }}
                >
                  {seconds}
                </div>
              </div>
              <span className="text-xs font-medium" style={{ color: isUrgent ? '#ef4444' : 'rgba(201,166,70,0.7)' }}>
                remaining
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
              style={{
                background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                boxShadow: '0 6px 25px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                color: '#1a1510',
              }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Claim 10% Off — Subscribe Now
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button onClick={handleMinimize} className="text-zinc-500 hover:text-zinc-400 text-xs transition-colors">
              I need to think about it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}