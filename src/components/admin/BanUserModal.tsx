// src/components/admin/BanUserModal.tsx
import { useState } from 'react';
import { X, Ban, AlertTriangle } from 'lucide-react';
import { UserWithStats } from '@/types/admin';
import { banUser } from '@/services/adminService';
import { supabase } from '@/lib/supabase';

interface BanUserModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BanUserModal({ user, onClose, onSuccess }: BanUserModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleBan() {
    if (!reason.trim()) {
      setError('Please provide a reason for banning this user');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // ✅ PROTECTION: Prevent admin from banning themselves
      if (currentUser.id === user.id) {
        setError('⛔ You cannot ban yourself! Please contact another admin if needed.');
        setLoading(false);
        return;
      }

      await banUser({
        userId: user.id,
        reason: reason.trim(),
        bannedBy: currentUser.id,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Error banning user:', error);
      setError('Failed to ban user. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">🚫 Ban User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium mb-1">Warning</p>
                <p className="text-red-300/80 text-sm">
                  Banning this user will immediately revoke their access to the platform.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              User: <span className="text-white font-medium">{user.email}</span>
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for ban: <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for banning this user..."
              rows={4}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white hover:bg-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBan}
            disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            {loading ? 'Banning...' : 'Ban User'}
          </button>
        </div>
      </div>
    </div>
  );
}