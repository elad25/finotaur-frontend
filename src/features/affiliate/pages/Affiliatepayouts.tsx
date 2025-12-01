import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, AlertCircle, Send,
  DollarSign, Mail, Edit2, Save, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

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
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  created_at: string;
}

interface AffiliateBalance {
  totalEarnings: number;
  totalPaid: number;
  pendingPayouts: number;
  availableBalance: number;
  paypalEmail: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: Clock },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: XCircle },
};

const MIN_PAYOUT_AMOUNT = 100;

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
  });
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AffiliatePayouts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState<AffiliateBalance>({
    totalEarnings: 0,
    totalPaid: 0,
    pendingPayouts: 0,
    availableBalance: 0,
    paypalEmail: null,
  });
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestError, setRequestError] = useState('');

  // PayPal Email editing
  const [isEditingPaypal, setIsEditingPaypal] = useState(false);
  const [newPaypalEmail, setNewPaypalEmail] = useState('');
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [paypalError, setPaypalError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    async function fetchAffiliateData() {
      if (!user?.id) return;

      try {
        // Get affiliate record
        const { data: affiliateData, error } = await supabase
          .from('affiliates')
          .select('id, total_earnings_usd, total_paid_usd, total_pending_usd, paypal_email')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error || !affiliateData) {
          navigate('/app/journal/overview');
          return;
        }

        setAffiliateId(affiliateData.id);
        setNewPaypalEmail(affiliateData.paypal_email || '');

        // Calculate available balance from confirmed commissions
        const { data: confirmedCommissions } = await supabase
          .from('affiliate_commissions')
          .select('commission_amount_usd')
          .eq('affiliate_id', affiliateData.id)
          .eq('status', 'confirmed')
          .is('payout_id', null);

        const availableFromCommissions = confirmedCommissions?.reduce(
          (sum, c) => sum + Number(c.commission_amount_usd), 0
        ) || 0;

        // Get pending payouts total
        const { data: pendingPayoutsData } = await supabase
          .from('affiliate_payouts')
          .select('total_amount_usd')
          .eq('affiliate_id', affiliateData.id)
          .in('status', ['pending', 'processing']);

        const pendingPayoutsTotal = pendingPayoutsData?.reduce(
          (sum, p) => sum + Number(p.total_amount_usd), 0
        ) || 0;

        setBalance({
          totalEarnings: Number(affiliateData.total_earnings_usd) || 0,
          totalPaid: Number(affiliateData.total_paid_usd) || 0,
          pendingPayouts: pendingPayoutsTotal,
          availableBalance: availableFromCommissions,
          paypalEmail: affiliateData.paypal_email,
        });

      } catch (error) {
        console.error('Error fetching affiliate:', error);
      }
    }

    fetchAffiliateData();
  }, [user?.id, navigate]);

  // Fetch payouts
  useEffect(() => {
    async function fetchPayouts() {
      if (!affiliateId) return;

      setLoading(true);
      try {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
          .from('affiliate_payouts')
          .select('*', { count: 'exact' })
          .eq('affiliate_id', affiliateId)
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
    }

    fetchPayouts();
  }, [affiliateId, currentPage]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSavePaypalEmail = async () => {
    if (!affiliateId) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newPaypalEmail || !emailRegex.test(newPaypalEmail)) {
      setPaypalError('Please enter a valid email address');
      return;
    }

    setSavingPaypal(true);
    setPaypalError('');

    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ 
          paypal_email: newPaypalEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId);

      if (error) {
        setPaypalError('Failed to save. Please try again.');
        console.error('Error saving PayPal email:', error);
        return;
      }

      setBalance(prev => ({ ...prev, paypalEmail: newPaypalEmail }));
      setIsEditingPaypal(false);
      toast.success('PayPal email saved successfully!');
    } catch (error) {
      setPaypalError('An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setSavingPaypal(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!affiliateId) return;

    const amount = parseFloat(requestAmount);
    
    // Validation
    if (isNaN(amount) || amount < MIN_PAYOUT_AMOUNT) {
      setRequestError(`Minimum payout amount is ${formatCurrency(MIN_PAYOUT_AMOUNT)}`);
      return;
    }

    if (amount > balance.availableBalance) {
      setRequestError(`Amount exceeds available balance (${formatCurrency(balance.availableBalance)})`);
      return;
    }

    if (!balance.paypalEmail) {
      setRequestError('Please set your PayPal email first');
      return;
    }

    setRequesting(true);
    setRequestError('');

    try {
      // Call Edge Function to request payout
      const { data, error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: { 
          action: 'request',
          affiliateId,
          amount
        }
      });

      if (error || !data?.success) {
        setRequestError(data?.error || 'Failed to request payout. Please try again.');
        setRequesting(false);
        return;
      }

      // Success
      toast.success('Payout request submitted! You will receive payment within 3-5 business days.');
      setShowRequestModal(false);
      setRequestAmount('');
      
      // Update balance
      setBalance(prev => ({
        ...prev,
        pendingPayouts: prev.pendingPayouts + amount,
        availableBalance: prev.availableBalance - amount,
      }));

      // Refresh payouts list
      setCurrentPage(1);
      const { data: newPayouts } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(itemsPerPage);

      if (newPayouts) {
        setPayouts(newPayouts);
        setTotalCount(prev => prev + 1);
      }

    } catch (error) {
      setRequestError('An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setRequesting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const canRequestPayout = balance.availableBalance >= MIN_PAYOUT_AMOUNT && balance.paypalEmail;

  if (loading && !affiliateId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#C9A646]" />
            Payouts
          </h1>
          <p className="text-gray-400 mt-1">
            Request withdrawals and view payout history
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          disabled={!canRequestPayout}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
            canRequestPayout
              ? "bg-[#C9A646] text-black hover:bg-[#D4B85A]"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          <Send className="h-4 w-4" />
          Request Payout
        </button>
      </div>

      {/* 💳 PayPal Email Section */}
      <div 
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,119,181,0.15) 0%, rgba(0,119,181,0.05) 100%)',
          border: '1px solid rgba(0,119,181,0.3)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#0077B5]/20">
              {/* PayPal Logo */}
              <svg className="h-6 w-6 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">PayPal Payout Account</h3>
              <p className="text-gray-400 text-sm">All payouts will be sent to this PayPal email</p>
            </div>
          </div>

          {isEditingPaypal ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:flex-initial sm:min-w-[400px]">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  value={newPaypalEmail}
                  onChange={(e) => {
                    setNewPaypalEmail(e.target.value);
                    setPaypalError('');
                  }}
                  placeholder="your-paypal@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0077B5]/50"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditingPaypal(false);
                    setNewPaypalEmail(balance.paypalEmail || '');
                    setPaypalError('');
                  }}
                  className="px-4 py-2.5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePaypalEmail}
                  disabled={savingPaypal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0077B5] text-white rounded-lg hover:bg-[#0077B5]/80 transition-colors disabled:opacity-50"
                >
                  {savingPaypal ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {balance.paypalEmail ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg">
                    <Mail className="h-4 w-4 text-[#0077B5]" />
                    <span className="text-white font-medium">{balance.paypalEmail}</span>
                  </div>
                  <button
                    onClick={() => setIsEditingPaypal(true)}
                    className="p-2.5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingPaypal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0077B5] text-white rounded-lg hover:bg-[#0077B5]/80 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Add PayPal Email
                </button>
              )}
            </div>
          )}
        </div>
        
        {paypalError && (
          <p className="text-red-400 text-sm mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {paypalError}
          </p>
        )}
        
        {!balance.paypalEmail && !isEditingPaypal && (
          <p className="text-yellow-400 text-sm mt-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            You must add a PayPal email before requesting payouts
          </p>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard 
          label="Available Balance"
          value={formatCurrency(balance.availableBalance)}
          icon={Wallet}
          color="text-emerald-400"
          highlight
        />
        <BalanceCard 
          label="Pending Payouts"
          value={formatCurrency(balance.pendingPayouts)}
          icon={Clock}
          color="text-yellow-400"
        />
        <BalanceCard 
          label="Total Paid"
          value={formatCurrency(balance.totalPaid)}
          icon={CheckCircle}
          color="text-blue-400"
        />
        <BalanceCard 
          label="Total Earned"
          value={formatCurrency(balance.totalEarnings)}
          icon={DollarSign}
          color="text-[#C9A646]"
        />
      </div>

      {/* Payout Info */}
      <div 
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="text-white font-medium mb-1">Payout Information</p>
            <ul className="space-y-1">
              <li>• Minimum payout amount: <span className="text-white">{formatCurrency(MIN_PAYOUT_AMOUNT)}</span></li>
              <li>• Payouts are processed within <span className="text-white">1-3 business days</span></li>
              <li>• Payments are sent via <span className="text-white">PayPal</span></li>
              <li>• Commissions must be <span className="text-white">confirmed</span> (7-day verification period)</li>
            </ul>
          </div>
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
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Payout History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A646]"></div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No payouts yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Request your first payout when you reach {formatCurrency(MIN_PAYOUT_AMOUNT)}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/5">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">PayPal Email</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Processed</th>
                    <th className="px-6 py-4 font-medium">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr 
                        key={payout.id} 
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-gray-400">
                          {formatDate(payout.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">
                            {formatCurrency(payout.total_amount_usd)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {payout.payment_email}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit",
                              statusConfig.bgColor,
                              statusConfig.color
                            )}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </span>
                            {payout.failure_reason && (
                              <span className="text-xs text-red-400">
                                {payout.failure_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {payout.completed_at 
                            ? formatDate(payout.completed_at)
                            : payout.processed_at
                            ? formatDate(payout.processed_at)
                            : <span className="text-gray-500">-</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          {payout.paypal_transaction_id ? (
                            <span className="text-gray-300 font-mono text-xs">
                              {payout.paypal_transaction_id}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
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

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-md rounded-xl p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(26,26,26,0.98) 0%, rgba(20,20,20,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Request Payout</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Available Balance
                </label>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(balance.availableBalance)}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Payout Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    min={MIN_PAYOUT_AMOUNT}
                    max={balance.availableBalance}
                    step="0.01"
                    value={requestAmount}
                    onChange={(e) => {
                      setRequestAmount(e.target.value);
                      setRequestError('');
                    }}
                    placeholder={`Min ${MIN_PAYOUT_AMOUNT}`}
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]/50"
                  />
                </div>
                <button
                  onClick={() => setRequestAmount(balance.availableBalance.toString())}
                  className="text-xs text-[#C9A646] hover:text-[#D4B85A] mt-1"
                >
                  Request maximum ({formatCurrency(balance.availableBalance)})
                </button>
                {requestError && (
                  <p className="text-red-400 text-sm mt-2">{requestError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Payment will be sent to
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0077B5]/10 border border-[#0077B5]/30 rounded-lg">
                  <svg className="h-5 w-5 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                  </svg>
                  <span className="text-white font-medium">{balance.paypalEmail}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestAmount('');
                    setRequestError('');
                  }}
                  className="flex-1 px-4 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={requesting || !requestAmount}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                    requesting || !requestAmount
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-[#C9A646] text-black hover:bg-[#D4B85A]"
                  )}
                >
                  {requesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Request Payout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// BALANCE CARD COMPONENT
// ============================================

function BalanceCard({ 
  label, 
  value, 
  icon: Icon,
  color,
  highlight = false,
}: { 
  label: string; 
  value: string; 
  icon: any;
  color: string;
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
          <p className={cn("text-xl font-bold", color)}>{value}</p>
        </div>
        <div className={cn("p-2 rounded-lg bg-black/30", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}