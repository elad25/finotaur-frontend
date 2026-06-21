// src/pages/app/journal/JournalPricingPage.tsx
// Full-page version of the journal upgrade plans (same content as UpgradePlanModal in Pricing.tsx)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronLeft, Shield, TrendingUp, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import type { PlanName } from '@/lib/whop-config';

type BillingInterval = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthlyEquivalent: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  savings?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    yearlyMonthlyEquivalent: '$0',
    description: 'Start your trading journey',
    features: [
      'Automatic broker sync — leading brokers supported',
      '1 broker connection',
      '15 trades to uncover your first leak',
      'Trade journal (manual + auto-import)',
      'Core performance stats',
      'Trading calendar',
      'Community access',
      'Mobile app',
    ],
    cta: 'Start Free',
    featured: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: '$24.99',
    yearlyPrice: '$229',
    yearlyMonthlyEquivalent: '$19.08',
    description: 'Every tool serious traders need',
    features: [
      'Everything in Free, plus:',
      '25 trades / month',
      '1 broker connection',
      'Full performance analytics & equity curve',
      'Strategy builder & playbooks',
      'Trading sessions & tagging',
      'Advanced statistics & metrics',
      'Risk/Reward calculator',
      'Trade screenshots & notes',
      'Full FINOTAUR Academy (300+ lessons)',
      'Email support',
    ],
    cta: 'Start 14-Day Free Trial',
    featured: false,
    savings: 'Yearly — save ~3 months',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: '$44.99',
    yearlyPrice: '$409',
    yearlyMonthlyEquivalent: '$34.08',
    description: 'Unlimited trades + your AI trading coach',
    features: [
      'Everything in Basic, plus:',
      'Unlimited trades — never hit a cap',
      'Connect multiple brokers',
      'Your FINOTAUR Score — one number that grades your real edge',
      'Daily AI briefing — ranked insights on what to fix first',
      'Pattern of the Week — your biggest recurring edge or leak, surfaced automatically',
      'Leak Finder — AI names the exact mistake costing you money',
      'Behavioral & risk alerts before you tilt',
      'Custom AI reports & backtesting',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Upgrade to Premium',
    featured: true,
    savings: 'Yearly — save ~3 months',
  },
];

export default function JournalPricingPage() {
  const navigate = useNavigate();
  const { limits } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const { initiateCheckout, isLoading } = useWhopCheckout({
    onError: (e) => toast.error('Checkout failed', { description: e.message }),
  });

  const currentPlan = limits?.account_type ?? 'free';

  const getDisplayPrice = (plan: Plan) => {
    if (plan.id === 'free') {
      return { price: '$0', period: 'forever', billedAs: undefined as string | undefined };
    }
    if (billingInterval === 'monthly') {
      return { price: plan.monthlyPrice, period: '/month', billedAs: undefined };
    }
    return {
      price: plan.yearlyMonthlyEquivalent,
      period: '/month',
      billedAs: `Billed ${plan.yearlyPrice}/year`,
    };
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === currentPlan) {
      toast.info('This is your current plan');
      return;
    }
    if (planId === 'free') {
      toast.info("You're on the Free plan — no checkout needed");
      return;
    }
    // planId is 'basic' | 'premium' here; both are valid PlanName values.
    // Respect the Monthly/Yearly toggle. The hook routes to the correct Whop
    // checkout (Edge Function first, direct URL fallback).
    initiateCheckout({ planName: planId as PlanName, billingInterval });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Turn every trade into your edge</h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Auto-sync your broker, see what's quietly costing you, and fix it with an AI coach built for traders.
          </p>
        </div>

        {/* Guarantee Box */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div
            className="p-6 rounded-2xl relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(201,166,70,0.4)',
              boxShadow:
                '0 0 40px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent pointer-events-none" />
            <div className="flex items-start gap-4 relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(201,166,70,0.2)',
                  border: '1px solid rgba(201,166,70,0.4)',
                  boxShadow: '0 4px 16px rgba(201,166,70,0.2)',
                }}
              >
                <Shield className="w-6 h-6 text-[#C9A646]" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-xl font-semibold text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
                  Start free — 15 trades
                </h4>
                <p className="text-slate-300 text-base leading-relaxed">
                  If Finotaur doesn't show a pattern that's hurting you within 15 trades, don't upgrade.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
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
                Save ~3 months
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const displayPrice = getDisplayPrice(plan);
            const isCurrentPlan = plan.id === currentPlan;

            return (
              <div
                key={plan.id}
                className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
                  plan.featured ? 'md:scale-[1.05]' : ''
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
                    : '0 6px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                {/* Animated Gradient Overlay */}
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                  style={{
                    background: plan.featured
                      ? 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.2), transparent 60%)'
                      : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%)',
                  }}
                />

                {/* Subtle Shine Effect */}
                <div
                  className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                  style={{
                    background: plan.featured
                      ? 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
                  }}
                />

                {/* Featured Badge */}
                {plan.featured && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                      boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                      color: '#000',
                      zIndex: 50,
                    }}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Most Popular
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && billingInterval === 'yearly' && !plan.featured && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                    {plan.savings}
                  </div>
                )}

                {/* Plan Info */}
                <div className="text-center mb-6 mt-2">
                  <h4 className="text-xl font-bold mb-2 text-white">{plan.name}</h4>
                  <div className="flex flex-col items-center justify-center gap-1 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                        {displayPrice.price}
                      </span>
                      <span className="text-slate-400 text-sm">{displayPrice.period}</span>
                    </div>
                    {displayPrice.billedAs && (
                      <span className="text-xs text-slate-500">{displayPrice.billedAs}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                        } flex items-center justify-center shrink-0 mt-0.5`}
                        style={{ border: '1px solid rgba(201,166,70,0.4)' }}
                      >
                        <Check className="h-2.5 w-2.5 text-[#C9A646]" />
                      </div>
                      <span className="text-sm text-slate-300 leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isCurrentPlan || isLoading}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isCurrentPlan
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : isLoading
                      ? 'opacity-60 cursor-wait'
                      : plan.featured
                      ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]'
                      : 'border-2 border-[#C9A646]/40 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white hover:scale-[1.02]'
                  }`}
                  style={
                    !isCurrentPlan
                      ? plan.featured
                        ? {
                            boxShadow:
                              '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                          }
                        : { boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transition: 'all 0.3s ease' }
                      : undefined
                  }
                >
                  {isCurrentPlan ? 'Current Plan' : plan.cta}
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
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">14-Day Premium Trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
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
