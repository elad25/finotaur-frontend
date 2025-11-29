// =====================================================
// FINOTAUR AFFILIATE DISCOUNT HOOK - v2.4.0
// =====================================================
// Place in: src/features/affiliate/hooks/useAffiliateDiscount.ts
// 
// 🔥 v2.4.0 CHANGES:
// - Fixed localStorage sync with useWhopCheckout
// - Reads discount_tier from validate_affiliate_code RPC
// - Supports standard (10%) and vip (15%) per affiliate
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredAffiliateData, clearStoredAffiliateData } from './useAffiliate';
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
// STORAGE KEYS - Must match useWhopCheckout!
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
// HELPER: Save affiliate data to localStorage
// ============================================

function saveAffiliateToStorage(
  code: string,
  affiliateId?: string,
  affiliateName?: string,
  discountTier?: DiscountTier,
  clickId?: string
): void {
  const upperCode = code.toUpperCase();
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

  // Save to standard keys (for useWhopCheckout compatibility)
  localStorage.setItem(STORAGE_KEYS.code, upperCode);
  localStorage.setItem(STORAGE_KEYS.clickId, clickId || '');
  localStorage.setItem(STORAGE_KEYS.expires, String(expiresAt));

  // Also save full data for reference
  localStorage.setItem(STORAGE_KEYS.fullData, JSON.stringify({
    code: upperCode,
    affiliateId,
    affiliateName,
    discountTier,
    clickId,
    timestamp: Date.now(),
  }));

  console.log('💾 Saved affiliate data to localStorage:', {
    code: upperCode,
    affiliateId,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

// ============================================
// HELPER: Clear affiliate data from localStorage
// ============================================

function clearAffiliateStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.code);
  localStorage.removeItem(STORAGE_KEYS.clickId);
  localStorage.removeItem(STORAGE_KEYS.expires);
  localStorage.removeItem(STORAGE_KEYS.fullData);
  
  // Also call the imported function for any additional cleanup
  clearStoredAffiliateData();
  
  console.log('🗑️ Cleared affiliate data from localStorage');
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

  // Validate affiliate code via DB
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

      console.log('🎟️ Discount from DB:', {
        code: code.toUpperCase(),
        discountTier: result.discount_tier,
        discountMonthly,
        discountYearly,
        currentRate: discountPercent,
        billingInterval,
      });

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
        // Try standard key first
        let storedCode = localStorage.getItem(STORAGE_KEYS.code);
        let storedClickId = localStorage.getItem(STORAGE_KEYS.clickId);
        const storedExpires = localStorage.getItem(STORAGE_KEYS.expires);

        // Check expiration
        if (storedExpires && Number(storedExpires) < Date.now()) {
          console.log('⏰ Stored affiliate code expired, clearing...');
          clearAffiliateStorage();
          setIsLoading(false);
          return;
        }

        // Fallback to JSON storage
        if (!storedCode) {
          const jsonData = localStorage.getItem(STORAGE_KEYS.fullData);
          if (jsonData) {
            try {
              const parsed = JSON.parse(jsonData);
              storedCode = parsed.code;
              storedClickId = parsed.clickId;
            } catch {
              // Invalid JSON
            }
          }
        }

        // Also try getStoredAffiliateData from useAffiliate hook
        if (!storedCode) {
          const storedData = getStoredAffiliateData();
          if (storedData?.code) {
            storedCode = storedData.code;
            storedClickId = storedData.clickId;
          }
        }

        if (storedCode) {
          console.log('📦 Found stored affiliate code:', storedCode);

          const validation = await validateCode(storedCode);

          if (validation.isValid) {
            applyDiscountInfo(
              storedCode,
              validation.affiliateId,
              validation.affiliateName,
              validation.discountPercent!,
              validation.discountMonthly!,
              validation.discountYearly!,
              validation.discountTier,
              storedClickId || undefined
            );
            setManualCode(storedCode);
            
            // Re-save to ensure all keys are synced
            saveAffiliateToStorage(
              storedCode,
              validation.affiliateId,
              validation.affiliateName,
              validation.discountTier,
              storedClickId || undefined
            );
          } else {
            console.log('⚠️ Stored code is no longer valid');
            clearAffiliateStorage();
          }
        }
      } catch (err) {
        console.error('Error checking stored code:', err);
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

      // 🔥 Save to localStorage with ALL keys
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