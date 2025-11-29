// src/pages/app/journal/admin/affiliate/AffiliateAdminList.tsx
// ============================================
// Affiliate Admin - Affiliates List Tab
// View and manage all affiliates
// ============================================

import { useState } from 'react';
import { 
  Search,
  Users,
  TrendingUp,
  DollarSign,
  Copy,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Edit,
  Eye,
  Award,
  MousePointer,
  UserCheck,
  Loader2,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { 
  useAffiliatesList, 
  useUpdateAffiliateStatus,
  useUpdateAffiliate 
} from '@/features/affiliate/hooks/useAffiliateAdmin';
import { TIER_INFO, type Affiliate, type AffiliateStatus } from '@/features/affiliate/types/affiliate.types';
import { toast } from 'sonner';

export default function AffiliateAdminList() {
  const [statusFilter, setStatusFilter] = useState<AffiliateStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: affiliates, isLoading } = useAffiliatesList(statusFilter);
  const updateStatus = useUpdateAffiliateStatus();

  // Filter by search
  const filteredAffiliates = affiliates?.filter(aff => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      aff.display_name.toLowerCase().includes(query) ||
      aff.email.toLowerCase().includes(query) ||
      aff.affiliate_code.toLowerCase().includes(query)
    );
  }) || [];

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Handle suspend/activate
  const handleStatusChange = async (affiliateId: string, newStatus: AffiliateStatus) => {
    if (newStatus === 'suspended' && !suspensionReason) {
      return;
    }

    await updateStatus.mutateAsync({
      affiliateId,
      status: newStatus,
      suspensionReason: newStatus === 'suspended' ? suspensionReason : undefined,
    });

    setShowSuspendModal(false);
    setSuspensionReason('');
    setSelectedAffiliate(null);
    setActionMenuOpen(null);
  };

  // Get tier badge color
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'tier_1':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'tier_2':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'tier_3':
        return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Get status badge
  const getStatusBadge = (status: AffiliateStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-400';
      case 'suspended':
        return 'bg-red-500/10 text-red-400';
      case 'terminated':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
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
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'inactive', 'suspended'] as const).map((status) => (
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
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Affiliates</p>
          <p className="text-2xl font-bold text-white">{affiliates?.length || 0}</p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">
            {affiliates?.filter(a => a.status === 'active').length || 0}
          </p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Earnings</p>
          <p className="text-2xl font-bold text-[#D4AF37]">
            ${affiliates?.reduce((sum, a) => sum + (a.total_earnings_usd || 0), 0).toFixed(0) || 0}
          </p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Referrals</p>
          <p className="text-2xl font-bold text-purple-400">
            {affiliates?.reduce((sum, a) => sum + (a.total_qualified_referrals || 0), 0) || 0}
          </p>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
        {filteredAffiliates.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No affiliates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Affiliate</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Code</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Tier</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Status</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Clicks</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Signups</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Qualified</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Earnings</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAffiliates.map((affiliate) => (
                  <tr 
                    key={affiliate.id}
                    className="border-b border-gray-800/50 hover:bg-[#0A0A0A] transition-colors"
                  >
                    {/* Affiliate Info */}
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">{affiliate.display_name}</p>
                        <p className="text-gray-500 text-sm">{affiliate.email}</p>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-[#D4AF37] text-sm font-mono bg-[#D4AF37]/10 px-2 py-1 rounded">
                          {affiliate.affiliate_code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(affiliate.affiliate_code, 'Code')}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTierBadge(affiliate.current_tier)}`}>
                        {TIER_INFO[affiliate.current_tier as keyof typeof TIER_INFO]?.name || affiliate.current_tier}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(affiliate.status)}`}>
                        {affiliate.status}
                      </span>
                    </td>

                    {/* Clicks */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-gray-300">{affiliate.total_clicks?.toLocaleString() || 0}</span>
                    </td>

                    {/* Signups */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-gray-300">{affiliate.total_signups || 0}</span>
                    </td>

                    {/* Qualified */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-green-400 font-medium">{affiliate.total_qualified_referrals || 0}</span>
                    </td>

                    {/* Earnings */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-[#D4AF37] font-bold">${(affiliate.total_earnings_usd || 0).toFixed(2)}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === affiliate.id ? null : affiliate.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#111111] rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuOpen === affiliate.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1A] border border-gray-800 rounded-lg shadow-xl z-20 py-1">
                              <button
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setShowDetailsModal(true);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#111111] hover:text-white"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  copyToClipboard(affiliate.referral_link, 'Referral link');
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#111111] hover:text-white"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Copy Link
                              </button>
                              <div className="border-t border-gray-800 my-1" />
                              {affiliate.status === 'active' ? (
                                <button
                                  onClick={() => {
                                    setSelectedAffiliate(affiliate);
                                    setShowSuspendModal(true);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10"
                                >
                                  <Pause className="w-4 h-4" />
                                  Suspend
                                </button>
                              ) : affiliate.status === 'suspended' ? (
                                <button
                                  onClick={() => handleStatusChange(affiliate.id, 'active')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-green-500/10"
                                >
                                  <Play className="w-4 h-4" />
                                  Reactivate
                                </button>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAffiliate && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedAffiliate(null);
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedAffiliate.display_name}</h3>
                <p className="text-gray-400 text-sm">{selectedAffiliate.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAffiliate(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#0A0A0A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Tier */}
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(selectedAffiliate.status)}`}>
                  {selectedAffiliate.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getTierBadge(selectedAffiliate.current_tier)}`}>
                  {TIER_INFO[selectedAffiliate.current_tier as keyof typeof TIER_INFO]?.name}
                </span>
              </div>

              {/* Codes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Affiliate Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[#D4AF37] font-mono text-lg">{selectedAffiliate.affiliate_code}</code>
                    <button
                      onClick={() => copyToClipboard(selectedAffiliate.affiliate_code, 'Code')}
                      className="p-1 text-gray-500 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Referral Link</p>
                  <div className="flex items-center gap-2">
                    <code className="text-blue-400 font-mono text-sm truncate">{selectedAffiliate.referral_link}</code>
                    <button
                      onClick={() => copyToClipboard(selectedAffiliate.referral_link, 'Link')}
                      className="p-1 text-gray-500 hover:text-white flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Performance</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <MousePointer className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{selectedAffiliate.total_clicks || 0}</p>
                    <p className="text-gray-500 text-xs">Clicks</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{selectedAffiliate.total_signups || 0}</p>
                    <p className="text-gray-500 text-xs">Signups</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <UserCheck className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">{selectedAffiliate.total_qualified_referrals || 0}</p>
                    <p className="text-gray-500 text-xs">Qualified</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{selectedAffiliate.total_active_customers || 0}</p>
                    <p className="text-gray-500 text-xs">Active</p>
                  </div>
                </div>
              </div>

              {/* Earnings Stats */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Earnings</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <DollarSign className="w-5 h-5 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-2xl font-bold text-[#D4AF37]">${(selectedAffiliate.total_earnings_usd || 0).toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">Total Earned</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <DollarSign className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-400">${(selectedAffiliate.total_pending_usd || 0).toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">Pending</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg text-center">
                    <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">${(selectedAffiliate.total_paid_usd || 0).toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">Paid Out</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Payment Information</h4>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Payment Method</p>
                      <p className="text-white">{selectedAffiliate.payment_method || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">PayPal Email</p>
                      <p className="text-white">{selectedAffiliate.paypal_email || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-800">
                <span>Activated: {new Date(selectedAffiliate.activated_at).toLocaleDateString()}</span>
                <span>Last Activity: {new Date(selectedAffiliate.last_activity_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedAffiliate && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSuspendModal(false);
            setSelectedAffiliate(null);
            setSuspensionReason('');
          }}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Suspend Affiliate</h3>
              <p className="text-gray-400 text-sm mt-1">
                Suspend {selectedAffiliate.display_name}'s account
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  Suspended affiliates cannot earn commissions and their referral links will be disabled.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Suspension Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Explain why this affiliate is being suspended..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedAffiliate(null);
                  setSuspensionReason('');
                }}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(selectedAffiliate.id, 'suspended')}
                disabled={updateStatus.isPending || !suspensionReason}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {updateStatus.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    Suspend
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}