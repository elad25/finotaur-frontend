// =====================================================
// FINOTAUR WAR ZONE LANDING PAGE - OPTIMIZED v2.0
// 
// 🔥 OPTIMIZATIONS:
// - External CSS (browser cached)
// - React.memo on all sub-components
// - useMemo/useCallback for expensive operations
// - Centralized data hook (useWarZoneData)
// - Code splitting for modals (lazy loaded)
// - Reduced re-renders
// 
// ✅ SAME UI & LOGIC - Just faster!
// =====================================================

import { useState, useCallback, memo, lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Shield, Clock, ArrowRight, FileText,
  Loader2, Globe, Sparkles, Crown, Rocket, 
  TrendingUp, Check, Target, BarChart3, Zap, Activity,
} from 'lucide-react';

// Visual components (same folder)
import { 
  ParticleBackground, 
  SparkleEffect, 
  GoldenDivider, 
  DiscordIcon, 
  CompassIcon,
  FullPageLoader,
  AmbientGlow,
  FireGlow,
} from './VisualComponents';

// Sub-components (same folder)
import {
  CONFIG,
  YEARLY_SAVINGS,
  BillingToggle,
  StatsBar,
  FeatureIcons,
  type BillingInterval,
} from './WarzonelandingComponents';

// Active subscriber view (same folder)
import ActiveSubscriberView from './ActiveSubscriberView';

// Centralized data hook
import { useWarZoneData } from '@/hooks/useWarZoneData';

// Lazy load modals (code splitting) - from modals subfolder
const DisclaimerPopup = lazy(() => import('./modals/DisclaimerPopup'));
const LoginRequiredPopup = lazy(() => import('./modals/LoginRequiredPopup'));
const CancelSubscriptionModal = lazy(() => import('./modals/CancelSubscriptionModal'));

// Import external CSS
import '@/styles/warzone.css';

// ============================================
// FEATURE CARDS DATA
// ============================================

const FEATURES = [
  {
    icon: FileText,
    title: 'Daily Intelligence Report',
    description: 'Comprehensive market brief delivered every trading day at 9:00 AM ET with actionable insights.',
    highlight: '9:00 AM ET',
  },
  {
    icon: Target,
    title: 'Actionable Trade Ideas',
    description: 'Specific setups with entry, targets, and risk levels based on institutional-grade analysis.',
    highlight: 'Entry & Exit Levels',
  },
  {
    icon: BarChart3,
    title: 'Multi-Asset Coverage',
    description: 'Stocks, crypto, forex, commodities, and macro events - all in one unified briefing.',
    highlight: 'All Markets',
  },
  {
    icon: Shield,
    title: 'Risk Analysis',
    description: 'Key risks and catalysts identified so you can manage your exposure effectively.',
    highlight: 'Stay Protected',
  },
  {
    icon: Zap,
    title: 'Weekly Tactical Review',
    description: 'Every Sunday, receive a comprehensive weekly analysis and outlook for the week ahead.',
    highlight: 'Sunday 10 AM',
  },
  {
    icon: Activity,
    title: 'Real-Time Discord',
    description: 'Join 847+ traders in our active Discord community for real-time market discussions.',
    highlight: '24/7 Access',
  },
];

// ============================================
// FEATURE CARD COMPONENT
// ============================================

const FeatureCard = memo(function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  highlight,
  index 
}: {
  icon: any;
  title: string;
  description: string;
  highlight: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] card-warzone"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 icon-container-gold">
          <Icon className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div>
          <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">{description}</p>
          <span className="inline-flex items-center gap-1 text-[#C9A646] text-xs font-semibold">
            <Check className="w-3 h-3" />
            {highlight}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// PRICING CARD COMPONENT
// ============================================

const PricingCard = memo(function PricingCard({
  billingInterval,
  isTopSecretMember,
  onSubscribe,
  isProcessing,
}: {
  billingInterval: BillingInterval;
  isTopSecretMember: boolean;
  onSubscribe: () => void;
  isProcessing: boolean;
}) {
  const isMonthly = billingInterval === 'monthly';
  const price = isMonthly 
    ? (isTopSecretMember ? CONFIG.MONTHLY_PRICE_TOPSECRET : CONFIG.MONTHLY_PRICE) 
    : CONFIG.YEARLY_PRICE;
  const originalPrice = isMonthly && isTopSecretMember ? CONFIG.MONTHLY_PRICE : null;

  return (
    <div className="relative p-8 rounded-2xl card-warzone">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center icon-container-gold glow-gold-subtle">
          <Crown className="w-7 h-7 text-[#C9A646]" />
        </div>
        <div>
          <h3 className="text-white font-bold text-2xl">War Zone Intel</h3>
          <p className="text-[#C9A646]/60 text-sm">Premium Subscription</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          {originalPrice && (
            <span className="text-slate-500 line-through text-xl">${originalPrice}</span>
          )}
          <span className="text-5xl font-bold text-[#C9A646]">${price}</span>
          <span className="text-[#C9A646]/60">/{isMonthly ? 'month' : 'year'}</span>
        </div>
        {!isMonthly && (
          <p className="text-green-400 text-sm font-medium">
            Save ${YEARLY_SAVINGS}/year • ${CONFIG.YEARLY_MONTHLY_EQUIVALENT}/mo equivalent
          </p>
        )}
        {isTopSecretMember && isMonthly && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30">
            <Sparkles className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs font-semibold">Top Secret Member Discount</span>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        {[
          'Daily Intelligence Briefing',
          'Weekly Tactical Review',
          'Discord Community Access',
          'Institutional-Grade Analysis',
          'Actionable Trade Ideas',
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-slate-300 text-sm">{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onSubscribe}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 btn-gold disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Start 7-Day Free Trial
          </>
        )}
      </button>

      <p className="text-center text-slate-500 text-xs mt-4">
        Cancel anytime • No commitment
      </p>
    </div>
  );
});

// ============================================
// LANDING VIEW (Non-Subscriber)
// ============================================

const LandingView = memo(function LandingView({
  onSubscribe,
  billingInterval,
  setBillingInterval,
  isTopSecretMember,
  isProcessing,
}: {
  onSubscribe: () => void;
  billingInterval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
  isTopSecretMember: boolean;
  isProcessing: boolean;
}) {
  return (
    <div className="min-h-screen bg-warzone relative overflow-hidden">
      
      {/* Hero Section */}
      <div className="relative">
        {/* Ambient effects */}
        <AmbientGlow position="left" size={800} opacity={0.35} />
        <ParticleBackground count={60} />
        <SparkleEffect count={8} />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 min-h-[500px]">
            
            {/* Left: Text */}
            <div className="text-center lg:text-left lg:flex-1 lg:max-w-xl">
              {/* Badge */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30 mb-6"
              >
                <Shield className="w-4 h-4 text-[#C9A646]" />
                <span className="text-[#C9A646] text-sm font-semibold">Institutional-Grade Intelligence</span>
              </motion.div>

              {/* Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-bold leading-[1.05] tracking-tight mb-6"
              >
                <span className="text-3xl md:text-4xl lg:text-5xl text-white block heading-serif italic mb-2">
                  Welcome to the
                </span>
                <span className="text-5xl md:text-6xl lg:text-7xl block gradient-gold-text font-bold tracking-tight">
                  WAR ZONE
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#9A9080] text-sm md:text-base leading-relaxed max-w-md mx-auto lg:mx-0 mb-8"
              >
                The same market intelligence that hedge funds pay
                <span className="text-[#C9A646] font-medium"> $2,000+/month </span>
                for — now available for serious traders who want an edge.
              </motion.p>

              {/* Feature Icons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8 flex justify-center lg:justify-start"
              >
                <FeatureIcons size="md" />
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  onClick={onSubscribe}
                  disabled={isProcessing}
                  className="group px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mx-auto lg:mx-0 btn-gold disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="w-6 h-6" />
                      Start 7-Day Free Trial
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                <p className="text-[#C9A646]/50 text-sm mt-3 text-center lg:text-left">
                  <Clock className="w-4 h-4 inline mr-1" />
                  7-day free trial • Cancel anytime
                </p>
              </motion.div>
            </div>

            {/* Right: Bull Image */}
            <div className="relative flex-shrink-0 lg:flex-1 flex justify-center lg:justify-end -mr-8 lg:-mr-16">
              <div className="relative z-10 overflow-hidden bull-mask">
                <img 
                  src={CONFIG.BULL_IMAGE}
                  alt="War Zone Bull" 
                  className="w-[500px] md:w-[600px] lg:w-[700px] h-auto glow-fire"
                  style={{ 
                    mixBlendMode: 'lighten',
                    marginTop: '-22%',
                    marginBottom: '-45%',
                  }}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>

        <FireGlow />
      </div>

      {/* Golden Divider */}
      <GoldenDivider />

      {/* Stats Section */}
      <div className="relative py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <StatsBar />
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 heading-serif italic">
              What You Get
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Everything you need to stay ahead of the markets, delivered daily.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Golden Divider */}
      <GoldenDivider />

      {/* Pricing Section */}
      <div className="relative py-20 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 heading-serif italic">
              Simple Pricing
            </h2>
            <p className="text-slate-400 mb-8">
              Start with a 7-day free trial. Cancel anytime.
            </p>
            
            {/* Billing Toggle */}
            <BillingToggle 
              selected={billingInterval} 
              onChange={setBillingInterval} 
            />
          </div>

          <PricingCard
            billingInterval={billingInterval}
            isTopSecretMember={isTopSecretMember}
            onSubscribe={onSubscribe}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-16 px-6 text-center">
        <p className="text-[#C9A646]/60 text-lg heading-serif italic mb-6">
          Ready to gain your edge in the markets?
        </p>
        <button
          onClick={onSubscribe}
          disabled={isProcessing}
          className="px-8 py-4 rounded-xl font-bold text-lg btn-gold disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            'Start Your Free Trial Now'
          )}
        </button>
      </div>
    </div>
  );
});

// ============================================
// TYPES
// ============================================

interface WarzonelandingProps {
  previewMode?: 'landing' | 'subscriber' | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

function Warzonelanding({ previewMode = null }: WarzonelandingProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // State
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Centralized data hook
  const {
    isSubscriber: realIsSubscriber,
    isTopSecretMember,
    isLoading,
    refetch,
  } = useWarZoneData();

  // Preview mode overrides (for admin preview)
  const isSubscriber = previewMode === 'subscriber' ? true : previewMode === 'landing' ? false : realIsSubscriber;

  // Get membership ID for cancellation
  const [membershipId, setMembershipId] = useState<string | null>(null);

  // Handle payment success redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const membershipIdParam = searchParams.get('membership_id');
    
    if (success === 'true' && membershipIdParam) {
      setMembershipId(membershipIdParam);
      refetch();
    }
  }, [searchParams, refetch]);

  // Subscribe handler
  const handleSubscribeClick = useCallback(() => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    setShowDisclaimer(true);
  }, [user]);

  // Proceed to Whop checkout
  const handleProceedToCheckout = useCallback(async () => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      const planId = billingInterval === 'monthly' 
        ? CONFIG.WHOP_MONTHLY_PLAN_ID 
        : CONFIG.WHOP_YEARLY_PLAN_ID;
      
      const checkoutUrl = `https://whop.com/checkout/${planId}?d2c=true&email=${encodeURIComponent(user.email || '')}&metadata[user_id]=${user.id}&redirect_url=${encodeURIComponent(CONFIG.REDIRECT_URL + '?success=true')}`;
      
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      setIsProcessing(false);
    }
  }, [user, billingInterval]);

  // Cancel success handler
  const handleCancelSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return <FullPageLoader text="Loading War Zone..." />;
  }

  // Subscriber view
  if (isSubscriber) {
    return (
      <>
        <ActiveSubscriberView onCancelClick={() => setShowCancelModal(true)} />
        
        {/* Cancel Modal */}
        <Suspense fallback={null}>
          <CancelSubscriptionModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            membershipId={membershipId}
            onSuccess={handleCancelSuccess}
          />
        </Suspense>
      </>
    );
  }

  // Landing view (non-subscriber)
  return (
    <>
      <LandingView
        onSubscribe={handleSubscribeClick}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        isTopSecretMember={isTopSecretMember}
        isProcessing={isProcessing}
      />

      {/* Modals */}
      <Suspense fallback={null}>
        <DisclaimerPopup
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onAccept={handleProceedToCheckout}
          isProcessing={isProcessing}
          billingInterval={billingInterval}
          isTopSecretMember={isTopSecretMember}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoginRequiredPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
        />
      </Suspense>
    </>
  );
}

export default memo(Warzonelanding);