// =====================================================
// 🎯 SECTOR ANALYZER - Main Component
// src/pages/app/ai/SectorAnalyzer.tsx
// =====================================================
// Optimized for 10,000 users with 4x daily data refresh
// Uses SectorHeader (centered layout) + tab navigation
// ALL TABS consume cached data → ZERO per-user API calls
// =====================================================

import React, { memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, BarChart3, Award, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { UsageBadge } from '@/components/access/UsageBadge';

// Components
import { TabButton } from '@/components/SectorAnalyzer/ui';
import { SectorGrid } from '@/components/SectorAnalyzer/cards/SectorCard';
import { SectorHeader } from '@/components/SectorAnalyzer/tabs/SectorHeader';
import { OverviewTab } from '@/components/SectorAnalyzer/tabs/OverviewTab';
import { HeatMapTab } from '@/components/SectorAnalyzer/tabs/HeatMapTab';
import { BreakoutTab } from '@/components/SectorAnalyzer/tabs/BreakoutTab';
import { TopDownTab } from '@/components/SectorAnalyzer/tabs/TopDownTab';
import { RisksTab } from '@/components/SectorAnalyzer/tabs/RisksTab';

// Data & Types
import { sectors } from '@/components/SectorAnalyzer/data';
import { Sector, TabType } from '@/components/SectorAnalyzer/types';
import { useSectorAnalysis, sectorNameToId } from '@/hooks/useSectorAnalysis';

// =====================================================
// 📊 SECTOR ANALYSIS VIEW
// =====================================================

interface SectorAnalysisViewProps {
  sector: Sector;
  onBack: () => void;
}

const SectorAnalysisView = memo<SectorAnalysisViewProps>(({ sector, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // ====================================================
  // 🔑 SINGLE DB QUERY — shared across ALL tabs
  // "Compute Once, Serve 10,000" — client side
  // One useSectorAnalysis call → all 6 tabs read from it
  // ====================================================
  const { data: cachedAnalysis, isLoading: cacheLoading } = useSectorAnalysis(sectorNameToId(sector.name));

  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Overview', icon: Target },
    { id: 'heatmap' as const, label: 'Heat Map', icon: BarChart3 },
    { id: 'breakout' as const, label: 'Breakout', icon: Award },
    { id: 'trades' as const, label: 'Top Down', icon: ArrowDownRight },
    { id: 'risks' as const, label: 'Risks', icon: AlertTriangle },
  ], []);

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview': return <OverviewTab sector={sector} cachedAnalysis={cachedAnalysis} />;
      case 'heatmap': return <HeatMapTab sector={sector} />;
      case 'breakout': return <BreakoutTab sector={sector} cachedAnalysis={cachedAnalysis} />;
      case 'trades': return <TopDownTab sector={sector} cachedAnalysis={cachedAnalysis} />;
      case 'risks': return <RisksTab sector={sector} />;
      default: return <OverviewTab sector={sector} cachedAnalysis={cachedAnalysis} />;
    }
  }, [activeTab, sector, cachedAnalysis]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      {/* ====== CENTERED SECTOR HEADER ====== */}
      <SectorHeader sector={sector} onBack={onBack} />

      {/* ====== TAB NAVIGATION (centered) ====== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap justify-center gap-2 mb-6 pb-4 border-b border-[#C9A646]/10 overflow-x-auto"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
          >
            {tab.label}
          </TabButton>
        ))}
      </motion.div>

      {/* ====== TAB CONTENT ====== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
});

SectorAnalysisView.displayName = 'SectorAnalysisView';

// =====================================================
// 🏠 HOME VIEW (Sector Selection)
// =====================================================

interface HomeViewProps {
  onSelectSector: (sector: Sector) => void;
}

const HomeView = memo<HomeViewProps>(({ onSelectSector }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center pt-8"
  >
    {/* Title */}
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-10"
    >
      <h1 className="text-4xl md:text-5xl font-bold mb-3">
        <span className="text-white">Sector </span>
        <span
          style={{
            background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Analyzer
        </span>
      </h1>
      <p className="text-[#8B8B8B] text-lg">Institutional-grade sector deep dive</p>
    </motion.div>

    {/* Subtitle */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-center mb-8"
    >
      <h2 className="text-xl font-bold text-white mb-2">
        Which sector would you like to explore?
      </h2>
      <p className="text-[#6B6B6B]">Select a sector to begin your analysis</p>
    </motion.div>

    {/* Sector Grid */}
    <SectorGrid sectors={sectors} onSelectSector={onSelectSector} />

    {/* Footer */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="text-center pt-12"
    >
      <p className="text-xs text-[#6B6B6B]">
        Real-time data • Institutional-grade analysis • AI-powered insights
      </p>
    </motion.div>
  </motion.div>
));

HomeView.displayName = 'HomeView';

// =====================================================
// 🚀 MAIN COMPONENT
// =====================================================

function SectorAnalyzerContent() {
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const { recordSectorAnalysis, plan } = usePlatformAccess();

  const handleSelectSector = useCallback(async (sector: Sector) => {
    if (plan === 'platform_core') {
      const allowed = await recordSectorAnalysis();
      if (!allowed) return;
    }
    setSelectedSector(sector);
  }, [plan, recordSectorAnalysis]);

  const handleBack = useCallback(() => {
    setSelectedSector(null);
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)',
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]"
          style={{ background: 'rgba(201,166,70,0.04)' }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]"
          style={{ background: 'rgba(201,166,70,0.03)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-6 lg:px-10 py-8">
        <AnimatePresence mode="wait">
          {selectedSector ? (
            <SectorAnalysisView
              key="analysis"
              sector={selectedSector}
              onBack={handleBack}
            />
          ) : (
            <HomeView key="home" onSelectSector={handleSelectSector} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SectorAnalyzer() {
  const { canAccessPage, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('sector_analyzer');
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
        feature="Sector Analyzer"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentUsage={access.currentUsage}
        limit={access.limit}
      />
    );
  }
  return <SectorAnalyzerContent />;
}