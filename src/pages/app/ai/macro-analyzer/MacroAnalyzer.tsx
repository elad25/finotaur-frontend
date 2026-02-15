// MacroAnalyzer.tsx
// =====================================================
// 🌐 MACRO ANALYZER - MAIN CONTAINER
// Handles tab navigation & lazy-loads tab content
// =====================================================

import React, {
  useState,
  useCallback,
  useEffect,
  memo,
  lazy,
  Suspense,
  startTransition
} from 'react';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { LazyMotion, domAnimation, AnimatePresence, m } from 'framer-motion';
import {
  BarChart3, Activity, FileText, Banknote, Globe, Brain
} from 'lucide-react';
import { Skeleton, SectionSkeleton, GlobalStyles } from './shared/ui';
import type { TabType } from './shared/types';

// Lazy-load tab components for code splitting
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const IndicatorsTab = lazy(() => import('./tabs/IndicatorsTab'));
const ReportsTab = lazy(() => import('./tabs/ReportsTab'));
const FedWatchTab = lazy(() => import('./tabs/FedWatchTab'));
const GlobalTab = lazy(() => import('./tabs/GlobalTab'));
const AITab = lazy(() => import('./tabs/AITab'));

// =====================================================
// TAB CONFIG
// =====================================================

const TAB_CONFIG: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'indicators', label: 'Indicators', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'fed', label: 'Fed Watch', icon: Banknote },
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'ai', label: 'AI Strategist', icon: Brain },
];

// =====================================================
// NAVIGATION TABS
// =====================================================

const NavigationTabs = memo(({ active, onChange }: { active: TabType; onChange: (tab: TabType) => void }) => (
  <div className="flex flex-wrap gap-2 mb-8">
    {TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      const isAI = tab.id === 'ai';
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]'
          }`}
          style={isActive ? {
            background: isAI
              ? 'linear-gradient(135deg, #C9A646 0%, #F4D97B 30%, #C9A646 60%, #F4D97B 100%)'
              : 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            boxShadow: isAI
              ? '0 4px 24px rgba(201,166,70,0.5)'
              : '0 4px 20px rgba(201,166,70,0.4)',
          } : {
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(201,166,70,0.1)',
          }}
        >
          <Icon className="h-4 w-4" />
          {tab.label}
          {isAI && !isActive && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C9A646]/15 text-[#C9A646] font-bold">
              NEW
            </span>
          )}
        </button>
      );
    })}
  </div>
));
NavigationTabs.displayName = 'NavigationTabs';

// =====================================================
// TAB LOADING FALLBACK
// =====================================================

const TabFallback = memo(() => (
  <div className="space-y-6">
    <SectionSkeleton height="h-80" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionSkeleton height="h-64" />
      <SectionSkeleton height="h-64" />
    </div>
  </div>
));
TabFallback.displayName = 'TabFallback';

// =====================================================
// LOADING SKELETON (initial load)
// =====================================================

const LoadingSkeleton = memo(() => (
  <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]" style={{ background: 'rgba(201,166,70,0.05)' }} />
    </div>
    <div className="relative z-10 w-full px-6 lg:px-10 py-8">
      <div className="mb-10">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex gap-2 mb-8">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 w-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionSkeleton height="h-80" />
        <SectionSkeleton height="h-80" />
      </div>
    </div>
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

// =====================================================
// MAIN COMPONENT
// =====================================================

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

  // ✅ Early return AFTER all hooks
  if (accessLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
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

  if (isLoading) return <LoadingSkeleton />;

  return (
    <>
      <GlobalStyles />

      <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]" style={{ background: 'rgba(201,166,70,0.05)' }} />
          <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]" style={{ background: 'rgba(201,166,70,0.04)' }} />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px]" style={{ background: 'rgba(244,217,123,0.03)' }} />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-white">Macro </span>
              <span style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Analyzer
              </span>
            </h1>
            <p className="text-[#8B8B8B]">AI-Powered Economic Intelligence & Market Regime Analysis</p>
          </div>

          {/* Navigation */}
          <NavigationTabs active={activeTab} onChange={handleTabChange} />

          {/* Tab Content */}
          <LazyMotion features={domAnimation}>
            <AnimatePresence mode="wait">
              <m.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<TabFallback />}>
                  {activeTab === 'overview' && <OverviewTab />}
                  {activeTab === 'indicators' && <IndicatorsTab />}
                  {activeTab === 'reports' && <ReportsTab />}
                  {activeTab === 'fed' && <FedWatchTab />}
                  {activeTab === 'global' && <GlobalTab />}
                  {activeTab === 'ai' && <AITab />}
                </Suspense>
              </m.div>
            </AnimatePresence>
          </LazyMotion>

          {/* Footer */}
          <div className="text-center pt-8 mt-8 border-t border-[#C9A646]/10">
            <p className="text-xs text-[#6B6B6B]">
              Data updated in real-time from official sources • FRED, SEC, BLS
              <span className="mx-2">•</span>
              Last refresh: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}