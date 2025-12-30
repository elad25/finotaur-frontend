// =====================================================
// FINOTAUR WHOP CHECKOUT HOOK - v3.0.0
// =====================================================
// Place in: src/hooks/useWhopCheckout.ts
// 
// 🔥 v3.0.0 CHANGES:
// - Now uses Edge Function to create checkout sessions
// - This ensures metadata (finotaur_user_id) is passed to Whop
// - Fallback to direct URL if Edge Function fails
// =====================================================

import { useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  buildWhopCheckoutUrl, 
  getPlanId, 
  PLANS,
  WHOP_PLAN_IDS,
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
// HELPER: Get Whop Plan ID from plan name and interval
// ============================================

function getWhopPlanId(planName: PlanName, billingInterval: BillingInterval): string {
  const key = `${planName}_${billingInterval}` as keyof typeof WHOP_PLAN_IDS;
  return WHOP_PLAN_IDS[key] || '';
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
   * 🔥 v3.0.0: Create checkout session via Edge Function
   * This ensures metadata is properly passed to Whop webhooks
   */
  const createCheckoutSession = useCallback(async (params: {
    planId: string;
    affiliateCode?: string;
    clickId?: string;
  }): Promise<{ checkout_url: string } | null> => {
    const { planId, affiliateCode, clickId } = params;

    try {
      console.log('🔐 Creating checkout session via Edge Function...');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        console.warn('⚠️ No access token, falling back to direct URL');
        return null;
      }

      const response = await supabase.functions.invoke('create-whop-checkout', {
        body: {
          plan_id: planId,
          affiliate_code: affiliateCode,
          click_id: clickId,
        },
      });

      if (response.error) {
        console.error('❌ Edge Function error:', response.error);
        return null;
      }

      if (response.data?.checkout_url) {
        console.log('✅ Checkout session created:', {
          checkout_url: response.data.checkout_url,
          checkout_id: response.data.checkout_id,
          metadata: response.data.metadata,
        });
        return { checkout_url: response.data.checkout_url };
      }

      console.warn('⚠️ No checkout_url in response');
      return null;

    } catch (err) {
      console.error('❌ Failed to create checkout session:', err);
      return null;
    }
  }, []);

  /**
   * Initiate Whop checkout
   * 
   * 🔥 v3.0.0: Now uses Edge Function to ensure metadata is passed
   */
  const initiateCheckout = useCallback(async (params: CheckoutParams) => {
    const { planName, billingInterval, discountCode } = params;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get plan info
      const planId = getPlanId(planName, billingInterval);
      const plan = PLANS[planId];
      const whopPlanId = getWhopPlanId(planName, billingInterval);
      
      if (!plan || !whopPlanId) {
        throw new Error(`Invalid plan: ${planName} ${billingInterval}`);
      }

      // Get stored affiliate data
      const { code: storedCode, clickId } = getStoredAffiliateData();
      
      // Use provided discount code OR stored affiliate code
      const affiliateCode = discountCode || storedCode;

      console.log('🛒 Initiating Whop checkout:', {
        planId,
        whopPlanId,
        planName,
        billingInterval,
        price: plan.price,
        userId: user?.id,
        userEmail: user?.email,
        providedDiscountCode: discountCode,
        storedCode,
        finalAffiliateCode: affiliateCode,
        clickId,
      });

      // Show toast before redirect
      toast.info('Creating secure checkout...', {
        description: `${plan.displayName} - $${plan.price}${plan.periodLabel}`,
        duration: 3000,
      });

      // 🔥 TRY EDGE FUNCTION FIRST (for proper metadata)
      const checkoutSession = await createCheckoutSession({
        planId: whopPlanId,
        affiliateCode: affiliateCode || undefined,
        clickId: clickId || undefined,
      });

      let checkoutUrl: string;

      if (checkoutSession?.checkout_url) {
        // ✅ Edge Function succeeded - metadata will be in webhook!
        checkoutUrl = checkoutSession.checkout_url;
        console.log('✅ Using Edge Function checkout URL (metadata included)');
      } else {
        // ⚠️ Fallback to direct URL (metadata may not work)
        console.warn('⚠️ Falling back to direct URL (metadata may not be passed)');
        checkoutUrl = buildWhopCheckoutUrl({
          planId,
          userEmail: user?.email || undefined,
          userId: user?.id || undefined,
          affiliateCode: affiliateCode || undefined,
          clickId: clickId || undefined,
          redirectUrl: 'https://www.finotaur.com',
        });
      }

      console.log('🔗 Final checkout URL:', checkoutUrl);

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
  }, [user, options, createCheckoutSession]);

  /**
   * Quick checkout helpers
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
    userId: user?.id,
    isAuthenticated: !!user,
  };
}

// ============================================
// STANDALONE CHECKOUT FUNCTION (Legacy support)
// ============================================

export function redirectToWhopCheckout(
  planName: PlanName,
  billingInterval: BillingInterval,
  userEmail?: string,
  userId?: string,
  affiliateCode?: string
): void {
  const planId = getPlanId(planName, billingInterval);
  
  // Get stored affiliate data if not provided
  const { code: storedCode, clickId } = getStoredAffiliateData();
  
  const checkoutUrl = buildWhopCheckoutUrl({
    planId,
    userEmail,
    userId,
    affiliateCode: affiliateCode || storedCode || undefined,
    clickId: clickId || undefined,
    redirectUrl: 'https://www.finotaur.com',
  });
  
  console.log('🔗 Redirect to checkout:', checkoutUrl);
  window.location.href = checkoutUrl;
}