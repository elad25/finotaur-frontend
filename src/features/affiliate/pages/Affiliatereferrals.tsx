// src/features/affiliate/pages/Affiliatereferrals.tsx
// 🚀 Optimized with React Query caching, memoization, and useCallback

import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useAffiliateProfile, 
  useAffiliateReferrals 
} from '../hooks/useAffiliateData';
import { 
  Users, Search, Filter, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, AlertTriangle, UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// CONSTANTS
// =====================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { 
    label: 'Pending', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10',
    icon: Clock 
  },
  verification_pending: { 
    label: 'Verifying', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10',
    icon: Clock 
  },
  verification_failed: { 
    label: 'Failed', 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10',
    icon: XCircle 
  },
  qualified: { 
    label: 'Qualified', 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10',
    icon: CheckCircle 
  },
  churned: { 
    label: 'Churned', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/10',
    icon: UserMinus 
  },
  refunded: { 
    label: 'Refunded', 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10',
    icon: AlertTriangle 
  },
};

const ITEMS_PER_PAGE = 20;

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

const maskEmail = (email: string): string => {
  if (!email) return 'Unknown';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return `${local.slice(0, 2)}***@${domain}`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const timeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// =====================================================
// MEMOIZED COMPONENTS
// =====================================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}

const StatCard = memo(function StatCard({ 
  label, 
  value, 
  color,
  active,
  onClick,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 text-left transition-all",
        active && "ring-2 ring-[#C9A646]"
      )}
      style={{
        background: active 
          ? 'linear-gradient(180deg, rgba(201,166,70,0.1) 0%, rgba(20,20,20,0.9) 100%)'
          : 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </button>
  );
});

interface ReferralRowProps {
  referral: {
    id: string;
    status: string;
    signup_date: string;
    user_name?: string;
    user_email?: string;
    subscription_plan?: string | null;
    billing_cycle?: string | null;
    total_payments_usd?: number;
    commission_earned_usd?: number;
  };
}

const ReferralRow = memo(function ReferralRow({ referral }: ReferralRowProps) {
  const statusConfig = STATUS_CONFIG[referral.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="text-white font-medium">
            {referral.user_name || maskEmail(referral.user_email || '')}
          </p>
          {referral.user_name && (
            <p className="text-gray-500 text-sm">
              {maskEmail(referral.user_email || '')}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="text-gray-300">{formatDate(referral.signup_date)}</p>
          <p className="text-gray-500 text-sm">{timeAgo(referral.signup_date)}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          statusConfig.bgColor,
          statusConfig.color
        )}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusConfig.label}
        </span>
      </td>
      <td className="px-6 py-4">
        {referral.subscription_plan ? (
          <div>
            <p className="text-gray-300 capitalize">{referral.subscription_plan}</p>
            <p className="text-gray-500 text-sm capitalize">{referral.billing_cycle || 'monthly'}</p>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-gray-300">
        {formatCurrency(referral.total_payments_usd || 0)}
      </td>
      <td className="px-6 py-4 text-right">
        <span className={cn(
          "font-medium",
          (referral.commission_earned_usd || 0) > 0 ? "text-emerald-400" : "text-gray-500"
        )}>
          {formatCurrency(referral.commission_earned_usd || 0)}
        </span>
      </td>
    </tr>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AffiliateReferrals() {
  const navigate = useNavigate();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // 🚀 Using optimized hooks
  const { data: profile, isLoading: profileLoading } = useAffiliateProfile();
  const { data: referralsData, isLoading: referralsLoading } = useAffiliateReferrals({
    status: statusFilter,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery,
  });

  // Computed values
  const referrals = useMemo(() => referralsData?.data || [], [referralsData?.data]);
  const totalCount = useMemo(() => referralsData?.count || 0, [referralsData?.count]);
  const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount]);

  const statusCounts = useMemo(() => ({
    all: totalCount,
    pending: referrals.filter(r => r.status === 'pending').length,
    verification_pending: referrals.filter(r => r.status === 'verification_pending').length,
    qualified: referrals.filter(r => r.status === 'qualified').length,
    churned: referrals.filter(r => r.status === 'churned').length,
  }), [referrals, totalCount]);

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatCardClick = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);

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
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-[#C9A646]" />
          My Referrals
        </h1>
        <p className="text-gray-400 mt-1">
          Track all your referred users and their status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          label="Total"
          value={profile.total_signups}
          color="text-white"
          active={statusFilter === 'all'}
          onClick={() => handleStatCardClick('all')}
        />
        <StatCard 
          label="Pending"
          value={statusCounts.pending}
          color="text-yellow-400"
          active={statusFilter === 'pending'}
          onClick={() => handleStatCardClick('pending')}
        />
        <StatCard 
          label="Verifying"
          value={statusCounts.verification_pending}
          color="text-blue-400"
          active={statusFilter === 'verification_pending'}
          onClick={() => handleStatCardClick('verification_pending')}
        />
        <StatCard 
          label="Qualified"
          value={profile.total_qualified_referrals}
          color="text-emerald-400"
          active={statusFilter === 'qualified'}
          onClick={() => handleStatCardClick('qualified')}
        />
        <StatCard 
          label="Churned"
          value={statusCounts.churned}
          color="text-gray-400"
          active={statusFilter === 'churned'}
          onClick={() => handleStatCardClick('churned')}
        />
      </div>

      {/* Filters */}
      <div 
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]/50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="pl-10 pr-8 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A646]/50 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Referral List</h3>
        </div>

        {referralsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No referrals found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Share your referral link to start earning!'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/5">
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Signup Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Plan</th>
                    <th className="px-6 py-4 font-medium">Payments</th>
                    <th className="px-6 py-4 font-medium text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <ReferralRow key={referral.id} referral={referral} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}