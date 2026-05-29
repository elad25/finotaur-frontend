// src/lib/queryClient.ts
// ============================================
// React Query Configuration for Finotaur
// ============================================

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// ============================================
// Query Keys - Centralized & Type-Safe
// ============================================
export const queryKeys = {
  // Admin Analytics
  adminStats: ['admin-stats'] as const,
  adminUsers: (filters?: any) => ['admin-users', filters] as const,
  adminUserDetail: (userId: string) => ['admin-user', userId] as const,
  adminAuditLogs: (pagination?: any) => ['admin-audit-logs', pagination] as const,
  subscriptionBreakdown: ['subscription-breakdown'] as const,
  userGrowth: (days: number) => ['user-growth', days] as const,
  tradeVolume: (days: number) => ['trade-volume', days] as const,
  
  // Journal/Trades
  trades: (userId?: string) => 
    userId ? ['trades', userId] as const : ['trades'] as const,
  tradeDetail: (tradeId: string) => ['trade', tradeId] as const,
  strategies: (userId?: string) => 
    userId ? ['strategies', userId] as const : ['strategies'] as const,
  
  // User Profile
  profile: (userId?: string) => ['profile', userId] as const,
  
  // Dashboard
  dashboardStats: (days: number) => ['dashboard-stats', days] as const,

  // 🔥 NEW: Affiliate System
  affiliate: {
    all: ['affiliate'] as const,
    popupData: (userId: string) => ['affiliate', 'popup', userId] as const,
    code: (userId: string) => ['affiliate', 'code', userId] as const,
    discount: (userId: string) => ['affiliate', 'discount', userId] as const,
    validate: (code: string) => ['affiliate', 'validate', code] as const,
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Invalidate all admin-related queries
 */
export const invalidateAdminQueries = () => {
  queryClient.invalidateQueries({ queryKey: ['admin'] });
};

/**
 * Prefetch admin stats before user navigates to analytics page
 */
export const prefetchAdminStats = async () => {
  const { getAdminStats } = await import('@/services/adminService');
  await queryClient.prefetchQuery({
    queryKey: queryKeys.adminStats,
    queryFn: getAdminStats,
  });
};

/**
 * Clear all cached data (useful for logout)
 */
export const clearAllQueries = () => {
  queryClient.clear();
};

// ============================================
// 🔥 Prefetch Functions for Performance
// ============================================

/**
 * Prefetch trades before user navigates to My Trades page
 */
export const prefetchTrades = async () => {
  const { getTrades } = await import('@/routes/journal');
  await queryClient.prefetchQuery({
    queryKey: queryKeys.trades(),
    queryFn: async () => {
      const result = await getTrades();
      return result.ok ? result.data || [] : [];
    },
  });
};

/**
 * Prefetch strategies before user navigates to Strategies page
 */
export const prefetchStrategies = async () => {
  const { supabase } = await import('@/lib/supabase');
  
  await queryClient.prefetchQuery({
    queryKey: queryKeys.strategies(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

/**
 * Prefetch analytics/dashboard stats
 */
export const prefetchAnalytics = async () => {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboardStats(30),
    queryFn: async () => {
      return null;
    },
  });
};

/**
 * Prefetch user profile
 */
export const prefetchUserProfile = async () => {
  const { supabase } = await import('@/lib/supabase');
  
  await queryClient.prefetchQuery({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, subscription_interval, subscription_status, subscription_expires_at')
        .eq('id', user.id)
        .single();

      return profile;
    },
  });
};

/**
 * 🔥 Prefetch settings data - loads instantly when user enters settings page
 */
export const prefetchSettingsData = async () => {
  const { supabase } = await import('@/lib/supabase');
  
  // Prefetch user profile with extended fields for settings
  await queryClient.prefetchQuery({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, subscription_interval, subscription_status, subscription_expires_at, risk_settings, initial_portfolio, current_portfolio, total_pnl')
        .eq('id', user.id)
        .single();
      
      return profile;
    },
  });
  
  // Prefetch trades for export (in background)
  queryClient.prefetchQuery({
    queryKey: queryKeys.trades(),
    queryFn: async () => {
      const { getTrades } = await import('@/routes/journal');
      const result = await getTrades();
      return result.ok ? result.data || [] : [];
    },
  });
};

/**
 * 🔥 NEW: Prefetch affiliate data before opening popup
 * Call this when user hovers over "Refer & Earn" button
 */
export const prefetchAffiliateData = async (userId: string) => {
  if (!userId) return;
  
  const { getAffiliatePopupData } = await import('@/services/affiliateService');
  
  await queryClient.prefetchQuery({
    queryKey: queryKeys.affiliate.popupData(userId),
    queryFn: () => getAffiliatePopupData(userId),
    staleTime: 60000, // 1 minute
  });
};

/**
 * 🔥 Invalidate affiliate data after conversion/payment
 */
export const invalidateAffiliateData = (userId: string) => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.affiliate.popupData(userId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.affiliate.discount(userId),
  });
};

// Cache TTL presets — match backend hotSec from src/cache/ttl.ts.
// Keys group queries by data class. Use the matching preset in useQuery():
//   useQuery({ ...QUERY_TTL.overview, queryKey: [...], queryFn: ... })
export const QUERY_TTL = {
  // Live spot quotes (10s stale, 15s refetch)
  spot:        { staleTime: 10_000,            refetchInterval: 15_000 },
  // Aggregated overview (30s stale, 60s refetch)
  overview:    { staleTime: 30_000,            refetchInterval: 60_000 },
  // FRED high-frequency (5min stale, 5min refetch)
  fredHourly:  { staleTime: 5 * 60_000,        refetchInterval: 5 * 60_000 },
  // FRED monthly releases (6h stale, no auto-refetch)
  fredDaily:   { staleTime: 6 * 3_600_000,     refetchInterval: false as const },
  // FRED quarterly (24h stale)
  fredQuarterly: { staleTime: 24 * 3_600_000,  refetchInterval: false as const },
  // DeFi TVL (5min stale + refetch)
  defiTVL:     { staleTime: 5 * 60_000,        refetchInterval: 5 * 60_000 },
  // Stablecoins (5min stale + refetch)
  stablecoins: { staleTime: 5 * 60_000,        refetchInterval: 5 * 60_000 },
  // Heatmap (30s stale, 60s refetch — same as overview)
  heatmap:     { staleTime: 30_000,            refetchInterval: 60_000 },
} as const;