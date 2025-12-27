// src/features/affiliate/pages/AffiliateOverview.tsx
// ============================================
// 🚀 Optimized Affiliate Overview
// ============================================

import { useNavigate } from 'react-router-dom';
import { 
  useAffiliateProfile, 
  useAffiliateStats,
  usePrefetchAffiliateData 
} from '../hooks/useAffiliateData';
import { 
  DollarSign, Users, MousePointer, TrendingUp, 
  Copy, CheckCircle, ArrowUpRight, Award,
  CreditCard, Wallet, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback, useMemo, memo } from 'react';

// =====================================================
// CONSTANTS
// =====================================================

const TIER_CONFIG: Record<string, { name: string; commission: number; minReferrals: number; maxReferrals: number; color: string }> = {
  tier_1: { name: 'Starter', commission: 10, minReferrals: 0, maxReferrals: 19, color: 'text-gray-400' },
  tier_2: { name: 'Growth', commission: 15, minReferrals: 20, maxReferrals: 74, color: 'text-blue-400' },
  tier_3: { name: 'Pro', commission: 20, minReferrals: 75, maxReferrals: Infinity, color: 'text-[#C9A646]' },
};

const DISCOUNT_CONFIG: Record<string, { name: string; discount: number }> = {
  standard: { name: 'Standard', discount: 10 },
  vip: { name: 'VIP', discount: 15 },
};

type TierKey = keyof typeof TIER_CONFIG;
type DiscountKey = keyof typeof DISCOUNT_CONFIG;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// =====================================================
// MEMOIZED COMPONENTS
// =====================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
  loading?: boolean;
}

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color,
  highlight = false,
  loading = false,
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl p-4 transition-all",
        highlight && "ring-1 ring-[#C9A646]/30"
      )}
      style={{
        background: highlight 
          ? 'linear-gradient(180deg, rgba(201,166,70,0.1) 0%, rgba(20,20,20,0.9) 100%)'
          : 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          {loading ? (
            <div className="h-7 w-20 bg-white/5 rounded animate-pulse" />
          ) : (
            <p className={cn("text-xl font-bold", color)}>{value}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-black/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});

interface QuickActionCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const QuickActionCard = memo(function QuickActionCard({
  icon: Icon,
  label,
  description,
  onClick,
  disabled = false,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl p-4 text-left transition-all group",
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:bg-white/[0.02] hover:border-[#C9A646]/20"
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#C9A646]/10 text-[#C9A646] group-hover:bg-[#C9A646]/20 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
});

const NotAffiliateState = memo(function NotAffiliateState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Award className="h-16 w-16 text-gray-600 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Affiliate Access Required</h2>
      <p className="text-gray-400 mb-4">You need to be an active affiliate to access this page.</p>
      <button
        onClick={onNavigate}
        className="px-4 py-2 bg-[#C9A646] text-black rounded-lg font-medium hover:bg-[#D4B85A] transition-colors"
      >
        Apply to Become an Affiliate
      </button>
    </div>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AffiliateOverview() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  // Using optimized hooks with caching
  const { data: profile, isLoading: profileLoading } = useAffiliateProfile();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { prefetchAll } = usePrefetchAffiliateData();

  // Memoized handlers
  const handleCopyCode = useCallback(async () => {
    if (!profile?.affiliate_code) return;
    
    try {
      await navigator.clipboard.writeText(profile.affiliate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [profile?.affiliate_code]);

  const handleNavigateToAffiliate = useCallback(() => navigate('/affiliate'), [navigate]);
  const handleNavigateToPayouts = useCallback(() => navigate('/app/journal/affiliate/payouts'), [navigate]);
  const handleNavigateToReferrals = useCallback(() => navigate('/app/journal/affiliate/referrals'), [navigate]);
  const handleNavigateToEarnings = useCallback(() => navigate('/app/journal/affiliate/earnings'), [navigate]);
  const handleNavigateToMarketing = useCallback(() => navigate('/app/journal/affiliate/marketing'), [navigate]);

  // Memoized computed values
  const tierConfig = useMemo(() => {
    const tier = profile?.current_tier as TierKey | undefined;
    return tier ? TIER_CONFIG[tier] : TIER_CONFIG.tier_1;
  }, [profile?.current_tier]);

  const discountConfig = useMemo(() => {
    const discount = profile?.discount_tier as DiscountKey | undefined;
    return discount ? DISCOUNT_CONFIG[discount] : DISCOUNT_CONFIG.standard;
  }, [profile?.discount_tier]);

  const nextTier = useMemo(() => {
    if (!profile?.current_tier) return TIER_CONFIG.tier_2;
    if (profile.current_tier === 'tier_1') return TIER_CONFIG.tier_2;
    if (profile.current_tier === 'tier_2') return TIER_CONFIG.tier_3;
    return null;
  }, [profile?.current_tier]);

  const referralsToNextTier = useMemo(() => {
    if (!nextTier || !profile) return 0;
    const minReferrals = profile.current_tier === 'tier_1' ? 20 : 75;
    return Math.max(0, minReferrals - (profile.total_qualified_referrals || 0));
  }, [nextTier, profile]);

  const tierProgress = useMemo(() => {
    if (!nextTier || !profile) return 100;
    const current = profile.total_qualified_referrals || 0;
    const min = tierConfig.minReferrals;
    const max = profile.current_tier === 'tier_1' ? 20 : 75;
    return ((current - min) / (max - min)) * 100;
  }, [nextTier, profile, tierConfig.minReferrals]);

  const growthPercent = useMemo(() => {
    if (!stats?.lastMonthEarnings || stats.lastMonthEarnings <= 0) {
      return stats?.thisMonthEarnings && stats.thisMonthEarnings > 0 ? '100' : '0';
    }
    return ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100).toFixed(1);
  }, [stats?.thisMonthEarnings, stats?.lastMonthEarnings]);

  // Loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  // No profile
  if (!profile) {
    return <NotAffiliateState onNavigate={handleNavigateToAffiliate} />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-[#C9A646]" />
            Welcome back, {profile.affiliate_code}!
          </h1>
          <p className="text-gray-400 mt-1">
            Tier: <span className={tierConfig.color}>{tierConfig.name}</span> ({tierConfig.commission}% commission) • 
            Status: <span className="text-emerald-400">Active</span>
          </p>
        </div>
      </div>

      {/* Coupon Code Card */}
      <div 
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <h3 className="text-white font-medium mb-4">Your Coupon Code</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-black/40 rounded-lg p-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-[#C9A646] tracking-wider">
              {profile.affiliate_code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C9A646] text-black rounded-lg font-medium hover:bg-[#D4B85A] transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copy Code
              </>
            )}
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-3">
          Share this code with your audience! Your referrals get <span className="text-[#C9A646]">{discountConfig.discount}% off</span> their subscription.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={MousePointer}
          label="Total Clicks"
          value={stats?.totalClicks?.toLocaleString() || '0'}
          color="text-purple-400"
          loading={statsLoading}
        />
        <StatCard 
          icon={Users}
          label="Total Signups"
          value={stats?.totalSignups?.toLocaleString() || '0'}
          color="text-blue-400"
          loading={statsLoading}
        />
        <StatCard 
          icon={Award}
          label="Qualified Customers"
          value={stats?.totalQualified?.toLocaleString() || '0'}
          color="text-emerald-400"
          loading={statsLoading}
        />
        <StatCard 
          icon={DollarSign}
          label="Total Earnings"
          value={formatCurrency(stats?.totalEarnings || 0)}
          color="text-[#C9A646]"
          highlight
          loading={statsLoading}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tier Progress */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#C9A646]" />
            Tier Progress
          </h3>
          
          <div className="flex items-center justify-between mb-2">
            <span className={tierConfig.color}>{tierConfig.name}</span>
            {nextTier && (
              <span className={profile.current_tier === 'tier_1' ? 'text-blue-400' : 'text-[#C9A646]'}>
                {nextTier.name}
              </span>
            )}
          </div>
          
          <div className="h-3 bg-black/40 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-[#C9A646] to-[#D4B85A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, tierProgress)}%` }}
            />
          </div>
          
          {nextTier ? (
            <p className="text-gray-400 text-sm">
              <span className="text-[#C9A646] font-medium">{referralsToNextTier}</span> more qualified customers to reach{' '}
              <span className="text-[#C9A646]">{nextTier.commission}% commission</span>!
            </p>
          ) : (
            <p className="text-emerald-400 text-sm">
              🎉 You've reached the highest tier!
            </p>
          )}
        </div>

        {/* This Month Stats */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4">This Month</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">New Referrals</span>
              <span className="text-white font-medium">{stats?.thisMonthReferrals || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">New Qualified</span>
              <span className="text-emerald-400 font-medium">{stats?.totalQualified || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Earnings</span>
              <span className="text-[#C9A646] font-medium">{formatCurrency(stats?.thisMonthEarnings || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Pending</span>
              <span className="text-yellow-400 font-medium">{formatCurrency(stats?.pendingEarnings || 0)}</span>
            </div>
            
            {/* Growth indicator */}
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">vs Last Month</span>
                <span className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  Number(growthPercent) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  <ArrowUpRight className={cn("h-3 w-3", Number(growthPercent) < 0 && "rotate-180")} />
                  {growthPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={CreditCard}
          label="Request Payout"
          description={`${formatCurrency(stats?.availableForPayout || 0)} available`}
          onClick={handleNavigateToPayouts}
          disabled={(stats?.availableForPayout || 0) < 100}
        />
        <QuickActionCard
          icon={Users}
          label="View Referrals"
          description={`${stats?.totalSignups || 0} total signups`}
          onClick={handleNavigateToReferrals}
        />
        <QuickActionCard
          icon={Wallet}
          label="Earnings History"
          description="View all commissions"
          onClick={handleNavigateToEarnings}
/>
        <QuickActionCard
          icon={ExternalLink}
          label="Marketing Tools"
          description="Banners & links"
          onClick={handleNavigateToMarketing}
        />
      </div>
    </div>
  );
}