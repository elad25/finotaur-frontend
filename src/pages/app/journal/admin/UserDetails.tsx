// src/pages/app/journal/admin/UserDetails.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Clock,
  Edit,
  Gift,
  Ban,
  Trash2,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { getUserById } from '@/services/adminService';
import { UserWithStats } from '@/types/admin';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ChangeSubscriptionModal from '@/components/admin/ChangeSubscriptionModal';
import GrantPremiumModal from '@/components/admin/GrantPremiumModal';
import BanUserModal from '@/components/admin/BanUserModal';
import DeleteUserModal from '@/components/admin/DeleteUserModal';
import SendEmailModal from '@/components/admin/SendEmailModal';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🎭 Impersonation
  const { startImpersonation } = useImpersonation();

  // Modals
  const [showChangeSubscription, setShowChangeSubscription] = useState(false);
  const [showGrantPremium, setShowGrantPremium] = useState(false);
  const [showBanUser, setShowBanUser] = useState(false);
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId]);

  async function loadUserDetails() {
    try {
      setLoading(true);
      const data = await getUserById(userId!);
      setUser(data);
    } catch (error) {
      console.error('❌ Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  }

  function getAccountTypeBadge(accountType: string) {
    const config = {
      free: { bg: 'bg-gray-800', text: 'text-gray-300', label: '🆓 Free User' },
      basic: { bg: 'bg-blue-500/10 border border-blue-500/20', text: 'text-blue-400', label: '⭐ Basic' },
      premium: { bg: 'bg-[#D4AF37]/10 border border-[#D4AF37]/20', text: 'text-[#D4AF37]', label: '💎 Premium' },
    };
    return config[accountType as keyof typeof config] || config.free;
  }

  function getIntervalBadge(interval: string | null) {
    if (!interval) return null;
    const config = {
      monthly: { bg: 'bg-green-500/10', text: 'text-green-400', label: '📅 Monthly' },
      yearly: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '📆 Yearly' },
    };
    return config[interval as keyof typeof config];
  }

  function getRoleBadge(role: string) {
    const config = {
      user: { bg: 'bg-gray-700', text: 'text-gray-300', icon: null },
      admin: { bg: 'bg-blue-500/10 border border-blue-500/20', text: 'text-blue-400', icon: Shield },
      super_admin: { bg: 'bg-red-500/10 border border-red-500/20', text: 'text-red-400', icon: Shield },
    };
    return config[role as keyof typeof config] || config.user;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateTime(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(date);
  }

  function getSubscriptionPrice(accountType: string, interval: string | null) {
    if (accountType === 'free') return '$0';
    if (accountType === 'basic') {
      return interval === 'yearly' ? '$12.42/mo' : '$19.99/mo';
    }
    if (accountType === 'premium') {
      return interval === 'yearly' ? '$24.92/mo' : '$39.99/mo';
    }
    return 'N/A';
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-8">
        <LoadingSkeleton lines={15} />
      </div>
    );
  }

  const accountBadge = getAccountTypeBadge(user.account_type);
  const intervalBadge = getIntervalBadge(user.subscription_interval);
  const roleBadge = getRoleBadge(user.role);
  const RoleIcon = roleBadge.icon;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/app/journal/admin/users')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">User Details</h1>
        <p className="text-gray-400">Manage user account, subscription, and permissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* 1. Personal Info Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              👤 Personal Information
            </h2>

            <div className="flex flex-col items-center mb-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center mb-4">
                <span className="text-black font-bold text-3xl">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{user.display_name || 'No name'}</h3>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Account Type:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${accountBadge.bg} ${accountBadge.text}`}>
                  {accountBadge.label}
                </span>
              </div>

              {intervalBadge && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Billing:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${intervalBadge.bg} ${intervalBadge.text}`}>
                    {intervalBadge.label}
                  </span>
                </div>
              )}

              {user.account_type !== 'free' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Price:</span>
                  <span className="text-white text-sm font-semibold">
                    {getSubscriptionPrice(user.account_type, user.subscription_interval)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Role:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                  {RoleIcon && <RoleIcon className="w-3 h-3" />}
                  {user.role}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Joined:</span>
                <span className="text-white text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(user.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                  user.is_banned 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                }`}>
                  {user.is_banned ? (
                    <>
                      <XCircle className="w-3 h-3" />
                      Banned
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </>
                  )}
                </span>
              </div>

              {user.last_login_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Last Login:</span>
                  <span className="text-white text-sm">{formatDateTime(user.last_login_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ NEW: Affiliate Information Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#D4AF37]" />
              Affiliate Info
            </h2>
            <div className="space-y-3">
              {/* Affiliate Code */}
              {user.affiliate_code ? (
                <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Referral Code</div>
                  <code className="text-[#D4AF37] text-sm font-mono font-bold">
                    {user.affiliate_code}
                  </code>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No referral code generated yet</div>
              )}
              
              {/* Referred By */}
              {user.referred_by && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Referred By:</span>
                  <code className="text-white text-xs font-mono bg-[#0A0A0A] px-2 py-1 rounded">
                    {user.referred_by}
                  </code>
                </div>
              )}
              
              {/* Free Months Available */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Free Months:</span>
                <span className={`text-sm font-semibold ${
                  (user.free_months_available || 0) > 0 ? 'text-[#D4AF37]' : 'text-gray-400'
                }`}>
                  {user.free_months_available || 0}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Subscription Management */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              💳 Subscription
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status:</span>
                <span className="text-white text-sm capitalize">{user.subscription_status}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Trade Count:</span>
                <span className="text-white text-sm">{user.trade_count} / {user.max_trades === 999999 ? '∞' : user.max_trades}</span>
              </div>

              {user.subscription_expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Expires:</span>
                  <span className="text-white text-sm">{formatDate(user.subscription_expires_at)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowChangeSubscription(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#E5C158] transition-colors"
              >
                <Edit className="w-4 h-4" />
                Change Subscription
              </button>

              <button
                onClick={() => setShowGrantPremium(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-[#D4AF37] text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/10 transition-colors"
              >
                <Gift className="w-4 h-4" />
                Grant Premium (1 Month)
              </button>
            </div>
          </div>

          {/* 4. Quick Actions */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ⚡ Quick Actions
            </h2>

            <div className="space-y-2">
              {/* 🎭 NEW: View as User Button */}
              <button
                onClick={() => {
                  if (user) {
                    startImpersonation(
                      user.id,
                      user.email,
                      user.display_name || undefined
                    );
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <Eye className="w-4 h-4" />
                View as User
              </button>

              <button
                onClick={() => setShowSendEmail(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>

              <button
                onClick={() => navigate(`/app/journal/admin/users/${userId}/trades`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View All Trades
              </button>

              <button
                onClick={() => setShowBanUser(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Ban className="w-4 h-4" />
                Ban User
              </button>

              <button
                onClick={() => setShowDeleteUser(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Statistics & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3. Trading Statistics */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              📊 Performance Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Total Trades</span>
                </div>
                <p className="text-2xl font-bold text-white">{user.total_trades}</p>
              </div>

              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs">Win Rate</span>
                </div>
                <p className={`text-2xl font-bold ${user.win_rate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                  {user.win_rate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Total P&L</span>
                </div>
                <p className={`text-2xl font-bold ${user.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${user.total_pnl.toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Avg P&L</span>
                </div>
                <p className={`text-2xl font-bold ${(user.total_pnl / (user.total_trades || 1)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${(user.total_trades > 0 ? user.total_pnl / user.total_trades : 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">Active Trades</span>
                </div>
                <p className="text-xl font-bold text-white">{user.active_trades || 0}</p>
              </div>

              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs">Strategies</span>
                </div>
                <p className="text-xl font-bold text-white">{user.strategies_count || 0}</p>
              </div>

              <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs">Login Count</span>
                </div>
                <p className="text-xl font-bold text-white">{user.login_count || 0}</p>
              </div>
            </div>

            <div className="mt-4 bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Last Trade</span>
              </div>
              <p className="text-sm text-white">
                {user.last_trade_date ? formatDateTime(user.last_trade_date) : 'No trades yet'}
              </p>
            </div>
          </div>

          {/* Ban Warning */}
          {user.is_banned && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                User is Banned
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Reason:</span>
                  <span className="text-white text-sm">{user.ban_reason || 'No reason provided'}</span>
                </div>
                {user.banned_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Banned At:</span>
                    <span className="text-white text-sm">{formatDateTime(user.banned_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showChangeSubscription && (
        <ChangeSubscriptionModal
          user={user}
          onClose={() => setShowChangeSubscription(false)}
          onSuccess={loadUserDetails}
        />
      )}

      {showGrantPremium && (
        <GrantPremiumModal
          user={user}
          onClose={() => setShowGrantPremium(false)}
          onSuccess={loadUserDetails}
        />
      )}

      {showBanUser && (
        <BanUserModal
          user={user}
          onClose={() => setShowBanUser(false)}
          onSuccess={() => navigate('/app/journal/admin/users')}
        />
      )}

      {showDeleteUser && (
        <DeleteUserModal
          user={user}
          onClose={() => setShowDeleteUser(false)}
          onSuccess={() => navigate('/app/journal/admin/users')}
        />
      )}

      {showSendEmail && (
        <SendEmailModal
          user={user}
          onClose={() => setShowSendEmail(false)}
        />
      )}
    </div>
  );
}