// src/pages/app/ai/OptionsIntelligenceAI.tsx

import { memo, Suspense } from 'react';
import { lazy } from '@/lib/lazyWithRetry';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, RefreshCw, Loader2, Zap, Flame, Eye, Brain } from 'lucide-react';
import { SkeletonChart } from '@/components/ds/Skeleton';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
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
    <div className="py-6">
      <SkeletonChart height="h-64" />
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

  const featureRail = [
    { label: 'Flow Scanner', icon: Zap },
    { label: 'Squeeze Detector', icon: Flame },
    { label: 'Dark Pool', icon: Eye },
    { label: 'AI Analysis', icon: Brain },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,166,70,0.08), transparent 30%), linear-gradient(180deg, #080808 0%, #0d0b08 48%, #080808 100%)' }}>
      {/* Background */}
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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="mb-3 font-sans text-[46px] font-bold leading-none md:text-[62px]">
            <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">Options</span>{' '}
            <span className="text-ink-primary">Intelligence</span>
          </h1>
          <div className="mb-5 flex items-center justify-center gap-3">
            <p className="text-lg text-[#A7A7A7]">Institutional Options Flow & Market Intelligence</p>
            {isRefreshing && <Loader2 className="h-4 w-4 text-[#C9A646] animate-spin" />}
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

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center mb-6 overflow-x-auto px-4">
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

        {/* Empty state - request was cancelled mid-flight without setting an error */}
        {!isLoading && !data && !loadError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-2xl mx-auto">
            <Card>
              <div className="p-8 text-center">
                <RefreshCw className="h-12 w-12 text-[#C9A646]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Data Loaded</h3>
                <p className="text-[#8B8B8B] mb-6">The request was interrupted. Click to retry.</p>
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
    return <RouteSkeleton />;
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
