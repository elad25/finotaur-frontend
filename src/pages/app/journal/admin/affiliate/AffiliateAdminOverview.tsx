// src/pages/app/journal/admin/affiliate/AffiliateAdminOverview.tsx
// ============================================
// Affiliate Admin - Overview Tab
// Dashboard statistics and top performers
// FIXED: Using correct TIER_INFO property names
// ============================================

import { 
  Users, 
  TrendingUp, 
  MousePointer,
  DollarSign,
  UserCheck,
  Clock,
  Award,
  Loader2,
  RefreshCw,
  Database,
  AlertTriangle
} from 'lucide-react';
import { useAffiliateAdminStats } from '@/features/affiliate/hooks/useAffiliateAdmin';
import { TIER_INFO } from '@/features/affiliate/types/affiliate.types';

export default function AffiliateAdminOverview() {
  const { data: stats, isLoading, error, refetch, isRefetching } = useAffiliateAdminStats();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  // Error state - likely tables don't exist
  if (error || !stats) {
    return (
      <div className="space-y-6">
        {/* Setup Required Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Database Setup Required</h3>
              <p className="text-gray-400 mb-4">
                The affiliate system tables haven't been created yet. Please run the SQL migration in Supabase to set up the database.
              </p>
              <div className="bg-[#0A0A0A] rounded-lg p-4 font-mono text-sm text-gray-300">
                <p className="text-gray-500 mb-1">-- Run in Supabase SQL Editor:</p>
                <p>-- See affiliate-database-schema.sql</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Affiliates', icon: Users, value: '0' },
            { label: 'Pending Applications', icon: Clock, value: '0' },
            { label: 'Total Clicks', icon: MousePointer, value: '0' },
            { label: 'Total Signups', icon: UserCheck, value: '0' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-gray-500" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-600">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tier Information */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Commission Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(TIER_INFO).map(([key, tier]) => (
              <div 
                key={key}
                className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">{tier.name}</span>
                  <span className="text-[#D4AF37] font-bold">
                    {(tier.commissionRate * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{tier.description}</p>
                <div className="text-xs text-gray-500">
                  {tier.minClients} - {tier.maxClients || '∞'} qualified clients
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Affiliates',
      value: stats.total_affiliates,
      subValue: `${stats.active_affiliates} active`,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Pending Applications',
      value: stats.pending_applications,
      subValue: 'Awaiting review',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      highlight: stats.pending_applications > 0,
    },
    {
      label: 'Total Clicks',
      value: stats.total_clicks.toLocaleString(),
      subValue: `${stats.conversion_rate.toFixed(1)}% conversion`,
      icon: MousePointer,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Signups',
      value: stats.total_signups.toLocaleString(),
      subValue: `${stats.qualification_rate.toFixed(1)}% qualified`,
      icon: UserCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Qualified Referrals',
      value: stats.total_qualified.toLocaleString(),
      subValue: 'Paying customers',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Commissions',
      value: `$${stats.total_commissions_usd.toLocaleString()}`,
      subValue: 'All time',
      icon: DollarSign,
      color: 'text-[#D4AF37]',
      bgColor: 'bg-[#D4AF37]/10',
    },
    {
      label: 'Pending Payouts',
      value: `$${stats.total_pending_payouts_usd.toLocaleString()}`,
      subValue: 'To be paid',
      icon: DollarSign,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      highlight: stats.total_pending_payouts_usd > 0,
    },
    {
      label: 'Est. Revenue',
      value: `$${stats.total_revenue_usd.toLocaleString()}`,
      subValue: 'From affiliates',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Program Overview</h2>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className={`
                bg-[#111111] border rounded-xl p-5 transition-all
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
                {stat.highlight && (
                  <span className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-semibold rounded-full">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.subValue}</p>
            </div>
          );
        })}
      </div>

      {/* Top Affiliates & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Affiliates */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-white">Top Affiliates</h3>
          </div>

          <div className="space-y-3">
            {stats.top_affiliates.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No affiliates yet</p>
            ) : (
              stats.top_affiliates.map((affiliate, index) => (
                <div 
                  key={affiliate.id}
                  className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-700/20 text-gray-400'}
                    `}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{affiliate.display_name}</p>
                      <p className="text-gray-500 text-xs">{affiliate.affiliate_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">
                      {affiliate.total_qualified_referrals} 
                      <span className="text-green-400 ml-1">qualified</span>
                    </p>
                    <p className="text-[#D4AF37] text-xs font-medium">
                      ${affiliate.total_earnings_usd.toFixed(2)} earned
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Recent Applications</h3>
          </div>

          <div className="space-y-3">
            {stats.recent_applications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No applications yet</p>
            ) : (
              stats.recent_applications.map((app) => (
                <div 
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium text-sm">{app.full_name}</p>
                    <p className="text-gray-500 text-xs">{app.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-semibold
                      ${app.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        app.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                        app.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'}
                    `}>
                      {app.status}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tier Information */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Tier Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(TIER_INFO).map(([key, tier]) => (
            <div 
              key={key}
              className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">{tier.name}</span>
                <span className="text-[#D4AF37] font-bold">
                  {(tier.commissionRate * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-2">{tier.description}</p>
              <div className="text-xs text-gray-500">
                {tier.minClients} - {tier.maxClients || '∞'} qualified clients
              </div>
              {'canRecruitSubAffiliates' in tier && tier.canRecruitSubAffiliates && (
                <div className="mt-2">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">
                    Can recruit sub-affiliates
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}