// =====================================================
// 🔍 FLOW SCANNER — Main Page v2
// Tabs: All Flow | Unusual Volume | Dark Pool | Insider & Institutional | Confluence | Sectors
// =====================================================

import { useState, lazy, Suspense, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { TabType } from './shared/types';
import { useFlowData } from './shared/useFlowData';
import { BackgroundEffects, LoadingSkeleton, Skeleton } from './shared/Ui';
import { QuickStats, TabNav, SentimentBadge } from './components/StatsAndNav';
import { SignalFeedSection } from './components/SignalFeedSection';
import { FlowDrawer } from './tabs/AllFlowTab';
import type { FlowItem } from './shared/types';

// ─────────────────────────────────────────────────────
// Lazy tabs — code-split per tab, only load on demand
// ─────────────────────────────────────────────────────

const AllFlowTab             = lazy(() => import('./tabs/AllFlowTab'));
const UnusualVolumeTab       = lazy(() => import('./tabs/AllFlowTab'));  // reuses AllFlowTab, filtered by activeTab
const DarkPoolTab            = lazy(() => import('./tabs/DarkPoolTab'));
const InsiderInstitutionalTab= lazy(() => import('./tabs/InsiderInstitutionalTab'));
const ConfluenceTab          = lazy(() => import('./tabs/ConfluenceTab'));
const SectorFlowTab          = lazy(() => import('./tabs/SectorFlowTab'));

const TabFallback = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
  </div>
);

// ─────────────────────────────────────────────────────
// Tabs that reuse AllFlowTab with filtered data
// ─────────────────────────────────────────────────────

const ALLFLOW_TABS: TabType[] = ['all-flow', 'unusual-volume'];

// ─────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────

const FlowScannerContent = memo(function FlowScannerContent() {
  const [activeTab, setActiveTab] = useState<TabType>('all-flow');
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

  // Which tab group
  const isAllFlowTab     = ALLFLOW_TABS.includes(activeTab);
  const isDarkPoolTab    = activeTab === 'dark-pool';
  const isInsiderTab     = activeTab === 'insider-institutional';
  const isConfluenceTab  = activeTab === 'confluence';
  const isSectorTab      = activeTab === 'sector-flow';

  // Key for AnimatePresence — group similar tabs together to avoid unnecessary re-mounts
  const tabGroupKey =
    isAllFlowTab    ? 'allflow' :
    isDarkPoolTab   ? 'darkpool' :
    isInsiderTab    ? 'insider' :
    isConfluenceTab ? 'confluence' :
    isSectorTab     ? 'sector' : 'allflow';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}
    >
      <BackgroundEffects />

      <div className="relative z-10 w-full px-4 md:px-6 lg:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-white">Flow </span>
            <span style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Scanner</span>
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Dark pool prints · Insider trades · Institutional moves · Confluence alerts
          </p>
        </motion.div>

        {/* Market Sentiment */}
        <SentimentBadge sentiment={defaultStats.marketSentiment} />

        {/* Quick Stats */}
        <QuickStats stats={defaultStats} />

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center mb-6"
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

        {/* Live Signal Feed — always visible */}
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

      {/* Global drawer — shared across non-AllFlow tabs */}
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
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
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