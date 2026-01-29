// =====================================================
// FINOTAUR WAR ZONE LANDING PAGE - OPTIMIZED v2.0
// 
// 🔥 OPTIMIZATIONS:
// - External CSS (browser cached)
// - React.memo on all components
// - useMemo/useCallback for expensive operations
// - Centralized data hook (useWarZoneData)
// - Code splitting for modals
// - No inline styles where possible
// 
// ✅ SAME UI & LOGIC - Just faster!
// =====================================================

import { useState, useEffect, useCallback, useRef, memo, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, Shield, Clock, ArrowRight, FileText,
  Loader2, Globe, Headphones, Calendar, Sparkles, 
  ChevronDown, X, AlertCircle, LogIn, XCircle, 
  Crown, Rocket, TrendingUp, Check, Send, Target,
  BarChart3, Zap, ChevronRight, Activity,
} from 'lucide-react';

// Optimized components (same folder)
import { 
  ParticleBackground, 
  SparkleEffect, 
  GoldenDivider, 
  DiscordIcon, 
  BellIcon, 
  CompassIcon,
  FullPageLoader,
  AmbientGlow,
  FireGlow,
} from './VisualComponents';

// Centralized data hook
import { useWarZoneData, type DailyReport, type WeeklyReport } from '@/hooks/useWarZoneData';

// Lazy load modals (code splitting)
const DisclaimerPopup = lazy(() => import('./modals/DisclaimerPopup'));
const LoginRequiredPopup = lazy(() => import('./modals/LoginRequiredPopup'));
const CancelSubscriptionModal = lazy(() => import('./modals/CancelSubscriptionModal'));
const TermsModal = lazy(() => import('./modals/TermsModal'));

// Import external CSS
import '@/styles/warzone.css';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  WHOP_MONTHLY_PLAN_ID: 'plan_U6lF2eO5y9469',
  WHOP_YEARLY_PLAN_ID: 'plan_bp2QTGuwfpj0A',
  WHOP_MONTHLY_PLAN_ID_TOPSECRET: 'plan_BPJdT6Tyjmzcx',
  MONTHLY_PRICE: 69.99,
  YEARLY_PRICE: 699,
  MONTHLY_PRICE_TOPSECRET: 30,
  YEARLY_MONTHLY_EQUIVALENT: 58.25,
  DISCORD_INVITE_URL: 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/',
  REDIRECT_URL: 'https://www.finotaur.com/app/all-markets/warzone',
  API_BASE: import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app',
  BULL_IMAGE: '/assets/Bull-WarZone.png',
} as const;

const YEARLY_SAVINGS = Math.round((CONFIG.MONTHLY_PRICE * 12) - CONFIG.YEARLY_PRICE);

type BillingInterval = 'monthly' | 'yearly';

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatReportDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatReportTime = (createdAt: string): string => {
  return new Date(createdAt).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });
};

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

// Billing Toggle
const BillingToggle = memo(function BillingToggle({ 
  selected, 
  onChange 
}: { 
  selected: BillingInterval; 
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button 
        onClick={() => onChange('monthly')} 
        className={cn(
          "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300", 
          selected === 'monthly' 
            ? "btn-gold" 
            : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300 hover:border-[#C9A646]/50"
        )}
      >
        Monthly
      </button>
      <button 
        onClick={() => onChange('yearly')} 
        className={cn(
          "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 relative", 
          selected === 'yearly' 
            ? "btn-gold" 
            : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300 hover:border-[#C9A646]/50"
        )}
      >
        Yearly
        <span className={cn(
          "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold", 
          selected === 'yearly' 
            ? "bg-green-500 text-white" 
            : "bg-green-500/20 text-green-400 border border-green-500/30"
        )}>
          Save ${YEARLY_SAVINGS}
        </span>
      </button>
    </div>
  );
});

// Report Card
const ReportCard = memo(function ReportCard({
  report,
  type,
  isLoading,
  onDownload,
  variant = 'previous',
}: {
  report: DailyReport | WeeklyReport | null;
  type: 'daily' | 'weekly';
  isLoading: boolean;
  onDownload: () => void;
  variant?: 'current' | 'previous';
}) {
  const Icon = type === 'daily' ? FileText : Calendar;
  const hasReport = !!report;
  
  if (variant === 'current' && !hasReport) {
    return null; // Will show countdown instead
  }

  return (
    <div
      className={cn(
        "group relative p-5 rounded-2xl text-left transition-all duration-300 card-warzone",
        hasReport && "card-warzone-hover cursor-pointer"
      )}
      onClick={hasReport ? onDownload : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-container-gold">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
            ) : (
              <Icon className="w-5 h-5 text-[#C9A646]" />
            )}
          </div>
          <div>
            <p className={type === 'weekly' ? "text-[#C9A646] font-semibold italic" : "text-white font-semibold"}>
              {isLoading 
                ? 'Loading...' 
                : report 
                  ? (type === 'weekly' 
                      ? `Week of ${new Date(report.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                      : formatReportDate(report.report_date))
                  : `No ${type} report`
              }
            </p>
            <p className="text-[#C9A646]/50 text-xs">
              {isLoading 
                ? 'Please wait...'
                : report 
                  ? `Published at ${formatReportTime(report.created_at)} ET`
                  : 'Check back later'
              }
            </p>
          </div>
        </div>
        {hasReport && (
          <ChevronRight className="w-5 h-5 text-[#C9A646] transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </div>
  );
});

// Countdown Display
const CountdownDisplay = memo(function CountdownDisplay({
  title,
  subtitle,
  countdown,
}: {
  title: string;
  subtitle: string;
  countdown: { hours: number; minutes: number; seconds: number };
}) {
  return (
    <div className="px-8 py-4 rounded-xl flex items-center gap-4 card-warzone">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center icon-container-gold">
        <Clock className="w-6 h-6 text-[#C9A646] animate-pulse" />
      </div>
      <div className="text-left">
        <span className="block text-[#C9A646] font-bold text-base">{title}</span>
        <span className="block text-[#C9A646]/60 text-sm">
          {subtitle} • {countdown.hours}h {countdown.minutes}m remaining
        </span>
      </div>
    </div>
  );
});

// Test Report Card
const TestReportCard = memo(function TestReportCard({ 
  testDailyReport, 
  onDownload,
  onPublishSuccess,
}: { 
  testDailyReport: DailyReport;
  onDownload: () => void;
  onPublishSuccess: () => void;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePublishToLive = useCallback(async () => {
    setIsPublishing(true);
    try {
      const testReportDate = testDailyReport.report_date.split('T')[0];
      
      const response = await fetch(`${CONFIG.API_BASE}/api/reports/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: testDailyReport.id,
          reportDate: testReportDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(`Failed to publish report: ${data.error || 'Unknown error'}`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      setShowConfirmModal(false);
      onPublishSuccess();
    } catch {
      alert('Error publishing report. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [testDailyReport, onPublishSuccess]);

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowConfirmModal(false)} />
          <div className="relative modal-card border-green-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl icon-container-green flex items-center justify-center">
                <Send className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Publish to Live</h3>
                <p className="text-[#C9A646]/60 text-sm">Visible to all subscribers</p>
              </div>
            </div>
            
            <div className="bg-[#1a1410] rounded-xl p-4 mb-6 border border-[#C9A646]/20">
              <p className="text-[#C9A646]/80 text-sm mb-2">Report:</p>
              <p className="text-white font-semibold">{formatReportDate(testDailyReport.report_date)}</p>
            </div>

            <div className="bg-yellow-500/10 rounded-xl p-4 mb-6 border border-yellow-500/30">
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Replaces current LIVE report
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#C9A646]/10 border border-[#C9A646]/30 text-[#C9A646] hover:bg-[#C9A646]/20"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToLive}
                disabled={isPublishing}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white"
              >
                {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Report Card */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-tester px-2 py-1 rounded-md text-xs font-bold">🧪 TESTER ONLY</span>
          <span className="text-[#C9A646]/50 text-sm">Visible only to testers</span>
        </div>
        
        <div className="group relative w-full p-5 rounded-2xl card-test-report">
          <div className="flex items-start justify-between">
            <button onClick={onDownload} className="flex items-center gap-3 text-left flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-container-purple">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">
                    🧪 TEST: {formatReportDate(testDailyReport.created_at)}
                  </p>
                  <span className="badge-pending px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                    PENDING
                  </span>
                </div>
                <p className="text-purple-400/60 text-xs">
                  Generated at {formatReportTime(testDailyReport.updated_at || testDailyReport.created_at)} ET
                </p>
              </div>
            </button>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowConfirmModal(true)}
                className="btn-publish px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
              <button
                onClick={onDownload}
                className="p-2 rounded-xl border border-purple-500/30 hover:bg-purple-500/20"
              >
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

// Discord & Trading Room Cards
const CommunityCards = memo(function CommunityCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Discord */}
      <a 
        href={CONFIG.DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] card-warzone"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center card-discord">
            <DiscordIcon className="w-6 h-6 text-[#5865F2]" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">Discord Community</h4>
            <p className="text-[#C9A646]/50 text-sm">Join 847+ active traders</p>
          </div>
        </div>
        <button className="w-full py-3 rounded-xl font-semibold text-sm card-discord text-[#5865F2]">
          Join Now
        </button>
      </a>

      {/* Trading Room */}
      <a
        href={CONFIG.DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] card-warzone"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center card-trading-room">
            <Headphones className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">Trading Room</h4>
            <p className="text-[#C9A646]/50 text-sm">Live market analysis now</p>
          </div>
        </div>
        <button className="w-full py-3 rounded-xl font-semibold text-sm card-trading-room text-purple-400">
          Join Now
        </button>
      </a>
    </div>
  );
});

// Stats data
const STATS = [
  { value: '9:00 AM', label: 'Daily Delivery' },
  { value: '847+', label: 'Active Traders' },
  { value: '7 Days', label: 'Free Trial' },
  { value: '24/7', label: 'Discord Access' },
];

// Stats Bar
const StatsBar = memo(function StatsBar() {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-4">
      {STATS.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-lg sm:text-xl md:text-3xl lg:text-5xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">
            {stat.value}
          </div>
          <div className="text-slate-400 text-[8px] sm:text-[9px] md:text-xs mt-1 tracking-wide uppercase">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
});

// Feature Icons Row
const FeatureIcons = memo(function FeatureIcons({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const containerSize = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const subTextSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-6">
      <div className="flex items-center gap-2">
        <div className={`${containerSize} rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5`}>
          <FileText className={`${iconSize} text-[#C9A646]`} strokeWidth={1.5} />
        </div>
        <div>
          <div className={`text-white font-bold ${textSize}`}>Daily Briefing</div>
          <div className={`text-slate-400 ${subTextSize}`}>9:00 AM NY</div>
        </div>
      </div>
      
      <div className="w-px h-8 md:h-10 bg-[#C9A646]/30 hidden sm:block" />
      
      <div className="flex items-center gap-2">
        <div className={`${containerSize} rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5`}>
          <Shield className={`${iconSize} text-[#C9A646]`} strokeWidth={1.5} />
        </div>
        <div>
          <div className={`text-white font-bold ${textSize}`}>Institutional</div>
          <div className={`text-slate-400 ${subTextSize}`}>Grade Intel</div>
        </div>
      </div>
      
      <div className="w-px h-8 md:h-10 bg-[#C9A646]/30 hidden sm:block" />
      
      <div className="flex items-center gap-2">
        <div className={`${containerSize} rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5`}>
          <Target className={`${iconSize} text-[#C9A646]`} strokeWidth={1.5} />
        </div>
        <div>
          <div className={`text-white font-bold ${textSize}`}>Actionable</div>
          <div className={`text-slate-400 ${subTextSize}`}>Trade Ideas</div>
        </div>
      </div>
    </div>
  );
});

export {
  CONFIG,
  YEARLY_SAVINGS,
  BillingToggle,
  ReportCard,
  CountdownDisplay,
  TestReportCard,
  CommunityCards,
  StatsBar,
  FeatureIcons,
  formatReportDate,
  formatReportTime,
};

export type { BillingInterval };