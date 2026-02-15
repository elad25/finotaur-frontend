// src/components/access/UpgradeGate.tsx
// =====================================================
// 🔒 UPGRADE GATE v2.3 - Unified Plan Comparison
// =====================================================
// Header lock + plan name = ALWAYS gold gradient
// Enterprise = exclusive "Coming Soon" waitlist card
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
  upgradeTarget?: 'core' | 'finotaur' | 'enterprise';
  upgradeDisplayName?: string;
  upgradePrice?: string;
  currentUsage?: number;
  limit?: number;
  currentPlan?: 'free' | 'core' | 'finotaur' | 'enterprise';
}

// ============================================
// PLAN TIERS
// ============================================

interface PlanTier {
  key: 'core' | 'finotaur' | 'enterprise';
  name: string;
  price: string;
  description: string;
  icon: typeof Crown;
  accentFrom: string;
  accentTo: string;
  glow: string;
  features: string[];
}

const PLAN_TIERS: PlanTier[] = [
  {
    key: 'core',
    name: 'Core',
    price: '$59',
    description: 'Full market intelligence',
    icon: Zap,
    accentFrom: '#3B82F6',
    accentTo: '#60A5FA',
    glow: 'rgba(59,130,246,0.25)',
    features: [
      'Stock Analyzer (5/day)',
      'Sector Analyzer (3/month)',
      'Flow Scanner',
      'AI Assistant',
      'Real-time market data',
      'Advanced charts & indicators',
      'Unlimited watchlists',
      '50 price alerts',
    ],
  },
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
      'Everything in Core, plus:',
      'Stock Analyzer (7/day)',
      'Sector Analyzer (unlimited)',
      'Options Intelligence AI',
      'Macro Analyzer',
      'AI Scanner',
      '🎁 Journal Premium INCLUDED',
      '🎁 War Zone + Top Secret Reports',
      'Priority 24h support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$500',
    description: 'Ultimate trading solution',
    icon: Sparkles,
    accentFrom: '#D4AF37',
    accentTo: '#F5E6A3',
    glow: 'rgba(212,175,55,0.25)',
    features: [], // Not used — Enterprise has custom card
  },
];

// ============================================
// ENTERPRISE SELLING POINTS
// ============================================

const ENTERPRISE_HIGHLIGHTS = [
  { icon: Brain, text: 'AI Portfolio Manager — like having a licensed advisor, 24/7' },
  { icon: Shield, text: 'Risk detection that hedge funds pay millions for' },
  { icon: Eye, text: 'Real-time surveillance on every position you hold' },
  { icon: TrendingUp, text: 'Unlimited analyses — no daily caps, no restrictions' },
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
    checkoutPlatformCoreMonthly, checkoutPlatformCoreYearly,
    checkoutPlatformFinotaurMonthly, checkoutPlatformFinotaurYearly,
    checkoutPlatformEnterpriseMonthly,
    isLoading: checkoutLoading,
  } = useWhopCheckout({
    onError: (error) => toast.error('Checkout failed', { description: error.message }),
  });

  const handleCheckout = (planKey: 'core' | 'finotaur' | 'enterprise') => {
    if (!user) {
      navigate('/app/all-markets/pricing');
      return;
    }
    if (planKey === 'core') {
      billingInterval === 'monthly' ? checkoutPlatformCoreMonthly() : checkoutPlatformCoreYearly();
    } else if (planKey === 'finotaur') {
      billingInterval === 'monthly' ? checkoutPlatformFinotaurMonthly() : checkoutPlatformFinotaurYearly();
    } else if (planKey === 'enterprise') {
      checkoutPlatformEnterpriseMonthly();
    }
  };

  const handleJoinWaitlist = () => {
    setWaitlistJoined(true);
    toast.success("You're on the list", {
      description: "We'll notify you the moment Enterprise launches.",
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">

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
            <div className="p-5 pt-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-zinc-400" />
                <span className="font-bold text-white">Free</span>
              </div>
              <div className="mb-1">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-sm text-[#6B6B6B] ml-1">/month</span>
              </div>
              <p className="text-xs text-[#8B8B8B] mb-4">Basic market access</p>

              <ul className="space-y-2.5 flex-1">
                {[
                  'All Markets dashboard',
                  'Stock Analyzer (3/day)',
                  'Basic market data',
                  'Limited watchlists (5)',
                  '3 price alerts',
                  'Community access',
                ].map((feat, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 text-xs">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-500" />
                    <span className="text-[#707070]">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ─── CORE CARD ─── */}
          {(() => {
            const tier = PLAN_TIERS[0];
            const TierIcon = tier.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative rounded-2xl flex flex-col mt-4"
                style={{
                  background: currentPlan === 'core'
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: currentPlan === 'core'
                    ? '2px solid rgba(201,166,70,0.5)'
                    : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: currentPlan === 'core'
                    ? '0 4px 20px rgba(201,166,70,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div
                    className="px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      background: currentPlan === 'core'
                        ? 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)'
                        : 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                      color: currentPlan === 'core' ? '#000' : '#fff',
                      boxShadow: currentPlan === 'core'
                        ? '0 4px 12px rgba(201,166,70,0.4)'
                        : '0 4px 12px rgba(59,130,246,0.3)',
                    }}
                  >
                    {currentPlan === 'core' ? 'Your Plan' : <><Zap className="w-3 h-3" /> 14-Day Free Trial</>}
                  </div>
                </div>

                <div className="p-5 pt-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TierIcon className="w-4 h-4" style={{ color: tier.accentFrom }} />
                    <span className="font-bold text-white">{tier.name}</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-white">{billingInterval === 'monthly' ? tier.price : tier.key === 'core' ? '$49' : '$91'}</span>
                    <span className="text-sm text-[#6B6B6B] ml-1">/month</span>
                    {billingInterval === 'yearly' && (
                      <span className="text-[10px] text-green-400 ml-2">Billed {tier.key === 'core' ? '$590' : '$1,090'}/yr</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B8B8B] mb-4">{tier.description}</p>

                  <ul className="space-y-2.5 flex-1">
                    {tier.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-xs">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tier.accentFrom }} />
                        <span className="text-[#A0A0A0]">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  
                </div>
              </motion.div>
            );
          })()}

          {/* ─── FINOTAUR CARD (RECOMMENDED) ─── */}
          {(() => {
            const tier = PLAN_TIERS[1];
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

                <div className="p-5 pt-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TierIcon className="w-4 h-4" style={{ color: '#C9A646' }} />
                    <span className="font-bold text-white">{tier.name}</span>
                  </div>
                  <div className="mb-1">
                    <span
                      className="text-3xl font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {billingInterval === 'monthly' ? tier.price : '$91'}
                    </span>
                    <span className="text-sm text-[#6B6B6B] ml-1">/month</span>
                    {billingInterval === 'yearly' && (
                      <span className="text-[10px] text-green-400 ml-2">Billed $1,090/yr</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B8B8B] mb-4">{tier.description}</p>

                  <ul className="space-y-2.5 flex-1">
                    {tier.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-xs">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#C9A646' }} />
                        <span className="text-[#D4C9A8]">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  
                </div>
              </motion.div>
            );
          })()}

          {/* ─── ENTERPRISE CARD (EXCLUSIVE COMING SOON) ─── */}
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
                <Sparkles className="w-3 h-3" /> Coming Soon
              </div>
            </div>

            <div className="p-5 pt-8 flex flex-col flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} />
                <span className="font-bold text-white">Enterprise</span>
              </div>
              <div className="mb-2">
                <span className="text-3xl font-bold text-white">$500</span>
                <span className="text-sm text-[#6B6B6B] ml-1">/month</span>
              </div>

              {/* Exclusive tagline */}
              <p className="text-xs text-[#D4AF37]/80 font-medium mb-4 leading-relaxed">
                For serious investors ready to take their portfolio to the next level.
                Not for everyone — by application only.
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
                      <item.icon className="w-3 h-3" style={{ color: '#D4AF37' }} />
                    </div>
                    <span className="text-xs text-[#A0A0A0] leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>

              
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center mt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/app/all-markets/pricing')}
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