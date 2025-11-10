// src/components/admin/DeleteUserModal.tsx
import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { UserWithStats } from '@/types/admin';
import { supabase } from '@/lib/supabase';

interface DeleteUserModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteUserModal({ user, onClose, onSuccess }: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');

  const isConfirmed = confirmText === 'DELETE';

  async function handleDelete() {
    if (!isConfirmed) return;

    try {
      setLoading(true);
      setError('');
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // ✅ PROTECTION: Prevent admin from deleting themselves
      if (currentUser.id === user.id) {
        setError('⛔ You cannot delete your own account! Please contact another admin if needed.');
        setLoading(false);
        return;
      }

      // ✅ Call the soft delete function
      const { data, error: deleteError } = await supabase.rpc('admin_soft_delete_user', {
        p_user_id: user.id,
        p_reason: reason || 'Admin deleted user via dashboard'
      });

      if (deleteError) throw deleteError;

      // Check if the function returned success
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete user');
      }

      console.log('✅ User soft deleted:', data.data);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      setError(error.message || 'Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">🗑️ Delete User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-medium mb-1">Soft Delete</p>
                <p className="text-yellow-300/80 text-xs">
                  Hidden for 30 days, then permanently removed.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* User Info */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-300">
              User: <span className="text-white font-medium">{user.email}</span>
            </p>
            <p className="text-sm text-gray-300">
              Trades: <span className="text-white font-medium">{user.total_trades}</span>
            </p>
            <p className="text-sm text-gray-300">
              Strategies: <span className="text-white font-medium">{user.strategies_count}</span>
            </p>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (optional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., User requested deletion, Policy violation..."
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]"
            />
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
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
            onClick={handleDelete}
            disabled={loading || !isConfirmed}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}