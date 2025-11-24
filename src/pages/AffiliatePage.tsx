import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Award,
  Zap,
  BarChart3,
  Gift,
  Sparkles,
  Trophy,
  Rocket
} from "lucide-react";

const AffiliatePage = () => {
  return (
    <div className="min-h-screen bg-black">
      {/* NAVBAR */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo - GOLD & WHITE for Visibility */}
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="text-2xl md:text-3xl font-bold tracking-tight">
                <span className="text-white group-hover:text-slate-300 transition-colors">FINO</span>
                <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span>
              </span>
            </Link>

            {/* Navigation Links - CLEAN & VISIBLE */}
            <div className="hidden md:flex items-center space-x-8">
              <a 
                href="/#features" 
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
              >
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
              </a>
              <a 
                href="/#pricing" 
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
              </a>
              <a 
                href="/#about" 
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
              >
                About
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
              </a>
              <Link 
                to="/affiliate" 
                className="text-[#C9A646] hover:text-[#D4AF37] transition-colors text-sm font-medium relative group"
              >
                Become An Affiliate
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A646]" />
              </Link>
            </div>

            {/* Auth Buttons - GOLD CTA */}
            <div className="flex items-center space-x-3">
              <Link to="/auth/login">
                <Button 
                  variant="ghost" 
                  className="text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Login
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button 
                  className="bg-gradient-to-r from-[#C9A646] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C9A646] text-black font-semibold shadow-lg shadow-[#C9A646]/30 hover:shadow-[#C9A646]/50 transition-all duration-300 hover:scale-105"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#C9A646]/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#C9A646]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C9A646]/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Elite Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-semibold tracking-wide">ELITE PARTNER PROGRAM</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="text-white">Become a </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] drop-shadow-[0_0_30px_rgba(201,166,70,0.3)]">
                FINOTAUR
              </span>
              <br />
              <span className="text-white">Partner</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-4xl mx-auto leading-relaxed">
              Earn More Than Any Trading Affiliate Program
            </p>
            
            <p className="text-lg text-slate-400 mb-10 max-w-3xl mx-auto">
              12-month commissions, volume bonuses, premium rewards — all in one elite program
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                size="lg"
                className="group relative bg-black border-2 border-[#C9A646] hover:bg-[#C9A646] text-[#C9A646] hover:text-black font-bold text-lg px-10 py-7 rounded-xl shadow-[0_0_30px_rgba(201,166,70,0.3)] hover:shadow-[0_0_50px_rgba(201,166,70,0.6)] transition-all duration-300 hover:scale-105"
              >
                Join the FINOTAUR Affiliate Program
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            {/* Stats Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-[#C9A646] mb-2">20%</div>
                <div className="text-sm text-slate-400">Max Commission</div>
              </div>
              <div className="text-center border-x border-white/10">
                <div className="text-3xl font-bold text-[#C9A646] mb-2">12mo</div>
                <div className="text-sm text-slate-400">Recurring Income</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#C9A646] mb-2">$1,400</div>
                <div className="text-sm text-slate-400">Max Bonuses</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* COMMISSION STRUCTURE */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C9A646]/5 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#C9A646] mb-4">
              Earn Up to 20% Monthly Commission
              <span className="relative group inline-block ml-2">
                <span className="text-[#C9A646] cursor-help text-2xl">*</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-4 bg-black/95 backdrop-blur-xl border border-[#C9A646]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="text-sm text-slate-300 text-left space-y-2">
                    <p className="font-semibold text-[#C9A646]">What counts as a paying client?</p>
                    <ul className="space-y-1 text-xs">
                      <li>• User who completed a paid subscription</li>
                      <li>• Has been active for at least 7 days</li>
                      <li>• Commission starts after 7-day trial period</li>
                    </ul>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#C9A646]/40" />
                </div>
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We reward performance. The more clients you bring — the higher your cut.
            </p>
          </motion.div>

          {/* Tier Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Tier 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-[#C9A646]/20 hover:border-[#C9A646]/50 transition-all duration-300 group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A646]/10 rounded-full blur-2xl group-hover:bg-[#C9A646]/20 transition-all" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">Tier 1</h3>
                  <Target className="w-8 h-8 text-[#C9A646]" />
                </div>
                
                <div className="text-sm text-slate-400 mb-4">0–20 paying clients</div>
                
                <div className="text-4xl font-bold text-[#C9A646] mb-2">10%</div>
                <div className="text-slate-300 mb-6">monthly commission</div>
                
                <div className="pt-6 border-t border-white/10">
                  <div className="text-sm text-slate-400">12 months recurring</div>
                </div>
              </div>
            </motion.div>

            {/* Tier 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border-2 border-[#C9A646]/40 hover:border-[#C9A646]/70 transition-all duration-300 group scale-105"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A646]/20 rounded-full blur-2xl group-hover:bg-[#C9A646]/30 transition-all" />
              
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C9A646] text-black text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">Tier 2</h3>
                  <Award className="w-8 h-8 text-[#C9A646]" />
                </div>
                
                <div className="text-sm text-slate-400 mb-4">20–75 paying clients</div>
                
                <div className="text-4xl font-bold text-[#C9A646] mb-2">15%</div>
                <div className="text-slate-300 mb-6">monthly commission</div>
                
                <div className="pt-6 border-t border-white/10">
                  <div className="text-sm text-slate-400">12 months recurring</div>
                </div>
              </div>
            </motion.div>

            {/* Tier 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-[#C9A646]/20 hover:border-[#C9A646]/50 transition-all duration-300 group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A646]/10 rounded-full blur-2xl group-hover:bg-[#C9A646]/20 transition-all" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">Tier 3</h3>
                  <Trophy className="w-8 h-8 text-[#C9A646]" />
                </div>
                
                <div className="text-sm text-slate-400 mb-4">75+ paying clients</div>
                
                <div className="text-4xl font-bold text-[#C9A646] mb-2">20%</div>
                <div className="text-slate-300 mb-6">monthly commission</div>
                
                <div className="pt-6 border-t border-white/10">
                  <div className="text-sm text-slate-400">12 months recurring</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Annual Plan Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-[#C9A646]/10 via-[#C9A646]/5 to-[#C9A646]/10 border border-[#C9A646]/30 rounded-2xl p-8 text-center"
          >
            <Zap className="w-10 h-10 text-[#C9A646] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[#C9A646] mb-2">Annual Plans: 18% Commission</h3>
            <p className="text-slate-300">
              Earn 18% up-front on all annual subscriptions — even before hitting 20 clients
            </p>
          </motion.div>

          {/* Transparency Note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm text-slate-500 mt-8 max-w-3xl mx-auto"
          >
            Commission capped at 12 months per customer. No lifetime commissions — this keeps the system fair, stable, and sustainable.
          </motion.p>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* VOLUME CASH BONUSES */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Gift className="w-16 h-16 text-[#C9A646] mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-[#C9A646] mb-4">
              Cash Bonuses That Make It a Game
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Hit milestones. Unlock rewards. Watch your earnings multiply.
            </p>
          </motion.div>

          {/* Bonus Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/50 to-[#C9A646]/20 -translate-y-1/2 hidden md:block" />
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { clients: "20", bonus: "$100", delay: 0.1 },
                { clients: "50", bonus: "$300", delay: 0.2 },
                { clients: "100", bonus: "$1,000", delay: 0.3 },
                { clients: "Every 50+", bonus: "$100", delay: 0.4 }
              ].map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: milestone.delay }}
                  className="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#C9A646]/30 hover:border-[#C9A646]/60 transition-all duration-300 hover:scale-105 text-center"
                >
                  <div className="w-12 h-12 bg-[#C9A646] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-black font-bold text-xl">{index + 1}</span>
                  </div>
                  
                  <div className="text-2xl font-bold text-white mb-2">{milestone.clients}</div>
                  <div className="text-sm text-slate-400 mb-3">clients</div>
                  <div className="text-3xl font-bold text-[#C9A646]">{milestone.bonus}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Psychological Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-slate-400 italic max-w-2xl mx-auto">
              "These milestones turn the program into a progression game. Affiliates literally 'see progress' and sprint to the next bonus."
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* LAYER 2 COMMISSIONS */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#C9A646]/10 via-transparent to-[#C9A646]/5 backdrop-blur-sm rounded-3xl p-12 border border-[#C9A646]/30 text-center"
          >
            <Users className="w-16 h-16 text-[#C9A646] mx-auto mb-6" />
            
            <h2 className="text-3xl md:text-4xl font-bold text-[#C9A646] mb-4">
              Earn 5% From Affiliates You Bring In
              <span className="relative group inline-block ml-2">
                <span className="text-[#C9A646] cursor-help">*</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-black/95 backdrop-blur-xl border border-[#C9A646]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="text-sm text-slate-300 text-left space-y-2">
                    <p className="font-semibold text-[#C9A646]">Eligibility Requirements:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• You must have 20+ active clients (Tier 2+)</li>
                      <li>• Prevents spam and maintains quality</li>
                      <li>• Paid on their performance only</li>
                    </ul>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#C9A646]/40" />
                </div>
              </span>
            </h2>
            
            <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
              This is where the real scale happens. Build your network, multiply your income.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-[#C9A646] mb-1">5%</div>
                <div className="text-sm text-slate-400">of their earnings</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-[#C9A646] mb-1">Unlimited</div>
                <div className="text-sm text-slate-400">sub-affiliates</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-[#C9A646] mb-1">Viral</div>
                <div className="text-sm text-slate-400">network growth</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic mt-6">
              This is not MLM — it's performance-based network growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* TOOLS & RESOURCES */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C9A646]/5 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Rocket className="w-16 h-16 text-[#C9A646] mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-[#C9A646] mb-4">
              Everything You Need to Sell
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Already done for you. Zero friction.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              { icon: Target, title: "Custom Coupon Code", desc: "Personalized code with your name (e.g., FINOTAUR-ALEX)" },
              { icon: Sparkles, title: "20+ Instagram Story Templates", desc: "Ready-made black–gold story templates for Stories & Reels - just add your link" },
              { icon: TrendingUp, title: "10 High-Converting Scripts", desc: "Reels & video scripts proven to generate sales" },
              { icon: BarChart3, title: "Landing Page Templates", desc: "5 premium landing pages optimized for traders" },
              { icon: Award, title: "Premium Banner Sets", desc: "Professional graphics for all major platforms" },
              { icon: DollarSign, title: "Analytics Dashboard", desc: "Track clicks, conversions, payouts, and performance in real-time" }
            ].map((tool, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#C9A646]/50 transition-all group"
              >
                <div className="w-12 h-12 bg-[#C9A646]/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#C9A646]/20 transition-all">
                  <tool.icon className="w-6 h-6 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{tool.title}</h3>
                  <p className="text-slate-400 text-sm">{tool.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Highlight Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/10 to-[#C9A646]/20 border-2 border-[#C9A646]/40 rounded-2xl p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-[#C9A646] mb-2">
              You Promote. We Give You All The Tools. Zero Friction.
            </h3>
          </motion.div>

          {/* Monthly Spotlight Recognition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm rounded-2xl p-8 border border-[#C9A646]/20"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-[#C9A646]" />
              <h3 className="text-2xl font-bold text-[#C9A646]">Monthly Spotlight</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#C9A646]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-[#C9A646]" />
                </div>
                <h4 className="text-white font-semibold mb-2">Featured on Homepage</h4>
                <p className="text-sm text-slate-400">Top 3 affiliates get showcased</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#C9A646]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-[#C9A646]" />
                </div>
                <h4 className="text-white font-semibold mb-2">Exclusive Partner Badge</h4>
                <p className="text-sm text-slate-400">Display your elite status</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#C9A646]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-8 h-8 text-[#C9A646]" />
                </div>
                <h4 className="text-white font-semibold mb-2">Priority Support</h4>
                <p className="text-sm text-slate-400">Direct line to our team</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* WHY FINOTAUR - COMPACT */}
      <section className="py-16 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#C9A646] mb-3">
              Why Affiliates Choose FINOTAUR
            </h2>
            <p className="text-slate-400">Designed to help you make serious recurring income</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-bold text-[#C9A646] mb-4">Premium Product</h3>
              <div className="space-y-2 text-sm">
                {[
                  "Elite fintech brand ($19.99–$39.99/mo)",
                  "80%+ retention after 12 months",
                  "AI-powered analytics tools",
                  "Multi-asset coverage (Futures, Forex, Crypto, Stocks)"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-[#C9A646] rounded-full mt-1.5 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Column 2 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-bold text-[#C9A646] mb-4">Unmatched Benefits</h3>
              <div className="space-y-2 text-sm">
                {[
                  "12-month recurring commissions (10-20%)",
                  "Cash bonuses up to $1,400",
                  "Complete marketing toolkit included",
                  "Real-time analytics + dedicated support"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-[#C9A646] rounded-full mt-1.5 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* FAQ SECTION - COMPACT */}
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#C9A646] mb-3">
              Quick Answers
            </h2>
            <p className="text-slate-400">Everything you need to know</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "When do I get paid?",
                a: "Monthly on the 15th, via PayPal or Stripe. Minimum payout: $100."
              },
              {
                q: "How do I track conversions?",
                a: "Real-time dashboard with clicks, conversions, and earnings breakdown."
              },
              {
                q: "What if a client cancels?",
                a: "Commission stops when subscription ends. Fair and transparent."
              },
              {
                q: "How long to get approved?",
                a: "Most applications approved within 24-48 hours."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-[#C9A646]/30 transition-all"
              >
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400">{faq.a}</p>
              </motion.div>
            ))}
          </div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-slate-500 mb-3">Payment Methods:</p>
            <div className="flex items-center justify-center gap-4 text-slate-400">
              <span className="text-sm">💳 PayPal</span>
              <span className="text-slate-600">•</span>
              <span className="text-sm">💰 Stripe</span>
              <span className="text-slate-600">•</span>
              <span className="text-sm">🏦 Wire Transfer</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION DIVIDER */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      {/* FINAL CTA - COMPACT */}
      <section className="py-16 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C9A646]/10 via-transparent to-transparent" />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 backdrop-blur-xl rounded-2xl p-10 border-2 border-[#C9A646]/30 shadow-[0_0_100px_rgba(201,166,70,0.2)]"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#C9A646] mb-3">
              Ready to Start Earning?
            </h2>
            
            <p className="text-lg text-slate-300 mb-6">
              Partner with the fastest-growing trading intelligence platform
            </p>

            <Button 
              size="lg"
              className="group bg-[#C9A646] hover:bg-[#D4AF37] text-black font-bold text-lg px-10 py-6 rounded-xl shadow-[0_0_30px_rgba(201,166,70,0.4)] hover:shadow-[0_0_50px_rgba(201,166,70,0.7)] transition-all duration-300 hover:scale-105"
            >
              Become a FINOTAUR Affiliate
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-xs text-slate-500 mt-4">
              Joining is free. No risk. Only upside.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Bottom Spacing */}
      <div className="h-16" />
    </div>
  );
};

export default AffiliatePage;