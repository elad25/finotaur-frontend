// src/components/access/UpgradeGate.tsx
// =====================================================
// 🔒 UPGRADE GATE v2.3 - Unified Plan Comparison
// =====================================================
// Header lock + plan name = ALWAYS gold gradient
// Copilot = AI Portfolio Manager card
// Finotaur = always "Best Value" (recommended)
// No purple anywhere
// =====================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Crown, ArrowRight, Sparkles, Check, TrendingUp, Bell, Shield, Brain, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { useAuth } from '@/providers/AuthProvider';

interface UpgradeGateProps {
  feature: string;
  reason?: 'plan_too_low' | 'daily_limit' | 'monthly_limit';
  message?: string;
  // 'core' removed 2026-06 (Core tier eliminated, zero subscribers)
  upgradeTarget?: 'finotaur' | 'enterprise';
  upgradeDisplayName?: string;
  upgradePrice?: string;
  currentUsage?: number;
  limit?: number;
  currentPlan?: 'free' | 'finotaur' | 'enterprise';
}

// ============================================
// PLAN TIERS
// ============================================

interface PlanTier {
  // 'core' removed 2026-06 (Core tier eliminated)
  key: 'finotaur' | 'enterprise';
  name: string;
  price: string;
  description: string;
  icon: typeof Crown;
  accentFrom: string;
  accentTo: string;
  glow: string;
  features: string[];
}

// Core tier removed 2026-06 (zero subscribers) — only Finotaur and Enterprise remain
const PLAN_TIERS: PlanTier[] = [
  {
    key: 'finotaur',
    name: 'Finotaur',
    price: '$109',
    description: 'Complete trading ecosystem',
    icon: Crown,
    accentFrom: '#C9A646',
    accentTo: '#F4D97B',
    glow: 'rgba(201,166,70,0.3)',
    features: [
      'Stock Analyzer (unlimited)',
      'Sector Analyzer (unlimited)',
      'Options Intelligence AI',
      'Macro Analyzer',
      'AI Scanner + Insider/13F',
      '🎁 Journal Premium INCLUDED',
      'Unlimited trades + Backtesting',
      'Up to 40 portfolios',
      '🎁 TOP SECRET Reports',
      'Priority 24h support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Copilot',
    price: '$200',
    description: 'Your AI portfolio manager — invests and trades alongside you, instead of flying blind or paying a human advisor.',
    icon: Sparkles,
    accentFrom: '#D4AF37',
    accentTo: '#F5E6A3',
    glow: 'rgba(212,175,55,0.25)',
    features: [], // Not used — Copilot has custom card
  },
];

// ============================================
// ENTERPRISE SELLING POINTS
// ============================================

const ENTERPRISE_HIGHLIGHTS = [
  { icon: Brain, text: 'AI Portfolio Manager that invests & trades alongside you' },
  { icon: Eye, text: 'Stop flying blind — 24/7 AI oversight of every position you hold' },
  { icon: TrendingUp, text: 'My Portfolio — live tracking & mark-to-market of your real book' },
  { icon: Shield, text: 'Proactive AI risk detection & alerts on your holdings' },
];

// ============================================
// COMPONENT
// ============================================

export function UpgradeGate({
  feature,
  reason,
  upgradeTarget = 'finotaur',
  currentUsage,
  limit,
  currentPlan = 'free',
}: UpgradeGateProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const isLimitReached = reason === 'daily_limit' || reason === 'monthly_limit';
  const requiredTier = PLAN_TIERS.find(t => t.key === upgradeTarget) || PLAN_TIERS[1];

  const {
    checkoutPlatformFinotaurMonthly, checkoutPlatformFinotaurYearly,
    checkoutPlatformEnterpriseMonthly, checkoutPlatformEnterpriseYearly,
    isLoading: checkoutLoading,
  } = useWhopCheckout({
    onError: (error) => toast.error('Checkout failed', { description: error.message }),
  });

  // 'core' removed 2026-06 (Core tier eliminated, zero subscribers)
  const handleCheckout = (planKey: 'finotaur' | 'enterprise') => {
    if (!user) {
      navigate('/app/upgrade');
      return;
    }
    if (planKey === 'finotaur') {
      billingInterval === 'monthly' ? checkoutPlatformFinotaurMonthly() : checkoutPlatformFinotaurYearly();
    } else if (planKey === 'enterprise') {
      billingInterval === 'yearly' ? checkoutPlatformEnterpriseYearly() : checkoutPlatformEnterpriseMonthly();
    }
  };

  const handleJoinWaitlist = () => {
    setWaitlistJoined(true);
    toast.success("You're on the list", {
      description: "We'll notify you when Copilot is available.",
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full"
      >
        {/* ── Header — Always gold ── */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
              border: '1px solid rgba(201,166,70,0.3)',
            }}
          >
            {isLimitReached ? (
              <Zap className="w-8 h-8" style={{ color: '#C9A646' }} />
            ) : (
              <Lock className="w-8 h-8" style={{ color: '#C9A646' }} />
            )}
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {isLimitReached
              ? (reason === 'daily_limit' ? 'Daily Limit Reached' : 'Monthly Limit Reached')
              : (
                <>
                  {feature} is available from{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {requiredTier.name}
                  </span>
                  {' '}and above
                </>
              )
            }
          </h2>

          <p className="text-[#8B8B8B] text-sm max-w-md mx-auto">
            {isLimitReached
              ? (
                <>
                  You've used {currentUsage}/{limit} {reason === 'daily_limit' ? 'analyses today' : 'this month'}.
                  {reason === 'daily_limit'
                    ? ' Resets tomorrow at midnight.'
                    : ' Resets on the 1st of next month.'}
                </>
              )
              : 'Compare plans below to find the right fit for your trading needs.'
            }
          </p>
        </div>

        {/* ── Billing Toggle ── */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              billingInterval === 'monthly'
                ? 'bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/40'
                : 'text-[#6B6B6B] hover:text-[#8B8B8B]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              billingInterval === 'yearly'
                ? 'bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/40'
                : 'text-[#6B6B6B] hover:text-[#8B8B8B]'
            }`}
          >
            Yearly
            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Save 17%</span>
          </button>
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

          {/* ─── FREE CARD ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative rounded-2xl flex flex-col mt-4"
            style={{
              background: currentPlan === 'free'
                ? 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: currentPlan === 'free' 
                ? '2px solid rgba(201,166,70,0.5)' 
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: currentPlan === 'free'
                ? '0 4px 20px rgba(201,166,70,0.15), inset 0 1px 0 rgba(255,255,255,0.03)'
                : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* Your Plan Badge */}
            {currentPlan === 'free' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)',
                    color: '#000',
                    boxShadow: '0 4px 12px rgba(201,166,70,0.4)',
                  }}
                >
                  Your Plan
                </div>
              </div>
            )}
            {/* Subtle Shine Effect */}
            <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                 style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)' }} />

            <div className="p-6 pt-7 flex flex-col flex-1 relative">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-zinc-400" />
                  <span className="text-lg font-bold text-white">Free</span>
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-sm text-[#6B6B6B]">/month</span>
                </div>
                <p className="text-sm text-[#8B8B8B]">Basic market access</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {[
                  'All Markets dashboard',
                  'Stock Analyzer (3/day)',
                  'Basic market data',
                  'Limited watchlists (5)',
                  '3 price alerts',
                  'Community access',
                  '📓 Trading Journal (15 lifetime trades)',
                ].map((feat, fi) => (
                  <li key={fi} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C9A646]/10 flex items-center justify-center shrink-0 mt-0.5" style={{ border: '1px solid rgba(201,166,70,0.2)' }}>
                      <Check className="h-2.5 w-2.5 text-zinc-500" />
                    </div>
                    <span className="text-sm text-[#707070] leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ─── FINOTAUR CARD (RECOMMENDED) ─── */}
          {/* Core tier removed 2026-06 (zero subscribers) — PLAN_TIERS[0] is now finotaur */}
          {(() => {
            const tier = PLAN_TIERS[0];
            const TierIcon = tier.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative rounded-2xl flex flex-col lg:scale-[1.02] mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(201,166,70,0.6)',
                  boxShadow: '0 8px 40px rgba(201,166,70,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div
                    className="px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)',
                      color: '#000',
                      boxShadow: '0 4px 12px rgba(201,166,70,0.4)',
                    }}
                  >
                    {currentPlan === 'finotaur' ? 'Your Plan' : <><TrendingUp className="w-3 h-3" /> Best Value</>}
                  </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                     style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.2), transparent 60%)' }} />
                {/* Subtle Shine Effect */}
                <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                     style={{ background: 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)' }} />

                <div className="p-6 pt-7 flex flex-col flex-1 relative">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <TierIcon className="w-4 h-4" style={{ color: '#C9A646' }} />
                      <span className="text-lg font-bold text-white">{tier.name}</span>
                    </div>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span
                        className="text-4xl font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {billingInterval === 'monthly' ? tier.price : '$91'}
                      </span>
                      <span className="text-sm text-[#6B6B6B]">/month</span>
                    </div>
                    {billingInterval === 'yearly' && (
                      <span className="text-xs text-green-400">Billed $1,090/yr</span>
                    )}
                    <p className="text-sm text-[#8B8B8B] mt-1">{tier.description}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {tier.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#C9A646]/30 flex items-center justify-center shrink-0 mt-0.5" style={{ border: '1px solid rgba(201,166,70,0.4)' }}>
                          <Check className="h-2.5 w-2.5 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-[#D4C9A8] leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  
                </div>
              </motion.div>
            );
          })()}

          {/* ─── COPILOT CARD ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl flex flex-col mt-4"
            style={{
              background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(10,10,10,0.95) 40%, rgba(10,10,10,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
            }}
          >

            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div
                className="px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider"
                style={{
                  background: 'rgba(10,10,10,0.95)',
                  color: '#D4AF37',
                  border: '1px solid rgba(212,175,55,0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <Sparkles className="w-3 h-3" /> AI Portfolio Manager
              </div>
            </div>

            {/* Subtle Shine Effect */}
            <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                 style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, transparent 100%)' }} />

            <div className="p-6 pt-9 flex flex-col flex-1 relative">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  <span className="text-lg font-bold text-white">Copilot</span>
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{billingInterval === 'yearly' ? '$167' : '$200'}</span>
                  <span className="text-sm text-[#6B6B6B]">/month</span>
                </div>
                {billingInterval === 'yearly' && (
                  <span className="text-xs text-green-400">Billed $2,000/year</span>
                )}
              </div>

              {/* Tagline */}
              <p className="text-sm text-[#D4AF37]/80 font-medium mb-4 leading-relaxed text-center">
                Your AI portfolio manager — invests and trades alongside you, instead of flying blind or paying a human advisor.
              </p>

              {/* Selling points */}
              <ul className="space-y-3 flex-1">
                {ENTERPRISE_HIGHLIGHTS.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.15)',
                      }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                    </div>
                    <span className="text-sm text-[#A0A0A0] leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleJoinWaitlist}
                disabled={waitlistJoined || checkoutLoading}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #F5E6A3)',
                  color: '#000',
                  boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
                }}
              >
                {waitlistJoined ? "You're on the list ✓" : 'Join the waitlist'}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center mt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/app/upgrade')}
            className="px-8 py-3 rounded-xl font-semibold text-sm text-black flex items-center justify-center gap-2 mx-auto transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              boxShadow: '0 6px 30px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Crown className="w-4 h-4" />
            Go to Pricing
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}