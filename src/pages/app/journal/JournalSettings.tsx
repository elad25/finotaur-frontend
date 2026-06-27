import PageTitle from "@/components/PageTitle";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { X, Check, AlertTriangle, Shield, Zap, TrendingUp, Crown, ArrowUp, ArrowDown, Clock, Target } from "lucide-react";
import RiskSettingsDialog from "@/components/RiskSettingsDialog";

// 🔥 OPTIMIZED HOOKS
import { useUserProfile, getPlanDisplay, getNextBillingDate } from "@/hooks/useUserProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useRiskSettings } from "@/hooks/useRiskSettings";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useTrades, type Trade } from "@/hooks/useTradesData";
import { usePortfolios } from "@/hooks/usePortfolios";
import { resolveHiddenPortfolioIds } from "@/lib/journal/hiddenAccounts";



// 🔥 PAYMENT INTEGRATION
import PaymentPopup from "@/components/PaymentPopup";
import { useWhopCheckout } from "@/hooks/useWhopCheckout";
import { useSubscriptionManagement } from "@/hooks/useSubscriptionManagement";
import type { PlanName, BillingInterval } from "@/lib/whop-config";

// 🔥 v2.0: REMOVED 'free' - Only 2 plans now
type PlanId = 'basic' | 'premium';

interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  description: string;
  features: string[];
  highlightedFeatures?: string[];
  cta: string;
  featured: boolean;
  savings?: string;
  badge?: {
    text: string;
    icon: any;
  };
  tier: number;
  trialDays?: number; // 🔥 NEW: Trial support
}

// 🔥 v2.0: Only 2 plans - Basic (with trial) and Premium (no trial)
const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 24.99,
    yearlyPrice: 229,
    yearlyMonthlyEquivalent: 19.08,
    description: "Every tool serious traders need",
    trialDays: 14, // 🔥 14-day free trial
    features: [
      "14-day free trial",
      "25 trades / month",
      "Full performance analytics & equity curve",
      "Strategy builder & playbooks",
      "Trading sessions & tagging",
      "Advanced statistics & metrics",
      "Risk/Reward calculator",
      "Trade screenshots & notes",
      "Full FINOTAUR Academy (300+ lessons)",
      "Email support",
    ],
    cta: "Start 14-Day Free Trial",
    featured: false,
    savings: "Yearly — save ~3 months",
    tier: 1,
    badge: {
      text: "14-Day Free Trial",
      icon: Clock,
    },
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 44.99,
    yearlyPrice: 409,
    yearlyMonthlyEquivalent: 34.08,
    description: "Unlimited trades + your AI trading coach",
    trialDays: 0, // 🔥 No trial - payment from day 0
    features: [
      "Everything in Free, plus:",
      "Unlimited trades — never hit a cap",
      "Your FINOTAUR Score — one number that grades your real edge",
      "Daily AI briefing — ranked insights on what to fix first",
      "Pattern of the Week — your biggest recurring edge or leak, surfaced automatically",
      "Leak Finder — AI names the exact mistake costing you money",
      "Behavioral & risk alerts before you tilt",
      "Custom AI reports & backtesting",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Upgrade to Premium",
    featured: true,
    savings: "Yearly — save ~3 months",
    tier: 2,
  }
];

// Helper to get plan tier
const getPlanTier = (planId: string): number => {
  // 🔥 v2.0: Handle legacy 'free' users - treat them as tier 0 (no plan)
  if (planId === 'free' || !planId) return 0;
  const plan = plans.find(p => p.id === planId);
  return plan?.tier ?? 0;
};

// ============================================
// 🔥 CHANGE PASSWORD MODAL - Memoized
// ============================================
const ChangePasswordModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("No user found");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-xl font-semibold text-zinc-100">Change Password</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="Enter current password"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="Enter new password (min 6 characters)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              placeholder="Confirm new password"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// 🔥 UPGRADE PLAN MODAL - WITH WHOP INTEGRATION
// 🔥 v2.0: Only 2 plans - Basic & Premium
// ============================================
const UpgradePlanModal = ({ 
  isOpen, 
  onClose,
  currentPlan,
  currentBillingInterval,
  onSelectPlan,
  subscriptionExpiresAt,
  subscriptionCancelAtPeriodEnd,
  pendingDowngradePlan,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currentPlan: string;
  currentBillingInterval?: string | null;
  onSelectPlan: (planId: PlanId, billingInterval: BillingInterval) => void;
  subscriptionExpiresAt?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean;
  pendingDowngradePlan?: string | null;
}) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingDowngrade, setPendingDowngrade] = useState<PlanId | null>(null);
  
  // 🔥 Subscription management hook
  const { downgradeSubscription, cancelSubscription, isLoading: isProcessingDowngrade } = useSubscriptionManagement();

  const currentTier = getPlanTier(currentPlan);

  // 🔥 v2.0: Check if user needs to select a plan (legacy free users or new users)
  const needsPlanSelection = !currentPlan || currentPlan === 'free' || currentPlan === 'trial';

  const getDisplayPrice = useCallback((plan: Plan) => {
    if (billingInterval === 'monthly') {
      return { 
        price: `$${plan.monthlyPrice.toFixed(2)}`, 
        period: "/month" 
      };
    } else {
      return { 
        price: `$${plan.yearlyMonthlyEquivalent.toFixed(2)}`, 
        period: "/month",
        billedAs: `Billed $${plan.yearlyPrice}/year`
      };
    }
  }, [billingInterval]);

  const getPlanAction = useCallback((plan: Plan): { type: 'current' | 'upgrade' | 'downgrade' | 'pending_downgrade' | 'select' | 'blocked_interval'; label: string } => {
    // 🔥 v2.0: For users without a plan, show "Select" or "Start Trial"
    if (needsPlanSelection) {
      return { 
        type: 'select', 
        label: plan.trialDays ? `Start ${plan.trialDays}-Day Free Trial` : `Subscribe to ${plan.name}` 
      };
    }

    // 🔥 Check if this plan is the pending downgrade target
    if (subscriptionCancelAtPeriodEnd && pendingDowngradePlan === plan.id) {
      return { type: 'pending_downgrade', label: 'Pending Downgrade' };
    }
    
    if (plan.id === currentPlan) {
      // Same plan but different interval — allow upgrade to yearly
      if (currentBillingInterval === 'monthly' && billingInterval === 'yearly') {
        return { type: 'upgrade', label: `Upgrade to Yearly (Save ${(plan.savings || '24%').replace(/^Save\s*/i, '')})` };
      }
      // Same plan, yearly viewing monthly — block (no downgrade)
      if (currentBillingInterval === 'yearly' && billingInterval === 'monthly') {
        return { type: 'current', label: 'Current Plan (Yearly)' };
      }
      return { type: 'current', label: 'Current Plan' };
    }
    
    if (plan.tier > currentTier) {
      // 🔥 גישה C: Basic Yearly → Premium Monthly = חסום, הצע Yearly במקום
      if (currentBillingInterval === 'yearly' && billingInterval === 'monthly') {
        return { type: 'blocked_interval', label: 'Switch to Yearly to Upgrade' };
      }
      return { type: 'upgrade', label: `Upgrade to ${plan.name}` };
    }
    
    return { type: 'downgrade', label: `Downgrade to ${plan.name}` };
  }, [currentPlan, currentTier, currentBillingInterval, billingInterval, subscriptionCancelAtPeriodEnd, pendingDowngradePlan, needsPlanSelection]);

  const handlePlanSelect = useCallback(async (planId: PlanId) => {
    // Allow same plan if upgrading from monthly to yearly
    const isSamePlanYearlyUpgrade = planId === currentPlan && currentBillingInterval === 'monthly' && billingInterval === 'yearly';
    
    if (planId === currentPlan && !isSamePlanYearlyUpgrade) {
      toast.info("This is your current plan");
      return;
    }

    // 🔥 גישה C: חסום Basic Yearly → Premium Monthly
    const selectedPlanData = plans.find(p => p.id === planId);
    if (selectedPlanData && selectedPlanData.tier > currentTier && currentBillingInterval === 'yearly' && billingInterval === 'monthly') {
      toast.info("You're on a yearly plan — switch to Yearly billing above to upgrade.");
      setBillingInterval('yearly');
      return;
    }

    // 🔥 Check if already pending downgrade to this plan
    if (subscriptionCancelAtPeriodEnd && pendingDowngradePlan === planId) {
      toast.info("Your subscription is already scheduled to change to this plan");
      return;
    }

    // 🔥 Check if already pending any downgrade
    if (subscriptionCancelAtPeriodEnd && pendingDowngradePlan) {
      toast.warning(`Your subscription is already scheduled to ${pendingDowngradePlan === 'cancel' ? 'be cancelled' : `downgrade to ${pendingDowngradePlan}`}`);
      return;
    }

    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    const action = getPlanAction(selectedPlan);

    if (action.type === 'upgrade' || action.type === 'select') {
      // Upgrade or new subscription - go to payment
      onSelectPlan(planId as PlanId, billingInterval);
      onClose();
    } else if (action.type === 'downgrade') {
      // 🔥 v3.0: Downgrade is NOT allowed — show info popup instead
      setPendingDowngrade(planId);
      setShowCancelConfirm(true);
    }
  }, [currentPlan, billingInterval, getPlanAction, onSelectPlan, onClose, subscriptionCancelAtPeriodEnd, pendingDowngradePlan]);

  // 🔥 v3.0: No longer performs downgrade — just closes the popup
  const handleConfirmDowngrade = useCallback(() => {
    setShowCancelConfirm(false);
    setPendingDowngrade(null);
    onClose();
  }, [onClose]);

  const handleCancelDowngrade = useCallback(() => {
    setShowCancelConfirm(false);
    setPendingDowngrade(null);
  }, []);

  if (!isOpen) return null;

  // 🔥 v3.0: "Downgrade not possible" info popup — no action taken
  if (showCancelConfirm && pendingDowngrade) {
    const targetPlan = plans.find(p => p.id === pendingDowngrade);
    const expiresDate = subscriptionExpiresAt 
      ? new Date(subscriptionExpiresAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'the end of your billing period';

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-100">Plan Change Not Available</h3>
                <p className="text-sm text-zinc-400">
                  Switching to {targetPlan?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-200 text-sm leading-relaxed">
                Downgrading mid-cycle isn't supported. You've already paid for your current {currentPlan === 'premium' ? 'Premium' : 'Basic'} plan through <strong>{expiresDate}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-2">
              <p className="text-zinc-300 text-sm font-medium">What you can do instead:</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Keep using your current plan until <strong className="text-zinc-200">{expiresDate}</strong>, then subscribe to <strong className="text-zinc-200">{targetPlan?.name}</strong> from the pricing page when your cycle ends.
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleCancelDowngrade}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Stay on Current Plan
            </button>
            <button
              onClick={handleConfirmDowngrade}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Got It
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl mt-24 mb-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {needsPlanSelection ? 'Choose Your Plan' : 'Change Your Plan'}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              {needsPlanSelection 
                ? 'Start with a 14-day free trial on Basic, or go Premium for unlimited access'
                : 'Choose the best plan for your trading journey'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-3">
          {/* 🔥 Pending Cancellation Notice */}
          {subscriptionCancelAtPeriodEnd && pendingDowngradePlan && (
            <div className="mb-8 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-medium">
                      Subscription Change Pending
                    </p>
                    <p className="text-amber-200/80 text-sm mt-1">
                      Your subscription will {pendingDowngradePlan === 'cancel' ? 'be cancelled' : `change to ${pendingDowngradePlan}`} on{' '}
                      {subscriptionExpiresAt ? new Date(subscriptionExpiresAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'the end of your billing period'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[#111111] border border-gray-800 rounded-full p-1 shadow-xl">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingInterval === 'monthly'
                    ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingInterval === 'yearly'
                    ? 'bg-[#C9A646] text-black shadow-lg shadow-[#C9A646]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                  Save ~3 months
                </span>
              </button>
            </div>
          </div>

          {/* 🔥 v2.0: Only 2 Pricing Cards - Basic & Premium */}
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {plans.map((plan) => {
              const displayPrice = getDisplayPrice(plan);
              const action = getPlanAction(plan);
              const isCurrentPlan = action.type === 'current';
              const isUpgrade = action.type === 'upgrade';
              const isDowngrade = action.type === 'downgrade';
              const isPendingDowngrade = action.type === 'pending_downgrade';
              const isSelect = action.type === 'select';
              const isBlockedInterval = action.type === 'blocked_interval';
              const hasTrial = plan.trialDays != null && plan.trialDays > 0;
              
              return (
                <div
                  key={plan.id}
                  className={`px-5 py-5 relative transition-all duration-300 flex flex-col rounded-2xl ${
                    plan.featured ? 'md:scale-[1.02]' : ''
                  } ${isCurrentPlan ? 'ring-2 ring-[#C9A646]' : ''} ${isPendingDowngrade ? 'ring-2 ring-amber-500' : ''}`}
                  style={{
                    background: plan.featured 
                      ? 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.08) 40%, rgba(244,217,123,0.04) 70%, rgba(0,0,0,0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: plan.featured 
                      ? '2px solid rgba(201,166,70,0.6)' 
                      : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: plan.featured
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
                  {plan.featured && !isPendingDowngrade && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                         style={{
                           background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                           boxShadow: '0 4px 20px rgba(201,166,70,0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
                           color: '#000',
                           zIndex: 50
                         }}>
                      <TrendingUp className="w-4 h-4" />
                      Most Popular
                    </div>
                  )}

                  {/* 🔥 Trial Badge for Basic */}
                  {hasTrial && billingInterval === 'monthly' && !plan.featured && !isCurrentPlan && !isPendingDowngrade && (
                    <div className="absolute -top-3 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {plan.trialDays}-Day Free Trial
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4 bg-[#C9A646] text-black px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Current
                    </div>
                  )}

                  {/* 🔥 Pending Downgrade Badge */}
                  {isPendingDowngrade && (
                    <div className="absolute -top-3 right-4 bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending
                    </div>
                  )}

                  {/* Savings Badge */}
                  {plan.savings && billingInterval === 'yearly' && !plan.featured && !isCurrentPlan && !isPendingDowngrade && !hasTrial && (
                    <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {plan.savings}
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="text-center mb-3 mt-2">
                    <h4 className="text-lg font-bold mb-1 text-white">{plan.name}</h4>
                    <div className="flex flex-col items-center justify-center gap-0.5 mb-1.5">
                      {/* 🔥 Show trial pricing for Basic */}
                      {hasTrial && isSelect ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-blue-400">$0</span>
                            <span className="text-slate-400 text-sm">for {plan.trialDays} days</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Then {displayPrice.price}{displayPrice.period}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                              {displayPrice.price}
                            </span>
                            <span className="text-slate-400 text-sm">{displayPrice.period}</span>
                          </div>
                          {displayPrice.billedAs && (
                            <span className="text-xs text-slate-500">{displayPrice.billedAs}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{plan.description}</p>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full ${
                          plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                        } flex items-center justify-center shrink-0 mt-0.5`}
                             style={{
                               border: '1px solid rgba(201,166,70,0.4)'
                             }}>
                          <Check className="h-2 w-2 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-slate-300 leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {/* 🔥 גישה C: הודעת חסימה ל-Basic Yearly → Premium Monthly */}
                  {action.type === 'blocked_interval' && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                      <p className="text-amber-300 text-xs leading-relaxed">
                        You're on <strong>Basic Yearly</strong>. To upgrade, switch to <strong>Yearly billing</strong> above — or wait until your current cycle ends.
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isCurrentPlan || isProcessingDowngrade || isPendingDowngrade || action.type === 'blocked_interval'}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : isPendingDowngrade
                        ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed border border-amber-500/30'
                        : action.type === 'blocked_interval'
                        ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed border border-amber-500/30'
                        : isSelect && hasTrial
                        ? 'bg-blue-500 hover:bg-blue-400 text-white hover:scale-[1.02]'
                        : isUpgrade || isSelect
                        ? plan.featured 
                          ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]' 
                          : 'bg-[#C9A646] hover:bg-[#D4B84A] text-black hover:scale-[1.02]'
                        : 'border-2 border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-300 hover:scale-[1.02]'
                    }`}
                    style={!isCurrentPlan && !isPendingDowngrade && (isUpgrade || isSelect) ? (plan.featured ? {
                      boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                    } : hasTrial && isSelect ? {
                      boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
                    } : {
                      boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
                    }) : undefined}
                  >
                    {isProcessingDowngrade ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : isPendingDowngrade ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Scheduled
                      </>
                    ) : (
                      <>
                        {isUpgrade && <ArrowUp className="w-4 h-4" />}
                        {isDowngrade && <ArrowDown className="w-4 h-4" />}
                        {isSelect && hasTrial && <Clock className="w-4 h-4" />}
                        {action.label}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Trust Indicators */}
          <div className="mt-4 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#C9A646]" />
                <span className="text-xs">Bank-grade security</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-xs">Secure payment via Whop</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#C9A646]" />
                <span className="text-xs">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 🔥 CANCEL SUBSCRIPTION MODAL
// ============================================
const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Too expensive', whopOption: 'too_expensive' },
  { id: 'not_using', label: 'Not using it enough', whopOption: 'other' },
  { id: 'missing_features', label: 'Missing features I need', whopOption: 'missing_features' },
  { id: 'found_alternative', label: 'Found a better alternative', whopOption: 'switching' },
  { id: 'technical_issues', label: 'Technical issues', whopOption: 'technical_issues' },
  { id: 'just_testing', label: 'Just testing / temporary', whopOption: 'testing' },
] as const;

// Type for cancellation data
interface CancellationData {
  reason_id: string;
  reason_label: string;
  whop_cancel_option: string;
  feedback?: string;
}

const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  currentPlan,
  expiresAt,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CancellationData) => Promise<{ success?: boolean; subscription?: { expiresAt?: string; trialEndsAt?: string } } | null>;
  isLoading: boolean;
  currentPlan: string;
  expiresAt?: string | null;
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'reason' | 'confirm' | 'success'>('reason');
  const [finalExpiresAt, setFinalExpiresAt] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setSelectedReason('');
    setFeedback('');
    setStep('reason');
    setFinalExpiresAt(null);
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }
    setStep('confirm');
  }, [selectedReason]);

  const handleConfirm = useCallback(async () => {
    const reasonObj = CANCEL_REASONS.find(r => r.id === selectedReason);
    const reasonLabel = reasonObj?.label || selectedReason;
    
    const result = await onConfirm({
      reason_id: selectedReason,
      reason_label: reasonLabel,
      whop_cancel_option: reasonObj?.whopOption || 'other',
      feedback: feedback.trim() || undefined,
    });
    
    if (result?.success) {
      // 🔥 FIX: Use trial end date if returned (not full billing period)
      setFinalExpiresAt(
        result.subscription?.trialEndsAt ||
        result.subscription?.expiresAt || 
        expiresAt || 
        null
      );
      setStep('success');
    }
  }, [selectedReason, feedback, onConfirm, expiresAt]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'the end of your billing period';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const expiresDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'the end of your billing period';

  if (!isOpen) return null;

  // 🆕 SUCCESS STEP - Compact
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Cancellation Confirmed</h3>
              <p className="text-xs text-zinc-400">We've received your request</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-zinc-300 text-sm text-center">Your subscription will remain active until:</p>
            <div className="py-2 px-3 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30 text-center">
              <p className="text-[#C9A646] text-lg font-bold">{formatDate(finalExpiresAt)}</p>
            </div>
            <p className="text-zinc-500 text-xs text-center">
              Full access continues until this date. You can always resubscribe later.
            </p>
          </div>
          <div className="px-5 py-3 border-t border-zinc-800">
            <button onClick={handleClose} className="w-full px-4 py-2 bg-[#C9A646] hover:bg-[#D4B84A] text-black rounded-lg text-sm font-medium transition-colors">
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[70vh]">
        {/* Header - Fixed */}
        <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {step === 'reason' ? 'Cancel Subscription' : 'Confirm Cancellation'}
              </h3>
              <p className="text-xs text-zinc-400">
                {step === 'reason' ? "We're sorry to see you go" : 'This action cannot be undone'}
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
          {step === 'reason' ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-medium">Why are you cancelling?</p>

              <div className="space-y-1">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full px-3 py-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                      selectedReason === reason.id
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
                    }`}
                  >
                    <span className="text-sm text-white">{reason.label}</span>
                    {selectedReason === reason.id && (
                      <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-zinc-300 font-medium mb-1">
                  Tell us more <span className="text-red-400">*</span>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-normal">required</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What would have kept you? At least one word — the team reads every response."
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 resize-none transition-colors ${
                    feedback.trim().length > 0 ? 'border-zinc-700 focus:ring-red-500/50' : 'border-red-500/40 focus:ring-red-500/60'
                  }`}
                  rows={3}
                  maxLength={500}
                  aria-required="true"
                />
                <div className="flex justify-between mt-1">
                  <p className={`text-[11px] ${feedback.trim().length > 0 ? 'text-zinc-500' : 'text-red-400'}`}>
                    {feedback.trim().length > 0 ? '✓ Looks good' : 'Required — at least one word'}
                  </p>
                  <p className="text-[11px] text-zinc-600">{feedback.length}/500</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-200 text-sm">
                  Your <strong>{currentPlan}</strong> subscription will be cancelled. 
                  Access continues until <strong>{expiresDate}</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <p className="text-white text-xs font-medium mb-2">What you'll lose:</p>
                <div className="space-y-1.5">
                  {currentPlan?.toLowerCase() === 'basic' && (
                    <>
                      <p className="flex items-center gap-2 text-xs text-zinc-300"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />25 trades per month</p>
                      <p className="flex items-center gap-2 text-xs text-zinc-300"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />Advanced analytics</p>
                    </>
                  )}
                  {currentPlan?.toLowerCase() === 'premium' && (
                    <>
                      <p className="flex items-center gap-2 text-xs text-zinc-300"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />Unlimited trades</p>
                      <p className="flex items-center gap-2 text-xs text-zinc-300"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />AI-powered insights</p>
                      <p className="flex items-center gap-2 text-xs text-zinc-300"><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />Priority support</p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800">
                <p className="text-xs text-zinc-500">Reason: <span className="text-zinc-300">{CANCEL_REASONS.find(r => r.id === selectedReason)?.label}</span></p>
                {feedback.trim() && (
                  <p className="text-xs text-zinc-500 mt-1">Feedback: <span className="text-zinc-300">{feedback}</span></p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="px-4 py-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
          {step === 'reason' ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedReason || feedback.trim().length === 0}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 🔥 STOP-BASED R — aggregation + formatters
// ============================================
// `actual_r` is realized P&L ÷ the risk implied by the stop distance
// (|entry−stop|×qty×multiplier, computed at fetch time). A null value means
// the trade has no usable stop, so it is excluded from every R figure here.
interface StopRAgg {
  avgR: number | null;
  count: number;        // trades that carry a stop-based R
  wins: number;
  losses: number;
  winRate: number | null;
  bestR: number | null;
  worstR: number | null;
  // 💵 dollar layer — what each R is actually worth
  avg1RUsd: number | null;  // avg per-account $ value of 1R (single-account stop)
  netPnl: number;           // per-account realized $ summed across counted trades
  avgPnl: number | null;    // netPnl / count — per-account $ of the average R
  bestPnl: number | null;   // per-account realized $ of the best-R trade
  worstPnl: number | null;  // per-account realized $ of the worst-R trade
}

// `oneRUsdOf` returns the PER-ACCOUNT dollar value of 1R for a trade. Every $
// figure here is normalized per account, because all-accounts rows sum pnl &
// risk across each copied account (copier replication).
function aggregateStopR(list: Trade[], oneRUsdOf: (t: Trade) => number | null): StopRAgg {
  let sum = 0;
  let count = 0;
  let wins = 0;
  let losses = 0;
  let bestR: number | null = null;
  let worstR: number | null = null;
  let bestPnl: number | null = null;
  let worstPnl: number | null = null;
  let r1Sum = 0;
  let r1Count = 0;
  let netPnl = 0;

  for (const t of list) {
    if (t.actual_r === null || t.actual_r === undefined) continue;
    const v = Number(t.actual_r);
    if (!Number.isFinite(v)) continue;
    count++;
    sum += v;
    if (v > 0) wins++;
    else if (v < 0) losses++;

    // Per-account P&L: all-accounts rows sum pnl across every copied account;
    // divide by the number of copied legs so $ figures reflect ONE account.
    const ac = Math.max(1, t.group_trade_ids?.length ?? 1);
    const rawPnl = t.pnl != null && Number.isFinite(Number(t.pnl)) ? Number(t.pnl) : null;
    const pnl = rawPnl !== null ? rawPnl / ac : null;
    if (pnl !== null) netPnl += pnl;

    if (bestR === null || v > bestR) { bestR = v; bestPnl = pnl; }
    if (worstR === null || v < worstR) { worstR = v; worstPnl = pnl; }

    const r1 = oneRUsdOf(t);
    if (r1 != null && Number.isFinite(r1) && r1 > 0) { r1Sum += r1; r1Count++; }
  }

  const decided = wins + losses;
  return {
    avgR: count > 0 ? sum / count : null,
    count,
    wins,
    losses,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    bestR,
    worstR,
    avg1RUsd: r1Count > 0 ? r1Sum / r1Count : null,
    netPnl,
    avgPnl: count > 0 ? netPnl / count : null,
    bestPnl,
    worstPnl,
  };
}

const fmtR = (r: number | null): string =>
  r === null ? '—' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;

const rColorClass = (r: number | null): string =>
  r === null ? 'text-zinc-400' : r > 0 ? 'text-green-400' : r < 0 ? 'text-red-400' : 'text-zinc-300';

// $ formatter — compact, optional leading + for gains. Returns "—" for null.
const fmtUsd = (n: number | null, signed = false): string => {
  if (n === null || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : signed && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const body = abs >= 1000
    ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : abs.toFixed(abs >= 100 ? 0 : 2);
  return `${sign}$${body}`;
};

// ============================================
// 🔥 MAIN COMPONENT - Fully Optimized
// ============================================
export default function JournalSettings() {
  const navigate = useNavigate();
  
  // 🚀 OPTIMIZED HOOKS - All using React Query
  const { profile, isLoading: profileLoading } = useUserProfile();
  // 🔥 SYNC FIX: Use subscription for live trade counts (updates after each trade)
  const { limits, isFreeJournal, isUnlimitedUser } = useSubscription();
  const { loading: riskLoading } = useRiskSettings();
  const { commissions, updateCommission, updateCommissionType, saveSettings: saveCommissionsSettings } = useCommissionSettings();
  const { data: trades = [] } = useTrades(); // Pre-cached for export + R performance
  const { portfolios } = usePortfolios(); // exclude hidden accounts (WHISPER paper) from R Performance

  // 🔥 PAYMENT HOOK
  const { initiateCheckout, isLoading: checkoutLoading } = useWhopCheckout({
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
    }
  });

  // 🔥 SUBSCRIPTION MANAGEMENT HOOK
const { cancelSubscription, reactivateSubscription, isLoading: isSubscriptionLoading } = useSubscriptionManagement();
  // Local UI state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isRiskSettingsOpen, setIsRiskSettingsOpen] = useState(false);
  
  // 🔥 Payment popup state
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<BillingInterval>('monthly');

  // 🚀 Memoized computed values
const planInfo = useMemo(() => getPlanDisplay(profile), [profile]);
const billingDate = useMemo(() => getNextBillingDate(profile), [profile]);
const loading = profileLoading || riskLoading;

// 🔥 R Performance — stop-based R, overall + per-strategy (replaces the old
// balance/portfolio block per Elad 2026-06-19: no balance, R by stop size).
const rPerformance = useMemo(() => {
  // Exclude hidden accounts (e.g. WHISPER paper) — same convention as the rest
  // of the journal's all-accounts views; they only show when explicitly picked.
  const hiddenIds = new Set(resolveHiddenPortfolioIds(portfolios));
  // Closed trades only: risk-only mode stores pnl; summary mode needs an exit.
  const closed = trades.filter((t) =>
    !hiddenIds.has(t.portfolio_id ?? '') &&
    (t.input_mode === 'risk-only'
      ? t.pnl !== null && t.pnl !== undefined
      : t.exit_price != null),
  );

  // Per-account $ value of 1R, consistent with the displayed R. All-accounts
  // rows sum pnl & risk across every copied account; actual_r is the same per
  // account (scale-invariant), so pnl/actual_r recovers the summed 1R — divide
  // by the number of copied legs to land on a single-account figure. Falls back
  // to the summed stop risk (risk_usd) for break-even trades (actual_r ≈ 0).
  const oneRUsdOf = (t: Trade): number | null => {
    const ac = Math.max(1, t.group_trade_ids?.length ?? 1);
    const pnl = t.pnl != null ? Number(t.pnl) : null;
    const r = t.actual_r != null ? Number(t.actual_r) : null;
    if (pnl != null && r != null && Number.isFinite(pnl) && Number.isFinite(r) && r !== 0) {
      return Math.abs(pnl / r) / ac;
    }
    const risk = t.risk_usd != null ? Number(t.risk_usd) : null;
    return risk != null && Number.isFinite(risk) && risk > 0 ? risk / ac : null;
  };

  const overall = aggregateStopR(closed, oneRUsdOf);

  // Group stop-based trades by strategy (each trade already carries strategy_name).
  const groups = new Map<string, { name: string; trades: Trade[] }>();
  for (const t of closed) {
    if (t.actual_r === null || t.actual_r === undefined) continue;
    const key = t.strategy_id || '__unassigned__';
    const name = t.strategy_name || 'Unassigned';
    const g = groups.get(key) ?? { name, trades: [] };
    g.trades.push(t);
    groups.set(key, g);
  }

  const strategies = Array.from(groups.values())
    .map((g) => ({ name: g.name, ...aggregateStopR(g.trades, oneRUsdOf) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => (b.avgR ?? -Infinity) - (a.avgR ?? -Infinity));

  const strategyMaxAbs = Math.max(
    ...strategies.map((s) => Math.abs(s.avgR ?? 0)),
    0.5,
  );

  return {
    overall,
    strategies,
    strategyMaxAbs,
    noStopCount: closed.length - overall.count,
  };
}, [trades, portfolios]);
  // ============================================
  // 🔥 HANDLERS - All memoized with useCallback
  // ============================================
  const handleRiskSettingsClose = useCallback(() => {
    setIsRiskSettingsOpen(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsUpgradeModalOpen(true);
  }, []);

  // 🔥 Handle plan selection from modal
  const handleSelectPlan = useCallback((planId: 'basic' | 'premium', billingInterval: BillingInterval) => {
    setSelectedPlan(planId);
    setSelectedBillingInterval(billingInterval);
    setShowPaymentPopup(true);
  }, []);

  // 🔥 Handle payment popup close
  const handlePaymentPopupClose = useCallback(() => {
    setShowPaymentPopup(false);
  }, []);

// 🔥 Handle subscription cancellation with feedback
  const handleCancelSubscription = useCallback(async (data: { reason_id: string; reason_label: string; feedback?: string }) => {
    const result = await cancelSubscription(data, 'journal');
    if (!result) return null;
    // 🔥 FIX: Inject correct end date based on trial status
    if (result.subscription) {
      const isInTrial = profile?.is_in_trial || profile?.subscription_status === 'trial' || profile?.subscription_status === 'trialing';
      const trialEndsAt = profile?.trial_ends_at;
      if (isInTrial && trialEndsAt) {
        result.subscription.trialEndsAt = trialEndsAt;
        result.subscription.expiresAt = trialEndsAt; // ← override expiresAt גם כן
      }
    }
    return result;
  }, [cancelSubscription, profile?.is_in_trial, profile?.trial_ends_at, profile?.subscription_status]);

  // 🔥 Handle subscription reactivation (undo cancellation)
  const handleReactivateSubscription = useCallback(async () => {
    await reactivateSubscription();
  }, [reactivateSubscription]);

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      localStorage.clear();
      
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  }, [navigate]);

  const handleSaveCommissions = useCallback(() => {
    saveCommissionsSettings();
  }, [saveCommissionsSettings]);

  // 🚀 OPTIMIZED EXPORT - Uses cached trades
  const handleExportTrades = useCallback(async () => {
    try {
      if (!trades || trades.length === 0) {
        toast.error("No trades to export");
        return;
      }
      
      const headers = [
        "Date",
        "Symbol",
        "Side",
        "Entry Price",
        "Exit Price",
        "Stop Price",
        "Take Profit",
        "Quantity",
        "P&L",
        "Outcome",
        "Fees",
        "Session",
        "Strategy",
        "Setup"
      ];
      
      const rows = trades.map((trade: any) => {
        return [
          new Date(trade.open_at).toLocaleDateString(),
          trade.symbol,
          trade.side,
          trade.entry_price,
          trade.exit_price || "",
          trade.stop_price,
          trade.take_profit_price || "",
          trade.quantity,
          trade.pnl || "",
          trade.outcome || "",
          trade.fees,
          trade.session || "",
          trade.strategy || "",
          trade.setup || ""
        ].join(",");
      });
      
      const csvContent = [headers.join(","), ...rows].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${trades.length} trades successfully!`);
      
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export trades. Please try again.");
    }
  }, [trades]);

  // 🔥 v8.8.0: Check if user needs to select a plan (Core/Finotaur users already have journal)
  const hasJournalFromPlatform = profile?.platform_plan && 
    ['core', 'platform_core', 'finotaur', 'platform_finotaur', 'enterprise', 'platform_enterprise'].includes(profile.platform_plan) &&
    ['active', 'trial', 'trialing'].includes(profile?.platform_subscription_status || '');
  
  const needsPlanSelection = !hasJournalFromPlatform && (!profile?.account_type || profile?.account_type === 'free' || profile?.account_type === 'trial');

  return (
    <div className="min-h-screen flex justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <PageTitle title="Journal Settings" subtitle="Manage your account and trading preferences" />
        
        {/* 🔥 R Performance — stop-based R + per-strategy (no balance) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">R Performance</h3>
              <p className="text-xs text-zinc-500 mt-1">Average R by stop distance — and what each R is worth in dollars, per account</p>
            </div>
            <button 
              onClick={() => setIsRiskSettingsOpen(true)}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Update Settings
            </button>
          </div>
          
          {/* R Performance — stop-based R + per-strategy. No balance (Elad 2026-06-19). */}
          {rPerformance.overall.count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">No stop-based R yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Set a stop loss on your trades and R is calculated automatically from the stop distance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Average R (by stop) + key stats */}
              <div className="space-y-4">
                <div className="p-6 rounded-xl border-2 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/5 to-[#C9A646]/10 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C9A646]/10 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-[#C9A646]" />
                      </div>
                      <span className="text-sm font-medium text-zinc-400">Average R (by stop)</span>
                    </div>
                    <div className={`text-5xl font-bold mb-1 ${rColorClass(rPerformance.overall.avgR)}`}>
                      {fmtR(rPerformance.overall.avgR)}
                    </div>
                    {/* 💵 what the average R is actually worth */}
                    <div className={`text-lg font-semibold mb-2 ${rColorClass(rPerformance.overall.avgPnl)}`}>
                      ≈ {fmtUsd(rPerformance.overall.avgPnl, true)}
                      <span className="text-xs font-normal text-zinc-500"> avg / trade</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Across {rPerformance.overall.count} trade{rPerformance.overall.count === 1 ? '' : 's'} · 1R ≈ {fmtUsd(rPerformance.overall.avg1RUsd)} stop · {fmtUsd(rPerformance.overall.netPnl, true)} net
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-xs font-medium text-zinc-400">Win Rate</span>
                    <div className="text-xl font-bold text-white mt-1">
                      {rPerformance.overall.winRate === null ? '—' : `${rPerformance.overall.winRate.toFixed(0)}%`}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {rPerformance.overall.wins}W · {rPerformance.overall.losses}L
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <span className="text-xs font-medium text-zinc-400">Best / Worst</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ArrowUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-bold text-green-400">{fmtR(rPerformance.overall.bestR)}</span>
                      <span className="text-xs text-zinc-500">{fmtUsd(rPerformance.overall.bestPnl, true)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ArrowDown className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-400">{fmtR(rPerformance.overall.worstR)}</span>
                      <span className="text-xs text-zinc-500">{fmtUsd(rPerformance.overall.worstPnl, true)}</span>
                    </div>
                  </div>
                </div>

                {rPerformance.noStopCount > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/90 leading-relaxed">
                      {rPerformance.noStopCount} closed trade{rPerformance.noStopCount === 1 ? '' : 's'} have no stop set — excluded from R.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - R by Strategy */}
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-zinc-300" />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">R by Strategy</span>
                </div>

                {rPerformance.strategies.length === 0 ? (
                  <p className="text-xs text-zinc-500">No strategy-tagged trades with a stop yet.</p>
                ) : (
                  <div className="space-y-3">
                    {rPerformance.strategies.map((s, i) => {
                      const pct = Math.min(100, (Math.abs(s.avgR ?? 0) / rPerformance.strategyMaxAbs) * 100);
                      const positive = (s.avgR ?? 0) >= 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300 font-medium truncate pr-2">{s.name}</span>
                            <div className="flex items-baseline gap-2 flex-shrink-0">
                              <span className={`text-sm font-bold ${rColorClass(s.avgR)}`}>{fmtR(s.avgR)}</span>
                              <span className={`text-xs font-semibold ${rColorClass(s.netPnl)}`}>{fmtUsd(s.netPnl, true)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${positive ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {s.count} trade{s.count === 1 ? '' : 's'} · {s.winRate === null ? '—' : `${s.winRate.toFixed(0)}% win`} · 1R ≈ {fmtUsd(s.avg1RUsd)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🔥 Account Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-6">Account Information</h3>

          <div className="space-y-4">
            {/* 🔥 v10.3.0: Trade Limits Display - uses live subscription data */}
            <div className="flex items-center justify-between py-4">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  {isFreeJournal ? 'Lifetime trades used' : 'Monthly trades used'}
                </label>
                <p className="text-xs text-zinc-500 mt-1">
                  {isFreeJournal
                    ? 'Free tier: 15 trades total (never resets)'
                    : isUnlimitedUser
                      ? 'Unlimited trades with your plan'
                      : 'Resets each billing cycle'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-300">
                  {isFreeJournal
                    ? `${limits?.trade_count || 0} / 15`
                    : isUnlimitedUser
                      ? '∞ / ∞'
                      : `${limits?.current_month_trades_count || 0} / ${limits?.max_trades || 25}`
                  }
                </span>
                {/* Progress indicator */}
                <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${(() => {
                      if (isUnlimitedUser) return 'bg-emerald-500';
                      const used = isFreeJournal
                        ? (limits?.trade_count || 0)
                        : (limits?.current_month_trades_count || 0);
                      const max = isFreeJournal ? 15 : (limits?.max_trades || 25);
                      const pct = max > 0 ? (used / max) * 100 : 0;
                      return pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                    })()}`}
                    style={{ 
                      width: isUnlimitedUser ? '100%' : `${Math.min(100, (() => {
                        const used = isFreeJournal
                          ? (limits?.trade_count || 0)
                          : (limits?.current_month_trades_count || 0);
                        const max = isFreeJournal ? 15 : (limits?.max_trades || 25);
                        return max > 0 ? (used / max) * 100 : 0;
                      })())}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Commissions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Trading Commissions</h3>
          <p className="text-sm text-zinc-500 mb-6">Set default commission rates per asset type (% or fixed amount)</p>
          
          <div className="space-y-1">
            {(Object.entries(commissions) as [keyof typeof commissions, any][]).map(([asset, commission]) => (
              <div key={String(asset)} className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0">
                <label className="text-sm font-medium text-zinc-300 capitalize min-w-[120px]">
                  {String(asset)}
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={commission.type}
                    onChange={(e) => updateCommissionType(asset, e.target.value as 'percentage' | 'flat')}
                    className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Fee ($)</option>
                  </select>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={commission.type === "percentage" ? "0.01" : "0.1"}
                      value={commission.value}
                      onChange={(e) => updateCommission(asset, e.target.value)}
                      className="w-28 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={commission.type === "percentage" ? "0.00" : "0.00"}
                    />
                    <span className="text-sm text-zinc-400 min-w-[20px]">
                      {commission.type === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500 max-w-md">
              These settings will be applied to new trades. Existing trades remain unchanged.
            </p>
            <button 
              onClick={handleSaveCommissions}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Commission Settings
            </button>
          </div>
        </div>

        {/* Data Export */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Data Management</h3>
          <p className="text-sm text-zinc-500 mb-6">Export your trading data</p>
          
          <button 
            onClick={handleExportTrades}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Export All Trades (CSV)
          </button>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      
      <UpgradePlanModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={profile?.account_type || ''}
        onSelectPlan={handleSelectPlan}
        currentBillingInterval={profile?.subscription_interval}
        subscriptionExpiresAt={
  (profile?.is_in_trial || profile?.subscription_status === 'trial' || profile?.subscription_status === 'trialing') && profile?.trial_ends_at
    ? profile.trial_ends_at
    : profile?.subscription_expires_at
}
        subscriptionCancelAtPeriodEnd={profile?.subscription_cancel_at_period_end}
        pendingDowngradePlan={profile?.pending_downgrade_plan}
      />

      {/* 🔥 Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        isLoading={isSubscriptionLoading}
        currentPlan={profile?.account_type || ''}
        expiresAt={
          (profile?.is_in_trial || profile?.subscription_status === 'trial' || profile?.subscription_status === 'trialing') && profile?.trial_ends_at
            ? profile.trial_ends_at
            : profile?.subscription_expires_at
        }
      />

      {/* 🔥 Payment Popup - Same as PricingSelection */}
      {showPaymentPopup && (
        <PaymentPopup
          isOpen={showPaymentPopup}
          onClose={handlePaymentPopupClose}
          planId={selectedPlan}
          billingInterval={selectedBillingInterval}
        />
      )}

      <RiskSettingsDialog 
        open={isRiskSettingsOpen}
        onClose={handleRiskSettingsClose}
      />
    </div>
  );
}