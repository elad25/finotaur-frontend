import PageTitle from "@/components/PageTitle";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { X, Check, AlertTriangle, Shield, Zap, TrendingUp, DollarSign, Percent, Crown, ArrowUp, ArrowDown, Clock } from "lucide-react";
import RiskSettingsDialog from "@/components/RiskSettingsDialog";
import { formatNumber } from "@/utils/smartCalc";

// 🔥 OPTIMIZED HOOKS
import { useUserProfile, getPlanDisplay, getNextBillingDate } from "@/hooks/useUserProfile";
import { useRiskSettings } from "@/hooks/useRiskSettings";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useTrades, useTradeStats } from "@/hooks/useTradesData";



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
    monthlyPrice: 19.99,
    yearlyPrice: 149,
    yearlyMonthlyEquivalent: 12.42,
    description: "Essential tools + automatic broker sync",
    trialDays: 14, // 🔥 14-day free trial
    features: [
      "14-day free trial",
      "Up to 25 trades per month",
      "Full performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Advanced statistics & metrics",
      "Equity curve & charts",
      "Trade screenshots & notes",
      "Email support",
      "🔜 Coming Soon: Broker sync"
    ],
    cta: "Start Free Trial",
    featured: false,
    savings: "Save 38%",
    tier: 1,
    badge: {
      text: "14-Day Free Trial",
      icon: Clock,
    },
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 39.99,
    yearlyPrice: 299,
    yearlyMonthlyEquivalent: 24.92,
    description: "Unlimited everything + AI intelligence",
    trialDays: 0, // 🔥 No trial - payment from day 0
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
      "🔜 Coming Soon: Auto broker sync"
    ],
    cta: "Upgrade to Premium",
    featured: true,
    savings: "Save 38%",
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
  onSelectPlan,
  subscriptionExpiresAt,
  subscriptionCancelAtPeriodEnd,
  pendingDowngradePlan,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currentPlan: string;
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

  const getPlanAction = useCallback((plan: Plan): { type: 'current' | 'upgrade' | 'downgrade' | 'pending_downgrade' | 'select'; label: string } => {
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
      return { type: 'current', label: 'Current Plan' };
    }
    
    if (plan.tier > currentTier) {
      return { type: 'upgrade', label: `Upgrade to ${plan.name}` };
    }
    
    return { type: 'downgrade', label: `Downgrade to ${plan.name}` };
  }, [currentPlan, currentTier, subscriptionCancelAtPeriodEnd, pendingDowngradePlan, needsPlanSelection]);

  const handlePlanSelect = useCallback(async (planId: PlanId) => {
    if (planId === currentPlan) {
      toast.info("This is your current plan");
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
      // Show confirmation for downgrade
      setPendingDowngrade(planId);
      setShowCancelConfirm(true);
    }
  }, [currentPlan, billingInterval, getPlanAction, onSelectPlan, onClose, subscriptionCancelAtPeriodEnd, pendingDowngradePlan]);

  const handleConfirmDowngrade = useCallback(async () => {
    if (!pendingDowngrade) return;
    
    // 🔥 v2.0: Only 'basic' is valid for downgrade now
    const result = await downgradeSubscription(pendingDowngrade as 'basic');
    
    if (result?.success) {
      setShowCancelConfirm(false);
      setPendingDowngrade(null);
      onClose();
    }
  }, [pendingDowngrade, downgradeSubscription, onClose]);

  const handleCancelDowngrade = useCallback(() => {
    setShowCancelConfirm(false);
    setPendingDowngrade(null);
  }, []);

  if (!isOpen) return null;

  // 🔥 Confirmation dialog for downgrade
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
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-100">Confirm Downgrade</h3>
                <p className="text-sm text-zinc-400">
                  Downgrade to {targetPlan?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-200 text-sm leading-relaxed">
                {/* 🔥 v2.0: Only downgrade to Basic is possible now */}
                Your subscription will be downgraded to <strong>Basic</strong> on <strong>{expiresDate}</strong>.
                <br /><br />
                You'll lose access to:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Unlimited trades (limited to 25/month)</li>
                  <li>AI-powered insights & coach</li>
                  <li>Priority support</li>
                </ul>
              </p>
            </div>

            <p className="text-zinc-400 text-sm">
              You can continue using your current plan features until {expiresDate}.
            </p>
          </div>

          <div className="p-6 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleCancelDowngrade}
              disabled={isProcessingDowngrade}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Keep Current Plan
            </button>
            <button
              onClick={handleConfirmDowngrade}
              disabled={isProcessingDowngrade}
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isProcessingDowngrade ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Confirm Downgrade
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h3 className="text-2xl font-semibold text-zinc-100">
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
        <div className="p-8">
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
                  <h4 className="text-xl font-semibold text-white mb-2" style={{ letterSpacing: '-0.01em' }}>
                    {needsPlanSelection 
                      ? 'Try Basic free for 14 days'
                      : 'Upgrade anytime, downgrade at cycle end'
                    }
                  </h4>
                  <p className="text-slate-300 text-base leading-relaxed">
                    {needsPlanSelection 
                      ? 'No credit card required for Basic trial. Premium requires payment upfront but gives you unlimited access immediately.'
                      : 'Upgrades take effect immediately. Downgrades will apply at the end of your current billing cycle.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
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
                  Save up to 38%
                </span>
              </button>
            </div>
          </div>

          {/* 🔥 v2.0: Only 2 Pricing Cards - Basic & Premium */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => {
              const displayPrice = getDisplayPrice(plan);
              const action = getPlanAction(plan);
              const isCurrentPlan = action.type === 'current';
              const isUpgrade = action.type === 'upgrade';
              const isDowngrade = action.type === 'downgrade';
              const isPendingDowngrade = action.type === 'pending_downgrade';
              const isSelect = action.type === 'select';
              const hasTrial = plan.trialDays && plan.trialDays > 0;
              
              return (
                <div
                  key={plan.id}
                  className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
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
                  {hasTrial && !plan.featured && !isCurrentPlan && !isPendingDowngrade && (
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
                  <div className="text-center mb-6 mt-2">
                    <h4 className="text-xl font-bold mb-2 text-white">{plan.name}</h4>
                    <div className="flex flex-col items-center justify-center gap-1 mb-2">
                      {/* 🔥 Show trial pricing for Basic */}
                      {hasTrial && isSelect ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-blue-400">$0</span>
                            <span className="text-slate-400 text-sm">for {plan.trialDays} days</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Then {displayPrice.price}{displayPrice.period}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
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
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className={`w-4 h-4 rounded-full ${
                          plan.featured ? 'bg-[#C9A646]/30' : 'bg-[#C9A646]/20'
                        } flex items-center justify-center shrink-0 mt-0.5`}
                             style={{
                               border: '1px solid rgba(201,166,70,0.4)'
                             }}>
                          <Check className="h-2.5 w-2.5 text-[#C9A646]" />
                        </div>
                        <span className="text-sm text-slate-300 leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button 
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isCurrentPlan || isProcessingDowngrade || isPendingDowngrade}
                    className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : isPendingDowngrade
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
          <div className="mt-12 space-y-4 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#C9A646]" />
                <span className="text-sm">Bank-grade security</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Secure payment via Whop</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
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
      </div>
    </div>
  );
};

// ============================================
// 🔥 CANCEL SUBSCRIPTION MODAL
// ============================================
const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: 'Not using it enough' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'found_alternative', label: 'Found a better alternative' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'just_testing', label: 'Just testing / temporary' },
] as const;

// Type for cancellation data
interface CancellationData {
  reason_id: string;
  reason_label: string;
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
  onConfirm: (data: CancellationData) => Promise<{ success?: boolean; subscription?: { expiresAt?: string } } | null>;
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
    const reasonLabel = CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
    
    const result = await onConfirm({
      reason_id: selectedReason,
      reason_label: reasonLabel,
      feedback: feedback.trim() || undefined,
    });
    
    if (result?.success) {
      setFinalExpiresAt(result.subscription?.expiresAt || expiresAt || null);
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

  // 🆕 SUCCESS STEP
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Cancellation Confirmed
                </h3>
                <p className="text-sm text-zinc-400">
                  We've received your request
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Main Message */}
            <div className="text-center space-y-3">
              <p className="text-zinc-300 text-base leading-relaxed">
                Your cancellation has been processed successfully.
              </p>
              <p className="text-zinc-300 text-base leading-relaxed">
                Your subscription will remain active until:
              </p>
              <div className="py-3 px-4 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30">
                <p className="text-[#C9A646] text-xl font-bold">
                  {formatDate(finalExpiresAt)}
                </p>
              </div>
            </div>

            {/* Friendly Message */}
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
              <p className="text-zinc-300 text-sm leading-relaxed text-center">
                We're always here for you.
                <br />
                <span className="text-zinc-400">
                  If you ever want to come back — the door is always open!
                </span>
              </p>
            </div>

            {/* Features reminder */}
            <p className="text-zinc-500 text-xs text-center">
              You'll continue to have full access to all your current plan features until the cancellation date.
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 bg-[#C9A646] hover:bg-[#D4B84A] text-black rounded-lg text-sm font-medium transition-colors"
            >
              Got it, thanks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {step === 'reason' ? 'Cancel Subscription' : 'Confirm Cancellation'}
              </h3>
              <p className="text-sm text-zinc-400">
                {step === 'reason' ? 'We\'re sorry to see you go' : 'This action cannot be undone'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'reason' ? (
            <div className="space-y-5">
              <p className="text-sm text-zinc-300 font-medium">
                Help us improve by telling us why you're cancelling:
              </p>

              {/* Reason Selection */}
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedReason === reason.id
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      selectedReason === reason.id ? 'text-white' : 'text-white'
                    }`}>
                      {reason.label}
                    </span>
                    {selectedReason === reason.id && (
                      <Check className="w-5 h-5 text-red-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Feedback text input - Always visible */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Give us feedback (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us how we can improve..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1 text-right">
                  {feedback.length}/500
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Warning Box */}
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-200 text-sm leading-relaxed">
                  Your <strong>{currentPlan}</strong> subscription will be cancelled. 
                  You'll continue to have access until <strong>{expiresDate}</strong>.
                </p>
              </div>

              {/* What you'll lose */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <p className="text-white text-sm font-medium mb-3">What you'll lose:</p>
                <ul className="space-y-2">
                  {currentPlan?.toLowerCase() === 'basic' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <X className="w-4 h-4 text-red-400" />
                        25 trades per month
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <X className="w-4 h-4 text-red-400" />
                        Advanced analytics & statistics
                      </li>
                    </>
                  )}
                  {currentPlan?.toLowerCase() === 'premium' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <X className="w-4 h-4 text-red-400" />
                        Unlimited trades
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <X className="w-4 h-4 text-red-400" />
                        AI-powered insights & coach
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <X className="w-4 h-4 text-red-400" />
                        Priority support
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Selected reason display */}
              <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">Cancellation reason:</p>
                <p className="text-sm text-white">
                  {CANCEL_REASONS.find(r => r.id === selectedReason)?.label}
                </p>
                {feedback.trim() && (
                  <>
                    <p className="text-xs text-zinc-500 mb-1 mt-3">Your feedback:</p>
                    <p className="text-sm text-zinc-300">{feedback}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex gap-3">
          {step === 'reason' ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedReason}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Cancel Subscription
                  </>
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
// 🔥 SAFE NUMBER HELPER - Global
// ============================================
const safeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

// ============================================
// 🔥 SAFE FORMAT - Prevents NaN display
// ============================================
const safeFormatNumber = (value: any, decimals: number = 2): string => {
  const num = safeNumber(value, 0);
  return formatNumber(num, decimals);
};

// ============================================
// 🔥 MAIN COMPONENT - Fully Optimized
// ============================================
export default function JournalSettings() {
  const navigate = useNavigate();
  
  // 🚀 OPTIMIZED HOOKS - All using React Query
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { settings: riskSettings, oneR, loading: riskLoading } = useRiskSettings();
  const { commissions, updateCommission, updateCommissionType, saveSettings: saveCommissionsSettings } = useCommissionSettings();
  const { data: trades = [] } = useTrades(); // Pre-cached for export

  const { data: tradeStats } = useTradeStats();

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

// 🔥 FIXED: P&L from actual trades, NOT from portfolio difference
const portfolioValues = useMemo(() => {
  const current = safeNumber(riskSettings?.currentPortfolio || riskSettings?.portfolioSize, 0);
  const initial = safeNumber(riskSettings?.initialPortfolio, 0);
  
  // 🔥 P&L מגיע מהטריידים האמיתיים, לא מהפרש הפורטפוליו!
  const realPnL = safeNumber(tradeStats?.totalPnL, 0);
  
  // 🔥 ROI מחושב על בסיס ה-P&L האמיתי
  const roi = initial > 0 ? (realPnL / initial * 100) : 0;
  
  return {
    current,
    initial,
    pnl: realPnL,  // 🔥 P&L אמיתי מהטריידים
    roi,
    hasInitial: initial > 0,
    hasChanged: realPnL !== 0  // 🔥 יש שינוי רק אם יש טריידים עם P&L
  };
}, [riskSettings, tradeStats]);  // 🔥 הוספתי tradeStats לדפנדנסיס
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
    const result = await cancelSubscription(data);
    // Return result to modal - don't close here, let success screen show
    return result;
  }, [cancelSubscription]);

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

  // 🔥 v2.0: Check if user needs to select a plan
  const needsPlanSelection = !profile?.account_type || profile?.account_type === 'free' || profile?.account_type === 'trial';

  return (
    <div className="min-h-screen flex justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <PageTitle title="Journal Settings" subtitle="Manage your account and trading preferences" />
        
        {/* 🔥 Risk Management - FIXED: No more NaN values */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">Risk Management</h3>
              <p className="text-xs text-zinc-500 mt-1">Your portfolio size and risk parameters</p>
            </div>
            <button 
              onClick={() => setIsRiskSettingsOpen(true)}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Update Settings
            </button>
          </div>
          
          {/* Main Grid - 2 Columns for better horizontal layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Input Fields */}
            <div className="space-y-4">
              {/* 🔥 Portfolio Size - FULLY FIXED */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Current Portfolio</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ${safeFormatNumber(portfolioValues.current, 0)}
                </div>
                
                {/* 🔥 Initial Portfolio + ROI Display - FULLY FIXED */}
                {portfolioValues.hasInitial && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Initial Portfolio:</span>
                      <span className="text-sm text-zinc-400 font-medium">
                        ${safeFormatNumber(portfolioValues.initial, 0)}
                      </span>
                    </div>
                    
                    {portfolioValues.hasChanged && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Total P&L:</span>
                          <span className={`text-sm font-semibold ${
                            portfolioValues.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {portfolioValues.pnl >= 0 ? '+' : ''}${safeFormatNumber(portfolioValues.pnl, 2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Total ROI:</span>
                          <span className={`text-base font-bold ${
                            portfolioValues.roi >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {portfolioValues.roi >= 0 ? '+' : ''}{safeFormatNumber(portfolioValues.roi, 2)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Risk Mode & Amount in one row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400">Risk Mode</span>
                  </div>
                  <div className="text-xl font-bold text-white capitalize">
                    {riskSettings?.riskMode === 'percentage' ? 'Percentage' : 'Fixed'}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      {riskSettings?.riskMode === 'percentage' ? (
                        <Percent className="w-4 h-4 text-purple-400" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-zinc-400">Per Trade</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {riskSettings?.riskMode === 'percentage' 
                      ? `${safeFormatNumber(riskSettings.riskPerTrade, 0)}%`
                      : `$${safeFormatNumber(riskSettings?.riskPerTrade, 0)}`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 1R Display (Hero Card) - FULLY FIXED */}
            <div className="p-6 rounded-xl border-2 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/5 to-[#C9A646]/10 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C9A646]/10 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400">Your 1R Value</span>
                </div>
                
                <div className="text-5xl font-bold text-[#C9A646] mb-2">
                  ${safeFormatNumber(oneR, 2)}
                </div>
                
                <p className="text-xs text-zinc-500 mb-4">
                  {riskSettings?.riskMode === 'percentage' 
                    ? `${safeFormatNumber(riskSettings.riskPerTrade, 0)}% of $${safeFormatNumber(riskSettings.portfolioSize, 0)}`
                    : `Fixed amount per trade`
                  }
                </p>

                {/* Info Box */}
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-blue-400 leading-relaxed">
                      <span className="font-semibold">1R</span> represents your risk per trade. 
                      For example, if you risk $100 and make $200, that's a +2R win.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Account Information - WITH CANCELLATION NOTICE */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-6">Account Information</h3>
          
{/* 🔥 CANCELLATION NOTICE - Shows when subscription is pending cancellation */}
          {profile?.subscription_cancel_at_period_end && profile?.subscription_expires_at && (
            <div className="mb-6 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-amber-300 font-semibold mb-1">
                    Subscription Ending Soon
                  </h4>
                  <p className="text-amber-200/80 text-sm leading-relaxed">
                    Your <span className="font-semibold">{profile.account_type?.charAt(0).toUpperCase() + profile.account_type?.slice(1)}</span> subscription 
                    will {profile.pending_downgrade_plan === 'cancel' ? 'be cancelled' : `downgrade to ${profile.pending_downgrade_plan?.charAt(0).toUpperCase() + profile.pending_downgrade_plan?.slice(1)}`} on{' '}
                    <span className="font-semibold">
                      {new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>.
                  </p>
                  <p className="text-amber-200/60 text-xs mt-2">
                    You'll continue to have full access to all {profile.account_type} features until then.
                  </p>
                  
                  {/* 🔥 Reactivate Button */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={isSubscriptionLoading}
                      className="px-4 py-2 bg-[#C9A646] hover:bg-[#D4B84A] text-black rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#C9A646]/20 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubscriptionLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Reactivating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Keep My Subscription
                        </>
                      )}
                    </button>
                    <span className="text-amber-200/50 text-xs">
                      Changed your mind? Click to continue your subscription.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🔥 v2.0: No Plan Selected Notice */}
          {needsPlanSelection && !profile?.subscription_cancel_at_period_end && (
            <div className="mb-6 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-blue-300 font-semibold mb-1">
                    Choose Your Plan
                  </h4>
                  <p className="text-blue-200/80 text-sm leading-relaxed">
                    Start with a <span className="font-semibold">14-day free trial</span> on Basic, 
                    or go Premium for unlimited access.
                  </p>
                  
                  <div className="mt-4">
                    <button
                      onClick={handleUpgrade}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                    >
                      <Zap className="w-4 h-4" />
                      Choose a Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Plan Type */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div>
                <label className="text-sm font-medium text-zinc-300">Plan Type</label>
                <p className="text-xs text-zinc-500 mt-1">Current subscription plan</p>
              </div>
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="h-8 w-20 bg-zinc-800 animate-pulse rounded-full"></div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      needsPlanSelection
                        ? "bg-zinc-800 text-zinc-300" 
                        : planInfo.badge === "basic"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    }`}>
                      {needsPlanSelection ? 'No Plan' : planInfo.name}
                    </span>
                    {/* 🔥 Cancellation badge */}
                    {profile?.subscription_cancel_at_period_end && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Ending
                      </span>
                    )}
                  </div>
                )}
                <button 
                  onClick={handleUpgrade}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    needsPlanSelection
                      ? 'bg-[#D4AF37] hover:bg-[#E5C158] text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {needsPlanSelection ? 'Choose Plan' : 'Change Plan'}
                </button>
              </div>
            </div>

            {/* Billing Date - Updated to show expiration for cancelled subscriptions */}
            {!needsPlanSelection && (
              <div className="flex items-center justify-between py-4 border-b border-zinc-800">
                <div>
                  <label className="text-sm font-medium text-zinc-300">
                    {profile?.subscription_cancel_at_period_end ? 'Access Until' : 'Billing Date'}
                  </label>
                  <p className="text-xs text-zinc-500 mt-1">
                    {profile?.subscription_cancel_at_period_end 
                      ? 'Your subscription ends on this date' 
                      : 'Next billing cycle'
                    }
                  </p>
                </div>
                {loading ? (
                  <div className="h-5 w-32 bg-zinc-800 animate-pulse rounded"></div>
                ) : (
                  <span className={`text-sm ${
                    profile?.subscription_cancel_at_period_end 
                      ? 'text-amber-400 font-medium' 
                      : 'text-zinc-400'
                  }`}>
                    {profile?.subscription_cancel_at_period_end && profile?.subscription_expires_at
                      ? new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : billingDate
                    }
                  </span>
                )}
              </div>
            )}

            {/* Subscription Status */}
            {profile && !needsPlanSelection && (
              <div className="flex items-center justify-between py-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Status</label>
                  <p className="text-xs text-zinc-500 mt-1">Current subscription status</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile.subscription_cancel_at_period_end
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : profile.subscription_status === 'active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : profile.subscription_status === 'trial'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {profile.subscription_cancel_at_period_end
                      ? 'Cancelling'
                      : profile.subscription_status?.charAt(0).toUpperCase() + profile.subscription_status?.slice(1)
                    }
                  </span>
                  
                  {/* 🔥 NEW: Cancel Button - Only show if not already cancelling */}
                  {!profile.subscription_cancel_at_period_end && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 🔥 Pending Downgrade Info */}
            {profile?.pending_downgrade_plan && profile?.subscription_cancel_at_period_end && (
              <div className="flex items-center justify-between py-4 border-t border-zinc-800">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Downgrading To</label>
                  <p className="text-xs text-zinc-500 mt-1">Your plan after current period ends</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile.pending_downgrade_plan === 'cancel'
                    ? 'bg-zinc-700 text-zinc-300'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {profile.pending_downgrade_plan === 'cancel' 
                    ? 'Cancelled' 
                    : profile.pending_downgrade_plan.charAt(0).toUpperCase() + profile.pending_downgrade_plan.slice(1)
                  }
                </span>
              </div>
            )}
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

        {/* Account Actions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Account Actions</h3>
          <p className="text-sm text-zinc-500 mb-6">Manage your account security and session</p>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Change Password
            </button>
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Log Out
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
        subscriptionExpiresAt={profile?.subscription_expires_at}
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
        expiresAt={profile?.subscription_expires_at}
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