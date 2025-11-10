// src/components/admin/AdminAffiliatePanel.tsx
// ============================================
// Admin Affiliate Panel - Full Management
// ============================================

import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Gift, 
  DollarSign,
  UserPlus,
  Calendar,
  Award,
  CheckCircle,
  Loader2,
  Search
} from 'lucide-react';
import { getAffiliateAdminStats, getReferralTree, adminGrantFreeMonths } from '@/services/affiliateService';
import { AffiliateAdminStats, ReferralTreeNode } from '@/types/affiliate';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function AdminAffiliatePanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AffiliateAdminStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [referralTree, setReferralTree] = useState<ReferralTreeNode | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getAffiliateAdminStats();
      setStats(data);
    } catch (error) {
      console.error('❌ Error loading affiliate stats:', error);
      toast.error('Failed to load affiliate statistics');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewReferralTree(userId: string) {
    try {
      setSelectedUserId(userId);
      const tree = await getReferralTree(userId);
      setReferralTree(tree);
    } catch (error) {
      console.error('❌ Error loading referral tree:', error);
      toast.error('Failed to load referral tree');
    }
  }

  async function handleGrantFreeMonths() {
    if (!user || !grantUserId || grantMonths < 1) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setGranting(true);
      const result = await adminGrantFreeMonths(
        grantUserId,
        grantMonths,
        grantReason || 'Manual grant by admin',
        user.id
      );

      if (result.ok) {
        toast.success(`✅ Granted ${grantMonths} free month(s) successfully!`);
        setShowGrantModal(false);
        setGrantUserId('');
        setGrantMonths(1);
        setGrantReason('');
        loadStats();
      } else {
        toast.error(result.error || 'Failed to grant free months');
      }
    } catch (error) {
      console.error('❌ Error granting free months:', error);
      toast.error('Failed to grant free months');
    } finally {
      setGranting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          Failed to load affiliate statistics
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Gift className="w-8 h-8 text-[#D4AF37]" />
          Affiliate Program Management
        </h1>
        <p className="text-gray-400">
          Monitor and manage the referral system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Referrals */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold text-white">{stats.total_referrals}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">All-time signups via referral</div>
        </div>

        {/* Conversions */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Conversions</p>
              <p className="text-2xl font-bold text-green-400">{stats.total_conversions}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {stats.conversion_rate.toFixed(1)}% conversion rate
          </div>
        </div>

        {/* Free Months Granted */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Gift className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Free Months</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{stats.total_free_months_granted}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">Total months rewarded</div>
        </div>

        {/* Discounts Applied */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Discounts</p>
              <p className="text-2xl font-bold text-blue-400">{stats.total_discounts_applied}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">20% discounts given</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              Top Referrers
            </h2>
          </div>

          <div className="space-y-3">
            {stats.top_referrers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No referrers yet</p>
            ) : (
              stats.top_referrers.map((referrer, index) => (
                <div 
                  key={referrer.user_id}
                  className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 hover:border-[#D4AF37]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-700/20 text-gray-400'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {referrer.display_name || 'Anonymous'}
                        </p>
                        <p className="text-gray-400 text-xs">{referrer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        {referrer.total_conversions} <span className="text-green-400">✓</span>
                      </p>
                      <p className="text-gray-400 text-xs">
                        {referrer.total_referrals} signups
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-400">
                      <Gift className="w-3 h-3 inline mr-1" />
                      {referrer.free_months_earned} free months earned
                    </span>
                    <button
                      onClick={() => handleViewReferralTree(referrer.user_id)}
                      className="text-xs text-[#D4AF37] hover:text-[#E5C158] transition-colors"
                    >
                      View Tree →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Conversions */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Recent Conversions
            </h2>
          </div>

          <div className="space-y-3">
            {stats.recent_conversions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No conversions yet</p>
            ) : (
              stats.recent_conversions.map((conversion) => (
                <div 
                  key={conversion.referral_id}
                  className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium mb-1">
                        {conversion.referred_email}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Referred by: {conversion.referrer_email}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      conversion.subscription_type.includes('premium')
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {conversion.subscription_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(conversion.converted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className={`flex items-center gap-1 ${
                      conversion.reward_credited ? 'text-green-400' : 'text-yellow-500'
                    }`}>
                      {conversion.reward_credited ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Reward Credited
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Grant Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Manually Grant Free Months
        </button>
      </div>

      {/* Manual Grant Modal */}
      {showGrantModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowGrantModal(false)}
        >
          <div 
            className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Grant Free Months</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  placeholder="Enter user UUID..."
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Months
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={grantMonths}
                  onChange={(e) => setGrantMonths(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Customer support gesture..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGrantModal(false)}
                className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantFreeMonths}
                disabled={granting || !grantUserId}
                className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {granting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Grant Months
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