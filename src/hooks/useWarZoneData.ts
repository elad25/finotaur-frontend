// =====================================================
// FINOTAUR WAR ZONE - useWarZoneData Hook v3.0
// 
// 🔥 CENTRALIZED DATA HOOK
// - Fetches daily/weekly reports
// - Handles tester status checking
// - Manages test reports for testers only
// - Provides download functionality
// - Countdown timers
// 
// ✅ Same logic as original - just extracted!
// =====================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useWarZoneStatus } from '@/hooks/useUserStatus';

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
  created_at: string;
}

interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
}

interface UseWarZoneDataReturn {
  // Reports
  currentDailyReport: DailyReport | null;
  previousDailyReport: DailyReport | null;
  currentWeeklyReport: WeeklyReport | null;
  previousWeeklyReport: WeeklyReport | null;
  testDailyReport: DailyReport | null;
  
  // Status
  isTester: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number | null;
  
  // Countdowns
  dailyCountdown: Countdown;
  weeklyCountdown: Countdown;
  
  // State
  isLoading: boolean;
  hasNewReport: boolean;
  
  // Actions
  refetch: () => Promise<void>;
  downloadReport: (report: DailyReport | WeeklyReport, type: 'daily' | 'weekly') => Promise<void>;
  clearTestReport: () => void;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  MIN_FETCH_INTERVAL: 10 * 1000, // 10 seconds
  API_BASE: import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app',
};

// ============================================
// CACHE SYSTEM
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ReportCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 50;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

const reportCache = new ReportCache();

// ============================================
// HELPER FUNCTIONS
// ============================================

const normalizeDate = (dateStr: string | Date | null): string => {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  return str.split('T')[0];
};

// ============================================
// MAIN HOOK
// ============================================

export function useWarZoneData(): UseWarZoneDataReturn {
  // State for reports
  const [currentDailyReport, setCurrentDailyReport] = useState<DailyReport | null>(null);
  const [previousDailyReport, setPreviousDayReport] = useState<DailyReport | null>(null);
  const [currentWeeklyReport, setCurrentWeeklyReport] = useState<WeeklyReport | null>(null);
  const [previousWeeklyReport, setPreviousWeeklyReport] = useState<WeeklyReport | null>(null);
  const [testDailyReport, setTestDailyReport] = useState<DailyReport | null>(null);
  
  // Status state
  const [isTester, setIsTester] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewReport, setHasNewReport] = useState(false);
  
  // Countdown state
  const [dailyCountdown, setDailyCountdown] = useState<Countdown>({ hours: 0, minutes: 0, seconds: 0 });
  const [weeklyCountdown, setWeeklyCountdown] = useState<Countdown>({ hours: 0, minutes: 0, seconds: 0 });
  
  // Refs for tracking
  const lastFetchTimeRef = useRef<number>(0);
  const lastFetchedDailyId = useRef<string | null>(null);
  const lastFetchedWeeklyId = useRef<string | null>(null);
  
  // Get war zone status from existing hook
  const { isInTrial, trialDaysRemaining } = useWarZoneStatus();

  // ============================================
  // FETCH REPORTS
  // ============================================
  const fetchReports = useCallback(async (showLoading = true) => {
    // Throttle: Don't fetch more than once every 10 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < CONFIG.MIN_FETCH_INTERVAL) {
      console.log('[WAR ZONE] ⏱️ Fetch throttled, skipping...');
      return;
    }
    lastFetchTimeRef.current = now;
    
    if (showLoading) setIsLoading(true);
    
    try {
      // Parallel fetch - get user and reports at the same time
      const [userResult, dailyResult, weeklyResult] = await Promise.all([
        supabase.auth.getUser(),
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
      ]);

      // Process user/tester status
      let currentIsTester = isTester;
      const user = userResult.data?.user;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_tester, role, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          currentIsTester = profile.is_tester || 
                           profile.role === 'admin' || 
                           profile.role === 'super_admin' ||
                           profile.email === 'elad2550@gmail.com';
          if (currentIsTester !== isTester) {
            setIsTester(currentIsTester);
          }
        }
      }
      console.log('[WAR ZONE] 👤 Tester status:', currentIsTester);
      
      // Get today's date in NY timezone
      const nowDate = new Date();
      const nyTimeStr = nowDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyTime = new Date(nyTimeStr);
      const todayNY = nyTime.toISOString().split('T')[0];
      const nyHour = nyTime.getHours();
      const isBeforeReportTime = nyHour < 9;
      
      console.log('[WAR ZONE] 📅 Today in NY:', todayNY, 'Hour:', nyHour);

      // Process daily reports
      const dailyData = dailyResult.data;
      const dailyError = dailyResult.error;
      
      if (dailyError) {
        console.error('[WAR ZONE] ❌ Error fetching daily reports:', dailyError);
      } else if (dailyData && dailyData.length > 0) {
        // Filter to ensure only live reports
        const liveReports = dailyData.filter((report: DailyReport) => {
          const vis = (report as any).visibility;
          return vis === 'live';
        });

        console.log('[WAR ZONE] 📊 Live reports:', liveReports.length);

        // Find report for TODAY
        const todayReport = liveReports.find((r: DailyReport) => 
          normalizeDate(r.report_date) === todayNY
        );

        // Previous report logic
        let previousReport: DailyReport | null;
        if (isBeforeReportTime) {
          previousReport = liveReports.length > 0 ? liveReports[0] : null;
        } else {
          previousReport = liveReports.find((r: DailyReport) => {
            const reportDate = normalizeDate(r.report_date);
            return reportDate !== todayNY && reportDate < todayNY;
          }) || null;
        }

        // Today's report - show only if AFTER 9 AM AND report exists
        const currentReport = isBeforeReportTime ? null : (todayReport || null);

        console.log('[WAR ZONE] 📌 Daily Assignment:', {
          current: currentReport?.id || 'WAITING',
          previous: previousReport?.id || 'NONE'
        });

        setCurrentDailyReport(currentReport);
        setPreviousDayReport(previousReport);
        
        // New report detection
        const latestDailyId = dailyData[0]?.id;
        if (lastFetchedDailyId.current && latestDailyId && latestDailyId !== lastFetchedDailyId.current) {
          setHasNewReport(true);
          setTimeout(() => setHasNewReport(false), 5000);
        }
        lastFetchedDailyId.current = latestDailyId || null;
      } else {
        setCurrentDailyReport(null);
        setPreviousDayReport(null);
      }
      
      // Process weekly reports
      const weeklyData = weeklyResult.data;
      const weeklyError = weeklyResult.error;
      
      if (weeklyError) {
        console.error('[WAR ZONE] ❌ Error fetching weekly reports:', weeklyError);
        setCurrentWeeklyReport(null);
        setPreviousWeeklyReport(null);
      } else if (weeklyData && weeklyData.length > 0) {
        const dayOfWeekNY = nyTime.getDay();
        const hourNY = nyTime.getHours();
        
        // Waiting period: Saturday 6PM to Sunday 10 AM NY
        const isWeeklyWaiting = (dayOfWeekNY === 6 && hourNY >= 18) || (dayOfWeekNY === 0 && hourNY < 10);
        
        const thisWeeksReport = isWeeklyWaiting 
          ? null 
          : (weeklyData.length > 0 ? weeklyData[0] : null);
        
        const prevWeeklyReport = weeklyData.length > 1 
          ? weeklyData[1] 
          : (isWeeklyWaiting && weeklyData.length > 0 ? weeklyData[0] : null);
        
        console.log('[WAR ZONE] 📌 Weekly Assignment:', {
          current: thisWeeksReport?.id || 'WAITING',
          previous: prevWeeklyReport?.id || 'NONE'
        });
        
        setCurrentWeeklyReport(thisWeeksReport);
        setPreviousWeeklyReport(prevWeeklyReport);
        
        const latestWeeklyId = weeklyData[0]?.id;
        if (lastFetchedWeeklyId.current && latestWeeklyId && latestWeeklyId !== lastFetchedWeeklyId.current) {
          setHasNewReport(true);
          setTimeout(() => setHasNewReport(false), 5000);
        }
        lastFetchedWeeklyId.current = latestWeeklyId || null;
      } else {
        setCurrentWeeklyReport(null);
        setPreviousWeeklyReport(null);
      }
      
      // Fetch TEST reports (ONLY FOR TESTERS)
      if (currentIsTester) {
        console.log('[WAR ZONE] 🧪 Fetching TEST reports for tester...');
        const { data: testData, error: testError } = await supabase
          .from('daily_reports')
          .select('*')
          .eq('visibility', 'test')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (testError) {
          console.error('[WAR ZONE] ❌ Error fetching test reports:', testError);
        } else if (testData && testData.length > 0) {
          console.log('[WAR ZONE] 🧪 Found TEST report:', testData[0].id);
          setTestDailyReport(prevState => {
            if (!prevState || prevState.id !== testData[0].id) {
              return testData[0];
            }
            return prevState;
          });
        } else {
          console.log('[WAR ZONE] 🧪 No TEST reports found');
          setTestDailyReport(null);
        }
      }
    } catch (error) {
      console.error('[WAR ZONE] ❌ Fatal error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isTester]);

  // ============================================
  // DOWNLOAD REPORT
  // ============================================
  const downloadReport = useCallback(async (report: DailyReport | WeeklyReport, reportType: 'daily' | 'weekly') => {
    console.log('[WAR ZONE] 📥 Downloading:', { reportType, id: report.id });
    
    const dateStr = normalizeDate(report.report_date);
    const filename = reportType === 'daily' 
      ? `daily-report-${dateStr}.pdf`
      : `weekly-report-${dateStr}.pdf`;
    
    const downloadPdf = async (url: string, source: string): Promise<boolean> => {
      console.log(`[WAR ZONE] ✅ Downloading via ${source}`);
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size < 1000) throw new Error('PDF too small');
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        return true;
      } catch (error) {
        console.error(`[WAR ZONE] ❌ Download failed via ${source}:`, error);
        return false;
      }
    };

    // Method 1: Direct pdf_url
    if (report.pdf_url && report.pdf_url.includes('supabase.co')) {
      if (await downloadPdf(report.pdf_url, 'direct pdf_url')) return;
    }
    
    // Method 2: pdf_path with signed URL
    if (report.pdf_path) {
      try {
        const { data, error } = await supabase.storage
          .from('reports')
          .createSignedUrl(report.pdf_path, 300);
        
        if (data?.signedUrl) {
          if (await downloadPdf(data.signedUrl, 'pdf_path signed URL')) return;
        }
      } catch (err) {
        console.error('[WAR ZONE] ❌ Error creating signed URL:', err);
      }
    }
    
    // Method 3: Construct path
    const folderPath = reportType === 'daily' ? 'daily-reports' : 'weekly-reports';
    const constructedPath = `${folderPath}/${reportType}-report-${dateStr}.pdf`;
    
    try {
      const { data } = await supabase.storage
        .from('reports')
        .createSignedUrl(constructedPath, 300);
      
      if (data?.signedUrl) {
        if (await downloadPdf(data.signedUrl, 'constructed path')) return;
      }
    } catch (err) {
      console.error('[WAR ZONE] ❌ Constructed path failed:', err);
    }
    
    // Method 4: List bucket
    try {
      const { data: files } = await supabase.storage
        .from('reports')
        .list(folderPath, { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
      
      if (files && files.length > 0) {
        const matchingFile = files.find(f => f.name.includes(dateStr));
        const fileToUse = matchingFile || files[0];
        const fullPath = `${folderPath}/${fileToUse.name}`;
        
        const { data: signedData } = await supabase.storage
          .from('reports')
          .createSignedUrl(fullPath, 300);
        
        if (signedData?.signedUrl) {
          if (await downloadPdf(signedData.signedUrl, 'bucket listing')) return;
        }
      }
    } catch (err) {
      console.error('[WAR ZONE] ❌ Bucket listing failed:', err);
    }
    
    alert(`PDF not available for ${dateStr}. Please try again or contact support.`);
  }, []);

  // ============================================
  // CLEAR TEST REPORT
  // ============================================
  const clearTestReport = useCallback(() => {
    setTestDailyReport(null);
  }, []);

  // ============================================
  // EFFECTS: Initial fetch
  // ============================================
  useEffect(() => {
    fetchReports(true);
  }, [fetchReports]);

  // ============================================
  // EFFECTS: Countdown timer
  // ============================================
  useEffect(() => {
    const calculateCountdowns = () => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Daily countdown - Next 9:00 AM NY (Mon-Fri)
      const dailyTarget = new Date(nyTime);
      dailyTarget.setHours(9, 0, 0, 0);
      
      if (nyTime >= dailyTarget) {
        dailyTarget.setDate(dailyTarget.getDate() + 1);
      }
      
      while (dailyTarget.getDay() === 0 || dailyTarget.getDay() === 6) {
        dailyTarget.setDate(dailyTarget.getDate() + 1);
      }
      
      const dailyDiff = dailyTarget.getTime() - nyTime.getTime();
      
      // Weekly countdown - Next Sunday 10:00 AM NY
      const weeklyTarget = new Date(nyTime);
      const dayOfWeek = nyTime.getDay();
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
          seconds: Math.floor((dailyDiff % (1000 * 60)) / 1000)
        },
        weekly: {
          hours: Math.floor(weeklyDiff / (1000 * 60 * 60)),
          minutes: Math.floor((weeklyDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((weeklyDiff % (1000 * 60)) / 1000)
        }
      };
    };
    
    const countdowns = calculateCountdowns();
    setDailyCountdown(countdowns.daily);
    setWeeklyCountdown(countdowns.weekly);
    
    const interval = setInterval(() => {
      const countdowns = calculateCountdowns();
      setDailyCountdown(countdowns.daily);
      setWeeklyCountdown(countdowns.weekly);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // EFFECTS: Real-time subscription
  // ============================================
  useEffect(() => {
    console.log('[WAR ZONE] 📡 Setting up real-time subscription...');
    
    const reportsSub = supabase
      .channel('reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_reports'
      }, (payload) => {
        console.log('[WAR ZONE] 🔔 Daily report change:', payload.eventType);
        fetchReports(false);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'weekly_reports'
      }, () => {
        console.log('[WAR ZONE] 🔔 New weekly report');
        fetchReports(false);
      })
      .subscribe();

    return () => {
      reportsSub.unsubscribe();
    };
  }, [fetchReports]);

  // ============================================
  // EFFECTS: Auto-refresh during generation window
  // ============================================
  useEffect(() => {
    const checkIfShouldRefresh = (): boolean => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const dayOfWeek = nyTime.getDay();
      
      const isDailyWindow = dayOfWeek >= 1 && dayOfWeek <= 5 && 
        ((hour === 8 && minute >= 55) || (hour === 9 && minute <= 10));
      
      const isWeeklyWindow = dayOfWeek === 0 && hour === 10 && minute <= 10;
      
      return isDailyWindow || isWeeklyWindow;
    };
    
    const interval = setInterval(() => {
      if (checkIfShouldRefresh()) {
        console.log('[WAR ZONE] 🕐 In generation window - checking...');
        reportCache.invalidateAll();
        fetchReports(false);
      }
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchReports]);

  // ============================================
  // EFFECTS: Midnight refresh
  // ============================================
  useEffect(() => {
    const scheduleNextMidnightRefresh = (): NodeJS.Timeout => {
      const now = new Date();
      const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyTime = new Date(nyTimeStr);
      
      const nextMidnight = new Date(nyTime);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 5, 0);
      
      const msUntilMidnight = nextMidnight.getTime() - nyTime.getTime();
      
      return setTimeout(() => {
        console.log('[WAR ZONE] 🌙 Midnight - refreshing...');
        reportCache.invalidateAll();
        fetchReports(false);
        scheduleNextMidnightRefresh();
      }, msUntilMidnight);
    };
    
    const timeout = scheduleNextMidnightRefresh();
    return () => clearTimeout(timeout);
  }, [fetchReports]);

  return {
    currentDailyReport,
    previousDailyReport,
    currentWeeklyReport,
    previousWeeklyReport,
    testDailyReport,
    isTester,
    isInTrial: isInTrial ?? false,
    trialDaysRemaining: trialDaysRemaining ?? null,
    dailyCountdown,
    weeklyCountdown,
    isLoading,
    hasNewReport,
    refetch: fetchReports,
    downloadReport,
    clearTestReport,
  };
}

export default useWarZoneData;