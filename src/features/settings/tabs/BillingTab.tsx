// src/features/settings/tabs/BillingTab.tsx
// Extracted from SettingsLayout.tsx — BillingTab + billing helpers + 3 cancel Dialogs.
// Pure move: no logic or UI changes.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Crown, Zap, ArrowRight, CreditCard, Clock, Calendar, CheckCircle2, AlertCircle,
  TrendingUp, Flame,
  X, ExternalLink, Mail, BookOpen, AlertTriangle, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import {
  useSettings,
  getPlanInfo,
  formatDate,
  computeNextBilling,
} from "../settings-shared";
import { resolveTier, TIER_CONFIG } from "@/components/nav/SubscriptionBadge";
import { fetchCancellationReasons, submitCancellationFeedback, type CancellationReason } from "@/services/accountLifecycleService";
import { CancellationFeedbackFields } from "@/features/settings/CancellationFeedbackFields";

// ============================================
// 🔥 API HELPER: Manage Product Subscription
// ============================================

interface ProductSubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
  subscription?: {
    product: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    expiresAt: string | null;
  };
}

async function manageProductSubscription(
  action: "cancel" | "reactivate" | "status",
  product: "newsletter" | "top_secret",
  reason?: string
): Promise<ProductSubscriptionResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, product, reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ manageProductSubscription error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// TAB: BILLING
// ============================================

export const BillingTab = () => {
  const { profile, saving: _saving, refreshProfile } = useSettings();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Newsletter cancellation state
  const [showNewsletterCancelDialog, setShowNewsletterCancelDialog] = useState(false);
  const [showTopSecretCancelDialog, setShowTopSecretCancelDialog] = useState(false);
  const [cancellingTopSecret, setCancellingTopSecret] = useState(false);
  const [cancellingNewsletter, setCancellingNewsletter] = useState(false);


  // 🔥 NEW: Separate loading states for reactivation
  const [reactivatingNewsletter, setReactivatingNewsletter] = useState(false);
  const [reactivatingTopSecret, setReactivatingTopSecret] = useState(false);
  // 🔥 NEW: Upgrade states
  const [upgradingNewsletter, setUpgradingNewsletter] = useState(false);
  const [upgradingTopSecret, setUpgradingTopSecret] = useState(false);
  // 🔥 Platform cancel states
  const [showPlatformCancelDialog, setShowPlatformCancelDialog] = useState(false);
  const [cancellingPlatform, setCancellingPlatform] = useState(false);
  const [showPlatformDowngradeInfoDialog, setShowPlatformDowngradeInfoDialog] = useState(false);
  // Journal cancel states
  const [showJournalCancelDialog, setShowJournalCancelDialog] = useState(false);
  const [cancellingJournal, setCancellingJournal] = useState(false);
  const [reactivatingJournal, setReactivatingJournal] = useState(false);

  // Cancellation feedback (wired to the existing subscription_cancellation_feedback infra)
  const [cancelReasons, setCancelReasons] = useState<CancellationReason[]>([]);
  const [cancelReasonId, setCancelReasonId] = useState('');
  const [cancelFeedbackText, setCancelFeedbackText] = useState('');

  // Platform subscription (main website)
  // Canonical DB value is the BARE form ('core'|'finotaur'|'enterprise'); normalize to the
  // prefixed form this component compares against so bare values resolve correctly.
  const platformPlanRaw = profile?.platform_plan || 'free';
  const platformPlan = platformPlanRaw === 'core' ? 'platform_core'
    : platformPlanRaw === 'finotaur' ? 'platform_finotaur'
    : platformPlanRaw === 'enterprise' ? 'platform_enterprise'
    : platformPlanRaw;
  const platformStatus = profile?.platform_subscription_status || 'inactive';
  const platformInfo = getPlanInfo(platformPlan, 'platform');
  const platformIsActive = ['active', 'trial'].includes(platformStatus);
  const platformIsFree = platformPlan === 'free' || platformPlan === null || platformPlan === undefined || !platformPlan;

  // Trading Journal subscription
  const journalPlan = profile?.account_type || 'free';
  const journalStatus = profile?.subscription_status || 'inactive';
  const journalInfo = getPlanInfo(journalPlan, 'journal');
  const journalIsActive = ['active', 'trial'].includes(journalStatus);
  const journalIsFree = journalPlan === 'free' || !journalPlan;

  // Newsletter subscription (War Zone)
  const newsletterEnabled = profile?.newsletter_enabled ?? false;
  const newsletterPaid = profile?.newsletter_paid ?? false;
  const newsletterStatus = profile?.newsletter_status || 'inactive';
  const newsletterIsActive = newsletterStatus === 'active' || newsletterStatus === 'trial';
  const newsletterInterval = profile?.newsletter_interval || 'monthly';

  // Suppress unused variable warnings — values used in JSX conditions
  void newsletterEnabled;
  void newsletterPaid;

  // 🔥 v6 FIXED: Top Secret subscription - proper active detection
  const topSecretEnabled = profile?.top_secret_enabled ?? false;
  const topSecretStatus = profile?.top_secret_status || 'inactive';
  const topSecretIsInTrial = profile?.top_secret_is_in_trial ?? false;
  // 🔥 v6.1 FIX: Check enabled flag AND valid status for active state (including 'canceling')
  const topSecretIsActive = topSecretEnabled && ['active', 'trial', 'trialing', 'canceling'].includes(topSecretStatus);
  const topSecretInterval = profile?.top_secret_interval || 'monthly';

  // Resolve the user's unified membership tier (same logic as the TopNav badge)
  // and derive accent colors for the tier-themed subscriptions card.
  // v2026-07: an active Top Secret sub resolves to the INVESTOR tier.
  const currentTier = resolveTier(
    profile?.platform_plan ?? null,
    profile?.account_type ?? null,
    topSecretIsActive || newsletterIsActive,
  );
  const tierConfig = TIER_CONFIG[currentTier];
  const TierIcon = tierConfig.icon;
  const isFreeTier = currentTier === 'free';
  // FREE's edge is near-black (invisible on the dark card) -> fall back to neutral zinc.
  const tierAccent = isFreeTier ? '#3F3F46' : tierConfig.edge;
  const tierGlow = isFreeTier ? '#52525B' : tierConfig.peak;

  // Top Secret — flat pricing, 14-day free trial only (no intro discount)
  const getTopSecretPricingInfo = () => {
    // Use DB trial flag instead of calculating
    if (topSecretIsInTrial && profile?.top_secret_trial_ends_at) {
      const trialEndsAt = new Date(profile.top_secret_trial_ends_at);
      const now = new Date();
      const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      return {
        isInTrial: true,
        isInIntro: false,
        introMonthsRemaining: 0,
        currentPrice: 0,
        trialDaysRemaining,
      };
    }

    // Flat pricing — $50/mo, $499/yr, no intro discount
    return {
      isInTrial: false,
      isInIntro: false,
      introMonthsRemaining: 0,
      currentPrice: topSecretInterval === 'yearly' ? 499 : 50,
      trialDaysRemaining: 0,
    };
  };

  const topSecretPricing = getTopSecretPricingInfo();

  // 🔥 NEW: Newsletter (War Zone) Pricing Info
  const getNewsletterPricingInfo = () => {
    if (!profile?.newsletter_started_at) {
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 2, currentPrice: 0, trialDaysRemaining: 0 };
    }

    const startedAt = new Date(profile.newsletter_started_at);
    const now = new Date();

    // Trial is 7 days, then intro pricing kicks in (50% off for 2 months = $34.99)
    const trialEndDate = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const introEndDate = new Date(trialEndDate.getTime() + 2 * 30 * 24 * 60 * 60 * 1000); // ~2 months after trial

    if (now < trialEndDate) {
      // Still in trial
      return { isInTrial: true, isInIntro: false, introMonthsRemaining: 2, currentPrice: 0, trialDaysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) };
    } else if (now < introEndDate) {
      // In intro period ($34.99/mo - 50% off)
      const monthsIntoIntro = Math.floor((now.getTime() - trialEndDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      return { isInTrial: false, isInIntro: true, introMonthsRemaining: 2 - monthsIntoIntro, currentPrice: 44.99 };
    } else {
      // Regular pricing ($69.99/mo)
      return { isInTrial: false, isInIntro: false, introMonthsRemaining: 0, currentPrice: 69.99 };
    }
  };

  const newsletterPricing = getNewsletterPricingInfo();

  const isLifetime = profile?.is_lifetime ?? false;

  // ── Cancellation feedback wiring ──────────────────────────────
  useEffect(() => {
    fetchCancellationReasons().then(setCancelReasons).catch(() => { /* non-fatal */ });
  }, []);

  const canSubmitCancelFeedback = !!cancelReasonId && cancelFeedbackText.trim().length >= 3;

  const submitCancelFeedbackSafe = async (planCancelled: string, subscriptionType: string) => {
    try {
      await submitCancellationFeedback({
        reasonId: cancelReasonId,
        feedbackText: cancelFeedbackText.trim(),
        planCancelled,
        subscriptionType,
        sourceAction: 'user_initiated_in_app',
      });
    } catch (e) {
      console.error('Failed to submit cancellation feedback:', e);
    }
  };

  const handleCancelNewsletter = async (cancelBothProducts?: boolean, confirmPriceIncrease?: boolean) => {
    if (!user) return;

    setCancellingNewsletter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
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
            product: "newsletter",
            reason: "User requested cancellation",
            cancelBothProducts,
            confirmPriceIncrease,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel newsletter");
      }

      // Refresh profile to get updated state from DB
      await refreshProfile();

      await submitCancelFeedbackSafe('Daily Newsletter', 'newsletter');
      setCancelReasonId('');
      setCancelFeedbackText('');
      setShowNewsletterCancelDialog(false);
      toast.success(data.message || 'Newsletter subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel newsletter');
    } finally {
      setCancellingNewsletter(false);
    }
  };

  // Handle newsletter reactivation
  const handleReactivateNewsletter = async () => {
    setReactivatingNewsletter(true);
    try {
      const result = await manageProductSubscription("reactivate", "newsletter");

      if (!result.success) {
        throw new Error(result.error || "Failed to reactivate newsletter");
      }

      // Refresh profile to get updated state from DB
      await refreshProfile();

      toast.success(result.message || 'Newsletter subscription reactivated');
    } catch (error) {
      console.error('Error reactivating newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate newsletter');
    } finally {
      setReactivatingNewsletter(false);
    }
  };



  // Handle Top Secret cancellation
  const handleCancelTopSecret = async (cancelBothProducts?: boolean, confirmPriceIncrease?: boolean) => {
    if (!user) return;
    setCancellingTopSecret(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
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
            product: "top_secret",
            reason: "User requested cancellation",
            cancelBothProducts,
            confirmPriceIncrease,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel Investor subscription");
      }

      // Refresh profile to get updated state from DB
      await refreshProfile();

      await submitCancelFeedbackSafe('Top Secret', 'top_secret');
      setCancelReasonId('');
      setCancelFeedbackText('');
      setShowTopSecretCancelDialog(false);
      toast.success(data.message || 'Investor subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel Investor subscription');
    } finally {
      setCancellingTopSecret(false);
    }
  };

  // Handle Top Secret reactivation
  const handleReactivateTopSecret = async () => {
    setReactivatingTopSecret(true);
    try {
      const result = await manageProductSubscription("reactivate", "top_secret");

      if (!result.success) {
        throw new Error(result.error || "Failed to reactivate Investor subscription");
      }

      // Refresh profile to get updated state from DB
      await refreshProfile();

      toast.success(result.message || 'Investor subscription reactivated');
    } catch (error) {
      console.error('Error reactivating Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate Investor subscription');
    } finally {
      setReactivatingTopSecret(false);
    }
  };

  // 🔥 NEW: Handle Newsletter upgrade from Monthly to Yearly
  const handleUpgradeNewsletterToYearly = async () => {
    if (!user) return;

    setUpgradingNewsletter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call create-whop-checkout edge function with yearly plan
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whop-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: 'plan_bp2QTGuwfpj0A', // War Zone Yearly plan
            subscription_category: 'newsletter',
            email: user.email,
            user_id: user.id,
            redirect_url: `${window.location.origin}/app/settings?tab=billing&upgrade=newsletter_yearly_success`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Whop checkout
      window.location.href = data.checkout_url;

    } catch (error) {
      console.error('Error upgrading newsletter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade');
      setUpgradingNewsletter(false);
    }
  };

  // 🔥 NEW: Handle Top Secret upgrade from Monthly to Yearly
  const handleUpgradeTopSecretToYearly = async () => {
    if (!user) return;

    setUpgradingTopSecret(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call create-whop-checkout edge function with yearly plan
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-whop-checkout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: 'plan_7Lf31ygMAMmK8', // Top Secret Yearly plan
            subscription_category: 'top_secret',
            email: user.email,
            user_id: user.id,
            redirect_url: `${window.location.origin}/app/settings?tab=billing&upgrade=top_secret_yearly_success`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Whop checkout
      window.location.href = data.checkout_url;

    } catch (error) {
      console.error('Error upgrading Top Secret:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade');
      setUpgradingTopSecret(false);
    }
  };


  // 🔥 Handle Platform subscription cancellation
  const handleCancelPlatform = async () => {
    if (!user) return;

    setCancellingPlatform(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

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
            reason: "User requested cancellation",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel platform subscription");

      await refreshProfile();
      await submitCancelFeedbackSafe(platformInfo.name, 'platform');
      setCancelReasonId('');
      setCancelFeedbackText('');
      setShowPlatformCancelDialog(false);
      toast.success(data.message || 'Platform subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling platform:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel');
    } finally {
      setCancellingPlatform(false);
    }
  };

  // Handle Journal subscription cancellation
  const handleCancelJournal = async () => {
    if (!user) return;

    setCancellingJournal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

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
            product: "journal",
            reason: "User requested cancellation",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel journal subscription");

      await refreshProfile();
      await submitCancelFeedbackSafe(journalInfo.name, 'journal');
      setCancelReasonId('');
      setCancelFeedbackText('');
      setShowJournalCancelDialog(false);
      toast.success(data.message || 'Trading Journal subscription will be cancelled at period end');
    } catch (error) {
      console.error('Error cancelling journal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel journal subscription');
    } finally {
      setCancellingJournal(false);
    }
  };

  // Handle Journal subscription reactivation
  const handleReactivateJournal = async () => {
    setReactivatingJournal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reactivate",
            product: "journal",
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Trading Journal subscription reactivated!');
        await refreshProfile();
      } else {
        toast.error(data.error || 'Failed to reactivate journal subscription');
      }
    } catch (error) {
      toast.error('Failed to reactivate journal subscription');
    } finally {
      setReactivatingJournal(false);
    }
  };

  // 🔥 Handle Platform reactivation
  const handleReactivatePlatform = async () => {
    setCancellingPlatform(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reactivate",
            product: "platform",
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Platform subscription reactivated!');
        await refreshProfile();
      } else {
        toast.error(data.error || 'Failed to reactivate');
      }
    } catch (error) {
      toast.error('Failed to reactivate platform subscription');
    } finally {
      setCancellingPlatform(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Subscriptions</h1>
          <p className="text-sm text-zinc-500">Manage your plans</p>
        </div>
      </div>

      {/* Subscriptions Card — tier-colored, War-Zone-sized layout */}
      <Card
        className="p-6 relative overflow-hidden shadow-xl border"
        style={{
          background: `linear-gradient(135deg, ${tierAccent}29 0%, rgba(24,24,27,0.88) 55%, rgba(24,24,27,0.94) 100%)`,
          borderColor: `${tierAccent}4D`,
          boxShadow: `0 20px 50px -12px rgba(0,0,0,0.55), 0 0 40px -10px ${tierAccent}33`,
        }}
      >
        {/* Tier glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(110deg, transparent 45%, ${tierAccent}1A 100%)` }}
        />
        {/* Top light bar */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${tierGlow}80, transparent)` }}
        />

        <div className="relative">
          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border"
                style={{
                  background: `linear-gradient(135deg, ${tierAccent}5C, ${tierAccent}24)`,
                  borderColor: `${tierAccent}80`,
                }}
              >
                <TierIcon className="w-5 h-5" style={{ color: tierConfig.labelColor }} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">Active Plans</h2>
                <p className="text-xs font-medium" style={{ color: tierConfig.labelColor }}>
                  {tierConfig.label} membership
                </p>
              </div>
            </div>
            <a
              href="https://whop.com/@me/settings/orders/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              Manage on Whop <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Plan rows — inner panel */}
          <div className="px-4 py-1 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">

        {/* Row 1 — Platform */}
        <div className="flex items-center gap-2 py-2.5 border-b border-zinc-800/60">
          <Zap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-500 w-20 shrink-0">Platform</span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', platformInfo.color)}>
            {platformInfo.name}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {(platformIsFree || platformPlan === 'free') ? (
              <button
                onClick={() => navigate('/app/upgrade')}
                className="text-xs text-[#C9A646] hover:text-[#E5C76B] font-medium transition-colors"
              >
                Upgrade
              </button>
            ) : profile?.platform_cancel_at_period_end ? (
              <>
                <span className="text-xs text-amber-400">
                  Cancelling · access until {formatDate(profile?.platform_subscription_expires_at)}
                </span>
                <button
                  onClick={handleReactivatePlatform}
                  disabled={cancellingPlatform}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
                >
                  {cancellingPlatform ? 'Restoring…' : 'Undo'}
                </button>
              </>
            ) : (
              <>
                {platformInfo.price && (
                  <span className="text-xs text-zinc-500">
                    {platformInfo.price}{profile?.platform_subscription_expires_at ? ` · ${formatDate(profile.platform_subscription_expires_at)}` : ''}
                  </span>
                )}
                <button
                  onClick={() => setShowPlatformCancelDialog(true)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Unsubscribe
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2 — Trading Journal */}
        <div className="flex items-center gap-2 py-2.5 border-b border-zinc-800/60">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-500 w-20 shrink-0">Journal</span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', journalInfo.color)}>
            {journalInfo.name}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {journalIsFree ? (
              <button
                onClick={() => navigate('/app/journal/overview')}
                className="text-xs text-[#C9A646] hover:text-[#E5C76B] font-medium transition-colors"
              >
                Upgrade
              </button>
            ) : profile?.subscription_cancel_at_period_end ? (
              <>
                <span className="text-xs text-amber-400">
                  Cancelling · access until {formatDate(profile?.subscription_expires_at)}
                </span>
                <button
                  onClick={handleReactivateJournal}
                  disabled={reactivatingJournal}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
                >
                  {reactivatingJournal ? 'Restoring…' : 'Undo'}
                </button>
              </>
            ) : (
              <>
                {journalInfo.price && (
                  <span className="text-xs text-zinc-500">
                    {journalInfo.price}{profile?.subscription_expires_at ? ` · ${formatDate(profile.subscription_expires_at)}` : ''}
                  </span>
                )}
                {journalIsActive && (
                  <button
                    onClick={() => setShowJournalCancelDialog(true)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Unsubscribe
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 3 — Newsletters */}
        <div className="flex items-center gap-2 py-2.5">
          <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-500 w-20 shrink-0">Newsletters</span>
          <span className="text-xs text-zinc-300">
            {(() => {
              const active: string[] = [];
              if (newsletterStatus === 'active' || newsletterStatus === 'trial') active.push('Investor');
              if (topSecretStatus === 'active' || topSecretStatus === 'trial') active.push('Investor');
              return active.length > 0 ? active.join(', ') : 'None';
            })()}
          </span>
        </div>
          </div>
          {/* /Plan rows inner panel */}

        {/* Platform Downgrade Info Dialog — preserved */}
        {showPlatformDowngradeInfoDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-100">Plan Change Not Available</h3>
                    <p className="text-sm text-zinc-400">Mid-cycle plan changes</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-blue-200 text-sm leading-relaxed">
                    Downgrading mid-cycle isn't supported. You've already paid for your current{' '}
                    <strong>{profile?.platform_plan?.replace('platform_', '')?.charAt(0).toUpperCase() + (profile?.platform_plan?.replace('platform_', '')?.slice(1) || '')}</strong>{' '}
                    plan through{' '}
                    <strong>
                      {profile?.platform_subscription_expires_at
                        ? new Date(profile.platform_subscription_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'the end of your billing period'}
                    </strong>.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-2">
                  <p className="text-zinc-300 text-sm font-medium">What you can do instead:</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Keep your current plan until it expires, then choose a different plan from the pricing page when your cycle ends.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={() => setShowPlatformDowngradeInfoDialog(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Stay on Current Plan
                </button>
                <button
                  onClick={() => { setShowPlatformDowngradeInfoDialog(false); navigate('/app/upgrade'); }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Plans
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        {/* /relative */}
      </Card>

      {/* 🔥 WAR ZONE NEWSLETTER CARD - Show only for existing newsletter subscribers */}
      {newsletterIsActive && !['platform_finotaur', 'platform_enterprise'].includes(platformPlan) && (
      <Card className={cn(
        "p-6 relative overflow-hidden shadow-xl",
        newsletterIsActive && newsletterInterval === 'yearly'
          ? "bg-gradient-to-br from-yellow-950/40 via-amber-950/30 to-zinc-900/90 border-2 border-yellow-500/40 shadow-yellow-900/20"
          : "bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-900/90 border-purple-600/30 shadow-purple-900/10"
      )}>
        {/* Subtle animated glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r via-transparent",
          newsletterIsActive && newsletterInterval === 'yearly'
            ? "from-yellow-500/10 to-amber-500/10"
            : "from-purple-600/5 to-purple-600/5"
        )} />
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
          newsletterIsActive && newsletterInterval === 'yearly'
            ? "via-yellow-500/60"
            : "via-purple-500/50"
        )} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                newsletterIsActive && newsletterInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-500/40 to-amber-500/30 border border-yellow-500/50 shadow-yellow-500/30"
                  : "bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-500/40 shadow-purple-500/20"
              )}>
                <Mail className={cn(
                  "w-5 h-5",
                  newsletterIsActive && newsletterInterval === 'yearly' ? "text-yellow-300" : "text-purple-300"
                )} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">Daily Newsletter</h2>
                <p className="text-xs text-zinc-400">Daily Market Newsletter</p>
              </div>
            </div>
            {newsletterIsActive && (
              <a
                href="https://whop.com/@me/settings/orders/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
              >
                Manage on Whop <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Main Content Box */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">
            {/* Plan & Price Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">
                  {newsletterIsActive ? 'Investor Access' : 'Not Subscribed'}
                </span>
                {newsletterIsActive && newsletterInterval === 'yearly' && (
                  <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50 text-xs px-2.5 py-1 shadow-lg shadow-yellow-500/20">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />Annual Member
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  "px-2.5 py-1",
                  profile?.newsletter_cancel_at_period_end
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : newsletterIsActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : newsletterStatus === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                )}>
                  {profile?.newsletter_cancel_at_period_end ? (
                    <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                  ) : newsletterIsActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />{newsletterStatus === 'trial' ? 'Trial' : 'Active'}</>
                  ) : newsletterStatus === 'cancelled' ? (
                    <><AlertCircle className="w-3 h-3 mr-1" />Cancelled</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 mr-1" />Inactive</>
                  )}
                </Badge>
              </div>
              <div className="text-right">
                {newsletterIsActive ? (
                  newsletterInterval === 'yearly' ? (
                    <span className="text-xl font-bold text-white">$699/yr</span>
                  ) : newsletterPricing.isInTrial ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">Free Trial</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                        {newsletterPricing.trialDaysRemaining} days left
                      </Badge>
                    </div>
                  ) : newsletterPricing.isInIntro ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">$44.99/mo</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2 py-0.5">
                        50% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-white">$69.99/mo</span>
                  )
                ) : (
                  <span className="text-xl font-bold text-white">$69.99/mo</span>
                )}
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Daily market intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Private Discord access</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Institutional-grade analysis</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Exclusive market alerts</span>
              </div>
            </div>

            {/* Billing Info for Active Subscribers */}
            {newsletterIsActive && (
              <div className={cn(
                "mb-5 p-4 rounded-lg",
                newsletterInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/40"
              )}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                    <p className={cn(
                      "capitalize font-medium",
                      newsletterInterval === 'yearly' ? "text-yellow-300" : "text-zinc-200"
                    )}>
                      {newsletterInterval === 'yearly' ? '✨ Yearly' : 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                      {newsletterPricing.isInTrial ? 'First charge' : 'Next billing'}
                    </p>
                    <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {newsletterPricing.isInTrial && profile?.newsletter_started_at
                        ? formatDate(new Date(new Date(profile.newsletter_started_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
                        : formatDate(profile?.newsletter_expires_at ?? computeNextBilling(profile?.newsletter_paid_at ?? profile?.newsletter_started_at, profile?.newsletter_interval))
                      }
                    </p>
                  </div>
                </div>

                {newsletterInterval === 'monthly' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30">
                    {newsletterPricing.isInTrial ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">7-Day Trial</Badge>
                        <span className="text-zinc-400">→ Then $69.99/mo after trial</span>
                      </div>
                    ) : newsletterPricing.isInIntro ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Intro Pricing</Badge>
                        <span className="text-zinc-400">
                          {newsletterPricing.introMonthsRemaining === 2
                            ? '$44.99 → $44.99 → Then $69.99/mo'
                            : '$44.99 → Then $69.99/mo'
                          }
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Regular pricing active</p>
                    )}
                  </div>
                )}

                {profile?.newsletter_started_at && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/30">
                    <p className="text-xs text-zinc-500">Member since {formatDate(profile.newsletter_started_at)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status Footer */}
            {newsletterIsActive ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    {profile?.newsletter_cancel_at_period_end ? (
                      <span>Access until {formatDate(
                        newsletterPricing.isInTrial && profile?.newsletter_trial_ends_at
                          ? profile.newsletter_trial_ends_at
                          : profile?.newsletter_expires_at
                      )}</span>
                    ) : newsletterStatus === 'trial' ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        Trial expires {formatDate(profile?.newsletter_trial_ends_at)}
                      </span>
                    ) : (
                      <span>Full access active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 🔥 NEW: Upgrade to Yearly button for monthly subscribers */}
                    {newsletterInterval === 'monthly' && !profile?.newsletter_cancel_at_period_end && (
<Button
  size="sm"
  onClick={handleUpgradeNewsletterToYearly}
  disabled={upgradingNewsletter}
  className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
>
  {upgradingNewsletter ? (
    <><Spinner size="sm" color="inherit" className="mr-1.5" />Upgrading...</>
  ) : (
    <><Crown className="w-3.5 h-3.5 mr-1.5" />Upgrade to Yearly (Save $140)</>
  )}
</Button>
                    )}
                    {profile?.newsletter_cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReactivateNewsletter}
                        disabled={reactivatingNewsletter}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/50"
                      >
                        {reactivatingNewsletter ? (
                          <><Spinner size="sm" className="mr-1.5" />Restoring...</>
                        ) : (
                          <>Undo Cancellation</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewsletterCancelDialog(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : newsletterStatus === 'cancelled' ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Subscription cancelled</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivateNewsletter}
                    disabled={_saving}
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                  >
                    {_saving ? <><Spinner size="sm" className="mr-1.5" />Reactivating...</> : <>Reactivate</>}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
      )}

      {/* 🔥 TOP SECRET CARD - Hide if user has Finotaur/Enterprise Platform */}
      {!['platform_finotaur', 'platform_enterprise'].includes(platformPlan) && (
      <Card className={cn(
        "p-6 relative overflow-hidden shadow-xl",
        topSecretIsActive && topSecretInterval === 'yearly'
          ? "bg-gradient-to-br from-yellow-950/40 via-amber-950/30 to-zinc-900/90 border-2 border-yellow-500/40 shadow-yellow-900/20"
          : "bg-gradient-to-br from-red-950/40 via-zinc-900/80 to-zinc-900/90 border-red-600/30 shadow-red-900/10"
      )}>


        {/* Subtle animated glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r via-transparent",
          topSecretIsActive && topSecretInterval === 'yearly'
            ? "from-yellow-500/10 to-amber-500/10"
            : "from-red-600/5 to-orange-600/5"
        )} />
        <div className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
          topSecretIsActive && topSecretInterval === 'yearly'
            ? "via-yellow-500/60"
            : "via-red-500/50"
        )} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                topSecretIsActive && topSecretInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-500/40 to-amber-500/30 border border-yellow-500/50 shadow-yellow-500/30"
                  : "bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/40 shadow-red-500/20"
              )}>
                <Flame className={cn(
                  "w-5 h-5",
                  topSecretIsActive && topSecretInterval === 'yearly' ? "text-yellow-300" : "text-red-300"
                )} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                  Investor
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px] px-2 py-0.5 uppercase tracking-wider">
                    Classified
                  </Badge>
                </h2>
                <p className="text-xs text-zinc-400">Intel, Research &amp; AI — The Investor Desk</p>
              </div>
            </div>
            {topSecretIsActive && (
              <a
                href="https://whop.com/@me/settings/orders/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-xs flex items-center gap-1.5 transition-colors",
                  topSecretInterval === 'yearly'
                    ? "text-zinc-500 hover:text-yellow-300"
                    : "text-zinc-500 hover:text-red-300"
                )}
              >
                Manage on Whop <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Main Content Box */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm">
            {/* Plan & Price Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">
                  {topSecretIsActive ? 'Investor Access' : 'Not Subscribed'}
                </span>
                {topSecretIsActive && topSecretInterval === 'yearly' && (
                  <Badge className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50 text-xs px-2.5 py-1 shadow-lg shadow-yellow-500/20">
                    <Crown className="w-3.5 h-3.5 mr-1.5" />Annual Member
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  "px-2.5 py-1",
                  profile?.top_secret_cancel_at_period_end
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : topSecretIsActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : topSecretStatus === 'cancelled'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                )}>
                  {profile?.top_secret_cancel_at_period_end ? (
                    <><Clock className="w-3 h-3 mr-1" />Cancelling</>
                  ) : topSecretIsActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                  ) : topSecretStatus === 'cancelled' ? (
                    <><AlertCircle className="w-3 h-3 mr-1" />Cancelled</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 mr-1" />Inactive</>
                  )}
                </Badge>
              </div>
              <div className="text-right">
                {topSecretIsActive ? (
                  topSecretInterval === 'yearly' ? (
                    <span className="text-xl font-bold text-white">$499/yr</span>
                  ) : topSecretPricing.isInTrial ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">Free Trial</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                        {topSecretPricing.trialDaysRemaining} days left
                      </Badge>
                    </div>
                  ) : topSecretPricing.isInIntro ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">$50/mo</span>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-white">$50/mo</span>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">$50/mo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Market intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Private Discord access</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Premium insider alerts</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Crown className="w-4 h-4 text-[#C9A646] shrink-0" />
                <span>Early feature access</span>
              </div>
            </div>

            {/* Billing Info for Active Subscribers */}
            {topSecretIsActive && (
              <div className={cn(
                "mb-5 p-4 rounded-lg",
                topSecretInterval === 'yearly'
                  ? "bg-gradient-to-br from-yellow-900/20 to-amber-900/10 border border-yellow-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/40"
              )}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Billing cycle</p>
                    <p className={cn(
                      "capitalize font-medium",
                      topSecretInterval === 'yearly' ? "text-yellow-300" : "text-zinc-200"
                    )}>
                      {topSecretInterval === 'yearly' ? '✨ Yearly' : 'Monthly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                      {topSecretPricing.isInTrial ? 'First charge' : 'Next billing'}
                    </p>
                    <p className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {topSecretPricing.isInTrial && profile?.top_secret_started_at
                        ? formatDate(new Date(new Date(profile.top_secret_started_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString())
                        : formatDate(profile?.top_secret_expires_at ?? computeNextBilling(profile?.top_secret_trial_ends_at ?? profile?.top_secret_started_at, profile?.top_secret_interval))
                      }
                    </p>
                  </div>
                </div>

                {topSecretInterval === 'monthly' && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30">
                    {topSecretPricing.isInTrial ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">14-Day Trial</Badge>
                        <span className="text-zinc-400">→ Then $50/mo after trial</span>
                      </div>
                    ) : topSecretPricing.isInIntro ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Intro Pricing</Badge>
                        <span className="text-zinc-400">Then $50/mo</span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Regular pricing active</p>
                    )}
                  </div>
                )}

                {profile?.top_secret_started_at && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/30">
                    <p className="text-xs text-zinc-500">Member since {formatDate(profile.top_secret_started_at)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Status Footer */}
            {topSecretIsActive ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    {profile?.top_secret_cancel_at_period_end ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Access until {formatDate(
                          topSecretPricing.isInTrial && profile?.top_secret_trial_ends_at
                            ? profile.top_secret_trial_ends_at
                            : profile?.top_secret_expires_at
                        )}
                      </span>
                    ) : (
                      <span>Full classified access</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 🔥 NEW: Upgrade to Yearly button for monthly subscribers */}
                    {topSecretInterval === 'monthly' && !profile?.top_secret_cancel_at_period_end && (
                      <Button
                        size="sm"
                        onClick={handleUpgradeTopSecretToYearly}
                        disabled={upgradingTopSecret}
                        className="bg-gradient-to-r from-[#C9A646] via-[#E5C76B] to-[#C9A646] hover:from-[#D4B04F] hover:via-[#F0D87A] hover:to-[#D4B04F] text-black font-semibold shadow-lg shadow-[#C9A646]/30 border border-[#C9A646]/50 transition-all duration-300 hover:shadow-[#C9A646]/50 hover:scale-[1.02]"
                      >
                        {upgradingTopSecret ? (
                          <><Spinner size="sm" color="inherit" className="mr-1.5" />Upgrading...</>
                        ) : (
                          <><Crown className="w-3.5 h-3.5 mr-1.5" />Upgrade to Yearly (Save $101)</>
                        )}
                      </Button>
                    )}
                    {profile?.top_secret_cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReactivateTopSecret}
                        disabled={reactivatingTopSecret}
                        className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:border-red-400/50"
                      >
                        {reactivatingTopSecret ? (
                          <><Spinner size="sm" className="mr-1.5" />Restoring...</>
                        ) : (
                          <>Undo Cancellation</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTopSecretCancelDialog(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30"
                      >
                        Unsubscribe
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : topSecretStatus === 'cancelled' ? (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Subscription cancelled</span>
                  <Button
                    onClick={() => navigate('/app/top-secret')}
                    variant="outline"
                    size="sm"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                  >
                    Resubscribe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-zinc-700/50">
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 text-center font-medium">
                    🔥 14-day FREE trial → then $50/mo
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/app/top-secret')}
                  size="sm"
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-red-900/20"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      )}
      {/* Platform Cancel Confirmation Dialog */}
      <Dialog open={showPlatformCancelDialog} onOpenChange={setShowPlatformCancelDialog}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-[#C9A646]/20 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white mb-1">
                Cancel {platformInfo.name} Plan?
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                You'll lose access to all {platformInfo.name} features at the end of your billing period.
              </DialogDescription>
            </div>
          </div>

          <div className="mx-6 mb-4">
            <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-medium text-amber-300">What you'll lose</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>All premium market analysis tools</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Advanced charts & indicators</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>AI Assistant & Flow Scanner</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Priority support access</span>
                  </div>
                  {['platform_finotaur', 'platform_enterprise'].includes(platformPlan) && (
                    <>
                      <div className="flex items-center gap-2.5 text-sm text-amber-300 font-medium mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>⚠️ Investor (Top Secret) access</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-amber-300 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>⚠️ Top Secret Reports access</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-amber-300 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>⚠️ Trader (Journal) access</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <CancellationFeedbackFields reasons={cancelReasons} reasonId={cancelReasonId} onReasonChange={setCancelReasonId} text={cancelFeedbackText} onTextChange={setCancelFeedbackText} />
          <div className="p-6 pt-2 space-y-3">
            <button
              onClick={() => setShowPlatformCancelDialog(false)}
              disabled={cancellingPlatform}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Keep My {platformInfo.name} Plan
            </button>

            <button
              onClick={handleCancelPlatform}
              disabled={cancellingPlatform || !canSubmitCancelFeedback}
              className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingPlatform ? (
                <><Spinner size="sm" /><span>Cancelling...</span></>
              ) : (
                <><X className="w-4 h-4" /><span>Yes, Cancel My Subscription</span></>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500">
              You'll retain access until {formatDate(profile?.platform_subscription_expires_at)}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Journal Cancel Confirmation Dialog */}
      <Dialog open={showJournalCancelDialog} onOpenChange={setShowJournalCancelDialog}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-zinc-500/20 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white mb-1">
                Cancel Trading Journal?
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Your {journalInfo.name} Trading Journal subscription will be cancelled at the end of your billing period. You'll keep full access until {formatDate(profile?.subscription_expires_at)}.
              </DialogDescription>
            </div>
          </div>

          <div className="mx-6 mb-4">
            <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-medium text-amber-300">What you'll lose</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Unlimited trade logging</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Advanced performance analytics</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Strategy tracking & tagging</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Broker sync & auto-import</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <CancellationFeedbackFields reasons={cancelReasons} reasonId={cancelReasonId} onReasonChange={setCancelReasonId} text={cancelFeedbackText} onTextChange={setCancelFeedbackText} />
          <div className="p-6 pt-2 space-y-3">
            <button
              onClick={() => setShowJournalCancelDialog(false)}
              disabled={cancellingJournal}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Keep My Journal Subscription
            </button>

            <button
              onClick={handleCancelJournal}
              disabled={cancellingJournal || !canSubmitCancelFeedback}
              className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingJournal ? (
                <><Spinner size="sm" /><span>Cancelling...</span></>
              ) : (
                <><X className="w-4 h-4" /><span>Yes, Cancel My Subscription</span></>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500">
              You'll retain access until {formatDate(profile?.subscription_expires_at)}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="p-4 bg-zinc-900/30 border-zinc-800">
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          All subscriptions are managed through Whop. Click "Manage on Whop" to update your plan, billing, or cancel.
        </p>
      </Card>

      {/* Newsletter Cancel Confirmation Dialog - Premium Design */}
<Dialog open={showNewsletterCancelDialog} onOpenChange={setShowNewsletterCancelDialog}>
  <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
    {/* Premium Header with Gradient */}
    <div className="relative px-6 pt-6 pb-4">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />

      <div className="relative">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/10">
          <Mail className="w-6 h-6 text-purple-400" />
        </div>

        <DialogTitle className="text-xl font-semibold text-white mb-1">
          Cancel Investor?
        </DialogTitle>
        <DialogDescription className="text-zinc-400 text-sm">
          You'll stop receiving our daily market intelligence reports and exclusive insights.
        </DialogDescription>
      </div>
    </div>

    {/* What you'll miss section */}
    <div className="mx-6 mb-4">
      <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">What you'll miss</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Daily institutional-grade market analysis</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Exclusive market alerts & signals</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Private Discord community access</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Early access to market-moving intel</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CancellationFeedbackFields reasons={cancelReasons} reasonId={cancelReasonId} onReasonChange={setCancelReasonId} text={cancelFeedbackText} onTextChange={setCancelFeedbackText} />
    {/* Action Buttons */}
    <div className="p-6 pt-2 space-y-3">
      {/* Keep Subscription - Primary CTA */}
      <button
        onClick={() => setShowNewsletterCancelDialog(false)}
        disabled={cancellingNewsletter}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        Keep My Subscription
      </button>

      {/* Cancel - Secondary/Destructive */}
      <button
        onClick={() => handleCancelNewsletter()}
        disabled={cancellingNewsletter || !canSubmitCancelFeedback}
        className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30 disabled:hover:text-zinc-400"
      >
        {cancellingNewsletter ? (
          <>
            <Spinner size="sm" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4" />
            <span>Yes, Cancel My Subscription</span>
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-500">
        You'll retain access until the end of your billing period
      </p>
    </div>
  </DialogContent>
</Dialog>

      {/* Top Secret Cancel Confirmation Dialog - Premium Design */}
<Dialog open={showTopSecretCancelDialog} onOpenChange={setShowTopSecretCancelDialog}>
  <DialogContent className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/50 overflow-hidden">
    {/* Premium Header with Gradient */}
    <div className="relative px-6 pt-6 pb-4">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
          <Flame className="w-6 h-6 text-red-400" />
        </div>

        <DialogTitle className="text-xl font-semibold text-white mb-1">
          Cancel Investor Access?
        </DialogTitle>
        <DialogDescription className="text-zinc-400 text-sm">
          You'll lose access to exclusive intelligence and private community.
        </DialogDescription>
      </div>
    </div>

    {/* What you'll miss section */}
    <div className="mx-6 mb-4">
      <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent rounded-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">What you'll miss</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Exclusive market intelligence reports</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Private Discord community access</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Premium insider alerts & signals</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Early access to new features</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CancellationFeedbackFields reasons={cancelReasons} reasonId={cancelReasonId} onReasonChange={setCancelReasonId} text={cancelFeedbackText} onTextChange={setCancelFeedbackText} />
    {/* Action Buttons */}
    <div className="p-6 pt-2 space-y-3">
      {/* Keep Subscription - Primary CTA */}
      <button
        onClick={() => setShowTopSecretCancelDialog(false)}
        disabled={cancellingTopSecret}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        Keep My Subscription
      </button>

      {/* Cancel - Secondary/Destructive */}
      <button
        onClick={() => handleCancelTopSecret()}
        disabled={cancellingTopSecret || !canSubmitCancelFeedback}
        className="w-full group py-3 px-4 rounded-xl border border-zinc-700/50 hover:border-red-500/40 bg-zinc-800/30 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700/50 disabled:hover:bg-zinc-800/30 disabled:hover:text-zinc-400"
      >
        {cancellingTopSecret ? (
          <>
            <Spinner size="sm" />
            <span>Cancelling...</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4" />
            <span>Yes, Cancel My Subscription</span>
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-500">
        You'll retain access until the end of your billing period
      </p>
    </div>
  </DialogContent>
</Dialog>
</div>
  );
};

export default BillingTab;
