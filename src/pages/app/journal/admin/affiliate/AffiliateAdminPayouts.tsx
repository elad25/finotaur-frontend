// src/pages/app/journal/admin/affiliate/AffiliateAdminPayouts.tsx
// ============================================
// Affiliate Admin - Payouts Tab
// Manage and process affiliate payouts
// ============================================

import { useState } from 'react';
import { 
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  Wallet,
  Calendar,
  User,
  Loader2,
  X,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  useAffiliatePayouts, 
  useProcessPayout,
  useCancelPayout,
  useGenerateManualPayout,
  useAffiliatesList
} from '@/features/affiliate/hooks/useAffiliateAdmin';
import type { AffiliatePayout, PayoutStatus } from '@/features/affiliate/types/affiliate.types';
import { toast } from 'sonner';

export default function AffiliateAdminPayouts() {
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showManualPayoutModal, setShowManualPayoutModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [manualAffiliate, setManualAffiliate] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const { data: payouts, isLoading, refetch, isRefetching } = useAffiliatePayouts(statusFilter);
  const { data: affiliates } = useAffiliatesList('active');
  const processPayout = useProcessPayout();
  const cancelPayout = useCancelPayout();
  const generateManualPayout = useGenerateManualPayout();

  // Filter by search
  const filteredPayouts = payouts?.filter(payout => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payout.affiliate?.display_name?.toLowerCase().includes(query) ||
      payout.affiliate?.email?.toLowerCase().includes(query) ||
      payout.affiliate?.affiliate_code?.toLowerCase().includes(query) ||
      payout.transaction_id?.toLowerCase().includes(query)
    );
  }) || [];

  // Handle process payout
  const handleProcessPayout = async () => {
    if (!selectedPayout || !transactionId) return;

    await processPayout.mutateAsync({
      payoutId: selectedPayout.id,
      transactionId,
      notes: processNotes || undefined,
    });

    setShowProcessModal(false);
    setSelectedPayout(null);
    setTransactionId('');
    setProcessNotes('');
  };

  // Handle cancel payout
  const handleCancelPayout = async () => {
    if (!selectedPayout || !cancelReason) return;

    await cancelPayout.mutateAsync({
      payoutId: selectedPayout.id,
      reason: cancelReason,
    });

    setShowCancelModal(false);
    setSelectedPayout(null);
    setCancelReason('');
  };

  // Handle manual payout
  const handleManualPayout = async () => {
    if (!manualAffiliate || !manualAmount) return;

    await generateManualPayout.mutateAsync({
      affiliateId: manualAffiliate,
      amount: parseFloat(manualAmount),
      notes: manualNotes || undefined,
    });

    setShowManualPayoutModal(false);
    setManualAffiliate('');
    setManualAmount('');
    setManualNotes('');
  };

  // Get status badge
  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: Clock };
      case 'processing':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Loader2 };
      case 'completed':
        return { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle };
      case 'failed':
        return { bg: 'bg-red-500/10', text: 'text-red-400', icon: XCircle };
      case 'cancelled':
        return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: XCircle };
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Clock };
    }
  };

  // Calculate totals
  const pendingTotal = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.total_amount_usd || 0), 0) || 0;
  const completedThisMonth = payouts?.filter(p => {
    if (p.status !== 'completed') return false;
    const completedDate = new Date(p.completed_at || '');
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (p.total_amount_usd || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-400">${pendingTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#111111] border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Paid This Month</p>
              <p className="text-2xl font-bold text-green-400">${completedThisMonth.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Payouts</p>
              <p className="text-2xl font-bold text-white">{payouts?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'completed', 'cancelled', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${statusFilter === status 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
                }
              `}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && payouts && (
                <span className="ml-2 px-1.5 py-0.5 bg-black/20 rounded text-xs">
                  {payouts.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payouts..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 text-gray-400 hover:text-white bg-[#111111] border border-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Create Manual Payout */}
          <button
            onClick={() => setShowManualPayoutModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Payout
          </button>
        </div>
      </div>

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 ? (
          <div className="text-center py-12 bg-[#111111] border border-gray-800 rounded-xl">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No payouts found</p>
          </div>
        ) : (
          filteredPayouts.map((payout) => {
            const statusInfo = getStatusBadge(payout.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div 
                key={payout.id}
                className="bg-[#111111] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Affiliate Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {payout.affiliate?.display_name || 'Unknown Affiliate'}
                      </h3>
                      <p className="text-gray-400 text-sm">{payout.affiliate?.email}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Period: {new Date(payout.payout_period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Center: Amount Breakdown */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Commissions</p>
                      <p className="text-white font-medium">${(payout.commissions_amount_usd || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-gray-600">+</div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Bonuses</p>
                      <p className="text-white font-medium">${(payout.bonuses_amount_usd || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-gray-600">=</div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Total</p>
                      <p className="text-[#D4AF37] font-bold text-xl">${(payout.total_amount_usd || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                      <StatusIcon className={`w-4 h-4 ${payout.status === 'processing' ? 'animate-spin' : ''}`} />
                      {payout.status}
                    </span>

                    {/* View Details */}
                    <button
                      onClick={() => {
                        setSelectedPayout(payout);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {/* Actions for pending payouts */}
                    {payout.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowProcessModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Send className="w-4 h-4" />
                          Process
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowCancelModal(true);
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Cancel Payout"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Transaction ID for completed */}
                {payout.status === 'completed' && payout.transaction_id && (
                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-gray-500 text-sm">
                      Transaction: <code className="text-gray-300 bg-[#0A0A0A] px-2 py-0.5 rounded">{payout.transaction_id}</code>
                    </span>
                    <span className="text-gray-500 text-sm">
                      Completed: {new Date(payout.completed_at || '').toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Failure reason for failed/cancelled */}
                {(payout.status === 'failed' || payout.status === 'cancelled') && payout.failure_reason && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-red-400/70 text-xs mb-1">Reason:</p>
                    <p className="text-red-400 text-sm">{payout.failure_reason}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Process Payout Modal */}
      {showProcessModal && selectedPayout && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProcessModal(false);
            setSelectedPayout(null);
            setTransactionId('');
            setProcessNotes('');
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Process Payout</h3>
              <p className="text-gray-400 text-sm mt-1">
                Mark payout as completed for {selectedPayout.affiliate?.display_name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount Summary */}
              <div className="bg-[#0A0A0A] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="text-[#D4AF37] font-bold text-xl">
                    ${selectedPayout.total_amount_usd?.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment Email</span>
                  <span className="text-white">
                    {selectedPayout.payment_email || selectedPayout.affiliate?.paypal_email || 'Not set'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transaction ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g., PAYPAL-TXN-123456"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedPayout(null);
                  setTransactionId('');
                  setProcessNotes('');
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={processPayout.isPending || !transactionId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {processPayout.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Paid
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Payout Modal */}
      {showCancelModal && selectedPayout && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCancelModal(false);
            setSelectedPayout(null);
            setCancelReason('');
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Cancel Payout</h3>
              <p className="text-gray-400 text-sm mt-1">
                Cancel payout for {selectedPayout.affiliate?.display_name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm">
                    This will cancel the payout of <strong>${selectedPayout.total_amount_usd?.toFixed(2)}</strong>.
                    The commissions will be returned to pending status.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cancellation Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this payout is being cancelled..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedPayout(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelPayout}
                disabled={cancelPayout.isPending || !cancelReason}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelPayout.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Cancel Payout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payout Modal */}
      {showManualPayoutModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowManualPayoutModal(false);
            setManualAffiliate('');
            setManualAmount('');
            setManualNotes('');
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Create Manual Payout</h3>
              <p className="text-gray-400 text-sm mt-1">
                Generate a manual payout for an affiliate
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Affiliate <span className="text-red-400">*</span>
                </label>
                <select
                  value={manualAffiliate}
                  onChange={(e) => setManualAffiliate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Select an affiliate...</option>
                  {affiliates?.map(aff => (
                    <option key={aff.id} value={aff.id}>
                      {aff.display_name} ({aff.affiliate_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g., Bonus for hitting milestone..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowManualPayoutModal(false);
                  setManualAffiliate('');
                  setManualAmount('');
                  setManualNotes('');
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualPayout}
                disabled={generateManualPayout.isPending || !manualAffiliate || !manualAmount}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors disabled:opacity-50"
              >
                {generateManualPayout.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Payout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPayout && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedPayout(null);
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Payout Details</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPayout(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Affiliate Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedPayout.affiliate?.display_name}</p>
                  <p className="text-gray-400 text-sm">{selectedPayout.affiliate?.email}</p>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-[#0A0A0A] rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Commissions</span>
                  <span className="text-white">${(selectedPayout.commissions_amount_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bonuses</span>
                  <span className="text-white">${(selectedPayout.bonuses_amount_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Adjustments</span>
                  <span className="text-white">${(selectedPayout.adjustments_usd || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-700 pt-3 flex justify-between">
                  <span className="text-gray-300 font-semibold">Total</span>
                  <span className="text-[#D4AF37] font-bold text-lg">${(selectedPayout.total_amount_usd || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Period</p>
                  <p className="text-white">{new Date(selectedPayout.payout_period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Status</p>
                  <p className={getStatusBadge(selectedPayout.status).text}>{selectedPayout.status}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Payment Method</p>
                  <p className="text-white">{selectedPayout.payment_method || 'PayPal'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Payment Email</p>
                  <p className="text-white">{selectedPayout.payment_email || '-'}</p>
                </div>
                {selectedPayout.transaction_id && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Transaction ID</p>
                    <code className="text-green-400 bg-green-500/10 px-2 py-1 rounded">{selectedPayout.transaction_id}</code>
                  </div>
                )}
                {selectedPayout.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-300">{selectedPayout.notes}</p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-800 flex justify-between">
                <span>Created: {new Date(selectedPayout.created_at).toLocaleString()}</span>
                {selectedPayout.completed_at && (
                  <span>Completed: {new Date(selectedPayout.completed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}