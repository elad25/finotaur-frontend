// =====================================================
// FINOTAUR WAR ZONE - Landing Components v3.0
// 
// 🔥 OPTIMIZATIONS:
// - All components wrapped in React.memo
// - useMemo/useCallback for expensive operations
// - External CSS classes
// - No inline styles where possible
// =====================================================

import { useState, useCallback, memo, useMemo } from 'react';
import { 
  FileText, Calendar, Clock, Loader2, Headphones, 
  Shield, Target, ChevronRight, Send, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiscordIcon } from './VisualComponents';
import type { DailyReport, WeeklyReport } from '@/hooks/useWarZoneData';

// ============================================
// CONFIGURATION
// ============================================

export const CONFIG = {
  WHOP_MONTHLY_PLAN_ID: 'plan_U6lF2eO5y9469',
  WHOP_YEARLY_PLAN_ID: 'plan_bp2QTGuwfpj0A',
  WHOP_MONTHLY_PLAN_ID_TOPSECRET: 'plan_BPJdT6Tyjmzcx',
  MONTHLY_PRICE: 69.99,
  YEARLY_PRICE: 699,
  MONTHLY_PRICE_TOPSECRET: 30,
  YEARLY_MONTHLY_EQUIVALENT: 58.25,
  DISCORD_INVITE_URL: 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/',
  REDIRECT_URL: 'https://www.finotaur.com/app/all-markets/warzone',
  WHOP_CHECKOUT_BASE_URL_MONTHLY: 'https://whop.com/checkout/plan_U6lF2eO5y9469',
  WHOP_CHECKOUT_BASE_URL_YEARLY: 'https://whop.com/checkout/plan_bp2QTGuwfpj0A',
  API_BASE: import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app',
  BULL_IMAGE: '/assets/Bull-WarZone.png',
} as const;

export const YEARLY_SAVINGS = Math.round((CONFIG.MONTHLY_PRICE * 12) - CONFIG.YEARLY_PRICE);

export type BillingInterval = 'monthly' | 'yearly';

// ============================================
// HELPER FUNCTIONS
// ============================================

export const formatReportDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
};

export const formatReportTime = (createdAt: string): string => {
  return new Date(createdAt).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });
};

// ============================================
// STATS DATA
// ============================================

const STATS = [
  { value: '9:00 AM', label: 'Daily Delivery' },
  { value: '847+', label: 'Active Traders' },
  { value: '7 Days', label: 'Free Trial' },
  { value: '24/7', label: 'Discord Access' }
];

// ============================================
// BILLING TOGGLE
// ============================================

export const BillingToggle = memo(function BillingToggle({ 
  selected, 
  onChange,
  className,
}: { 
  selected: BillingInterval; 
  onChange: (interval: BillingInterval) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <button 
        onClick={() => onChange('monthly')} 
        className={cn(
          "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300", 
          selected === 'monthly' 
            ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg shadow-[#C9A646]/30" 
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
            ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg shadow-[#C9A646]/30" 
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

// ============================================
// STATS BAR
// ============================================

export const StatsBar = memo(function StatsBar({ isMobile = false }: { isMobile?: boolean }) {
  if (isMobile) {
    return (
      <div className="bg-[#0a0806] py-5 px-4 relative z-50">
        <div className="grid grid-cols-4 gap-2">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-lg sm:text-xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">
                {stat.value}
              </div>
              <div className="text-slate-400 text-[8px] sm:text-[9px] mt-1 tracking-wide uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      {/* Top golden line */}
      <div className="relative w-full h-[1px]">
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' 
          }} 
        />
      </div>
      
      <div 
        className="relative z-50" 
        style={{ 
          background: 'linear-gradient(180deg, rgba(15,12,8,0.98) 0%, rgba(10,8,6,0.99) 100%)' 
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center relative px-6">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-xs mt-2 tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom golden line */}
      <div className="relative w-full h-[1px]">
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' 
          }} 
        />
      </div>
    </div>
  );
});

// ============================================
// FEATURE ICONS ROW
// ============================================

export const FeatureIcons = memo(function FeatureIcons({ isMobile = false }: { isMobile?: boolean }) {
  const features = [
    { icon: FileText, title: 'Daily Briefing', subtitle: '9:00 AM NY' },
    { icon: Shield, title: 'Institutional', subtitle: 'Grade Intel' },
    { icon: Target, title: 'Actionable', subtitle: 'Trade Ideas' },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
              <f.icon className="w-3.5 h-3.5 text-[#C9A646]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-white font-bold">{f.title}</div>
              <div className="text-slate-400 text-[10px]">{f.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-6 relative z-20">
      {features.map((f, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
            <f.icon className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{f.title}</div>
            <div className="text-slate-400 text-xs">{f.subtitle}</div>
          </div>
          {i < features.length - 1 && (
            <div className="w-px h-10 bg-[#C9A646]/30 ml-4" />
          )}
        </div>
      ))}
    </div>
  );
});

// ============================================
// REPORT CARD
// ============================================

export const ReportCard = memo(function ReportCard({
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
    return null;
  }

  return (
    <div
      className={cn(
        "group relative p-5 rounded-2xl text-left transition-all duration-300",
        hasReport && "hover:scale-[1.02] cursor-pointer"
      )}
      style={{ 
        background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onClick={hasReport ? onDownload : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)'
            }}
          >
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
      {hasReport && (
        <div 
          className="absolute bottom-0 left-4 right-4 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }}
        />
      )}
    </div>
  );
});

// ============================================
// COUNTDOWN DISPLAY
// ============================================

export const CountdownDisplay = memo(function CountdownDisplay({
  title,
  subtitle,
  countdown,
}: {
  title: string;
  subtitle: string;
  countdown: { hours: number; minutes: number; seconds: number };
}) {
  return (
    <div 
      className="px-8 py-4 rounded-xl font-semibold text-base flex items-center gap-4"
      style={{ 
        background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)',
        border: '1px solid rgba(201,166,70,0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ 
          background: 'rgba(201,166,70,0.15)',
          border: '1px solid rgba(201,166,70,0.3)'
        }}
      >
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

// ============================================
// TEST REPORT CARD (For Testers Only)
// ============================================

export const TestReportCard = memo(function TestReportCard({ 
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
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            onClick={() => setShowConfirmModal(false)} 
          />
          <div 
            className="relative rounded-2xl max-w-md w-full p-6"
            style={{
              background: 'linear-gradient(to br, #1a1410, #12100c, #0a0806)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Publish to Live</h3>
                <p className="text-[#C9A646]/60 text-sm">Visible to all subscribers</p>
              </div>
            </div>
            
            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: '#1a1410',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              <p className="text-[#C9A646]/80 text-sm mb-2">Report:</p>
              <p className="text-white font-semibold">{formatReportDate(testDailyReport.report_date)}</p>
            </div>

            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'rgba(234,179,8,0.1)',
                border: '1px solid rgba(234,179,8,0.3)',
              }}
            >
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Replaces current LIVE report
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-[#C9A646]/10"
                style={{ 
                  background: 'rgba(201,166,70,0.08)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToLive}
                disabled={isPublishing}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white transition-all"
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
          <span className="px-2 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            🧪 TESTER ONLY
          </span>
          <span className="text-[#C9A646]/50 text-sm">Visible only to testers</span>
        </div>
        
        <div
          className="group relative w-full p-5 rounded-2xl transition-all duration-300"
          style={{ 
            background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(88,28,135,0.1) 100%)',
            border: '2px solid rgba(147,51,234,0.4)',
            boxShadow: '0 4px 20px rgba(147,51,234,0.2)'
          }}
        >
          <div className="flex items-start justify-between">
            <button
              onClick={onDownload}
              className="flex items-center gap-3 text-left flex-1"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'rgba(147,51,234,0.2)',
                  border: '1px solid rgba(147,51,234,0.4)'
                }}
              >
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">
                    🧪 TEST: {formatReportDate(testDailyReport.created_at)}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                    PENDING REVIEW
                  </span>
                </div>
                <p className="text-purple-400/60 text-xs">
                  Generated at {formatReportTime(testDailyReport.updated_at || testDailyReport.created_at)} ET • {testDailyReport.id}
                </p>
              </div>
            </button>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(22,163,74,0.15) 100%)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  color: '#22c55e'
                }}
              >
                <Send className="w-4 h-4" />
                Publish to Live
              </button>
              
              <button
                onClick={onDownload}
                className="p-2 rounded-xl transition-all hover:bg-purple-500/20"
                style={{ border: '1px solid rgba(147,51,234,0.3)' }}
              >
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-4 right-4 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(147,51,234,0.5), transparent)' }}
          />
        </div>
      </div>
    </>
  );
});

// ============================================
// COMMUNITY CARDS
// ============================================

export const CommunityCards = memo(function CommunityCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Discord Community */}
      <a 
        href={CONFIG.DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
        style={{ 
          background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
          border: '1px solid rgba(201,166,70,0.25)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'rgba(88,101,242,0.15)',
              border: '1px solid rgba(88,101,242,0.3)'
            }}
          >
            <DiscordIcon className="w-6 h-6 text-[#5865F2]" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">Discord Community</h4>
            <p className="text-[#C9A646]/50 text-sm">Join 847+ active traders</p>
          </div>
        </div>
        <button 
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ 
            background: 'rgba(88,101,242,0.15)',
            border: '1px solid rgba(88,101,242,0.4)',
            color: '#5865F2'
          }}
        >
          Join Now
        </button>
      </a>

      {/* Trading Room */}
      <a
        href={CONFIG.DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
        style={{ 
          background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
          border: '1px solid rgba(201,166,70,0.25)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)'
            }}
          >
            <Headphones className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">Trading Room</h4>
            <p className="text-[#C9A646]/50 text-sm">Live market analysis now</p>
          </div>
        </div>
        <button 
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ 
            background: 'rgba(168,85,247,0.15)',
            border: '1px solid rgba(168,85,247,0.4)',
            color: '#A855F7'
          }}
        >
          Join Now
        </button>
      </a>
    </div>
  );
});