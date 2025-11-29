// src/features/affiliate/pages/Affiliateearnings.tsx
// 🚀 Optimized with memoization, useCallback, and performance improvements

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, TrendingUp, Wallet, CreditCard, 
  Clock, CheckCircle, ChevronLeft, ChevronRight,
  Filter, Calendar, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES
// =====================================================

interface Commission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  commission_type: 'monthly_recurring' | 'annual_upfront' | 'sub_affiliate' | 'bonus';
  amount_usd: number;
  percentage_rate: number;
  source_payment_amount_usd: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'expired';
  period_start: string;
  period_end: string;
  created_at: string;
  referral_email?: string;
}

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  availableForPayout: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

// =====================================================
// CONSTANTS
// =====================================================

const COMMISSION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  monthly_recurring: { label: 'Monthly', color: 'text-blue-400' },
  annual_upfront: { label: 'Annual', color: 'text-purple-400' },
  sub_affiliate: { label: 'Sub-Affiliate', color: 'text-cyan-400' },
  bonus: { label: 'Bonus', color: 'text-[#C9A646]' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  paid: { label: 'Paid', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CreditCard },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: Clock },
  expired: { label: 'Expired', color: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: Clock },
};

const ITEMS_PER_PAGE = 15;

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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// =====================================================
// MEMOIZED MONTH OPTIONS
// =====================================================

const getMonthOptions = (): { value: string; label: string }[] => {
  const options = [{ value: 'all', label: 'All Time' }];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  
  return options;
};

// =====================================================
// MEMOIZED COMPONENTS
// =====================================================

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  color: string;
}

const SummaryCard = memo(function SummaryCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color 
}: SummaryCardProps) {
  return (
    <div 
      className="rounded-xl p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className={cn("text-xl font-bold", color)}>{value}</p>
          <p className="text-gray-500 text-xs mt-1">{subtext}</p>
        </div>
        <div className={cn("p-2 rounded-lg bg-black/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});

interface CommissionRowProps {
  commission: Commission;
}

const CommissionRow = memo(function CommissionRow({ commission }: CommissionRowProps) {
  const typeConfig = COMMISSION_TYPE_CONFIG[commission.commission_type] || { label: commission.commission_type, color: 'text-gray-400' };
  const statusConfig = STATUS_CONFIG[commission.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-6 py-4 text-gray-400">
        {formatDate(commission.created_at)}
      </td>
      <td className="px-6 py-4 text-gray-300">
        {commission.referral_email 
          ? maskEmail(commission.referral_email)
          : <span className="text-gray-500">-</span>
        }
      </td>
      <td className="px-6 py-4">
        <span className={cn("text-sm font-medium", typeConfig.color)}>
          {typeConfig.label}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-400">
        {commission.percentage_rate}%
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
      <td className="px-6 py-4 text-right">
        <span className={cn(
          "font-medium",
          commission.status === 'cancelled' || commission.status === 'expired'
            ? "text-gray-500 line-through"
            : "text-emerald-400"
        )}>
          {formatCurrency(commission.amount_usd)}
        </span>
      </td>
    </tr>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AffiliateEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    availableForPayout: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
  });

  // Filters
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Computed values
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount]);

  const growthPercent = useMemo(() => {
    if (!summary.lastMonthEarnings || summary.lastMonthEarnings <= 0) {
      return summary.thisMonthEarnings > 0 ? 100 : 0;
    }
    return ((summary.thisMonthEarnings - summary.lastMonthEarnings) / summary.lastMonthEarnings * 100);
  }, [summary.thisMonthEarnings, summary.lastMonthEarnings]);

  // Fetch affiliate ID
  useEffect(() => {
    let isMounted = true;

    async function fetchAffiliateId() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('affiliates')
        .select('id, total_earnings_usd, total_pending_usd, total_paid_usd')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!isMounted) return;

      if (error || !data) {
        navigate('/app/journal/overview');
        return;
      }

      setAffiliateId(data.id);
      
      setSummary(prev => ({
        ...prev,
        totalEarnings: Number(data.total_earnings_usd) || 0,
        pendingEarnings: Number(data.total_pending_usd) || 0,
        paidEarnings: Number(data.total_paid_usd) || 0,
        availableForPayout: (Number(data.total_earnings_usd) || 0) - (Number(data.total_paid_usd) || 0) - (Number(data.total_pending_usd) || 0),
      }));
    }

    fetchAffiliateId();
    return () => { isMounted = false; };
  }, [user?.id, navigate]);

  // Fetch commissions
  useEffect(() => {
    let isMounted = true;

    async function fetchCommissions() {
      if (!affiliateId) return;

      setLoading(true);
      try {
        let query = supabase
          .from('affiliate_commissions')
          .select(`
            id,
            affiliate_id,
            referral_id,
            commission_type,
            amount_usd,
            percentage_rate,
            source_payment_amount_usd,
            status,
            period_start,
            period_end,
            created_at
          `, { count: 'exact' })
          .eq('affiliate_id', affiliateId);

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (monthFilter !== 'all') {
          const [year, month] = monthFilter.split('-');
          const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(month), 0);
          query = query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        const { data, error, count } = await query;

        if (!isMounted) return;

        if (error) {
          console.error('Error fetching commissions:', error);
          return;
        }

        if (data) {
          // Get referral emails in parallel
          const commissionsWithEmails = await Promise.all(
            data.map(async (comm) => {
              if (!comm.referral_id) return comm;
              
              const { data: referral } = await supabase
                .from('affiliate_referrals')
                .select('user_email')
                .eq('id', comm.referral_id)
                .single();
              
              return {
                ...comm,
                referral_email: referral?.user_email,
              };
            })
          );

          if (!isMounted) return;
          setCommissions(commissionsWithEmails as Commission[]);
        }

        setTotalCount(count || 0);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCommissions();
    return () => { isMounted = false; };
  }, [affiliateId, monthFilter, statusFilter, currentPage]);

  // Fetch monthly earnings comparison
  useEffect(() => {
    let isMounted = true;

    async function fetchMonthlyEarnings() {
      if (!affiliateId) return;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      try {
        const [thisMonthData, lastMonthData] = await Promise.all([
          supabase
            .from('affiliate_commissions')
            .select('amount_usd')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', thisMonthStart.toISOString())
            .in('status', ['confirmed', 'paid']),
          supabase
            .from('affiliate_commissions')
            .select('amount_usd')
            .eq('affiliate_id', affiliateId)
            .gte('created_at', lastMonthStart.toISOString())
            .lte('created_at', lastMonthEnd.toISOString())
            .in('status', ['confirmed', 'paid']),
        ]);

        if (!isMounted) return;

        const thisMonthTotal = thisMonthData.data?.reduce((sum, c) => sum + Number(c.amount_usd), 0) || 0;
        const lastMonthTotal = lastMonthData.data?.reduce((sum, c) => sum + Number(c.amount_usd), 0) || 0;

        setSummary(prev => ({
          ...prev,
          thisMonthEarnings: thisMonthTotal,
          lastMonthEarnings: lastMonthTotal,
        }));
      } catch (error) {
        console.error('Error fetching monthly earnings:', error);
      }
    }

    fetchMonthlyEarnings();
    return () => { isMounted = false; };
  }, [affiliateId]);

  // Handlers
  const handleMonthFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonthFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);

  // Loading state
  if (!affiliateId && loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[#C9A646]" />
          Earnings
        </h1>
        <p className="text-gray-400 mt-1">
          Track your commissions and earnings history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          icon={DollarSign}
          label="Total Earnings"
          value={formatCurrency(summary.totalEarnings)}
          subtext="All time"
          color="text-[#C9A646]"
        />
        <SummaryCard 
          icon={Clock}
          label="Pending"
          value={formatCurrency(summary.pendingEarnings)}
          subtext="Awaiting confirmation"
          color="text-yellow-400"
        />
        <SummaryCard 
          icon={CheckCircle}
          label="Paid Out"
          value={formatCurrency(summary.paidEarnings)}
          subtext="Total received"
          color="text-emerald-400"
        />
        <SummaryCard 
          icon={Wallet}
          label="Available"
          value={formatCurrency(summary.availableForPayout)}
          subtext="Ready for payout"
          color="text-blue-400"
        />
      </div>

      {/* Monthly Comparison */}
      <div 
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#C9A646]" />
          Monthly Performance
        </h3>

        <div className="flex items-center gap-8">
          <div>
            <p className="text-gray-400 text-sm">This Month</p>
            <p className="text-2xl font-bold text-[#C9A646]">
              {formatCurrency(summary.thisMonthEarnings)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Last Month</p>
            <p className="text-2xl font-bold text-gray-400">
              {formatCurrency(summary.lastMonthEarnings)}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium",
            growthPercent >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            <ArrowUpRight className={cn("h-4 w-4", growthPercent < 0 && "rotate-180")} />
            {Math.abs(growthPercent).toFixed(1)}%
          </div>
        </div>
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
          {/* Month Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <select
              value={monthFilter}
              onChange={handleMonthFilterChange}
              className="pl-10 pr-8 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A646]/50 appearance-none cursor-pointer min-w-[180px]"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

      {/* Commissions Table */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Commission History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No commissions found</p>
            <p className="text-gray-500 text-sm mt-1">
              {monthFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Commissions will appear here as your referrals generate payments'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/5">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Rate</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <CommissionRow key={commission.id} commission={commission} />
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