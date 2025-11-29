// src/features/affiliate/pages/Affiliateanalytics.tsx
// 🚀 Optimized with React Query caching, memoization, and useCallback

import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useAffiliateProfile, 
  useAffiliateStats,
  useAffiliateAnalytics 
} from '../hooks/useAffiliateData';
import { 
  BarChart3, MousePointer, Users, DollarSign,
  TrendingUp, Clock, Calendar, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// CONSTANTS
// =====================================================

const DATE_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
] as const;

type DateRangeValue = '7d' | '30d' | '90d' | 'all';

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

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// =====================================================
// MEMOIZED COMPONENTS
// =====================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  highlight?: boolean;
  loading?: boolean;
}

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value,
  subValue,
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
            <>
              <p className={cn("text-xl font-bold", color)}>{value}</p>
              {subValue && (
                <p className="text-gray-500 text-xs mt-1">{subValue}</p>
              )}
            </>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-black/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});

interface FunnelStepProps {
  label: string;
  value: number;
  percent: number;
  color: string;
}

const FunnelStep = memo(function FunnelStep({ 
  label, 
  value, 
  percent,
  color 
}: FunnelStepProps) {
  return (
    <div className="text-center flex-1 min-w-[80px]">
      <div className={cn("w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2", color)}>
        <span className="text-white font-bold text-sm">{value}</span>
      </div>
      <p className="text-white font-medium text-sm">{label}</p>
      <p className="text-gray-500 text-xs">{percent.toFixed(1)}%</p>
    </div>
  );
});

interface EarningsCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  percent: number;
  color: string;
}

const EarningsCard = memo(function EarningsCard({ 
  icon: Icon, 
  label, 
  value, 
  percent,
  color 
}: EarningsCardProps) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2 rounded-lg bg-black/30", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-300 text-sm">{label}</span>
          <span className={cn("font-medium", color)}>{value}</span>
        </div>
        <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full", color.replace('text-', 'bg-'))}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
});

interface StatusCardProps {
  label: string;
  value: number;
  color: string;
}

const StatusCard = memo(function StatusCard({ 
  label, 
  value, 
  color 
}: StatusCardProps) {
  return (
    <div 
      className="rounded-lg p-3 text-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
});

interface DateRangeButtonProps {
  range: { value: string; label: string };
  isActive: boolean;
  onClick: () => void;
}

const DateRangeButton = memo(function DateRangeButton({ 
  range, 
  isActive, 
  onClick 
}: DateRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-[#C9A646] text-black"
          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
      )}
    >
      {range.label}
    </button>
  );
});

interface ClickBarProps {
  day: { date: string; clicks: number };
  maxClicks: number;
}

const ClickBar = memo(function ClickBar({ day, maxClicks }: ClickBarProps) {
  const height = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
  
  return (
    <div className="flex-1 group relative">
      <div 
        className="bg-[#C9A646] rounded-t hover:bg-[#D4B85A] transition-colors cursor-pointer"
        style={{ height: `${Math.max(height, 4)}%` }}
      />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {day.clicks} clicks
          <br />
          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  );
});

interface TrafficSourceBarProps {
  source: { source: string; clicks: number };
  maxClicks: number;
}

const TrafficSourceBar = memo(function TrafficSourceBar({ source, maxClicks }: TrafficSourceBarProps) {
  const percent = maxClicks > 0 ? (source.clicks / maxClicks) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300 truncate">{source.source || 'Direct'}</span>
        <span className="text-gray-400">{source.clicks}</span>
      </div>
      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AffiliateAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRangeValue>('30d');
  
  // 🚀 Using optimized hooks with caching
  const { data: profile, isLoading: profileLoading } = useAffiliateProfile();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: analytics, isLoading: analyticsLoading } = useAffiliateAnalytics(dateRange);

  // Memoized handlers
  const handleDateRangeChange = useCallback((value: DateRangeValue) => {
    setDateRange(value);
  }, []);

  // Memoized computed values
  const clicksData = useMemo(() => analytics?.clicks || { total: 0, daily: [] }, [analytics?.clicks]);
  const signupsData = useMemo(() => analytics?.signups || { total: 0, pending: 0, in_verification: 0, qualified: 0, failed: 0, churned: 0 }, [analytics?.signups]);
  const earningsData = useMemo(() => analytics?.earnings || { total: 0, recurring: 0, annual: 0, sub_affiliate: 0 }, [analytics?.earnings]);
  
  const conversionRate = useMemo(() => {
    if (!clicksData.total || clicksData.total === 0) return 0;
    return ((signupsData.qualified || 0) / clicksData.total) * 100;
  }, [clicksData.total, signupsData.qualified]);

  const maxClicks = useMemo(() => {
    const daily = clicksData.daily || [];
    return Math.max(...daily.map((d: { clicks: number }) => d.clicks), 1);
  }, [clicksData.daily]);

  const topSources = useMemo(() => {
  return analytics?.top_sources || [];
}, [analytics?.top_sources]);

  const maxSourceClicks = useMemo(() => {
    if (!topSources.length) return 1;
    return Math.max(...topSources.map((s: { clicks: number }) => s.clicks), 1);
  }, [topSources]);

  // Loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  if (!profile) {
    navigate('/app/journal/overview');
    return null;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#C9A646]" />
            Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            Track your performance and conversions
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {DATE_RANGES.map((range) => (
            <DateRangeButton
              key={range.value}
              range={range}
              isActive={dateRange === range.value}
              onClick={() => handleDateRangeChange(range.value as DateRangeValue)}
            />
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={MousePointer}
          label="Total Clicks"
          value={clicksData.total?.toLocaleString() || '0'}
          color="text-purple-400"
          loading={analyticsLoading}
        />
        <StatCard 
          icon={Users}
          label="Conversions"
          value={signupsData.qualified?.toString() || '0'}
          subValue={`${formatPercent(conversionRate)} rate`}
          color="text-blue-400"
          loading={analyticsLoading}
        />
        <StatCard 
          icon={TrendingUp}
          label="New Signups"
          value={signupsData.total?.toString() || '0'}
          subValue={`${signupsData.qualified || 0} qualified`}
          color="text-emerald-400"
          loading={analyticsLoading}
        />
        <StatCard 
          icon={DollarSign}
          label="Earnings"
          value={formatCurrency(earningsData.total || 0)}
          color="text-[#C9A646]"
          highlight
          loading={analyticsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Clicks Chart */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <MousePointer className="h-5 w-5 text-purple-400" />
            Daily Clicks
          </h3>

          {analyticsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
            </div>
          ) : clicksData.daily?.length > 0 ? (
            <div className="h-48 flex items-end gap-1">
              {clicksData.daily.slice(-14).map((day: { date: string; clicks: number }, i: number) => (
                <ClickBar key={i} day={day} maxClicks={maxClicks} />
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No data for this period
            </div>
          )}

          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Top Traffic Sources */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4">Top Traffic Sources</h3>

          {analyticsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : topSources.length > 0 ? (
            <div className="space-y-3">
              {topSources.slice(0, 5).map((source: { source: string; clicks: number }, i: number) => (
                <TrafficSourceBar key={i} source={source} maxClicks={maxSourceClicks} />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">
              No traffic data yet
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div 
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <h3 className="text-white font-medium mb-6">Conversion Funnel</h3>

        {analyticsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            <FunnelStep 
              label="Clicks"
              value={clicksData.total || 0}
              percent={100}
              color="bg-purple-500"
            />
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <FunnelStep 
              label="Signups"
              value={signupsData.total || 0}
              percent={clicksData.total > 0 ? ((signupsData.total || 0) / clicksData.total) * 100 : 0}
              color="bg-blue-500"
            />
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <FunnelStep 
              label="In Verification"
              value={signupsData.in_verification || 0}
              percent={clicksData.total > 0 ? ((signupsData.in_verification || 0) / clicksData.total) * 100 : 0}
              color="bg-yellow-500"
            />
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <FunnelStep 
              label="Qualified"
              value={signupsData.qualified || 0}
              percent={clicksData.total > 0 ? ((signupsData.qualified || 0) / clicksData.total) * 100 : 0}
              color="bg-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Earnings Breakdown & Referral Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Breakdown */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4">Earnings Breakdown</h3>

          {analyticsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EarningsCard 
                icon={Clock}
                label="Recurring Commissions"
                value={formatCurrency(earningsData.recurring || 0)}
                percent={earningsData.total > 0 ? ((earningsData.recurring || 0) / earningsData.total) * 100 : 0}
                color="text-blue-400"
              />
              <EarningsCard 
                icon={Calendar}
                label="Annual Upfront"
                value={formatCurrency(earningsData.annual || 0)}
                percent={earningsData.total > 0 ? ((earningsData.annual || 0) / earningsData.total) * 100 : 0}
                color="text-purple-400"
              />
              <EarningsCard 
                icon={Users}
                label="Sub-Affiliate"
                value={formatCurrency(earningsData.sub_affiliate || 0)}
                percent={earningsData.total > 0 ? ((earningsData.sub_affiliate || 0) / earningsData.total) * 100 : 0}
                color="text-cyan-400"
              />
            </div>
          )}
        </div>

        {/* Referral Status Distribution */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-white font-medium mb-4">Referral Status</h3>

          {analyticsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-20 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatusCard label="Total" value={signupsData.total || 0} color="text-white" />
              <StatusCard label="Pending" value={signupsData.pending || 0} color="text-yellow-400" />
              <StatusCard label="Verifying" value={signupsData.in_verification || 0} color="text-blue-400" />
              <StatusCard label="Qualified" value={signupsData.qualified || 0} color="text-emerald-400" />
              <StatusCard label="Failed" value={signupsData.failed || 0} color="text-red-400" />
              <StatusCard label="Churned" value={signupsData.churned || 0} color="text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}