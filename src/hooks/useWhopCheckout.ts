// =====================================================
// FINOTAUR WHOP CHECKOUT HOOK - v4.1.0
// =====================================================
// Place in: src/hooks/useWhopCheckout.ts
// 
// 🔥 v4.1.0 CHANGES:
// - FIXED: Email now passed to Edge Function for Whop prefill
// - FIXED: userId passed for better metadata tracking
//
// 🔥 v4.0.0 CHANGES:
// - ADDED: Platform checkout functions (Core/Pro/Enterprise)
// - Platform and Journal are separate checkout flows
// - Added subscription_category to metadata
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
  type PlanId,
  type SubscriptionCategory,
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
   * 🔥 v4.1.0: Create checkout session via Edge Function
   * Now includes email for Whop prefill!
   */
  const createCheckoutSession = useCallback(async (params: {
    planId: string;
    affiliateCode?: string;
    clickId?: string;
    subscriptionCategory?: SubscriptionCategory;
    email?: string;      // 🔥 v4.1: Add email for prefill
    userId?: string;     // 🔥 v4.1: Add userId for metadata
  }): Promise<{ checkout_url: string } | null> => {
    const { planId, affiliateCode, clickId, subscriptionCategory, email, userId } = params;

    try {
      console.log('🔐 Creating checkout session via Edge Function...', { email, userId });

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
          subscription_category: subscriptionCategory,
          email: email,           // 🔥 v4.1: Pass email for Whop prefill
          user_id: userId,        // 🔥 v4.1: Pass userId for metadata
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
   * 🔥 v4.1.0: Now passes email and userId to Edge Function
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
      
      // 🔥 v4.0: Check for coming soon plans
      if (plan.comingSoon) {
        toast.info(`${plan.displayName} is coming soon!`, {
          description: 'Contact sales for early access.',
        });
        return;
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
        category: plan.category,
        userId: user?.id,
        userEmail: user?.email,
        providedDiscountCode: discountCode,
        storedCode,
        finalAffiliateCode: affiliateCode,
        clickId,
      });

      // Show toast before redirect
      toast.info('Creating secure checkout...', {
        description: `${plan.displayName}`,
        duration: 3000,
      });

      // 🔥 Save pending checkout BEFORE redirecting to Whop
      if (user?.id) {
        const checkoutToken = crypto.randomUUID();
        
        try {
          await supabase.from('pending_checkouts').insert({
            user_id: user.id,
            user_email: user.email || '',
            checkout_token: checkoutToken,
            product_type: plan.isNewsletter ? 'newsletter' : 
                          plan.isTopSecret ? 'top_secret' : 'journal',
            billing_interval: billingInterval,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
          
          console.log('✅ Pending checkout saved:', checkoutToken);
        } catch (err) {
          console.warn('⚠️ Failed to save pending checkout:', err);
          // Continue anyway - webhook has other lookup methods
        }
      }

      // 🔥 v4.1: TRY EDGE FUNCTION FIRST (now with email!)
      const checkoutSession = await createCheckoutSession({
        planId: whopPlanId,
        affiliateCode: affiliateCode || undefined,
        clickId: clickId || undefined,
        subscriptionCategory: plan.category,
        email: user?.email || undefined,    // 🔥 v4.1: Pass email!
        userId: user?.id || undefined,      // 🔥 v4.1: Pass userId!
      });

      let checkoutUrl: string;

      if (checkoutSession?.checkout_url) {
        // ✅ Edge Function succeeded - metadata will be in webhook!
        checkoutUrl = checkoutSession.checkout_url;
        console.log('✅ Using Edge Function checkout URL (metadata + email included)');
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

  // ═══════════════════════════════════════════
  // JOURNAL CHECKOUT HELPERS (existing)
  // ═══════════════════════════════════════════

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

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM CHECKOUT HELPERS (NEW)
  // ═══════════════════════════════════════════

  const checkoutPlatformCoreMonthly = useCallback(() => {
    initiateCheckout({ planName: 'platform_core', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  const checkoutPlatformCoreYearly = useCallback(() => {
    initiateCheckout({ planName: 'platform_core', billingInterval: 'yearly' });
  }, [initiateCheckout]);

  const checkoutPlatformFinotaurMonthly = useCallback(() => {
    initiateCheckout({ planName: 'platform_finotaur', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  const checkoutPlatformFinotaurYearly = useCallback(() => {
    initiateCheckout({ planName: 'platform_finotaur', billingInterval: 'yearly' });
  }, [initiateCheckout]);

  const checkoutPlatformEnterpriseMonthly = useCallback(() => {
    initiateCheckout({ planName: 'platform_enterprise', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  // Legacy aliases for backward compatibility
  const checkoutPlatformProMonthly = checkoutPlatformFinotaurMonthly;
  const checkoutPlatformProYearly = checkoutPlatformFinotaurYearly;

  /**
   * 🔥 Contact sales for Enterprise plan
   */
  const contactEnterpriseSales = useCallback(() => {
    window.open('mailto:enterprise@finotaur.com?subject=Enterprise%20Plan%20Inquiry', '_blank');
  }, []);

  // ═══════════════════════════════════════════
  // 🔥 v7.0.0: BUNDLE → FINOTAUR PLATFORM (Legacy aliases)
  // ═══════════════════════════════════════════

  const checkoutBundleMonthly = useCallback(() => {
    initiateCheckout({ planName: 'platform_finotaur', billingInterval: 'monthly' });
  }, [initiateCheckout]);

  const checkoutBundleYearly = useCallback(() => {
    initiateCheckout({ planName: 'platform_finotaur', billingInterval: 'yearly' });
  }, [initiateCheckout]);

  return {
    // Generic checkout
    initiateCheckout,
    
    // Journal checkout helpers
    checkoutBasicMonthly,
    checkoutBasicYearly,
    checkoutPremiumMonthly,
    checkoutPremiumYearly,
    
    // 🔥 Platform checkout helpers
    checkoutPlatformCoreMonthly,
    checkoutPlatformCoreYearly,
    checkoutPlatformFinotaurMonthly,
    checkoutPlatformFinotaurYearly,
    checkoutPlatformEnterpriseMonthly,
    // Legacy aliases
    checkoutPlatformProMonthly,
    checkoutPlatformProYearly,
    contactEnterpriseSales,
    
    // 🔥 v5.0.0: Bundle checkout helpers
    checkoutBundleMonthly,
    checkoutBundleYearly,
    
    // State
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
  const plan = PLANS[planId];
  
  // Check for coming soon
  if (plan?.comingSoon) {
    console.warn(`${plan.displayName} is coming soon`);
    return;
  }
  
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

// ============================================
// 🔥 PLATFORM SPECIFIC CHECKOUT (NEW)
// ============================================

/**
 * Redirect directly to Platform checkout
 */
export function redirectToPlatformCheckout(
  plan: 'core' | 'finotaur' | 'enterprise',
  billingInterval: BillingInterval,
  userEmail?: string,
  userId?: string,
  affiliateCode?: string
): void {
  const planName = `platform_${plan}` as PlanName;
  redirectToWhopCheckout(planName, billingInterval, userEmail, userId, affiliateCode);
}