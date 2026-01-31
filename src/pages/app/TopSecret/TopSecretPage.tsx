// ================================================
// TOP SECRET PAGE - Router Component v4.0 OPTIMIZED
// File: src/pages/app/TopSecret/TopSecretPage.tsx
// 🔥 v4.0: Removed JournalDiscountPopup, cleaner flow
// ================================================

import React, { useState, useEffect, useCallback, lazy, Suspense, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Lazy load components
const TopSecretLanding = lazy(() => import('./TopSecretLanding'));
const TopSecretDashboard = lazy(() => import('./TopSecretDashboard'));

// ========================================
// TYPES
// ========================================

interface TopSecretStatus {
  isActive: boolean;
  isAdmin: boolean;
  status: 'inactive' | 'active' | 'cancelled' | null;
  expiresAt: Date | null;
}

type PageState = 'loading' | 'checking_payment' | 'payment_success' | 'show_landing' | 'show_dashboard';

const PAYMENT_SUCCESS_DELAY = 2000;

// ========================================
// MEMOIZED LOADING COMPONENT
// ========================================

const PageLoader = memo(function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
    </div>
  );
});

// ========================================
// MEMOIZED SUCCESS MESSAGE COMPONENT
// ========================================

const PaymentSuccessMessage = memo(function PaymentSuccessMessage({ 
  isChecking = false 
}: { 
  isChecking?: boolean 
}) {
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <motion.div
        className="text-center max-w-md mx-auto p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          <CheckCircle className="w-10 h-10 text-green-400" />
        </motion.div>
        
        {isChecking ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Payment Successful!</h2>
            <p className="text-gray-400">Redirecting to your dashboard...</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to Top Secret!</h2>
            <p className="text-gray-400">
              Your 14-day free trial has started.
              <br />
              <span className="text-amber-400">Check your notification center for updates!</span>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
});

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [status, setStatus] = useState<TopSecretStatus | null>(null);

  const isPaymentReturn = searchParams.get('payment') === 'success';

  // ========================================
  // Check Top Secret Status
  // ========================================
  
  const checkTopSecretStatus = useCallback(async (): Promise<TopSecretStatus | null> => {
    if (!user?.id) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, top_secret_enabled, top_secret_status, top_secret_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
      const isActive = ['active', 'trial', 'trialing'].includes(profile?.top_secret_status || '') && profile?.top_secret_enabled === true;
      const expiresAt = profile?.top_secret_expires_at ? new Date(profile.top_secret_expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();

      return {
        isActive: isActive && !isExpired,
        isAdmin,
        status: profile?.top_secret_status || 'inactive',
        expiresAt,
      };
    } catch (error) {
      console.error('Error checking top secret access:', error);
      return null;
    }
  }, [user?.id]);

  // ========================================
  // Handle Payment Success Flow
  // ========================================
  
  useEffect(() => {
    if (pageState !== 'checking_payment') return;

    // Clear URL params
    setSearchParams({});

    // Show success message briefly, then go to dashboard
    const timer = setTimeout(() => {
      setPageState('payment_success');
      
      // After showing success, redirect to dashboard
      const dashboardTimer = setTimeout(() => {
        setPageState('show_dashboard');
      }, PAYMENT_SUCCESS_DELAY);

      return () => clearTimeout(dashboardTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, [pageState, setSearchParams]);

  // ========================================
  // Initial Load
  // ========================================
  
  useEffect(() => {
    async function initializePage() {
      if (authLoading) return;

      // Not logged in - show landing
      if (!user?.id) {
        setStatus({ isActive: false, isAdmin: false, status: null, expiresAt: null });
        setPageState('show_landing');
        return;
      }

      // Check current status
      const currentStatus = await checkTopSecretStatus();

      // Admin redirect
      if (currentStatus?.isAdmin) {
        navigate('/app/top-secret/admin', { replace: true });
        return;
      }

      // Payment return - show success flow
      if (isPaymentReturn) {
        setStatus(currentStatus);
        setPageState('checking_payment');
        return;
      }

      // Normal flow - show appropriate page
      setStatus(currentStatus);
      setPageState(currentStatus?.isActive ? 'show_dashboard' : 'show_landing');
    }

    initializePage();
  }, [user, authLoading, navigate, isPaymentReturn, checkTopSecretStatus]);

  // ========================================
  // Render
  // ========================================

  // Loading state
  if (authLoading || pageState === 'loading') {
    return <PageLoader />;
  }

  // Checking payment state
  if (pageState === 'checking_payment') {
    return <PaymentSuccessMessage isChecking />;
  }

  // Payment success state
  if (pageState === 'payment_success') {
    return <PaymentSuccessMessage />;
  }

  // Main content
  return (
    <Suspense fallback={<PageLoader />}>
      {pageState === 'show_dashboard' ? (
        <TopSecretDashboard userId={user?.id} />
      ) : (
        <TopSecretLanding />
      )}
    </Suspense>
  );
}