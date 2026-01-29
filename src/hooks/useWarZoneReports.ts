// =====================================================
// FINOTAUR: Optimized Reports Hook v2.0
// 🔥 PERFORMANCE: React Query caching
// 🔥 DEDUPLICATION: No duplicate fetches
// 🔥 REALTIME: Single subscription
// =====================================================

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

interface ReportsData {
  daily: {
    current: DailyReport | null;
    previous: DailyReport | null;
    all: DailyReport[];
  };
  weekly: {
    current: WeeklyReport | null;
    previous: WeeklyReport | null;
  };
  test: DailyReport | null;
}

// ============================================
// HELPER: Get NY timezone date
// ============================================

function getNYDate(): { todayNY: string; nyTime: Date; nyHour: number } {
  const now = new Date();
  const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyTime = new Date(nyTimeStr);
  const todayNY = nyTime.toISOString().split('T')[0];
  const nyHour = nyTime.getHours();
  return { todayNY, nyTime, nyHour };
}

function normalizeDate(dateStr: string | Date | null): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  return str.split('T')[0];
}

// ============================================
// MAIN HOOK: useWarZoneReports
// ============================================

export function useWarZoneReports(isTester: boolean = false) {
  const queryClient = useQueryClient();
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 🔥 Main reports query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['warzone-reports', isTester],
    queryFn: async (): Promise<ReportsData> => {
      const { todayNY, nyTime, nyHour } = getNYDate();
      const isBeforeReportTime = nyHour < 9;
      const dayOfWeek = nyTime.getDay();
      const isWeeklyWaiting = (dayOfWeek === 6 && nyHour >= 18) || (dayOfWeek === 0 && nyHour < 10);

      // Parallel fetch for better performance
      const [dailyResult, weeklyResult, testResult] = await Promise.all([
        // Daily reports (live only)
        supabase
          .from('daily_reports')
          .select('*')
          .eq('visibility', 'live')
          .order('report_date', { ascending: false })
          .limit(10),
        
        // Weekly reports (live only)
        supabase
          .from('weekly_reports')
          .select('*')
          .eq('visibility', 'live')
          .order('report_date', { ascending: false })
          .limit(2),
        
        // Test reports (only for testers)
        isTester
          ? supabase
              .from('daily_reports')
              .select('*')
              .eq('visibility', 'test')
              .order('updated_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Process daily reports
      const dailyData = dailyResult.data ?? [];
      const liveDaily = dailyData.filter(r => r.visibility === 'live');
      
      // Today's report (only after 9 AM)
      const todayReport = isBeforeReportTime 
        ? null 
        : liveDaily.find(r => normalizeDate(r.report_date) === todayNY) ?? null;
      
      // Previous report
      const previousReport = isBeforeReportTime
        ? liveDaily[0] ?? null
        : liveDaily.find(r => normalizeDate(r.report_date) !== todayNY) ?? null;

      // Process weekly reports
      const weeklyData = weeklyResult.data ?? [];
      const currentWeekly = isWeeklyWaiting ? null : (weeklyData[0] ?? null);
      const previousWeekly = weeklyData[1] ?? (isWeeklyWaiting ? weeklyData[0] : null);

      return {
        daily: {
          current: todayReport,
          previous: previousReport,
          all: liveDaily,
        },
        weekly: {
          current: currentWeekly,
          previous: previousWeekly,
        },
        test: testResult.data?.[0] ?? null,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 🔥 Realtime subscription (single instance)
  useEffect(() => {
    // Cleanup existing
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('warzone-reports-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_reports' },
        () => {
          // Debounced invalidation
          queryClient.invalidateQueries({ 
            queryKey: ['warzone-reports'],
            refetchType: 'active'
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weekly_reports' },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['warzone-reports'],
            refetchType: 'active'
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [queryClient]);

  // 🔥 Refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['warzone-reports'] });
    await refetch();
  }, [queryClient, refetch]);

  // 🔥 Countdown calculations (memoized)
  const countdowns = useMemo(() => {
    const { nyTime, nyHour } = getNYDate();
    const dayOfWeek = nyTime.getDay();
    
    // Daily countdown (next 9 AM NY, Mon-Fri)
    const dailyTarget = new Date(nyTime);
    dailyTarget.setHours(9, 0, 0, 0);
    if (nyTime >= dailyTarget) {
      dailyTarget.setDate(dailyTarget.getDate() + 1);
    }
    while (dailyTarget.getDay() === 0 || dailyTarget.getDay() === 6) {
      dailyTarget.setDate(dailyTarget.getDate() + 1);
    }
    const dailyDiff = dailyTarget.getTime() - nyTime.getTime();
    
    // Weekly countdown (next Sunday 10 AM NY)
    const weeklyTarget = new Date(nyTime);
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    weeklyTarget.setDate(nyTime.getDate() + daysUntilSunday);
    weeklyTarget.setHours(10, 0, 0, 0);
    if (nyTime >= weeklyTarget) {
      weeklyTarget.setDate(weeklyTarget.getDate() + 7);
    }
    const weeklyDiff = weeklyTarget.getTime() - nyTime.getTime();

    return {
      daily: {
        hours: Math.floor(dailyDiff / (1000 * 60 * 60)),
        minutes: Math.floor((dailyDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((dailyDiff % (1000 * 60)) / 1000),
      },
      weekly: {
        hours: Math.floor(weeklyDiff / (1000 * 60 * 60)),
        minutes: Math.floor((weeklyDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((weeklyDiff % (1000 * 60)) / 1000),
      },
      isBeforeDailyTime: nyHour < 9,
      isBeforeWeeklyTime: (dayOfWeek === 6 && nyHour >= 18) || (dayOfWeek === 0 && nyHour < 10),
    };
  }, []);

  return {
    // Reports data
    currentDayReport: data?.daily.current ?? null,
    previousDayReport: data?.daily.previous ?? null,
    allDailyReports: data?.daily.all ?? [],
    currentWeeklyReport: data?.weekly.current ?? null,
    previousWeeklyReport: data?.weekly.previous ?? null,
    testDailyReport: data?.test ?? null,
    
    // Timing
    countdowns,
    isBeforeDailyReportTime: countdowns.isBeforeDailyTime,
    isBeforeWeeklyReportTime: countdowns.isBeforeWeeklyTime,
    
    // Query state
    isLoading,
    error: error as Error | null,
    refresh,
  };
}

// ============================================
// PUBLISH REPORT MUTATION
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

export function usePublishReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, reportDate }: { reportId: string; reportDate: string }) => {
      const response = await fetch(`${API_BASE}/api/reports/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, reportDate }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish report');
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: ['warzone-reports'] });
    },
  });
}

export default useWarZoneReports;