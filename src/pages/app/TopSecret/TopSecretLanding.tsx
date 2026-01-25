// ================================================
// TOP SECRET LANDING PAGE - Luxury Premium v3.2
// File: src/pages/app/TopSecret/TopSecretLanding.tsx
// 🔥 v3.2: Updated pricing - $70/month, $500/year
// ================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import {
  TrendingUp,
  Bitcoin,
  Building2,
  Calendar,
  Lock,
  Check,
  Shield,
  Clock,
  ArrowRight,
  Crown,
  Eye,
  Target,
  BarChart3,
  Sparkles,
  Gift,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';

// ========================================
// TYPES
// ========================================

interface PricingPlan {
  id: 'monthly' | 'yearly';
  name: string;
  price: number;
  period: string;
  savings?: string;
  monthlyEquivalent?: number;
}

interface ReportType {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
  accentColor: string;
  glowColor: string;
  borderGradient: string;
  highlights: string[];
}

// ========================================
// CONSTANTS
// ========================================

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 89.99,
    period: '/month',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 899,
    period: '/year',
    savings: 'Save $180.88',
    monthlyEquivalent: 74.92,
  },
];

const REPORT_TYPES: ReportType[] = [
  {
    id: 'ism',
    name: 'ISM Manufacturing Report',
    shortName: 'Macro Report',
    description: 'Deep macro-economic analysis of PMI data with sector impacts and actionable trade setups.',
    icon: TrendingUp,
    frequency: 'Monthly (~3rd)',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    borderGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)',
    highlights: [
      'PMI Component Breakdown',
      'Sector Impact Analysis',
      'Trade Ideas with R:R',
    ],
  },
  {
    id: 'company',
    name: 'Company Deep Dive',
    shortName: 'Company Analysis',
    description: 'Institutional-grade fundamental research with investment thesis and valuation models.',
    icon: Building2,
    frequency: '2x Monthly (5th & 20th)',
    accentColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderGradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #A855F7 100%)',
    highlights: [
      'Business Model Analysis',
      'Competitive Moat Assessment',
      'Price Targets & Catalysts',
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto Market Intelligence',
    shortName: 'Crypto Report',
    description: 'Professional crypto analysis covering derivatives, on-chain metrics, and key levels.',
    icon: Bitcoin,
    frequency: '2x Monthly (10th & 25th)',
    accentColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    borderGradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #06B6D4 100%)',
    highlights: [
      'Market Regime Analysis',
      'Derivatives & Funding',
      'Key Levels & Targets',
    ],
  },
];

const FEATURES = [
  { icon: Eye, text: 'Same research Wall Street pays $2,000+/month for' },
  { icon: Target, text: 'Actionable trade ideas with entry, stop, target' },
  { icon: BarChart3, text: 'Data-driven analysis, not opinions' },
  { icon: Clock, text: '5 premium reports delivered monthly' },
];

// ========================================
// ANIMATION VARIANTS
// ========================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ========================================
// COMPONENT
// ========================================

export default function TopSecretLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  
  // 🔥 Using useWhopCheckout for proper tracking
  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => {
      console.log('✅ Top Secret checkout initiated');
    },
    onError: (error) => {
      console.error('❌ Top Secret checkout error:', error);
    },
  });

  // 🔥 Handle subscription using the hook
  const handleSubscribe = (billingInterval: 'monthly' | 'yearly') => {
    setSelectedPlan(billingInterval);
    initiateCheckout({
      planName: 'top_secret',
      billingInterval,
    });
  };
  return (
    <section className="min-h-screen py-8 px-4 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background Effects - Golden Warm Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#12100D] to-[#0B0B0B]" />
      
      {/* Main Golden Glow - Top Center */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201,166,70,0.15) 0%, rgba(180,140,50,0.08) 30%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
      
      {/* Secondary Golden Glow - Middle */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.1) 0%, rgba(150,120,40,0.05) 40%, transparent 70%)',
          filter: 'blur(80px)'
        }}
      />
      
      {/* Subtle warm accent - Left */}
      <div 
        className="absolute top-1/4 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(180,140,50,0.06) 0%, transparent 60%)',
          filter: 'blur(100px)'
        }}
      />
      
      {/* Subtle warm accent - Right */}
      <div 
        className="absolute bottom-1/4 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(201,166,70,0.05) 0%, transparent 60%)',
          filter: 'blur(80px)'
        }}
      />

      <motion.div
        className="max-w-7xl mx-auto relative z-10 pt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section - Two Column Layout */}
        <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-12 items-center mb-20 px-4">
          {/* Left Column - Text Content */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
                 style={{
                   background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                   border: '1px solid rgba(201,166,70,0.4)',
                   boxShadow: '0 0 40px rgba(201,166,70,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                 }}>
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <span className="text-[#C9A646] font-semibold tracking-wide">Top Secret Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ letterSpacing: '-0.03em' }}>
              <span className="text-white italic">Institutional</span>
              <br />
              <span className="text-white italic">Research</span>
              <br />
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Delivered Monthly
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
              The same market intelligence that hedge funds pay <span className="text-white font-semibold">$2,000+/month</span> for —
              now available for serious traders who want an edge.
            </p>

            {/* 🆕 14-Day Free Trial Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6"
                 style={{
                   background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)',
                   border: '1px solid rgba(16,185,129,0.3)',
                   boxShadow: '0 0 30px rgba(16,185,129,0.1)'
                 }}>
              <Gift className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">14-Day Free Trial</span>
              <span className="text-emerald-500 text-sm">• Cancel Anytime</span>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => handleSubscribe('monthly')}
              disabled={isLoading}
              className="px-8 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
              }}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mt-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#C9A646]" />
                </div>
                <div>
                  <p className="text-white font-bold">10 Reports</p>
                  <p className="text-xs text-slate-500">Every Month</p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#C9A646]" />
                </div>
                <div>
                  <p className="text-white font-bold">Institutional Grade</p>
                  <p className="text-xs text-slate-500">Research Quality</p>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-[#C9A646]" />
                </div>
                <div>
                  <p className="text-white font-bold">Actionable</p>
                  <p className="text-xs text-slate-500">Trade Ideas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Report Preview Mockup */}
          <div className="relative">
            {/* Glow Effect Behind */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-40"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.3) 0%, transparent 70%)',
                filter: 'blur(40px)'
              }}
            />

            {/* Report Card */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 20, rotateY: -5 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.1)'
                }}
              >
                {/* Report Header */}
                <div
                  className="p-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(201,166,70,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)'
                      }}
                    >
                      <span className="text-black font-bold text-sm">F</span>
                    </div>
                    <div>
                      <p className="text-white font-bold">FINOTAUR</p>
                      <p className="text-[#C9A646] text-xs font-semibold">TOP SECRET</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[#C9A646] text-xs font-semibold">LIVE</span>
                  </div>
                </div>

                {/* Report Content Preview */}
                <div className="p-6">
                  {/* Report Title */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-400 text-sm font-semibold">ISM Manufacturing Report</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">January 2025 Analysis</h3>
                    <p className="text-slate-500 text-sm">Published Jan 3, 2025</p>
                  </div>

                  {/* Key Metrics Preview */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-400 text-xs font-semibold mb-1">PMI Index</p>
                      <p className="text-white text-xl font-bold">52.8</p>
                      <p className="text-emerald-400 text-xs">+1.2 vs prev</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 text-xs font-semibold mb-1">New Orders</p>
                      <p className="text-white text-xl font-bold">54.3</p>
                      <p className="text-blue-400 text-xs">Expanding</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 text-xs font-semibold mb-1">Market Bias</p>
                      <p className="text-white text-xl font-bold">RISK ON</p>
                      <p className="text-amber-400 text-xs">Bullish setup</p>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div
                    className="h-32 rounded-xl mb-4 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)' }}
                  >
                    {/* Fake chart lines */}
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#C9A646" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30"
                        fill="none"
                        stroke="#C9A646"
                        strokeWidth="2"
                      />
                      <path
                        d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30 L400,128 L0,128 Z"
                        fill="url(#chartGradient)"
                      />
                    </svg>
                    <div className="absolute bottom-2 right-2 text-xs text-[#C9A646]/60">
                      Sector Performance
                    </div>
                  </div>

                  {/* Trade Ideas Teaser */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold text-sm">Trade Ideas</span>
                      <span className="text-[#C9A646] text-xs">3 setups included</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded bg-white/10" />
                      <div className="h-2 w-4/5 rounded bg-white/10" />
                    </div>
                  </div>
                </div>

                {/* Blur Overlay */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                        boxShadow: '0 0 40px rgba(201,166,70,0.5)'
                      }}
                    >
                      <Lock className="w-8 h-8 text-black" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Unlock Full Report</p>
                    <p className="text-slate-400 text-sm">Subscribe to access all reports</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Report Types - Premium Cards */}
        <motion.div variants={itemVariants} className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">
            What You'll Receive
          </h2>
          <p className="text-slate-500 text-center mb-12">5 premium reports delivered every month</p>

          <div className="grid md:grid-cols-3 gap-8">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <motion.div
                  key={report.id}
                  className="relative group"
                  whileHover={{ scale: 1.02, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {/* Glow Effect */}
                  <div 
                    className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ background: report.glowColor }}
                  />
                  
                  {/* Border Gradient */}
                  <div 
                    className="absolute -inset-[1px] rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: report.borderGradient, padding: '1px' }}
                  >
                    <div className="w-full h-full rounded-2xl bg-[#0A0A0A]" />
                  </div>

                  {/* Card Content */}
                  <div className="relative rounded-2xl p-7 bg-gradient-to-b from-[#111111] to-[#0A0A0A]">
                    {/* Top Accent Line */}
                    <div 
                      className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
                      style={{ background: report.borderGradient }}
                    />

                    {/* Icon */}
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative"
                      style={{
                        background: `linear-gradient(135deg, ${report.accentColor}20 0%, ${report.accentColor}05 100%)`,
                        border: `1px solid ${report.accentColor}40`,
                        boxShadow: `0 0 30px ${report.accentColor}20`
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: report.accentColor }} />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3">{report.name}</h3>
                    <p className="text-sm text-slate-400 mb-5 leading-relaxed">{report.description}</p>

                    {/* Frequency Badge */}
                    <div className="flex items-center gap-2 mb-6">
                      <div 
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{
                          background: `${report.accentColor}15`,
                          border: `1px solid ${report.accentColor}30`,
                          color: report.accentColor
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {report.frequency}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

                    {/* Highlights */}
                    <ul className="space-y-3">
                      {report.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: `${report.accentColor}20`,
                              border: `1px solid ${report.accentColor}40`
                            }}
                          >
                            <Check className="w-3 h-3" style={{ color: report.accentColor }} />
                          </div>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

{/* Pricing Cards - Two Column */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20">
          {/* Monthly Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.4)',
              boxShadow: '0 0 40px rgba(201,166,70,0.15)'
            }}
          >
            {/* MONTHLY Badge */}
            <div className="absolute -top-3 left-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                MONTHLY
              </div>
            </div>

            <div className="pt-6">
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-start gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">$89.99</span>
                  <span className="text-xl text-slate-400">/month</span>
                </div>
                <p className="text-sm font-bold text-blue-400 mb-1">
                  FREE 14 DAY TRIAL
                </p>
                <p className="text-emerald-400 text-base font-semibold">
                  Only <span className="text-2xl">$35/month</span> for the first 2 months!
                </p>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe('monthly')}
                disabled={isLoading}
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                }}
              >
                {isLoading && selectedPlan === 'monthly' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    START FREE TRIAL
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500 mb-6">
                Risk-free. Cancel anytime.
              </p>

              {/* Features */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Actionable Macro Insights</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Cut through the noise. Understand ISM, and get a clear view of which sectors to target and which to avoid.
                  </p>
                </div>

                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Only the Opportunities That Actually Matter This Month</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    A tightly filtered set of ideas backed by macro data, ISM signals, and institutional-style reasoning — not lists, not hype.
                  </p>
                </div>

                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
                    <span className="text-base font-bold text-white">Smart Crypto Reports <span className="text-xs text-slate-500 font-normal">(Optional)</span></span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">
                    Up-to-date crypto market analysis and bi-weekly reports for those interested in digital assets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Annual Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.5)',
              boxShadow: '0 0 50px rgba(201,166,70,0.2)'
            }}
          >
            {/* BEST DEAL Badge */}
            <div className="absolute -top-3 right-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                BEST DEAL
              </div>
            </div>

            <div className="pt-6">
              {/* Title */}
              <h3 className="text-2xl font-bold mb-1" style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Unlock Top Secret
              </h3>
              <h3 className="text-2xl font-bold text-white mb-2">
                Institutional Research
              </h3>
              <p className="text-sm text-slate-400 mb-4 px-4 py-1.5 rounded-lg inline-block" style={{
                background: 'rgba(201,166,70,0.1)',
                border: '1px solid rgba(201,166,70,0.2)'
              }}>
                FOR SERIOUS INVESTORS ONLY
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-start gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">$899</span>
                  <span className="text-xl text-slate-400">/year</span>
                </div>
                <p className="text-emerald-400 text-base font-semibold">
                  Just $74.92/month — Save $180.88!
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Priority Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Locked price for 12 months</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Early Access to future FINOTAUR tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-medium">Founding Members badge</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe('yearly')}
                disabled={isLoading}
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                }}
              >
                {isLoading && selectedPlan === 'yearly' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Redirecting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    GET ANNUAL PLAN
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500 mb-6">
                Locked price. Cancel anytime.
              </p>

              {/* Additional Perks */}
              <div className="space-y-2 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">Best yearly value</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                  <span className="text-sm text-slate-400">No lock-in contracts</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sample Preview - Premium Version */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-3 text-white">Sample Reports</h2>
          <p className="text-slate-500 text-center mb-10">Preview what's waiting for you inside</p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              return (
                <motion.div
                  key={report.id}
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Card */}
                  <div 
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
                      border: `1px solid ${report.accentColor}30`
                    }}
                  >
                    {/* Report Header Bar */}
                    <div 
                      className="h-2 w-full"
                      style={{ background: report.borderGradient }}
                    />

                    {/* Fake Document Content */}
                    <div className="p-5">
                      {/* Title skeleton */}
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-8 h-8 rounded-lg"
                          style={{ background: `${report.accentColor}30` }}
                        />
                        <div>
                          <div className="h-3 w-24 rounded bg-white/20 mb-1.5" />
                          <div className="h-2 w-16 rounded bg-white/10" />
                        </div>
                      </div>

                      {/* Content skeletons */}
                      <div className="space-y-2 mb-4">
                        <div className="h-2 w-full rounded bg-white/10" />
                        <div className="h-2 w-5/6 rounded bg-white/10" />
                        <div className="h-2 w-4/5 rounded bg-white/10" />
                      </div>

                      {/* Chart placeholder */}
                      <div 
                        className="h-20 rounded-lg mb-4"
                        style={{ background: `linear-gradient(135deg, ${report.accentColor}10 0%, ${report.accentColor}05 100%)` }}
                      />

                      {/* More content */}
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-white/10" />
                        <div className="h-2 w-3/4 rounded bg-white/10" />
                      </div>
                    </div>

                    {/* Blur Overlay */}
                    <div className="absolute inset-0 backdrop-blur-[3px] bg-black/70 flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-black/80">
                      {/* Glowing Lock Icon */}
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background: report.borderGradient,
                          boxShadow: `0 0 40px ${report.glowColor}`
                        }}
                      >
                        <Lock className="w-10 h-10 text-white" />
                      </div>
                      
                      <p className="text-white font-bold text-xl mb-2">{report.shortName}</p>
                      <p className="text-slate-400 text-sm mb-4">Subscribe to unlock</p>
                      
                      {/* Mini CTA */}
                      <div 
                        className="px-4 py-2 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `${report.accentColor}20`,
                          border: `1px solid ${report.accentColor}50`,
                          color: report.accentColor
                        }}
                      >
                        View Sample →
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center pb-8">
          <p className="text-slate-600">
            Questions?{' '}
            <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">
              support@finotaur.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}