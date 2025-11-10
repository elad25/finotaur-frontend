// src/components/admin/GrantPremiumModal.tsx
import { useState } from 'react';
import { X, Gift, AlertCircle } from 'lucide-react';
import { UserWithStats } from '@/types/admin';
import { grantFreeAccess } from '@/services/adminService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface GrantPremiumModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrantPremiumModal({ user, onClose, onSuccess }: GrantPremiumModalProps) {
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGrant() {
    try {
      setLoading(true);
      setError('');
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Call the new grantFreeAccess function
      await grantFreeAccess(
        user.id,
        months,
        reason || `Free premium granted for ${months} month(s)`,
        currentUser.id
      );

      toast.success(`✅ נתתי ${months} חודש${months > 1 ? 'ים' : ''} חינם ל-${user.email}`);
      
      // ✅ CRITICAL FIX: Call onSuccess to refresh data
      onSuccess();
      
      // Small delay to ensure DB update is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onClose();
    } catch (error: any) {
      console.error('❌ Error granting premium:', error);
      const errorMessage = error.message || 'Failed to grant premium';
      setError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">🎁 Grant Free Premium</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              Granting premium to: <span className="text-white font-medium">{user.email}</span>
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div>
                Current: <span className="text-[#D4AF37] uppercase">{user.account_type}</span>
              </div>
              <div>
                Free months: <span className="text-[#D4AF37]">{user.free_months_available || 0}</span>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (months):
            </label>
            <input
              type="number"
              min="1"
              max="1200"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-400">
                📅 Expires: {new Date(new Date().setMonth(new Date().getMonth() + months)).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-[#D4AF37]">
                💡 Quick: 1=month | 12=year | 120=decade | 1200=lifetime
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (optional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Friend of founder, Beta tester, Support gesture..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] resize-none"
            />
          </div>

          {/* What will happen */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300 font-medium mb-2">✨ What will happen:</p>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">✓</span>
                <span>User gets <strong className="text-white">{months}</strong> free month{months > 1 ? 's' : ''}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">✓</span>
                <span>Full premium access (unlimited trades, strategies, analytics)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">✓</span>
                <span>No payment required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">✓</span>
                <span>Action logged in audit trail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 shrink-0">⚠</span>
                <span>User keeps <strong className="text-white">FREE</strong> account type (but with premium features)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#E5C158] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Granting...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Grant {months} Month{months > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}