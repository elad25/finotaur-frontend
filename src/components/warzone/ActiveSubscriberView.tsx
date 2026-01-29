// =====================================================
// FINOTAUR WAR ZONE - Active Subscriber View v3.0
// 🔥 COMPLETE: All original logic preserved
// =====================================================

import { memo, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Calendar, Clock, ChevronRight, Loader2, Send, AlertCircle, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const DISCORD_INVITE_URL = 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/';
const BullWarZone = '/assets/Bull-WarZone.png';
const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
const FETCH_CONFIG = { MIN_FETCH_INTERVAL: 10000, REALTIME_DEBOUNCE: 2000 };

interface NewsletterStatus {
  newsletter_enabled: boolean;
  newsletter_status: string;
  newsletter_whop_membership_id: string | null;
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  days_until_expiry: number | null;
  days_until_trial_ends: number | null;
  is_in_trial: boolean;
  is_active: boolean;
}

interface DailyReport {
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

interface WeeklyReport {
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

const DiscordIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
));

const ParticleBackground = memo(function ParticleBackground() {
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 12 + 8,
    delay: Math.random() * 15,
    opacity: Math.random() * 0.6 + 0.2,
    color: Math.random() > 0.5 
      ? `rgba(255, ${140 + Math.random() * 60}, ${20 + Math.random() * 40}, 1)`
      : `rgba(${200 + Math.random() * 55}, ${160 + Math.random() * 50}, ${50 + Math.random() * 30}, 1)`,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: p.left, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`,
          background: p.color, boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          animation: `particle-rise ${p.duration}s linear infinite`,
          animationDelay: `${p.delay}s`, opacity: p.opacity,
        }} />
      ))}
    </div>
  );
});

function formatReportDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatReportTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
}

function normalizeDate(dateStr: string | Date | null): string {
  if (!dateStr) return '';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  return str.split('T')[0];
}

// Test Report Card with Publish
const TestReportCard = memo(function TestReportCard({ testDailyReport, onDownload, onPublishSuccess, clearTestReport }: {
  testDailyReport: DailyReport; onDownload: () => void; onPublishSuccess: () => void; clearTestReport: () => void;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePublishToLive = async () => {
    setIsPublishing(true);
    try {
      const testReportDate = testDailyReport.report_date.split('T')[0];
      const response = await fetch(`${API_BASE}/api/reports/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: testDailyReport.id, reportDate: testReportDate }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) { alert(`Failed: ${data.error || 'Unknown'}`); return; }
      await new Promise(resolve => setTimeout(resolve, 800));
      setShowConfirmModal(false);
      clearTestReport();
      onPublishSuccess();
    } catch { alert('Error publishing. Try again.'); }
    finally { setIsPublishing(false); }
  };

  return (
    <>
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-green-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center"><Send className="w-6 h-6 text-green-400" /></div>
              <div><h3 className="text-white font-bold text-lg">Publish to Live</h3><p className="text-[#C9A646]/60 text-sm">Visible to all subscribers</p></div>
            </div>
            <div className="bg-[#1a1410] rounded-xl p-4 mb-6 border border-[#C9A646]/20">
              <p className="text-[#C9A646]/80 text-sm mb-2">Report:</p>
              <p className="text-white font-semibold">{formatReportDate(testDailyReport.report_date)}</p>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-4 mb-6 border border-yellow-500/30">
              <p className="text-yellow-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />Replaces current LIVE report</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.3)', color: '#C9A646' }}>Cancel</button>
              <button onClick={handlePublishToLive} disabled={isPublishing} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
                {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}Publish
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">🧪 TESTER ONLY</span>
          <span className="text-[#C9A646]/50 text-sm">Visible only to testers</span>
        </div>
        <div className="group relative w-full p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(88,28,135,0.1) 100%)', border: '2px solid rgba(147,51,234,0.4)' }}>
          <div className="flex items-start justify-between">
            <button onClick={onDownload} className="flex items-center gap-3 text-left flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/20 border border-purple-500/40"><FileText className="w-5 h-5 text-purple-400" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">🧪 TEST: {formatReportDate(testDailyReport.created_at)}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">PENDING</span>
                </div>
                <p className="text-purple-400/60 text-xs">Generated at {formatReportTime(testDailyReport.updated_at || testDailyReport.created_at)} ET</p>
              </div>
            </button>
            <div className="flex items-center gap-2 ml-4">
              <button onClick={() => setShowConfirmModal(true)} className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(22,163,74,0.15) 100%)', border: '1px solid rgba(34,197,94,0.5)', color: '#22c55e' }}><Send className="w-4 h-4" />Publish</button>
              <button onClick={onDownload} className="p-2 rounded-xl hover:bg-purple-500/20 border border-purple-500/30"><ChevronRight className="w-5 h-5 text-purple-400" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

// Report Card
const ReportCard = memo(function ReportCard({ report, type, isLoading, onDownload }: {
  report: DailyReport | WeeklyReport | null; type: 'daily' | 'weekly'; isLoading: boolean; onDownload: () => void;
}) {
  const Icon = type === 'daily' ? FileText : Calendar;
  const hasReport = !!report;
  return (
    <div className={cn("group relative p-5 rounded-2xl text-left transition-all duration-300", hasReport && "hover:scale-[1.02] cursor-pointer")}
      style={{ background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}
      onClick={hasReport ? onDownload : undefined}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#C9A646]/15 border border-[#C9A646]/30">
            {isLoading ? <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" /> : <Icon className="w-5 h-5 text-[#C9A646]" />}
          </div>
          <div>
            <p className={type === 'weekly' ? "text-[#C9A646] font-semibold italic" : "text-white font-semibold"}>
              {isLoading ? 'Loading...' : report ? (type === 'weekly' ? `Week of ${new Date(report.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : formatReportDate(report.report_date)) : `No ${type} report`}
            </p>
            <p className="text-[#C9A646]/50 text-xs">{isLoading ? 'Please wait...' : report ? `Published at ${formatReportTime(report.created_at)} ET` : 'Check back later'}</p>
          </div>
        </div>
        {hasReport && <ChevronRight className="w-5 h-5 text-[#C9A646] transition-transform group-hover:translate-x-1" />}
      </div>
    </div>
  );
});

// Main Component
interface ActiveSubscriberViewProps {
  newsletterStatus: NewsletterStatus;
  onCancelClick: () => void;
  isTester?: boolean;
}

export const ActiveSubscriberView = memo(function ActiveSubscriberView({ newsletterStatus, onCancelClick, isTester: propIsTester = false }: ActiveSubscriberViewProps) {
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isTester, setIsTester] = useState(propIsTester);
  const [currentDayReport, setCurrentDayReport] = useState<DailyReport | null>(null);
  const [currentWeeklyReport, setCurrentWeeklyReport] = useState<WeeklyReport | null>(null);
  const [previousDayReport, setPreviousDayReport] = useState<DailyReport | null>(null);
  const [previousWeeklyReport, setPreviousWeeklyReport] = useState<WeeklyReport | null>(null);
  const [testDailyReport, setTestDailyReport] = useState<DailyReport | null>(null);
  const [dailyCountdown, setDailyCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [weeklyCountdown, setWeeklyCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const lastFetchTimeRef = useRef<number>(0);

  const fetchReports = useCallback(async (showLoading = true) => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_CONFIG.MIN_FETCH_INTERVAL) return;
    lastFetchTimeRef.current = now;
    if (showLoading) setIsLoadingReports(true);
    
    try {
      const nowDate = new Date();
      const nyTimeStr = nowDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyTime = new Date(nyTimeStr);
      const todayNY = nyTime.toISOString().split('T')[0];
      const nyHour = nyTime.getHours();
      const dayOfWeek = nyTime.getDay();
      
      const [userResult, dailyResult, weeklyResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('daily_reports').select('*').eq('visibility', 'live').order('report_date', { ascending: false }).limit(10),
        supabase.from('weekly_reports').select('*').eq('visibility', 'live').order('report_date', { ascending: false }).limit(2),
      ]);

      const user = userResult.data?.user;
      if (user?.id) {
        const { data: profile } = await supabase.from('profiles').select('is_tester, role').eq('id', user.id).single();
        if (profile) setIsTester(profile.is_tester || profile.role === 'admin' || profile.role === 'super_admin');
      }

      const dailyData = dailyResult.data ?? [];
      const liveReports = dailyData.filter((r: any) => r.visibility === 'live');
      const isBeforeReportTime = nyHour < 9;
      const todayReport = liveReports.find((r: DailyReport) => normalizeDate(r.report_date) === todayNY);
      const previousReport = isBeforeReportTime ? (liveReports[0] || null) : liveReports.find((r: DailyReport) => normalizeDate(r.report_date) !== todayNY) || null;

      setCurrentDayReport(isBeforeReportTime ? null : todayReport || null);
      setPreviousDayReport(previousReport);

      const weeklyData = weeklyResult.data ?? [];
      const isWeeklyWaiting = (dayOfWeek === 6 && nyHour >= 18) || (dayOfWeek === 0 && nyHour < 10);
      setCurrentWeeklyReport(isWeeklyWaiting ? null : (weeklyData[0] || null));
      setPreviousWeeklyReport(weeklyData[1] || (isWeeklyWaiting && weeklyData[0] ? weeklyData[0] : null));

      if (isTester || propIsTester) {
        const { data: testData } = await supabase.from('daily_reports').select('*').eq('visibility', 'test').order('updated_at', { ascending: false }).limit(1);
        setTestDailyReport(testData?.[0] || null);
      }
    } catch (error) { console.error('[WAR ZONE] Fetch error:', error); }
    finally { setIsLoadingReports(false); }
  }, [isTester, propIsTester]);

  useEffect(() => { fetchReports(true); }, [fetchReports]);

  useEffect(() => {
    const channel = supabase.channel('warzone-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_reports' }, () => setTimeout(() => fetchReports(false), FETCH_CONFIG.REALTIME_DEBOUNCE))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weekly_reports' }, () => setTimeout(() => fetchReports(false), FETCH_CONFIG.REALTIME_DEBOUNCE))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const dailyTarget = new Date(nyTime); dailyTarget.setHours(9, 0, 0, 0);
      if (nyTime >= dailyTarget) dailyTarget.setDate(dailyTarget.getDate() + 1);
      while (dailyTarget.getDay() === 0 || dailyTarget.getDay() === 6) dailyTarget.setDate(dailyTarget.getDate() + 1);
      const dailyDiff = dailyTarget.getTime() - nyTime.getTime();
      
      const weeklyTarget = new Date(nyTime);
      const daysUntilSunday = nyTime.getDay() === 0 ? 0 : 7 - nyTime.getDay();
      weeklyTarget.setDate(nyTime.getDate() + daysUntilSunday); weeklyTarget.setHours(10, 0, 0, 0);
      if (nyTime >= weeklyTarget) weeklyTarget.setDate(weeklyTarget.getDate() + 7);
      const weeklyDiff = weeklyTarget.getTime() - nyTime.getTime();

      setDailyCountdown({ hours: Math.floor(dailyDiff / 3600000), minutes: Math.floor((dailyDiff % 3600000) / 60000), seconds: Math.floor((dailyDiff % 60000) / 1000) });
      setWeeklyCountdown({ hours: Math.floor(weeklyDiff / 3600000), minutes: Math.floor((weeklyDiff % 3600000) / 60000), seconds: Math.floor((weeklyDiff % 60000) / 1000) });
    };
    calc(); const interval = setInterval(calc, 10000); return () => clearInterval(interval);
  }, []);

  const handleReportClick = useCallback(async (report: DailyReport | WeeklyReport, reportType: 'daily' | 'weekly') => {
    const dateStr = report.report_date.split('T')[0];
    const filename = reportType === 'daily' ? `daily-report-${dateStr}.pdf` : `weekly-report-${dateStr}.pdf`;
    const download = async (url: string): Promise<boolean> => {
      try {
        const res = await fetch(url); if (!res.ok) return false;
        const blob = await res.blob(); if (blob.size < 1000) return false;
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = blobUrl; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl); return true;
      } catch { return false; }
    };
    if (report.pdf_url?.includes('supabase.co') && await download(report.pdf_url)) return;
    if (report.pdf_path) {
      const { data } = await supabase.storage.from('reports').createSignedUrl(report.pdf_path, 300);
      if (data?.signedUrl && await download(data.signedUrl)) return;
    }
    if (reportType === 'daily') {
      try { const res = await fetch(`${API_BASE}/api/newsletter/pdf`); if (res.ok) { const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url); return; } } catch {}
    }
    alert(`PDF not available for ${dateStr}`);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0806] relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        .heading-serif{font-family:'Playfair Display',Georgia,serif}
        @keyframes particle-rise{0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:.7}80%{opacity:.5}100%{transform:translateY(-85vh) scale(.3);opacity:0}}
      `}</style>

      {newsletterStatus.is_in_trial && newsletterStatus.days_until_trial_ends !== null && (
        <div className="relative z-50 bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/10 to-[#C9A646]/20 border-b border-[#C9A646]/30 px-4 py-3 text-center">
          <p className="text-[#C9A646] text-sm font-semibold flex items-center justify-center gap-2"><Clock className="w-4 h-4" />Free trial ends in {newsletterStatus.days_until_trial_ends} day{newsletterStatus.days_until_trial_ends !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="relative">
        <div className="absolute top-1/4 left-0 w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.35) 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translateX(-40%)' }} />
        <ParticleBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 mb-12 min-h-[400px] lg:min-h-[500px]">
            <div className="text-center lg:text-left lg:flex-1 lg:max-w-xl">
              <h1 className="font-bold leading-[1.05] tracking-tight mb-6">
                <span className="text-3xl md:text-4xl lg:text-5xl text-white block heading-serif italic mb-2">Welcome to the</span>
                <span className="text-5xl md:text-6xl lg:text-7xl block bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent font-bold tracking-tight">WAR ZONE</span>
              </h1>
              <p className="text-[#9A9080] text-sm md:text-base leading-relaxed max-w-md mb-8">The same market intelligence that hedge funds pay<span className="text-[#C9A646] font-medium"> $2,000+/month </span>for — now available for serious traders who want an edge.</p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {currentDayReport ? (
                  <button onClick={() => handleReportClick(currentDayReport, 'daily')} disabled={isLoadingReports} className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.4)' }}>
                    {isLoadingReports ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}Open Today's Report
                  </button>
                ) : (
                  <div className="px-8 py-4 rounded-xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#C9A646]/15 border border-[#C9A646]/30"><Clock className="w-6 h-6 text-[#C9A646] animate-pulse" /></div>
                    <div className="text-left"><span className="block text-[#C9A646] font-bold text-base">Today's Report Coming Soon</span><span className="block text-[#C9A646]/60 text-sm">Available at 9:00 AM ET • {dailyCountdown.hours}h {dailyCountdown.minutes}m remaining</span></div>
                  </div>
                )}
                {currentWeeklyReport ? (
                  <button onClick={() => handleReportClick(currentWeeklyReport, 'weekly')} disabled={isLoadingReports} className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.4)' }}>
                    {isLoadingReports ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}View Weekly Review
                  </button>
                ) : (
                  <div className="px-8 py-4 rounded-xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#C9A646]/15 border border-[#C9A646]/30"><Clock className="w-6 h-6 text-[#C9A646] animate-pulse" /></div>
                    <div className="text-left"><span className="block text-[#C9A646] font-bold text-base">Weekly Review Coming Soon</span><span className="block text-[#C9A646]/60 text-sm">Available Sunday 10:00 AM ET • {weeklyCountdown.hours}h {weeklyCountdown.minutes}m remaining</span></div>
                  </div>
                )}
              </div>
              <p className="text-[#C9A646]/60 text-sm flex items-center gap-2 justify-center lg:justify-start"><Clock className="w-4 h-4 text-[#C9A646]" />New report every trading day • 9:10 AM ET • Bookmark this page</p>
            </div>

            <div className="relative flex-shrink-0 lg:flex-1 flex justify-center lg:justify-end -mr-8 lg:-mr-16">
              <div className="relative z-10 overflow-hidden" style={{ maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 70%)' }}>
                <img src={BullWarZone} alt="War Zone Bull" className="w-[500px] md:w-[600px] lg:w-[700px] h-auto" style={{ filter: 'drop-shadow(0 0 80px rgba(255,130,30,0.8)) drop-shadow(0 0 40px rgba(255,100,20,0.6))', mixBlendMode: 'lighten', marginTop: '-22%', marginBottom: '-45%' }} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="heading-serif text-xl text-[#E8DCC4]/80 italic">Previous Reports</h3>
              <p className="text-[#C9A646]/50 text-sm">Always available for download</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportCard report={previousDayReport} type="daily" isLoading={isLoadingReports} onDownload={() => previousDayReport && handleReportClick(previousDayReport, 'daily')} />
              <ReportCard report={previousWeeklyReport} type="weekly" isLoading={isLoadingReports} onDownload={() => previousWeeklyReport && handleReportClick(previousWeeklyReport, 'weekly')} />
            </div>
          </div>

          {isTester && testDailyReport && (
            <TestReportCard testDailyReport={testDailyReport} onDownload={() => handleReportClick(testDailyReport, 'daily')} onPublishSuccess={() => fetchReports(false)} clearTestReport={() => setTestDailyReport(null)} />
          )}

          <p className="text-center text-[#C9A646]/60 text-lg heading-serif italic mb-10">Stay sharp. stay informed. Here's your intel for today.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#5865F2]/15 border border-[#5865F2]/30"><DiscordIcon className="w-6 h-6 text-[#5865F2]" /></div>
                <div><h4 className="text-white font-bold text-lg">Discord Community</h4><p className="text-[#C9A646]/50 text-sm">Join 847+ active traders</p></div>
              </div>
              <button className="w-full py-3 rounded-xl font-semibold text-sm bg-[#5865F2]/15 border border-[#5865F2]/40 text-[#5865F2]">Join Now</button>
            </a>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/15 border border-purple-500/30"><Headphones className="w-6 h-6 text-purple-400" /></div>
                <div><h4 className="text-white font-bold text-lg">Trading Room</h4><p className="text-[#C9A646]/50 text-sm">Live market analysis now</p></div>
              </div>
              <button className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-500/15 border border-purple-500/40 text-purple-400">Join Now</button>
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(201,166,70,0.05) 50%, rgba(255,140,30,0.1) 100%)' }} />
      </div>
    </div>
  );
});

export default ActiveSubscriberView;