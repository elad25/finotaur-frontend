// =====================================================
// FINOTAUR WAR ZONE PAGE v3.0 - OPTIMIZED
// 🔥 PERFORMANCE: Code splitting & lazy loading
// 🔥 SINGLE API CALL: Unified user status hook
// 🔥 SKELETON: Instant visual feedback
// =====================================================

import { lazy, Suspense, memo, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useUnifiedUserStatus } from '@/hooks/useUserStatus';
import { WarZonePageSkeleton } from '@/components/warzone/LoadingSkeleton';
import { supabase } from '@/lib/supabase';
import { X, XCircle, Loader2 } from 'lucide-react';

// 🔥 LAZY LOAD: Landing page (for non-subscribers)
const WarZoneLanding = lazy(() => 
  import('@/pages/app/all-markets/Warzonelanding')
);

// 🔥 LAZY LOAD: Active subscriber view
const ActiveSubscriberView = lazy(() => 
  import('@/components/warzone/ActiveSubscriberView')
);

// 🔥 LAZY LOAD: Admin panel (only for admins)
const NewsletterSub = lazy(() => 
  import('@/pages/app/journal/admin/NewsletterSub')
);

// ============================================
// CANCEL SUBSCRIPTION MODAL
// ============================================

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialDaysRemaining: number | null;
  onSuccess: () => void;
}

const CancelSubscriptionModal = memo(function CancelSubscriptionModal({
  isOpen,
  onClose,
  trialDaysRemaining,
  onSuccess,
}: CancelModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleCancel = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-cancel', { 
        body: { action: 'cancel' } 
      });
      
      if (error) throw error;
      if (data?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(data?.error || 'Failed to cancel');
      }
    } catch (e) {
      console.error('Cancel failed:', e);
      alert('Failed to cancel. Contact support@finotaur.com');
    } finally {
      setIsProcessing(false);
    }
  }, [onSuccess, onClose]);

  if (!isOpen) return null;
  
  const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-red-500/30 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Cancel Subscription</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-500/10">
            <X className="w-5 h-5 text-red-400/60" />
          </button>
        </div>
        <div className="p-6">
          {isInTrial && (
            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20 mb-6">
              <p className="text-green-400 font-semibold text-sm">
                Free trial - {trialDaysRemaining} days left. Cancel = no charge.
              </p>
            </div>
          )}
          <p className="text-[#C9A646]/70 text-center mb-6">Are you sure?</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={onClose} 
              className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black"
            >
              Keep Subscription
            </button>
            <button 
              onClick={handleCancel} 
              disabled={isProcessing} 
              className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN WAR ZONE PAGE
// ============================================

interface WarZonePageProps {
  previewMode?: 'landing' | 'subscriber' | null;
}

function WarZonePage({ previewMode = null }: WarZonePageProps) {
  const { user } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // 🔥 SINGLE API CALL for all user status
  const { 
    warZone, 
    meta, 
    isLoading,
    refresh,
  } = useUnifiedUserStatus();

  // Convert to NewsletterStatus format for backward compatibility
  const newsletterStatus = {
    newsletter_enabled: warZone.isActive || warZone.isInTrial,
    newsletter_status: warZone.status,
    newsletter_whop_membership_id: warZone.membershipId,
    newsletter_started_at: null,
    newsletter_expires_at: warZone.expiresAt,
    newsletter_trial_ends_at: warZone.trialEndsAt,
    newsletter_cancel_at_period_end: warZone.cancelAtPeriodEnd,
    days_until_expiry: warZone.daysRemaining,
    days_until_trial_ends: warZone.trialDaysRemaining,
    is_in_trial: warZone.isInTrial,
    is_active: warZone.isActive,
  };

  // ============================================
  // PREVIEW MODE OVERRIDES
  // ============================================
  
  if (previewMode === 'landing') {
    return (
      <Suspense fallback={<WarZonePageSkeleton />}>
        <WarZoneLanding />
      </Suspense>
    );
  }
  
  if (previewMode === 'subscriber') {
    const mockStatus = {
      newsletter_enabled: true,
      newsletter_status: 'active',
      newsletter_whop_membership_id: 'preview_mock',
      newsletter_started_at: new Date().toISOString(),
      newsletter_expires_at: null,
      newsletter_trial_ends_at: null,
      newsletter_cancel_at_period_end: false,
      days_until_expiry: null,
      days_until_trial_ends: null,
      is_in_trial: false,
      is_active: true,
    };
    
    return (
      <Suspense fallback={<WarZonePageSkeleton />}>
        <ActiveSubscriberView 
          newsletterStatus={mockStatus}
          onCancelClick={() => alert('Cancel disabled in preview mode')}
          isTester={false}
        />
      </Suspense>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================
  
  if (isLoading) {
    return <WarZonePageSkeleton />;
  }

  // ============================================
  // ADMIN VIEW
  // ============================================
  
  if (meta.isAdmin) {
    return (
      <Suspense fallback={<WarZonePageSkeleton />}>
        <NewsletterSub />
      </Suspense>
    );
  }

  // ============================================
  // ACTIVE SUBSCRIBER VIEW
  // ============================================
  
  if (warZone.isActive) {
    return (
      <>
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          trialDaysRemaining={warZone.trialDaysRemaining}
          onSuccess={refresh}
        />
        <Suspense fallback={<WarZonePageSkeleton />}>
          <ActiveSubscriberView 
            newsletterStatus={newsletterStatus}
            onCancelClick={() => setShowCancelModal(true)}
            isTester={meta.isTester}
          />
        </Suspense>
      </>
    );
  }

  // ============================================
  // LANDING PAGE (NON-SUBSCRIBER)
  // ============================================
  
  return (
    <Suspense fallback={<WarZonePageSkeleton />}>
      <WarZoneLanding previewMode={null} />
    </Suspense>
  );
}

export default memo(WarZonePage);