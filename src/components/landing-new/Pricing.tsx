// src/components/landing-new/Pricing.tsx
// ================================================
// 🔥 PRICING — 3 Plans
// Core ($59) | Finotaur ($109 FEATURED) | Enterprise ($500)
// Monthly/Yearly toggle with savings
// ================================================

import { Button } from "@/components/ui/button";
import { Check, Shield, Zap, TrendingUp, Clock, Crown, ArrowRight, Gift, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

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
  trialDays?: number;
  badge?: string;
  includesExtras?: string;
}

const plans: Plan[] = [
  {
    id: "core",
    name: "Core",
    monthlyPrice: "$59",
    yearlyPrice: "$590",
    yearlyMonthlyEquivalent: "$49",
    description: "Full market intelligence tools",
    trialDays: 14,
    features: [
      "Stock Analyzer (5 analyses/day)",
      "Sector Analyzer (3 sectors/month)",
      "Flow Scanner",
      "AI Assistant",
      "Real-time market data",
      "Advanced charts & indicators",
      "Unlimited watchlists",
      "50 price alerts",
      "Priority email support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
    savings: "Save 17%",
  },
  {
    id: "finotaur",
    name: "Finotaur",
    monthlyPrice: "$109",
    yearlyPrice: "$1,090",
    yearlyMonthlyEquivalent: "$91",
    description: "Complete trading ecosystem — everything included",
    trialDays: 14,
    badge: "MOST POPULAR",
    includesExtras: "Includes War Zone + Top Secret + Journal Premium",
    features: [
      "Everything in Core, plus:",
      "Stock Analyzer (7 analyses/day)",
      "Sector Analyzer (unlimited)",
      "Options Intelligence AI",
      "Macro Analyzer",
      "AI Scanner",
      "🎁 Journal Premium INCLUDED",
      "🎁 War Zone + Top Secret Reports",
      "Priority 24h support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: true,
    savings: "Save 17%",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "$500",
    yearlyPrice: "$500",
    yearlyMonthlyEquivalent: "$500",
    description: "Ultimate solution for serious operations",
    features: [
      "Everything in Finotaur, plus:",
      "Unlimited Stock Analyses",
      "My Portfolio (exclusive)",
      "Dedicated account manager",
      "Custom integrations",
      "White-label options",
      "Unlimited API access",
      "Custom SLA",
      "Team management",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const handlePlanClick = (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:enterprise@finotaur.com?subject=Enterprise Plan Inquiry';
      return;
    }
    navigate(`/auth/register?plan=${planId}&interval=${billingInterval}`);
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.id === 'enterprise') {
      return { price: plan.monthlyPrice, period: "/month" };
    }
    if (billingInterval === 'monthly') {
      return { price: plan.monthlyPrice, period: "/month" };
    }
    return {
      price: plan.yearlyMonthlyEquivalent,
      period: "/month",
      billedAs: `Billed ${plan.yearlyPrice}/year`,
    };
  };

  return (
    <section id="pricing" className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#1E1B16] to-[#0B0B0B]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-[#C9A646]/[0.10] rounded-full blur-[180px]" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-[#D4AF37]/[0.06] rounded-full blur-[140px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Choose Your </span>
            <span className="text-[#C9A646]">Plan</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Simple, transparent pricing. Start with a 14-day free trial. Cancel anytime.
          </p>
        </motion.div>

        {/* ========== BILLING TOGGLE ========== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-14"
        >
          <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full p-1.5">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${
                billingInterval === 'monthly'
                  ? 'bg-gradient-to-r from-[#C9A646] to-[#D4AF37] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 relative ${
                billingInterval === 'yearly'
                  ? 'bg-gradient-to-r from-[#C9A646] to-[#D4AF37] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* ========== 3 PLAN CARDS ========== */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
          {plans.map((plan, index) => {
            const displayPrice = getDisplayPrice(plan);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                className={`relative rounded-2xl flex flex-col transition-all duration-500 ${
                  plan.featured ? 'md:scale-[1.04] md:-my-4' : ''
                }`}
                style={{
                  background: plan.featured
                    ? 'linear-gradient(180deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.03) 40%, rgba(10,10,10,0.95) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: plan.featured
                    ? '2px solid rgba(201,166,70,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: plan.featured
                    ? '0 12px 60px rgba(201,166,70,0.25), 0 4px 20px rgba(0,0,0,0.5)'
                    : '0 6px 35px rgba(0,0,0,0.4)',
                }}
              >
                {/* Shine on featured */}
                {plan.featured && (
                  <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                       style={{ background: 'linear-gradient(180deg, rgba(244,217,123,0.15), transparent)' }} />
                )}

                {/* MOST POPULAR Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 whitespace-nowrap z-20"
                    style={{
                      background: 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)',
                      boxShadow: '0 4px 20px rgba(201,166,70,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                      color: '#000',
                    }}
                  >
                    <Star className="w-4 h-4" />
                    {plan.badge}
                  </div>
                )}

                {/* Trial badge */}
                {plan.trialDays && !plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 whitespace-nowrap bg-blue-500/90 text-white shadow-lg z-20">
                    <Clock className="w-3.5 h-3.5" />
                    14-Day Free Trial
                  </div>
                )}

                {/* Savings badge */}
                {plan.savings && billingInterval === 'yearly' && plan.id !== 'enterprise' && (
                  <div className="absolute -top-3.5 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg z-20">
                    {plan.savings}
                  </div>
                )}

                <div className="p-8 pt-10 flex flex-col flex-1">
                  {/* Plan name & description */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>

                    {/* Price */}
                    <div className="flex flex-col items-center gap-1 mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                          {displayPrice.price}
                        </span>
                        <span className="text-slate-400">{displayPrice.period}</span>
                      </div>
                      {displayPrice.billedAs && (
                        <span className="text-sm text-slate-500">{displayPrice.billedAs}</span>
                      )}
                      {plan.trialDays && (
                        <span className="text-sm text-blue-400 font-medium mt-1">
                          First 14 days free
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{plan.description}</p>

                    {/* Extras badge */}
                    {plan.includesExtras && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/25">
                        <Gift className="w-3.5 h-3.5 text-[#C9A646]" />
                        <span className="text-[#C9A646] text-xs font-semibold">{plan.includesExtras}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3.5 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: plan.featured ? 'rgba(201,166,70,0.2)' : 'rgba(201,166,70,0.12)',
                            border: '1px solid rgba(201,166,70,0.3)',
                          }}
                        >
                          <Check className="h-3 w-3 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={`w-full py-6 text-base font-bold transition-all duration-300 rounded-xl ${
                      plan.featured
                        ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]'
                        : plan.id === 'enterprise'
                        ? 'border-2 border-[#C9A646]/30 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white'
                        : 'border-2 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-white'
                    }`}
                    variant={plan.featured ? "default" : "outline"}
                    onClick={() => handlePlanClick(plan.id)}
                    style={plan.featured ? {
                      boxShadow: '0 6px 30px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                    } : undefined}
                  >
                    {plan.cta}
                    {plan.featured && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ========== TRUST BADGES ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-16 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Bank-grade security</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
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
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;