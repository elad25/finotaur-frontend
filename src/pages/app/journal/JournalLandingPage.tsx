// src/pages/app/journal/JournalLandingPage.tsx
// =====================================================
// 🔥 JOURNAL LANDING PAGE - For users without journal access
// =====================================================
// 
// This page is shown to users who:
// - Have account_type = 'free' or null
// - Don't have platform_bundle_journal_granted = true
// 
// Structure:
// 1. Hero - Compelling intro with CTA
// 2. CoreSystem - 12 journal features
// 3. AISection - AI capabilities showcase
// 4. DesignPhilosophy - Premium positioning
// 5. Pricing - Basic/Premium plans with Whop checkout
// 6. Testimonials - Social proof
// 7. Vision - Quote block
// 8. Footer - Final CTA + Legal
// =====================================================

import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  LogIn, 
  Lock, 
  TrendingUp,
  LayoutDashboard, 
  Plus, 
  BookText, 
  Target, 
  BarChart3, 
  Calendar,
  MessageSquare,
  FileText,
  Users,
  GraduationCap,
  Headphones,
  Settings,
  Brain,
  Sparkles,
  Star,
  Award,
  Zap,
  Shield,
  Clock,
  Check
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { LegalFooter } from "@/components/legal";
import PaymentPopup from '@/components/PaymentPopup';
import { useAffiliateDiscount } from '@/features/affiliate/hooks/useAffiliateDiscount';

type PlanId = 'basic' | 'premium';

// =====================================================
// HERO SECTION
// =====================================================
const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
      {/* Luxury Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0C0C0E] via-[#1A1713] to-[#0D1118]" />
      
      {/* Breathing Gold Orbs */}
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.08] rounded-full blur-[140px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite', animationDelay: '3s' }} />

      {/* 🔥 Return to Finotaur Button - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          to="/app/top-secret"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <ArrowRight className="w-4 h-4 text-slate-400 rotate-180 group-hover:text-[#C9A646] transition-colors" />
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            Return to Finotaur
          </span>
        </Link>
      </motion.div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-16 mt-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full backdrop-blur-xl">
            <BookText className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm tracking-wide">Professional Trading Journal</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text */}
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

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                className="group px-8 py-7 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
                style={{ boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}
              >
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Trust Badges */}
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

          {/* Right Column - Calendar Screenshot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-transparent rounded-3xl blur-3xl opacity-60" />
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl"
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 80px rgba(201, 166, 70, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
                
                <img 
                  src="/assets/finotaur-calender.png" 
                  alt="Finotaur Trading Calendar"
                  className="w-full h-auto"
                  style={{ filter: 'brightness(0.95) contrast(1.1)' }}
                />
                
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
// CORE SYSTEM SECTION
// =====================================================
const features = [
  { icon: LayoutDashboard, title: "Dashboard", description: "Your personal command center. Get a full overview of your performance, key KPIs, and AI insights at a glance." },
  { icon: Plus, title: "Add Trade", description: "Quickly log trades with precision — auto-detect direction, calculate risk/reward, and attach notes or screenshots." },
  { icon: BookText, title: "Trades Journal", description: "A professional trading diary. Filter, tag, and review every trade. Identify patterns in your behavior and performance." },
  { icon: Target, title: "My Strategies", description: "Build, track, and optimize your trading strategies. Compare live results and discover what truly works." },
  { icon: BarChart3, title: "Statistics", description: "Deep performance analytics: Win rate, Profit Factor, Expectancy, Max Drawdown, Equity Curve, and more." },
  { icon: Calendar, title: "Calendar", description: "Organize your trading week with a smart calendar that links sessions, trades, and results." },
  { icon: MessageSquare, title: "AI Chat", description: "Your personal trading assistant. Ask questions, analyze your data, and get insights powered by Finotaur AI." },
  { icon: FileText, title: "Scenarios & Plans", description: "Pre-plan trading days with scenario templates. Define conditions, key levels, and mental checklists." },
  { icon: Users, title: "Community Blog", description: "A shared space for traders to learn, share, and evolve together — powered by Finotaur's community engine." },
  { icon: GraduationCap, title: "Academy", description: "A structured learning environment with courses, guides, and live sessions to sharpen your trading edge." },
  { icon: Headphones, title: "Support", description: "Fast, professional help center and live chat. Always here to keep your trading smooth." },
  { icon: Settings, title: "Settings", description: "Full control over your experience — commissions, accounts, timezones, and personal preferences." }
];

const CoreSystemSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-[#D4BF8E]/[0.06] rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">The Core </span>
            <span className="text-[#C9A646]">System</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Every feature designed for precision, every module built for performance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                     style={{
                       background: 'rgba(201,166,70,0.15)',
                       border: '1px solid rgba(201,166,70,0.3)',
                       boxShadow: '0 4px 16px rgba(201,166,70,0.15)'
                     }}>
                  <feature.icon className="h-6 w-6 text-[#C9A646]" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-[#C9A646] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
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

const AISection = () => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const currentInsight = insights[currentInsightIndex];

  useEffect(() => {
    if (isTyping) {
      if (displayedText.length < currentInsight.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentInsight.slice(0, displayedText.length + 1));
        }, 30);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => {
          setDisplayedText("");
          setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
          setIsTyping(true);
        }, 3000);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-[#C9A646]" />
            <Sparkles className="h-6 w-6 text-[#C9A646] animate-pulse" />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">AI-Powered </span>
            <span className="text-[#C9A646]">Intelligence</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            FINOTAUR isn't just data — it thinks with you.<br />
            Our AI engine analyzes your journal, stats, and behavior to generate insights that transform you into a better trader.
          </p>
        </motion.div>

        {/* AI Typing Bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="p-8 max-w-3xl mx-auto relative overflow-hidden rounded-2xl"
               style={{
                 background: 'rgba(255, 255, 255, 0.03)',
                 backdropFilter: 'blur(12px)',
                 border: '2px solid rgba(201,166,70,0.4)',
                 boxShadow: '0 0 60px rgba(201,166,70,0.3)'
               }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/5 via-[#C9A646]/10 to-[#C9A646]/5" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#C9A646]/20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(201,166,70,0.2)', border: '1px solid rgba(201,166,70,0.4)' }}>
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
                  <motion.p
                    key={currentInsightIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-lg md:text-xl leading-relaxed text-slate-200 font-medium"
                  >
                    "{displayedText}"
                    {isTyping && displayedText.length < currentInsight.length && (
                      <span className="inline-block w-0.5 h-5 bg-[#C9A646] ml-1 animate-pulse" />
                    )}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="mt-6 pt-4 border-t border-[#C9A646]/20 flex items-center justify-between">
                <div className="flex gap-2">
                  {insights.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentInsightIndex ? 'w-8 bg-[#C9A646]' : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-slate-500">{currentInsightIndex + 1} of {insights.length} insights</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Pattern Recognition", description: "AI detects hidden patterns in your trading behavior that you'd never spot manually" },
            { title: "Risk Alerts", description: "Real-time warnings before emotional trading destroys your account" },
            { title: "Strategy Optimization", description: "AI recommends which setups to focus on based on your actual performance" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="group p-6 transition-all duration-300 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
              }}
            >
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
// DESIGN PHILOSOPHY SECTION
// =====================================================
const DesignPhilosophySection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#D4BF8E]/[0.06] rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Design </span>
              <span className="text-[#C9A646]">Philosophy</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              FINOTAUR was built for professionals who value both performance and beauty.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Every pixel, chart, and interaction is designed for focus, confidence, and clarity.
            </p>
            
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
                   style={{
                     background: 'rgba(255, 255, 255, 0.03)',
                     backdropFilter: 'blur(8px)',
                     border: '1px solid rgba(255, 255, 255, 0.08)',
                     borderLeft: `4px solid rgba(201,166,70,${1 - index * 0.3})`,
                     boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
                   }}>
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
};

// =====================================================
// PRICING SECTION - With Whop Checkout
// =====================================================
type BillingInterval = 'monthly' | 'yearly';

const plans = [
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: "$19.99",
    yearlyPrice: "$149",
    yearlyMonthlyEquivalent: "$12.42",
    description: "Essential tools + automatic broker sync",
    trialDays: 14,
    features: [
      "14-day free trial",
      "Broker sync (12,000+ brokers) - Coming soon",
      "25 trades/month (manual + auto-sync)",
      "Full performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Advanced statistics & metrics",
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
    name: "Premium",
    monthlyPrice: "$39.99",
    yearlyPrice: "$299",
    yearlyMonthlyEquivalent: "$24.92",
    description: "Unlimited everything + AI intelligence",
    features: [
      "Everything in Basic, plus:",
      "Unlimited trades",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Backtesting system",
      "Priority support",
      "Early access to new features",
      "🔜 Coming Soon: Auto broker sync",
    ],
    cta: "Get Premium",
    featured: true,
    savings: "Save 38%",
  },
];

const PricingSection = () => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');

  // 🔥 AFFILIATE DISCOUNT HOOK
  const {
    isLoading: discountLoading,
    hasDiscount,
    discountInfo,
  } = useAffiliateDiscount(selectedPlan, billingInterval);

  const handlePlanClick = (planId: string) => {
    if (planId === 'basic' || planId === 'premium') {
      setSelectedPlan(planId as PlanId);
      setShowPaymentPopup(true);
    }
  };

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (billingInterval === 'monthly') {
      return { price: `${plan.monthlyPrice}`, period: "/month" };
    } else {
      return { price: `${plan.yearlyMonthlyEquivalent}`, period: "/month", billedAs: `Billed $${plan.yearlyPrice}/year` };
    }
  };

  return (
    <>
      {/* Payment Popup */}
      {showPaymentPopup && (
        <PaymentPopup
          isOpen={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          planId={selectedPlan}
          billingInterval={billingInterval}
          discountInfo={hasDiscount ? discountInfo : undefined}
        />
      )}

      <section id="pricing" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#1E1B16] to-[#0B0B0B]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/12 rounded-full blur-[160px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Choose Your </span>
              <span className="text-[#C9A646]">Power Tier</span>
            </h2>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto mb-6"
            >
              <div className="p-6 rounded-2xl relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)',
                     backdropFilter: 'blur(12px)',
                     border: '2px solid rgba(201,166,70,0.4)',
                     boxShadow: '0 0 40px rgba(201,166,70,0.3)'
                   }}>
                <div className="flex items-start gap-4 relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                       style={{ background: 'rgba(201,166,70,0.2)', border: '1px solid rgba(201,166,70,0.4)' }}>
                    <Shield className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">Try Basic free for 14 days</h3>
                    <p className="text-slate-300 text-lg leading-relaxed">
                      If Finotaur doesn't show a pattern that's hurting you within 14 days, cancel anytime — no charge.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <p className="text-lg text-slate-400">No commitment required • Cancel anytime during trial</p>
          </motion.div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5 shadow-xl">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                  billingInterval === 'monthly'
                    ? 'bg-[#C9A646] text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingInterval === 'yearly'
                    ? 'bg-[#C9A646] text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">Save up to 38%</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-8">
            {plans.map((plan, index) => {
              const displayPrice = getDisplayPrice(plan);
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`p-8 relative transition-all duration-300 flex flex-col rounded-2xl ${plan.featured ? 'md:scale-[1.05]' : ''}`}
                  style={{
                    background: plan.featured 
                      ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: plan.featured ? '2px solid rgba(201,166,70,0.6)' : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: plan.featured
                      ? '0 12px 50px rgba(201,166,70,0.5), 0 4px 20px rgba(0,0,0,0.5)'
                      : '0 6px 35px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {/* Badges */}
                  {plan.featured && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap z-50"
                         style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000' }}>
                      <TrendingUp className="w-4 h-4" />
                      Most Popular
                    </div>
                  )}

                  {plan.trialDays && !plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap bg-blue-500 text-white shadow-lg z-50">
                      <Clock className="w-4 h-4" />
                      14-Day Free Trial
                    </div>
                  )}

                  {plan.savings && billingInterval === 'yearly' && (
                    <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-50">
                      {plan.savings}
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="text-center mb-8 mt-4">
                    <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                    <div className="flex flex-col items-center justify-center gap-1 mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                          {displayPrice.price}
                        </span>
                        <span className="text-slate-400">{displayPrice.period}</span>
                      </div>
                      {displayPrice.billedAs && <span className="text-sm text-slate-500">{displayPrice.billedAs}</span>}
                      {plan.trialDays && (
                        <span className="text-sm text-blue-400 font-medium mt-1">
                          First 14 days free, then {displayPrice.price}{displayPrice.period}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'} flex items-center justify-center shrink-0 mt-0.5`}
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
                        ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] text-black font-bold hover:scale-[1.02]' 
                        : 'border-2 border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-white hover:scale-[1.02]'
                    }`}
                    size="lg"
                    onClick={() => handlePlanClick(plan.id)}
                    style={plan.featured ? { boxShadow: '0 6px 30px rgba(201,166,70,0.5)' } : {}}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">Bank-grade security</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm">14-Day Free Trial on Basic</span>
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
      </section>
    </>
  );
};

// =====================================================
// TESTIMONIALS SECTION
// =====================================================
const testimonials = [
  {
    name: "Private Beta Trader",
    role: "Funded Account Manager",
    avatar: "PB",
    rating: 5,
    quote: "Finotaur showed me I was overtrading Mondays by 3x. Fixed that one pattern and added $4,200 to my P&L in 30 days. The AI insights are legitimately game-changing.",
    metric: "P&L Increase",
    metricValue: "+$4.2K",
    icon: TrendingUp
  },
  {
    name: "Early Access User",
    role: "Day Trader • Futures",
    avatar: "EA",
    rating: 5,
    quote: "I thought I had discipline until Finotaur showed me my actual data. The calendar view made it painfully obvious when I revenge trade. Now I just... don't.",
    metric: "Win Rate",
    metricValue: "+23%",
    icon: Target
  },
  {
    name: "Beta Tester",
    role: "Prop Firm Trader",
    avatar: "BT",
    rating: 5,
    quote: "Best trading journal I've used, period. The Bloomberg-style interface feels professional, and the AI catches patterns I'd never spot manually. Worth every penny.",
    metric: "Consistency",
    metricValue: "12 Green Weeks",
    icon: Award
  },
  {
    name: "Internal Testing",
    role: "Swing Trader • Equities",
    avatar: "IT",
    rating: 5,
    quote: "The strategy tracker is incredible. It proved my breakout setup loses money 65% of the time. Dropped it completely, focused on mean reversion, and haven't looked back.",
    metric: "Strategy Focus",
    metricValue: "3 → 1 Setup",
    icon: Zap
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C9A646]/12 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#D4BF8E]/[0.08] rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">Trusted by </span><span className="text-[#C9A646]">Winning Traders</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Real results from traders who turned data into discipline
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full relative overflow-hidden rounded-2xl"
                   style={{
                     background: 'rgba(255, 255, 255, 0.03)',
                     backdropFilter: 'blur(12px)',
                     border: '1px solid rgba(255, 255, 255, 0.05)',
                     boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
                   }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-[#C9A646] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 p-8 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#C9A646]/30 rounded-xl blur-md group-hover:blur-lg transition-all" />
                        <div className="relative w-16 h-16 rounded-xl flex items-center justify-center text-[#C9A646] font-bold text-xl shadow-lg"
                             style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(201,166,70,0.1) 100%)', border: '1px solid rgba(201,166,70,0.3)' }}>
                          {testimonial.avatar}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-[#C9A646] transition-colors">{testimonial.name}</h3>
                        <p className="text-sm text-slate-400">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                      ))}
                    </div>
                  </div>

                  <blockquote className="text-slate-300 leading-relaxed mb-6 flex-1 text-lg">
                    "{testimonial.quote}"
                  </blockquote>

                  {testimonial.metric && testimonial.metricValue && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#C9A646]/5 rounded-xl blur-sm" />
                      <div className="relative flex items-center gap-4 pt-6 border-t border-white/5">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all"
                             style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.3)' }}>
                          <testimonial.icon className="w-6 h-6 text-[#C9A646]" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-500 mb-1 font-medium uppercase tracking-wider">{testimonial.metric}</div>
                          <div className="text-3xl font-bold text-[#C9A646]">{testimonial.metricValue}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-20"
        >
          <div className="inline-flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs text-[#C9A646] font-bold shadow-lg"
                    style={{ zIndex: 10 - i, borderColor: '#0C0C0E', background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(15,15,15,1) 100%)' }}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-left ml-2">
                <div className="text-white font-semibold">5,000+ Elite Traders</div>
                <div className="text-sm text-slate-400">Improving their edge daily</div>
              </div>
            </div>

            <Button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black font-bold rounded-xl transition-all duration-500 hover:scale-105"
              style={{ boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}
            >
              Start your transformation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

// =====================================================
// VISION SECTION
// =====================================================
const VisionSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#C9A646]/5 to-[#0a0a0a]" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-8">
          The <span className="text-[#C9A646]">FINOTAUR</span> Vision
        </h2>
        
        <p className="text-xl text-slate-400 leading-relaxed mb-8">
          Our mission is to redefine how traders interact with their data.
        </p>
        
        <p className="text-xl leading-relaxed mb-12 text-white">
          We believe in <span className="text-[#C9A646] font-semibold">intelligence</span>, not luck. 
          <span className="text-[#C9A646] font-semibold"> Precision</span>, not chaos.
        </p>

        <div className="relative">
          <div className="p-12 rounded-2xl"
               style={{
                 background: 'rgba(255, 255, 255, 0.03)',
                 backdropFilter: 'blur(8px)',
                 border: '1px solid rgba(255, 255, 255, 0.08)',
                 borderTop: '4px solid #C9A646',
                 boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
               }}>
            <p className="text-3xl md:text-4xl font-light italic leading-relaxed text-slate-300">
              "Trading mastery begins with self-awareness — <span className="text-[#C9A646] font-semibold">Finotaur</span> gives you the mirror."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// =====================================================
// FOOTER SECTION
// =====================================================
const FooterSection = () => {
  return (
    <footer className="relative overflow-hidden">
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#C9A646]/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C9A646]/20 rounded-full blur-[150px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            Ready to Trade <span className="text-[#C9A646]">Smarter</span>?
          </h2>
          
          <p className="text-xl text-slate-400 mb-12">
            Join thousands of traders who've transformed their performance with FINOTAUR
          </p>
          
          <Button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            size="lg"
            className="group px-10 py-6 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
            style={{ boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}
          >
            Start 14-Day Free Trial
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      <div className="border-t border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-400 mb-2">Luxury design. Real data. Smarter trading.</p>
          <p className="text-sm text-slate-500">© 2025 FINOTAUR — All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const JournalLandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <HeroSection />
      <CoreSystemSection />
      <AISection />
      <DesignPhilosophySection />
      <PricingSection />
      <TestimonialsSection />
      <VisionSection />
      <FooterSection />
      <LegalFooter />
    </div>
  );
};

export default JournalLandingPage;