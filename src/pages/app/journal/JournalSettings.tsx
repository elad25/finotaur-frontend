import PageTitle from "@/components/PageTitle";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { X, Check, AlertTriangle, Shield, Zap, TrendingUp, DollarSign, Percent } from "lucide-react";
import RiskSettingsDialog from "@/components/RiskSettingsDialog";
import { formatNumber } from "@/utils/smartCalc";

// 🔥 OPTIMIZED HOOKS
import { useUserProfile, getPlanDisplay, getNextBillingDate } from "@/hooks/useUserProfile";
import { useRiskSettings } from "@/hooks/useRiskSettings";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useTrades } from "@/hooks/useTrades";

type BillingInterval = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthlyEquivalent: string;
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
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    yearlyMonthlyEquivalent: "$0",
    description: "Perfect for trying Finotaur",
    features: [
      "10 manual trades (lifetime)",
      "Basic trade journal",
      "Manual trade entry only",
      "Core performance metrics",
      "Community access",
      "Mobile app access"
    ],
    cta: "Current Plan",
    featured: false
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: "$19.99",
    yearlyPrice: "$149",
    yearlyMonthlyEquivalent: "$12.42",
    description: "Essential tools + automatic broker sync",
    features: [
      "Everything in Free, plus:",
      "Broker sync (12,000+ brokers)",
      "Up to 30 auto-synced trades/month (~2GB data)",
      "Unlimited manual trades",
      "Full performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Advanced statistics & metrics",
      "Equity curve & charts",
      "Trade screenshots & notes",
      "Email support"
    ],
    cta: "Upgrade to Basic",
    featured: false,
    savings: "Save 38%"
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: "$39.99",
    yearlyPrice: "$299",
    yearlyMonthlyEquivalent: "$24.92",
    description: "Unlimited everything + AI intelligence",
    features: [
      "Everything in Basic, plus:",
      "Unlimited auto-synced trades",
      "No data limits — sync freely",
      "AI-powered insights & coach",
      "Advanced AI analysis",
      "Pattern recognition",
      "Custom AI reports",
      "Behavioral risk alerts",
      "Priority support",
      "Early access to new features"
    ],
    cta: "Upgrade to Premium",
    featured: true,
    savings: "Save 38%"
  }
];

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
// 🔥 UPGRADE PLAN MODAL - Memoized
// ============================================
const UpgradePlanModal = ({ 
  isOpen, 
  onClose,
  currentPlan 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currentPlan: string;
}) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const getDisplayPrice = useCallback((plan: Plan) => {
    if (plan.id === "free") {
      return { price: "$0", period: "forever" };
    }
    
    if (billingInterval === 'monthly') {
      return { 
        price: plan.monthlyPrice, 
        period: "/month" 
      };
    } else {
      return { 
        price: plan.yearlyMonthlyEquivalent, 
        period: "/month",
        billedAs: `Billed ${plan.yearlyPrice}/year`
      };
    }
  }, [billingInterval]);

  const handlePlanSelect = useCallback((planId: string) => {
    if (planId === currentPlan) {
      toast.info("This is your current plan");
      return;
    }

    toast.info(`Upgrade to ${planId} - Payment integration coming soon`);
    onClose();
  }, [currentPlan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl w-full max-w-7xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h3 className="text-2xl font-semibold text-zinc-100">Upgrade Your Plan</h3>
            <p className="text-sm text-zinc-400 mt-1">Choose the best plan for your trading journey</p>
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
                    Start free — 10 manual trades
                  </h4>
                  <p className="text-slate-300 text-base leading-relaxed">
                    If Finotaur doesn't show a pattern that's hurting you within 10 trades, don't upgrade.
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

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const displayPrice = getDisplayPrice(plan);
              const isCurrentPlan = plan.id === currentPlan;
              
              return (
                <div
                  key={plan.id}
                  className={`p-6 relative transition-all duration-300 flex flex-col rounded-2xl ${
                    plan.featured ? 'md:scale-[1.05]' : ''
                  }`}
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
                  {plan.featured && (
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

                  {/* Savings Badge */}
                  {plan.savings && billingInterval === 'yearly' && !plan.featured && (
                    <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {plan.savings}
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="text-center mb-6 mt-2">
                    <h4 className="text-xl font-bold mb-2 text-white">{plan.name}</h4>
                    <div className="flex flex-col items-center justify-center gap-1 mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold ${plan.featured ? 'text-[#C9A646]' : 'text-white'}`}>
                          {displayPrice.price}
                        </span>
                        <span className="text-slate-400 text-sm">{displayPrice.period}</span>
                      </div>
                      {displayPrice.billedAs && (
                        <span className="text-xs text-slate-500">{displayPrice.billedAs}</span>
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
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                      isCurrentPlan
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : plan.featured 
                        ? 'bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black hover:scale-[1.02]' 
                        : 'border-2 border-[#C9A646]/40 hover:border-[#C9A646] hover:bg-[#C9A646]/10 text-white hover:scale-[1.02]'
                    }`}
                    style={!isCurrentPlan ? (plan.featured ? {
                      boxShadow: '0 6px 30px rgba(201,166,70,0.5), inset 0 2px 0 rgba(255,255,255,0.3)',
                    } : {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease'
                    }) : undefined}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.cta}
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
                <span className="text-sm">14-Day Premium Trial</span>
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
  const { trades } = useTrades(); // Pre-cached for export

  // Local UI state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isRiskSettingsOpen, setIsRiskSettingsOpen] = useState(false);

  // 🚀 Memoized computed values
  const planInfo = useMemo(() => getPlanDisplay(profile), [profile]);
  const billingDate = useMemo(() => getNextBillingDate(profile), [profile]);
  const loading = profileLoading || riskLoading;

  // 🔥 SAFE PORTFOLIO VALUES - Prevent NaN
  const portfolioValues = useMemo(() => {
    const current = safeNumber(riskSettings?.currentPortfolio || riskSettings?.portfolioSize, 0);
    const initial = safeNumber(riskSettings?.initialPortfolio, 0);
    const pnl = current - initial;
    const roi = initial > 0 ? ((current - initial) / initial * 100) : 0;
    
    return {
      current,
      initial,
      pnl,
      roi,
      hasInitial: initial > 0,
      hasChanged: current !== initial && initial > 0
    };
  }, [riskSettings]);

  // ============================================
  // 🔥 HANDLERS - All memoized with useCallback
  // ============================================
  const handleRiskSettingsClose = useCallback(() => {
    setIsRiskSettingsOpen(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsUpgradeModalOpen(true);
  }, []);

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

        {/* Account Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-6">Account Information</h3>
          
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
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                    planInfo.badge === "free"
                      ? "bg-zinc-800 text-zinc-300" 
                      : planInfo.badge === "basic"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                  }`}>
                    {planInfo.name}
                  </span>
                )}
                <button 
                  onClick={handleUpgrade}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (!loading && profile?.account_type === 'free')
                      ? 'bg-[#D4AF37] hover:bg-[#E5C158] text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {(!loading && profile?.account_type === 'free') ? 'Upgrade' : 'Change Plan'}
                </button>
              </div>
            </div>

            {/* Billing Date */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div>
                <label className="text-sm font-medium text-zinc-300">Billing Date</label>
                <p className="text-xs text-zinc-500 mt-1">Next billing cycle</p>
              </div>
              {loading ? (
                <div className="h-5 w-32 bg-zinc-800 animate-pulse rounded"></div>
              ) : (
                <span className="text-sm text-zinc-400">{billingDate}</span>
              )}
            </div>

            {/* Subscription Status */}
            {profile?.account_type !== 'free' && (
              <div className="flex items-center justify-between py-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Status</label>
                  <p className="text-xs text-zinc-500 mt-1">Current subscription status</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile?.subscription_status === 'active'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : profile?.subscription_status === 'trial'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {profile?.subscription_status?.charAt(0).toUpperCase() + profile?.subscription_status?.slice(1)}
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
        currentPlan={profile?.account_type || 'free'}
      />

      <RiskSettingsDialog 
        open={isRiskSettingsOpen}
        onClose={handleRiskSettingsClose}
      />
    </div>
  );
}