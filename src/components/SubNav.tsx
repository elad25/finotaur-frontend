import { useNavigate } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { Lock, Shield } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export const SubNav = () => {
  const navigate = useNavigate();
  const { activeDomain, isActive } = useDomain();
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔐 Check if user is admin by fetching role from profiles table
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
          console.log('🎭 Checking admin status for original admin:', userIdToCheck);
        }

        // ✅ FIX: Only check role column - account_type is for subscription level
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userIdToCheck)
          .single();

        if (!error && data) {
          const isAdminUser = 
            data.role === 'admin' || 
            data.role === 'super_admin';
          
          console.log('🔐 Admin status check:', {
            userId: userIdToCheck,
            role: data.role,
            isAdmin: isAdminUser,
            isImpersonating
          });
          
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
    // ✅ FIX: Safe check for locked property
    const isLocked = (activeDomain as any).locked === true;
    
    if (isLocked) {
      // Optional: Show toast notification
      // toast.error("This section is coming soon!");
      return;
    }
    navigate(path);
  };

  return (
    <div 
      className="sticky top-16 z-40 border-b backdrop-blur-md"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        background: 'linear-gradient(to bottom, rgba(15,15,15,0.98), rgba(18,18,18,0.95))'
      }}
    >
      <div className="flex h-12 items-center gap-1 overflow-x-auto px-4 lg:px-6 scrollbar-hide">
        {activeDomain.subNav
          .filter(item => {
            // 🎭 HIDE ADMIN DASHBOARD WHEN IMPERSONATING
            if (isImpersonating && item.adminOnly) {
              console.log('🎭 Hiding admin item during impersonation:', item.label);
              return false;
            }
            
            // 🔐 Filter out admin-only items for non-admins
            if (item.adminOnly && !isAdmin) {
              return false;
            }
            return true;
          })
          .map((item) => {
            // ✅ FIX: Safe check for locked property
            const locked = (activeDomain as any).locked === true;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                disabled={locked}
                className={`relative flex-shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                  locked
                    ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                    : active
                    ? 'bg-[#C9A646]/10 text-[#C9A646]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]'
                }`}
                style={active ? { 
                  boxShadow: '0 0 10px rgba(201,166,70,0.12)',
                  borderBottom: '2px solid #C9A646'
                } : {}}
              >
                {item.label}
                {locked && <Lock className="h-3 w-3 opacity-60" />}
                {item.adminOnly && isAdmin && !isImpersonating && (
                  <Shield 
                    className="h-3 w-3 text-[#C9A646]" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.5))' }}
                  />
                )}
                
                {/* Active indicator glow */}
                {active && (
                  <span 
                    className="absolute inset-0 rounded-md opacity-20 blur-sm"
                    style={{ background: '#C9A646' }}
                  />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};

// ✅ CRITICAL: Add this line at the end!
export default SubNav;