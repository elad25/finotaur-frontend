// src/pages/app/all-markets/Pricing.tsx
// =====================================================
// FINOTAUR PLATFORM PRICING - v2.0.0
// =====================================================
// 
// Design based on JournalSettings UpgradePlanModal
// Premium glass-morphism cards with gold accents
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Check, Shield, Zap, Clock, TrendingUp, Gift, X, AlertTriangle, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';
import { useSubscription } from '@/hooks/useSubscription';


// ============================================
// TYPES
// ============================================

type BillingInterval = 'monthly' | 'yearly';
type PlatformPlanId = 'free' | 'journal' | 'top_secret' | 'finotaur' | 'enterprise';

interface PlanConfig {
  id: PlatformPlanId;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthlyEquivalent: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  savings?: string;
  trialDays: number;
  trialOnceOnly?: boolean;
  includesJournal?: boolean;
  includesNewsletter?: boolean;
  comingSoon?: boolean;
  // checkout category: 'journal' | 'top_secret' | 'platform'
  checkoutCategory: 'none' | 'journal' | 'top_secret' | 'platform';
}

// ============================================
// PLAN CONFIGURATIONS — PERSONA LADDER (v3.0.0, 2026-07)
// Free → Trader ($45, journal) → Investor ($49, intel + research + AI)
// → FINOTAUR ($89, everything + exclusives) → Ultimate ($200)
// "Investor" is the rebranded Top Secret product — same Whop plans.
// ============================================

const plans: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    yearlyMonthlyEquivalent: '$0',
    description: 'What you keep after your 14-day trial ends',
    trialDays: 0,
    checkoutCategory: 'none',
    features: [
      '10 lifetime manual trades',
      'Manual journal',
      'AI Stock Analyzer — 3/day',
      'FINO assistant + Community',
      'Preview mode with sample data',
      'Market Pulse & news',
    ],
    cta: 'Free Plan',
    featured: false,
  },
  {
    id: 'journal',
    name: 'Trader',
    monthlyPrice: '$44.99',
    yearlyPrice: '$409',
    yearlyMonthlyEquivalent: '$34',
    description: "The trader's desk — journal & execution",
    trialDays: 0,
    trialOnceOnly: false,
    checkoutCategory: 'journal',
    features: [
      'Everything in Free, plus:',
      'Unlimited trades — auto-synced',
      'Trade Copier — Tradovate & NinjaTrader',
      'Leak Detector — AI finds your most expensive losing pattern',
      'Full performance analytics',
      'Strategy builder & Playbooks',
      'Shadow — what-if analysis',
      'Revenge Radar + AI coach',
      'Prop-firm risk dashboard',
    ],
    cta: 'Upgrade to Trader',
    featured: false,
    savings: 'Save 24%',
  },
  {
    id: 'top_secret',
    name: 'Investor',
    monthlyPrice: '$49',
    yearlyPrice: '$499',
    yearlyMonthlyEquivalent: '$42',
    description: "The investor's desk — intel, research & AI",
    trialDays: 0,
    trialOnceOnly: false,
    checkoutCategory: 'top_secret',
    features: [
      'TOP SECRET',
      'WAR ZONE',
      'AI Stock Analyzer — 10/day',
      'The Weekly Report — Sundays',
      'Monthly deep-dive research',
      'Research hub — insiders, 13F, ETFs',
      'Private Discord trade room',
    ],
    cta: 'Upgrade to Investor',
    featured: false,
    savings: 'Save 15%',
  },
  {
    id: 'finotaur',
    name: 'FINOTAUR',
    monthlyPrice: '$89',
    yearlyPrice: '$890',
    yearlyMonthlyEquivalent: '$74',
    description: 'The entire platform — every tool, one price',
    trialDays: 14,
    trialOnceOnly: false,
    includesJournal: true,
    includesNewsletter: true,
    checkoutCategory: 'platform',
    features: [
      'Everything in Trader & Investor, plus:',
      'FINO — unlimited, on every page',
      'Options Intelligence AI',
      'Flow Scanner — Dark Pool',
      'Real-time Market Scanner',
      'AI Scanner — daily Top 5',
      'Strategy Backtesting engine',
      'Unlimited AI, alerts & screeners',
    ],
    cta: 'Start 14-Day Trial',
    featured: true,
    savings: 'Save 17%',
  },
  {
    id: 'enterprise',
    name: 'ULTIMATE',
    monthlyPrice: '$200',
    yearlyPrice: '$2,000',
    yearlyMonthlyEquivalent: '$167',
    description: 'Your AI portfolio manager — invests and trades alongside you, 24/7 oversight.',
    trialDays: 0,
    comingSoon: true,
    checkoutCategory: 'platform',
    features: [
      'Everything in FINOTAUR, plus:',
      'Copilot — AI Portfolio Manager',
      '24/7 AI position oversight',
      'Live mark-to-market',
      'Proactive AI risk alerts',
      'Daily AI portfolio brief',
    ],
    cta: 'Get ULTIMATE',
    featured: false,
    savings: 'Save 17%',
  },
];

const FLAGSHIP_PREFIXES = ['TOP SECRET', 'WAR ZONE', 'Trade Copier', 'Unlimited trades', 'FINO', 'Copilot', 'AI Stock Analyzer'];
const isFlagship = (feature: string) => FLAGSHIP_PREFIXES.some((p) => feature.startsWith(p));

// ============================================
// COMPONENT
// ============================================

export default function PlatformPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAppTrial } = useSubscription();
  
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<PlatformPlanId | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [currentPlatformPlan, setCurrentPlatformPlan] = useState<string>('free');
  const [currentBillingInterval, setCurrentBillingInterval] = useState<string | null>(null);
  const [proTrialUsed, setProTrialUsed] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [hasActiveJournalSubscription, setHasActiveJournalSubscription] = useState(false);
  const [existingJournalPlan, setExistingJournalPlan] = useState<string | null>(null);
  const [journalInterval, setJournalInterval] = useState<string | null>(null);
  const [hasActiveTopSecret, setHasActiveTopSecret] = useState(false);
  const [hasActiveNewsletter, setHasActiveNewsletter] = useState(false);
  const [topSecretInterval, setTopSecretInterval] = useState<string | null>(null);
  const [hasNewsletterMonthly, setHasNewsletterMonthly] = useState(false);
  const [hasTopSecretMonthly, setHasTopSecretMonthly] = useState(false);
  const [hasJournalPremiumMonthly, setHasJournalPremiumMonthly] = useState(false);
const [journalYearlyExpiresAt, setJournalYearlyExpiresAt] = useState<string | null>(null);
const [journalYearlyPlan, setJournalYearlyPlan] = useState<string | null>(null);
const [platformYearlyExpiresAt, setPlatformYearlyExpiresAt] = useState<string | null>(null);
const [platformYearlyPlan, setPlatformYearlyPlan] = useState<string | null>(null);

  const {
    checkoutPremiumMonthly, checkoutPremiumYearly,
    checkoutPlatformFinotaurMonthly, checkoutPlatformFinotaurYearly,
    checkoutPlatformEnterpriseMonthly, checkoutPlatformEnterpriseYearly,
    initiateCheckout,
    isLoading: checkoutLoading,
  } = useWhopCheckout({
    onError: (error) => toast.error('Checkout failed', { description: error.message })
  });

  // ============================================
  // CHECK SUBSCRIPTION STATUS
  // ============================================

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) { 
        setCheckingSubscription(false); 
        return; 
      }
      
      setCheckingSubscription(true);
      
      try {
        const paymentSuccess = searchParams.get('payment') === 'success';
        const planFromUrl = searchParams.get('plan');
        
        if (paymentSuccess) {
          window.history.replaceState({}, '', '/app/upgrade');
          toast.success('Payment successful! 🎉', {
            description: `Your ${planFromUrl || 'Platform'} subscription is now active.`,
          });
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('platform_plan, platform_subscription_status, platform_pro_trial_used_at, platform_billing_interval, platform_subscription_expires_at, platform_is_in_trial, platform_trial_ends_at, platform_cancel_at_period_end, newsletter_enabled, newsletter_status, newsletter_interval, top_secret_enabled, top_secret_status, top_secret_interval, account_type, subscription_status, whop_membership_id, subscription_interval, subscription_expires_at, journal_yearly_expires_at, journal_yearly_plan, platform_yearly_expires_at, platform_yearly_plan')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          // Normalize: strip "platform_" prefix for UI comparison
          const rawPlan = data.platform_plan || 'free';
          setCurrentPlatformPlan(rawPlan.replace('platform_', '') as PlatformPlanId);
          setCurrentBillingInterval(data.platform_billing_interval || null);
          setProTrialUsed(!!data.platform_pro_trial_used_at);
          setSubscriptionExpiresAt(data.platform_subscription_expires_at || null);
          setIsInTrial(!!data.platform_is_in_trial);
          setTrialEndsAt(data.platform_trial_ends_at || null);
          setCancelAtPeriodEnd(!!data.platform_cancel_at_period_end);
        }

        // 🔥 v8.9.0: Yearly fallback protection
        setJournalYearlyExpiresAt(data?.journal_yearly_expires_at || null);
        setJournalYearlyPlan(data?.journal_yearly_plan || null);
        setPlatformYearlyExpiresAt(data?.platform_yearly_expires_at || null);
        setPlatformYearlyPlan(data?.platform_yearly_plan || null);

        // 🔥 Check existing Journal subscription
        if (data?.whop_membership_id &&
            ['active', 'trialing', 'trial'].includes(data.subscription_status || '')) {
          setHasActiveJournalSubscription(true);
          setExistingJournalPlan(data.account_type || null);
          setJournalInterval(data.subscription_interval || null);
        }

        // 🔥 Interval-agnostic ownership (standalone Trader/Investor coexist — see handlePlanClick)
        setHasActiveTopSecret(!!(data?.top_secret_enabled && ['active', 'trial'].includes(data?.top_secret_status || '')));
        setHasActiveNewsletter(!!['active', 'trial'].includes(data?.newsletter_status || ''));
        setTopSecretInterval(data?.top_secret_interval || null);

        // 🔥 Check standalone monthly subscriptions (relevant for Core upsell warning)
        const newsletterIsMonthly = 
          (data?.newsletter_status === 'active' || data?.newsletter_status === 'trial') &&
          (data?.newsletter_interval === 'monthly' || !data?.newsletter_interval);
        const topSecretIsMonthly = 
          data?.top_secret_enabled &&
          (data?.top_secret_status === 'active' || data?.top_secret_status === 'trial') &&
          (data?.top_secret_interval === 'monthly' || !data?.top_secret_interval);
        const journalPremiumIsMonthly = 
          data?.account_type === 'premium' &&
          data?.whop_membership_id &&
          ['active', 'trial'].includes(data?.subscription_status || '');

        setHasNewsletterMonthly(!!newsletterIsMonthly);
        setHasTopSecretMonthly(!!topSecretIsMonthly);
        setHasJournalPremiumMonthly(!!journalPremiumIsMonthly);
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, [user, searchParams]);

  // ============================================
  // HANDLERS
  // ============================================

  const [showUpgradeWarning, setShowUpgradeWarning] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<PlatformPlanId | null>(null);
  const [showDowngradeTierDialog, setShowDowngradeTierDialog] = useState(false);
  const [pendingDowngradePlanId, setPendingDowngradePlanId] = useState<PlatformPlanId | null>(null);
  const [showEnterpriseYearlyWarning, setShowEnterpriseYearlyWarning] = useState(false);

  const proceedToCheckout = (planId: PlatformPlanId) => {
    setLoading(planId);
    try {
      if (planId === 'journal') {
        billingInterval === 'monthly' ? checkoutPremiumMonthly() : checkoutPremiumYearly();
      } else if (planId === 'top_secret') {
        initiateCheckout({ planName: 'top_secret', billingInterval });
      } else if (planId === 'finotaur') {
        billingInterval === 'monthly' ? checkoutPlatformFinotaurMonthly() : checkoutPlatformFinotaurYearly();
      } else if (planId === 'enterprise') {
        billingInterval === 'yearly' ? checkoutPlatformEnterpriseYearly() : checkoutPlatformEnterpriseMonthly();
      }
    } catch (error) {
      toast.error('Failed to start checkout');
      setLoading(null);
    }
  };

  // 🔥 Plan tier for downgrade detection
  const PLAN_TIER: Record<string, number> = { free: 0, journal: 1, top_secret: 1, finotaur: 2, enterprise: 3 };

  // 🔥 Calculate monthly spending on standalone products vs platform plans
  const standaloneMonthlyTotal = (() => {
    let total = 0;
    // WAR ZONE merged into TOP SECRET — count the merged product once at $49
    if (hasTopSecretMonthly || hasNewsletterMonthly) total += 49;
    if (hasJournalPremiumMonthly) total += 44.99; // journal premium monthly price
    return total;
  })();

  const hasExpensiveStandalones = standaloneMonthlyTotal >= 93 && currentPlatformPlan === 'free';

  const handlePlanClick = (planId: PlatformPlanId) => {
    // COPILOT (or any coming-soon plan) — checkout locked, no-op
    if (plans.find((p) => p.id === planId)?.comingSoon) return;
    // Free = open downgrade confirmation dialog
    if (planId === 'free') {
      if (currentPlatformPlan !== 'free') {
        setShowDowngradeDialog(true);
      }
      return;
    }
    
    // Allow same plan only if upgrading from monthly to yearly
    const isUpgradeToYearly = planId === currentPlatformPlan && 
      currentBillingInterval === 'monthly' && billingInterval === 'yearly';
    
    // Block if same plan + same interval (not an upgrade)
    if (planId === currentPlatformPlan && !isUpgradeToYearly) return;

    // 🔥 Detect downgrade to lower tier (e.g. Finotaur → Core)
    const currentTier = PLAN_TIER[currentPlatformPlan] ?? 0;
    const targetTier = PLAN_TIER[planId] ?? 0;
    const isDowngrade = targetTier < currentTier;

    if (isDowngrade) {
      setPendingDowngradePlanId(planId);
      setShowDowngradeTierDialog(true);
      return;
    }

    // 🔥 Block Yearly → Monthly upgrade
    if (currentBillingInterval === 'yearly' && billingInterval === 'monthly' && targetTier > currentTier) {
      setBillingInterval('yearly');
      toast.info("You're on a yearly plan — switch to Yearly billing above to upgrade.");
      return;
    }

    // 🔥 Enterprise from Yearly (Monthly billing selected): warn about cancelling current plan
    if (currentBillingInterval === 'yearly' && planId === 'enterprise' && billingInterval === 'monthly') {
      setShowEnterpriseYearlyWarning(true);
      return;
    }

    // Monthly → Yearly of same plan: direct checkout, no popup
    if (isUpgradeToYearly) {
      proceedToCheckout(planId);
      return;
    }

    // Standalone rungs (Trader/Investor) coexist — buying one never cancels the other.
    // Block re-purchase of an already-owned standalone; allow monthly → yearly upgrade of the same product.
    if (planId === 'journal' && hasActiveJournalSubscription) {
      const isYearlyUpgrade = billingInterval === 'yearly' && journalInterval !== 'yearly';
      if (!isYearlyUpgrade) return;
      proceedToCheckout(planId);
      return;
    }
    if (planId === 'top_secret' && hasActiveTopSecret) {
      const isYearlyUpgrade = billingInterval === 'yearly' && topSecretInterval !== 'yearly';
      if (!isYearlyUpgrade) return;
      proceedToCheckout(planId);
      return;
    }

    // The auto-cancel warning applies ONLY to Platform plans — they absorb standalone subs.
    const targetIsPlatform = planId === 'finotaur' || planId === 'enterprise';
    const hasStandaloneSubscriptions = hasActiveJournalSubscription || hasActiveTopSecret || hasActiveNewsletter;
    const hasExistingPlatform = currentPlatformPlan !== 'free';
    if (targetIsPlatform && (hasExistingPlatform || hasStandaloneSubscriptions)) {
      setPendingPlanId(planId);
      setShowUpgradeWarning(true);
      return;
    }

    proceedToCheckout(planId);
  };

  const getDisplayPrice = (plan: PlanConfig) => {
    if (plan.id === 'free') {
      return { price: 'Free', period: 'forever', billedAs: undefined };
    }
    if (billingInterval === 'monthly') {
      return { 
        price: plan.monthlyPrice, 
        period: '/month',
        billedAs: undefined
      };
    } else {
      return { 
        price: plan.yearlyMonthlyEquivalent, 
        period: '/month',
        billedAs: `Billed ${plan.yearlyPrice}/year`
      };
    }
  };

  // ============================================
  // SMART BANNER: shown above FINOTAUR card when user has expensive standalones
  // ============================================

  const FinotaurValueBanner = () => {
    if (!hasExpensiveStandalones) return null;

    const delta = standaloneMonthlyTotal - 89;
    const headline =
      delta >= 0
        ? `Save $${Math.round(delta)}/mo — go FINOTAUR`
        : `Get everything for just $${Math.round(Math.abs(delta))} more`;

    return (
      <div
        className="mb-4 rounded-xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)',
          border: '1px solid rgba(201,166,70,0.35)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-lg">💡</div>
          <div className="flex-1">
            <p className="text-[#C9A646] font-bold text-sm mb-1">{headline}</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              You pay{' '}
              <span className="text-white font-medium">${Math.round(standaloneMonthlyTotal)}/mo</span>{' '}
              for separate products. FINOTAUR bundles them all{' '}
              <span className="text-white">+ the full market engine</span> for $89.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (checkingSubscription) {
    return <RouteSkeleton />;
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen p-6 md:p-8 relative overflow-hidden">
      {/* Gold Animated Orbs Background */}
      <style>{`
        @keyframes pricing-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}
        .pricing-orb{animation:pricing-orb 8s ease-in-out infinite}
      `}</style>
      <div className="absolute top-[10%] left-[15%] w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] pricing-orb pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] pricing-orb pointer-events-none" style={{animationDelay:'3s'}} />
      <div className="absolute top-[50%] left-[50%] w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] pricing-orb pointer-events-none" style={{animationDelay:'5s'}} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Choose Your </span>
            <span className="text-[#C9A646]">Plan</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Built for who you are: a free start, a Trader desk, an Investor desk — or the full FINOTAUR engine.
          </p>
          {isAppTrial && (
            <p className="text-sm text-blue-400 max-w-2xl mx-auto mt-2 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              You're on your 14-day full-access trial — Trader and Investor features included.
            </p>
          )}
        </div>

        {/* Guarantee Box */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl relative overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.04) 100%)',
                 backdropFilter: 'blur(12px)',
                 border: '2px solid rgba(201,166,70,0.4)',
                 boxShadow: '0 0 40px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
               }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent pointer-events-none" />
            <div className="flex items-start gap-4 relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                   style={{
                     background: 'rgba(201,166,70,0.2)',
                     border: '1px solid rgba(201,166,70,0.4)',
                     boxShadow: '0 4px 16px rgba(201,166,70,0.2)'
                   }}>
                <Shield className="w-6 h-6 text-[#C9A646]" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-xl font-semibold text-white mb-2">
                  FINOTAUR — The Complete Trading Platform
                </h4>
                <p className="text-slate-300 text-base leading-relaxed">
                  Trader desk + Investor intel + Options Intelligence, Dark Pool flow & unlimited AI — the complete FINOTAUR arsenal, one price.
                  {proTrialUsed ? ' Start your subscription today!' : ' Try free for 14 days!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 v8.9.0: Yearly Protection Banner */}
        {(journalYearlyExpiresAt || platformYearlyExpiresAt) && (
          <div className="mb-6 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl flex items-start gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.04) 100%)',
                border: '1px solid rgba(16,185,129,0.35)',
              }}>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 font-semibold text-sm mb-1">
                  🔒 Your yearly subscription is protected
                </p>
                {journalYearlyExpiresAt && (
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    You have an active <span className="text-white font-medium capitalize">{journalYearlyPlan} Journal</span> yearly plan valid until{' '}
                    <span className="text-white font-medium">
                      {new Date(journalYearlyExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>. If you cancel your Platform plan, your Journal access will automatically restore until that date.
                  </p>
                )}
                {platformYearlyExpiresAt && (
                  <p className="text-zinc-400 text-xs leading-relaxed mt-1">
                    You have an active <span className="text-white font-medium capitalize">{platformYearlyPlan?.replace('platform_', '')} Platform</span> yearly plan valid until{' '}
                    <span className="text-white font-medium">
                      {new Date(platformYearlyExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>. If you cancel your current plan, access will automatically restore to that tier.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pro Trial Warning */}
        {proTrialUsed && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-amber-400 text-sm">
                ⚠️ You've already used your one-time Pro trial.
              </p>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-full p-1.5 shadow-xl">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                billingInterval === 'monthly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                billingInterval === 'yearly'
                  ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto pt-5">
          {plans.map((plan) => {
  const showFinotaurValueBanner = plan.id === 'finotaur' && hasExpensiveStandalones;
            const displayPrice = getDisplayPrice(plan);
            // Block same plan+same interval, allow upgrade to yearly
            const isSamePlanSameInterval = plan.id === currentPlatformPlan && 
              (billingInterval === currentBillingInterval || plan.id === 'free');
            const isSamePlanUpgradeToYearly = plan.id === currentPlatformPlan && 
              currentBillingInterval === 'monthly' && billingInterval === 'yearly';
            // 🔥 v6.1.0: If user is on yearly and viewing monthly, still show as "current" (downgrade blocked)
            const isSamePlanDowngradeToMonthly = plan.id === currentPlatformPlan &&
              currentBillingInterval === 'yearly' && billingInterval === 'monthly';
            // Standalone rungs (Trader/Investor) coexist and are owned independently of platform_plan —
            // mark their card as current only while no Platform plan is active.
            const ownsThisStandalone =
              currentPlatformPlan === 'free' &&
              ((plan.id === 'journal' && hasActiveJournalSubscription) ||
               (plan.id === 'top_secret' && hasActiveTopSecret));
            const standaloneInterval = plan.id === 'journal' ? journalInterval : topSecretInterval;
            const standaloneYearlyUpgradeAvailable = ownsThisStandalone && billingInterval === 'yearly' && standaloneInterval !== 'yearly';
            const isCurrentPlan = ((isSamePlanSameInterval || isSamePlanDowngradeToMonthly) && !isSamePlanUpgradeToYearly) || (ownsThisStandalone && !standaloneYearlyUpgradeAvailable);
            const isLoadingThis = loading === plan.id;

            // 🔥 גישה C: חסום Yearly → Monthly upgrade
            const planTierVal = PLAN_TIER[plan.id] ?? 0;
            const currentTierVal = PLAN_TIER[currentPlatformPlan] ?? 0;
            const isBlockedYearlyToMonthly =
              currentBillingInterval === 'yearly' &&
              billingInterval === 'monthly' &&
              planTierVal > currentTierVal &&
              !isCurrentPlan;
            
            return (
              <div
                key={plan.id}
                className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
                  plan.featured ? 'lg:scale-[1.02]' : ''
                }`}
                style={{
                  background: isCurrentPlan && plan.id !== 'free'
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.06) 40%, rgba(0,0,0,0.4) 100%)'
                    : plan.featured 
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: isCurrentPlan && plan.id !== 'free'
                    ? '2px solid rgba(201,166,70,0.7)'
                    : plan.featured 
                    ? '2px solid rgba(201,166,70,0.6)' 
                    : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isCurrentPlan && plan.id !== 'free'
                    ? '0 12px 50px rgba(201,166,70,0.3), 0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1)'
                    : plan.featured
                    ? '0 12px 50px rgba(201,166,70,0.5), 0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.15)'
                    : '0 6px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                }}
              >
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                     style={{
                       background: plan.featured
                         ? 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.2), transparent 60%)'
                         : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%)'
                     }} />
                
                {/* Subtle Shine Effect */}
                <div className="absolute top-0 left-0 right-0 h-32 opacity-30 pointer-events-none rounded-t-2xl"
                     style={{
                       background: plan.featured
                         ? 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)'
                         : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
                     }} />

                {/* Featured Badge */}
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                       style={{
                         background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                         boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                         color: '#000',
                         zIndex: 50
                       }}>
                    <TrendingUp className="w-4 h-4" />
                    Best Value
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && plan.id !== 'free' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                       style={{
                         background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                         boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                         color: '#000',
                         zIndex: 50,
                       }}>
                    <Crown className="w-3.5 h-3.5" />
                    Your Plan {currentBillingInterval === 'yearly' ? '(Yearly)' : currentBillingInterval === 'monthly' ? '(Monthly)' : ''}
                  </div>
                )}

                {/* Trial Badge for plans with a trial - only monthly, only if NOT current plan, not featured */}
                {plan.trialDays > 0 && !plan.featured && billingInterval === 'monthly' && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-blue-500 text-white whitespace-nowrap"
                       style={{ zIndex: 50 }}>
                    <Clock className="w-3 h-3" />
                    {plan.trialDays}-Day Free Trial
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && billingInterval === 'yearly' && !plan.featured && plan.id !== 'free' && (
                  <div className="absolute top-2 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg" style={{ zIndex: 50 }}>
                    {plan.savings}
                  </div>
                )}
                
                {/* Plan Info */}
                <div className="text-center mb-6 mt-4">
                  <h4 className="text-xl font-bold mb-2 text-white">{plan.name}</h4>
                  <div className="flex flex-col items-center justify-center gap-1 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                        {displayPrice.price}
                      </span>
                      {displayPrice.period && (
                        <span className="text-slate-400 text-sm">{displayPrice.period}</span>
                      )}
                    </div>
                    {displayPrice.billedAs && (
                      <span className="text-xs text-slate-500">{displayPrice.billedAs}</span>
                    )}
                    {plan.trialDays > 0 && billingInterval === 'monthly' && (
                      <span className={`text-xs mt-1 ${plan.featured ? 'text-[#C9A646]' : 'text-blue-400'}`}>
                        {plan.trialDays}-day free trial{plan.trialOnceOnly ? ' (one-time)' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full ${
                        plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                      } flex items-center justify-center shrink-0 mt-0.5`}
                           style={{ border: '1px solid rgba(201,166,70,0.4)' }}>
                        <Check className="h-2.5 w-2.5 text-[#C9A646]" />
                      </div>
                      <span
                        className={`text-sm text-slate-300 leading-tight ${isFlagship(feature) ? 'font-semibold text-white' : ''}`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* FINOTAUR value banner — shown when user has expensive standalones */}
                {showFinotaurValueBanner && <FinotaurValueBanner />}

                {/* Bundle Badges - Gold style above CTA */}
                {plan.includesJournal && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 bg-[#C9A646]/20 border border-[#C9A646]/50 px-3 py-1.5 rounded-full text-xs font-medium text-[#C9A646]">
                      <Gift className="w-3.5 h-3.5" />
                      +Trader (Journal)
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#C9A646]/20 border border-[#C9A646]/50 px-3 py-1.5 rounded-full text-xs font-medium text-[#C9A646]">
                      <Gift className="w-3.5 h-3.5" />
                      +Investor (TOP SECRET)
                    </span>
                  </div>
                )}

                {/* 🔥 גישה C: הודעת חסימה ל-Yearly → Monthly upgrade */}
                {isBlockedYearlyToMonthly && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                    <p className="text-amber-300 text-xs leading-relaxed">
                      You're on a <strong>Yearly plan</strong>. Switch to <strong>Yearly billing</strong> above to upgrade — or wait until your current cycle ends.
                    </p>
                  </div>
                )}

                {/* CTA Button */}
                {(() => {
                  const currentTier = PLAN_TIER[currentPlatformPlan] ?? 0;
                  const planTier = PLAN_TIER[plan.id] ?? 0;
                  const isDowngradeTier = planTier < currentTier && plan.id !== 'free' && currentPlatformPlan !== 'free';
                  return (
                <button 
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={plan.comingSoon || (isCurrentPlan && plan.id !== 'free') || isLoadingThis || checkoutLoading || isBlockedYearlyToMonthly}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                    plan.comingSoon
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : isBlockedYearlyToMonthly
                      ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed border border-amber-500/30'
                      : isCurrentPlan && plan.id === 'free'
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : plan.id === 'free' && currentPlatformPlan !== 'free'
                      ? 'border border-zinc-700 hover:border-red-500/40 hover:bg-red-500/5 text-zinc-400 hover:text-red-400'
                      : isDowngradeTier
                      ? 'border border-zinc-600 hover:border-amber-500/40 hover:bg-amber-500/5 text-zinc-400 hover:text-amber-400'
                      : isCurrentPlan
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : plan.featured 
                      ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]' 
                      : 'border-2 border-[#C9A646]/40 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white hover:scale-[1.02]'
                  }`}
                  style={!isCurrentPlan ? (plan.featured ? {
                    boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                  } : {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }) : undefined}
                >
                  {plan.comingSoon ? (
                    <span className="flex items-center justify-center gap-2">
                      Coming Soon
                    </span>
                  ) : isLoadingThis ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : isBlockedYearlyToMonthly ? (
                    <span className="flex items-center justify-center gap-2">
                      Switch to Yearly to Upgrade
                    </span>
                  ) : isCurrentPlan ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {isSamePlanDowngradeToMonthly ? 'Current Plan (Yearly)' : 'Current Plan'}
                    </span>
                  ) : isSamePlanUpgradeToYearly ? (
                    <span className="flex items-center justify-center gap-2">
                      Upgrade to Yearly (Save 17%) <span>→</span>
                    </span>
                  ) : plan.id === 'free' && currentPlatformPlan !== 'free' ? (
                    <span className="flex items-center justify-center gap-2">
                      <X className="w-3.5 h-3.5" />
                      Downgrade to Free
                    </span>
                  ) : plan.id === 'free' && currentPlatformPlan === 'free' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Current Plan
                    </span>
                  ) : isDowngradeTier ? (
                    <span className="flex items-center justify-center gap-2">
                      ↓ Downgrade to {plan.name}
                    </span>
                  ) : isAppTrial && (plan.id === 'journal' || plan.id === 'top_secret') ? (
                    <span className="flex items-center justify-center gap-2">
                      Keep {plan.name}
                      <span>→</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {billingInterval === 'yearly' && plan.trialDays > 0 ? 'Get Yearly Plan' : plan.cta}
                      <span>→</span>
                    </span>
                  )}
                </button>
                  );
                })()}

                {/* Subscription Info for Current Plan */}
                {isCurrentPlan && plan.id !== 'free' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30 space-y-1.5">
                    {isInTrial && trialEndsAt ? (
                      // בטריאל — מציג רק את תאריך סוף הטריאל
                      <p className="text-xs text-blue-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {cancelAtPeriodEnd ? 'Trial ends' : 'Trial ends'} {new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    ) : (
                      // לא בטריאל — מציג Access until או Next billing
                      <>
                        {cancelAtPeriodEnd && subscriptionExpiresAt && (
                          <p className="text-xs text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Access until {new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {!cancelAtPeriodEnd && subscriptionExpiresAt && (
                          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Next billing {new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </>
                    )}
                    {cancelAtPeriodEnd && (
                      <p className="text-xs text-amber-400/80">Cancellation pending</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Downgrade Confirmation Dialog */}
        {showDowngradeDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
                 style={{
                   background: 'linear-gradient(135deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.98) 100%)',
                   border: '1px solid rgba(63,63,70,0.5)',
                   boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                 }}>
              {/* Header */}
              <div className="relative px-5 pt-5 pb-3">
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Downgrade to Free?</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">You'll lose access at the end of your billing period.</p>
                  </div>
                </div>
              </div>

              {/* What you'll lose */}
              <div className="mx-5 mb-3">
                <div className="relative p-3 rounded-xl bg-gradient-to-r from-amber-500/5 via-red-500/5 to-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> What you'll lose
                  </p>
                  <div className="space-y-1.5">
                    {currentPlatformPlan === 'journal' && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Unlimited trades (back to 10)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Trade copier & backtest engine</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Mentor & community rooms</span>
                        </div>
                      </>
                    )}
                    {(currentPlatformPlan === 'finotaur' || currentPlatformPlan === 'enterprise') && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Stock Analyzer (unlimited → 3/day)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Sector Analyzer, Flow Scanner & AI tools</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          <span>Options Intelligence AI & Macro Analyzer</span>
                        </div>
                        {currentPlatformPlan === 'enterprise' && (
                          <div className="flex items-center gap-2 text-xs text-zinc-300">
                            <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                            <span>My Portfolio & AI portfolio manager</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1 h-1 rounded-full bg-[#C9A646] shrink-0" />
                          <span className="text-[#C9A646] font-medium">🎁 Top Secret Daily Briefing (INCLUDED)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1 h-1 rounded-full bg-[#C9A646] shrink-0" />
                          <span className="text-[#C9A646] font-medium">🎁 Top Secret Reports (INCLUDED)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1 h-1 rounded-full bg-[#C9A646] shrink-0" />
                          <span className="text-[#C9A646] font-medium">🎁 Journal Premium (INCLUDED)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-5 space-y-2">
                <button
                  onClick={() => setShowDowngradeDialog(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Keep My {currentPlatformPlan === 'journal' ? 'Trader' : currentPlatformPlan === 'top_secret' ? 'Investor' : currentPlatformPlan === 'finotaur' ? 'FINOTAUR' : 'ULTIMATE'} Plan
                </button>
                
                <button
                  onClick={async () => {
                    setShowDowngradeDialog(false);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) {
                        navigate('/app/settings?tab=billing');
                        toast.info('Please cancel from the Billing tab.');
                        return;
                      }

                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                        {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${session.access_token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            action: "cancel",
                            product: "platform",
                            reason: "User downgraded to free from Pricing page",
                          }),
                        }
                      );

                      const data = await response.json();
                      if (data.success) {
                        toast.success(data.message || 'Subscription will be cancelled at period end');
                        const { data: profileData } = await supabase
                          .from('profiles')
                          .select('platform_plan, platform_subscription_status, platform_billing_interval')
                          .eq('id', user.id)
                          .maybeSingle();
                        if (profileData) {
                          const rawPlan = profileData.platform_plan || 'free';
                          setCurrentPlatformPlan(rawPlan.replace('platform_', '') as PlatformPlanId);
                        }
                      } else {
                        toast.error(data.error || 'Failed to cancel. Try from Settings.');
                        navigate('/app/settings?tab=billing');
                      }
                    } catch (error) {
                      toast.error('Failed to cancel. Try from Settings.');
                      navigate('/app/settings?tab=billing');
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 text-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  Yes, I Want to Downgrade
                </button>
                
                <p className="text-center text-xs text-zinc-600">
                  {isInTrial ? 'Your free trial ends — no charge will be made' : 'Access continues until end of billing period'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 Downgrade Tier Dialog (e.g. Finotaur → Core) */}
        {showDowngradeTierDialog && pendingDowngradePlanId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
                 style={{
                   background: 'linear-gradient(135deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.98) 100%)',
                   border: '1px solid rgba(201,166,70,0.3)',
                   boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                 }}>
              <div className="px-6 pt-6 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Downgrade to {pendingDowngradePlanId.charAt(0).toUpperCase() + pendingDowngradePlanId.slice(1)}?
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Downgrading mid-cycle isn't possible. Your current{' '}
                  <span className="text-white font-medium capitalize">{currentPlatformPlan}</span> plan
                  is active until{' '}
                  <span className="text-[#C9A646] font-medium">
                    {(isInTrial && trialEndsAt ? trialEndsAt : subscriptionExpiresAt)
                      ? new Date(isInTrial && trialEndsAt ? trialEndsAt : subscriptionExpiresAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'the end of your billing period'}
                  </span>.
                  {isInTrial && (
                    <span className="block mt-1 text-xs text-blue-400">
                      (Your 14-day free trial ends on this date — no charge will be made)
                    </span>
                  )}
                </p>
              </div>

              <div className="mx-6 mb-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-sm text-zinc-300 font-medium mb-1">What to do instead:</p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Cancel your current plan now — you'll keep full access until your billing period ends.
                  Then subscribe to{' '}
                  <span className="text-white font-medium capitalize">{pendingDowngradePlanId}</span>{' '}
                  when it expires.
                </p>
              </div>

              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={() => setShowDowngradeTierDialog(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#D4BF8E] text-black font-medium transition-all flex items-center justify-center gap-2 hover:opacity-90"
                >
                  <Crown className="w-4 h-4" />
                  Keep My {currentPlatformPlan.charAt(0).toUpperCase() + currentPlatformPlan.slice(1)} Plan
                </button>

                <button
                  onClick={async () => {
                    setShowDowngradeTierDialog(false);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) {
                        navigate('/app/settings?tab=billing');
                        toast.info('Please cancel from the Billing tab.');
                        return;
                      }
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            action: 'cancel',
                            product: 'platform',
                            reason: `User downgrading from ${currentPlatformPlan} to ${pendingDowngradePlanId}`,
                          }),
                        }
                      );
                      const data = await response.json();
                      if (data.success) {
                        toast.success('Subscription cancelled — you keep access until your billing period ends.');
                        setCancelAtPeriodEnd(true);
                      } else {
                        toast.error(data.error || 'Failed to cancel. Try from Settings.');
                        navigate('/app/settings?tab=billing');
                      }
                    } catch {
                      toast.error('Failed to cancel. Try from Settings.');
                      navigate('/app/settings?tab=billing');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                  Cancel Current Plan & Downgrade Later
                </button>

                <p className="text-center text-xs text-zinc-500">
                  {isInTrial
                    ? 'Your free trial ends on this date — you will not be charged'
                    : 'Your access continues until the end of your billing period'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="mt-12 space-y-4 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#C9A646]" />
              <span className="text-sm">Bank-grade security</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">14 Days Full Access at Signup</span>
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

      {/* 🔥 Enterprise from Yearly Warning */}
      {showEnterpriseYearlyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowEnterpriseYearlyWarning(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)', border: '1px solid rgba(201,166,70,0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold text-base">Heads up about your Yearly plan</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              You're currently on a <span className="text-white font-medium capitalize">{currentPlatformPlan} Yearly</span> plan.
              Subscribing to Ultimate will <span className="text-amber-400 font-medium">cancel your current plan at the end of your billing period</span> — you'll keep full access until then.
            </p>
            <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 mb-5">
              <p className="text-xs text-zinc-400">
                📅 Your current plan remains active until:{' '}
                <span className="text-white font-medium">
                  {subscriptionExpiresAt
                    ? new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'end of billing period'}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEnterpriseYearlyWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowEnterpriseYearlyWarning(false);
                  proceedToCheckout('enterprise');
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #C9A646, #D4BF8E)', color: '#000' }}
              >
                Continue to Ultimate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Upgrade Warning Popup */}
      {showUpgradeWarning && pendingPlanId && (() => {
        // Build the actual list of subscriptions that will be auto-cancelled by this Platform upgrade.
        const cancelTargets: string[] = [];
        if (hasActiveJournalSubscription) cancelTargets.push('Trader');
        if (hasActiveTopSecret || hasActiveNewsletter) cancelTargets.push('Investor');
        if (currentPlatformPlan !== 'free') cancelTargets.push('current plan');
        const cancelList = cancelTargets.length > 1
          ? `${cancelTargets.slice(0, -1).join(', ')} and ${cancelTargets[cancelTargets.length - 1]}`
          : cancelTargets[0] ?? '';
        const pendingPlanName = pendingPlanId === 'enterprise' ? 'ULTIMATE' : 'FINOTAUR';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpgradeWarning(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)', border: '1px solid rgba(201,166,70,0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
                <span className="text-amber-400 text-lg">⚠️</span>
              </div>
              <h3 className="text-white font-semibold text-base">Heads up before you continue</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-5">
              Upgrading to {pendingPlanName} will <span className="text-amber-400 font-medium">automatically cancel</span> your {cancelList} subscription{cancelTargets.length > 1 ? 's' : ''} — everything included is part of your new plan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowUpgradeWarning(false);
                  proceedToCheckout(pendingPlanId);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #C9A646, #D4BF8E)', color: '#000' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}