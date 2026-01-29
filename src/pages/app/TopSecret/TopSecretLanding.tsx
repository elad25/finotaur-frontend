// ================================================
// TOP SECRET LANDING PAGE - OPTIMIZED v4.0
// 🔥 PERFORMANCE: Reduced animations, memoized components
// ================================================

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { supabase } from '@/lib/supabase';
import { useWarZoneStatus } from '@/hooks/useUserStatus';
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
  Gift,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

// ========================================
// TYPES & CONSTANTS
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

const WARZONE_MEMBER_PRICE = 50;

const PRICING_PLANS: PricingPlan[] = [
  { id: 'monthly', name: 'Monthly', price: 89.99, period: '/month' },
  { id: 'yearly', name: 'Yearly', price: 899, period: '/year', savings: 'Save $180.88', monthlyEquivalent: 74.92 },
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
    highlights: ['PMI Component Breakdown', 'Sector Impact Analysis', 'Trade Ideas with R:R'],
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
    highlights: ['Business Model Analysis', 'Competitive Moat Assessment', 'Price Targets & Catalysts'],
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
    highlights: ['Market Regime Analysis', 'Derivatives & Funding', 'Key Levels & Targets'],
  },
];

// ========================================
// MEMOIZED COMPONENTS
// ========================================

const ReportTypeCard = memo(function ReportTypeCard({ report }: { report: ReportType }) {
  const Icon = report.icon;
  return (
    <motion.div
      className="relative group"
      whileHover={{ scale: 1.02, y: -8 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: report.glowColor }}
      />
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: report.borderGradient, padding: '1px' }}
      >
        <div className="w-full h-full rounded-2xl bg-[#0A0A0A]" />
      </div>
      <div className="relative rounded-2xl p-7 bg-gradient-to-b from-[#111111] to-[#0A0A0A]">
        <div
          className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
          style={{ background: report.borderGradient }}
        />
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `linear-gradient(135deg, ${report.accentColor}20 0%, ${report.accentColor}05 100%)`,
            border: `1px solid ${report.accentColor}40`,
          }}
        >
          <Icon className="w-8 h-8" style={{ color: report.accentColor }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{report.name}</h3>
        <p className="text-sm text-slate-400 mb-5 leading-relaxed">{report.description}</p>
        <div className="flex items-center gap-2 mb-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: `${report.accentColor}15`,
              border: `1px solid ${report.accentColor}30`,
              color: report.accentColor,
            }}
          >
            <Calendar className="w-3.5 h-3.5" />
            {report.frequency}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
        <ul className="space-y-3">
          {report.highlights.map((highlight, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${report.accentColor}20`, border: `1px solid ${report.accentColor}40` }}
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
});

const PricingCard = memo(function PricingCard({
  plan,
  isWarZoneMember,
  isLoading,
  selectedPlan,
  onSubscribe,
}: {
  plan: PricingPlan;
  isWarZoneMember: boolean;
  isLoading: boolean;
  selectedPlan: string | null;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}) {
  const isMonthly = plan.id === 'monthly';
  const showWarZoneDiscount = isWarZoneMember && isMonthly;

  return (
    <div
      className="relative p-8 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
        border: `2px solid rgba(201,166,70,${isMonthly ? '0.4' : '0.5'})`,
        boxShadow: `0 0 ${isMonthly ? '40' : '50'}px rgba(201,166,70,${isMonthly ? '0.15' : '0.2'})`,
      }}
    >
      <div className="absolute -top-3 left-8">
        <div
          className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000' }}
        >
          {isMonthly ? 'MONTHLY' : 'BEST DEAL'}
        </div>
      </div>

      <div className="pt-6">
        {showWarZoneDiscount ? (
          <div className="mb-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(147,51,234,0.1) 100%)',
                border: '1px solid rgba(147,51,234,0.4)',
              }}
            >
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm font-semibold">WAR ZONE Member Discount</span>
            </div>
            <div className="flex items-baseline justify-start gap-2 mb-2">
              <span className="text-2xl text-slate-500 line-through">$89.99</span>
              <span className="text-5xl font-bold text-white">$50</span>
              <span className="text-xl text-slate-400">/month</span>
            </div>
            <p className="text-purple-400 text-base font-semibold">You save $39.99/month!</p>
          </div>
        ) : isMonthly ? (
          <div className="mb-6">
            <div className="flex items-baseline justify-start gap-2 mb-2">
              <span className="text-5xl font-bold text-white">${plan.price}</span>
              <span className="text-xl text-slate-400">{plan.period}</span>
            </div>
            <p className="text-sm font-bold text-blue-400 mb-1">FREE 14 DAY TRIAL</p>
            <p className="text-emerald-400 text-base font-semibold">
              Only <span className="text-2xl">$45/month</span> for the first 2 months!
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-baseline justify-start gap-2 mb-2">
              <span className="text-5xl font-bold text-white">${plan.price}</span>
              <span className="text-xl text-slate-400">{plan.period}</span>
            </div>
            <p className="text-emerald-400 text-base font-semibold">
              Just ${plan.monthlyEquivalent}/month — {plan.savings}!
            </p>
          </div>
        )}

        <Button
          onClick={() => onSubscribe(plan.id)}
          disabled={isLoading}
          className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            color: '#000',
            boxShadow: '0 8px 32px rgba(201,166,70,0.4)',
          }}
        >
          {isLoading && selectedPlan === plan.id ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Redirecting...
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isMonthly ? 'START FREE TRIAL' : 'GET ANNUAL PLAN'}
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </Button>
        <p className="text-xs text-center text-slate-500">Cancel anytime.</p>
      </div>
    </div>
  );
});

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [isWarZoneMember, setIsWarZoneMember] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const { initiateCheckout, isLoading } = useWhopCheckout({
    onSuccess: () => console.log('✅ Top Secret checkout initiated'),
    onError: (error) => console.error('❌ Top Secret checkout error:', error),
  });

  const { isActive: isWarZoneMemberFromHook, isLoading: isWarZoneLoading } = useWarZoneStatus();

  useEffect(() => {
    if (!isWarZoneLoading) {
      setIsWarZoneMember(isWarZoneMemberFromHook);
      setIsCheckingStatus(false);
    }
  }, [isWarZoneMemberFromHook, isWarZoneLoading]);

  const handleSubscribe = async (billingInterval: 'monthly' | 'yearly') => {
    setSelectedPlan(billingInterval);

    if (isWarZoneMember && billingInterval === 'monthly') {
      if (user?.id && user?.email) {
        const checkoutToken = crypto.randomUUID();
        try {
          await supabase.from('pending_checkouts').insert({
            user_id: user.id,
            user_email: user.email,
            checkout_token: checkoutToken,
            product_type: 'top_secret',
            billing_interval: 'monthly',
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
        } catch (err) {
          console.warn('⚠️ Failed to save pending checkout:', err);
        }
      }
      initiateCheckout({ planName: 'top_secret_warzone' as any, billingInterval: 'monthly' });
      return;
    }

    initiateCheckout({ planName: 'top_secret', billingInterval });
  };

  return (
    <section className="min-h-screen py-8 px-4 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#12100D] to-[#0B0B0B]" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201,166,70,0.15) 0%, rgba(180,140,50,0.08) 30%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10 pt-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-12 items-center mb-20 px-4"
        >
          {/* Left Column */}
          <div className="text-left">
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                border: '1px solid rgba(201,166,70,0.4)',
              }}
            >
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <span className="text-[#C9A646] font-semibold tracking-wide">Top Secret Intelligence</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ letterSpacing: '-0.03em' }}>
              <span className="text-white italic">Institutional</span>
              <br />
              <span className="text-white italic">Research</span>
              <br />
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Delivered Monthly
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
              The same market intelligence that hedge funds pay <span className="text-white font-semibold">$2,000+/month</span> for —
              now available for serious traders who want an edge.
            </p>

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <Gift className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">14-Day Free Trial</span>
              <span className="text-emerald-500 text-sm">• Cancel Anytime</span>
            </div>

            <Button
              onClick={() => handleSubscribe('monthly')}
              disabled={isLoading}
              className="px-8 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 8px 32px rgba(201,166,70,0.4)',
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

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 mt-10">
              {[
                { icon: TrendingUp, title: '10 Reports', sub: 'Every Month' },
                { icon: Shield, title: 'Institutional Grade', sub: 'Research Quality' },
                { icon: Target, title: 'Actionable', sub: 'Trade Ideas' },
              ].map((stat, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="w-px h-8 bg-slate-700" />}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-[#C9A646]" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{stat.title}</p>
                      <p className="text-xs text-slate-500">{stat.sub}</p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right Column - Report Preview */}
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-3xl opacity-40"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(201,166,70,0.3) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <ReportPreviewCard />
          </div>
        </motion.div>

        {/* Report Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-20"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">What You'll Receive</h2>
          <p className="text-slate-500 text-center mb-12">5 premium reports delivered every month</p>
          <div className="grid md:grid-cols-3 gap-8">
            {REPORT_TYPES.map((report) => (
              <ReportTypeCard key={report.id} report={report} />
            ))}
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20"
        >
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isWarZoneMember={isWarZoneMember}
              isLoading={isLoading}
              selectedPlan={selectedPlan}
              onSubscribe={handleSubscribe}
            />
          ))}
        </motion.div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-slate-600">
            Questions?{' '}
            <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">
              support@finotaur.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ========================================
// REPORT PREVIEW CARD
// ========================================

const ReportPreviewCard = memo(function ReportPreviewCard() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
          border: '1px solid rgba(201,166,70,0.3)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(201,166,70,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)' }}>
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

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold">ISM Manufacturing Report</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">January 2025 Analysis</h3>
            <p className="text-slate-500 text-sm">Published Jan 3, 2025</p>
          </div>

          {/* Metrics */}
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

          {/* Chart placeholder */}
          <div className="h-32 rounded-xl mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)' }}>
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C9A646" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30" fill="none" stroke="#C9A646" strokeWidth="2" />
              <path d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30 L400,128 L0,128 Z" fill="url(#chartGradient)" />
            </svg>
          </div>
        </div>

        {/* Blur Overlay */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)', boxShadow: '0 0 40px rgba(201,166,70,0.5)' }}
            >
              <Lock className="w-8 h-8 text-black" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Unlock Full Report</p>
            <p className="text-slate-400 text-sm">Subscribe to access all reports</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
