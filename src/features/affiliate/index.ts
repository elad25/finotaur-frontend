// =====================================================
// FINOTAUR AFFILIATE DASHBOARD - EXPORTS
// =====================================================
// Place in: src/features/affiliate/index.ts
// =====================================================

// === Components ===
export { default as AffiliateDashboard } from './pages/AffiliateDashboard';
export { AffiliateTracker, AffiliateRefRoute } from './components/AffiliateTracker';
export { default as CouponInput, DiscountBadge, PriceDisplay } from './components/CouponInput';
export { default as AffiliateApplicationForm } from './components/AffiliateApplicationForm';

// === Hooks (User/Public) ===
export { 
  trackAffiliateClick,
  trackReferralSignup,
  getStoredAffiliateCode,
  getStoredAffiliateData,
  clearStoredAffiliateData,
} from './hooks/useAffiliate';

export { 
  useAffiliateDiscount,
  getDiscountDisplay,
  calculateDiscountedPrice,
} from './hooks/useAffiliateDiscount';

export {
  useAffiliateProfile,
  useIsAffiliate,
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateBonuses,
  useAffiliateAnalytics,
  useAffiliateActivity,
  useUpdatePaymentInfo,
  useUpdateNotificationSettings,
  useCopyAffiliateLink,
  TIER_DISPLAY_INFO,
  affiliateProfileKeys,
} from './hooks/useAffiliateProfile';

// === Hooks (Admin) ===
export {
  useAffiliateAdminStats,
  useAffiliateApplications,
  useApproveApplication,
  useRejectApplication,
  useAffiliatesList,
  useAffiliateDetails,
  useUpdateAffiliateStatus,
  useUpdateAffiliate,
  useAffiliatePayouts as useAdminPayouts,
  useProcessPayout,
  useCancelPayout,
  useGenerateManualPayout,
  affiliateAdminKeys,
} from './hooks/useAffiliateAdmin';

// === Types ===
export type {
  AffiliateApplicationStatus,
  AffiliateStatus,
  AffiliateTier,
  ReferralStatus,
  CommissionType,
  CommissionStatus,
  BonusType,
  BonusStatus,
  PayoutStatus,
  AffiliateApplication,
  Affiliate,
  AffiliateClick,
  AffiliateReferral,
  AffiliateCommission,
  AffiliateBonus,
  AffiliatePayout,
  AffiliateActivityLog,
  AffiliateDiscountInfo,
  StoredAffiliateData,
  TierInfo,
} from './types/affiliate.types';

export { TIER_INFO } from './types/affiliate.types';