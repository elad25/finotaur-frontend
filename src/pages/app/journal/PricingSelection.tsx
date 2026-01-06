// src/pages/app/journal/PricingSelection.tsx
// =====================================================
// FINOTAUR TOP SECRET CHECKOUT - v6.0
// =====================================================
//
// 🔥 v6.0 CHANGES:
// - REDESIGNED: Full TOP SECRET theme matching WAR ZONE landing page
// - Military-style design with exclusive intelligence positioning
// - Same functionality, new premium look
//
// 🔥 v5.1 CHANGES:
// - UPDATED: "LET ME IN" button redirects to Top Secret (not All Markets)
// - Journal purchasers go to Journal Overview
// - Platform FREE users redirected to Top Secret
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Check, Shield, Zap, TrendingUp, Tag, Clock, ArrowLeft, LogOut, Loader2, Lock, Eye, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentPopup from '@/components/PaymentPopup';
import RiskSetupModal from '@/components/onboarding/RiskSetupModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// 🔥 AFFILIATE IMPORTS
import { useAffiliateDiscount } from '@/features/affiliate/hooks/useAffiliateDiscount';

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
  trialDays?: number;
}

// Only 2 plans - Operative (trial) and Commander (no trial)
const plans: Plan[] = [
  {
    id: "basic",
    name: "Operative",
    monthlyPrice: 19.99,
    yearlyPrice: 149,
    yearlyMonthlyEquivalent: 12.42,
    description: "Essential intelligence + execution tools",
    trialDays: 14,
    features: [
      "14-day free trial",
      "Monthly macro conclusions",
      "Market bias reports",
      "Full trading journal",
      "Performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Equity curve & charts",
      "Trade screenshots & notes",
      "Email support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
    savings: "Save 38%",
  },
  {
    id: "premium",
    name: "Commander",
    monthlyPrice: 39.99,
    yearlyPrice: 299,
    yearlyMonthlyEquivalent: 24.92,
    description: "Full intelligence suite + AI analysis",
    features: [
      "Everything in Operative, plus:",
      "Deep company analysis",
      "Unlimited trades",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Backtesting system",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Unlock Commander Access",
    featured: true,
    savings: "Save 38%",
  },
];

export default function PricingSelection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');
  const [showRiskSetup, setShowRiskSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // 🔥 NEW: State for "LET ME IN" button loading
  const [skippingToApp, setSkippingToApp] = useState(false);

  // 🔥 AFFILIATE DISCOUNT HOOK
  const {
    isLoading: discountLoading,
    hasDiscount,
    discountInfo,
  } = useAffiliateDiscount(selectedPlan, billingInterval);

  // Check if user should be here OR if returning from Whop
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        console.log('❌ No user, redirecting to register');
        navigate('/auth/register');
        return;
      }

      setCheckingSubscription(true);

      try {
        // Check for Whop callback parameters
        const paymentSuccess = searchParams.get('payment') === 'success';
        const fromWhop = searchParams.get('source') === 'whop';

        const { data, error } = await supabase
          .from('profiles')
          .select(`
            account_type, 
            subscription_status, 
            onboarding_completed,
            platform_plan,
            platform_subscription_status,
            platform_bundle_journal_granted
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
          setCheckingSubscription(false);
          return;
        }

        console.log('🔍 User subscription status:', data);

        const hasRiskConfigured = data?.onboarding_completed === true;

        // If returning from Whop with successful payment
        if (paymentSuccess || fromWhop) {
          console.log('🎉 User returned from Whop payment');
          
          // Clean URL params
          window.history.replaceState({}, '', '/pricing-selection');
          
          // Check if they need to set up risk
          if (!hasRiskConfigured) {
            console.log('📊 Needs risk setup after payment');
            setShowRiskSetup(true);
            setCheckingSubscription(false);
            return;
          }
        }

        // Check for DIRECT Journal subscription
        const hasDirectJournalPlan = 
          data?.account_type && 
          ['basic', 'premium', 'admin', 'vip', 'trial'].includes(data.account_type) &&
          (data.subscription_status === 'active' || data.subscription_status === 'trial');

        // Check for Journal access via Platform PRO/Enterprise bundle
        const platformPlan = data?.platform_plan || null;
        const platformIsActive = ['active', 'trial'].includes(data?.platform_subscription_status || '');
        const hasJournalFromBundle = 
          (platformPlan === 'pro' || platformPlan === 'enterprise') && 
          platformIsActive &&
          data?.platform_bundle_journal_granted;

        const hasJournalAccess = hasDirectJournalPlan || hasJournalFromBundle;

        if (hasJournalAccess && data?.onboarding_completed) {
          console.log('✅ User has Journal access + completed onboarding → Journal Dashboard');
          navigate('/app/journal/overview');
          return;
        }

        // If has Journal access but NOT completed onboarding, show risk setup
        if (hasJournalAccess && !data?.onboarding_completed) {
          console.log('📊 Journal user needs to complete onboarding (risk setup)');
          setShowRiskSetup(true);
          setCheckingSubscription(false);
          return;
        }

        // 🔥 If user already has Platform FREE and completed onboarding, send to Top Secret
        if (platformPlan === 'free' && data?.onboarding_completed) {
          console.log('✅ User has Platform FREE + completed onboarding → Top Secret');
          navigate('/app/top-secret');
          return;
        }

        console.log('💡 User needs to select Journal plan or skip to Platform FREE');
      } catch (error) {
        console.error('❌ Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, navigate, searchParams]);

  // ═══════════════════════════════════════════════════════════════
  // 🔥 Handle "LET ME IN" - Skip to Platform FREE → Top Secret
  // Sets platform_plan='free' in database before redirecting
  // ═══════════════════════════════════════════════════════════════
  const handleSkipToApp = async () => {
    if (!user) {
      toast.error('Please log in first');
      navigate('/auth/login');
      return;
    }
    
    setSkippingToApp(true);
    
    try {
      console.log('🚀 User skipping to Platform FREE...');
      
      // Update user profile to Platform FREE
      const { error } = await supabase
        .from('profiles')
        .update({
          platform_plan: 'free',
          platform_subscription_status: 'active',
          // Mark as onboarded since they're skipping Journal (no risk setup needed)
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Error setting platform free:', error);
        toast.error('Something went wrong. Please try again.');
        setSkippingToApp(false);
        return;
      }

      console.log('✅ Platform FREE activated successfully');
      toast.success('Welcome to Finotaur! 🎉', {
        description: 'Enjoy free access to Top Secret Intelligence'
      });
      
      // 🔥 Redirect to Top Secret
      navigate('/app/top-secret');
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast.error('Something went wrong. Please try again.');
      setSkippingToApp(false);
    }
  };

  // Calculate display price with discount
  const getDisplayPrice = (plan: Plan) => {
    const originalPrice = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const monthlyEquivalent = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyMonthlyEquivalent;

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

  const handlePlanClick = (planId: string) => {
    if (planId === 'basic' || planId === 'premium') {
      setSelectedPlan(planId as PlanId);
      setShowPaymentPopup(true);
    }
  };

  const handlePlanCardClick = (planId: string) => {
    if (planId === 'basic' || planId === 'premium') {
      setSelectedPlan(planId as PlanId);
    }
  };

  // 🔥 After Risk Setup Complete → Go to Journal Overview
  const handleRiskSetupComplete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Welcome to Finotaur! 🎉');
      // 🔥 Journal purchasers go to Journal Overview
      navigate('/app/journal/overview');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup');
    }
  };

  const handlePaymentPopupClose = () => {
    setShowPaymentPopup(false);
  };

  // Loading state
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

  // If returning from Whop and need risk setup - show ONLY the modal
  if (showRiskSetup && user) {
    return (
      <div className="min-h-screen bg-black">
        <RiskSetupModal
          open={showRiskSetup}
          onClose={handleRiskSetupComplete}
          userId={user.id}
        />
      </div>
    );
  }

  return (
    <>
      {/* Payment Popup with discount info */}
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
        {/* 🔥 Top Navigation Buttons */}
        <div className="absolute top-6 left-6 right-6 flex justify-between z-20">
          {/* 🔥 Skip to App Button - Goes to Top Secret */}
          <Button
            variant="outline"
            onClick={handleSkipToApp}
            disabled={skippingToApp}
            className="flex items-center gap-2 text-[#C9A646] border-[#C9A646]/50 hover:border-[#C9A646] hover:bg-[#C9A646]/10 transition-all font-semibold px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {skippingToApp ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <ArrowLeft className="h-5 w-5" />
                <span>SKIP TO FREE ACCESS</span>
              </>
            )}
          </Button>

          {/* EXIT Button - Right */}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await logout();
                navigate('/');
              } catch (error) {
                console.error('Logout error:', error);
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-white border-white/30 hover:border-white/60 hover:bg-white/10 transition-all font-semibold px-5 py-2"
          >
            EXIT
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* TOP SECRET Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C] via-[#12110F] to-[#0A0D12]" />

        {/* Animated Grid Pattern - Military Feel */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: `
                 linear-gradient(rgba(201,166,70,0.3) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(201,166,70,0.3) 1px, transparent 1px)
               `,
               backgroundSize: '60px 60px'
             }} />

        {/* TOP SECRET Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-[#C9A646]/15 via-[#8B0000]/08 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#C9A646]/[0.06] rounded-full blur-[120px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* TOP SECRET Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#8B0000]/30 via-[#C9A646]/20 to-[#8B0000]/30 border-2 border-[#C9A646]/50 rounded-lg backdrop-blur-xl"
                 style={{
                   boxShadow: '0 0 40px rgba(139,0,0,0.3), 0 0 60px rgba(201,166,70,0.2)'
                 }}>
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <span className="text-[#C9A646] font-bold text-sm tracking-[0.3em] uppercase">Top Secret Access</span>
              <Lock className="w-5 h-5 text-[#C9A646]" />
            </div>
          </motion.div>

          {/* Section Header - TOP SECRET Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Unlock Your </span>
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Intelligence Tier
              </span>
            </h2>

            {/* Value Props Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap justify-center gap-6 mb-8"
            >
              {[
                { icon: Eye, text: "Exclusive Insights" },
                { icon: Target, text: "Clear Market Bias" },
                { icon: Shield, text: "Competitive Edge" }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08]">
                  <item.icon className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-slate-300 text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Trial-focused messaging - TOP SECRET Style */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-3xl mx-auto mb-6"
            >
              <div className="p-6 rounded-2xl relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(139,0,0,0.08) 50%, rgba(201,166,70,0.04) 100%)',
                     backdropFilter: 'blur(12px)',
                     border: '2px solid rgba(201,166,70,0.4)',
                     boxShadow: '0 0 40px rgba(201,166,70,0.2), 0 0 60px rgba(139,0,0,0.1)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent pointer-events-none" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                       style={{
                         background: 'rgba(201,166,70,0.2)',
                         border: '1px solid rgba(201,166,70,0.4)',
                         boxShadow: '0 4px 16px rgba(201,166,70,0.2)'
                       }}>
                    <Clock className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
                      14-Day Risk-Free Trial
                    </h3>
                    <p className="text-slate-300 text-lg leading-relaxed">
                      Full access to all intelligence. If it doesn't transform your trading, cancel anytime — no charge.
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
              No commitment required • Cancel anytime during trial
            </motion.p>
          </motion.div>

          {/* DISCOUNT BANNER */}
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
                  10% off {billingInterval === 'yearly' ? 'annual' : 'monthly'} plans
                </p>
              </div>
            </motion.div>
          )}

          {/* Billing Toggle */}
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
                  {hasDiscount ? 'Save 38% + 10% off' : 'Save up to 38%'}
                </span>
              </button>
            </div>
          </motion.div>

          {/* 2-column grid for 2 plans */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-8">
            {plans.map((plan, index) => {
              const displayPrice = getDisplayPrice(plan);
              const isPlanSelected = plan.id === selectedPlan;
              const showDiscountOnCard = hasDiscount;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  onClick={() => handlePlanCardClick(plan.id)}
                  className={`p-8 relative transition-all duration-300 flex flex-col rounded-2xl cursor-pointer ${
                    plan.featured ? 'md:scale-[1.05]' : ''
                  } ${isPlanSelected ? 'ring-2 ring-[#C9A646]' : ''}`}
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

                  {/* Featured Badge (Commander) */}
                  {plan.featured && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                         style={{
                           background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                           boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                           color: '#000',
                           zIndex: 50
                         }}>
                      <Target className="w-4 h-4" />
                      Top Clearance
                    </div>
                  )}

                  {/* Trial Badge (Operative only) */}
                  {plan.trialDays && !plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap bg-gradient-to-r from-[#8B0000] to-[#C9A646] text-white shadow-lg"
                         style={{
                           zIndex: 50,
                           boxShadow: '0 4px 20px rgba(139,0,0,0.4)'
                         }}>
                      <Lock className="w-4 h-4" />
                      14-Day Risk-Free
                    </div>
                  )}

                  {/* Discount Badge */}
                  {showDiscountOnCard && hasDiscount && (
                    <div className="absolute -top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {discountInfo?.discountPercent}% OFF
                    </div>
                  )}

                  {/* Savings Badge (non-discount) */}
                  {plan.savings && billingInterval === 'yearly' && !showDiscountOnCard && (
                    <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {plan.savings}
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="text-center mb-8 mt-4">
                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="flex flex-col items-center justify-center gap-1 mb-3">
                      <div className="flex items-baseline gap-1">
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
                      {displayPrice.savings && displayPrice.savings > 0 && (
                        <span className="text-sm text-emerald-400 font-semibold">
                          You save ${displayPrice.savings.toFixed(2)}!
                        </span>
                      )}
                      {plan.trialDays && (
                        <span className="text-sm text-blue-400 font-medium mt-1">
                          First 14 days free, then {displayPrice.price}{displayPrice.period}
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
                             style={{ border: '1px solid rgba(201,166,70,0.4)' }}>
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
                        : hasDiscount
                          ? 'border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-white hover:scale-[1.02]'
                          : 'border-2 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-white hover:scale-[1.02]'
                    }`}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanClick(plan.id);
                    }}
                    disabled={loading}
                    style={plan.featured ? {
                      boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                    } : {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Trust Indicators - TOP SECRET Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 space-y-6"
          >
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">Classified Security</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">14-Day Risk-Free Trial</span>
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
                    <span className="text-sm text-emerald-400">Intel discount active</span>
                  </div>
                </>
              )}
            </div>

            {/* Privacy */}
            <div className="text-center">
              <p className="text-sm text-slate-500 max-w-2xl mx-auto">
                Your intelligence stays classified. We never share your data. Cancel with one click, no questions asked.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}