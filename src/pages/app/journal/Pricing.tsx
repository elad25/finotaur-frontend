import PageTitle from "@/components/PageTitle";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useCommissions, CommissionSettings } from "@/hooks/useRiskSettings";
import { X, Check, AlertTriangle, Shield, Zap, TrendingUp } from "lucide-react";

type CommissionType = "percentage" | "flat";

interface Commission {
  value: string;
  type: CommissionType;
}

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
    description: "Start your trading journey",
    features: [
      "10 trades limit (lifetime)",
      "Basic trade journal",
      "Limited statistics",
      "Community access",
      "Mobile app access"
    ],
    cta: "Current Plan",
    featured: false
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: "$15.99",
    yearlyPrice: "$155.88",
    yearlyMonthlyEquivalent: "$12.99",
    description: "Essential trading tools for serious traders",
    features: [
      "Unlimited trade journal",
      "Full performance analytics",
      "Strategy builder & tracking",
      "Calendar & trading sessions",
      "Advanced statistics & metrics",
      "Equity curve & charts",
      "Risk/Reward calculator",
      "Trade screenshots & notes",
      "Email support"
    ],
    cta: "Upgrade to Basic",
    featured: false,
    savings: "Save 19%"
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: "$24.99",
    yearlyPrice: "$239.88",
    yearlyMonthlyEquivalent: "$19.99",
    description: "Complete Trading Journal & Analytics with AI",
    features: [
      "Everything in Basic",
      "Automatic broker sync (12,000+ brokers)",
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
    savings: "Save 20%"
  }
];

// Change Password Modal Component
function ChangePasswordModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
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
}

// Upgrade Plan Modal Component - UPDATED WITH PROPER SPACING
function UpgradePlanModal({ 
  isOpen, 
  onClose,
  currentPlan 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currentPlan: string;
}) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const getDisplayPrice = (plan: Plan) => {
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
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === currentPlan) {
      toast.info("This is your current plan");
      return;
    }

    toast.info(`Upgrade to ${planId} - Payment integration coming soon`);
    onClose();
  };

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
                    Start free — 10 trades
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
                  Save up to 20%
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
}

export default function JournalSettings() {
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState("system");
  // ✅ Use the commission hook
const { commissions: serverCommissions, updateCommissions, isUpdating } = useCommissions();
const [commissions, setCommissions] = useState<CommissionSettings>(serverCommissions);

// Sync with server state
useEffect(() => {
  setCommissions(serverCommissions);
}, [serverCommissions]);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_type, subscription_interval, subscription_status, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };


  const getPlanDisplay = () => {
    if (!userProfile) return { name: 'Free', badge: 'free' };
    
    const { account_type, subscription_interval } = userProfile;
    
    if (account_type === 'free') {
      return { name: 'Free', badge: 'free' };
    } else if (account_type === 'basic') {
      const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
      return { name: `Basic (${intervalText})`, badge: 'basic' };
    } else if (account_type === 'premium') {
      const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
      return { name: `Premium (${intervalText})`, badge: 'premium' };
    }
    
    return { name: 'Free', badge: 'free' };
  };

  const getNextBillingDate = () => {
    if (!userProfile || userProfile.account_type === 'free') {
      return 'N/A';
    }

    if (userProfile.subscription_expires_at) {
      return new Date(userProfile.subscription_expires_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    return 'N/A';
  };

  const handleUpgrade = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleLogout = async () => {
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
  };

  const handleCommissionChange = (asset: string, value: string) => {
    setCommissions({
      ...commissions,
      [asset]: { ...commissions[asset as keyof CommissionSettings], value }
    });
  };

  const handleCommissionTypeChange = (asset: string, type: CommissionType) => {
    setCommissions({
      ...commissions,
      [asset]: { ...commissions[asset as keyof CommissionSettings], type }
    });
  };

  const handleSaveCommissions = () => {
  updateCommissions(commissions);
  // Toast is handled by the hook
};

  const handleSaveTimezone = () => {
  try {
    // Timezone stays in localStorage (not related to risk settings)
    localStorage.setItem('finotaur_timezone', timezone);
    toast.success("Timezone saved successfully!");
  } catch (error) {
    toast.error("Failed to save timezone");
    console.error(error);
  }
};

  const handleExportTrades = async () => {
    try {
      const { getTrades } = await import("@/routes/journal");
      const result = await getTrades();
      
      if (!result.ok || !result.data || result.data.length === 0) {
        toast.error("No trades to export");
        return;
      }

      const trades = result.data;
      
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
  };

  const planInfo = getPlanDisplay();
  const billingDate = getNextBillingDate();

  return (
    <div className="min-h-screen flex justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <PageTitle title="Journal Settings" subtitle="Manage your account and trading preferences" />
        
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
                    (!loading && userProfile?.account_type === 'free')
                      ? 'bg-[#D4AF37] hover:bg-[#E5C158] text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {(!loading && userProfile?.account_type === 'free') ? 'Upgrade' : 'Change Plan'}
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
            {userProfile?.account_type !== 'free' && (
              <div className="flex items-center justify-between py-4 border-b border-zinc-800">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Status</label>
                  <p className="text-xs text-zinc-500 mt-1">Current subscription status</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userProfile?.subscription_status === 'active'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : userProfile?.subscription_status === 'trial'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {userProfile?.subscription_status?.charAt(0).toUpperCase() + userProfile?.subscription_status?.slice(1)}
                </span>
              </div>
            )}

            {/* Timezone */}
            <div className="flex items-center justify-between py-4">
              <div>
                <label className="text-sm font-medium text-zinc-300">Timezone</label>
                <p className="text-xs text-zinc-500 mt-1">Used for trade timestamps and reports</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="min-w-[240px] px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="system">System Default</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Central European Time</option>
                  <option value="Asia/Jerusalem">Israel (Jerusalem)</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Dubai">Dubai</option>
                </select>
                <button 
                  onClick={handleSaveTimezone}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Commissions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">Trading Commissions</h3>
          <p className="text-sm text-zinc-500 mb-6">Set default commission rates per asset type (% or fixed amount)</p>
          
          <div className="space-y-1">
            {(Object.entries(commissions) as [keyof CommissionSettings, Commission][]).map(([asset, commission]) => (
              <div key={String(asset)} className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0">
                <label className="text-sm font-medium text-zinc-300 capitalize min-w-[120px]">
                  {String(asset)}
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={commission.type}
                    onChange={(e) => handleCommissionTypeChange(String(asset), e.target.value as CommissionType)}
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
                      onChange={(e) => handleCommissionChange(String(asset), e.target.value)}
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
  disabled={isUpdating}
  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isUpdating ? 'Saving...' : 'Save Commission Settings'}
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
        currentPlan={userProfile?.account_type || 'free'}
      />
    </div>
  );
}