// ================================================
// TOP SECRET PAGE - Router Component
// File: src/pages/app/TopSecret/TopSecretPage.tsx
// ================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

// Lazy load the components - same folder (TopSecret/)
const TopSecretLanding = React.lazy(() => import('./TopSecretLanding'));
const TopSecretDashboard = React.lazy(() => import('./TopSecretDashboard'));

// ========================================
// TYPES
// ========================================

interface TopSecretStatus {
  isActive: boolean;
  isAdmin: boolean;
  status: 'inactive' | 'active' | 'cancelled' | null;
  expiresAt: Date | null;
}

// ========================================
// COMPONENT
// ========================================

export default function TopSecretPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<TopSecretStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (authLoading) return;
      
      // If not logged in, show landing page
      if (!user?.id) {
        setStatus({
          isActive: false,
          isAdmin: false,
          status: null,
          expiresAt: null,
        });
        setIsLoading(false);
        return;
      }

      try {
        // Check user's role and top_secret status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, top_secret_enabled, top_secret_status, top_secret_expires_at')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        
        // If admin, redirect to admin panel
        if (isAdmin) {
          navigate('/app/top-secret/admin', { replace: true });
          return;
        }

        // Check if subscription is active
        const isActive = profile?.top_secret_status === 'active' && profile?.top_secret_enabled === true;
        
        // Check if subscription hasn't expired
        const expiresAt = profile?.top_secret_expires_at ? new Date(profile.top_secret_expires_at) : null;
        const isExpired = expiresAt && expiresAt < new Date();

        setStatus({
          isActive: isActive && !isExpired,
          isAdmin: false,
          status: profile?.top_secret_status || 'inactive',
          expiresAt,
        });
      } catch (error) {
        console.error('Error checking top secret access:', error);
        setStatus({
          isActive: false,
          isAdmin: false,
          status: null,
          expiresAt: null,
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [user, authLoading, navigate]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Render appropriate page based on status
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      }
    >
      {status?.isActive ? <TopSecretDashboard /> : <TopSecretLanding />}
    </React.Suspense>
  );
}