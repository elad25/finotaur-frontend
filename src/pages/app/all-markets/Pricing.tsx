// src/pages/app/all-markets/Pricing.tsx
// =====================================================
// FINOTAUR PLATFORM PRICING - v2.0.0
// =====================================================
// 
// Design based on JournalSettings UpgradePlanModal
// Premium glass-morphism cards with gold accents
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Check, Shield, Zap, Clock, TrendingUp, Gift, X, AlertTriangle, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';


// ============================================
// TYPES
// ============================================

type BillingInterval = 'monthly' | 'yearly';
type PlatformPlanId = 'free' | 'core' | 'finotaur' | 'enterprise';

interface PlanConfig {
  id: PlatformPlanId;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthlyEquivalent: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  savings?: string;
  trialDays: number;
  trialOnceOnly?: boolean;
  includesJournal?: boolean;
  includesNewsletter?: boolean;
}

// ============================================
// PLAN CONFIGURATIONS
// ============================================

const plans: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    yearlyMonthlyEquivalent: '$0',
    description: 'Basic market access',
    trialDays: 0,
    features: [
      'All Markets dashboard',
      'Stock Analyzer (3 analyses/day)',
      'Trading Journal — 15 trades free',
      'Basic market data',
      'Limited watchlists (5 items)',
      '3 price alerts',
      'Community access',
    ],
    cta: 'Free Plan',
    featured: false,
  },
  {
    id: 'core',
    name: 'Core',
    monthlyPrice: '$59',
    yearlyPrice: '$590',
    yearlyMonthlyEquivalent: '$49',
    description: 'Full market intelligence',
    trialDays: 14,
    trialOnceOnly: false,
    features: [
      'Everything in Free, plus:',
      'Stock Analyzer (5 analyses/day)',
      'Sector Analyzer (3 sectors/month)',
      'Flow Scanner',
      'AI Assistant',
      '🎁 Journal Basic (25 trades/month)',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Priority email support',
    ],
    cta: 'Start 14-Day Trial',
    featured: false,
    savings: 'Save 17%',
  },
  {
    id: 'finotaur',
    name: 'Finotaur',
    monthlyPrice: '$109',
    yearlyPrice: '$1,090',
    yearlyMonthlyEquivalent: '$91',
    description: 'Complete trading ecosystem',
    trialDays: 14,
    trialOnceOnly: false,
    includesJournal: true,
    includesNewsletter: true,
    features: [
      'Everything in Core, plus:',
      'Stock Analyzer (7 analyses/day)',
      'Sector Analyzer (unlimited)',
      'Options Intelligence AI',
      'Macro Analyzer',
      'AI Scanner',
      '🎁 Journal Premium INCLUDED',
      '🎁 War Zone + Top Secret Reports',
      'Priority 24h support',
    ],
    cta: 'Start 14-Day Trial',
    featured: true,
    savings: 'Save 17%',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: '$500',
    yearlyPrice: '$500',
    yearlyMonthlyEquivalent: '$500',
    description: 'Ultimate trading solution',
    trialDays: 0,
    features: [
      'Everything in Finotaur, plus:',
      'Unlimited Stock Analyses',
      'My Portfolio (exclusive)',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options',
      'Unlimited API access',
      'Custom SLA',
      'Team management',
      'SSO authentication',
    ],
    cta: 'Get Enterprise',
    featured: false,
  },
];

// ============================================
// COMPONENT
// ============================================

export default function PlatformPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<PlatformPlanId | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [currentPlatformPlan, setCurrentPlatformPlan] = useState<string>('free');
  const [currentBillingInterval, setCurrentBillingInterval] = useState<string | null>(null);
  const [proTrialUsed, setProTrialUsed] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [hasActiveJournalSubscription, setHasActiveJournalSubscription] = useState(false);
  const [existingJournalPlan, setExistingJournalPlan] = useState<string | null>(null);

  const { 
    checkoutPlatformCoreMonthly, checkoutPlatformCoreYearly,
    checkoutPlatformFinotaurMonthly, checkoutPlatformFinotaurYearly,
    checkoutPlatformEnterpriseMonthly, isLoading: checkoutLoading,
  } = useWhopCheckout({
    onError: (error) => toast.error('Checkout failed', { description: error.message })
  });

  // ============================================
  // CHECK SUBSCRIPTION STATUS
  // ============================================

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) { 
        setCheckingSubscription(false); 
        return; 
      }
      
      setCheckingSubscription(true);
      
      try {
        const paymentSuccess = searchParams.get('payment') === 'success';
        const planFromUrl = searchParams.get('plan');
        
        if (paymentSuccess) {
          window.history.replaceState({}, '', '/app/all-markets/pricing');
          toast.success('Payment successful! 🎉', {
            description: `Your ${planFromUrl || 'Platform'} subscription is now active.`,
          });
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('platform_plan, platform_subscription_status, platform_pro_trial_used_at, platform_billing_interval, platform_subscription_expires_at, platform_is_in_trial, platform_trial_ends_at, platform_cancel_at_period_end')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          // Normalize: strip "platform_" prefix for UI comparison
          const rawPlan = data.platform_plan || 'free';
          setCurrentPlatformPlan(rawPlan.replace('platform_', '') as PlatformPlanId);
          setCurrentBillingInterval(data.platform_billing_interval || null);
          setProTrialUsed(!!data.platform_pro_trial_used_at);
          setSubscriptionExpiresAt(data.platform_subscription_expires_at || null);
          setIsInTrial(!!data.platform_is_in_trial);
          setTrialEndsAt(data.platform_trial_ends_at || null);
          setCancelAtPeriodEnd(!!data.platform_cancel_at_period_end);
        }

        // 🔥 Check existing Journal subscription
        const { data: journalData } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, whop_membership_id')
          .eq('id', user.id)
          .maybeSingle();

        if (journalData?.whop_membership_id && 
            ['active', 'trialing', 'trial'].includes(journalData.subscription_status || '')) {
          setHasActiveJournalSubscription(true);
          setExistingJournalPlan(journalData.account_type || null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, [user, searchParams]);

  // ============================================
  // HANDLERS
  // ============================================

  const [showUpgradeWarning, setShowUpgradeWarning] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<PlatformPlanId | null>(null);

  const proceedToCheckout = (planId: PlatformPlanId) => {
    setLoading(planId);
    try {
      if (planId === 'core') {
        billingInterval === 'monthly' ? checkoutPlatformCoreMonthly() : checkoutPlatformCoreYearly();
      } else if (planId === 'finotaur') {
        billingInterval === 'monthly' ? checkoutPlatformFinotaurMonthly() : checkoutPlatformFinotaurYearly();
      } else if (planId === 'enterprise') {
        checkoutPlatformEnterpriseMonthly();
      }
    } catch (error) {
      toast.error('Failed to start checkout');
      setLoading(null);
    }
  };

  const handlePlanClick = (planId: PlatformPlanId) => {
    // Free = open downgrade confirmation dialog
    if (planId === 'free') {
      if (currentPlatformPlan !== 'free') {
        setShowDowngradeDialog(true);
      }
      return;
    }
    
    // Allow same plan only if upgrading from monthly to yearly
    const isUpgradeToYearly = planId === currentPlatformPlan && 
      currentBillingInterval === 'monthly' && billingInterval === 'yearly';
    
    // Block if same plan + same interval (not an upgrade)
    if (planId === currentPlatformPlan && !isUpgradeToYearly) return;

    // 🔥 Show cancellation warning if user has existing paid subscriptions
    const hasExistingSubscriptions = currentPlatformPlan !== 'free';
    if (hasExistingSubscriptions || (planId === 'finotaur' || planId === 'enterprise')) {
      // Check if this is an upgrade that will cancel War Zone / Top Secret / Journal
      // Finotaur/Enterprise include all these, so warn user
      setPendingPlanId(planId);
      setShowUpgradeWarning(true);
      return;
    }
    
    proceedToCheckout(planId);
  };

  const getDisplayPrice = (plan: PlanConfig) => {
    if (plan.id === 'free') {
      return { price: 'Free', period: 'forever', billedAs: undefined };
    }
    if (plan.id === 'enterprise') {
      return { price: '$499', period: '/month', billedAs: undefined };
    }
    
    if (billingInterval === 'monthly') {
      return { 
        price: plan.monthlyPrice, 
        period: '/month',
        billedAs: undefined
      };
    } else {
      return { 
        price: plan.yearlyMonthlyEquivalent, 
        period: '/month',
        billedAs: `Billed ${plan.yearlyPrice}/year`
      };
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen p-6 md:p-8 relative overflow-hidden">
      {/* Gold Animated Orbs Background */}
      <style>{`
        @keyframes pricing-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}
        .pricing-orb{animation:pricing-orb 8s ease-in-out infinite}
      `}</style>
      <div className="absolute top-[10%] left-[15%] w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] pricing-orb pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] pricing-orb pointer-events-none" style={{animationDelay:'3s'}} />
      <div className="absolute top-[50%] left-[50%] w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] pricing-orb pointer-events-none" style={{animationDelay:'5s'}} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Choose Your </span>
            <span className="text-[#C9A646]">Platform Plan</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Unlock powerful market intelligence tools. Finotaur includes Journal Premium + All Reports!
          </p>
        </div>

        {/* Guarantee Box */}
        <div className="mb-8 max-w-4xl mx-auto">
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
                <h4 className="text-xl font-semibold text-white mb-2">
                  Finotaur Bundle — Save $50+/month
                </h4>
                <p className="text-slate-300 text-base leading-relaxed">
                  Get full market access + Journal Premium + War Zone + Top Secret Reports. 
                  {proTrialUsed ? ' Start your subscription today!' : ' Try free for 14 days!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Trial Warning */}
        {proTrialUsed && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-amber-400 text-sm">
                ⚠️ You've already used your one-time Pro trial.
              </p>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5 shadow-xl">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                billingInterval === 'monthly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                billingInterval === 'yearly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pt-5">
          {plans.map((plan) => {
            const displayPrice = getDisplayPrice(plan);
            // Block same plan+same interval, allow upgrade to yearly
            const isSamePlanSameInterval = plan.id === currentPlatformPlan && 
              (billingInterval === currentBillingInterval || plan.id === 'free');
            const isSamePlanUpgradeToYearly = plan.id === currentPlatformPlan && 
              currentBillingInterval === 'monthly' && billingInterval === 'yearly';
            // 🔥 v6.1.0: If user is on yearly and viewing monthly, still show as "current" (downgrade blocked)
            const isSamePlanDowngradeToMonthly = plan.id === currentPlatformPlan && 
              currentBillingInterval === 'yearly' && billingInterval === 'monthly';
            const isCurrentPlan = (isSamePlanSameInterval || isSamePlanDowngradeToMonthly) && !isSamePlanUpgradeToYearly;
            const isLoadingThis = loading === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
                  plan.featured ? 'lg:scale-[1.02]' : ''
                }`}
                style={{
                  background: isCurrentPlan && plan.id !== 'free'
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.06) 40%, rgba(0,0,0,0.4) 100%)'
                    : plan.featured 
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: isCurrentPlan && plan.id !== 'free'
                    ? '2px solid rgba(201,166,70,0.7)'
                    : plan.featured 
                    ? '2px solid rgba(201,166,70,0.6)' 
                    : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isCurrentPlan && plan.id !== 'free'
                    ? '0 12px 50px rgba(201,166,70,0.3), 0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1)'
                    : plan.featured
                    ? '0 12px 50px rgba(201,166,70,0.5), 0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.15)'
                    : '0 6px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                }}
              >
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                     style={{
                       background: plan.featured
                         ? 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.2), transparent 60%)'
                         : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%)'
                     }} />
                
                {/* Subtle Shine Effect */}
                <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                     style={{
                       background: plan.featured
                         ? 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)'
                         : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
                     }} />

                {/* Featured Badge */}
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                       style={{
                         background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                         boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                         color: '#000',
                         zIndex: 50
                       }}>
                    <TrendingUp className="w-4 h-4" />
                    Best Value
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && plan.id !== 'free' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                       style={{
                         background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                         boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                         color: '#000',
                         zIndex: 50,
                       }}>
                    <Crown className="w-3.5 h-3.5" />
                    Your Plan {currentBillingInterval === 'yearly' ? '(Yearly)' : currentBillingInterval === 'monthly' ? '(Monthly)' : ''}
                  </div>
                )}

                {/* Trial Badge for Core - only monthly, only if NOT current plan */}
                {plan.id === 'core' && billingInterval === 'monthly' && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-blue-500 text-white whitespace-nowrap"
                       style={{ zIndex: 50 }}>
                    <Clock className="w-3 h-3" />
                    14-Day Free Trial
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && billingInterval === 'yearly' && !plan.featured && plan.id !== 'free' && plan.id !== 'enterprise' && (
                  <div className="absolute top-2 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg" style={{ zIndex: 50 }}>
                    {plan.savings}
                  </div>
                )}
                
                {/* Plan Info */}
                <div className="text-center mb-6 mt-4">
                  <h4 className="text-xl font-bold mb-2 text-white">{plan.name}</h4>
                  <div className="flex flex-col items-center justify-center gap-1 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                        {displayPrice.price}
                      </span>
                      {displayPrice.period && (
                        <span className="text-slate-400 text-sm">{displayPrice.period}</span>
                      )}
                    </div>
                    {displayPrice.billedAs && (
                      <span className="text-xs text-slate-500">{displayPrice.billedAs}</span>
                    )}
                    {plan.trialDays > 0 && billingInterval === 'monthly' && (
                      <span className={`text-xs mt-1 ${plan.featured ? 'text-[#C9A646]' : 'text-blue-400'}`}>
                        {plan.trialDays}-day free trial{plan.trialOnceOnly ? ' (one-time)' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full ${
                        plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                      } flex items-center justify-center shrink-0 mt-0.5`}
                           style={{ border: '1px solid rgba(201,166,70,0.4)' }}>
                        <Check className="h-2.5 w-2.5 text-[#C9A646]" />
                      </div>
                      <span className="text-sm text-slate-300 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Bundle Badges - Gold style above CTA */}
                {plan.includesJournal && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 bg-[#C9A646]/20 border border-[#C9A646]/50 px-3 py-1.5 rounded-full text-xs font-medium text-[#C9A646]">
                      <Gift className="w-3.5 h-3.5" />
                      +Journal Premium
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#C9A646]/20 border border-[#C9A646]/50 px-3 py-1.5 rounded-full text-xs font-medium text-[#C9A646]">
                      <Gift className="w-3.5 h-3.5" />
                      +Newsletter Choice
                    </span>
                  </div>
                )}

                {/* 🔥 Core Warning: cancels existing Journal */}
                {plan.id === 'core' && hasActiveJournalSubscription && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                      <strong>Note:</strong> Subscribing to Core will cancel your existing Journal {existingJournalPlan === 'premium' ? 'Premium' : 'Basic'} subscription. 
                      You'll keep access until your current billing period ends, and Core includes Journal Basic.
                    </p>
                  </div>
                )}

                {/* CTA Button */}
                <button 
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={(isCurrentPlan && plan.id !== 'free') || isLoadingThis || checkoutLoading}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isCurrentPlan && plan.id === 'free'
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : plan.id === 'free' && currentPlatformPlan !== 'free'
                      ? 'border border-zinc-700 hover:border-red-500/40 hover:bg-red-500/5 text-zinc-400 hover:text-red-400'
                      : isCurrentPlan
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : plan.featured 
                      ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]' 
                      : 'border-2 border-[#C9A646]/40 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white hover:scale-[1.02]'
                  }`}
                  style={!isCurrentPlan ? (plan.featured ? {
                    boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                  } : {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }) : undefined}
                >
                  {isLoadingThis ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : isCurrentPlan ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {isSamePlanDowngradeToMonthly ? 'Current Plan (Yearly)' : 'Current Plan'}
                    </span>
                  ) : isSamePlanUpgradeToYearly ? (
                    <span className="flex items-center justify-center gap-2">
                      Upgrade to Yearly (Save 17%) <span>→</span>
                    </span>
                  ) : plan.id === 'free' && currentPlatformPlan !== 'free' ? (
                    <span className="flex items-center justify-center gap-2">
                      <X className="w-3.5 h-3.5" />
                      Downgrade to Free
                    </span>
                  ) : plan.id === 'free' && currentPlatformPlan === 'free' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Current Plan
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {billingInterval === 'yearly' && plan.trialDays > 0 ? 'Get Yearly Plan' : plan.cta}
                      <span>→</span>
                    </span>
                  )}
                </button>

                {/* Subscription Info for Current Plan */}
                {isCurrentPlan && plan.id !== 'free' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30 space-y-1.5">
                    {isInTrial && trialEndsAt && (
                      <p className="text-xs text-blue-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Trial ends {new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    {cancelAtPeriodEnd && subscriptionExpiresAt && (
                      <p className="text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        Access until {new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    {!isInTrial && !cancelAtPeriodEnd && subscriptionExpiresAt && (
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Next billing {new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    {cancelAtPeriodEnd && (
                      <p className="text-xs text-amber-400/80">Cancellation pending</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Downgrade Confirmation Dialog */}
        {showDowngradeDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
                 style={{
                   background: 'linear-gradient(135deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.98) 100%)',
                   border: '1px solid rgba(63,63,70,0.5)',
                   boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                 }}>
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    Downgrade to Free?
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    You'll lose access to all premium features at the end of your billing period.
                  </p>
                </div>
              </div>

              {/* What you'll lose - Dynamic based on current plan */}
              <div className="mx-6 mb-4">
                <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-red-500/5 to-amber-500/5 border border-amber-500/20">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <p className="text-sm font-medium text-amber-300">What you'll lose</p>
                    </div>
                    <div className="space-y-2">
                      {currentPlatformPlan === 'core' && (
                        <>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Stock Analyzer (5 analyses/day → 3)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Sector Analyzer access</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Flow Scanner & AI Assistant</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Real-time market data</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Advanced charts & indicators</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Unlimited watchlists & 50 price alerts</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                            <span className="text-[#C9A646] font-medium">🎁 Journal Basic — 25 trades/month (INCLUDED)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Priority email support</span>
                          </div>
                        </>
                      )}
                      {(currentPlatformPlan === 'finotaur' || currentPlatformPlan === 'enterprise') && (
                        <>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Stock Analyzer ({currentPlatformPlan === 'enterprise' ? 'unlimited' : '7/day'} → 3)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Sector Analyzer (unlimited access)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Options Intelligence AI & Macro Analyzer</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>AI Scanner & AI Assistant</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Flow Scanner & Advanced charts</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                            <span className="text-[#C9A646] font-medium">🎁 War Zone Newsletter (INCLUDED)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                            <span className="text-[#C9A646] font-medium">🎁 Top Secret Reports (INCLUDED)</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
                            <span className="text-[#C9A646] font-medium">🎁 Journal Premium (INCLUDED)</span>
                          </div>
                          {currentPlatformPlan === 'enterprise' && (
                            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              <span>My Portfolio & dedicated account manager</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Priority 24h support</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-2 space-y-3">
                <button
                  onClick={() => setShowDowngradeDialog(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Keep My {currentPlatformPlan === 'core' ? 'Core' : currentPlatformPlan === 'finotaur' ? 'Finotaur' : 'Enterprise'} Plan
                </button>
                
                <button
                  onClick={async () => {
                    setShowDowngradeDialog(false);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) {
                        navigate('/app/settings?tab=billing');
                        toast.info('Please cancel from the Billing tab.');
                        return;
                      }

                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                        {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${session.access_token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            action: "cancel",
                            product: "platform",
                            reason: "User downgraded to free from Pricing page",
                          }),
                        }
                      );

                      const data = await response.json();
                      if (data.success) {
                        toast.success(data.message || 'Subscription will be cancelled at period end');
                        // Refresh subscription state
                        const { data: profileData } = await supabase
                          .from('profiles')
                          .select('platform_plan, platform_subscription_status, platform_billing_interval')
                          .eq('id', user.id)
                          .maybeSingle();
                        if (profileData) {
                          const rawPlan = profileData.platform_plan || 'free';
                          setCurrentPlatformPlan(rawPlan.replace('platform_', '') as PlatformPlanId);
                        }
                      } else {
                        toast.error(data.error || 'Failed to cancel. Try from Settings.');
                        navigate('/app/settings?tab=billing');
                      }
                    } catch (error) {
                      toast.error('Failed to cancel. Try from Settings.');
                      navigate('/app/settings?tab=billing');
                    }
                  }}
                  className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                  Yes, I Want to Downgrade
                </button>
                
                <p className="text-center text-xs text-zinc-500">
                  Your access continues until the end of your billing period
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="mt-12 space-y-4 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Bank-grade security</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">14-Day Free Trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Your data stays yours. We never sell your information. Cancel with one click, no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 Upgrade Warning Popup */}
      {showUpgradeWarning && pendingPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpgradeWarning(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)', border: '1px solid rgba(201,166,70,0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
                <span className="text-amber-400 text-lg">⚠️</span>
              </div>
              <h3 className="text-white font-semibold text-base">Heads up before you continue</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-5">
              Subscribing to a Platform plan will <span className="text-amber-400 font-medium">automatically cancel</span> any existing War Zone, Top Secret, or Journal subscriptions you have — they're all included in your new plan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowUpgradeWarning(false);
                  proceedToCheckout(pendingPlanId);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #C9A646, #D4BF8E)', color: '#000' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}