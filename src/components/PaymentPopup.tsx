// =====================================================
// FINOTAUR PAYMENT POPUP - WHOP INTEGRATION v3.0.0
// =====================================================
// Place in: src/components/PaymentPopup.tsx
// 
// 🔥 v3.0.0 CHANGES:
// - Added trial support for Basic plan (14-day trial)
// - Premium has no trial (payment from day 0)
// - Updated messaging for trial vs immediate payment
// =====================================================

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Lock, CreditCard, Tag, Sparkles, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useWhopCheckout } from "@/hooks/useWhopCheckout";
import type { PlanName, BillingInterval } from "@/lib/whop-config";

// ============================================
// TYPES
// ============================================

interface DiscountInfo {
  code: string;
  discountPercent: number;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  affiliateName?: string;
}

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'basic' | 'premium';
  billingInterval: 'monthly' | 'yearly';
  discountInfo?: DiscountInfo | null;
}

// ============================================
// PLAN DETAILS - 🔥 UPDATED WITH TRIAL INFO
// ============================================

const planDetails = {
  basic: {
    name: 'Basic',
    monthlyPrice: 19.99,
    yearlyPrice: 149,
    yearlyMonthlyEquivalent: 12.42,
    maxTrades: 25,
    trialDays: 14,  // 🔥 14-day trial
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 39.99,
    yearlyPrice: 299,
    yearlyMonthlyEquivalent: 24.92,
    maxTrades: 'Unlimited',
    trialDays: 0,   // 🔥 No trial
  }
};

// ============================================
// COMPONENT
// ============================================

export default function PaymentPopup({ 
  isOpen, 
  onClose, 
  planId, 
  billingInterval,
  discountInfo
}: PaymentPopupProps) {
  const { user } = useAuth();
  
  const { initiateCheckout, isLoading } = useWhopCheckout({
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  const plan = planDetails[planId];
  const hasTrial = plan.trialDays > 0;
  
  // ============================================
  // PRICE CALCULATION
  // ============================================
  
  // Original price (before any discount)
  const originalPrice = discountInfo?.originalPrice ?? 
    (billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice);

  // Monthly equivalent for display purposes
  const monthlyEquivalent = billingInterval === 'monthly' 
    ? plan.monthlyPrice 
    : plan.yearlyMonthlyEquivalent;

  // Check if discount applies
  const hasDiscount = discountInfo && discountInfo.savings > 0;
  
  // Final price after discount
  const finalPrice = hasDiscount ? discountInfo.discountedPrice : originalPrice;
  
  // Savings amount
  const savings = hasDiscount ? discountInfo.savings : 0;

  // ============================================
  // HANDLE PAYMENT
  // ============================================
  
  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    console.log('💳 Starting Whop checkout:', {
      planId,
      billingInterval,
      originalPrice,
      finalPrice,
      discountCode: discountInfo?.code,
      hasDiscount,
      hasTrial,
      userEmail: user.email,
    });

    // Close popup and redirect to Whop
    onClose();
    
    await initiateCheckout({
      planName: planId as PlanName,
      billingInterval: billingInterval as BillingInterval,
      discountCode: discountInfo?.code,
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {hasTrial ? 'Start Your Free Trial' : `Subscribe to ${plan.name}`}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {hasTrial 
              ? `Try ${plan.name} free for ${plan.trialDays} days` 
              : 'Complete your payment'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 🔥 TRIAL BADGE - Only for Basic */}
          {hasTrial && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Clock className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <div className="text-blue-400 font-semibold">
                  {plan.trialDays}-Day Free Trial
                </div>
                <p className="text-xs text-blue-400/70">
                  No charge today. Cancel anytime during trial.
                </p>
              </div>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && discountInfo && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">
                    {discountInfo.discountPercent}% OFF Applied!
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    {discountInfo.code}
                  </span>
                </div>
                {discountInfo.affiliateName && (
                  <p className="text-xs text-emerald-400/70 mt-0.5">
                    Referred by {discountInfo.affiliateName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Plan Summary */}
          <div className={`p-4 rounded-lg border ${
            hasTrial
              ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-blue-500/30'
              : hasDiscount 
                ? 'bg-gradient-to-r from-emerald-500/10 to-yellow-500/5 border-emerald-500/30'
                : 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-300">Plan</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-300">Billing</span>
              <span className="font-semibold capitalize">{billingInterval}</span>
            </div>
            
            {/* 🔥 Trial-specific pricing display */}
            {hasTrial ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-300">Today's charge</span>
                  <span className="font-semibold text-blue-400">$0.00</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-300">After trial</span>
                  <div className="text-right">
                    {hasDiscount ? (
                      <>
                        <span className="text-zinc-500 line-through text-sm mr-2">
                          ${originalPrice.toFixed(2)}
                        </span>
                        <span className="font-semibold text-emerald-400">
                          ${finalPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold">
                        ${finalPrice.toFixed(2)}/{billingInterval === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-300">Price</span>
                  <div className="text-right">
                    {hasDiscount ? (
                      <>
                        <span className="text-zinc-500 line-through text-sm mr-2">
                          ${originalPrice.toFixed(2)}
                        </span>
                        <span className="font-semibold text-emerald-400">
                          ${finalPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold">
                        ${monthlyEquivalent.toFixed(2)}/month
                        {billingInterval === 'yearly' && (
                          <span className="text-xs text-zinc-400 ml-1">
                            (${originalPrice}/year)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Savings highlight */}
            {hasDiscount && savings > 0 && (
              <div className="flex justify-between items-center mb-2 text-emerald-400">
                <span>You save</span>
                <span className="font-semibold">-${savings.toFixed(2)}</span>
              </div>
            )}
            
            <div className="pt-2 border-t border-white/10 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-300">{hasTrial ? 'Due today' : 'Total'}</span>
                <span className={`text-2xl font-bold ${
                  hasTrial 
                    ? 'text-blue-400' 
                    : hasDiscount 
                      ? 'text-emerald-400' 
                      : 'text-yellow-500'
                }`}>
                  {hasTrial ? '$0.00' : `$${finalPrice.toFixed(2)}`}
                </span>
              </div>
              {billingInterval === 'yearly' && !hasTrial && (
                <p className="text-xs text-zinc-500 text-right mt-1">
                  Billed annually
                </p>
              )}
              {hasTrial && (
                <p className="text-xs text-blue-400/70 text-right mt-1">
                  First charge: ${finalPrice.toFixed(2)} after {plan.trialDays} days
                </p>
              )}
            </div>
          </div>

          {/* Security Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-5 h-5 text-yellow-500" />
              <span className="text-zinc-300">Bank-grade encryption</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Lock className="w-5 h-5 text-yellow-500" />
              <span className="text-zinc-300">Secure payment via Whop</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-5 h-5 text-yellow-500" />
              <span className="text-zinc-300">Cancel anytime, no questions asked</span>
            </div>
            {hasTrial && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400">No charge during {plan.trialDays}-day trial</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400">Discount will be applied at checkout</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 border-zinc-700 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isLoading || !user}
              className={`flex-1 font-bold ${
                hasTrial
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                  : hasDiscount
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 border-2 ${
                    hasTrial || hasDiscount 
                      ? 'border-white/30 border-t-white' 
                      : 'border-black/30 border-t-black'
                  } rounded-full animate-spin`}></div>
                  Redirecting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {hasTrial ? 'Start Free Trial' : 'Complete Payment'}
                  <ExternalLink className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-zinc-500">
            {hasTrial 
              ? `By starting your trial, you agree to our Terms of Service. You won't be charged until after your ${plan.trialDays}-day trial ends.`
              : 'By subscribing, you agree to our Terms of Service and Privacy Policy.'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}