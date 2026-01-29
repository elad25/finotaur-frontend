// =====================================================
// FINOTAUR WAR ZONE - Centralized Data Hook v2.1
// 
// 🔥 OPTIMIZATIONS:
// - Single source of truth for all War Zone data
// - React Query caching (5min stale, 15min GC)
// - Parallel fetching
// - Automatic realtime subscriptions
// - Throttled refetch (10s minimum)
// 
// ✅ Added newsletterMembershipId for cancel modal
// =====================================================

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ============================================
// TYPES
// ============================================

export interface DailyReport {
  id: string;
  report_date: string;
  report_title: string;
  markdown_content: string | null;
  html_content: string | null;
  pdf_url: string | null;
  pdf_path: string | null;
  qa_score: number;
  visibility: 'live' | 'test' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface WeeklyReport {
  id: string;
  report_date: string;
  report_title: string;
  markdown_content: string | null;
  html_content: string | null;
  pdf_url: string | null;
  pdf_path: string | null;
  qa_score: number;
  visibility: 'live' | 'test' | 'archived';
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  is_tester: boolean;
  newsletter_enabled: boolean;
  newsletter_status: string;
  newsletter_whop_membership_id: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  top_secret_enabled: boolean;
  top_secret_status: string;
  top_secret_membership_id: string | null;
}

export interface WarZoneData {
  // Reports
  currentDailyReport: DailyReport | null;
  previousDailyReport: DailyReport | null;
  currentWeeklyReport: WeeklyReport | null;
  previousWeeklyReport: WeeklyReport | null;
  testDailyReport: DailyReport | null;
  
  // User status
  isAdmin: boolean;
  isTester: boolean;
  isSubscriber: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number | null;
  
  // Membership IDs
  newsletterMembershipId: string | null;  // ✅ Added
  topSecretMembershipId: string | null;
  
  // Top Secret status
  isTopSecretMember: boolean;
  
  // Time info
  isBeforeDailyReportTime: boolean;
  isBeforeWeeklyReportTime: boolean;
  dailyCountdown: { hours: number; minutes: number; seconds: number };
  weeklyCountdown: { hours: number; minutes: number; seconds: number };
  
  // Query state
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  refetch: () => Promise<void>;
  downloadReport: (report: DailyReport | WeeklyReport, type: 'daily' | 'weekly') => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 15 * 60 * 1000,        // 15 minutes (formerly cacheTime)
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: 2,
};

const MIN_FETCH_INTERVAL = 10 * 1000; // 10 seconds

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeDate(dateStr: string | Date | null): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  return str.split('T')[0];
}

function getNYTime(): Date {
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(nyTimeStr);
}

function calculateDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================
// MAIN HOOK
// ============================================

export function useWarZoneData(): WarZoneData {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);

  // ============================================
  // FETCH USER PROFILE
  // ============================================
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['warzone-profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, role, is_tester,
          newsletter_enabled, newsletter_status,
          newsletter_whop_membership_id, newsletter_expires_at,
          newsletter_trial_ends_at, newsletter_cancel_at_period_end,
          top_secret_enabled, top_secret_status, top_secret_membership_id
        `)
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('[useWarZoneData] Profile fetch error:', error);
        return null;
      }
      
      return data as UserProfile;
    },
    enabled: !!user?.id,
    ...QUERY_CONFIG,
  });

  // ============================================
  // FETCH REPORTS
  // ============================================
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['warzone-reports', profile?.is_tester],
    queryFn: async () => {
      const nyTime = getNYTime();
      const todayNY = nyTime.toISOString().split('T')[0];
      const nyHour = nyTime.getHours();
      const dayOfWeek = nyTime.getDay();
      
      // Parallel fetch
      const [dailyResult, weeklyResult, testResult] = await Promise.all([
        supabase
          .from('daily_reports')
          .select('*')
          .eq('visibility', 'live')
          .order('report_date', { ascending: false })
          .limit(10),
        supabase
          .from('weekly_reports')
          .select('*')
          .eq('visibility', 'live')
          .order('report_date', { ascending: false })
          .limit(2),
        profile?.is_tester
          ? supabase
              .from('daily_reports')
              .select('*')
              .eq('visibility', 'test')
              .order('updated_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Process daily reports
      const dailyData = dailyResult.data || [];
      const isBeforeReportTime = nyHour < 9;
      
      const todayReport = dailyData.find(r => normalizeDate(r.report_date) === todayNY);
      const previousReport = isBeforeReportTime
        ? (dailyData[0] || null)
        : dailyData.find(r => normalizeDate(r.report_date) !== todayNY) || null;

      const currentDaily = isBeforeReportTime ? null : todayReport || null;

      // Process weekly reports
      const weeklyData = weeklyResult.data || [];
      const isWeeklyWaiting = (dayOfWeek === 6 && nyHour >= 18) || (dayOfWeek === 0 && nyHour < 10);
      
      const currentWeekly = isWeeklyWaiting ? null : (weeklyData[0] || null);
      const previousWeekly = weeklyData[1] || (isWeeklyWaiting && weeklyData[0] ? weeklyData[0] : null);

      // Test report
      const testDaily = testResult.data?.[0] || null;

      return {
        currentDailyReport: currentDaily as DailyReport | null,
        previousDailyReport: previousReport as DailyReport | null,
        currentWeeklyReport: currentWeekly as WeeklyReport | null,
        previousWeeklyReport: previousWeekly as WeeklyReport | null,
        testDailyReport: testDaily as DailyReport | null,
        isBeforeDailyReportTime: isBeforeReportTime,
        isBeforeWeeklyReportTime: isWeeklyWaiting,
      };
    },
    enabled: !!user?.id,
    ...QUERY_CONFIG,
  });

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('warzone-reports-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_reports',
      }, () => {
        // Debounce refetch
        const now = Date.now();
        if (now - lastFetchRef.current > MIN_FETCH_INTERVAL) {
          lastFetchRef.current = now;
          queryClient.invalidateQueries({ queryKey: ['warzone-reports'] });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'weekly_reports',
      }, () => {
        const now = Date.now();
        if (now - lastFetchRef.current > MIN_FETCH_INTERVAL) {
          lastFetchRef.current = now;
          queryClient.invalidateQueries({ queryKey: ['warzone-reports'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // ============================================
  // COUNTDOWN CALCULATIONS
  // ============================================
  const countdowns = useMemo(() => {
    const nyTime = getNYTime();
    
    // Daily countdown - next 9:00 AM NY (Mon-Fri)
    const dailyTarget = new Date(nyTime);
    dailyTarget.setHours(9, 0, 0, 0);
    if (nyTime >= dailyTarget) dailyTarget.setDate(dailyTarget.getDate() + 1);
    while (dailyTarget.getDay() === 0 || dailyTarget.getDay() === 6) {
      dailyTarget.setDate(dailyTarget.getDate() + 1);
    }
    const dailyDiff = dailyTarget.getTime() - nyTime.getTime();
    
    // Weekly countdown - next Sunday 10:00 AM NY
    const weeklyTarget = new Date(nyTime);
    const daysUntilSunday = nyTime.getDay() === 0 ? 0 : 7 - nyTime.getDay();
    weeklyTarget.setDate(nyTime.getDate() + daysUntilSunday);
    weeklyTarget.setHours(10, 0, 0, 0);
    if (nyTime >= weeklyTarget) weeklyTarget.setDate(weeklyTarget.getDate() + 7);
    const weeklyDiff = weeklyTarget.getTime() - nyTime.getTime();

    return {
      daily: {
        hours: Math.floor(dailyDiff / 3600000),
        minutes: Math.floor((dailyDiff % 3600000) / 60000),
        seconds: Math.floor((dailyDiff % 60000) / 1000),
      },
      weekly: {
        hours: Math.floor(weeklyDiff / 3600000),
        minutes: Math.floor((weeklyDiff % 3600000) / 60000),
        seconds: Math.floor((weeklyDiff % 60000) / 1000),
      },
    };
  }, []);

  // ============================================
  // DOWNLOAD REPORT FUNCTION
  // ============================================
  const downloadReport = useCallback(async (
    report: DailyReport | WeeklyReport,
    reportType: 'daily' | 'weekly'
  ) => {
    const dateStr = report.report_date.split('T')[0];
    const filename = `${reportType}-report-${dateStr}.pdf`;

    const downloadPdf = async (url: string): Promise<boolean> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return false;
        const blob = await res.blob();
        if (blob.size < 1000) return false;
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return true;
      } catch {
        return false;
      }
    };

    // Method 1: Direct pdf_url
    if (report.pdf_url?.includes('supabase.co')) {
      if (await downloadPdf(report.pdf_url)) return;
    }

    // Method 2: pdf_path with signed URL
    if (report.pdf_path) {
      const { data } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.pdf_path, 300);
      if (data?.signedUrl && await downloadPdf(data.signedUrl)) return;
    }

    // Method 3: Constructed path
    const [year, month] = dateStr.split('-');
    const folder = reportType === 'daily' ? 'daily-reports' : `weekly-reports/${year}/${month}`;
    const constructedPath = `${folder}/${reportType}-report-${dateStr}.pdf`;
    
    const { data: signedData } = await supabase.storage
      .from('reports')
      .createSignedUrl(constructedPath, 300);
    if (signedData?.signedUrl && await downloadPdf(signedData.signedUrl)) return;

    // Method 4: API fallback (daily only)
    if (reportType === 'daily') {
      try {
        const res = await fetch(`${API_BASE}/api/newsletter/pdf`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch {}
    }

    alert(`PDF not available for ${dateStr}. Please try again later.`);
  }, []);

  // ============================================
  // REFETCH FUNCTION
  // ============================================
  const refetch = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      console.log('[useWarZoneData] Refetch throttled');
      return;
    }
    lastFetchRef.current = now;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['warzone-profile'] }),
      queryClient.invalidateQueries({ queryKey: ['warzone-reports'] }),
    ]);
    await refetchReports();
  }, [queryClient, refetchReports]);

  // ============================================
  // DERIVED VALUES
  // ============================================
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTester = profile?.is_tester || isAdmin || profile?.email === 'elad2550@gmail.com';
  const isSubscriber = profile?.newsletter_status === 'active' || profile?.newsletter_status === 'trial' || profile?.newsletter_status === 'trialing';
  const isInTrial = profile?.newsletter_status === 'trial' || profile?.newsletter_status === 'trialing';
  const trialDaysRemaining = calculateDaysRemaining(profile?.newsletter_trial_ends_at || null);
  const isTopSecretMember = profile?.top_secret_enabled && (profile?.top_secret_status === 'active' || profile?.top_secret_status === 'trial');

  // ============================================
  // RETURN
  // ============================================
  return {
    // Reports
    currentDailyReport: reportsData?.currentDailyReport || null,
    previousDailyReport: reportsData?.previousDailyReport || null,
    currentWeeklyReport: reportsData?.currentWeeklyReport || null,
    previousWeeklyReport: reportsData?.previousWeeklyReport || null,
    testDailyReport: reportsData?.testDailyReport || null,
    
    // User status
    isAdmin,
    isTester,
    isSubscriber,
    isInTrial,
    trialDaysRemaining,
    
    // Membership IDs - ✅ Added newsletterMembershipId
    newsletterMembershipId: profile?.newsletter_whop_membership_id || null,
    topSecretMembershipId: profile?.top_secret_membership_id || null,
    
    // Top Secret
    isTopSecretMember: !!isTopSecretMember,
    
    // Time info
    isBeforeDailyReportTime: reportsData?.isBeforeDailyReportTime ?? true,
    isBeforeWeeklyReportTime: reportsData?.isBeforeWeeklyReportTime ?? false,
    dailyCountdown: countdowns.daily,
    weeklyCountdown: countdowns.weekly,
    
    // Query state
    isLoading: profileLoading || reportsLoading,
    error: null,
    
    // Actions
    refetch,
    downloadReport,
  };
}

export default useWarZoneData;