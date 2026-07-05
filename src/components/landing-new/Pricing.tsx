// src/components/landing-new/Pricing.tsx
// ================================================
// PRICING — COMPACT — 5 Plans (persona ladder, 2026-07)
// Free | Trader ($44.99) | Investor ($50) | Finotaur ($89 FEATURED) | Ultimate ($200)
// Monthly/Yearly toggle with savings
// ================================================

import { Check, Shield, Clock, Gift, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ds/Button";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

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
  comingSoon?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    yearlyMonthlyEquivalent: "$0",
    description: "Start free — no card required",
    isFree: true,
    features: [
      "AI Stock Analyzer — 3 full analyses every day",
      "Demo portfolio — trade journal with 15 trades",
      "Market Pulse & market news",
      "P&L calendar & core performance stats",
      "1 watchlist + basic market screener",
      "Community access",
    ],
    cta: "Get Started Free",
    featured: false,
  },
  {
    id: "journal",
    name: "Trader",
    monthlyPrice: "$44.99",
    yearlyPrice: "$409",
    yearlyMonthlyEquivalent: "$34",
    description: "The trader's desk — journal, copier & analytics",
    trialDays: 14,
    features: [
      "Everything in Free, plus:",
      "Unlimited trades — every account, auto-synced",
      "Broker auto-sync + Trade Copier (Tradovate & NinjaTrader)",
      "Win rate, profit factor, expectancy, R-multiples & MFE/MAE",
      "Strategy builder & Playbooks with adherence tracking",
      "Shadow — what-if analysis on every closed trade",
      "AI trade insights & coach",
      "Mentor & community rooms · Priority support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
    savings: "Save 24%",
    badge: "14-Day Free Trial",
  },
  {
    id: "top_secret",
    name: "Investor",
    monthlyPrice: "$50",
    yearlyPrice: "$499",
    yearlyMonthlyEquivalent: "$42",
    description: "The investor's desk — daily intel, research & AI analysis",
    trialDays: 14,
    badge: "14-Day Free Trial",
    includesExtras: "TOP SECRET intel + research hub + AI analysis — more than TipRanks Ultimate, same price",
    features: [
      "TOP SECRET — daily institutional market report",
      "The Weekly Report — every Sunday, your edge for the week ahead",
      "Monthly deep-dive research (ISM, single-name & crypto)",
      "AI Stock Analyzer — 10 analyses/day",
      "AI Sector & Macro Analyzers",
      "Research hub — sectors, valuation, insiders & 13F, ETFs",
      "Private Discord trade room + live commentary",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
    savings: "Save 17%",
  },
  {
    id: "finotaur",
    name: "FINOTAUR",
    monthlyPrice: "$89",
    yearlyPrice: "$890",
    yearlyMonthlyEquivalent: "$74",
    description: "The entire platform — every tool, one price",
    trialDays: 14,
    badge: "Most Popular",
    includesExtras: "Trader + Investor + the exclusive toolset — sold elsewhere for $400+/mo",
    features: [
      "Everything in Trader & Investor, plus:",
      "Options Intelligence AI — institutional options flow",
      "Flow Scanner — Dark Pool & institutional order flow",
      "AI Scanner — daily Top 5 picks + Insider / 13F tracking",
      "Unlimited AI analyses, alerts & screeners",
      "Strategy Backtesting engine",
      "Real-time Market Scanner — live wall & sweep detection",
      "FINO — your AI assistant, on every page",
    ],
    cta: "Start 14-Day Free Trial",
    featured: true,
    savings: "Save 17%",
  },
  {
    id: "enterprise",
    name: "ULTIMATE",
    monthlyPrice: "$200",
    yearlyPrice: "$2,000",
    yearlyMonthlyEquivalent: "$167",
    description: "Your AI portfolio manager — invests & trades alongside you, 24/7",
    badge: "Coming Soon",
    comingSoon: true,
    savings: "Save 17%",
    features: [
      "Everything in FINOTAUR, plus:",
      "Copilot — AI Portfolio Manager that invests & trades with you",
      "24/7 AI oversight of every position",
      "Live mark-to-market of your real book",
      "Proactive AI risk detection & alerts",
      "Daily AI portfolio brief",
    ],
    cta: "Notify Me",
    featured: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  const handlePlanClick = (planId: string) => {
    if (planId === "enterprise") {
      // COPILOT not yet available — capture interest via signup (waitlist)
      navigate("/auth/register?plan=copilot-waitlist");
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
    if (billingInterval === "monthly")
      return { price: plan.monthlyPrice, period: "/month" };
    return {
      price: plan.yearlyMonthlyEquivalent,
      period: "/month",
      billedAs: `Billed ${plan.yearlyPrice}/year`,
    };
  };

  return (
    <SectionShell id="pricing" atmosphere="full" beam={false} constructionMarkers={false}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionTitle gradient="split" size="default">
            <span className="text-ink-primary">Choose Your </span>
            <span className="text-gold-primary">Plan</span>
          </SectionTitle>
          <p className="text-sm text-ink-muted">
            Simple, transparent pricing. Start with a 14-day free trial. Cancel
            anytime.
          </p>
        </motion.div>

        {/* Billing Toggle */}
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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-border border border-gold-muted text-gold-primary">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plans Grid — 5 columns, wrapped in an ambient gold glow */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-x-12 -inset-y-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 85% 65% at 50% 45%, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.025) 45%, transparent 76%)",
              filter: "blur(36px)",
            }}
          />
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      {plan.badge === "Most Popular" && (
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
                  className={`relative rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300 ${plan.featured ? "lg:-translate-y-2" : ""}`}
                  style={{
                    background: plan.featured
                      ? "linear-gradient(180deg, rgba(201,166,70,0.10) 0%, rgba(10,10,10,0.97) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                    border: plan.featured
                      ? "1px solid rgba(201,166,70,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: plan.featured
                      ? "0 0 60px rgba(201,166,70,0.18), 0 20px 50px rgba(0,0,0,0.5)"
                      : "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="p-5 flex flex-col flex-1">
                    {/* Name + Price */}
                    <div className="text-center mb-4">
                      <h3
                        className={`text-lg font-bold mb-2 ${plan.featured ? "text-gold-primary" : "text-ink-primary"}`}
                      >
                        {plan.name}
                      </h3>

                      <div className="flex items-end justify-center gap-1">
                        <span
                          className={`font-bold ${plan.isFree ? "text-3xl text-gold-primary" : "text-3xl text-ink-primary"}`}
                        >
                          {displayPrice.price}
                        </span>
                        {displayPrice.period && (
                          <span className="text-ink-tertiary text-sm mb-0.5">
                            {displayPrice.period}
                          </span>
                        )}
                      </div>

                      {/* Trial text */}
                      {plan.trialDays && billingInterval === "monthly" && (
                        <p className="text-gold-primary text-xs font-semibold mt-1">
                          First {plan.trialDays} days free
                        </p>
                      )}

                      {/* Billed yearly text */}
                      {"billedAs" in displayPrice &&
                        (displayPrice as any).billedAs && (
                          <p className="text-ink-tertiary text-[10px] mt-0.5">
                            {(displayPrice as any).billedAs}
                          </p>
                        )}

                      <p className="text-ink-muted text-xs mt-1.5">
                        {plan.description}
                      </p>
                    </div>

                    {/* Extras badge */}
                    {plan.includesExtras && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-border border border-gold-muted mb-4">
                        <Gift className="w-3.5 h-3.5 text-gold-primary shrink-0" />
                        <span className="text-gold-primary text-[10px] font-semibold leading-tight">
                          {plan.includesExtras}
                        </span>
                      </div>
                    )}

                    {/* Features — compact */}
                    <div className="space-y-2 mb-5 flex-1">
                      {plan.features.map((feature, i) =>
                        feature.startsWith("Everything in") ? (
                          <div
                            key={i}
                            className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary pt-2 mt-1 border-t border-gold-border/40"
                          >
                            {feature}
                          </div>
                        ) : (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gold-border">
                              <Check className="w-2.5 h-2.5 text-gold-primary" />
                            </div>
                            <span className="text-ink-secondary text-xs leading-tight">
                              {feature}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* CTA */}
                    {plan.comingSoon ? (
                      <Button
                        variant="goldOutline"
                        size="full"
                        onClick={() => handlePlanClick(plan.id)}
                      >
                        {plan.cta}
                      </Button>
                    ) : plan.featured ? (
                      <Button
                        variant="gold"
                        size="full"
                        onClick={() => handlePlanClick(plan.id)}
                      >
                        {plan.cta}
                      </Button>
                    ) : (
                      <Button
                        variant="goldOutline"
                        size="full"
                        onClick={() => handlePlanClick(plan.id)}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        </div>

        {/* Trust bar — compact */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-ink-tertiary text-xs">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gold-primary/50" />
              Bank-grade security
            </span>
            <span className="text-ink-tertiary/40">·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-primary/50" />
              14-Day Free Trial
            </span>
            <span className="text-ink-tertiary/40">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-gold-primary/50" />
              Cancel anytime
            </span>
          </div>
          <p className="text-ink-tertiary/60 text-[10px] mt-2">
            Your data stays yours. We never sell your information. Cancel with
            one click, no questions asked.
          </p>
        </motion.div>
      </div>
    </SectionShell>
  );
};

export default Pricing;
