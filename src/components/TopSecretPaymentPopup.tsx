// =====================================================
// TOP SECRET PAYMENT POPUP - v1.0.0
// =====================================================
// File: src/components/TopSecretPaymentPopup.tsx
//
// Post-signup checkout popup for TOP SECRET subscription
// - Shows 14-day trial badge
// - Monthly ($35) or Yearly ($300) options
// - Premium design matching TOP SECRET branding
// =====================================================

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Shield, Lock, CreditCard, Clock, Crown,
  Check, ArrowRight, Sparkles, Mail
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useWhopCheckout } from "@/hooks/useWhopCheckout";
import { motion } from "framer-motion";

// ============================================
// TYPES
// ============================================

interface TopSecretPaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type BillingInterval = 'monthly' | 'yearly';

// ============================================
// PLAN DETAILS
// ============================================

const planDetails = {
  monthly: {
    price: 35,
    period: '/month',
    label: 'Monthly',
  },
  yearly: {
    price: 300,
    period: '/year',
    monthlyEquivalent: 25,
    label: 'Yearly',
    savings: 120,
  }
};

const features = [
  'Monthly ISM Manufacturing Report',
  '2x Company Deep Dive Reports',
  '2x Crypto Market Reports',
  'PDF Downloads & Archive Access',
  'Discord Community Access',
  'Email Delivery',
];

// ============================================
// COMPONENT
// ============================================

export default function TopSecretPaymentPopup({
  isOpen,
  onClose,
}: TopSecretPaymentPopupProps) {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('TOP Secret checkout initiated');
    },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  const selectedPlan = planDetails[billingInterval];
  const isYearly = billingInterval === 'yearly';

  // ============================================
  // HANDLE PAYMENT
  // ============================================

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    console.log('Starting TOP SECRET checkout:', {
      billingInterval,
      userEmail: user.email,
    });

    onClose();

    await initiateCheckout({
      planName: 'top_secret',
      billingInterval,
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#0A0A0A] border-[#C9A646]/30 text-white p-0 overflow-hidden">
        {/* Golden Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#C9A646]/10 to-transparent pointer-events-none" />

        <div className="relative p-6">
          <DialogHeader className="text-center pb-4">
            {/* Crown Badge */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.5)'
                }}
              >
                <Crown className="w-8 h-8 text-black" />
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Top Secret
              </span>
              <span className="text-white"> Intelligence</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Premium market intelligence delivered to your inbox
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* 14-Day Trial Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-blue-400 font-semibold">
                  14-Day Free Trial
                </div>
                <p className="text-xs text-blue-400/70">
                  No charge today. Cancel anytime during trial.
                </p>
              </div>
            </motion.div>

            {/* Email Notification Badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30">
              <Mail className="w-5 h-5 text-[#C9A646]" />
              <p className="text-sm text-[#C9A646]/90">
                You'll receive a welcome email with your first report alert
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center">
              <div
                className="inline-flex p-1.5 rounded-xl"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                    billingInterval === 'monthly'
                      ? 'text-black'
                      : 'text-slate-500 hover:text-white'
                  }`}
                  style={billingInterval === 'monthly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 4px 15px rgba(201,166,70,0.4)'
                  } : {}}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`relative px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                    billingInterval === 'yearly'
                      ? 'text-black'
                      : 'text-slate-500 hover:text-white'
                  }`}
                  style={billingInterval === 'yearly' ? {
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    boxShadow: '0 4px 15px rgba(201,166,70,0.4)'
                  } : {}}
                >
                  Yearly
                  {billingInterval === 'yearly' && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                      Save $120
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Price Display */}
            <div className="text-center py-2">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
                  ${selectedPlan.price}
                </span>
                <span className="text-xl text-slate-500">{selectedPlan.period}</span>
              </div>
              {isYearly && (
                <p className="text-emerald-400 font-semibold mt-1">
                  Just $25/month - Save $120!
                </p>
              )}
              <p className="text-sm text-blue-400 mt-2">
                First 14 days free, then ${selectedPlan.price}{selectedPlan.period}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(201,166,70,0.15)',
                      border: '1px solid rgba(201,166,70,0.3)'
                    }}
                  >
                    <Check className="w-3 h-3 text-[#C9A646]" />
                  </div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Security Features */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="w-4 h-4 text-[#C9A646]" />
                <span>Secure payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-[#C9A646]" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CreditCard className="w-4 h-4 text-[#C9A646]" />
                <span>Powered by Whop</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>No charge today</span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handlePayment}
              disabled={isLoading || !user}
              className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                color: '#000',
                boxShadow: '0 8px 32px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Redirecting to checkout...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>

            <p className="text-[10px] text-center text-slate-500">
              By starting your trial, you agree to our Terms of Service.
              You won't be charged until after your 14-day trial ends.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
