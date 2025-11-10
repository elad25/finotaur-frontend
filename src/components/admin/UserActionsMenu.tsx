// src/components/admin/UserActionsMenu.tsx
// ============================================
// User Actions Dropdown Menu (3 dots)
// ✅ NOW SUPPORTS IMPERSONATION
// ============================================

import { useState } from 'react';
import { MoreVertical, Eye, Edit, Gift, Mail, Ban, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserWithStats } from '@/types/admin';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import ChangeSubscriptionModal from './ChangeSubscriptionModal';
import GrantPremiumModal from './GrantPremiumModal';
import SendEmailModal from './SendEmailModal';
import BanUserModal from './BanUserModal';
import DeleteUserModal from './DeleteUserModal';

interface UserActionsMenuProps {
  user: UserWithStats;
  onActionComplete?: () => void;
}

export default function UserActionsMenu({ user, onActionComplete }: UserActionsMenuProps) {
  const { startImpersonation } = useImpersonation();
  const [showChangeSubscription, setShowChangeSubscription] = useState(false);
  const [showGrantPremium, setShowGrantPremium] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showBanUser, setShowBanUser] = useState(false);
  const [showDeleteUser, setShowDeleteUser] = useState(false);

  const handleSuccess = () => {
    if (onActionComplete) {
      onActionComplete();
    }
  };

  // 🔥 NEW: Handle impersonation (View as User)
  const handleViewAsUser = async () => {
    await startImpersonation(
      user.id,
      user.email,
      user.display_name || undefined
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-[#111111] border-gray-800"
        >
          {/* 🔥 UPDATED: Now uses impersonation instead of navigation */}
          <DropdownMenuItem
            onClick={handleViewAsUser}
            className="cursor-pointer hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View as User
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setShowChangeSubscription(true)}
            className="cursor-pointer hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            Change Subscription
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setShowGrantPremium(true)}
            className="cursor-pointer hover:bg-[#1a1a1a] text-[#D4AF37] hover:text-[#E5C158]"
          >
            <Gift className="w-4 h-4 mr-2" />
            Grant Free Month
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-800" />
          
          <DropdownMenuItem
            onClick={() => setShowSendEmail(true)}
            className="cursor-pointer hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-800" />
          
          <DropdownMenuItem
            onClick={() => setShowBanUser(true)}
            className="cursor-pointer hover:bg-red-500/10 text-red-400 hover:text-red-300"
          >
            <Ban className="w-4 h-4 mr-2" />
            Ban User
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setShowDeleteUser(true)}
            className="cursor-pointer hover:bg-red-500/10 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      {showChangeSubscription && (
        <ChangeSubscriptionModal
          user={user}
          onClose={() => setShowChangeSubscription(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showGrantPremium && (
        <GrantPremiumModal
          user={user}
          onClose={() => setShowGrantPremium(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showSendEmail && (
        <SendEmailModal
          user={user}
          onClose={() => setShowSendEmail(false)}
        />
      )}

      {showBanUser && (
        <BanUserModal
          user={user}
          onClose={() => setShowBanUser(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showDeleteUser && (
        <DeleteUserModal
          user={user}
          onClose={() => setShowDeleteUser(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}