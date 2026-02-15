// src/pages/app/ai/OptionsIntelligenceAI.tsx

import { memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useOptionsIntelligence, Card, TabNav, OptionsLoadingSkeleton, FlowDrawer } from '@/features/options-ai';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';

// ── Lazy tabs (code-split) ──
const OverviewTab        = lazy(() => import('@/features/options-ai/components/tabs/OverviewTab').then(m => ({ default: m.OverviewTab })));
const FlowTab            = lazy(() => import('@/features/options-ai/components/tabs/FlowTab').then(m => ({ default: m.FlowTab })));
const SqueezeDetectorTab = lazy(() => import('@/features/options-ai/components/tabs/SqueezeDetectorTab').then(m => ({ default: m.SqueezeDetectorTab })));
const DarkPoolTab        = lazy(() => import('@/features/options-ai/components/tabs/DarkPoolTab').then(m => ({ default: m.DarkPoolTab })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 text-[#C9A646] animate-spin" />
    </div>
  );
}

function OptionsIntelligenceContent() {
  const {
    activeTab, setActiveTab,
    typeFilter, flowSubTab, setFlowSubTab, blockTier, setBlockTier,
    selectedFlow, data, isLoading, isRefreshing, loadError,
    filteredFlows, filteredBlocks,
    deepDiveTicker, deepDiveData, deepDiveLoading, loadDeepDive,
    handleFilterChange, handleFlowClick, handleCloseDrawer, handleRefresh,
  } = useOptionsIntelligence();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]" style={{ background: 'rgba(201,166,70,0.06)' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]" style={{ background: 'rgba(201,166,70,0.04)' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(244,217,123,0.03)' }} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Options </span>
            <span style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Intelligence</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <p className="text-[#8B8B8B]">Flow Scanner • Squeeze Detector • Dark Pool • Deep Dive</p>
            {isRefreshing && <Loader2 className="h-4 w-4 text-[#C9A646] animate-spin" />}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center mb-8 overflow-x-auto">
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OptionsLoadingSkeleton />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {loadError && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-2xl mx-auto">
            <Card>
              <div className="p-8 text-center">
                <XCircle className="h-12 w-12 text-[#EF4444]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Data</h3>
                <p className="text-[#8B8B8B] mb-6">{loadError}</p>
                <button onClick={handleRefresh} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000' }}>
                  <RefreshCw className="h-4 w-4" />Retry
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {data && !isLoading && (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="min-h-[400px]">
              <Suspense fallback={<TabFallback />}>
                {activeTab === 'overview'   && <OverviewTab data={data} />}
                {activeTab === 'flow'       && <FlowTab blockTrades={filteredBlocks} />}
                {activeTab === 'squeeze'    && <SqueezeDetectorTab data={data} />}
                {activeTab === 'darkpool'   && <DarkPoolTab />}
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {data && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center pt-6 mt-8 border-t border-[#C9A646]/10">
            <p className="text-xs text-[#6B6B6B]">
              Data refreshes every 5 minutes<span className="mx-2">•</span>Last update: {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        <FlowDrawer isOpen={!!selectedFlow} onClose={handleCloseDrawer} flow={selectedFlow} />
      </AnimatePresence>
    </div>
  );
}

function OptionsIntelligenceAI() {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('options_intelligence');
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
        feature="Options Intelligence"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentPlan={plan === 'platform_core' ? 'core' : plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : 'free'}
      />
    );
  }
  return <OptionsIntelligenceContent />;
}

export default memo(OptionsIntelligenceAI);