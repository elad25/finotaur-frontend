// src/pages/app/journal/AffiliateDashboard.tsx
// ============================================
// Affiliate Dashboard - User Side
// For approved affiliates to track their performance
// ============================================

import { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  useIsAffiliate, 
  useAffiliateDashboard, 
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useUpdateAffiliateProfile
} from '@/features/affiliate/hooks/useAffiliate';
import { TIER_INFO } from '@/features/affiliate/types/affiliate.types';
import AffiliateApplicationForm from '@/features/affiliate/components/AffiliateApplicationForm';

export default function AffiliateDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'commissions' | 'payouts' | 'settings'>('overview');
  const [showApplyModal, setShowApplyModal] = useState(false);
  
  const { data: affiliateProfile, isLoading: profileLoading } = useIsAffiliate();
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useAffiliateDashboard();
  const { data: referrals, isLoading: referralsLoading } = useAffiliateReferrals();
  const { data: commissions, isLoading: commissionsLoading } = useAffiliateCommissions();
  const { data: payouts, isLoading: payoutsLoading } = useAffiliatePayouts();
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

  // Not an affiliate - Show application form
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
            { icon: DollarSign, title: '10-20% Commission', desc: 'Earn up to 20% on every referred subscription' },
            { icon: Clock, title: '12-Month Earnings', desc: 'Receive commissions for 12 months per customer' },
            { icon: Award, title: 'Volume Bonuses', desc: 'Unlock milestone bonuses at 20, 50, and 100 referrals' },
          ].map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111111] border border-gray-800 rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="w-6 h-6 text-[#D4AF37]" />
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
                className={`p-4 rounded-lg border ${
                  key === 'tier_3' 
                    ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' 
                    : 'bg-[#0A0A0A] border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{tier.name}</span>
                  <span className={`text-lg font-bold ${key === 'tier_3' ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {(tier.commissionRate * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Apply to Become an Affiliate</h2>
          <AffiliateApplicationForm />
        </div>
      </div>
    );
  }

  // Affiliate Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
              <Gift className="w-5 h-5 text-black" />
            </div>
            Affiliate Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Track your referrals and earnings</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tier Badge */}
          <div className={`px-4 py-2 rounded-lg border ${
            dashboard?.current_tier === 'tier_3' 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
              : dashboard?.current_tier === 'tier_2'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
          }`}>
            <span className="text-xs uppercase tracking-wider font-semibold">
              {TIER_INFO[dashboard?.current_tier || 'tier_1']?.name || 'Tier 1'}
            </span>
            <span className="mx-2">•</span>
            <span className="font-bold">
              {((TIER_INFO[dashboard?.current_tier || 'tier_1']?.commissionRate || 0.1) * 100).toFixed(0)}%
            </span>
          </div>
          
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#111111] rounded-lg transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
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
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={shareLink}
                className="p-3 bg-[#D4AF37] rounded-lg text-black hover:bg-[#E5C158] transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your affiliate code: <span className="text-[#D4AF37] font-mono font-semibold">{dashboard?.affiliate_code}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { 
            label: 'Total Clicks', 
            value: dashboard?.total_clicks || 0, 
            icon: MousePointer, 
            color: 'text-purple-400',
            bg: 'bg-purple-500/10'
          },
          { 
            label: 'Total Signups', 
            value: dashboard?.total_signups || 0, 
            icon: Users, 
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
          },
          { 
            label: 'Qualified Referrals', 
            value: dashboard?.total_qualified_referrals || 0, 
            icon: UserCheck, 
            color: 'text-green-400',
            bg: 'bg-green-500/10'
          },
          { 
            label: 'Total Earnings', 
            value: `$${(dashboard?.total_earnings_usd || 0).toFixed(2)}`, 
            icon: DollarSign, 
            color: 'text-[#D4AF37]',
            bg: 'bg-[#D4AF37]/10'
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#111111] border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
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
        
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-orange-400">${(dashboard?.total_pending_usd || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'referrals', label: 'Referrals', icon: Users },
          { id: 'commissions', label: 'Commissions', icon: DollarSign },
          { id: 'payouts', label: 'Payouts', icon: Wallet },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#D4AF37] text-black'
                : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Progress to Next Tier */}
            {dashboard?.clients_to_next_tier > 0 && (
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Progress to Next Tier</h4>
                  <span className="text-[#D4AF37] text-sm font-semibold">
                    {dashboard?.clients_to_next_tier} more to go!
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C158] rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((dashboard?.total_qualified_referrals || 0) / ((dashboard?.total_qualified_referrals || 0) + (dashboard?.clients_to_next_tier || 1))) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Get {dashboard?.clients_to_next_tier} more qualified referrals to unlock 
                  {dashboard?.current_tier === 'tier_1' ? ' 15%' : ' 20%'} commission rate!
                </p>
              </div>
            )}

            {/* Conversion Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <h4 className="text-gray-400 text-sm mb-2">Click to Signup Rate</h4>
                <p className="text-3xl font-bold text-white">
                  {(dashboard?.signup_conversion_rate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <h4 className="text-gray-400 text-sm mb-2">Qualification Rate</h4>
                <p className="text-3xl font-bold text-green-400">
                  {(dashboard?.qualification_rate || 0).toFixed(1)}%
                </p>
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
                    <li>• Commissions are paid monthly on the 15th (minimum $100)</li>
                    <li>• Earnings last for 12 months per customer</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Your Referrals</h3>
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
                {referrals?.map((ref) => (
                  <div 
                    key={ref.id}
                    className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{ref.referred_user_email}</p>
                      <p className="text-gray-500 text-sm">
                        {new Date(ref.signup_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      ref.status === 'qualified' 
                        ? 'bg-green-500/10 text-green-400'
                        : ref.status === 'pending'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commissions Tab */}
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
                      <tr key={comm.id} className="border-b border-gray-800/50">
                        <td className="py-3 px-4 text-white">
                          {new Date(comm.commission_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-gray-400 capitalize">
                          {comm.commission_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {(comm.commission_rate * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 text-[#D4AF37] font-semibold">
                          ${comm.commission_amount_usd.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            comm.status === 'paid' 
                              ? 'bg-green-500/10 text-green-400'
                              : comm.status === 'confirmed'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payouts Tab */}
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
                  Payouts are processed monthly when balance reaches $100
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
                      <p className="text-white font-semibold">
                        ${payout.total_amount_usd.toFixed(2)}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {new Date(payout.payout_period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        payout.status === 'completed' 
                          ? 'bg-green-500/10 text-green-400'
                          : payout.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {payout.status}
                      </span>
                      {payout.transaction_id && (
                        <p className="text-gray-500 text-xs mt-1">
                          ID: {payout.transaction_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Payment Settings</h3>
            
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
              <label className="block text-gray-400 text-sm mb-2">PayPal Email</label>
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="your-paypal@email.com"
                  defaultValue={dashboard?.paypal_email || ''}
                  className="flex-1 px-4 py-3 bg-[#111111] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  onClick={() => {
                    // Get value from input
                    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
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

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium mb-1">Minimum Payout</h4>
                  <p className="text-gray-400 text-sm">
                    Payouts are processed monthly on the 15th when your balance reaches $100 or more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}