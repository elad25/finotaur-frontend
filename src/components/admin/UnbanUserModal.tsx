// src/components/admin/UnbanUserModal.tsx
import { useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { unbanUser } from '@/services/adminService';
import { UserWithStats } from '@/types/admin';
import { useAuth } from '@/hooks/useAuth';

interface UnbanUserModalProps {
  user: UserWithStats;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnbanUserModal({ 
  user, 
  onClose, 
  onSuccess 
}: UnbanUserModalProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnban = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      await unbanUser({ userId: user.id }, currentUser.id);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Unban User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to unban this user?
          </p>

          {/* User Info */}
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center">
                <span className="text-black font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">
                  {user.display_name || 'No name'}
                </p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>

            {/* Current Ban Info */}
            {user.ban_reason && (
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Current Ban Reason:</p>
                <p className="text-sm text-red-400">{user.ban_reason}</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              ✓ This user will regain full access to their account
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#0A0A0A] border border-gray-700 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUnban}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Unbanning...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Unban User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}