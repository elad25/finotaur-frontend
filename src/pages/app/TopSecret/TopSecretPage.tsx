// ================================================
// TOP SECRET PAGE - Router Component v3.1
// File: src/pages/app/TopSecret/TopSecretPage.tsx
//
// 🔥 v3.1 CHANGES:
// - FIXED: Pass userId to TopSecretDashboard instead of using useAuth inside
// - This fixes "useAuth must be used within AuthProvider" error
//
// 🔥 v3.0 CHANGES:
// - Added Journal discount popup after payment success
// - Shows 25% one-time discount offer for Trading Journal
// - Improved payment success flow
//
// 🔥 v2.0 CHANGES:
// - Added payment success detection from URL params
// - Added polling for subscription status after payment
// - Added loading state during webhook processing
// - Better UX for new subscribers
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import JournalDiscountPopup from '@/components/JournalDiscountPopup';

// Lazy load the components
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

type PageState =
  | 'loading'           // Initial load
  | 'checking_payment'  // After payment, waiting for webhook
  | 'payment_success'   // Payment confirmed, show success + discount offer
  | 'show_landing'      // Not subscribed, show landing
  | 'show_dashboard';   // Subscribed, show dashboard

// ========================================
// CONSTANTS
// ========================================

const PAYMENT_SUCCESS_DELAY = 1500;  // Brief success message before redirect

// ========================================
// COMPONENT
// ========================================

export default function TopSecretPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [status, setStatus] = useState<TopSecretStatus | null>(null);
  // Journal discount popup state
  const [showJournalDiscount, setShowJournalDiscount] = useState(false);
  const [hasShownDiscount, setHasShownDiscount] = useState(false);

  // Check if returning from payment
  const isPaymentReturn = searchParams.get('payment') === 'success';
  const paymentSource = searchParams.get('source');

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

  // ========================================
  // Handle Payment Success (no polling - trust webhook)
  // ========================================
  
  useEffect(() => {
    if (pageState !== 'checking_payment') return;

    console.log('✅ Payment detected, showing success and redirecting...');
    
    // Clear URL params immediately
    setSearchParams({});
    
    // Show brief success, then go to dashboard
    // The webhook will update the DB - we trust it
    setTimeout(() => {
      setPageState('payment_success');
      
      // Check if user has already dismissed the discount
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

  // ========================================
  // Initial Load
  // ========================================
  
  useEffect(() => {
    async function initializePage() {
      if (authLoading) return;

      // If not logged in, show landing page
      if (!user?.id) {
        setStatus({
          isActive: false,
          isAdmin: false,
          status: null,
          expiresAt: null,
        });
        setPageState('show_landing');
        return;
      }

      // Check current status
      const currentStatus = await checkTopSecretStatus();

      // Handle admin redirect
      if (currentStatus?.isAdmin) {
        navigate('/app/top-secret/admin', { replace: true });
        return;
      }

      // If returning from payment - show success and trust webhook
      if (isPaymentReturn) {
        console.log('✅ Payment return detected');
        setStatus(currentStatus);
        setPageState('checking_payment'); // Will trigger the success flow
        return;
      }

      // Otherwise, set status and show appropriate page
      setStatus(currentStatus);
      setPageState(currentStatus?.isActive ? 'show_dashboard' : 'show_landing');
    }

    initializePage();
  }, [user, authLoading, navigate, isPaymentReturn, checkTopSecretStatus]);

  // ========================================
  // Render States
  // ========================================

  // Loading state
  if (authLoading || pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Checking payment state - brief loading
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
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Payment Successful!
          </h2>
          <p className="text-gray-400">
            Redirecting to your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  // Handle Journal discount popup close
  const handleJournalDiscountClose = () => {
    setShowJournalDiscount(false);
    setPageState('show_dashboard');
  };

  // Handle Journal discount dismiss
  const handleJournalDiscountDismiss = () => {
    setShowJournalDiscount(false);
    localStorage.setItem('journal_discount_dismissed', 'true');
    setPageState('show_dashboard');
  };

  // Payment success state (brief celebration + discount offer)
  if (pageState === 'payment_success') {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        {/* Journal Discount Popup */}
        <JournalDiscountPopup
          isOpen={showJournalDiscount}
          onClose={handleJournalDiscountClose}
          onDismiss={handleJournalDiscountDismiss}
        />

        {/* Success Animation (shown briefly before popup) */}
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

            <h2 className="text-2xl font-bold text-white mb-3">
              Welcome to Top Secret!
            </h2>
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

  // Render appropriate page based on status
  // 🔥 Pass userId to TopSecretDashboard
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      }
    >
      {pageState === 'show_dashboard' ? (
        <TopSecretDashboard userId={user?.id} />
      ) : (
        <TopSecretLanding />
      )}
    </React.Suspense>
  );
}