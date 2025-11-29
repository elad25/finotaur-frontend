// src/pages/app/journal/AffiliateDashboard.tsx
// ============================================
// ENHANCED Affiliate Dashboard - User Side
// Complete dashboard for affiliates to track performance
// ============================================

import { useState, useEffect } from 'react';
import { 
  Gift, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  ExternalLink,
  MousePointer,
  UserCheck,
  Loader2,
  Award,
  Clock,
  CheckCircle,
  ArrowUpRight,
  QrCode,
  Share2,
  Settings,
  Wallet,
  ChevronRight,
  Info,
  AlertCircle,
  XCircle,
  Calendar,
  BarChart3,
  RefreshCw,
  Bell,
  BellOff,
  Mail,
  Eye,
  EyeOff,
  Target,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  useIsAffiliate, 
  useAffiliateDashboard, 
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateAnalytics,
  useUpdateAffiliateProfile
} from '@/features/affiliate/hooks/useAffiliate';
import { TIER_INFO, VERIFICATION_PERIOD_DAYS, MIN_PAYOUT_USD } from '@/features/affiliate/types/affiliate.types';
import AffiliateApplicationForm from '@/features/affiliate/components/AffiliateApplicationForm';

// ============================================
// TAB TYPES
// ============================================
type TabId = 'overview' | 'referrals' | 'commissions' | 'payouts' | 'analytics' | 'settings';

// ============================================
// TIER BADGE COMPONENT
// ============================================
function TierBadge({ tier, size = 'md' }: { tier: string; size?: 'sm' | 'md' | 'lg' }) {
  const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO];
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  const colors = {
    tier_1: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    tier_2: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    tier_3: 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-semibold ${sizes[size]} ${colors[tier as keyof typeof colors] || colors.tier_1}`}>
      {tier === 'tier_3' && <Award className="w-3.5 h-3.5" />}
      {tierInfo?.name || 'Tier 1'}
      <span className="opacity-70">•</span>
      {((tierInfo?.commissionRate || 0.1) * 100).toFixed(0)}%
    </span>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    qualified: 'bg-green-500/10 text-green-400 border-green-500/30',
    verification_failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    churned: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    paid: 'bg-green-500/10 text-green-400 border-green-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    processing: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'text-white',
  bgColor = 'bg-white/5',
  trend,
  subtitle 
}: {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
  bgColor?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111111] border border-gray-800 rounded-xl p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.value >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function AffiliateDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  
  // Hooks
  const { data: affiliateProfile, isLoading: profileLoading } = useIsAffiliate();
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useAffiliateDashboard();
  const { data: referrals, isLoading: referralsLoading } = useAffiliateReferrals();
  const { data: commissions, isLoading: commissionsLoading } = useAffiliateCommissions(50);
  const { data: payouts, isLoading: payoutsLoading } = useAffiliatePayouts();
  const { data: analytics, isLoading: analyticsLoading } = useAffiliateAnalytics(dateRange.start, dateRange.end);
  const updateProfile = useUpdateAffiliateProfile();

  const isLoading = profileLoading || dashboardLoading;
  const isAffiliate = affiliateProfile?.status === 'active';

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Share link
  const shareLink = async () => {
    if (!dashboard?.referral_link) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Finotaur',
          text: 'Start your trading journey with Finotaur and get a special discount!',
          url: dashboard.referral_link,
        });
      } catch (err) {
        copyToClipboard(dashboard.referral_link, 'Link');
      }
    } else {
      copyToClipboard(dashboard.referral_link, 'Link');
    }
  };

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'referrals', label: 'Referrals', icon: Users, count: referrals?.length },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  // Not an affiliate - Show application form or info
  if (!isAffiliate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] mb-4">
            <Gift className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Affiliate Program</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Earn up to 20% commission on every referral. Join our partner program and start earning today!
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: DollarSign, title: '10-20% Commission', desc: 'Earn up to 20% on every referred subscription', color: 'text-green-400', bg: 'bg-green-500/10' },
            { icon: Clock, title: '12-Month Earnings', desc: 'Receive commissions for 12 months per customer', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: Award, title: 'Volume Bonuses', desc: 'Unlock milestone bonuses at 20, 50, and 100 referrals', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
          ].map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111111] border border-gray-800 rounded-xl p-6 text-center hover:border-gray-700 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl ${benefit.bg} flex items-center justify-center mx-auto mb-4`}>
                <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
              </div>
              <h3 className="text-white font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-400 text-sm">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Tier Information */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            Commission Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(TIER_INFO).map(([key, tier]) => (
              <div 
                key={key}
                className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                  key === 'tier_3' 
                    ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' 
                    : 'bg-[#0A0A0A] border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold flex items-center gap-2">
                    {key === 'tier_3' && <Award className="w-4 h-4 text-[#D4AF37]" />}
                    {tier.name}
                  </span>
                  <span className={`text-xl font-bold ${key === 'tier_3' ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {(tier.commissionRate * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{tier.description}</p>
                {'canRecruitSubAffiliates' in tier && tier.canRecruitSubAffiliates && (
                  <p className="text-[#D4AF37] text-xs mt-2 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Can recruit sub-affiliates (+5%)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#D4AF37]" />
            Apply to Become an Affiliate
          </h2>
          <AffiliateApplicationForm />
        </div>
      </div>
    );
  }

  // ============================================
  // AFFILIATE DASHBOARD (Active Affiliate)
  // ============================================
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
              <Gift className="w-5 h-5 text-black" />
            </div>
            Affiliate Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome back, <span className="text-white font-medium">{dashboard?.display_name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <TierBadge tier={dashboard?.current_tier || 'tier_1'} size="lg" />
          <button
            onClick={() => refetchDashboard()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#111111] rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Referral Link Card */}
      <div className="bg-gradient-to-r from-[#D4AF37]/10 to-[#B8860B]/5 border border-[#D4AF37]/20 rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#D4AF37]" />
              Your Referral Link
            </h3>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-black/30 rounded-lg text-[#D4AF37] font-mono text-sm truncate">
                {dashboard?.referral_link || 'Loading...'}
              </code>
              <button
                onClick={() => copyToClipboard(dashboard?.referral_link || '', 'Link')}
                className="p-3 bg-black/30 rounded-lg text-[#D4AF37] hover:bg-black/50 transition-colors"
                title="Copy link"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={shareLink}
                className="p-3 bg-[#D4AF37] rounded-lg text-black hover:bg-[#E5C158] transition-colors"
                title="Share link"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your affiliate code: <span className="text-[#D4AF37] font-mono font-semibold">{dashboard?.affiliate_code}</span>
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-6 lg:border-l lg:border-[#D4AF37]/20 lg:pl-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{dashboard?.total_clicks || 0}</p>
              <p className="text-gray-400 text-xs">Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{dashboard?.total_signups || 0}</p>
              <p className="text-gray-400 text-xs">Signups</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">${(dashboard?.total_earnings_usd || 0).toFixed(0)}</p>
              <p className="text-gray-400 text-xs">Earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {dashboard?.clients_to_next_tier > 0 && (
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="text-white font-medium">Progress to Next Tier</h4>
            </div>
            <span className="text-[#D4AF37] text-sm font-semibold">
              {dashboard?.clients_to_next_tier} more to go!
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C158] rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.min(100, ((dashboard?.total_qualified_referrals || 0) / ((dashboard?.total_qualified_referrals || 0) + (dashboard?.clients_to_next_tier || 1))) * 100)}%` 
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Get {dashboard?.clients_to_next_tier} more qualified referrals to unlock 
            <span className="text-[#D4AF37] font-semibold">
              {dashboard?.current_tier === 'tier_1' ? ' 15%' : ' 20%'}
            </span> commission rate!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                  activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-gray-700 text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-[#111111] border border-gray-800 rounded-xl p-6"
        >
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Clicks"
                  value={dashboard?.total_clicks || 0}
                  icon={MousePointer}
                  color="text-purple-400"
                  bgColor="bg-purple-500/10"
                />
                <StatCard
                  label="Total Signups"
                  value={dashboard?.total_signups || 0}
                  icon={Users}
                  color="text-blue-400"
                  bgColor="bg-blue-500/10"
                />
                <StatCard
                  label="Qualified Referrals"
                  value={dashboard?.total_qualified_referrals || 0}
                  icon={UserCheck}
                  color="text-green-400"
                  bgColor="bg-green-500/10"
                />
                <StatCard
                  label="Total Earnings"
                  value={`$${(dashboard?.total_earnings_usd || 0).toFixed(2)}`}
                  icon={DollarSign}
                  color="text-[#D4AF37]"
                  bgColor="bg-[#D4AF37]/10"
                />
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Paid Out</p>
                      <p className="text-2xl font-bold text-green-400">${(dashboard?.total_paid_usd || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Pending</p>
                      <p className="text-2xl font-bold text-orange-400">${(dashboard?.total_pending_usd || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  {(dashboard?.total_pending_usd || 0) >= MIN_PAYOUT_USD && (
                    <p className="text-green-400 text-xs">✓ Eligible for payout</p>
                  )}
                  {(dashboard?.total_pending_usd || 0) > 0 && (dashboard?.total_pending_usd || 0) < MIN_PAYOUT_USD && (
                    <p className="text-gray-500 text-xs">${(MIN_PAYOUT_USD - (dashboard?.total_pending_usd || 0)).toFixed(2)} more to reach minimum</p>
                  )}
                </div>
                
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Bonuses Earned</p>
                      <p className="text-2xl font-bold text-purple-400">${(dashboard?.total_bonuses_usd || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <h4 className="text-gray-400 text-sm mb-2">Click to Signup Rate</h4>
                  <p className="text-3xl font-bold text-white">
                    {(dashboard?.signup_conversion_rate || 0).toFixed(1)}%
                  </p>
                  <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, dashboard?.signup_conversion_rate || 0)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <h4 className="text-gray-400 text-sm mb-2">Qualification Rate</h4>
                  <p className="text-3xl font-bold text-green-400">
                    {(dashboard?.qualification_rate || 0).toFixed(1)}%
                  </p>
                  <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(100, dashboard?.qualification_rate || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-400 font-medium mb-1">How it works</h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Share your unique link with potential users</li>
                      <li>• When they sign up and become paying customers, you earn commission</li>
                      <li>• New signups have a {VERIFICATION_PERIOD_DAYS}-day verification period</li>
                      <li>• Commissions are paid monthly on the 15th (minimum ${MIN_PAYOUT_USD})</li>
                      <li>• Earnings last for 12 months per customer</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REFERRALS TAB */}
          {activeTab === 'referrals' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Your Referrals</h3>
                <span className="text-gray-400 text-sm">{referrals?.length || 0} total</span>
              </div>
              
              {referralsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                </div>
              ) : referrals?.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No referrals yet</p>
                  <p className="text-gray-500 text-sm mt-1">Share your link to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals?.map((ref) => {
                    const isPending = ref.status === 'pending';
                    const daysRemaining = isPending && ref.verification_end
                      ? Math.ceil((new Date(ref.verification_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
                      <div 
                        key={ref.id}
                        className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{ref.referred_user_email}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-gray-500 text-sm">
                              {new Date(ref.signup_date).toLocaleDateString()}
                            </p>
                            {ref.subscription_plan && (
                              <span className="text-gray-400 text-sm">
                                • {ref.subscription_plan}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isPending && daysRemaining > 0 && (
                            <span className="text-yellow-400 text-sm font-medium">
                              {daysRemaining}d left
                            </span>
                          )}
                          <StatusBadge status={ref.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* COMMISSIONS TAB */}
          {activeTab === 'commissions' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Commission History</h3>
              {commissionsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                </div>
              ) : commissions?.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No commissions yet</p>
                  <p className="text-gray-500 text-sm mt-1">Get qualified referrals to start earning!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Month</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Rate</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions?.map((comm) => (
                        <tr key={comm.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="py-3 px-4 text-white">
                            {new Date(comm.commission_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-gray-400 capitalize">
                            {comm.commission_type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {(comm.commission_rate * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 px-4 text-[#D4AF37] font-semibold">
                            ${comm.commission_amount_usd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={comm.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Payout History</h3>
              {payoutsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                </div>
              ) : payouts?.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No payouts yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Payouts are processed monthly when balance reaches ${MIN_PAYOUT_USD}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts?.map((payout) => (
                    <div 
                      key={payout.id}
                      className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-semibold text-lg">
                          ${payout.total_amount_usd.toFixed(2)}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {new Date(payout.payout_period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={payout.status} />
                        {payout.transaction_id && (
                          <p className="text-gray-500 text-xs mt-1 font-mono">
                            {payout.transaction_id}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Performance Analytics</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-1.5 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              {analyticsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Analytics Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Total Clicks</p>
                      <p className="text-2xl font-bold text-white">{analytics.clicks?.total || 0}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Unique Visitors</p>
                      <p className="text-2xl font-bold text-white">{analytics.clicks?.unique_ips || 0}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Conversions</p>
                      <p className="text-2xl font-bold text-green-400">{analytics.clicks?.converted || 0}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Conversion Rate</p>
                      <p className="text-2xl font-bold text-[#D4AF37]">{(analytics.clicks?.conversion_rate || 0).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Top Sources */}
                  {analytics.top_sources && analytics.top_sources.length > 0 && (
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Top Traffic Sources</h4>
                      <div className="space-y-2">
                        {analytics.top_sources.map((source: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-gray-400">{source.source || 'Direct'}</span>
                            <span className="text-white font-medium">{source.clicks} clicks</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earnings Breakdown */}
                  <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Period Earnings</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Total</p>
                        <p className="text-xl font-bold text-[#D4AF37]">${(analytics.earnings?.total || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Recurring</p>
                        <p className="text-xl font-bold text-white">${(analytics.earnings?.recurring || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Annual</p>
                        <p className="text-xl font-bold text-white">${(analytics.earnings?.annual || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Sub-Affiliate</p>
                        <p className="text-xl font-bold text-white">${(analytics.earnings?.sub_affiliate || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No analytics data available</p>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Account Settings</h3>
              
              {/* Payment Settings */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#D4AF37]" />
                  Payment Settings
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">PayPal Email</label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        placeholder="your-paypal@email.com"
                        defaultValue={dashboard?.paypal_email || ''}
                        id="paypal-email-input"
                        className="flex-1 px-4 py-3 bg-[#111111] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('paypal-email-input') as HTMLInputElement;
                          if (input?.value) {
                            updateProfile.mutate({ paypal_email: input.value });
                          }
                        }}
                        disabled={updateProfile.isPending}
                        className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors disabled:opacity-50"
                      >
                        {updateProfile.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                      This is where we'll send your payouts
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#D4AF37]" />
                  Email Notifications
                </h4>
                <div className="space-y-3">
                  {[
                    { key: 'notify_on_signup', label: 'New signups from your link', value: (dashboard as any)?.notify_on_signup ?? true },
                    { key: 'notify_on_qualification', label: 'Referrals become qualified', value: (dashboard as any)?.notify_on_qualification ?? true },
                    { key: 'notify_on_commission', label: 'New commissions earned', value: (dashboard as any)?.notify_on_commission ?? true },
                    { key: 'notify_on_payout', label: 'Payouts processed', value: (dashboard as any)?.notify_on_payout ?? true },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <span className="text-gray-400">{setting.label}</span>
                      <button
                        onClick={() => {
                          updateProfile.mutate({ [setting.key]: !setting.value });
                        }}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          setting.value ? 'bg-[#D4AF37]' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                          setting.value ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout Info */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-400 font-medium mb-1">Payout Information</h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Minimum payout: ${MIN_PAYOUT_USD}</li>
                      <li>• Payouts processed on the 15th of each month</li>
                      <li>• Payment via PayPal (ensure your email is correct)</li>
                      <li>• Allow 1-3 business days for payment to appear</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Import for tabs
import { LayoutDashboard } from 'lucide-react';