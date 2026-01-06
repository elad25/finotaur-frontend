// ================================================
// TOP SECRET PAGE - Router Component v3.0
// File: src/pages/app/TopSecret/TopSecretPage.tsx
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
import { Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

const MAX_POLL_ATTEMPTS = 15;  // 15 attempts × 2 seconds = 30 seconds max wait
const POLL_INTERVAL = 2000;   // 2 seconds between checks

// ========================================
// COMPONENT
// ========================================

export default function TopSecretPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [status, setStatus] = useState<TopSecretStatus | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  // Poll for Subscription Status (after payment)
  // ========================================
  
  useEffect(() => {
    let pollTimer: NodeJS.Timeout | null = null;

    async function pollForSubscription() {
      if (pageState !== 'checking_payment') return;
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        // Max attempts reached - show error state
        setErrorMessage('Payment received but not yet updated in the system. Try refreshing the page in a few minutes.');
        setPageState('show_landing');
        return;
      }

      console.log(`🔄 Polling for subscription... attempt ${pollAttempts + 1}/${MAX_POLL_ATTEMPTS}`);
      
      const newStatus = await checkTopSecretStatus();
      
      if (newStatus?.isActive) {
        // Subscription is now active!
        console.log('Subscription confirmed!');
        setStatus(newStatus);
        setPageState('payment_success');

        // Clear URL params
        setSearchParams({});

        // Check if user has already dismissed the discount
        const hasDismissedDiscount = localStorage.getItem('journal_discount_dismissed') === 'true';

        // Show Journal discount popup after a brief celebration (if not dismissed before)
        setTimeout(() => {
          if (!hasDismissedDiscount && !hasShownDiscount) {
            setShowJournalDiscount(true);
            setHasShownDiscount(true);
          } else {
            // If already dismissed, go directly to dashboard
            setPageState('show_dashboard');
          }
        }, 2500); // Show success message for 2.5 seconds before popup

        return;
      }

      // Not active yet, try again
      setPollAttempts(prev => prev + 1);
      pollTimer = setTimeout(pollForSubscription, POLL_INTERVAL);
    }

    if (pageState === 'checking_payment') {
      pollForSubscription();
    }

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [pageState, pollAttempts, checkTopSecretStatus, setSearchParams]);

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

      // If returning from payment and not yet active, start polling
      if (isPaymentReturn && !currentStatus?.isActive) {
        console.log('🔄 Payment return detected, starting subscription check...');
        setStatus(currentStatus);
        setPageState('checking_payment');
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

  // Checking payment state (polling)
  if (pageState === 'checking_payment') {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <motion.div 
              className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-amber-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Verifying Payment...
          </h2>
          <p className="text-gray-400 mb-6">
            Payment received! Waiting for confirmation...
            <br />
            <span className="text-sm text-gray-500">
              Check {pollAttempts + 1} of {MAX_POLL_ATTEMPTS}
            </span>
          </p>
          
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((pollAttempts + 1) / MAX_POLL_ATTEMPTS) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <p className="text-xs text-gray-600 mt-4">
            If this takes too long, try refreshing the page
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

  // Error message (if any)
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-3">
            Waiting for Confirmation
          </h2>
          <p className="text-gray-400 mb-6">
            {errorMessage}
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Refresh Page
          </button>
        </motion.div>
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
      {pageState === 'show_dashboard' ? <TopSecretDashboard /> : <TopSecretLanding />}
    </React.Suspense>
  );
}