// src/components/landing-new/Pricing.tsx
// ================================================
// 🔥 PRICING — COMPACT — 4 Plans
// Free | Core ($59) | Finotaur ($109 FEATURED) | Enterprise ($500)
// Monthly/Yearly toggle with savings
// ================================================

import { Check, Shield, Clock, Crown, ArrowRight, Gift, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

type BillingInterval = "monthly" | "yearly";

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
  isFree?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    yearlyMonthlyEquivalent: "$0",
    description: "Explore the platform",
    isFree: true,
    features: [
      "Basic dashboards (limited)",
      "1 watchlist",
      "Delayed data (15min)",
      "Community access",
    ],
    cta: "Get Started Free",
    featured: false,
  },
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
    badge: "14-Day Free Trial",
  },
  {
    id: "finotaur",
    name: "Finotaur",
    monthlyPrice: "$109",
    yearlyPrice: "$1,090",
    yearlyMonthlyEquivalent: "$91",
    description: "Complete trading ecosystem",
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
    description: "For serious operations",
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
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  const handlePlanClick = (planId: string) => {
    if (planId === "enterprise") {
      window.location.href =
        "mailto:enterprise@finotaur.com?subject=Enterprise Plan Inquiry";
      return;
    }
    if (planId === "free") {
      navigate("/auth/register?plan=free");
      return;
    }
    navigate(`/auth/register?plan=${planId}&interval=${billingInterval}`);
  };

  const getDisplayPrice = (plan: Plan) => {
    if (plan.isFree) return { price: "Free", period: "" };
    if (plan.id === "enterprise")
      return { price: plan.monthlyPrice, period: "/month" };
    if (billingInterval === "monthly")
      return { price: plan.monthlyPrice, period: "/month" };
    return {
      price: plan.yearlyMonthlyEquivalent,
      period: "/month",
      billedAs: `Billed ${plan.yearlyPrice}/year`,
    };
  };

  return (
    <section id="pricing" className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#1E1B16] to-[#0B0B0B]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.08] rounded-full blur-[160px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-white">Choose Your </span>
            <span className="text-[#C9A646]">Plan</span>
          </h2>
          <p className="text-sm text-slate-400">
            Simple, transparent pricing. Start with a 14-day free trial. Cancel
            anytime.
          </p>
        </motion.div>

        {/* Billing Toggle — compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div
            className="inline-flex items-center p-1 rounded-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(201,166,70,0.15)",
            }}
          >
            <button
              onClick={() => setBillingInterval("monthly")}
              className="relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300"
              style={{
                background:
                  billingInterval === "monthly"
                    ? "rgba(201,166,70,0.15)"
                    : "transparent",
                color:
                  billingInterval === "monthly" ? "#fff" : "rgb(148,163,184)",
                border:
                  billingInterval === "monthly"
                    ? "1px solid rgba(201,166,70,0.3)"
                    : "1px solid transparent",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className="relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              style={{
                background:
                  billingInterval === "yearly"
                    ? "rgba(201,166,70,0.15)"
                    : "transparent",
                color:
                  billingInterval === "yearly" ? "#fff" : "rgb(148,163,184)",
                border:
                  billingInterval === "yearly"
                    ? "1px solid rgba(201,166,70,0.3)"
                    : "1px solid transparent",
              }}
            >
              Yearly
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plans Grid — 4 columns */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, index) => {
            const displayPrice = getDisplayPrice(plan);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
                className="relative group"
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider whitespace-nowrap"
                      style={
                        plan.featured
                          ? {
                              background:
                                "linear-gradient(135deg, #C9A646, #F4D97B)",
                              color: "#000",
                              boxShadow:
                                "0 4px 15px rgba(201,166,70,0.3)",
                            }
                          : {
                              background: "rgba(201,166,70,0.12)",
                              color: "#C9A646",
                              border:
                                "1px solid rgba(201,166,70,0.25)",
                            }
                      }
                    >
                      {plan.badge === "MOST POPULAR" && (
                        <Star className="w-3 h-3 inline mr-1 -mt-0.5" />
                      )}
                      {plan.badge === "14-Day Free Trial" && (
                        <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                      )}
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Card */}
                <div
                  className="relative rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300"
                  style={{
                    background: plan.featured
                      ? "linear-gradient(180deg, rgba(201,166,70,0.10) 0%, rgba(10,10,10,0.97) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                    border: plan.featured
                      ? "1px solid rgba(201,166,70,0.35)"
                      : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: plan.featured
                      ? "0 0 50px rgba(201,166,70,0.1), 0 15px 40px rgba(0,0,0,0.4)"
                      : "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="p-5 flex flex-col flex-1">
                    {/* Name + Price */}
                    <div className="text-center mb-4">
                      <h3
                        className={`text-lg font-bold mb-2 ${plan.featured ? "text-[#C9A646]" : "text-white"}`}
                      >
                        {plan.name}
                      </h3>

                      <div className="flex items-end justify-center gap-1">
                        <span
                          className={`font-bold ${plan.isFree ? "text-3xl text-emerald-400" : "text-3xl text-white"}`}
                        >
                          {displayPrice.price}
                        </span>
                        {displayPrice.period && (
                          <span className="text-slate-500 text-sm mb-0.5">
                            {displayPrice.period}
                          </span>
                        )}
                      </div>

                      {/* Trial text */}
                      {plan.trialDays && billingInterval === "monthly" && (
                        <p className="text-emerald-400 text-xs font-semibold mt-1">
                          First {plan.trialDays} days free
                        </p>
                      )}

                      {/* Billed yearly text */}
                      {"billedAs" in displayPrice &&
                        (displayPrice as any).billedAs && (
                          <p className="text-slate-500 text-[10px] mt-0.5">
                            {(displayPrice as any).billedAs}
                          </p>
                        )}

                      <p className="text-slate-500 text-xs mt-1.5">
                        {plan.description}
                      </p>
                    </div>

                    {/* Extras badge */}
                    {plan.includesExtras && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C9A646]/8 border border-[#C9A646]/15 mb-4">
                        <Gift className="w-3.5 h-3.5 text-[#C9A646] shrink-0" />
                        <span className="text-[#C9A646] text-[10px] font-semibold leading-tight">
                          {plan.includesExtras}
                        </span>
                      </div>
                    )}

                    {/* Features — compact */}
                    <div className="space-y-2 mb-5 flex-1">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: plan.featured
                                ? "rgba(201,166,70,0.15)"
                                : "rgba(16,185,129,0.12)",
                            }}
                          >
                            <Check
                              className={`w-2.5 h-2.5 ${plan.featured ? "text-[#C9A646]" : "text-emerald-400"}`}
                            />
                          </div>
                          <span className="text-slate-300 text-xs leading-tight">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handlePlanClick(plan.id)}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
                      style={
                        plan.featured
                          ? {
                              background:
                                "linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)",
                              color: "#000",
                              boxShadow:
                                "0 4px 20px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                            }
                          : {
                              background: "rgba(255,255,255,0.04)",
                              color: "#fff",
                              border:
                                "1px solid rgba(255,255,255,0.1)",
                            }
                      }
                    >
                      {plan.cta}
                      {plan.featured && (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust bar — compact */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-500 text-xs">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#C9A646]/50" />
              Bank-grade security
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C9A646]/50" />
              14-Day Free Trial
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#C9A646]/50" />
              Cancel anytime
            </span>
          </div>
          <p className="text-slate-600 text-[10px] mt-2">
            Your data stays yours. We never sell your information. Cancel with
            one click, no questions asked.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;