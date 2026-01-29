// =====================================================
// TopSecretDashboard - Main Component v3.0 OPTIMIZED
// 🔥 REDUCED: From 2000+ lines to ~450 lines
// 🔥 PERFORMANCE: Code splitting, memoization, lazy loading
// =====================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Loader2,
  Sparkles,
  Archive,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Check,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Local imports
import {
  type Report,
  type SubscriptionInfo,
  transformReport,
  deduplicateReports,
  sortReports,
  groupReportsByMonth,
  getMonthKey,
} from './utils/helpers';
import {
  useReportsCache,
  useReportDownload,
  useRealtimeReports,
  useUserInteractions,
  broadcastReportPromoted,
} from './hooks';
import {
  SearchBar,
  FilterTabs,
  StatsCard,
  CompactReportCard,
  MonthGroup,
  HowToUseSection,
  MemberSection,
  BottomFeaturesBar,
} from './components';

interface TopSecretDashboardProps {
  userId?: string;
}

export default function TopSecretDashboard({ userId }: TopSecretDashboardProps) {
  const { user } = useAuth();
  
  // Core state
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  // User state
  const [isTester, setIsTester] = useState(false);
  const [testModeEnabled, setTestModeEnabled] = useState(true);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  
  // Promote state
  const [promotingReportId, setPromotingReportId] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  const currentUserId = userId || user?.id;
  const effectiveIsTester = isTester && testModeEnabled;

  // Custom hooks
  const cache = useReportsCache(currentUserId, effectiveIsTester);
  const { downloadReport, downloadingId, error: downloadError, clearError } = useReportDownload();
  const { interactions, toggleLike, toggleBookmark } = useUserInteractions(currentUserId);

  // Fetch user profile
  useEffect(() => {
    async function fetchUserProfile() {
      if (!currentUserId) {
        setIsUserLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_tester, role, email')
          .eq('id', currentUserId)
          .single();

        if (!error && data) {
          const isAdmin = data.role === 'admin' || data.role === 'super_admin' || data.email === 'elad2550@gmail.com';
          setIsTester(data.is_tester || isAdmin);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsUserLoaded(true);
      }
    }

    fetchUserProfile();
  }, [currentUserId]);

  // Fetch reports
  useEffect(() => {
    async function fetchReports() {
      if (!isUserLoaded || !currentUserId) {
        setIsLoading(false);
        return;
      }

      const fetchParams = `${currentUserId}_${effectiveIsTester}`;
      if (!cache.shouldFetch(fetchParams)) return;

      // Try cache first
      const cached = cache.getCachedReports();
      if (cached && cached.length > 0) {
        setReports(cached);
        setIsLoading(false);
        setExpandedMonths(new Set([getMonthKey(new Date())]));
      } else {
        setIsLoading(true);
      }

      // Fetch fresh data
      try {
        const { data: publishedReports, error } = await supabase
          .rpc('get_published_reports_for_user', {
            p_user_id: currentUserId,
            p_limit: 200,
            p_is_tester: effectiveIsTester,
          });

        if (error) throw error;

        if (!publishedReports || publishedReports.length === 0) {
          setReports([]);
          return;
        }

        const transformed = publishedReports
          .map(transformReport)
          .filter((r): r is Report => r !== null)
          .filter(r => effectiveIsTester ? true : (r.visibility || 'live') !== 'test');

        const sorted = sortReports(deduplicateReports(transformed));
        setReports(sorted);
        cache.setCachedReports(sorted);
        setExpandedMonths(new Set([getMonthKey(new Date())]));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReports();
  }, [currentUserId, effectiveIsTester, isUserLoaded, cache]);

  // Realtime handlers
  const handleReportInsert = useCallback((report: Report) => {
    setReports(prev => {
      if (prev.some(r => r.id === report.id)) return prev;
      return sortReports([report, ...prev]);
    });
    cache.addReportToCache(report);
    setExpandedMonths(prev => new Set([...prev, getMonthKey(report.date)]));
  }, [cache]);

  const handleReportUpdate = useCallback((reportId: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
    cache.updateReportInCache(reportId, updates);
  }, [cache]);

  useRealtimeReports({
    userId: currentUserId,
    isTester: effectiveIsTester,
    isUserLoaded,
    onReportInsert: handleReportInsert,
    onReportUpdate: handleReportUpdate,
    onReportPromoted: handleReportInsert,
  });

  // Promote handler
  const handlePromoteToLive = useCallback(async (report: Report) => {
    if (!report.id || !currentUserId) return;
    setPromotingReportId(report.id);

    // Optimistic update
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, visibility: 'live' } : r));
    cache.updateReportInCache(report.id, { visibility: 'live' });
    setPromoteSuccess(`${report.ticker || report.title} promoted!`);

    try {
      const { error } = await supabase
        .from('published_reports')
        .update({ visibility: 'live', updated_at: new Date().toISOString() })
        .eq('id', report.id);
      if (error) throw error;
      broadcastReportPromoted(report.id);
    } catch {
      // Rollback
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, visibility: 'test' } : r));
      cache.updateReportInCache(report.id, { visibility: 'test' });
      setPromoteSuccess(null);
    } finally {
      setPromotingReportId(null);
      setTimeout(() => setPromoteSuccess(null), 3000);
    }
  }, [currentUserId, cache]);

  // Memoized data
  const filteredReports = useMemo(() => {
    let result = reports;
    if (selectedFilter !== 'all') result = result.filter(r => r.type === selectedFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q) ||
        r.ticker?.toLowerCase().includes(q) ||
        r.companyName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, selectedFilter, searchQuery]);

  const groupedReports = useMemo(() => groupReportsByMonth(filteredReports), [filteredReports]);
  const sortedMonthKeys = useMemo(() => Object.keys(groupedReports).sort((a, b) => b.localeCompare(a)), [groupedReports]);
  const latestByType = useMemo(() => {
    return ['macro', 'company', 'crypto', 'weekly']
      .map(type => reports.find(r => r.type === type))
      .filter((r): r is Report => r !== null);
  }, [reports]);

  // Actions
  const toggleMonth = useCallback((monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
      return next;
    });
  }, []);

  const expandAllMonths = useCallback(() => setExpandedMonths(new Set(reports.map(r => getMonthKey(r.date)))), [reports]);
  const collapseAllMonths = useCallback(() => setExpandedMonths(new Set()), []);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Top Secret Member Dashboard
            </h1>
            {isTester && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/50 border border-purple-500/30">
                <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-300">Test Mode</span>
                <button onClick={() => setTestModeEnabled(!testModeEnabled)} className={`relative w-9 h-5 rounded-full transition-colors ${testModeEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}>
                  <motion.div animate={{ x: testModeEnabled ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-400 max-w-2xl text-sm">Your institutional-grade market intelligence is ready.</p>
        </motion.div>

        {/* Toasts */}
        <AnimatePresence>
          {promoteSuccess && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Check className="w-5 h-5" /><span>{promoteSuccess}</span>
            </motion.div>
          )}
          {downloadError && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /><span>{downloadError}</span><button onClick={clearError}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Latest Reports */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Latest Reports</h2>
                <span className="text-xs text-gray-500 ml-2">{currentMonth}</span>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
              ) : latestByType.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No reports available yet</p></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {latestByType.map(report => <CompactReportCard key={report.id} report={report} onDownload={downloadReport} isDownloading={downloadingId === report.id} />)}
                </div>
              )}
            </motion.div>

            {/* Search & Filter */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1"><SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by ticker, company, sector..." /></div>
              <FilterTabs selected={selectedFilter} onChange={setSelectedFilter} />
            </motion.div>

            {/* Archive */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Reports Archive</h2>
                  <span className="text-xs text-gray-500 ml-2">{filteredReports.length} reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={expandAllMonths} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1"><ChevronDown className="w-3.5 h-3.5" />Expand All</button>
                  <button onClick={collapseAllMonths} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1"><ChevronUp className="w-3.5 h-3.5" />Collapse All</button>
                </div>
              </div>
              {sortedMonthKeys.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border border-white/10 rounded-xl">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No reports found</p>
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-amber-400 text-sm hover:underline">Clear search</button>}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedMonthKeys.map(monthKey => (
                    <MonthGroup key={monthKey} monthKey={monthKey} reports={groupedReports[monthKey]} isExpanded={expandedMonths.has(monthKey)} onToggle={() => toggleMonth(monthKey)} onDownload={downloadReport} downloadingReportId={downloadingId} userInteractions={interactions} onToggleLike={toggleLike} onToggleBookmark={toggleBookmark} isTester={isTester} onPromoteToLive={handlePromoteToLive} promotingReportId={promotingReportId} />
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}><StatsCard reports={reports} /></motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}><HowToUseSection /></motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}><MemberSection /></motion.div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12"><BottomFeaturesBar /></motion.div>
      </div>
    </div>
  );
}
