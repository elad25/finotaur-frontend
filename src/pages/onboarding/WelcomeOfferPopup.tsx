// src/pages/onboarding/WelcomeOfferPopup.tsx
// =====================================================
// 🔥 OTO (One Time Offer) — Welcome Offer Pop-up
// Shows AFTER walkthrough completes
// $89/mo locked rate (vs $109 standard) — 15 min countdown
// Single monthly option only (no yearly confusion)
// =====================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Clock, Shield, Check, ArrowRight, X,
  Lock, Gift, Zap, Crown, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

// =====================================================
// CONFIGURATION
// =====================================================
const OFFER_PRICE = 89;
const STANDARD_PRICE = 109;
const SAVINGS_MONTHLY = STANDARD_PRICE - OFFER_PRICE; // $20
const SAVINGS_YEARLY = SAVINGS_MONTHLY * 12; // $240
const COUNTDOWN_MINUTES = 15;

// =====================================================
// PROPS
// =====================================================
interface WelcomeOfferPopupProps {
  onDismiss: () => void;
  userId?: string;
}

// =====================================================
// COUNTDOWN HOOK
// =====================================================
function useCountdown(minutes: number) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          expiredRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return {
    minutes: mins,
    seconds: secs,
    expired: timeLeft === 0,
    display: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
  };
}

// =====================================================
// COMPONENT
// =====================================================
export default function WelcomeOfferPopup({ onDismiss, userId }: WelcomeOfferPopupProps) {
  const navigate = useNavigate();
  const countdown = useCountdown(COUNTDOWN_MINUTES);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('Welcome offer checkout initiated');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    },
  });

  // =====================================================
  // Handle offer expired
  // =====================================================
  useEffect(() => {
    if (countdown.expired) {
      toast.info('Welcome offer has expired', {
        description: 'You can still subscribe at the standard price.',
      });
      // Don't auto-dismiss — let user decide
    }
  }, [countdown.expired]);

  // =====================================================
  // Handle claim offer
  // =====================================================
  const handleClaimOffer = async () => {
    if (countdown.expired) {
      toast.error('This offer has expired');
      return;
    }

    // Mark that user saw the OTO
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // Initiate checkout with the welcome offer plan
    // NOTE: You'll need to create a $89/mo plan in Whop and replace this plan name
    await initiateCheckout({
      planName: 'finotaur_welcome' as any,
      billingInterval: 'monthly',
    });
  };

  // =====================================================
  // Handle standard pricing
  // =====================================================
  const handleStandardPricing = async () => {
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    navigate('/app');
  };

  // =====================================================
  // Handle close attempt
  // =====================================================
  const handleClose = () => {
    if (!showConfirmClose) {
      setShowConfirmClose(true);
      return;
    }
    onDismiss();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.88)' }}
        />

        {/* Pop-up Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-lg"
        >
          {/* Outer glow */}
          <div
            className="absolute -inset-[3px] rounded-3xl opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(244,217,123,0.5) 0%, rgba(201,166,70,0.15) 30%, transparent 50%, rgba(201,166,70,0.15) 70%, rgba(244,217,123,0.5) 100%)',
              filter: 'blur(15px)',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />

          {/* Card */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(32,28,20,0.99) 0%, rgba(15,13,10,1) 100%)',
              border: '1.5px solid rgba(201,166,70,0.4)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.1)',
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-[10%] right-[10%] h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.8), transparent)' }}
            />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-white/5 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
            </button>

            <div className="px-6 sm:px-8 pt-7 pb-8">
              {/* ========== HEADER ========== */}
              <div className="text-center mb-6">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.08) 100%)',
                    border: '1px solid rgba(201,166,70,0.35)',
                  }}
                >
                  <Gift className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-[#C9A646] text-sm font-bold">Welcome Offer — New Members Only</span>
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Get Finotaur for{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ${OFFER_PRICE}/month
                  </span>
                </h2>

                <p className="text-slate-400 text-sm">
                  Instead of <span className="text-slate-300 line-through">${STANDARD_PRICE}/month</span>
                  {' '}— <span className="text-emerald-400 font-semibold">Locked for as long as you stay subscribed</span>
                </p>
              </div>

              {/* ========== COUNTDOWN ========== */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl mb-6"
                style={{
                  background: countdown.expired
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(201,166,70,0.08)',
                  border: countdown.expired
                    ? '1px solid rgba(239,68,68,0.25)'
                    : '1px solid rgba(201,166,70,0.2)',
                }}
              >
                <Clock className={`w-4 h-4 ${countdown.expired ? 'text-red-400' : 'text-[#C9A646]'}`} />
                {countdown.expired ? (
                  <span className="text-red-400 text-sm font-semibold">Offer Expired</span>
                ) : (
                  <>
                    <span className="text-slate-400 text-sm">This offer expires in</span>
                    <span
                      className="text-lg font-bold font-mono"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {countdown.display}
                    </span>
                  </>
                )}
              </motion.div>

              {/* ========== WHAT YOU GET ========== */}
              <div className="space-y-2.5 mb-6">
                {[
                  'Full AI Trading Desk — Stock Analyzer, Flow Scanner, Sector Analysis',
                  'War Zone + Top Secret — Daily & premium reports',
                  'Journal Premium — Auto-sync with 12,000+ brokers',
                  'Options Intelligence AI — Real-time flow analysis',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-2.5"
                  >
                    <Check className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* ========== SAVINGS HIGHLIGHT ========== */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg mb-6"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">
                  Save ${SAVINGS_MONTHLY}/month = ${SAVINGS_YEARLY}/year
                </span>
              </motion.div>

              {/* ========== CTA BUTTON ========== */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                onClick={handleClaimOffer}
                disabled={isLoading || countdown.expired}
                className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: countdown.expired
                    ? 'rgba(100,100,100,0.3)'
                    : 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: countdown.expired ? 'rgba(255,255,255,0.3)' : '#000',
                  boxShadow: countdown.expired
                    ? 'none'
                    : '0 8px 32px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : countdown.expired ? (
                  'Offer Expired'
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Claim My ${OFFER_PRICE}/month Rate
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {/* ========== SECONDARY OPTION ========== */}
              <button
                onClick={handleStandardPricing}
                className="w-full mt-3 py-2 text-center text-slate-500 hover:text-slate-400 text-sm transition-colors"
              >
                {countdown.expired
                  ? 'Continue to platform →'
                  : `or continue with standard pricing ($${STANDARD_PRICE}/month)`
                }
              </button>

              {/* ========== TRUST BADGES ========== */}
              <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Shield className="w-3 h-3" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Lock className="w-3 h-3" />
                  <span>Rate locked forever</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== CONFIRM CLOSE MINI-POPUP ========== */}
          <AnimatePresence>
            {showConfirmClose && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm"
              >
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: 'rgba(20,18,14,0.98)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                  }}
                >
                  <p className="text-white text-sm font-semibold mb-1">Are you sure?</p>
                  <p className="text-slate-400 text-xs mb-3">
                    This offer won't be available again.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmClose(false)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        color: '#000',
                      }}
                    >
                      Keep My Offer
                    </button>
                    <button
                      onClick={onDismiss}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      Leave Anyway
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}