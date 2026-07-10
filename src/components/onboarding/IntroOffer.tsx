// src/components/onboarding/IntroOffer.tsx
// ================================================
// 🎁 INTRO OFFER — One-time-ever hidden Trader discount popup
// Shows after Guided Tour ends with a 30-minute countdown.
// Auto-opens the expanded card exactly once, then minimizes to a
// floating gift icon (bottom-right) for the remainder of the window.
// Server (intro_offer_state table) is the source of truth; localStorage
// is a read-cache only, so a terminal state never needs a network round
// trip on later mounts.
// No coupon codes — the discount lives on a hidden Whop plan.
// ================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Clock, ArrowRight, Crown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { supabase } from '@/lib/supabase';
import { INTRO_OFFER } from '@/lib/whop-config';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';

// =====================================================
// CONFIGURATION
// =====================================================
const OFFER_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = 'finotaur_intro_offer_state';

// Legacy WelcomeOffer keys — read once to shim existing users into a
// terminal intro_offer_state row so they never see the new popup twice.
const LEGACY_KEY_EXPIRY = 'finotaur_welcome_offer_expiry';
const LEGACY_KEY_DISMISSED = 'finotaur_welcome_offer_dismissed';
const LEGACY_KEY_USED = 'finotaur_welcome_offer_used';

type IntroOfferStatus = 'active' | 'expired' | 'used' | 'dismissed';

interface IntroOfferCache {
  status: IntroOfferStatus;
  expiresAt: string; // ISO
  autoOpened: boolean;
}

// =====================================================
// CACHE HELPERS (read-cache only — server row is the source of truth)
// =====================================================

function readCache(): IntroOfferCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as IntroOfferCache) : null;
  } catch {
    return null;
  }
}

function writeCache(state: IntroOfferCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota) — cache is best-effort only.
  }
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Start the one-time-ever intro offer — call from onboardingFlags when
 * onboarding finishes. Inserts the server row (expires in 30 min); a
 * conflict on the primary key (row already exists) is a silent no-op.
 */
export const startIntroOffer = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const expiresAt = new Date(Date.now() + OFFER_DURATION_MS).toISOString();
    const { error } = await supabase.from('intro_offer_state').insert({
      user_id: user.id,
      status: 'active',
      expires_at: expiresAt,
    });

    if (error) {
      // 23505 = unique_violation (primary key) — offer already started once, ever.
      if (error.code !== '23505') {
        console.warn('IntroOffer: failed to start offer', error);
      }
      return;
    }

    writeCache({ status: 'active', expiresAt, autoOpened: false });
  } catch (err) {
    console.warn('IntroOffer: startIntroOffer failed', err);
  }
};

/** Cheap, cache-only check — no network call. Conservative: unknown = false. */
export const isIntroOfferActive = (): boolean => {
  const cache = readCache();
  if (!cache || cache.status !== 'active') return false;
  return Date.now() < new Date(cache.expiresAt).getTime();
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
export default function IntroOffer() {
  const { user } = useAuth();

  const [visibility, setVisibility] = useState<'loading' | 'none' | 'active'>('loading');
  const [expiresAtMs, setExpiresAtMs] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pulseGift, setPulseGift] = useState(false);
  const expiredHandledRef = useRef(false);
  const shownTrackedRef = useRef(false);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      // Optimistic — the webhook marks the server row 'used' once payment
      // actually succeeds; this just stops the popup from reappearing
      // immediately in this browser session.
      writeCache({ status: 'used', expiresAt: new Date(expiresAtMs).toISOString(), autoOpened: true });
      setVisibility('none');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    },
  });

  // ─── Load state on mount (and when the user resolves) ────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // A terminal cache entry means we already know the answer — never
      // fires a network call for it again.
      const cached = readCache();
      if (cached && cached.status !== 'active') {
        setVisibility('none');
        return;
      }

      if (!user) {
        setVisibility('none');
        return;
      }

      const { data: row, error } = await supabase
        .from('intro_offer_state')
        .select('status, expires_at, auto_opened_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('IntroOffer: failed to load state', error);
        setVisibility('none');
        return;
      }

      if (!row) {
        // Legacy shim: fold pre-existing WelcomeOffer localStorage state into
        // a terminal server row so returning users never see the new popup.
        const legacyUsed = localStorage.getItem(LEGACY_KEY_USED) === 'true';
        const legacyExpiryRaw = localStorage.getItem(LEGACY_KEY_EXPIRY);
        const legacyExpired = !!legacyExpiryRaw && Date.now() >= Number(legacyExpiryRaw);

        if (legacyUsed || legacyExpired) {
          const terminalStatus: IntroOfferStatus = legacyUsed ? 'used' : 'expired';
          const nowIso = new Date().toISOString();
          const { error: insertErr } = await supabase.from('intro_offer_state').insert({
            user_id: user.id,
            status: terminalStatus,
            expires_at: nowIso,
            ...(terminalStatus === 'used' ? { used_at: nowIso } : {}),
          });
          if (insertErr && insertErr.code !== '23505') {
            console.warn('IntroOffer: legacy shim insert failed', insertErr);
          }
          localStorage.removeItem(LEGACY_KEY_USED);
          localStorage.removeItem(LEGACY_KEY_EXPIRY);
          localStorage.removeItem(LEGACY_KEY_DISMISSED);
          writeCache({ status: terminalStatus, expiresAt: nowIso, autoOpened: true });
        }

        setVisibility('none');
        return;
      }

      if (row.status !== 'active') {
        writeCache({ status: row.status as IntroOfferStatus, expiresAt: row.expires_at, autoOpened: true });
        setVisibility('none');
        return;
      }

      const expiryMs = new Date(row.expires_at).getTime();

      if (Date.now() >= expiryMs) {
        // Expired since the last visit — flip the row and stop.
        void supabase.from('intro_offer_state').update({ status: 'expired' }).eq('user_id', user.id);
        writeCache({ status: 'expired', expiresAt: row.expires_at, autoOpened: true });
        setVisibility('none');
        return;
      }

      writeCache({ status: 'active', expiresAt: row.expires_at, autoOpened: !!row.auto_opened_at });
      setExpiresAtMs(expiryMs);

      if (!row.auto_opened_at) {
        // First time this offer is ever seen — open the card once.
        setIsMinimized(false);
        void supabase
          .from('intro_offer_state')
          .update({ auto_opened_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } else {
        setIsMinimized(true);
      }

      setVisibility('active');
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ─── Track "shown" once, when the offer first becomes active ─────────
  useEffect(() => {
    if (visibility === 'active' && !shownTrackedRef.current) {
      shownTrackedRef.current = true;
      track('intro_offer_shown', { page_path: window.location.pathname });
    }
  }, [visibility]);

  // ─── Handle natural expiry (best-effort server sync) ──────────────────
  const handleExpire = useCallback(() => {
    if (expiredHandledRef.current) return;
    expiredHandledRef.current = true;

    setVisibility('none');
    writeCache({ status: 'expired', expiresAt: new Date(expiresAtMs).toISOString(), autoOpened: true });
    track('intro_offer_expired', { page_path: window.location.pathname });

    if (user) {
      void supabase.from('intro_offer_state').update({ status: 'expired' }).eq('user_id', user.id);
    }
  }, [expiresAtMs, user]);

  // ─── Countdown tick ─────────────────────────────────────────────────
  useEffect(() => {
    if (visibility !== 'active' || !expiresAtMs) return;

    const tick = () => {
      const remaining = expiresAtMs - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        handleExpire();
        return;
      }
      setTimeLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visibility, expiresAtMs, handleExpire]);

  // Pulse gift icon when minimized
  useEffect(() => {
    if (!isMinimized || visibility !== 'active') return;
    const pulse = setInterval(() => {
      setPulseGift(true);
      setTimeout(() => setPulseGift(false), 1200);
    }, 8000);
    const initial = setTimeout(() => {
      setPulseGift(true);
      setTimeout(() => setPulseGift(false), 1200);
    }, 2000);
    return () => {
      clearInterval(pulse);
      clearTimeout(initial);
    };
  }, [isMinimized, visibility]);

  const handleMinimize = () => setIsMinimized(true);
  const handleReopen = () => setIsMinimized(false);

  const handleClaim = async () => {
    await initiateCheckout({
      planName: 'premium',
      billingInterval: 'monthly',
      overrideWhopPlanId: INTRO_OFFER.whopPlanId,
      discountCode: INTRO_OFFER.promoCode,
    });
  };

  if (visibility !== 'active') return null;

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
          aria-label="Open intro offer"
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={pulseGift ? { scale: [1, 1.6, 1.8], opacity: [0.4, 0.15, 0] } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.5) 0%, transparent 70%)' }}
          />

          {/* Button — solid gold circle */}
          <motion.div
            className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
              boxShadow: '0 8px 32px rgba(201,166,70,0.4), 0 0 20px rgba(201,166,70,0.2)',
            }}
          >
            <Gift className="w-6 h-6 text-[#1a1510]" />
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
                background: 'linear-gradient(135deg, #1a1510, #0a0a0a)',
                border: '1px solid rgba(201,166,70,0.4)',
                color: '#F4D97B',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              🎁 Your welcome offer is waiting!
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
              <span className="text-white">One-time welcome offer: </span>
              <span style={{ background: 'linear-gradient(135deg, #F4D97B, #C9A646)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                30% Off Your First 3 Months
              </span>
            </h2>

            <p className="text-zinc-400 text-sm leading-relaxed mb-4 max-w-sm mx-auto">
              As a new member, this offer is applied automatically at checkout — no code needed.
            </p>

            {/* Price */}
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-6"
              style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.25)' }}
            >
              <span className="text-sm text-zinc-500 line-through">${INTRO_OFFER.fullPrice.toFixed(2)}/mo</span>
              <span className="text-lg font-mono font-bold tracking-wide" style={{ color: '#F4D97B' }}>
                ${INTRO_OFFER.introPrice.toFixed(2)}/mo for 3 months
              </span>
            </div>

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
                  Claim 30% Off — 3 Months
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
