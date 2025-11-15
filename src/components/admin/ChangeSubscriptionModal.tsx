import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { updateUserSubscription } from '@/services/adminService';
import { UserWithStats } from '@/types/admin';
import type { AccountType, SubscriptionInterval } from '@/types/subscription';
import { supabase } from '@/lib/supabase';

interface ChangeSubscriptionModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangeSubscriptionModal({
  user,
  onClose,
  onSuccess,
}: ChangeSubscriptionModalProps) {
  const [accountType, setAccountType] = useState<AccountType>(user.account_type);
  const [interval, setInterval] = useState<SubscriptionInterval>(user.subscription_interval || 'monthly');
  const [status, setStatus] = useState(user.subscription_status);
  const [expiresAt, setExpiresAt] = useState(
    user.subscription_expires_at
      ? new Date(user.subscription_expires_at).toISOString().split('T')[0]
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [MODAL] handleSubmit started');
    setLoading(true);
    setError('');

    try {
      console.log('🔐 [MODAL] Getting current user...');
      // Get current admin user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('👤 [MODAL] Current user:', currentUser?.email);
      
      if (!currentUser) throw new Error('Not authenticated');

      console.log('🛡️ [MODAL] Checking protection...');
      // ✅ PROTECTION: Check if admin is trying to downgrade themselves
      if (currentUser.id === user.id) {
        console.log('⚠️ [MODAL] Admin editing own profile');
        
        // Get current user's profile to check role
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('role, account_type')
          .eq('id', currentUser.id)
          .single();

        console.log('📊 [MODAL] Current profile:', currentProfile);

        if (currentProfile?.role === 'admin' || currentProfile?.role === 'super_admin') {
          // Check if downgrading from premium/basic to free
          const isDowngrade = 
            (currentProfile.account_type === 'premium' || currentProfile.account_type === 'basic') &&
            accountType === 'free';

          console.log('🔍 [MODAL] Is downgrade?', isDowngrade);

          if (isDowngrade) {
            console.log('🛑 [MODAL] Downgrade blocked!');
            setError('⛔ Admins cannot downgrade their own subscription to Free. Please contact another admin.');
            setLoading(false);
            return;
          }
        }
      }

      console.log('📝 [MODAL] Calling updateUserSubscription with:', {
        userId: user.id,
        account_type: accountType,
        subscription_interval: interval,
        subscription_status: status,
        subscription_expires_at: expiresAt,
        adminId: currentUser.id
      });

      await updateUserSubscription(
        {
          userId: user.id,
          account_type: accountType,
          subscription_interval: interval,
          subscription_status: status,
          subscription_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          reason: `Subscription updated by admin from ${user.account_type} to ${accountType}`
        },
        currentUser.id
      );
      
      console.log('✅ [MODAL] updateUserSubscription completed!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ [MODAL] Error:', err);
      setError(err.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
      console.log('🏁 [MODAL] handleSubmit finished');
    }
  };

  // Calculate suggested expiry date based on interval
  const calculateExpiryDate = () => {
    const now = new Date();
    if (interval === 'yearly') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    setExpiresAt(now.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Change Subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Account Type
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* Billing Interval (only for paid plans) */}
          {accountType !== 'free' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Billing Interval
              </label>
              <select
                value={interval}
                onChange={(e) => {
                  setInterval(e.target.value as SubscriptionInterval);
                  // Auto-calculate expiry when changing interval
                  if (expiresAt) {
                    const current = new Date(expiresAt);
                    if (e.target.value === 'yearly') {
                      current.setFullYear(current.getFullYear() + 1);
                      current.setMonth(current.getMonth() - 1);
                    } else {
                      current.setMonth(current.getMonth() + 1);
                      current.setFullYear(current.getFullYear() - 1);
                    }
                    setExpiresAt(current.toISOString().split('T')[0]);
                  }
                }}
                className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="monthly">Monthly - ${accountType === 'basic' ? '19.99' : '39.99'}/mo</option>
                <option value="yearly">Yearly - ${accountType === 'basic' ? '12.42' : '24.92'}/mo (billed ${accountType === 'basic' ? '$149' : '$299'}/yr)</option>
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Expiry Date */}
          {accountType !== 'free' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Expires At
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="flex-1 bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={calculateExpiryDate}
                  className="px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/20 transition-colors text-sm"
                >
                  +{interval === 'yearly' ? '1Y' : '1M'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click +{interval === 'yearly' ? '1Y' : '1M'} to add {interval === 'yearly' ? 'one year' : 'one month'} from today
              </p>
            </div>
          )}

          {/* Pricing Info */}
          {accountType !== 'free' && (
            <div className="p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-[#D4AF37]">
                  {accountType === 'basic' ? 'Basic' : 'Premium'}
                </span>
                {' - '}
                {interval === 'monthly' ? (
                  <>
                    ${accountType === 'basic' ? '19.99' : '39.99'}/month
                  </>
                ) : (
                  <>
                    ${accountType === 'basic' ? '12.42' : '24.92'}/month
                    <span className="text-xs text-gray-500"> (billed ${accountType === 'basic' ? '$149' : '$299'} yearly)</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#E5C158] transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Subscription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}