// =====================================================
// FINOTAUR AFFILIATE DISCOUNT HOOK - v2.5.0 (FIXED)
// =====================================================
// Place in: src/features/affiliate/hooks/useAffiliateDiscount.ts
// 
// 🔥 v2.5.0 CHANGES:
// - Graceful error handling - no crashes if affiliates table missing
// - Removed direct dependency on useAffiliate hooks
// - Safe localStorage operations
// - Returns empty state on errors instead of crashing
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AffiliateDiscountInfo, DiscountTier } from '../types/affiliate.types';

// ============================================
// PRICING CONFIGURATION
// ============================================

const PLAN_PRICES = {
  basic: {
    monthly: 19.99,
    yearly: 149,
  },
  premium: {
    monthly: 39.99,
    yearly: 299,
  },
} as const;

// Discount rates - actual rate comes from DB per affiliate
const DEFAULT_DISCOUNT_RATES: Record<DiscountTier, number> = {
  standard: 0.10, // 10%
  vip: 0.15,      // 15%
} as const;

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  code: 'finotaur_affiliate_code',
  clickId: 'finotaur_affiliate_click_id',
  expires: 'finotaur_affiliate_expires',
  fullData: 'finotaur_affiliate',
};

// ============================================
// TYPES
// ============================================

type PlanId = 'basic' | 'premium';
type BillingInterval = 'monthly' | 'yearly';

interface ValidateCodeResult {
  is_valid: boolean;
  affiliate_id?: string;
  affiliate_name?: string;
  affiliate_code?: string;
  discount_monthly?: number;
  discount_yearly?: number;
  discount_tier?: DiscountTier;
}

interface UseAffiliateDiscountResult {
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  hasDiscount: boolean;
  discountInfo: AffiliateDiscountInfo | null;
  manualCode: string;
  setManualCode: (code: string) => void;
  applyCode: () => Promise<boolean>;
  removeCode: () => void;
  validatedCode: { code: string; affiliateName?: string } | null;
  discountPercent: number;
  savings: number;
}

// ============================================
// SAFE STORAGE HELPERS (No external dependencies)
// ============================================

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

function getStoredAffiliateData(): { code: string; clickId?: string } | null {
  try {
    // Try standard key first
    const storedCode = safeGetItem(STORAGE_KEYS.code);
    const storedExpires = safeGetItem(STORAGE_KEYS.expires);
    
    // Check expiration
    if (storedExpires && Number(storedExpires) < Date.now()) {
      clearAffiliateStorage();
      return null;
    }
    
    if (storedCode) {
      return {
        code: storedCode,
        clickId: safeGetItem(STORAGE_KEYS.clickId) || undefined,
      };
    }
    
    // Fallback to JSON storage
    const jsonData = safeGetItem(STORAGE_KEYS.fullData);
    if (jsonData) {
      const parsed = JSON.parse(jsonData);
      return {
        code: parsed.code,
        clickId: parsed.clickId,
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

function saveAffiliateToStorage(
  code: string,
  affiliateId?: string,
  affiliateName?: string,
  discountTier?: DiscountTier,
  clickId?: string
): void {
  const upperCode = code.toUpperCase();
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

  safeSetItem(STORAGE_KEYS.code, upperCode);
  safeSetItem(STORAGE_KEYS.clickId, clickId || '');
  safeSetItem(STORAGE_KEYS.expires, String(expiresAt));

  safeSetItem(STORAGE_KEYS.fullData, JSON.stringify({
    code: upperCode,
    affiliateId,
    affiliateName,
    discountTier,
    clickId,
    timestamp: Date.now(),
  }));
}

function clearAffiliateStorage(): void {
  safeRemoveItem(STORAGE_KEYS.code);
  safeRemoveItem(STORAGE_KEYS.clickId);
  safeRemoveItem(STORAGE_KEYS.expires);
  safeRemoveItem(STORAGE_KEYS.fullData);
}

// ============================================
// MAIN HOOK
// ============================================

export function useAffiliateDiscount(
  planId: PlanId | null,
  billingInterval: BillingInterval
): UseAffiliateDiscountResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<AffiliateDiscountInfo | null>(null);
  
  const [validatedRates, setValidatedRates] = useState<{
    monthly: number;
    yearly: number;
    discountTier?: DiscountTier;
  } | null>(null);

  // Get original price
  const getOriginalPrice = useCallback(() => {
    if (!planId) return 0;
    return PLAN_PRICES[planId][billingInterval];
  }, [planId, billingInterval]);

  // Calculate discount
  const calculateDiscount = useCallback((
    originalPrice: number,
    discountPercent: number
  ) => {
    const discountAmount = originalPrice * discountPercent;
    const discountedPrice = originalPrice - discountAmount;
    return {
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      savings: Math.round(discountAmount * 100) / 100,
    };
  }, []);

  // Validate affiliate code via DB RPC
  const validateCode = useCallback(async (code: string): Promise<{
    isValid: boolean;
    affiliateId?: string;
    affiliateName?: string;
    discountPercent?: number;
    discountMonthly?: number;
    discountYearly?: number;
    discountTier?: DiscountTier;
  }> => {
    try {
      const { data, error } = await supabase
        .rpc('validate_affiliate_code', { p_code: code.toUpperCase() });

      if (error) {
        console.error('Validation error:', error);
        return { isValid: false };
      }

      // Handle case where RPC doesn't exist or returns empty
      if (!data) {
        return { isValid: false };
      }

      const result: ValidateCodeResult = Array.isArray(data) ? data[0] : data;

      if (!result || !result.is_valid) {
        return { isValid: false };
      }

      // Convert percentage to decimal (DB returns 10.00/15.00, we need 0.10/0.15)
      const discountMonthlyRaw = result.discount_monthly ?? 10;
      const discountYearlyRaw = result.discount_yearly ?? 10;
      const discountMonthly = discountMonthlyRaw > 1 ? discountMonthlyRaw / 100 : discountMonthlyRaw;
      const discountYearly = discountYearlyRaw > 1 ? discountYearlyRaw / 100 : discountYearlyRaw;
      
      const discountPercent = billingInterval === 'yearly' 
        ? discountYearly 
        : discountMonthly;

      return {
        isValid: true,
        affiliateId: result.affiliate_id,
        affiliateName: result.affiliate_name,
        discountPercent,
        discountMonthly,
        discountYearly,
        discountTier: result.discount_tier,
      };
    } catch (err) {
      console.error('Error validating code:', err);
      return { isValid: false };
    }
  }, [billingInterval]);

  // Apply discount info to state
  const applyDiscountInfo = useCallback((
    code: string,
    affiliateId: string | undefined,
    affiliateName: string | undefined,
    discountPercent: number,
    discountMonthly: number,
    discountYearly: number,
    discountTier?: DiscountTier,
    clickId?: string
  ) => {
    const originalPrice = getOriginalPrice();
    const { discountedPrice, savings } = calculateDiscount(originalPrice, discountPercent);

    setValidatedRates({
      monthly: discountMonthly,
      yearly: discountYearly,
      discountTier,
    });

    setDiscountInfo({
      code: code.toUpperCase(),
      discountPercent: Math.round(discountPercent * 100),
      originalPrice,
      discountedPrice,
      savings,
      affiliateName,
      affiliateId,
      clickId,
      discountTier,
    });

    setError(null);
  }, [getOriginalPrice, calculateDiscount]);

  // Check for stored affiliate code on mount
  useEffect(() => {
    const checkStoredCode = async () => {
      setIsLoading(true);

      try {
        const storedData = getStoredAffiliateData();

        if (storedData?.code) {
          console.log('📦 Found stored affiliate code:', storedData.code);

          const validation = await validateCode(storedData.code);

          if (validation.isValid) {
            applyDiscountInfo(
              storedData.code,
              validation.affiliateId,
              validation.affiliateName,
              validation.discountPercent!,
              validation.discountMonthly!,
              validation.discountYearly!,
              validation.discountTier,
              storedData.clickId
            );
            setManualCode(storedData.code);
            
            // Re-save to ensure all keys are synced
            saveAffiliateToStorage(
              storedData.code,
              validation.affiliateId,
              validation.affiliateName,
              validation.discountTier,
              storedData.clickId
            );
          } else {
            console.log('⚠️ Stored code is no longer valid');
            clearAffiliateStorage();
          }
        }
      } catch (err) {
        // 🔥 GRACEFUL ERROR HANDLING - Don't crash, just log
        console.error('Error checking stored code (non-fatal):', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredCode();
  }, [validateCode, applyDiscountInfo]);

  // Recalculate when plan or billing changes
  useEffect(() => {
    if (discountInfo && planId && validatedRates) {
      const originalPrice = getOriginalPrice();
      
      const discountRate = billingInterval === 'yearly' 
        ? validatedRates.yearly 
        : validatedRates.monthly;
      
      const { discountedPrice, savings } = calculateDiscount(originalPrice, discountRate);

      setDiscountInfo(prev => prev ? {
        ...prev,
        discountPercent: Math.round(discountRate * 100),
        originalPrice,
        discountedPrice,
        savings,
      } : null);
    }
  }, [planId, billingInterval, getOriginalPrice, calculateDiscount, validatedRates]);

  // Apply manual code
  const applyCode = useCallback(async (): Promise<boolean> => {
    if (!manualCode.trim()) {
      setError('Please enter a code');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validation = await validateCode(manualCode.trim());

      if (!validation.isValid) {
        setError('Invalid or expired code');
        return false;
      }

      applyDiscountInfo(
        manualCode.trim(),
        validation.affiliateId,
        validation.affiliateName,
        validation.discountPercent!,
        validation.discountMonthly!,
        validation.discountYearly!,
        validation.discountTier
      );

      // Save to localStorage
      saveAffiliateToStorage(
        manualCode.trim(),
        validation.affiliateId,
        validation.affiliateName,
        validation.discountTier
      );

      return true;
    } catch (err) {
      console.error('Error applying code:', err);
      setError('Failed to validate code. Please try again.');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [manualCode, validateCode, applyDiscountInfo]);

  // Remove code
  const removeCode = useCallback(() => {
    setDiscountInfo(null);
    setValidatedRates(null);
    setManualCode('');
    setError(null);
    clearAffiliateStorage();
  }, []);

  return {
    isLoading,
    isValidating,
    error,
    hasDiscount: !!discountInfo,
    discountInfo,
    manualCode,
    setManualCode,
    applyCode,
    removeCode,
    validatedCode: discountInfo ? {
      code: discountInfo.code,
      affiliateName: discountInfo.affiliateName,
    } : null,
    discountPercent: discountInfo ? discountInfo.discountPercent / 100 : 0,
    savings: discountInfo?.savings || 0,
  };
}

// ============================================
// HELPER EXPORTS
// ============================================

export function getDiscountDisplay(
  billingInterval: BillingInterval,
  discountTier?: DiscountTier
): string {
  if (discountTier) {
    const rate = DEFAULT_DISCOUNT_RATES[discountTier];
    return `${Math.round(rate * 100)}%`;
  }
  return `${Math.round(DEFAULT_DISCOUNT_RATES.standard * 100)}%`;
}

export function calculateDiscountedPrice(
  planId: PlanId,
  billingInterval: BillingInterval,
  hasDiscount: boolean,
  discountTier?: DiscountTier
): { original: number; discounted: number; savings: number } {
  const original = PLAN_PRICES[planId][billingInterval];
  
  if (!hasDiscount) {
    return { original, discounted: original, savings: 0 };
  }

  const tier = discountTier || 'standard';
  const rate = DEFAULT_DISCOUNT_RATES[tier];
  
  const savings = Math.round(original * rate * 100) / 100;
  const discounted = Math.round((original - savings) * 100) / 100;

  return { original, discounted, savings };
}

export function getDiscountTierInfo(tier: DiscountTier): {
  name: string;
  rate: number;
  description: string;
} {
  const rates = {
    standard: {
      name: 'Standard',
      rate: 0.10,
      description: '10% discount on all plans',
    },
    vip: {
      name: 'VIP',
      rate: 0.15,
      description: '15% discount on all plans',
    },
  };
  
  return rates[tier];
}

export default useAffiliateDiscount;