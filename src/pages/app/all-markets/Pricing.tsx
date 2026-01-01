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
  Check, Shield, Zap, Clock, TrendingUp, Gift, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

// ============================================
// TYPES
// ============================================

type BillingInterval = 'monthly' | 'yearly';
type PlatformPlanId = 'free' | 'core' | 'pro' | 'enterprise';

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
      'Basic market data',
      'Limited watchlists (5 items)',
      '3 price alerts',
      'Community access',
    ],
    cta: 'Current Plan',
    featured: false,
  },
  {
    id: 'core',
    name: 'Core',
    monthlyPrice: '$39',
    yearlyPrice: '$349',
    yearlyMonthlyEquivalent: '$29',
    description: 'Full market intelligence',
    trialDays: 7,
    trialOnceOnly: false,
    features: [
      'Everything in Free, plus:',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
      'Basic screeners',
      'Daily market briefing',
      'Priority email support',
    ],
    cta: 'Start 7-Day Trial',
    featured: false,
    savings: 'Save 25%',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: '$69',
    yearlyPrice: '$619',
    yearlyMonthlyEquivalent: '$52',
    description: 'Complete trading ecosystem',
    trialDays: 14,
    trialOnceOnly: true,
    includesJournal: true,
    includesNewsletter: true,
    features: [
      'Everything in Core, plus:',
      'AI-powered market insights',
      'Advanced screeners',
      'Unlimited price alerts',
      'Options flow analysis',
      'Institutional analytics',
      'Priority 24h support',
    ],
    cta: 'Start 14-Day Trial',
    featured: true,
    savings: 'Save 25%',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    yearlyMonthlyEquivalent: 'Custom',
    description: 'Custom solutions for teams',
    trialDays: 0,
    features: [
      'Everything in Pro, plus:',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options',
      'Unlimited API access',
      'Custom SLA',
      'Team management',
      'SSO authentication',
    ],
    cta: 'Contact Sales',
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
  const [proTrialUsed, setProTrialUsed] = useState(false);

  const { 
    checkoutPlatformCoreMonthly, checkoutPlatformCoreYearly,
    checkoutPlatformProMonthly, checkoutPlatformProYearly,
    contactEnterpriseSales, isLoading: checkoutLoading,
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
          .select('platform_plan, platform_subscription_status, platform_pro_trial_used_at')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          setCurrentPlatformPlan(data.platform_plan || 'free');
          setProTrialUsed(!!data.platform_pro_trial_used_at);
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

  const handlePlanClick = (planId: PlatformPlanId) => {
    if (planId === 'free' || planId === currentPlatformPlan) return;
    
    if (planId === 'enterprise') {
      contactEnterpriseSales();
      return;
    }
    
    setLoading(planId);
    
    try {
      if (planId === 'core') {
        billingInterval === 'monthly' ? checkoutPlatformCoreMonthly() : checkoutPlatformCoreYearly();
      } else if (planId === 'pro') {
        billingInterval === 'monthly' ? checkoutPlatformProMonthly() : checkoutPlatformProYearly();
      }
    } catch (error) {
      toast.error('Failed to start checkout');
      setLoading(null);
    }
  };

  const getDisplayPrice = (plan: PlanConfig) => {
    if (plan.id === 'free') {
      return { price: 'Free', period: 'forever', billedAs: undefined };
    }
    if (plan.id === 'enterprise') {
      return { price: 'Custom', period: '', billedAs: undefined };
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
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Choose Your </span>
            <span className="text-[#C9A646]">Platform Plan</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Unlock powerful market intelligence tools. Pro includes Journal Premium + Newsletter!
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
                  Pro Bundle — Save $30+/month
                </h4>
                <p className="text-slate-300 text-base leading-relaxed">
                  Get full market access + Journal Premium + Newsletter choice. 
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
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const displayPrice = getDisplayPrice(plan);
            const isCurrentPlan = plan.id === currentPlatformPlan;
            const isLoadingThis = loading === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
                  plan.featured ? 'lg:scale-[1.02]' : ''
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

                {/* Trial Badge for Core */}
                {plan.id === 'core' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-blue-500 text-white whitespace-nowrap"
                       style={{ zIndex: 50 }}>
                    <Clock className="w-3 h-3" />
                    7-Day Free Trial
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && billingInterval === 'yearly' && !plan.featured && plan.id !== 'free' && plan.id !== 'enterprise' && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg" style={{ zIndex: 50 }}>
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

                {/* CTA Button */}
                <button 
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={isCurrentPlan || isLoadingThis || checkoutLoading}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isCurrentPlan
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
                    'Current Plan'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {plan.cta}
                      {plan.id !== 'free' && <span>→</span>}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

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
              <span className="text-sm">14-Day Pro Trial</span>
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
    </div>
  );
}