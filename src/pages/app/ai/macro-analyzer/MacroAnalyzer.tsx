// MacroAnalyzer.tsx
// =====================================================
// MACRO ANALYZER - MAIN CONTAINER
// Handles tab navigation & eagerly mounts all tab content
// =====================================================

import React, {
  useState,
  useCallback,
  useEffect,
  memo,
  startTransition
} from 'react';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AiMacroAnalyzerSkeletonPage } from '@/components/skeletons/AiMacroAnalyzerSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MacroErrorFallback } from './shared/MacroErrorFallback';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import {
  BarChart3, Activity, FileText, Banknote, Globe, Brain, ShieldCheck, Crosshair, Zap
} from 'lucide-react';
import { Skeleton, SectionSkeleton, GlobalStyles } from './shared/ui';
import type { TabType } from './shared/types';

// IMPORTANT: Tabs are statically imported (NOT lazy-loaded) so that all 6 tab
// hooks (useOverview, useIndicators, useRegime, useFedData, useGlobal, useServerAI)
// fire their useEffect fetches IN PARALLEL on Macro Analyzer mount. Server-side
// caches populate eagerly; tab switches are instant (just CSS display toggle).
// Trade-off: slightly larger initial JS bundle for the macro page (worth it for
// "millions of users" scale where tab-switch latency hurts much more than first-
// paint cost).
import OverviewTab from './tabs/OverviewTab';
import IndicatorsTab from './tabs/IndicatorsTab';
import ReportsTab from './tabs/ReportsTab';
import FedWatchTab from './tabs/FedWatchTab';
import GlobalTab from './tabs/GlobalTab';
import AITab from './tabs/AITab';

const TAB_CONFIG: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'indicators', label: 'Indicators', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'fed', label: 'Fed Watch', icon: Banknote },
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'ai', label: 'AI Strategist', icon: Brain },
];

const trustItems = [
  { label: 'Official Data', hint: 'FRED, SEC, BLS', icon: ShieldCheck },
  { label: 'Regime Analytics', hint: 'Cycle and policy context', icon: Crosshair },
  { label: 'AI Strategy', hint: 'Macro-aware positioning', icon: Zap },
];

const NavigationTabs = memo(({ active, onChange }: { active: TabType; onChange: (tab: TabType) => void }) => (
  <div className="mb-6 flex flex-wrap justify-center gap-2 border-b border-gold-primary/10 pb-4">
    {TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      const isAI = tab.id === 'ai';
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            isActive ? 'text-black' : 'text-gold-primary hover:text-gold-bright'
          }`}
          style={isActive
            ? { background: 'linear-gradient(135deg, #C8A96B, #EED899)', boxShadow: '0 10px 24px rgba(200,169,107,0.22)' }
            : { background: 'linear-gradient(180deg, rgba(13,20,26,0.94), rgba(7,10,14,0.96))', border: '1px solid rgba(200,169,107,0.20)', boxShadow: '0 10px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)' }
          }
        >
          <Icon className="h-4 w-4" />
          {tab.label}
          {isAI && !isActive && (
            <span className="rounded bg-gold-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-primary">
              NEW
            </span>
          )}
        </button>
      );
    })}
  </div>
));
NavigationTabs.displayName = 'NavigationTabs';

const LoadingSkeleton = memo(() => (
  <div className="relative min-h-screen overflow-hidden bg-section-base">
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute left-1/2 top-[-210px] h-[520px] w-[78%] -translate-x-1/2 bg-gold-primary/10 blur-[64px]" />
    </div>
    <div className="relative z-10 w-full px-6 py-8 lg:px-9">
      <div className="mb-10 text-center">
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="mb-8 flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionSkeleton height="h-80" />
        <SectionSkeleton height="h-80" />
      </div>
    </div>
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

const MacroArenaStyles = () => (
  <style>
    {`
      @keyframes macroAmbient {
        0%, 100% { opacity: 0.42; transform: translate3d(0, 0, 0); }
        50% { opacity: 0.58; transform: translate3d(0, -10px, 0); }
      }
      @keyframes macroDataFlow {
        from { transform: translate3d(-24px, 0, 0); opacity: 0.18; }
        50% { opacity: 0.34; }
        to { transform: translate3d(24px, -6px, 0); opacity: 0.18; }
      }
      .macro-orb {
        background:
          radial-gradient(circle at 50% 45%, rgba(232,199,102,0.13), transparent 39%),
          radial-gradient(circle at 50% 50%, rgba(32,54,70,0.34), transparent 68%);
        box-shadow: inset 0 0 72px rgba(201,166,70,0.055), 0 0 84px rgba(201,166,70,0.055);
        mask-image: radial-gradient(circle, black 0 55%, transparent 74%);
        animation: macroAmbient 12s ease-in-out infinite;
      }
      .macro-analysis-luxury {
        position: relative;
        min-height: calc(100vh - 132px);
        color: #F4F6FA;
        background:
          radial-gradient(circle at 82% 6%, rgba(201,166,70,0.10), transparent 30%),
          radial-gradient(circle at 28% 0%, rgba(34,197,94,0.055), transparent 26%),
          linear-gradient(180deg, #05080B 0%, #070A0D 48%, #050607 100%);
        isolation: isolate;
      }
      .macro-analysis-luxury::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(201,166,70,0.045) 1px, transparent 1px),
          linear-gradient(rgba(201,166,70,0.03) 1px, transparent 1px),
          radial-gradient(circle at 78% 20%, rgba(201,166,70,0.08), transparent 32%);
        background-size: 58px 58px, 58px 58px, 100% 100%;
        opacity: 0.55;
        mask-image: radial-gradient(ellipse at 50% 8%, black, transparent 78%);
        z-index: 0;
      }
      .macro-analysis-luxury > * {
        position: relative;
        z-index: 1;
      }
      .macro-analysis-luxury p,
      .macro-analysis-luxury li,
      .macro-analysis-luxury td {
        color: #CDD3DD;
      }
      .macro-analysis-luxury h1,
      .macro-analysis-luxury h2,
      .macro-analysis-luxury h3,
      .macro-analysis-luxury th,
      .macro-analysis-luxury [class*="text-white"] {
        color: #F4F6FA !important;
      }
      .macro-analysis-luxury [class*="text-[#8B8B8B]"],
      .macro-analysis-luxury [class*="text-[#6B6B6B]"],
      .macro-analysis-luxury [class*="text-[#555]"],
      .macro-analysis-luxury [class*="text-[#9B9B9B]"],
      .macro-analysis-luxury [class*="text-[#B0B0B0]"],
      .macro-analysis-luxury [class*="text-[#B0A080]"],
      .macro-analysis-luxury [class*="text-[#C0C0C0]"],
      .macro-analysis-luxury [class*="text-[#C8C8C8]"],
      .macro-analysis-luxury [class*="text-[#D0D0D0]"] {
        color: #AAB2BF !important;
      }
      .macro-analysis-luxury [class*="border-white"],
      .macro-analysis-luxury [class*="border-[#C9A646]"] {
        border-color: rgba(201,166,70,0.12) !important;
      }
      .macro-analysis-luxury [class*="bg-white"] {
        background-color: rgba(10,15,20,0.94) !important;
      }
      .macro-analysis-luxury table tbody tr:hover {
        background: rgba(255,255,255,0.045) !important;
        box-shadow: inset 2px 0 0 rgba(201,166,70,0.32);
      }
      .macro-analysis-luxury button:not([class*="text-black"]):hover {
        background: rgba(201,166,70,0.10) !important;
        color: #F4D97B !important;
      }
      .macro-tab-panel {
        width: 100%;
      }
      .macro-tab-panel > div {
        width: 100%;
      }
      .macro-analysis-luxury [class*="rounded-xl"],
      .macro-analysis-luxury [class*="rounded-2xl"] {
        border-color: rgba(201,166,70,0.13);
      }
      .macro-analysis-luxury [class*="bg-white/["],
      .macro-analysis-luxury [class*="bg-white/"] {
        background-color: rgba(255,255,255,0.035);
      }
      .macro-analysis-luxury [class*="text-[#E8DCC4]"],
      .macro-analysis-luxury [class*="text-[#C8BFA0]"],
      .macro-analysis-luxury [class*="text-[#B8B0A0]"] {
        color: #CDD3DD !important;
      }
    `}
  </style>
);

export default function MacroAnalyzer() {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('macro_analyzer');

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);

  const handleTabChange = useCallback((tab: TabType) => {
    startTransition(() => setActiveTab(tab));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (accessLoading) {
    return <AiMacroAnalyzerSkeletonPage />;
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="Macro Analyzer"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentPlan={plan === 'platform_core' ? 'core' : plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : 'free'}
      />
    );
  }

  if (isLoading) return <AiMacroAnalyzerSkeletonPage />;

  return (
    <ErrorBoundary boundary="macro-analyzer" fallback={<MacroErrorFallback />}>
      <>
      <GlobalStyles />
      <MacroArenaStyles />

      <div className="relative min-h-screen overflow-hidden bg-section-base">
        <div
          className="absolute inset-0 bg-section-base"
          style={{
            background:
              'radial-gradient(ellipse at 50% -12%, rgba(201,166,70,0.08) 0%, rgba(9,18,25,0.44) 29%, rgba(5,6,8,0.97) 64%, var(--bg-section-base) 100%)',
          }}
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-[-210px] h-[520px] w-[78%] -translate-x-1/2 [animation:macroAmbient_14s_ease-in-out_infinite]"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(201,166,70,0.13) 0%, rgba(201,166,70,0.036) 42%, transparent 72%)',
              filter: 'blur(64px)',
            }}
          />
          <div
            className="absolute left-1/2 top-[8px] h-[300px] w-[960px] max-w-[70vw] -translate-x-1/2 rounded-[50%] border border-white/[0.035]"
            style={{
              background:
                'radial-gradient(ellipse at 50% 34%, rgba(11,22,31,0.34), rgba(201,166,70,0.035) 42%, transparent 68%)',
              boxShadow: 'inset 0 1px 80px rgba(255,255,255,0.025)',
            }}
          />
          <div className="absolute inset-x-[10%] top-[88px] h-[220px] opacity-35 [animation:macroDataFlow_16s_ease-in-out_infinite] [background-image:linear-gradient(115deg,transparent_0_31%,rgba(255,255,255,0.055)_32%_32.5%,transparent_33%_54%,rgba(201,166,70,0.07)_55%_55.5%,transparent_56%)] [mask-image:radial-gradient(ellipse_at_50%_36%,black,transparent_72%)]" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:84px_84px] [mask-image:radial-gradient(ellipse_at_50%_20%,black,transparent_70%)]" />
          <div className="absolute left-[14%] top-[18%] h-1 w-1 rounded-full bg-white/20 shadow-[260px_60px_0_rgba(201,166,70,0.13),790px_24px_0_rgba(255,255,255,0.10),1120px_92px_0_rgba(201,166,70,0.10)]" />
          <div className="absolute inset-x-0 bottom-0 h-[260px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(9,20,28,0.34),transparent_62%)]" />
        </div>

        <div className="relative z-10 w-full px-6 py-8 lg:px-9">
          <div className="relative mb-7 text-center">
            <div className="macro-orb absolute left-1/2 top-[-58px] h-[178px] w-[178px] -translate-x-1/2 rounded-full opacity-30" />
            <div className="absolute left-1/2 top-[-4px] h-24 w-[560px] max-w-[70vw] -translate-x-1/2 rounded-full bg-gold-primary/7 blur-[82px]" />
            <h1 className="relative font-sans text-[46px] font-bold leading-none md:text-[62px]">
              <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">Macro</span>{' '}
              <span className="text-ink-primary">Analyzer</span>
            </h1>
            <p className="relative mt-4 text-[9px] font-medium uppercase tracking-[0.46em] text-ink-tertiary">
              AI-powered economic intelligence & market regime analysis
            </p>
          </div>

          <div className="relative mx-auto mb-8 grid w-full max-w-[820px] grid-cols-1 overflow-hidden rounded-lg border border-white/[0.065] bg-black/24 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:grid-cols-3">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_55%)]" />
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="relative flex items-center justify-center gap-4 border-white/[0.06] px-7 py-3.5 transition-colors duration-500 hover:bg-white/[0.02] sm:border-r sm:last:border-r-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold-primary/12 bg-black/20 text-gold-primary/85">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[11px] font-semibold text-ink-primary">{item.label}</p>
                    <p className="truncate text-[10px] text-ink-tertiary">{item.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="macro-analysis-luxury w-full rounded-none pb-7 pt-2">
            <NavigationTabs active={activeTab} onChange={handleTabChange} />

            {/* All 6 tabs stay mounted. CSS display toggles visibility only. */}
            <LazyMotion features={domAnimation}>
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="tab-container">
                  <div className="macro-tab-panel" style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
                    <OverviewTab />
                  </div>
                  <div className="macro-tab-panel" style={{ display: activeTab === 'indicators' ? 'block' : 'none' }}>
                    <IndicatorsTab />
                  </div>
                  <div className="macro-tab-panel" style={{ display: activeTab === 'reports' ? 'block' : 'none' }}>
                    <ReportsTab />
                  </div>
                  <div className="macro-tab-panel" style={{ display: activeTab === 'fed' ? 'block' : 'none' }}>
                    <FedWatchTab />
                  </div>
                  <div className="macro-tab-panel" style={{ display: activeTab === 'global' ? 'block' : 'none' }}>
                    <GlobalTab />
                  </div>
                  <div className="macro-tab-panel" style={{ display: activeTab === 'ai' ? 'block' : 'none' }}>
                    <AITab />
                  </div>
                </div>
              </m.div>
            </LazyMotion>

            <div className="mt-8 border-t border-gold-primary/10 pt-8 text-center">
              <p className="text-xs text-ink-tertiary">
                Data updated in real-time from official sources - FRED, SEC, BLS
                <span className="mx-2">-</span>
                Last refresh: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
    </ErrorBoundary>
  );
}
