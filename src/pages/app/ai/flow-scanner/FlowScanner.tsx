// =====================================================
// 🔍 FLOW SCANNER - Main Page
// src/pages/app/ai/flow-scanner/FlowScanner.tsx
// =====================================================
// Architecture:
//   FlowScanner (access gate)
//     └── FlowScannerContent (data + layout)
//           ├── QuickStats
//           ├── TabNav
//           ├── AllFlowTab  (lazy)
//           ├── SectorFlowTab (lazy)
//           └── SignalFeedSection
// =====================================================

import { useState, lazy, Suspense, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { TabType } from './shared/types';
import { useFlowData } from './shared/useFlowData';
import { BackgroundEffects, LoadingSkeleton, Card, Skeleton } from './shared/Ui';
import { QuickStats, TabNav } from './components/StatsAndNav';
import { SignalFeedSection } from './components/SignalFeedSection';

// Lazy-load heavy tabs — only bundle-split on demand
const AllFlowTab    = lazy(() => import('./tabs/AllFlowTab'));
const SectorFlowTab = lazy(() => import('./tabs/SectorFlowTab'));

// Fallback for lazy tab load
const TabFallback = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
  </div>
);

// =====================================================
// Content (rendered only after access check passes)
// =====================================================

const FlowScannerContent = memo(function FlowScannerContent() {
  const [activeTab, setActiveTab] = useState<TabType>('all-flow');
  const { flowData, sectorData, stats, isLoading, isRefreshing, lastUpdated, refresh } = useFlowData();

  if (isLoading) return <LoadingSkeleton />;

  const defaultStats = stats ?? {
    unusualVolume: 0,
    institutional: 0,
    insiderTrades: 0,
    netFlow: '—',
  };

  const isSectorTab = activeTab === 'sector-flow';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}
    >
      <BackgroundEffects />

      <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Flow </span>
            <span style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Scanner</span>
          </h1>
          <p className="text-[#8B8B8B]">Track institutional moves, insider activity, and unusual volume</p>
        </motion.div>

        {/* Quick Stats */}
        <QuickStats stats={defaultStats} />

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        {/* Main Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isSectorTab ? 'sector' : 'flow'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <Suspense fallback={<TabFallback />}>
              {isSectorTab ? (
                <SectorFlowTab sectorData={sectorData} />
              ) : (
                <AllFlowTab
                  flowData={flowData}
                  activeTab={activeTab}
                  onRefresh={refresh}
                  isRefreshing={isRefreshing}
                />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {/* Live Signal Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SignalFeedSection flowData={flowData} />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-8 mt-8 border-t border-[#C9A646]/10"
        >
          <p className="text-xs text-[#6B6B6B]">
            Data refreshes every 30 seconds
            <span className="mx-2">•</span>
            Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </motion.div>
      </div>
    </div>
  );
});

// =====================================================
// Default Export — Access Gate
// =====================================================

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
