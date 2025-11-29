// =====================================================
// FINOTAUR WHOP CHECKOUT HOOK - v2.1.0
// =====================================================
// Place in: src/hooks/useWhopCheckout.ts
// 
// Hook for initiating Whop checkout with affiliate tracking
// 
// 🔥 v2.1.0 CHANGES:
// - Fixed localStorage key sync with useAffiliateDiscount
// - Added fallback to JSON storage
// - Better expiration handling
// =====================================================

import { useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { 
  buildWhopCheckoutUrl, 
  getPlanId, 
  PLANS,
  type PlanName, 
  type BillingInterval,
  type PlanId 
} from '@/lib/whop-config';
import { toast } from 'sonner';

// ============================================
// STORAGE KEYS - Must match useAffiliateDiscount!
// ============================================

const STORAGE_KEYS = {
  code: 'finotaur_affiliate_code',
  clickId: 'finotaur_affiliate_click_id',
  expires: 'finotaur_affiliate_expires',
  fullData: 'finotaur_affiliate',
};

// ============================================
// HELPER: Get stored affiliate data
// ============================================

function getStoredAffiliateData(): { code: string | null; clickId: string | null } {
  try {
    // Check expiration first
    const expires = localStorage.getItem(STORAGE_KEYS.expires);
    if (expires && Number(expires) < Date.now()) {
      // Clear expired data
      console.log('⏰ Affiliate data expired, clearing...');
      localStorage.removeItem(STORAGE_KEYS.code);
      localStorage.removeItem(STORAGE_KEYS.clickId);
      localStorage.removeItem(STORAGE_KEYS.expires);
      localStorage.removeItem(STORAGE_KEYS.fullData);
      return { code: null, clickId: null };
    }

    // Try standard keys first
    let code = localStorage.getItem(STORAGE_KEYS.code);
    let clickId = localStorage.getItem(STORAGE_KEYS.clickId);
    
    // Fallback: try JSON storage if standard key is empty
    if (!code) {
      const jsonData = localStorage.getItem(STORAGE_KEYS.fullData);
      if (jsonData) {
        try {
          const parsed = JSON.parse(jsonData);
          code = parsed.code || null;
          clickId = parsed.clickId || clickId || null;
          console.log('📦 Got affiliate code from JSON storage:', code);
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
    
    if (code) {
      console.log('📦 Found affiliate data:', { code, clickId });
    }
    
    return { code, clickId };
  } catch (err) {
    console.error('Error reading affiliate data:', err);
    return { code: null, clickId: null };
  }
}

// ============================================
// HOOK
// ============================================

export interface UseWhopCheckoutOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface CheckoutParams {
  planName: PlanName;
  billingInterval: BillingInterval;
  discountCode?: string;
}

export function useWhopCheckout(options: UseWhopCheckoutOptions = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initiate Whop checkout
   */
  const initiateCheckout = useCallback(async (params: CheckoutParams) => {
    const { planName, billingInterval, discountCode } = params;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get plan ID
      const planId = getPlanId(planName, billingInterval);
      const plan = PLANS[planId];
      
      if (!plan) {
        throw new Error(`Invalid plan: ${planName} ${billingInterval}`);
      }

      // Get stored affiliate data
      const { code: storedCode, clickId } = getStoredAffiliateData();
      
      // Use provided discount code OR stored affiliate code
      const affiliateCode = discountCode || storedCode;

      console.log('🛒 Initiating Whop checkout:', {
        planId,
        planName,
        billingInterval,
        price: plan.price,
        userEmail: user?.email,
        providedDiscountCode: discountCode,
        storedCode,
        finalAffiliateCode: affiliateCode,
        clickId,
      });

      // Build checkout URL
      const checkoutUrl = buildWhopCheckoutUrl({
        planId,
        userEmail: user?.email || undefined,
        affiliateCode: affiliateCode || undefined,
        clickId: clickId || undefined,
        redirectUrl: 'https://www.finotaur.com',
      });

      console.log('🔗 Checkout URL:', checkoutUrl);

      // Verify the URL contains the affiliate code
      if (affiliateCode && !checkoutUrl.includes(`d=${affiliateCode}`)) {
        console.warn('⚠️ Affiliate code not found in URL!');
      }

      // Show toast before redirect
      toast.info('Redirecting to secure checkout...', {
        description: `${plan.displayName} - $${plan.price}${plan.periodLabel}`,
        duration: 2000,
      });

      // Redirect to Whop checkout
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 500);

      options.onSuccess?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      console.error('❌ Checkout error:', err);
      setError(errorMessage);
      toast.error('Checkout failed', { description: errorMessage });
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  /**
   * Quick checkout for a specific plan
   */
  const checkoutBasicMonthly = useCallback(() => {
    initiateCheckout({ planName: 'basic', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  const checkoutBasicYearly = useCallback(() => {
    initiateCheckout({ planName: 'basic', billingInterval: 'yearly' });
  }, [initiateCheckout]);

  const checkoutPremiumMonthly = useCallback(() => {
    initiateCheckout({ planName: 'premium', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  const checkoutPremiumYearly = useCallback(() => {
    initiateCheckout({ planName: 'premium', billingInterval: 'yearly' });
  }, [initiateCheckout]);

  return {
    initiateCheckout,
    checkoutBasicMonthly,
    checkoutBasicYearly,
    checkoutPremiumMonthly,
    checkoutPremiumYearly,
    isLoading,
    error,
    userEmail: user?.email,
    isAuthenticated: !!user,
  };
}

// ============================================
// STANDALONE CHECKOUT FUNCTION
// ============================================

export function redirectToWhopCheckout(
  planName: PlanName,
  billingInterval: BillingInterval,
  userEmail?: string,
  affiliateCode?: string
): void {
  const planId = getPlanId(planName, billingInterval);
  
  // Get stored affiliate data if not provided
  const { code: storedCode, clickId } = getStoredAffiliateData();
  
  const checkoutUrl = buildWhopCheckoutUrl({
    planId,
    userEmail,
    affiliateCode: affiliateCode || storedCode || undefined,
    clickId: clickId || undefined,
    redirectUrl: 'https://www.finotaur.com',
  });
  
  console.log('🔗 Redirect to checkout:', checkoutUrl);
  window.location.href = checkoutUrl;
}