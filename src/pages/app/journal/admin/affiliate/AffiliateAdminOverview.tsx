// src/pages/app/journal/admin/affiliate/AffiliateAdminOverview.tsx
// ============================================
// Affiliate Admin - Overview Tab
// Dashboard statistics and top performers
// FIXED: Using correct TIER_INFO property names
// ============================================

import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  RefreshCw,
  Database,
  AlertTriangle
} from 'lucide-react';
import { useAffiliateAdminStats } from '@/features/affiliate/hooks/useAffiliateAdmin';
import { TIER_INFO } from '@/features/affiliate/types/affiliate.types';
import { SkeletonStatRow, SkeletonCard } from '@/components/ds/Skeleton';

interface AffiliateAdminOverviewProps {
  onReviewApplications?: () => void;
}

export default function AffiliateAdminOverview({ onReviewApplications }: AffiliateAdminOverviewProps) {
  const { data: stats, isLoading, error, refetch, isRefetching } = useAffiliateAdminStats();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-5 mt-4">
        <SkeletonStatRow count={4} />
        <SkeletonCard lines={3} />
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
            { label: 'Active Affiliates', icon: Users, value: '0' },
            { label: 'Qualified Referrals', icon: TrendingUp, value: '0' },
            { label: 'Total Commissions', icon: DollarSign, value: '$0' },
            { label: 'Pending Payouts', icon: DollarSign, value: '$0' },
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
      label: 'Active Affiliates',
      value: stats.active_affiliates,
      subValue: stats.total_affiliates !== stats.active_affiliates
        ? `${stats.total_affiliates} total`
        : undefined,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Qualified Referrals',
      value: stats.total_qualified.toLocaleString('en-US'),
      subValue: 'Paying customers',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Commissions',
      value: `$${stats.total_commissions_usd.toLocaleString('en-US')}`,
      subValue: 'All time',
      icon: DollarSign,
      color: 'text-[#D4AF37]',
      bgColor: 'bg-[#D4AF37]/10',
    },
    {
      label: 'Pending Payouts',
      value: `$${stats.total_pending_payouts_usd.toLocaleString('en-US')}`,
      subValue: 'To be paid',
      icon: DollarSign,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      highlight: stats.total_pending_payouts_usd > 0,
    },
  ];

  const hasTopAffiliates = stats.top_affiliates.some((a) => a.total_qualified_referrals > 0);

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

      {/* Pending Applications Alert */}
      {stats.pending_applications > 0 && (
        <div className="flex items-center justify-between gap-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-gray-200">
              <span className="font-semibold text-white">{stats.pending_applications}</span>{' '}
              {stats.pending_applications === 1 ? 'application' : 'applications'} awaiting review
            </p>
          </div>
          {onReviewApplications && (
            <button
              onClick={onReviewApplications}
              className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap"
            >
              Review →
            </button>
          )}
        </div>
      )}

      {/* Primary Stats */}
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
              {stat.subValue && <p className="text-xs text-gray-500">{stat.subValue}</p>}
            </div>
          );
        })}
      </div>

      {/* Funnel Strip */}
      <p className="text-xs text-gray-500">
        Clicks {stats.total_clicks.toLocaleString('en-US')} · Signups {stats.total_signups.toLocaleString('en-US')} · Conversion {stats.conversion_rate.toFixed(1)}%
      </p>

      {/* Top Affiliates */}
      {hasTopAffiliates && (
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-white">Top Affiliates</h3>
          </div>

          <div className="space-y-3">
            {stats.top_affiliates.map((affiliate, index) => (
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
            ))}
          </div>
        </div>
      )}

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