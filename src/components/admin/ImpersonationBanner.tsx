// src/components/admin/ImpersonationBanner.tsx
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { LogOut, Eye, ArrowLeft, Activity, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Show session expiry countdown from the real expires_at stored on start.
  useEffect(() => {
    if (!isImpersonating) return;

    const readExpiry = (): number | null => {
      try {
        const raw = localStorage.getItem('imp_meta');
        const meta = raw ? JSON.parse(raw) : null;
        return meta?.expiresAt ? new Date(meta.expiresAt).getTime() : null;
      } catch {
        return null;
      }
    };

    const tick = () => {
      const expiry = readExpiry();
      if (!expiry) {
        setTimeRemaining('');
        return;
      }
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setTimeRemaining(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };

    tick(); // initial
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [isImpersonating]);

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <>
      {/* 🔵 ULTRA-MODERN GLASSMORPHISM BANNER WITH SESSION INFO */}
      <div 
        className="fixed top-0 left-0 right-0 z-[9999]"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(147, 197, 253, 0.2)',
          boxShadow: '0 4px 30px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="max-w-full px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Left side - Elegant Indicator */}
            <div className="flex items-center gap-4">
              {/* Animated Pulse Icon */}
              <div 
                className="relative flex items-center justify-center w-8 h-8 rounded-full"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 20px rgba(147, 197, 253, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
                <div 
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ 
                    background: 'rgba(147, 197, 253, 0.4)',
                    animationDuration: '2s'
                  }}
                />
              </div>

              {/* Mode Badge with Glow */}
              <div 
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-xs uppercase tracking-wider"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }}
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" style={{ animationDuration: '2s' }} />
                <span>Admin View</span>
              </div>
              
              {/* Divider */}
              <div 
                className="w-px h-6"
                style={{ 
                  background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
                }}
              />
              
              {/* User Info Card */}
              <div 
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  {(impersonatedUser.name || impersonatedUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80 font-medium">Viewing:</span>
                  <span className="text-sm font-bold text-white">
                    {impersonatedUser.name || impersonatedUser.email}
                  </span>
                </div>
              </div>

              {/* Session Info Badge */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ 
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-xs text-emerald-200 font-medium">
                  Secure Session • {timeRemaining}
                </span>
              </div>
            </div>

            {/* Right side - Premium EXIT Button */}
            <button
              onClick={stopImpersonation}
              className="group flex items-center gap-2.5 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Exit & Return
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-[52px]" />

      {/* 🔵 ELEGANT SIDE INDICATORS */}
      <div 
        className="fixed top-0 left-0 bottom-0 w-[3px] z-[9998]"
        style={{
          background: 'linear-gradient(180deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.8) 50%, rgba(59, 130, 246, 0) 100%)',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
        }}
      />
      <div 
        className="fixed top-0 right-0 bottom-0 w-[3px] z-[9998]"
        style={{
          background: 'linear-gradient(180deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.8) 50%, rgba(59, 130, 246, 0) 100%)',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
        }}
      />
    </>
  );
};