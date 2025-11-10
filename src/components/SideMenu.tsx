import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { ChevronRight, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeDomain } = useDomain();
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔐 Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        // ✅ CRITICAL: When impersonating, check the ORIGINAL admin's status
        const savedImpersonation = localStorage.getItem('impersonation_data');
        let userIdToCheck = user.id;

        if (savedImpersonation) {
          const data = JSON.parse(savedImpersonation);
          userIdToCheck = data.originalAdminId;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role, account_type')
          .eq('id', userIdToCheck)
          .single();

        if (!error && data) {
          const isAdminUser = 
            data.role === 'admin' || 
            data.role === 'super_admin' || 
            data.account_type === 'admin';
          
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [user?.id, isImpersonating]);

  const handleNavigation = (path: string) => {
    const isLocked = (activeDomain as any).locked === true;
    
    if (isLocked) {
      return;
    }
    navigate(path);
  };

  return (
    <aside 
      className="hidden lg:flex w-64 flex-col border-r backdrop-blur-sm"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        background: 'linear-gradient(to bottom, rgba(15,15,15,0.98), rgba(18,18,18,0.95))'
      }}
    >
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {activeDomain.sidebar
          .filter(item => {
            // 🔐 Filter out admin-only items for non-admins
            if (item.adminOnly && !isAdmin) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            const isLocked = (activeDomain as any).locked === true;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isLocked
                    ? 'cursor-not-allowed opacity-40 text-[#A0A0A0]'
                    : isActive
                    ? 'bg-[#C9A646]/10 text-[#C9A646]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]'
                }`}
                style={isActive ? { 
                  boxShadow: '0 0 10px rgba(201,166,70,0.12)',
                  borderLeft: '3px solid #C9A646'
                } : {}}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="flex-1 text-left">{item.label}</span>
                {isLocked ? (
                  <Lock className="h-3.5 w-3.5 opacity-60" />
                ) : isActive ? (
                  <ChevronRight className="h-4 w-4" />
                ) : null}
                {item.adminOnly && isAdmin && (
                  <Shield 
                    className="h-3.5 w-3.5 text-[#C9A646]" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.5))' }}
                  />
                )}
              </button>
            );
          })}
      </div>
    </aside>
  );
};

export default Sidebar;