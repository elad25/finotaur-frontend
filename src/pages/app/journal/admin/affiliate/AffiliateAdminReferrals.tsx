// src/pages/app/journal/admin/affiliate/AffiliateAdminReferrals.tsx
// ============================================
// Affiliate Admin - Referrals Tab
// View and manage all referrals with 7-day verification period
// 🔥 v2.3.0: Fixed status types to match DB schema
// ============================================

import { useState, useEffect } from 'react';
import { 
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Timer,
  RefreshCw,
  Filter
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  REFERRAL_STATUS_DISPLAY, 
  type ReferralStatus 
} from '@/features/affiliate/types/affiliate.types';

// 🔥 v2.3.0: Fixed interface to match DB schema
interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referred_user_email: string | null;
  signup_date: string;
  // 🔥 FIXED: Using correct DB status types
  status: ReferralStatus;
  verification_start: string | null;
  verification_end: string | null;
  qualified_at: string | null;
  first_payment_date: string | null;
  first_payment_amount_usd: number | null;
  subscription_type: string | null;
  subscription_plan: string | null;
  subscription_price_usd: number | null;
  total_revenue_usd: number;
  commission_eligible: boolean;
  days_until_verified: number;
  // Joined data
  affiliate?: {
    display_name: string;
    email: string;
    affiliate_code: string;
  } | null;
  referred_user?: {
    email: string;
    display_name: string | null;
    account_type: string;
    created_at: string;
  } | null;
}

interface Props {
  onPendingVerificationsChange?: (count: number) => void;
}

// 🔥 v2.3.0: Fixed status filter to match DB types
type StatusFilter = 'all' | ReferralStatus;

export default function AffiliateAdminReferrals({ onPendingVerificationsChange }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch referrals
  const { data: referrals, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['admin', 'affiliate-referrals', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('affiliate_referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: referralsData, error: referralsError } = await query;

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        throw referralsError;
      }

      if (!referralsData || referralsData.length === 0) {
        return [];
      }

      // Get unique affiliate IDs and user IDs
      const affiliateIds = [...new Set(referralsData.map(r => r.affiliate_id).filter(Boolean))];
      const userIds = [...new Set(referralsData.map(r => r.referred_user_id).filter(Boolean))];

      // Fetch affiliates separately
      let affiliatesMap: Record<string, any> = {};
      if (affiliateIds.length > 0) {
        const { data: affiliatesData } = await supabase
          .from('affiliates')
          .select('id, display_name, email, affiliate_code')
          .in('id', affiliateIds);
        
        if (affiliatesData) {
          affiliatesMap = affiliatesData.reduce((acc, aff) => {
            acc[aff.id] = aff;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Fetch users separately
      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, email, display_name, account_type, created_at')
          .in('id', userIds);
        
        if (usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Calculate days until verified and merge data
      const now = new Date();
      const processedData = referralsData.map(ref => {
        let daysLeft = 0;
        
        // 🔥 v2.3.0: Calculate days remaining based on verification_end from DB
        if (ref.status === 'verification_pending' && ref.verification_end) {
          const verificationEnd = new Date(ref.verification_end);
          daysLeft = Math.max(0, Math.ceil((verificationEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        return {
          ...ref,
          days_until_verified: daysLeft,
          affiliate: affiliatesMap[ref.affiliate_id] || null,
          referred_user: usersMap[ref.referred_user_id] || null,
          total_revenue_usd: ref.subscription_price_usd || 0,
        };
      });

      return processedData as Referral[];
    },
  });

  // Update pending count
  useEffect(() => {
    if (referrals && onPendingVerificationsChange) {
      // Count verification_pending (not pending - that's awaiting payment)
      const pendingCount = referrals.filter(r => r.status === 'verification_pending').length;
      onPendingVerificationsChange(pendingCount);
    }
  }, [referrals, onPendingVerificationsChange]);

  // 🔥 v2.3.0: Process verification (mark as qualified after 7 days)
  const processVerification = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase
        .from('affiliate_referrals')
        .update({ 
          status: 'qualified',
          qualified_at: new Date().toISOString(),
          commission_eligible: true,
          commission_start_date: new Date().toISOString(),
          commission_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 12 months
        })
        .eq('id', referralId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral qualified successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate-referrals'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to qualify referral');
    },
  });

  // 🔥 v2.3.0: Mark as verification_failed (refund during verification)
  const markAsFailed = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase
        .from('affiliate_referrals')
        .update({ 
          status: 'verification_failed',
          commission_eligible: false,
          notes: 'Marked as failed by admin',
        })
        .eq('id', referralId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral marked as failed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate-referrals'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update referral');
    },
  });

  // Mark as churned (subscription cancelled)
  const markAsChurned = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase
        .from('affiliate_referrals')
        .update({ 
          status: 'churned',
          churned_at: new Date().toISOString(),
          subscription_cancelled_at: new Date().toISOString(),
        })
        .eq('id', referralId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral marked as churned');
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate-referrals'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark as churned');
    },
  });

  // Filter by search
  const filteredReferrals = referrals?.filter(referral => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      referral.referred_user_email?.toLowerCase().includes(query) ||
      referral.affiliate?.display_name?.toLowerCase().includes(query) ||
      referral.affiliate?.affiliate_code?.toLowerCase().includes(query) ||
      referral.referred_user?.email?.toLowerCase().includes(query)
    );
  }) || [];

  // Get status badge
  const getStatusBadge = (status: ReferralStatus) => {
    const statusInfo = REFERRAL_STATUS_DISPLAY[status];
    if (!statusInfo) {
      return { 
        bg: 'bg-gray-500/10', 
        text: 'text-gray-400', 
        label: status 
      };
    }
    return { 
      bg: statusInfo.bgClass, 
      text: statusInfo.textClass, 
      label: statusInfo.label 
    };
  };

  // Calculate summary stats
  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter(r => r.status === 'pending').length || 0,
    inVerification: referrals?.filter(r => r.status === 'verification_pending').length || 0,
    qualified: referrals?.filter(r => r.status === 'qualified').length || 0,
    failed: referrals?.filter(r => r.status === 'verification_failed').length || 0,
    churned: referrals?.filter(r => r.status === 'churned').length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs">Total</p>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111111] border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs">Awaiting Payment</p>
          <p className="text-xl font-bold text-gray-400">{stats.pending}</p>
        </div>
        <div className="bg-[#111111] border border-yellow-500/20 rounded-lg p-4">
          <p className="text-gray-400 text-xs">In Verification</p>
          <p className="text-xl font-bold text-yellow-400">{stats.inVerification}</p>
        </div>
        <div className="bg-[#111111] border border-green-500/20 rounded-lg p-4">
          <p className="text-gray-400 text-xs">Qualified</p>
          <p className="text-xl font-bold text-green-400">{stats.qualified}</p>
        </div>
        <div className="bg-[#111111] border border-red-500/20 rounded-lg p-4">
          <p className="text-gray-400 text-xs">Failed</p>
          <p className="text-xl font-bold text-red-400">{stats.failed}</p>
        </div>
        <div className="bg-[#111111] border border-orange-500/20 rounded-lg p-4">
          <p className="text-gray-400 text-xs">Churned</p>
          <p className="text-xl font-bold text-orange-400">{stats.churned}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Status Tabs - 🔥 v2.3.0: Fixed to use correct DB statuses */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Awaiting Payment' },
            { value: 'verification_pending', label: 'In Verification' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'verification_failed', label: 'Failed' },
            { value: 'churned', label: 'Churned' },
            { value: 'refunded', label: 'Refunded' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value as StatusFilter)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${statusFilter === status.value 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#111111] text-gray-400 hover:text-white border border-gray-800'
                }
              `}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#111111] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or code..."
              className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Referred User</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Affiliate</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Signup Date</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">First Payment</th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Verification</th>
                <th className="text-right px-4 py-3 text-gray-400 text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No referrals found
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((referral) => {
                  const statusBadge = getStatusBadge(referral.status);
                  
                  return (
                    <tr key={referral.id} className="border-b border-gray-800/50 hover:bg-[#0A0A0A]">
                      {/* Referred User */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">
                            {referral.referred_user?.display_name || 
                             referral.referred_user_email?.split('@')[0] || 
                             'Anonymous'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {referral.referred_user?.email || referral.referred_user_email}
                          </p>
                        </div>
                      </td>

                      {/* Affiliate */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{referral.affiliate?.display_name || 'Unknown'}</p>
                          <p className="text-[#D4AF37] text-xs font-mono">{referral.affiliate?.affiliate_code || '-'}</p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Signup Date */}
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(referral.signup_date).toLocaleDateString()}
                      </td>

                      {/* First Payment */}
                      <td className="px-4 py-3">
                        {referral.first_payment_date ? (
                          <div>
                            <p className="text-green-400 text-sm font-medium">
                              ${referral.first_payment_amount_usd?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(referral.first_payment_date).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>

                      {/* Verification */}
                      <td className="px-4 py-3">
                        {referral.status === 'verification_pending' && referral.days_until_verified > 0 ? (
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm">
                              {referral.days_until_verified} days left
                            </span>
                          </div>
                        ) : referral.status === 'verification_pending' && referral.days_until_verified === 0 ? (
                          <span className="text-green-400 text-sm">Ready to qualify</span>
                        ) : referral.status === 'qualified' ? (
                          <span className="text-green-400 text-sm">✓ Verified</span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedReferral(referral);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Qualify button - only for verification_pending with 0 days left */}
                          {referral.status === 'verification_pending' && referral.days_until_verified === 0 && (
                            <button
                              onClick={() => processVerification.mutate(referral.id)}
                              disabled={processVerification.isPending}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                              title="Qualify Now"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Mark as failed - for verification_pending */}
                          {referral.status === 'verification_pending' && (
                            <button
                              onClick={() => markAsFailed.mutate(referral.id)}
                              disabled={markAsFailed.isPending}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Mark as Failed"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Mark as churned - for qualified */}
                          {referral.status === 'qualified' && (
                            <button
                              onClick={() => markAsChurned.mutate(referral.id)}
                              disabled={markAsChurned.isPending}
                              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Mark as Churned"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedReferral && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedReferral(null);
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Referral Details</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`
                  px-3 py-1.5 rounded-full text-sm font-medium
                  ${getStatusBadge(selectedReferral.status).bg}
                  ${getStatusBadge(selectedReferral.status).text}
                `}>
                  {getStatusBadge(selectedReferral.status).label}
                </span>
                {selectedReferral.commission_eligible && (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                    Commission Eligible
                  </span>
                )}
              </div>

              {/* Referred User */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Referred User</h4>
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <p className="text-white font-medium">
                    {selectedReferral.referred_user?.display_name || 
                     selectedReferral.referred_user_email?.split('@')[0] || 
                     'Anonymous'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {selectedReferral.referred_user?.email || selectedReferral.referred_user_email}
                  </p>
                  {selectedReferral.subscription_plan && (
                    <div className="mt-2">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded">
                        {selectedReferral.subscription_plan} ({selectedReferral.subscription_type})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Affiliate */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Referred By</h4>
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <p className="text-white font-medium">{selectedReferral.affiliate?.display_name || 'Unknown'}</p>
                  <p className="text-gray-400 text-sm">{selectedReferral.affiliate?.email || '-'}</p>
                  <p className="text-[#D4AF37] text-sm font-mono mt-1">
                    {selectedReferral.affiliate?.affiliate_code || '-'}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm">Signed Up</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(selectedReferral.signup_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {selectedReferral.first_payment_date && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">First Payment (${selectedReferral.first_payment_amount_usd?.toFixed(2)})</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(selectedReferral.first_payment_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedReferral.verification_start && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Timer className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">Verification Started</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(selectedReferral.verification_start).toLocaleString()}
                          {selectedReferral.verification_end && (
                            <> → Ends: {new Date(selectedReferral.verification_end).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedReferral.qualified_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">Qualified</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(selectedReferral.qualified_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue Info */}
              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Subscription Price</span>
                  <span className="text-[#D4AF37] font-bold">
                    ${(selectedReferral.subscription_price_usd || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400">Commission Eligible</span>
                  <span className={selectedReferral.commission_eligible ? 'text-green-400' : 'text-gray-500'}>
                    {selectedReferral.commission_eligible ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReferral(null);
                }}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}