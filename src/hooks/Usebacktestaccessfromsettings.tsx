/**
 * 🔐 Hook to check if user has access to Backtest feature
 * Only PREMIUM users have access
 * 
 * This version is based on your existing JournalSettings.tsx code
 */

import { useMemo } from 'react';

// 🔥 BASED ON YOUR SETTINGS FILE - you already have these imports:
// import { useUserProfile, getPlanDisplay, getNextBillingDate } from "@/hooks/useUserProfile";

// So we'll import the same way:
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Hook to check Backtest access based on account type
 */
export const useBacktestAccess = () => {
  const { profile, isLoading } = useUserProfile();
  
  // Premium users only have access
  const hasAccess = useMemo(() => {
    return profile?.account_type === 'premium';
  }, [profile?.account_type]);
  
  const accountType = profile?.account_type || 'free';
  
  return {
    hasAccess,        // true only for Premium
    accountType,      // 'free' | 'basic' | 'premium'
    isLoading,
    isPremium: hasAccess,
    isBasic: accountType === 'basic',
    isFree: accountType === 'free',
  };
};

export default useBacktestAccess;