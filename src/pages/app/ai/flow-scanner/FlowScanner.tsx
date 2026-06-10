// =====================================================
// 🔍 FLOW SCANNER — Main Page v4
// ✅ SentimentBadge removed
// ✅ Stats computed client-side from flowData when server returns zeros
// ✅ Optimized for 10K users — no extra API calls
// =====================================================

import { useState, Suspense, memo, useCallback } from 'react';
import { lazy } from '@/lib/lazyWithRetry';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AiFlowScannerSkeletonPage } from '@/components/skeletons/AiFlowScannerSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, GitMerge, PieChart, Users, Zap } from 'lucide-react';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { TabType } from './shared/types';
import { useFlowData } from './shared/useFlowData';
import { LoadingSkeleton, Skeleton } from './shared/Ui';
import { QuickStats, TabNav } from './components/StatsAndNav';
import { SignalFeedSection } from './components/SignalFeedSection';
import { FlowDrawer } from './tabs/AllFlowTab';
import type { FlowItem } from './shared/types';

// ─────────────────────────────────────────────────────
// Lazy tabs — code-split per tab, only load on demand
// ─────────────────────────────────────────────────────

const AllFlowTab             = lazy(() => import('./tabs/AllFlowTab'));
const UnusualVolumeTab       = lazy(() => import('./tabs/AllFlowTab'));
const DarkPoolTab            = lazy(() => import('./tabs/DarkPoolTab'));
const InsiderInstitutionalTab= lazy(() => import('./tabs/InsiderInstitutionalTab'));
const ConfluenceTab          = lazy(() => import('./tabs/ConfluenceTab'));
const SectorFlowTab          = lazy(() => import('./tabs/SectorFlowTab'));

const ALLFLOW_TABS: TabType[] = ['unusual-volume'];

const TabFallback = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
  </div>
);

// ─────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────

const FlowScannerContent = memo(function FlowScannerContent() {
  const [activeTab, setActiveTab] = useState<TabType>('unusual-volume');
  const [drawerItem, setDrawerItem] = useState<FlowItem | null>(null);

  const {
    flowData, sectorData, stats,
    isLoading, isRefreshing, lastUpdated, refresh,
  } = useFlowData();

  const handleItemClick = useCallback((item: FlowItem) => setDrawerItem(item), []);
  const handleDrawerClose = useCallback(() => setDrawerItem(null), []);

  if (isLoading) return <LoadingSkeleton />;

  const defaultStats = stats ?? {
    unusualVolume:    0,
    darkPoolAlerts:   0,
    insiderTrades:    0,
    confluenceAlerts: 0,
    netFlow:         '—',
    marketSentiment: 'neutral' as const,
  };

  const isAllFlowTab     = ALLFLOW_TABS.includes(activeTab);
  const isDarkPoolTab    = activeTab === 'dark-pool';
  const isInsiderTab     = activeTab === 'insider-institutional';
  const isConfluenceTab  = activeTab === 'confluence';
  const isSectorTab      = activeTab === 'sector-flow';

  const tabGroupKey =
    isAllFlowTab    ? 'allflow' :
    isDarkPoolTab   ? 'darkpool' :
    isInsiderTab    ? 'insider' :
    isConfluenceTab ? 'confluence' :
    isSectorTab     ? 'sector' : 'allflow';

  const featureRail = [
    { label: 'Unusual Volume', icon: Zap },
    { label: 'Dark Pool', icon: Eye },
    { label: 'Insider Trades', icon: Users },
    { label: 'Confluence', icon: GitMerge },
    { label: 'Sectors', icon: PieChart },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.08), transparent 30%), linear-gradient(180deg, #080808 0%, #0d0b08 48%, #080808 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-36 h-64 w-[720px] rotate-[-18deg] rounded-[50%] border border-[#C9A646]/20" />
        <div className="absolute -top-16 -left-28 h-56 w-[760px] rotate-[-18deg] rounded-[50%] border border-[#C9A646]/10" />
        <div className="absolute top-0 -right-52 h-56 w-[820px] rotate-[-12deg] rounded-[50%] border border-[#C9A646]/15" />
        <div className="absolute top-10 -right-44 h-48 w-[780px] rotate-[-12deg] rounded-[50%] border border-[#C9A646]/10" />
        <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]" style={{ background: 'rgba(201,166,70,0.045)' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]" style={{ background: 'rgba(201,166,70,0.035)' }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1536px] px-6 lg:px-10 pt-5 pb-8 md:pt-6 md:pb-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="mb-3 font-sans text-[46px] font-bold leading-none md:text-[62px]">
            <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">Flow</span>{' '}
            <span className="text-ink-primary">Scanner</span>
          </h1>
          <div className="mb-5 flex items-center justify-center gap-3">
            <p className="text-lg text-[#A7A7A7]">
            Dark pool prints · Insider trades · Institutional moves · Confluence alerts
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-7">
            {featureRail.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 text-sm font-medium text-white/85">
                  <Icon className="h-4 w-4 text-[#F4D97B]" />
                  <span>{item.label}</span>
                  {index < featureRail.length - 1 && <span className="hidden md:inline-block h-1 w-1 rounded-full bg-[#C9A646]" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Stats — receives flowData for client-side fallback */}
        <QuickStats stats={defaultStats} flowData={flowData} />

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center mb-6 overflow-x-auto px-4"
        >
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabGroupKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="mb-8"
          >
            <Suspense fallback={<TabFallback />}>
              {isAllFlowTab && (
                <AllFlowTab
                  flowData={flowData}
                  activeTab={activeTab}
                  onRefresh={refresh}
                  isRefreshing={isRefreshing}
                />
              )}
              {isDarkPoolTab && (
                <DarkPoolTab flowData={flowData} onItemClick={handleItemClick} />
              )}
              {isInsiderTab && (
                <InsiderInstitutionalTab flowData={flowData} onItemClick={handleItemClick} />
              )}
              {isConfluenceTab && (
                <ConfluenceTab flowData={flowData} onItemClick={handleItemClick} />
              )}
              {isSectorTab && (
                <SectorFlowTab sectorData={sectorData} />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {/* Live Signal Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <SignalFeedSection flowData={flowData} />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-6 mt-6 border-t border-[#C9A646]/8"
        >
          <p className="text-xs text-[#4A4A4A]">
            Data refreshes every 30 seconds
            <span className="mx-2 text-[#3A3A3A]">•</span>
            Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </motion.div>
      </div>

      <FlowDrawer
        isOpen={!!drawerItem}
        onClose={handleDrawerClose}
        flow={drawerItem}
      />
    </div>
  );
});

// ─────────────────────────────────────────────────────
// Default Export — Access Gate
// ─────────────────────────────────────────────────────

export default function FlowScanner() {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('flow_scanner');

  if (accessLoading) {
    return <AiFlowScannerSkeletonPage />;
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="Flow Scanner"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentPlan={
          plan === 'platform_core'       ? 'core'       :
          plan === 'platform_finotaur'   ? 'finotaur'   :
          plan === 'platform_enterprise' ? 'enterprise' : 'free'
        }
      />
    );
  }

  return <FlowScannerContent />;
}
