// ================================================
// TOP SECRET PAGE - Router Component v3.1
// ================================================

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import JournalDiscountPopup from '@/components/JournalDiscountPopup';

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

const PAYMENT_SUCCESS_DELAY = 1500;

// ========================================
// LOADING COMPONENT
// ========================================

const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
    <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
  </div>
);

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [status, setStatus] = useState<TopSecretStatus | null>(null);
  const [showJournalDiscount, setShowJournalDiscount] = useState(false);
  const [hasShownDiscount, setHasShownDiscount] = useState(false);

  const isPaymentReturn = searchParams.get('payment') === 'success';

  // Check Top Secret Status
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
      const isActive = profile?.top_secret_status === 'active' && profile?.top_secret_enabled === true;
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

  // Handle Payment Success
  useEffect(() => {
    if (pageState !== 'checking_payment') return;

    setSearchParams({});

    setTimeout(() => {
      setPageState('payment_success');

      const hasDismissedDiscount = localStorage.getItem('journal_discount_dismissed') === 'true';

      setTimeout(() => {
        if (!hasDismissedDiscount && !hasShownDiscount) {
          setShowJournalDiscount(true);
          setHasShownDiscount(true);
        } else {
          setPageState('show_dashboard');
        }
      }, PAYMENT_SUCCESS_DELAY);
    }, 500);
  }, [pageState, setSearchParams, hasShownDiscount]);

  // Initial Load
  useEffect(() => {
    async function initializePage() {
      if (authLoading) return;

      if (!user?.id) {
        setStatus({ isActive: false, isAdmin: false, status: null, expiresAt: null });
        setPageState('show_landing');
        return;
      }

      const currentStatus = await checkTopSecretStatus();

      if (currentStatus?.isAdmin) {
        navigate('/app/top-secret/admin', { replace: true });
        return;
      }

      if (isPaymentReturn) {
        setStatus(currentStatus);
        setPageState('checking_payment');
        return;
      }

      setStatus(currentStatus);
      setPageState(currentStatus?.isActive ? 'show_dashboard' : 'show_landing');
    }

    initializePage();
  }, [user, authLoading, navigate, isPaymentReturn, checkTopSecretStatus]);

  // Handlers
  const handleJournalDiscountClose = () => {
    setShowJournalDiscount(false);
    setPageState('show_dashboard');
  };

  const handleJournalDiscountDismiss = () => {
    setShowJournalDiscount(false);
    localStorage.setItem('journal_discount_dismissed', 'true');
    setPageState('show_dashboard');
  };

  // Render states
  if (authLoading || pageState === 'loading') {
    return <PageLoader />;
  }

  if (pageState === 'checking_payment') {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <motion.div
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Payment Successful!</h2>
          <p className="text-gray-400">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (pageState === 'payment_success') {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <JournalDiscountPopup
          isOpen={showJournalDiscount}
          onClose={handleJournalDiscountClose}
          onDismiss={handleJournalDiscountDismiss}
        />
        {!showJournalDiscount && (
          <motion.div
            className="text-center max-w-md mx-auto p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to Top Secret!</h2>
            <p className="text-gray-400">
              Your 14-day free trial has started.
              <br />
              <span className="text-amber-400">Check your notification center for updates!</span>
            </p>
          </motion.div>
        )}
      </div>
    );
  }

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
