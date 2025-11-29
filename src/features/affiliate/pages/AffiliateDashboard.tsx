// =====================================================
// FINOTAUR AFFILIATE DASHBOARD
// =====================================================
// Place in: src/features/affiliate/pages/AffiliateDashboard.tsx
// 
// Complete dashboard for affiliates to view their:
// - Performance stats
// - Referrals and their status
// - Earnings and commissions
// - Payout history
// - Affiliate code and link
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, 
  Copy, 
  Check, 
  Users, 
  DollarSign, 
  TrendingUp,
  MousePointer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Award,
  Target,
  Zap,
  RefreshCw,
  Loader2,
  ExternalLink,
  Timer,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  Calendar,
  Settings,
  Bell,
  Gift,
  BarChart3,
  Trophy
} from 'lucide-react';
import { 
  useAffiliateProfile, 
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateBonuses,
  useAffiliateActivity,
  useCopyAffiliateLink,
  TIER_DISPLAY_INFO,
  type TierDisplayInfo,
} from '../hooks/useAffiliateProfile';
import type { AffiliateTier, AffiliateCommission } from '../types/affiliate.types';

// ============================================
// STATUS DISPLAY CONFIG
// ============================================

const REFERRAL_STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Payment',
    labelHe: 'ממתין לתשלום',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    icon: Clock,
  },
  verification_pending: {
    label: 'In Verification',
    labelHe: 'בתקופת אימות',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Timer,
  },
  verification_failed: {
    label: 'Verification Failed',
    labelHe: 'נכשל באימות',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: XCircle,
  },
  qualified: {
    label: 'Qualified',
    labelHe: 'זכאי לעמלה',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: CheckCircle,
  },
  churned: {
    label: 'Churned',
    labelHe: 'בוטל',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: XCircle,
  },
  refunded: {
    label: 'Refunded',
    labelHe: 'הוחזר',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: AlertCircle,
  },
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function AffiliateDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'earnings' | 'payouts'>('overview');
  
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useAffiliateProfile();
  const { copyLink, copyCode } = useCopyAffiliateLink();

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not an affiliate
  if (!profile) {
    return <NotAffiliateState />;
  }

  // Suspended state
  if (profile.status === 'suspended') {
    return <SuspendedState reason={profile.suspension_reason} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">Affiliate Dashboard</h1>
              <TierBadge tier={profile.current_tier as AffiliateTier} />
            </div>
            <button
              onClick={() => refetchProfile()}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Affiliate Code Card */}
        <AffiliateCodeCard 
          code={profile.affiliate_code}
          link={profile.referral_link || `https://finotaur.com/ref/${profile.affiliate_code}`}
          onCopyCode={copyCode}
          onCopyLink={copyLink}
        />

        {/* Stats Overview */}
        <StatsGrid profile={profile} />

        {/* Tier Progress */}
        <TierProgressCard profile={profile} />

        {/* Tabs */}
        <div className="flex gap-2 mt-8 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'referrals', label: 'Referrals', icon: Users },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
            { id: 'payouts', label: 'Payouts', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab profile={profile} />}
            {activeTab === 'referrals' && <ReferralsTab />}
            {activeTab === 'earnings' && <EarningsTab />}
            {activeTab === 'payouts' && <PayoutsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// AFFILIATE CODE CARD
// ============================================

function AffiliateCodeCard({ 
  code, 
  link, 
  onCopyCode, 
  onCopyLink 
}: { 
  code: string; 
  link: string;
  onCopyCode: () => void;
  onCopyLink: () => void;
}) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyCode = async () => {
    await onCopyCode();
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await onCopyLink();
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Code Section */}
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">Your Affiliate Code</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[#D4AF37]">{code}</span>
            <button
              onClick={handleCopyCode}
              className="p-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 rounded-lg transition-colors"
            >
              {codeCopied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-[#D4AF37]" />
              )}
            </button>
          </div>
        </div>

        {/* Link Section */}
        <div className="flex-1 lg:border-l lg:border-[#D4AF37]/20 lg:pl-6">
          <p className="text-sm text-gray-400 mb-2">Your Referral Link</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-black/30 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-300 truncate">
              {link}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold rounded-lg transition-colors"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Share */}
      <div className="mt-4 pt-4 border-t border-[#D4AF37]/20">
        <p className="text-xs text-gray-500">
          Share your link to earn up to <span className="text-[#D4AF37] font-semibold">20%</span> commission on every subscription!
        </p>
      </div>
    </div>
  );
}

// ============================================
// STATS GRID
// ============================================

function StatsGrid({ profile }: { profile: any }) {
  const stats = [
    {
      label: 'Total Clicks',
      value: profile.total_clicks?.toLocaleString() || '0',
      icon: MousePointer,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Signups',
      value: profile.total_signups?.toLocaleString() || '0',
      icon: UserPlus,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      subValue: `${profile.signup_conversion_rate || 0}% conversion`,
    },
    {
      label: 'Qualified Referrals',
      value: profile.total_qualified_referrals?.toLocaleString() || '0',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      subValue: `${profile.qualification_rate || 0}% of signups`,
    },
    {
      label: 'Active Customers',
      value: profile.total_active_customers?.toLocaleString() || '0',
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Total Earnings',
      value: `$${(profile.total_earnings_usd || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-[#D4AF37]',
      bgColor: 'bg-[#D4AF37]/10',
      highlight: true,
    },
    {
      label: 'Pending Payout',
      value: `$${(profile.total_pending_usd || 0).toFixed(2)}`,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Paid',
      value: `$${(profile.total_paid_usd || 0).toFixed(2)}`,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Bonuses Earned',
      value: `$${(profile.total_bonuses_usd || 0).toFixed(2)}`,
      icon: Gift,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              bg-[#111111] border rounded-xl p-4 transition-all
              ${stat.highlight 
                ? 'border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/20' 
                : 'border-gray-800 hover:border-gray-700'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.highlight ? 'text-[#D4AF37]' : 'text-white'}`}>
              {stat.value}
            </p>
            {stat.subValue && (
              <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// TIER PROGRESS CARD
// ============================================

function TierProgressCard({ profile }: { profile: any }) {
  const currentTier = profile.current_tier as AffiliateTier;
  const tierInfo = TIER_DISPLAY_INFO[currentTier];
  
  const qualifiedCount = profile.total_qualified_referrals || 0;
  const nextTierThreshold = currentTier === 'tier_1' ? 20 : currentTier === 'tier_2' ? 75 : null;
  const progressPercent = nextTierThreshold 
    ? Math.min(100, (qualifiedCount / nextTierThreshold) * 100)
    : 100;

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${tierInfo.bgColor} flex items-center justify-center`}>
            <Trophy className={`w-6 h-6 ${tierInfo.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{tierInfo.name} Tier</h3>
            <p className="text-sm text-gray-400">
              {(tierInfo.commissionRate * 100).toFixed(0)}% commission rate
            </p>
          </div>
        </div>
        
        {profile.clients_to_next_tier > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Next tier in</p>
            <p className="text-xl font-bold text-[#D4AF37]">
              {profile.clients_to_next_tier} clients
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {nextTierThreshold && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">{qualifiedCount} qualified</span>
            <span className="text-gray-400">{nextTierThreshold} needed</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C158] rounded-full"
            />
          </div>
        </div>
      )}

      {/* Tier Benefits */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-800">
        {(Object.entries(TIER_DISPLAY_INFO) as [AffiliateTier, TierDisplayInfo][]).map(([key, tier]) => {
          const isActive = key === currentTier;
          return (
            <div 
              key={key}
              className={`
                p-3 rounded-lg text-center transition-all
                ${isActive 
                  ? `${tier.bgColor} ${tier.borderColor} border` 
                  : 'bg-gray-800/30'
                }
              `}
            >
              <p className={`text-xs mb-1 ${isActive ? tier.color : 'text-gray-500'}`}>
                {tier.name}
              </p>
              <p className={`text-lg font-bold ${isActive ? tier.color : 'text-gray-600'}`}>
                {(tier.commissionRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                {tier.minClients}+ clients
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// TIER BADGE
// ============================================

function TierBadge({ tier }: { tier: AffiliateTier }) {
  const info = TIER_DISPLAY_INFO[tier];
  return (
    <span className={`
      px-3 py-1 rounded-full text-xs font-semibold
      ${info.bgColor} ${info.color} ${info.borderColor} border
    `}>
      {info.name}
    </span>
  );
}

// ============================================
// OVERVIEW TAB
// ============================================

function OverviewTab({ profile }: { profile: any }) {
  const { data: activity, isLoading: activityLoading } = useAffiliateActivity(10);
  const { data: bonuses } = useAffiliateBonuses();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D4AF37]" />
          Recent Activity
        </h3>

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="space-y-3">
            {activity.map((item) => (
              <div 
                key={item.id}
                className="flex items-start gap-3 p-3 bg-black/30 rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
        )}
      </div>

      {/* Bonuses */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-400" />
          Milestone Bonuses
        </h3>

        <div className="space-y-3">
          {[
            { milestone: 20, bonus: 100, achieved: (profile.total_qualified_referrals || 0) >= 20 },
            { milestone: 50, bonus: 300, achieved: (profile.total_qualified_referrals || 0) >= 50 },
            { milestone: 100, bonus: 1000, achieved: (profile.total_qualified_referrals || 0) >= 100 },
          ].map((item) => (
            <div 
              key={item.milestone}
              className={`
                flex items-center justify-between p-4 rounded-lg border
                ${item.achieved 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-gray-800/30 border-gray-800'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${item.achieved ? 'bg-green-500/20' : 'bg-gray-700/50'}
                `}>
                  {item.achieved ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Target className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${item.achieved ? 'text-green-400' : 'text-gray-400'}`}>
                    {item.milestone} Clients
                  </p>
                  <p className="text-xs text-gray-500">Milestone Bonus</p>
                </div>
              </div>
              <span className={`text-xl font-bold ${item.achieved ? 'text-green-400' : 'text-gray-600'}`}>
                ${item.bonus}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          + $100 for every 50 clients after reaching 100
        </p>
      </div>
    </div>
  );
}

// ============================================
// REFERRALS TAB
// ============================================

function ReferralsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: referrals, isLoading } = useAffiliateReferrals(statusFilter);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Awaiting Payment' },
    { value: 'verification_pending', label: 'In Verification' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'churned', label: 'Churned' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${statusFilter === option.value 
                ? 'bg-[#D4AF37] text-black' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Referrals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      ) : referrals && referrals.length > 0 ? (
        <div className="space-y-3">
          {referrals.map((referral) => {
            const statusConfig = REFERRAL_STATUS_CONFIG[referral.status as keyof typeof REFERRAL_STATUS_CONFIG];
            const StatusIcon = statusConfig?.icon || AlertCircle;

            return (
              <div 
                key={referral.id}
                className="bg-[#111111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${statusConfig?.bgColor} flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${statusConfig?.color}`} />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {referral.referred_user_email?.replace(/(.{3}).*(@.*)/, '$1***$2')}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Signed up {new Date(referral.signup_date || referral.created_at).toLocaleDateString()}</span>
                        {referral.subscription_plan && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{referral.subscription_plan}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`
                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                      ${statusConfig?.bgColor} ${statusConfig?.color}
                    `}>
                      {statusConfig?.label}
                    </span>
                    
                    {/* Show extra info based on status */}
                    {referral.status === 'verification_pending' && referral.days_remaining !== undefined && (
                      <p className="text-xs text-yellow-400 mt-1">
                        {referral.days_remaining} days remaining
                      </p>
                    )}
                    {referral.status === 'pending' && referral.days_since_signup !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        {referral.days_since_signup} days since signup
                      </p>
                    )}
                    {referral.status === 'qualified' && referral.subscription_price_usd && (
                      <p className="text-xs text-green-400 mt-1">
                        ${referral.subscription_price_usd}/mo
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar for verification */}
                {referral.status === 'verification_pending' && referral.verification_progress_pct !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Verification Progress</span>
                      <span>{referral.verification_progress_pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{ width: `${referral.verification_progress_pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No referrals yet</p>
          <p className="text-sm text-gray-500 mt-1">Share your link to start earning!</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          How Verification Works
        </h4>
        <p className="text-xs text-gray-400">
          Referrals enter a 7-day verification period <strong>after their first payment</strong>. 
          Once they pass this period without refunds, they become qualified and you start earning commissions.
        </p>
      </div>
    </div>
  );
}

// ============================================
// EARNINGS TAB
// ============================================

function EarningsTab() {
  const { data: commissions, isLoading } = useAffiliateCommissions();

  // Group by month
  const groupedCommissions = commissions?.reduce((acc, commission) => {
    const month = commission.commission_month;
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(commission);
    return acc;
  }, {} as Record<string, AffiliateCommission[]>);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      ) : commissions && commissions.length > 0 ? (
        Object.entries(groupedCommissions || {}).map(([month, monthCommissions]) => {
          const totalForMonth = monthCommissions.reduce((sum, c) => sum + (c.commission_amount_usd || 0), 0);
          
          return (
            <div key={month} className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-black/30 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  <span className="font-semibold text-white">
                    {new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-lg font-bold text-[#D4AF37]">
                  ${totalForMonth.toFixed(2)}
                </span>
              </div>

              <div className="divide-y divide-gray-800">
                {monthCommissions.map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center
                        ${commission.commission_type === 'monthly_recurring' 
                          ? 'bg-blue-500/10' 
                          : commission.commission_type === 'annual_upfront'
                          ? 'bg-purple-500/10'
                          : 'bg-green-500/10'
                        }
                      `}>
                        <DollarSign className={`w-4 h-4 
                          ${commission.commission_type === 'monthly_recurring' 
                            ? 'text-blue-400' 
                            : commission.commission_type === 'annual_upfront'
                            ? 'text-purple-400'
                            : 'text-green-400'
                          }
                        `} />
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          {commission.commission_type === 'monthly_recurring' && 'Monthly Commission'}
                          {commission.commission_type === 'annual_upfront' && 'Annual Commission'}
                          {commission.commission_type === 'sub_affiliate' && 'Sub-Affiliate Commission'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((commission.commission_rate || 0) * 100).toFixed(0)}% of ${(commission.base_amount_usd || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        ${(commission.commission_amount_usd || 0).toFixed(2)}
                      </p>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${commission.status === 'paid' 
                          ? 'bg-green-500/10 text-green-400' 
                          : commission.status === 'confirmed'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                        }
                      `}>
                        {commission.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No earnings yet</p>
          <p className="text-sm text-gray-500 mt-1">Start referring to earn commissions!</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// PAYOUTS TAB
// ============================================

function PayoutsTab() {
  const { data: payouts, isLoading } = useAffiliatePayouts();

  return (
    <div className="space-y-6">
      {/* Payout Info */}
      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-[#D4AF37] mb-2">Payout Information</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Minimum payout: <span className="text-white">$100</span></li>
          <li>• Payout day: <span className="text-white">15th of each month</span></li>
          <li>• Payment method: <span className="text-white">PayPal</span></li>
        </ul>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      ) : payouts && payouts.length > 0 ? (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div 
              key={payout.id}
              className="bg-[#111111] border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${payout.status === 'completed' 
                      ? 'bg-green-500/10' 
                      : payout.status === 'pending'
                      ? 'bg-yellow-500/10'
                      : 'bg-red-500/10'
                    }
                  `}>
                    {payout.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : payout.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {new Date(payout.payout_period).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })} Payout
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {payout.transaction_id && (
                        <span>Ref: {payout.transaction_id}</span>
                      )}
                      {payout.completed_at && (
                        <span>• Paid {new Date(payout.completed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-[#D4AF37]">
                    ${(payout.total_amount_usd || 0).toFixed(2)}
                  </p>
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${payout.status === 'completed' 
                      ? 'bg-green-500/10 text-green-400' 
                      : payout.status === 'pending'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-red-500/10 text-red-400'
                    }
                  `}>
                    {payout.status}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Commissions</p>
                  <p className="text-sm font-semibold text-white">
                    ${(payout.commissions_amount_usd || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Bonuses</p>
                  <p className="text-sm font-semibold text-white">
                    ${(payout.bonuses_amount_usd || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Adjustments</p>
                  <p className="text-sm font-semibold text-white">
                    ${(payout.adjustments_usd || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No payouts yet</p>
          <p className="text-sm text-gray-500 mt-1">Earn $100+ to receive your first payout</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// NOT AFFILIATE STATE
// ============================================

function NotAffiliateState() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-[#D4AF37]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          You're not an affiliate yet
        </h1>
        <p className="text-gray-400 mb-6">
          Join our affiliate program and start earning up to 20% commission on every referral!
        </p>
        <a 
          href="/affiliate"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold rounded-xl transition-colors"
        >
          Learn More
          <ChevronRight className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}

// ============================================
// SUSPENDED STATE
// ============================================

function SuspendedState({ reason }: { reason?: string | null }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          Account Suspended
        </h1>
        <p className="text-gray-400 mb-4">
          Your affiliate account has been suspended.
        </p>
        {reason && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-400">{reason}</p>
          </div>
        )}
        <p className="text-sm text-gray-500">
          Please contact support if you believe this is an error.
        </p>
      </div>
    </div>
  );
}