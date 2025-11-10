// src/components/admin/UserActionsMenu.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Eye, Edit, Gift, Mail, Ban, Trash2, UserCheck } from 'lucide-react';
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
import UnbanUserModal from './UnbanUserModal'; // 🆕 NEW

interface UserActionsMenuProps {
  user: UserWithStats;
  onActionComplete?: () => void;
}

export default function UserActionsMenu({ user, onActionComplete }: UserActionsMenuProps) {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [showChangeSubscription, setShowChangeSubscription] = useState(false);
  const [showGrantPremium, setShowGrantPremium] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showBanUser, setShowBanUser] = useState(false);
  const [showUnbanUser, setShowUnbanUser] = useState(false); // 🆕 NEW
  const [showDeleteUser, setShowDeleteUser] = useState(false);

  const handleSuccess = () => {
    if (onActionComplete) {
      onActionComplete();
    }
  };

  const handleViewUserDetails = () => {
    navigate(`/app/journal/admin/users/${user.id}`);
  };

  const handleImpersonate = async () => {
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
          <DropdownMenuItem
            onClick={handleViewUserDetails}
            className="cursor-pointer hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View User Details
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
          
          {/* 🆕 Conditional: Show UNBAN or BAN based on user status */}
          {user.is_banned ? (
            <DropdownMenuItem
              onClick={() => setShowUnbanUser(true)}
              className="cursor-pointer hover:bg-green-500/10 text-green-400 hover:text-green-300"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Unban User
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBanUser(true)}
              className="cursor-pointer hover:bg-red-500/10 text-red-400 hover:text-red-300"
            >
              <Ban className="w-4 h-4 mr-2" />
              Ban User
            </DropdownMenuItem>
          )}
          
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

      {/* 🆕 NEW: Unban Modal */}
      {showUnbanUser && (
        <UnbanUserModal
          user={user}
          onClose={() => setShowUnbanUser(false)}
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