// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR PRICING SELECTION - WITH AFFILIATE DISCOUNTS
// =====================================================
// 
// Version: 2.2 - Updated discount display text
// - Annual discount: 10% (was 15%)
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Check, Shield, Zap, TrendingUp, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentPopup from '@/components/PaymentPopup';
import RiskSetupModal from '@/components/onboarding/RiskSetupModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// 🔥 AFFILIATE IMPORTS
import { useAffiliateDiscount } from '@/features/affiliate/hooks/useAffiliateDiscount';
import CouponInput from '@/features/affiliate/components/CouponInput';

type BillingInterval = 'monthly' | 'yearly';
type PlanId = 'basic' | 'premium';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  savings?: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    description: "Perfect for trying Finotaur",
    features: [
      "10 manual trades (lifetime)",
      "Basic trade journal",
      "Manual trade entry only",
      "Core performance metrics",
      "Community access",
      "Mobile app access"
    ],
    cta: "Start Free",
    featured: false
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 19.99,
    yearlyPrice: 149,
    yearlyMonthlyEquivalent: 12.42,
    description: "Essential tools + automatic broker sync",
    features: [
      "Everything in Free, plus:",
      "Broker sync (12,000+ brokers)",
      "25 trades/month (manual + auto-sync)",
      "Full performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Advanced statistics & metrics",
      "Equity curve & charts",
      "Trade screenshots & notes",
      "Email support"
    ],
    cta: "Get Basic",
    featured: false,
    savings: "Save 38%"
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 39.99,
    yearlyPrice: 299,
    yearlyMonthlyEquivalent: 24.92,
    description: "Unlimited everything + AI intelligence",
    features: [
      "Everything in Basic, plus:",
      "Unlimited trades (manual + auto-sync)",
      "No data limits — sync freely",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Priority support",
      "Early access to new features"
    ],
    cta: "Get Premium",
    featured: true,
    savings: "Save 38%"
  }
];

export default function PricingSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');
  const [showRiskSetup, setShowRiskSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // 🔥 AFFILIATE DISCOUNT HOOK
  const {
    isLoading: discountLoading,
    isValidating,
    error: discountError,
    hasDiscount,
    discountInfo,
    manualCode,
    setManualCode,
    applyCode,
    removeCode,
    validatedCode,
    discountPercent,
    savings,
  } = useAffiliateDiscount(selectedPlan, billingInterval);

  // 🔥 Check if user should be here
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        console.log('❌ No user, redirecting to register');
        navigate('/auth/register');
        return;
      }

      setCheckingSubscription(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
          setCheckingSubscription(false);
          return;
        }

        console.log('🔍 User subscription status:', data);

        // If already has active subscription AND completed onboarding, go to dashboard
        const hasPaidSubscription = 
          data?.account_type && 
          data.account_type !== 'free' &&
          (data.subscription_status === 'active' || data.subscription_status === 'trial');

        if (hasPaidSubscription && data?.onboarding_completed) {
          console.log('✅ User has paid subscription + completed onboarding → Dashboard');
          navigate('/app/journal/overview');
          return;
        }

        // If has free account AND completed onboarding, also go to dashboard
        if (data?.account_type === 'free' && data?.onboarding_completed) {
          console.log('✅ User has free account + completed onboarding → Dashboard');
          navigate('/app/journal/overview');
          return;
        }

        console.log('💡 User needs to select plan');
      } catch (error) {
        console.error('❌ Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, navigate]);

  // 🔥 Calculate display price with discount
  const getDisplayPrice = (plan: Plan) => {
    if (plan.id === "free") {
      return { price: "$0", period: "forever", discountedPrice: null };
    }

    const originalPrice = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const monthlyEquivalent = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyMonthlyEquivalent;

    // Check if this plan has a discount applied
    const isPlanSelected = plan.id === selectedPlan;
    const showDiscount = hasDiscount && isPlanSelected;

    if (showDiscount && discountInfo) {
      return {
        price: `$${monthlyEquivalent.toFixed(2)}`,
        originalPrice: `$${originalPrice.toFixed(2)}`,
        discountedPrice: `$${discountInfo.discountedPrice.toFixed(2)}`,
        period: "/month",
        billedAs: billingInterval === 'yearly' ? `Billed $${discountInfo.discountedPrice.toFixed(2)}/year` : undefined,
        savings: discountInfo.savings,
        discountPercent: discountInfo.discountPercent,
      };
    }

    return { 
      price: `$${monthlyEquivalent.toFixed(2)}`, 
      period: "/month",
      billedAs: billingInterval === 'yearly' ? `Billed $${originalPrice}/year` : undefined,
      discountedPrice: null,
    };
  };

  // Handle plan selection
  const handlePlanClick = (planId: string) => {
    if (planId === 'free') {
      handleSelectFreePlan();
    } else if (planId === 'basic' || planId === 'premium') {
      setSelectedPlan(planId as PlanId);
      setShowPaymentPopup(true);
    }
  };

  // Handle plan card click (for highlighting)
  const handlePlanCardClick = (planId: string) => {
    if (planId === 'basic' || planId === 'premium') {
      setSelectedPlan(planId as PlanId);
    }
  };

  // Handle Free plan selection
  const handleSelectFreePlan = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('⏭️ User selected Free plan');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          account_type: 'free',
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show Risk Setup Modal after selecting Free
      setShowRiskSetup(true);
    } catch (error: any) {
      console.error('❌ Error setting free plan:', error);
      toast.error('Failed to continue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Risk Setup completion
  const handleRiskSetupComplete = async () => {
    if (!user) return;

    try {
      // Mark onboarding as completed
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Welcome to Finotaur! 🎉');
      navigate('/app/journal/overview');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup');
    }
  };

  // Handle payment popup close
  const handlePaymentPopupClose = () => {
    setShowPaymentPopup(false);
  };

  if (checkingSubscription || discountLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Risk Setup Modal */}
      {showRiskSetup && user && (
        <RiskSetupModal
          open={showRiskSetup}
          onClose={handleRiskSetupComplete}
          userId={user.id}
        />
      )}

      {/* Payment Popup - 🔥 NOW WITH DISCOUNT INFO */}
      {showPaymentPopup && (
        <PaymentPopup
          isOpen={showPaymentPopup}
          onClose={handlePaymentPopupClose}
          planId={selectedPlan}
          billingInterval={billingInterval}
          discountInfo={hasDiscount ? discountInfo : undefined}
        />
      )}

      <section className="min-h-screen py-24 px-4 relative overflow-hidden bg-black">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#1E1B16] to-[#0B0B0B]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/12 rounded-full blur-[160px]" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Choose Your </span>
              <span className="text-[#C9A646]">Power Tier</span>
            </h2>
            
            {/* Guarantee Copy */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-4xl mx-auto mb-6"
            >
              <div className="p-6 rounded-2xl relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)',
                     backdropFilter: 'blur(12px)',
                     border: '2px solid rgba(201,166,70,0.4)',
                     boxShadow: '0 0 40px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent pointer-events-none" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                       style={{
                         background: 'rgba(201,166,70,0.2)',
                         border: '1px solid rgba(201,166,70,0.4)',
                         boxShadow: '0 4px 16px rgba(201,166,70,0.2)'
                       }}>
                    <Shield className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
                      Start free — 10 manual trades
                    </h3>
                    <p className="text-slate-300 text-lg leading-relaxed">
                      If Finotaur doesn't show a pattern that's hurting you within 10 trades, don't upgrade.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-slate-400"
            >
              No credit card required • Cancel anytime
            </motion.p>
          </motion.div>

          {/* 🔥 COUPON INPUT SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="max-w-md mx-auto mb-8"
          >
            <CouponInput
              manualCode={manualCode}
              setManualCode={setManualCode}
              onApply={applyCode}
              onRemove={removeCode}
              isValidating={isValidating}
              error={discountError}
              validatedCode={validatedCode}
              discountPercent={discountPercent}
              savings={savings}
            />
          </motion.div>

          {/* 🔥 DISCOUNT BANNER - Shows when discount is active */}
          {/* 🔥 v2.2: Changed 15% to 10% for annual plans */}
          {hasDiscount && discountInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">
                    {discountInfo.discountPercent}% Discount Applied!
                  </span>
                </div>
                <p className="text-emerald-400/80 text-sm">
                  {discountInfo.affiliateName 
                    ? `Referred by ${discountInfo.affiliateName}` 
                    : `Code: ${discountInfo.code}`
                  }
                  {' • '}
                  {/* 🔥 v2.2: Both monthly and yearly are now 10% */}
                  10% off {billingInterval === 'yearly' ? 'annual' : 'monthly'} plans
                </p>
              </div>
            </motion.div>
          )}

          {/* Billing Toggle */}
          {/* 🔥 v2.2: Changed 15% to 10% in toggle text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center mb-16"
          >
            <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5 shadow-xl">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                  billingInterval === 'monthly'
                    ? 'bg-primary text-black shadow-lg shadow-primary/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
                {hasDiscount && <span className="ml-1 text-xs opacity-75">(10% off)</span>}
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingInterval === 'yearly'
                    ? 'bg-primary text-black shadow-lg shadow-primary/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                  {/* 🔥 v2.2: Changed from "Save 38% + 15% off" to "Save 38% + 10% off" */}
                  {hasDiscount ? 'Save 38% + 10% off' : 'Save up to 38%'}
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-8">
            {plans.map((plan, index) => {
              const displayPrice = getDisplayPrice(plan);
              const isPlanSelected = plan.id === selectedPlan;
              const showDiscountOnCard = hasDiscount && (plan.id === 'basic' || plan.id === 'premium');
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  onClick={() => handlePlanCardClick(plan.id)}
                  className={`p-8 relative transition-all duration-300 flex flex-col rounded-2xl cursor-pointer ${
                    plan.featured 
                      ? 'md:scale-[1.08]' 
                      : ''
                  } ${
                    isPlanSelected && plan.id !== 'free'
                      ? 'ring-2 ring-[#C9A646]'
                      : ''
                  }`}
                  style={{
                    background: plan.featured 
                      ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: plan.featured 
                      ? '2px solid rgba(201,166,70,0.6)' 
                      : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: plan.featured
                      ? '0 12px 50px rgba(201,166,70,0.5), 0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.15)'
                      : '0 6px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                  }}
                >
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                       style={{
                         background: plan.featured
                           ? 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.2), transparent 60%)'
                           : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%)'
                       }} />
                  
                  {/* Shine Effect */}
                  <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                       style={{
                         background: plan.featured
                           ? 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)'
                           : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
                       }} />

                  {/* Featured Badge */}
                  {plan.featured && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                         style={{
                           background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                           boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                           color: '#000',
                           zIndex: 50
                         }}>
                      <TrendingUp className="w-4 h-4" />
                      Most Popular
                    </div>
                  )}

                  {/* 🔥 Discount Badge */}
                  {showDiscountOnCard && hasDiscount && (
                    <div className="absolute -top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {discountInfo?.discountPercent}% OFF
                    </div>
                  )}

                  {/* Savings Badge (non-discount) */}
                  {plan.savings && billingInterval === 'yearly' && !plan.featured && !showDiscountOnCard && (
                    <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {plan.savings}
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="flex flex-col items-center justify-center gap-1 mb-3">
                      <div className="flex items-baseline gap-1">
                        {/* Show original price with strikethrough if discount */}
                        {displayPrice.discountedPrice && (
                          <span className="text-2xl text-zinc-500 line-through mr-2">
                            {displayPrice.originalPrice}
                          </span>
                        )}
                        <span className={`text-5xl font-bold ${
                          displayPrice.discountedPrice 
                            ? 'text-emerald-400' 
                            : plan.featured 
                              ? 'text-[#C9A646]' 
                              : 'text-white'
                        }`}>
                          {displayPrice.discountedPrice || displayPrice.price}
                        </span>
                        <span className="text-slate-400">{displayPrice.period}</span>
                      </div>
                      {displayPrice.billedAs && (
                        <span className="text-sm text-slate-500">{displayPrice.billedAs}</span>
                      )}
                      {/* Show savings amount */}
                      {displayPrice.savings && displayPrice.savings > 0 && (
                        <span className="text-sm text-emerald-400 font-semibold">
                          You save ${displayPrice.savings.toFixed(2)}!
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400">{plan.description}</p>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${
                          plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                        } flex items-center justify-center shrink-0 mt-0.5`}
                             style={{
                               border: '1px solid rgba(201,166,70,0.4)'
                             }}>
                          <Check className="h-3 w-3 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button 
                    variant={plan.featured ? "default" : "outline"} 
                    className={`w-full ${
                      plan.featured 
                        ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black font-bold transition-all duration-500 hover:scale-[1.02]' 
                        : hasDiscount && plan.id !== 'free'
                          ? 'border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-white hover:scale-[1.02]'
                          : 'border-2 border-[#C9A646]/40 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white hover:scale-[1.02]'
                    }`}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanClick(plan.id);
                    }}
                    disabled={loading && plan.id === 'free'}
                    style={plan.featured ? {
                      boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                    } : {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading && plan.id === 'free' ? 'Loading...' : plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 space-y-6"
          >
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">Bank-grade security</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">No credit card required</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">Cancel anytime</span>
              </div>
              {hasDiscount && (
                <>
                  <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Referral discount active</span>
                  </div>
                </>
              )}
            </div>

            {/* Privacy */}
            <div className="text-center">
              <p className="text-sm text-slate-500 max-w-2xl mx-auto">
                Your data stays yours. We never sell your information. Cancel with one click, no questions asked.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}