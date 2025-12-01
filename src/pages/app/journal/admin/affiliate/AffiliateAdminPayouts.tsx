import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, Clock, CheckCircle, XCircle, RefreshCw,
  ChevronLeft, ChevronRight, AlertCircle, Send, Search,
  DollarSign, Mail, User, Users, ExternalLink, Play, Filter,
  Loader2, CheckCheck, Ban, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface Commission {
  id: string;
  commission_amount_usd: number;
  commission_rate: number;
  commission_type?: 'direct' | 'layer2'; // direct = referred user, layer2 = sub-affiliate
  status: string;
  created_at: string;
  referred_user: {
    email: string;
    full_name: string;
  } | null;
  subscription: {
    plan_name: string;
    amount_usd: number;
  } | null;
  // For Layer 2 commissions
  source_affiliate?: {
    referral_code: string;
    user: {
      full_name: string;
    };
  } | null;
}

interface Payout {
  id: string;
  affiliate_id: string;
  payout_period: string;
  commissions_amount_usd: number;
  bonuses_amount_usd: number;
  adjustments_usd: number;
  total_amount_usd: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  payment_email: string;
  paypal_batch_id: string | null;
  paypal_transaction_id: string | null;
  paypal_transaction_status: string | null;
  paypal_fee_usd: number | null;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  created_at: string;
  affiliate: {
    id: string;
    user_id: string;
    referral_code: string;
    paypal_email: string;
    tier: string;
    commission_rate: number;
    user: {
      email: string;
      full_name: string;
    };
  };
  // Commissions linked to this payout
  commissions?: Commission[];
}

interface PayoutStats {
  pending: number;
  processing: number;
  totalPendingAmount: number;
  totalProcessingAmount: number;
  completedThisMonth: number;
  completedThisMonthAmount: number;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: RefreshCw },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: Ban },
};

const PAYPAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  SUCCESS: { label: 'Success', color: 'text-emerald-400' },
  FAILED: { label: 'Failed', color: 'text-red-400' },
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  UNCLAIMED: { label: 'Unclaimed', color: 'text-orange-400' },
  RETURNED: { label: 'Returned', color: 'text-red-400' },
  ONHOLD: { label: 'On Hold', color: 'text-yellow-400' },
  BLOCKED: { label: 'Blocked', color: 'text-red-400' },
  REFUNDED: { label: 'Refunded', color: 'text-gray-400' },
  REVERSED: { label: 'Reversed', color: 'text-red-400' },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; rate: number; layer2Eligible: boolean }> = {
  TIER_1: { label: 'Tier 1', color: 'text-gray-400', bgColor: 'bg-gray-500/10', rate: 10, layer2Eligible: false },
  TIER_2: { label: 'Tier 2', color: 'text-[#C9A646]', bgColor: 'bg-[#C9A646]/10', rate: 15, layer2Eligible: true },
  TIER_3: { label: 'Tier 3', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', rate: 20, layer2Eligible: true },
};

// Layer 2 commission rate (5% of sub-affiliate earnings)
const LAYER_2_RATE = 5;

// ============================================
// HELPERS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AffiliateAdminPayouts() {
  // State
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats>({
    pending: 0,
    processing: 0,
    totalPendingAmount: 0,
    totalProcessingAmount: 0,
    completedThisMonth: 0,
    completedThisMonthAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Detail Modal
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchStats = async () => {
    try {
      // Pending payouts
      const { data: pendingData } = await supabase
        .from('affiliate_payouts')
        .select('total_amount_usd')
        .eq('status', 'pending');

      // Processing payouts
      const { data: processingData } = await supabase
        .from('affiliate_payouts')
        .select('total_amount_usd')
        .eq('status', 'processing');

      // Completed this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: completedData } = await supabase
        .from('affiliate_payouts')
        .select('total_amount_usd')
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString());

      setStats({
        pending: pendingData?.length || 0,
        processing: processingData?.length || 0,
        totalPendingAmount: pendingData?.reduce((sum, p) => sum + Number(p.total_amount_usd), 0) || 0,
        totalProcessingAmount: processingData?.reduce((sum, p) => sum + Number(p.total_amount_usd), 0) || 0,
        completedThisMonth: completedData?.length || 0,
        completedThisMonthAmount: completedData?.reduce((sum, p) => sum + Number(p.total_amount_usd), 0) || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('affiliate_payouts')
        .select(`
          *,
          affiliate:affiliates!inner(
            id,
            user_id,
            referral_code,
            paypal_email,
            tier,
            commission_rate,
            user:users!inner(email, full_name)
          )
        `, { count: 'exact' });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`
          payment_email.ilike.%${searchQuery}%,
          paypal_transaction_id.ilike.%${searchQuery}%,
          affiliate.referral_code.ilike.%${searchQuery}%
        `);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching payouts:', error);
        return;
      }

      setPayouts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [currentPage, statusFilter, searchQuery]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleProcessPayout = async (payoutId: string) => {
    setProcessingId(payoutId);

    try {
      const { data, error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: { 
          action: 'process',
          payoutId
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Failed to process payout');
        return;
      }

      toast.success('Payout submitted to PayPal!');
      
      // Update local state
      setPayouts(prev => prev.map(p => 
        p.id === payoutId 
          ? { ...p, status: 'processing', paypal_batch_id: data.batchId }
          : p
      ));

      // Refresh stats
      fetchStats();

    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckStatus = async (payoutId: string) => {
    setCheckingStatusId(payoutId);

    try {
      const { data, error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: { 
          action: 'check_status',
          payoutId
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Failed to check status');
        return;
      }

      const statusMessage = data.status === 'completed' 
        ? 'Payout completed successfully!'
        : data.status === 'failed'
        ? `Payout failed: ${data.paypalStatus}`
        : `Status: ${data.paypalStatus}`;

      toast.info(statusMessage);
      
      // Refresh data
      fetchPayouts();
      fetchStats();

    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('An error occurred');
    } finally {
      setCheckingStatusId(null);
    }
  };

  const handleBatchProcess = async () => {
    if (!confirm('Process all pending payouts? This will send payments via PayPal.')) {
      return;
    }

    setBatchProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: { action: 'batch_process' }
      });

      if (error) {
        toast.error('Batch processing failed');
        return;
      }

      toast.success(data.message);
      
      // Refresh data
      fetchPayouts();
      fetchStats();

    } catch (error) {
      console.error('Error in batch process:', error);
      toast.error('An error occurred');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleCancelPayout = async (payoutId: string) => {
    if (!confirm('Cancel this payout request? The commissions will be released back to available balance.')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: { 
          action: 'cancel',
          payoutId
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Failed to cancel payout');
        return;
      }

      toast.success('Payout cancelled and commissions released');
      fetchPayouts();
      fetchStats();

    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#C9A646]" />
            Affiliate Payouts Management
          </h1>
          <p className="text-gray-400 mt-1">
            Process and manage affiliate payout requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchPayouts(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {stats.pending > 0 && (
            <button
              onClick={handleBatchProcess}
              disabled={batchProcessing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                batchProcessing
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-[#C9A646] text-black hover:bg-[#D4B85A]"
              )}
            >
              {batchProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Process All Pending ({stats.pending})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Pending Payouts"
          count={stats.pending}
          amount={stats.totalPendingAmount}
          color="text-yellow-400"
          icon={Clock}
        />
        <StatCard 
          label="Processing"
          count={stats.processing}
          amount={stats.totalProcessingAmount}
          color="text-blue-400"
          icon={RefreshCw}
        />
        <StatCard 
          label="Completed (This Month)"
          count={stats.completedThisMonth}
          amount={stats.completedThisMonthAmount}
          color="text-emerald-400"
          icon={CheckCircle}
        />
        <StatCard 
          label="Total Pending + Processing"
          count={stats.pending + stats.processing}
          amount={stats.totalPendingAmount + stats.totalProcessingAmount}
          color="text-[#C9A646]"
          icon={Wallet}
          highlight
        />
      </div>

      {/* Filters */}
      <div 
        className="rounded-xl p-4 flex flex-col sm:flex-row gap-4"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by email, transaction ID, or referral code..."
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A646]/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No payouts found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/5">
                    <th className="px-4 py-4 font-medium">Date</th>
                    <th className="px-4 py-4 font-medium">Affiliate</th>
                    <th className="px-4 py-4 font-medium">PayPal Email</th>
                    <th className="px-4 py-4 font-medium text-right">Amount</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 font-medium">PayPal Status</th>
                    <th className="px-4 py-4 font-medium">Transaction ID</th>
                    <th className="px-4 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status];
                    const StatusIcon = statusConfig.icon;
                    const paypalStatus = payout.paypal_transaction_status 
                      ? PAYPAL_STATUS_MAP[payout.paypal_transaction_status] 
                      : null;
                    const isProcessing = processingId === payout.id;
                    const isCheckingStatus = checkingStatusId === payout.id;

                    return (
                      <tr 
                        key={payout.id} 
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-4 text-gray-400 text-sm">
                          {formatDate(payout.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-white font-medium text-sm">
                              {payout.affiliate?.user?.full_name || 'Unknown'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {payout.affiliate?.referral_code}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#0077B5]" />
                            <span className="text-gray-300 text-sm">{payout.payment_email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-white font-bold">
                            {formatCurrency(payout.total_amount_usd)}
                          </span>
                          {payout.paypal_fee_usd && payout.paypal_fee_usd > 0 && (
                            <span className="text-gray-500 text-xs block">
                              Fee: {formatCurrency(payout.paypal_fee_usd)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {paypalStatus ? (
                            <span className={cn("text-sm font-medium", paypalStatus.color)}>
                              {paypalStatus.label}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {payout.paypal_transaction_id ? (
                            <span className="text-gray-300 font-mono text-xs">
                              {payout.paypal_transaction_id.slice(0, 12)}...
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedPayout(payout)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Process (only for pending) */}
                            {payout.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleProcessPayout(payout.id)}
                                  disabled={isProcessing}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    isProcessing
                                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                  )}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                  Process
                                </button>
                                <button
                                  onClick={() => handleCancelPayout(payout.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Cancel
                                </button>
                              </>
                            )}

                            {/* Check Status (only for processing) */}
                            {payout.status === 'processing' && payout.paypal_batch_id && (
                              <button
                                onClick={() => handleCheckStatus(payout.id)}
                                disabled={isCheckingStatus}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  isCheckingStatus
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                )}
                              >
                                {isCheckingStatus ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Check Status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

      {/* Detail Modal */}
      {selectedPayout && (
        <PayoutDetailModal 
          payout={selectedPayout} 
          onClose={() => setSelectedPayout(null)}
          onProcess={handleProcessPayout}
          onCancel={handleCancelPayout}
          onCheckStatus={handleCheckStatus}
          isProcessing={processingId === selectedPayout.id}
          isCheckingStatus={checkingStatusId === selectedPayout.id}
        />
      )}
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({ 
  label, 
  count,
  amount,
  color,
  icon: Icon,
  highlight = false,
}: { 
  label: string; 
  count: number;
  amount: number;
  color: string;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <div 
      className={cn("rounded-xl p-4", highlight && "ring-1 ring-[#C9A646]/30")}
      style={{
        background: highlight 
          ? 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.05) 100%)'
          : 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className={cn("text-2xl font-bold", color)}>{count}</p>
          <p className="text-gray-400 text-sm mt-1">
            {formatCurrency(amount)}
          </p>
        </div>
        <div className={cn("p-2 rounded-lg bg-black/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAYOUT DETAIL MODAL
// ============================================

function PayoutDetailModal({ 
  payout, 
  onClose,
  onProcess,
  onCancel,
  onCheckStatus,
  isProcessing,
  isCheckingStatus,
}: { 
  payout: Payout; 
  onClose: () => void;
  onProcess?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCheckStatus?: (id: string) => void;
  isProcessing?: boolean;
  isCheckingStatus?: boolean;
}) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(true);

  const statusConfig = STATUS_CONFIG[payout.status];
  const StatusIcon = statusConfig.icon;
  const tierConfig = TIER_CONFIG[payout.affiliate?.tier || 'STARTER'] || TIER_CONFIG.STARTER;

  // Fetch commissions linked to this payout
  useEffect(() => {
    async function fetchCommissions() {
      setLoadingCommissions(true);
      try {
        const { data, error } = await supabase
          .from('affiliate_commissions')
          .select(`
            id,
            commission_amount_usd,
            commission_rate,
            commission_type,
            status,
            created_at,
            referred_user:users!affiliate_commissions_referred_user_id_fkey(email, full_name),
            subscription:subscriptions(plan_name, amount_usd),
            source_affiliate:affiliates!affiliate_commissions_source_affiliate_id_fkey(
              referral_code,
              user:users(full_name)
            )
          `)
          .eq('payout_id', payout.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Transform the data to match Commission interface
          const transformedData: Commission[] = data.map((item: any) => ({
            id: item.id,
            commission_amount_usd: item.commission_amount_usd,
            commission_rate: item.commission_rate,
            commission_type: item.commission_type || 'direct',
            status: item.status,
            created_at: item.created_at,
            // Supabase returns single object for !inner join, array for regular join
            referred_user: Array.isArray(item.referred_user) 
              ? item.referred_user[0] || null 
              : item.referred_user,
            subscription: Array.isArray(item.subscription) 
              ? item.subscription[0] || null 
              : item.subscription,
            source_affiliate: Array.isArray(item.source_affiliate) 
              ? item.source_affiliate[0] || null 
              : item.source_affiliate,
          }));
          setCommissions(transformedData);
        }
      } catch (error) {
        console.error('Error fetching commissions:', error);
      } finally {
        setLoadingCommissions(false);
      }
    }

    fetchCommissions();
  }, [payout.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.98) 0%, rgba(20,20,20,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-inherit z-10">
          <h3 className="text-xl font-bold text-white">Payout Details</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header with Status and Amount */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/30 rounded-xl">
            <div className="flex items-center gap-4 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                statusConfig.bgColor,
                statusConfig.color
              )}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                tierConfig.bgColor,
                tierConfig.color
              )}>
                {tierConfig.label} ({tierConfig.rate}% commission)
              </span>
              {tierConfig.layer2Eligible && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-500/10 text-purple-400">
                  <Users className="h-3.5 w-3.5" />
                  Layer 2 Eligible (+{LAYER_2_RATE}%)
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Total Payout</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(payout.total_amount_usd)}
              </p>
            </div>
          </div>

          {/* Affiliate Info */}
          <div className="p-4 bg-black/30 rounded-lg">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#C9A646]" />
              Affiliate Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="text-white font-medium">{payout.affiliate?.user?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-500">Referral Code</span>
                <p className="text-[#C9A646] font-mono">{payout.affiliate?.referral_code}</p>
              </div>
              <div>
                <span className="text-gray-500">User Email</span>
                <p className="text-white">{payout.affiliate?.user?.email}</p>
              </div>
              <div>
                <span className="text-gray-500">PayPal Email</span>
                <p className="text-white">{payout.payment_email}</p>
              </div>
            </div>
          </div>

          {/* 📋 Referred Users / Commissions Table */}
          <div className="p-4 bg-black/30 rounded-lg">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Referred Users ({commissions.length} users)
            </h4>
            
            {loadingCommissions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#C9A646]" />
              </div>
            ) : commissions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No commissions linked to this payout</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/5">
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">User / Source</th>
                      <th className="pb-2 font-medium">Plan</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium text-right">Sale</th>
                      <th className="pb-2 font-medium text-right">Rate</th>
                      <th className="pb-2 font-medium text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => {
                      const isLayer2 = commission.commission_type === 'layer2';
                      return (
                        <tr key={commission.id} className="border-b border-white/5">
                          <td className="py-2">
                            {isLayer2 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">
                                <Users className="h-3 w-3" />
                                Layer 2
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                                <User className="h-3 w-3" />
                                Direct
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            {isLayer2 ? (
                              <div>
                                <p className="text-purple-400">From: {commission.source_affiliate?.user?.full_name || 'Sub-Affiliate'}</p>
                                <p className="text-gray-500 text-xs">{commission.source_affiliate?.referral_code}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-white">{commission.referred_user?.full_name || 'Unknown'}</p>
                                <p className="text-gray-500 text-xs">{commission.referred_user?.email}</p>
                              </div>
                            )}
                          </td>
                          <td className="py-2">
                            <span className="px-2 py-0.5 bg-[#C9A646]/10 text-[#C9A646] rounded text-xs">
                              {commission.subscription?.plan_name || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2 text-gray-400">
                            {new Date(commission.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-2 text-right text-gray-300">
                            {commission.subscription?.amount_usd 
                              ? formatCurrency(commission.subscription.amount_usd)
                              : '-'
                            }
                          </td>
                          <td className="py-2 text-right text-gray-400">
                            {commission.commission_rate}%
                          </td>
                          <td className="py-2 text-right font-medium">
                            <span className={isLayer2 ? 'text-purple-400' : 'text-emerald-400'}>
                              {formatCurrency(commission.commission_amount_usd)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {commissions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                {(() => {
                  const directCommissions = commissions.filter(c => c.commission_type !== 'layer2');
                  const layer2Commissions = commissions.filter(c => c.commission_type === 'layer2');
                  const directTotal = directCommissions.reduce((sum, c) => sum + Number(c.commission_amount_usd), 0);
                  const layer2Total = layer2Commissions.reduce((sum, c) => sum + Number(c.commission_amount_usd), 0);
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          Direct Referrals ({tierConfig.rate}%) - {directCommissions.length} users
                        </span>
                        <span className="text-emerald-400">{formatCurrency(directTotal)}</span>
                      </div>
                      {layer2Commissions.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">
                            Layer 2 ({LAYER_2_RATE}%) - {layer2Commissions.length} sub-affiliates
                          </span>
                          <span className="text-purple-400">+{formatCurrency(layer2Total)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
                        <span className="text-white">Total</span>
                        <span className="text-[#C9A646]">{formatCurrency(payout.total_amount_usd)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* PayPal Info */}
          {(payout.paypal_batch_id || payout.paypal_transaction_id) && (
            <div className="p-4 bg-[#0077B5]/10 border border-[#0077B5]/30 rounded-lg space-y-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <svg className="h-5 w-5 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                </svg>
                PayPal Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {payout.paypal_batch_id && (
                  <div>
                    <span className="text-gray-500">Batch ID</span>
                    <p className="text-white font-mono text-xs">{payout.paypal_batch_id}</p>
                  </div>
                )}
                {payout.paypal_transaction_id && (
                  <div>
                    <span className="text-gray-500">Transaction ID</span>
                    <p className="text-white font-mono text-xs">{payout.paypal_transaction_id}</p>
                  </div>
                )}
                {payout.paypal_transaction_status && (
                  <div>
                    <span className="text-gray-500">PayPal Status</span>
                    <p className={PAYPAL_STATUS_MAP[payout.paypal_transaction_status]?.color || 'text-white'}>
                      {payout.paypal_transaction_status}
                    </p>
                  </div>
                )}
                {payout.paypal_fee_usd && payout.paypal_fee_usd > 0 && (
                  <div>
                    <span className="text-gray-500">PayPal Fee</span>
                    <p className="text-white">{formatCurrency(payout.paypal_fee_usd)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="p-4 bg-black/30 rounded-lg space-y-3">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              Timeline
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Requested</span>
                <p className="text-white">{formatDate(payout.created_at)}</p>
              </div>
              {payout.processed_at && (
                <div>
                  <span className="text-gray-500">Processed</span>
                  <p className="text-white">{formatDate(payout.processed_at)}</p>
                </div>
              )}
              {payout.completed_at && (
                <div>
                  <span className="text-gray-500">Completed</span>
                  <p className="text-emerald-400">{formatDate(payout.completed_at)}</p>
                </div>
              )}
              {payout.failed_at && (
                <div>
                  <span className="text-gray-500">Failed</span>
                  <p className="text-red-400">{formatDate(payout.failed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Failure Reason */}
          {payout.failure_reason && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="text-red-400 font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                Failure Reason
              </h4>
              <p className="text-white text-sm">{payout.failure_reason}</p>
            </div>
          )}

          {/* Notes */}
          {(payout.notes || payout.admin_notes) && (
            <div className="p-4 bg-black/30 rounded-lg space-y-3">
              <h4 className="text-white font-medium">Notes</h4>
              {payout.notes && (
                <div>
                  <span className="text-gray-500 text-xs">Affiliate Notes</span>
                  <p className="text-white text-sm">{payout.notes}</p>
                </div>
              )}
              {payout.admin_notes && (
                <div>
                  <span className="text-gray-500 text-xs">Admin Notes</span>
                  <p className="text-white text-sm">{payout.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-white/5 bg-inherit">
          <div className="flex flex-col sm:flex-row gap-3">
            {payout.status === 'pending' && onProcess && onCancel && (
              <>
                <button
                  onClick={() => onCancel(payout.id)}
                  className="flex-1 px-4 py-3 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Payout
                </button>
                <button
                  onClick={() => onProcess(payout.id)}
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                    isProcessing
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Approve & Send Payment
                    </>
                  )}
                </button>
              </>
            )}
            {payout.status === 'processing' && onCheckStatus && (
              <button
                onClick={() => onCheckStatus(payout.id)}
                disabled={isCheckingStatus}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  isCheckingStatus
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                )}
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Check PayPal Status
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}