// =====================================================
// JOURNAL DISCOUNT POPUP - v1.0.0
// =====================================================
// File: src/components/JournalDiscountPopup.tsx
//
// Shows a one-time 25% discount offer for Journal subscription
// after user subscribes to TOP SECRET
// =====================================================

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Check, X, Sparkles, ArrowRight, Clock,
  BarChart3, LineChart, PieChart, Zap, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useWhopCheckout } from "@/hooks/useWhopCheckout";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// TYPES
// ============================================

interface JournalDiscountPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void; // Called when user says "No thanks"
}

// ============================================
// CONSTANTS
// ============================================

const DISCOUNT_PERCENT = 25;
const ORIGINAL_PRICE = 19.99;
const DISCOUNTED_PRICE = ORIGINAL_PRICE * (1 - DISCOUNT_PERCENT / 100);

const journalFeatures = [
  { icon: BarChart3, text: 'Full performance analytics' },
  { icon: LineChart, text: 'Broker sync (12,000+ brokers)' },
  { icon: PieChart, text: 'Advanced statistics & metrics' },
  { icon: TrendingUp, text: 'Equity curve & charts' },
  { icon: Zap, text: 'Strategy builder & tracking' },
];

// ============================================
// COMPONENT
// ============================================

export default function JournalDiscountPopup({
  isOpen,
  onClose,
  onDismiss,
}: JournalDiscountPopupProps) {
  const { user } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('Journal discount checkout initiated');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  // Show confetti effect when popup opens
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ============================================
  // HANDLE CLAIM DISCOUNT
  // ============================================

  const handleClaimDiscount = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    console.log('Starting Journal discount checkout');

    onClose();

    // Store discount code in localStorage for checkout
    localStorage.setItem('journal_discount_code', 'TOPSECRET25');
    localStorage.setItem('journal_discount_percent', String(DISCOUNT_PERCENT));

    await initiateCheckout({
      planName: 'basic',
      billingInterval: 'monthly',
      discountCode: 'TOPSECRET25', // This would be configured in Whop
    });
  };

  // ============================================
  // HANDLE DISMISS
  // ============================================

  const handleDismiss = () => {
    // Store that user has seen this offer
    localStorage.setItem('journal_discount_dismissed', 'true');
    onDismiss();
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-[#0f1014] to-[#0A0A0A] border-emerald-500/30 text-white p-0 overflow-hidden">
        {/* Confetti Effect */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'][i % 4],
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                  }}
                  animate={{
                    y: ['0%', '1200%'],
                    x: [0, (Math.random() - 0.5) * 200],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        <div className="relative p-6">
          <DialogHeader className="text-center pb-4">
            {/* Gift Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex justify-center mb-4"
            >
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #10B981 100%)',
                  boxShadow: '0 4px 30px rgba(16,185,129,0.5)'
                }}
              >
                <Sparkles className="w-10 h-10 text-white" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-lg">
                  {DISCOUNT_PERCENT}%
                </div>
              </div>
            </motion.div>

            <DialogTitle className="text-2xl font-bold">
              <span className="text-white">Special </span>
              <span className="text-emerald-400">One-Time Offer!</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              As a Top Secret subscriber, you get exclusive access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Discount Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/10 border border-emerald-500/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 font-semibold text-lg">Trading Journal</p>
                  <p className="text-sm text-slate-400">Track, analyze, improve</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 line-through text-sm">${ORIGINAL_PRICE}/mo</p>
                  <p className="text-2xl font-bold text-emerald-400">${DISCOUNTED_PRICE.toFixed(2)}<span className="text-sm text-slate-400">/mo</span></p>
                </div>
              </div>
            </motion.div>

            {/* Urgency Message */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Clock className="w-5 h-5 text-yellow-400" />
              <p className="text-sm text-yellow-400/90">
                <span className="font-semibold">One-time offer</span> - This discount won't appear again
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <p className="text-sm text-slate-400 font-medium">What you'll get:</p>
              {journalFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-300">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleClaimDiscount}
                disabled={isLoading || !user}
                className="w-full py-5 text-base font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #10B981 100%)',
                  backgroundSize: '200% auto',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(16,185,129,0.4)'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Claim 25% Discount
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <button
                onClick={handleDismiss}
                className="w-full py-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                No thanks, maybe later
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-600">
              Discount applies to first month only. Regular price of ${ORIGINAL_PRICE}/month after.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
