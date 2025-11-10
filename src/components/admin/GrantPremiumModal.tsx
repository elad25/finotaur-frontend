// src/components/admin/GrantPremiumModal.tsx
import { useState } from 'react';
import { X, Gift, Loader2 } from 'lucide-react';
import { grantFreeAccess } from '@/services/adminService';
import { UserWithStats } from '@/types/admin';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface GrantPremiumModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrantPremiumModal({ user, onClose, onSuccess }: GrantPremiumModalProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);
      
      await grantFreeAccess(
        user.id,
        months,
        reason || `Admin granted ${months} month(s) of free premium access`,
        currentUser.id
      );

      toast.success(`✅ Granted ${months} month(s) to ${user.email}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error granting free access:', error);
      toast.error(error.message || 'Failed to grant free access');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-xl font-bold text-white">Grant Free Premium</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-1">User</p>
          <p className="text-white font-semibold">{user.email}</p>
          <p className="text-xs text-gray-500 mt-1">
            Current: {user.account_type} • {user.free_months_available || 0} free months
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Months */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Months *
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              User will get {months} month(s) of premium access for free
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] resize-none"
              rows={3}
              placeholder="e.g., Friend of admin, Compensation, Beta tester..."
            />
          </div>

          {/* Quick Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMonths(1)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                months === 1
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0A0A0A] border border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              1 Month
            </button>
            <button
              type="button"
              onClick={() => setMonths(6)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                months === 6
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0A0A0A] border border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setMonths(12)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                months === 12
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0A0A0A] border border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              1 Year
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Granting...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Grant {months} Month(s)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}