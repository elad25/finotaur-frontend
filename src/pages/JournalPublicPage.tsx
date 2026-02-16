// src/pages/JournalPublicPage.tsx
// =====================================================
// 🔥 PUBLIC JOURNAL LANDING PAGE
// Identical to JournalLandingPage but with main Navbar
// Route: /journal (public, no auth needed)
// =====================================================

import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Lock, 
  TrendingUp,
  BookText, 
  Brain,
  Sparkles,
  Star,
  Award,
  Zap,
  Target,
  Shield,
  Clock,
  Check,
  Quote,
  Gift
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Navbar from '@/components/landing-new/Navbar';
import Footer from '@/components/landing-new/Footer';
import PaymentPopup from '@/components/PaymentPopup';
import { useAffiliateDiscount } from '@/features/affiliate/hooks/useAffiliateDiscount';

type PlanId = 'basic' | 'premium';

// =====================================================
// HERO SECTION
// =====================================================
const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-24 pb-20">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0C0C0E] via-[#1A1713] to-[#0D1118]" />
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.08] rounded-full blur-[140px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite', animationDelay: '3s' }} />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full backdrop-blur-xl">
            <BookText className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm tracking-wide">Professional Trading Journal</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05] tracking-tight">
                <span className="text-white block">Transform Trading Into</span>
                <span className="relative inline-block mt-2">
                  <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{ animationDuration: '4s' }} />
                  <span className="relative text-[#C9A646] bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                    Pure Profit
                  </span>
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate-300 leading-relaxed font-light max-w-xl"
            >
              In 10 trades, Finotaur shows what's quietly killing your P&L — and how to fix it.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button 
                onClick={() => document.getElementById('journal-pricing')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                className="group px-8 py-7 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
                style={{ boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}
              >
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap items-center gap-6"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <TrendingUp className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-white font-bold text-base">5,000+</div>
                  <div className="text-slate-400 text-xs">Elite Traders</div>
                </div>
              </div>
              <div className="w-px h-10 bg-[#C9A646]/30" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Lock className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <span className="text-slate-300 font-medium text-sm">Bank-grade security</span>
              </div>
              <div className="w-px h-10 bg-[#C9A646]/30" />
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <TrendingUp className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[#C9A646] font-bold text-base">87%</div>
                  <div className="text-slate-400 text-xs">Win Rate Boost</div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-transparent rounded-3xl blur-3xl opacity-60" />
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl"
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 80px rgba(201, 166, 70, 0.2)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
                <img src="/assets/finotaur-calender.png" alt="Finotaur Trading Calendar" className="w-full h-auto" style={{ filter: 'brightness(0.95) contrast(1.1)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#C9A646]/10 to-transparent pointer-events-none" />
                <div className="absolute top-6 right-6 z-20">
                  <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Live Platform</span>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="absolute -bottom-8 -left-8 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 shadow-2xl"
                style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-emerald-400">+$45,335</div>
                    <div className="text-xs text-zinc-400 font-medium">This month</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};



// =====================================================
// AI SECTION
// =====================================================
const insights = [
  "Your average win rate increases 12% when trading after 2 PM.",
  "You over-risk on Mondays — reduce lot by 20%.",
  "Strategy Alpha shows 3x higher expectancy than Beta.",
  "You win 65% of trades after 2 PM — focus sessions then.",
  "Revenge trading costs you $1,200/month on average."
];

const JournalAISection = () => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const currentInsight = insights[currentInsightIndex];

  useEffect(() => {
    if (isTyping) {
      if (displayedText.length < currentInsight.length) {
        const timeout = setTimeout(() => { setDisplayedText(currentInsight.slice(0, displayedText.length + 1)); }, 30);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => { setDisplayedText(""); setCurrentInsightIndex((prev) => (prev + 1) % insights.length); setIsTyping(true); }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [displayedText, isTyping, currentInsight]);

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-[#C9A646]" />
            <Sparkles className="h-6 w-6 text-[#C9A646] animate-pulse" />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">AI-Powered </span><span className="text-[#C9A646]">Intelligence</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            FINOTAUR isn't just data — it thinks with you.<br />Our AI engine analyzes your journal, stats, and behavior to generate insights that transform you into a better trader.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="mb-12">
          <div className="p-8 max-w-3xl mx-auto relative overflow-hidden rounded-2xl"
            style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '2px solid rgba(201,166,70,0.4)', boxShadow: '0 0 60px rgba(201,166,70,0.3)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/5 via-[#C9A646]/10 to-[#C9A646]/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#C9A646]/20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.2)', border: '1px solid rgba(201,166,70,0.4)' }}>
                  <Brain className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    Finotaur AI
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Analyzing your trading patterns...</div>
                </div>
              </div>
              <div className="min-h-[60px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.p key={currentInsightIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-lg md:text-xl leading-relaxed text-slate-200 font-medium">
                    "{displayedText}"
                    {isTyping && displayedText.length < currentInsight.length && <span className="inline-block w-0.5 h-5 bg-[#C9A646] ml-1 animate-pulse" />}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-6 pt-4 border-t border-[#C9A646]/20 flex items-center justify-between">
                <div className="flex gap-2">
                  {insights.map((_, idx) => (
                    <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentInsightIndex ? 'w-8 bg-[#C9A646]' : 'w-2 bg-slate-700'}`} />
                  ))}
                </div>
                <div className="text-xs text-slate-500">{currentInsightIndex + 1} of {insights.length} insights</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Pattern Recognition", description: "AI detects hidden patterns in your trading behavior that you'd never spot manually" },
            { title: "Risk Alerts", description: "Real-time warnings before emotional trading destroys your account" },
            { title: "Strategy Optimization", description: "AI recommends which setups to focus on based on your actual performance" }
          ].map((feature, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + index * 0.1 }}
              className="group p-6 transition-all duration-300 rounded-2xl relative overflow-hidden"
              style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: 'rgba(201,166,70,0.2)', border: '1px solid rgba(201,166,70,0.3)' }}>
                  <Sparkles className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-[#C9A646] transition-colors">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

// =====================================================
// DESIGN PHILOSOPHY
// =====================================================
const DesignPhilosophySection = () => (
  <section className="py-24 px-4 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]" />
    <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#D4BF8E]/[0.06] rounded-full blur-[120px]" />
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">Design </span><span className="text-[#C9A646]">Philosophy</span>
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed">FINOTAUR was built for professionals who value both performance and beauty.</p>
          <p className="text-lg text-slate-400 leading-relaxed">Every pixel, chart, and interaction is designed for focus, confidence, and clarity.</p>
          <div className="relative pl-6 border-l-2 border-[#C9A646] py-4 mt-8">
            <p className="text-2xl md:text-3xl font-light italic leading-relaxed text-slate-300">
              "Data becomes powerful only when it's understood — that's where <span className="text-[#C9A646] font-semibold">Finotaur</span> shines."
            </p>
          </div>
        </div>
        <div className="space-y-6">
          {[
            { title: "Precision by Design", description: "Clean lines, elegant typography, and intuitive navigation create an environment where you can focus on what matters — your trading decisions." },
            { title: "Dark Luxury Aesthetic", description: "Inspired by Bloomberg terminals and luxury automotive design, our interface reduces eye strain while maintaining premium aesthetics." },
            { title: "Data Clarity", description: "Advanced data visualization transforms complex trading metrics into actionable insights at a glance." }
          ].map((item, index) => (
            <div key={index} className="p-8 rounded-2xl relative overflow-hidden"
              style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderLeft: `4px solid rgba(201,166,70,${1 - index * 0.3})`, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.05] via-transparent to-transparent" />
              <div className="relative">
                <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// =====================================================
// PRICING SECTION
// =====================================================
type BillingInterval = 'monthly' | 'yearly';

const plans = [
  {
    id: "basic", name: "Basic", monthlyPrice: "$19.99", yearlyPrice: "$149", yearlyMonthlyEquivalent: "$12.42",
    description: "Essential tools + automatic broker sync", trialDays: 14,
    features: ["14-day free trial", "Broker sync (12,000+ brokers) - Coming soon", "25 trades/month (manual + auto-sync)", "Full performance analytics", "Strategy builder & tracking", "Calendar & trading sessions", "Advanced statistics & metrics", "Equity curve & charts", "Trade screenshots & notes", "Email support"],
    cta: "Start 14-Day Free Trial", featured: false, savings: "Save 38%",
  },
  {
    id: "premium", name: "Premium", monthlyPrice: "$39.99", yearlyPrice: "$299", yearlyMonthlyEquivalent: "$24.92",
    description: "Unlimited everything + AI intelligence",
    features: ["Everything in Basic, plus:", "Unlimited trades", "AI-powered insights & coach", "Advanced AI analysis", "Pattern recognition", "Custom AI reports", "Behavioral risk alerts", "Backtesting system", "Priority support", "Early access to new features", "🔜 Coming Soon: Auto broker sync"],
    cta: "Get Premium", featured: true, savings: "Save 38%",
  },
];

const PricingSection = () => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');
  const { isLoading: discountLoading, hasDiscount, discountInfo } = useAffiliateDiscount(selectedPlan, billingInterval);

  const handlePlanClick = (planId: string) => {
    if (planId === 'basic' || planId === 'premium') { setSelectedPlan(planId as PlanId); setShowPaymentPopup(true); }
  };

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (billingInterval === 'monthly') return { price: plan.monthlyPrice, period: "/month" };
    return { price: plan.yearlyMonthlyEquivalent, period: "/month", billedAs: `Billed $${plan.yearlyPrice}/year` };
  };

  return (
    <>
      {showPaymentPopup && (
        <PaymentPopup isOpen={showPaymentPopup} onClose={() => setShowPaymentPopup(false)} planId={selectedPlan} billingInterval={billingInterval} discountInfo={hasDiscount ? discountInfo : undefined} />
      )}
      <section id="journal-pricing" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#1E1B16] to-[#0B0B0B]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/12 rounded-full blur-[160px]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Choose Your </span><span className="text-[#C9A646]">Power Tier</span>
            </h2>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto mb-6">
              <div className="p-6 rounded-2xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)', backdropFilter: 'blur(12px)', border: '2px solid rgba(201,166,70,0.4)', boxShadow: '0 0 40px rgba(201,166,70,0.3)' }}>
                <div className="flex items-start gap-4 relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,166,70,0.2)', border: '1px solid rgba(201,166,70,0.4)' }}>
                    <Shield className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">Try Basic free for 14 days</h3>
                    <p className="text-slate-300 text-lg leading-relaxed">If Finotaur doesn't show a pattern that's hurting you within 14 days, cancel anytime — no charge.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <p className="text-lg text-slate-400">No commitment required • Cancel anytime during trial</p>
          </motion.div>

          <div className="flex justify-center mb-16">
            <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5 shadow-xl">
              <button onClick={() => setBillingInterval('monthly')} className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${billingInterval === 'monthly' ? 'bg-[#C9A646] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
              <button onClick={() => setBillingInterval('yearly')} className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${billingInterval === 'yearly' ? 'bg-[#C9A646] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                Yearly <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">Save up to 38%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-8">
            {plans.map((plan, index) => {
              const displayPrice = getDisplayPrice(plan);
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + index * 0.1 }}
                  className={`p-8 relative transition-all duration-300 flex flex-col rounded-2xl ${plan.featured ? 'md:scale-[1.05]' : ''}`}
                  style={{
                    background: plan.featured ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                    backdropFilter: 'blur(20px)', border: plan.featured ? '2px solid rgba(201,166,70,0.6)' : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: plan.featured ? '0 12px 50px rgba(201,166,70,0.5), 0 4px 20px rgba(0,0,0,0.5)' : '0 6px 35px rgba(0, 0, 0, 0.5)'
                  }}>
                  {plan.featured && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap z-50"
                      style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000' }}>
                      <TrendingUp className="w-4 h-4" /> Most Popular
                    </div>
                  )}
                  {plan.trialDays && !plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap bg-blue-500 text-white shadow-lg z-50">
                      <Clock className="w-4 h-4" /> 14-Day Free Trial
                    </div>
                  )}
                  {plan.savings && billingInterval === 'yearly' && (
                    <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-50">{plan.savings}</div>
                  )}
                  <div className="text-center mb-8 mt-4">
                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="flex flex-col items-center justify-center gap-1 mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>{displayPrice.price}</span>
                        <span className="text-slate-400">{displayPrice.period}</span>
                      </div>
                      {displayPrice.billedAs && <span className="text-sm text-slate-500">{displayPrice.billedAs}</span>}
                      {plan.trialDays && <span className="text-sm text-blue-400 font-medium mt-1">First 14 days free, then {displayPrice.price}{displayPrice.period}</span>}
                    </div>
                    <p className="text-slate-400">{plan.description}</p>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'} flex items-center justify-center shrink-0 mt-0.5`} style={{ border: '1px solid rgba(201,166,70,0.4)' }}>
                          <Check className="h-3 w-3 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.featured ? "default" : "outline"}
                    className={`w-full ${plan.featured ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] text-black font-bold hover:scale-[1.02]' : 'border-2 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-white hover:scale-[1.02]'}`}
                    size="lg" onClick={() => handlePlanClick(plan.id)} style={plan.featured ? { boxShadow: '0 6px 30px rgba(201,166,70,0.5)' } : {}}>
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-16 space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A646]" /><span className="text-sm">Bank-grade security</span></div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /><span className="text-sm">14-Day Free Trial on Basic</span></div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#C9A646]" /><span className="text-sm">Cancel anytime</span></div>
            </div>
            <div className="text-center"><p className="text-sm text-slate-500 max-w-2xl mx-auto">Your data stays yours. We never sell your information. Cancel with one click, no questions asked.</p></div>
          </div>
        </div>
      </section>
    </>
  );
};

// =====================================================
// FINOTAUR VALUE STACK — Push users to $109 full platform
// =====================================================
const finotaurValueItems = [
  { name: "AI Stock Analyzer (7/day)", value: "$99" },
  { name: "AI Sector Analyzer (unlimited)", value: "$79" },
  { name: "Options Intelligence AI", value: "$149" },
  { name: "AI Scanner", value: "$59" },
  { name: "War Zone Newsletter (daily)", value: "$69.99" },
  { name: "Top Secret Reports", value: "$89.99" },
  { name: "Trading Journal Premium", value: "$49", highlighted: true },
  { name: "Macro Analyzer", value: "$49" },
  { name: "Priority 24h Support", value: "$29" },
];

const FinotaurValueStack = () => {
  const navigate = useNavigate();
  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[130px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C9A646]/10 border border-[#C9A646]/25 rounded-full mb-3">
            <Gift className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-xs">Why Pay More?</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
            <span className="text-white">The Journal is included in </span>
            <span className="text-[#C9A646]">Finotaur</span>
          </h2>
          <p className="text-sm text-slate-400">
            For $109/month you get the Trading Journal <span className="text-white font-medium">+ everything below</span> — one platform, zero compromise.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(201,166,70,0.05) 0%, rgba(10,10,10,0.97) 100%)', border: '1px solid rgba(201,166,70,0.2)', boxShadow: '0 0 40px rgba(201,166,70,0.06)' }}>
          <div className="p-5">
            <div className="mb-4">
              {finotaurValueItems.map((item, index) => (
                <div key={index} className={`flex items-center justify-between py-2 border-b border-white/[0.03] last:border-none ${item.highlighted ? 'bg-[#C9A646]/[0.06] -mx-5 px-5 rounded-lg' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <Check className={`w-4 h-4 shrink-0 ${item.highlighted ? 'text-emerald-400' : 'text-[#C9A646]'}`} />
                    <span className={`text-sm font-medium ${item.highlighted ? 'text-[#C9A646] font-bold' : 'text-white'}`}>
                      {item.name}
                      {item.highlighted && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">INCLUDED</span>}
                    </span>
                  </div>
                  <span className="text-slate-500 line-through text-xs font-mono">{item.value}/mo</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#C9A646]/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-sm">Total if purchased separately:</span>
                <span className="text-slate-500 line-through text-base font-mono">$672/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-base">You pay:</span>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-[#C9A646]">$109</span>
                  <span className="text-slate-400 text-sm mb-0.5">/month</span>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Save 84% — $563/month in your pocket
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/auth/register')}
              className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mt-5"
              style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.25)' }}>
              Get Full Access — 14 Days Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-slate-600 text-[10px] mt-1.5">Cancel anytime • Includes Trading Journal Premium</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// =====================================================
// TESTIMONIALS — Auto-scrolling carousel (matches main landing)
// =====================================================
const journalTestimonials = [
  { id: 1, name: "David Chen", role: "Funded Account Manager", avatar: "DC", text: "Finotaur showed me I was overtrading Mondays by 3x. Fixed that one pattern and added $4,200 to my P&L in 30 days. The AI insights are legitimately game-changing.", highlight: "legitimately game-changing", metric: "P&L Increase", metricValue: "+$4.2K", icon: TrendingUp },
  { id: 2, name: "Sarah Mitchell", role: "Day Trader • Futures", avatar: "SM", text: "I thought I had discipline until Finotaur showed me my actual data. The calendar view made it painfully obvious when I revenge trade. Now I just... don't.", highlight: "showed me my actual data", metric: "Win Rate", metricValue: "+23%", icon: Target },
  { id: 3, name: "Alex Thompson", role: "Prop Firm Trader", avatar: "AT", text: "Best trading journal I've used, period. The Bloomberg-style interface feels professional, and the AI catches patterns I'd never spot manually. Worth every penny.", highlight: "Best trading journal I've used", metric: "Consistency", metricValue: "12 Green Weeks", icon: Award },
  { id: 4, name: "Michael Rodriguez", role: "Swing Trader • Equities", avatar: "MR", text: "The strategy tracker is incredible. It proved my breakout setup loses money 65% of the time. Dropped it completely, focused on mean reversion, and haven't looked back.", highlight: "haven't looked back", metric: "Strategy Focus", metricValue: "3 → 1 Setup", icon: Zap },
  { id: 5, name: "Rachel Green", role: "Options Trader", avatar: "RG", text: "As someone who traded blindly for years, Finotaur is like someone turned on the lights in a dark room. The AI insights plus the journal — I can't imagine trading without it now.", highlight: "turned on the lights in a dark room", metric: "Monthly P&L", metricValue: "+$5.8K", icon: Target },
  { id: 6, name: "James Kim", role: "Portfolio Manager", avatar: "JK", text: "I started with the 14-day free trial and canceled all my other subscriptions. The AI analyzer alone is worth 10x the price. This is the real deal.", highlight: "canceled all my other subscriptions", metric: "ROI", metricValue: "10x Value", icon: Award },
];

const duplicatedTestimonials = [...journalTestimonials, ...journalTestimonials];

const TestimonialsSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const scrollSpeed = 0.5;
    const cardWidth = 400;
    const totalWidth = cardWidth * journalTestimonials.length;
    let animationId: number;
    const animate = () => {
      if (!isPaused) {
        scrollPositionRef.current += scrollSpeed;
        if (scrollPositionRef.current >= totalWidth) scrollPositionRef.current = 0;
        if (scrollContainer) scrollContainer.scrollLeft = scrollPositionRef.current;
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(highlight);
    if (parts.length < 2) return text;
    return <>{parts[0]}<span className="text-[#C9A646] font-semibold">{highlight}</span>{parts[1]}</>;
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <div className="flex justify-center gap-1.5 mb-6">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300 }}>
                <Star className="w-6 h-6 fill-[#D4AF37] text-[#D4AF37]" />
              </motion.div>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white italic">Real Traders. </span>
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Real Results.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Join hundreds of traders who turned data into discipline — and discipline into profit.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

          <div ref={scrollRef} className="flex gap-6 overflow-x-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} style={{ scrollBehavior: 'auto' }}>
            {duplicatedTestimonials.map((t, index) => (
              <div key={`${t.id}-${index}`} className="flex-shrink-0 w-[380px] p-6 rounded-2xl relative group transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.05), rgba(20,20,20,0.8))', border: '1px solid rgba(201,166,70,0.2)', backdropFilter: 'blur(10px)' }}>
                <Quote className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#C9A646] text-[#C9A646]" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  &ldquo;{highlightText(t.text, t.highlight)}&rdquo;
                </p>
                {t.metric && t.metricValue && (
                  <div className="flex items-center gap-3 mb-4 py-3 px-4 rounded-lg bg-[#C9A646]/[0.06] border border-[#C9A646]/15">
                    {t.icon && <t.icon className="w-5 h-5 text-[#C9A646]" />}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.metric}</div>
                      <div className="text-lg font-bold text-[#C9A646]">{t.metricValue}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #C9A646, #B8963F)', color: '#0a0a0a' }}>{t.avatar}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: '0 0 30px rgba(201,166,70,0.3)' }} />
              </div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: isPaused ? 0 : 0.5 }} className="text-center text-slate-600 text-sm mt-6">
            Hover to pause
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="text-center mt-12">
          <div className="inline-flex items-center gap-3">
            <div className="flex -space-x-3">
              {['DC', 'SM', 'AT', 'MR', 'RG'].map((initials, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] text-[#C9A646] font-bold"
                  style={{ zIndex: 10 - i, borderColor: '#0a0a0a', background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(15,15,15,1))' }}>{initials}</div>
              ))}
            </div>
            <div className="text-left ml-2">
              <div className="text-white font-semibold text-sm">847+ Elite Traders</div>
              <div className="text-xs text-slate-500">Trading smarter every day</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// =====================================================
// VISION
// =====================================================
const VisionSection = () => (
  <section className="py-24 px-4 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#C9A646]/5 to-[#0a0a0a]" />
    <div className="max-w-4xl mx-auto text-center relative z-10">
      <h2 className="text-4xl md:text-5xl font-bold mb-8">The <span className="text-[#C9A646]">FINOTAUR</span> Vision</h2>
      <p className="text-xl text-slate-400 leading-relaxed mb-8">Our mission is to redefine how traders interact with their data.</p>
      <p className="text-xl leading-relaxed mb-12 text-white">We believe in <span className="text-[#C9A646] font-semibold">intelligence</span>, not luck. <span className="text-[#C9A646] font-semibold">Precision</span>, not chaos.</p>
      <div className="p-12 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '4px solid #C9A646', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)' }}>
        <p className="text-3xl md:text-4xl font-light italic leading-relaxed text-slate-300">
          "Trading mastery begins with self-awareness — <span className="text-[#C9A646] font-semibold">Finotaur</span> gives you the mirror."
        </p>
      </div>
    </div>
  </section>
);

// =====================================================
// MAIN COMPONENT
// =====================================================
const JournalPublicPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; } }
        html { scroll-behavior: smooth; }
        ::selection { background-color: rgba(201,166,70,0.3); color: white; }
      `}</style>
      <Navbar />
      <HeroSection />
      <JournalAISection />
      <DesignPhilosophySection />
      <PricingSection />
      <FinotaurValueStack />
      <TestimonialsSection />
      <VisionSection />
      <Footer />
    </div>
  );
};

export default JournalPublicPage;