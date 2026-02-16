// src/pages/AffiliatePage.tsx
// ================================================
// 🔥 AFFILIATE PROGRAM — Full Landing Page
// 10% recurring commission + 10% coupon discount for referrals
// Matches Finotaur gold/dark luxury design
// ================================================

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from '@/components/landing-new/Navbar';
import {
  DollarSign,
  Users,
  Percent,
  Gift,
  ArrowRight,
  TrendingUp,
  Clock,
  Shield,
  Copy,
  Zap,
  BarChart3,
  CheckCircle,
} from "lucide-react";

const stats = [
  { value: "10%", label: "Monthly Commission", icon: DollarSign },
  { value: "15%", label: "On Yearly Plans", icon: TrendingUp },
  { value: "12 mo", label: "Commission Duration", icon: Clock },
  { value: "$0", label: "Cost to Join", icon: Shield },
];

const howItWorks = [
  {
    step: "01",
    title: "Sign Up for Free",
    description: "Create your affiliate account in 30 seconds. No fees, no requirements.",
    icon: Users,
  },
  {
    step: "02",
    title: "Share Your Link & Coupon",
    description: "Get a unique referral link + a 10% discount coupon code your audience can use at checkout.",
    icon: Copy,
  },
  {
    step: "03",
    title: "Earn 10–15% for 12 Months",
    description: "Earn 10% on every monthly subscription payment, or 15% if they choose yearly — for the first 12 months of each referral.",
    icon: TrendingUp,
  },
];

const earningsExamples = [
  { referrals: 10, plan: "Finotaur Monthly", monthly: "$109", yearly: "$1,308" },
  { referrals: 10, plan: "Finotaur Yearly", monthly: "—", yearly: "$1,635" },
  { referrals: 25, plan: "Mixed (monthly)", monthly: "$272", yearly: "$3,270" },
  { referrals: 50, plan: "Mixed plans", monthly: "$450+", yearly: "$5,400+" },
  { referrals: 100, plan: "Mixed plans", monthly: "$900+", yearly: "$10,800+" },
];

const benefits = [
  "10% commission on monthly plans, 15% on yearly plans",
  "Commissions paid for the first 12 months per referral",
  "Your referrals get 10% off with your coupon code",
  "Real-time dashboard to track clicks, signups & earnings",
  "30-day cookie window — they don't need to buy immediately",
  "Monthly payouts via PayPal or bank transfer",
  "Marketing assets, banners & email templates provided",
  "No cap on earnings — the more you refer, the more you earn",
];

const AffiliatePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        .heading-serif { font-family: 'Playfair Display', Georgia, serif; }
        html { scroll-behavior: smooth; }
        ::selection { background-color: rgba(201,166,70,0.3); color: white; }
      `}</style>

      <Navbar />

      {/* ========== HERO ========== */}
      <section className="pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.12] rounded-full blur-[180px]" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
              <Percent className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] font-semibold text-sm">Affiliate Program</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              <span className="text-white">Earn </span>
              <span className="text-[#C9A646]">10–15% commission</span>
              <br />
              <span className="text-white">for every trader you refer.</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Share Finotaur with your audience. They get <span className="text-white font-semibold">10% off</span> with your
              coupon code. You earn <span className="text-white font-semibold">10% on monthly plans</span> or <span className="text-white font-semibold">15% on yearly plans</span> — for the first 12 months per referral.
            </p>

            <button
              onClick={() => navigate('/auth/register?affiliate=true')}
              className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold rounded-xl transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 8px 40px rgba(201,166,70,0.35)',
              }}
            >
              Join the Affiliate Program — Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="py-10 px-4 relative">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4 rounded-xl"
                  style={{
                    background: 'rgba(201,166,70,0.04)',
                    border: '1px solid rgba(201,166,70,0.12)',
                  }}
                >
                  <Icon className="w-5 h-5 text-[#C9A646] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-slate-500 text-xs">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A646]/[0.06] rounded-full blur-[140px]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-white">How it </span>
              <span className="text-[#C9A646]">works</span>
            </h2>
            <p className="text-sm text-slate-400">Three steps to start earning.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="relative p-6 rounded-xl text-center"
                  style={{
                    background: 'linear-gradient(180deg, rgba(201,166,70,0.06) 0%, rgba(10,10,10,0.97) 100%)',
                    border: '1px solid rgba(201,166,70,0.15)',
                  }}
                >
                  <div className="text-[#C9A646]/20 text-4xl font-bold absolute top-4 right-5">{item.step}</div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                      border: '1px solid rgba(201,166,70,0.3)',
                    }}
                  >
                    <Icon className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== THE DEAL — 10% + 10% ========== */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-white">Everyone </span>
              <span className="text-[#C9A646]">wins.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* You earn */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.97) 100%)',
                border: '1px solid rgba(201,166,70,0.25)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}
                >
                  <DollarSign className="w-5 h-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">You Earn</h3>
                  <span className="text-[#C9A646] text-sm font-semibold">10% Monthly · 15% Yearly · 12 Months</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                For every subscriber who signs up through your referral link, you earn <span className="text-white font-semibold">10% of every monthly payment</span> or <span className="text-white font-semibold">15% of yearly payments</span> — for the first 12 months of their subscription.
              </p>
            </motion.div>

            {/* They save */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(10,10,10,0.97) 100%)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <Gift className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">They Save</h3>
                  <span className="text-emerald-400 text-sm font-semibold">10% Off with Your Coupon</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Every affiliate gets a unique coupon code. When someone uses your code at checkout, they get <span className="text-white font-semibold">10% off their subscription</span>. It's an easy sell — everybody loves a discount.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== EARNINGS CALCULATOR ========== */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-white">Earning </span>
              <span className="text-[#C9A646]">potential</span>
            </h2>
            <p className="text-sm text-slate-400">10% on monthly · 15% on yearly · First 12 months per referral.</p>
          </motion.div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(201,166,70,0.15)' }}
          >
            {/* Header */}
            <div
              className="grid grid-cols-4 gap-0 px-5 py-3 text-xs font-semibold"
              style={{ background: 'rgba(201,166,70,0.08)' }}
            >
              <span className="text-[#C9A646]">Referrals</span>
              <span className="text-slate-400">Plan</span>
              <span className="text-slate-400 text-right">Monthly</span>
              <span className="text-slate-400 text-right">Yearly</span>
            </div>
            {/* Rows */}
            {earningsExamples.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-4 gap-0 px-5 py-3 border-t border-white/[0.04] text-sm"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
              >
                <span className="text-white font-bold">{row.referrals}</span>
                <span className="text-slate-400 text-xs">{row.plan}</span>
                <span className="text-emerald-400 font-semibold text-right">{row.monthly}</span>
                <span className="text-[#C9A646] font-bold text-right">{row.yearly}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ALL BENEFITS ========== */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

        <div className="max-w-2xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="text-white">Why affiliates </span>
              <span className="text-[#C9A646]">love us</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-3">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,166,70,0.08)',
                }}
              >
                <CheckCircle className="w-4 h-4 text-[#C9A646] shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C9A646]/[0.15] rounded-full blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

        <div className="max-w-2xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-white">Start earning </span>
              <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">
                Today.
              </span>
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              Free to join. No minimum requirements. Start sharing and earning in minutes.
            </p>
            <button
              onClick={() => navigate('/auth/register?affiliate=true')}
              className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold rounded-xl transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 8px 40px rgba(201,166,70,0.35)',
              }}
            >
              Join the Affiliate Program
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-600 text-xs mt-3">No credit card · No obligations · Start in 30 seconds</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AffiliatePage;