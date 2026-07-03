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
  Target, BarChart3, Award, ArrowDownRight, AlertTriangle, ShieldCheck, Crosshair, Zap
} from 'lucide-react';
import { SkeletonGrid } from '@/components/ds/Skeleton';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AiSectorAnalyzerSkeletonPage } from '@/components/skeletons/AiSectorAnalyzerSkeleton';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';

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
import { sectorMetadata, defaultBreakoutCandidate } from '@/components/SectorAnalyzer/data';
import { Sector, TabType, SentimentType } from '@/components/SectorAnalyzer/types';
import { useAllSectorAnalysis, useSectorAnalysis, sectorNameToId } from '@/hooks/useSectorAnalysis';
import { FinoExplains } from '@/components/fino/FinoExplains';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TabErrorFallback } from '@/components/ai-arena/TabErrorFallback';
import type { SectorSnapshot } from '@/hooks/useSectorAnalysis';

// =====================================================
// 🔄 SectorSnapshot (Supabase) → Sector (component shape) adapter
// Snapshot fields come from `sector_snapshots` (cron-cached, 4x/day).
// UI-only fields (icon, description, companies) come from sectorMetadata.
// =====================================================
function snapshotToSector(snap: SectorSnapshot): Sector {
  const meta = sectorMetadata[snap.id];
  // Price waterfall: live price (intraday) → prev_close (weekends/holidays)
  // → 0 (only if the cron has never written anything, e.g. brand-new sector).
  // The header surfaces `prevClose` explicitly so it can label the headline
  // "Showing Friday's Close" instead of pretending the live tape is alive.
  const livePrice = snap.price != null && snap.price > 0 ? snap.price : null;
  const prevClose = snap.prev_close != null && snap.prev_close > 0 ? snap.prev_close : undefined;
  const effectivePrice = livePrice ?? prevClose ?? 0;
  return {
    id: snap.id,
    name: snap.sector_name,
    ticker: snap.ticker,
    icon: meta?.icon ?? 'Cpu',
    description: meta?.description ?? '',
    companies: meta?.companies ?? 0,
    price: effectivePrice,
    prevClose,
    changePercent: snap.change_percent ?? 0,
    weekChange: snap.week_change ?? 0,
    monthChange: snap.month_change ?? 0,
    ytdChange: snap.ytd_change ?? 0,
    momentum: snap.momentum ?? 0,
    relativeStrength: snap.relative_strength ?? 0,
    sentiment: (snap.sentiment as SentimentType) ?? 'neutral',
    beta: snap.beta ?? 1,
    marketCap: snap.market_cap ?? '',
    spWeight: snap.sp_weight ?? 0,
    etfs: [],
    topHoldings: Array.isArray(snap.top_holdings) ? (snap.top_holdings as Sector['topHoldings']) : [],
    correlations: Array.isArray(snap.correlations) ? (snap.correlations as Sector['correlations']) : [],
    macroSensitivity: Array.isArray(snap.macro_sensitivity) ? (snap.macro_sensitivity as Sector['macroSensitivity']) : [],
    industryTrends: [],
    risks: Array.isArray(snap.risks) ? (snap.risks as Sector['risks']) : [],
    breakoutCandidate: (snap.breakout_candidate as Sector['breakoutCandidate']) ?? defaultBreakoutCandidate,
    tradeIdeas: Array.isArray(snap.trade_ideas) ? (snap.trade_ideas as Sector['tradeIdeas']) : [],
    verdict: (snap.verdict as Sector['verdict']) ?? undefined,
    vsMarket: ((snap.vsMarket ?? snap.vs_market) as Sector['vsMarket']) ?? [],
    fundamentals: (snap.fundamentals as Sector['fundamentals']) ?? undefined,
    moneyFlow: (snap.money_flow as Sector['moneyFlow']) ?? undefined,
    earningsCalendar: (snap.earnings_calendar as Sector['earningsCalendar']) ?? [],
    subSectors: (snap.sub_sectors as Sector['subSectors']) ?? [],
    intraSectorCorrelation: (snap.intra_sector_correlation as Sector['intraSectorCorrelation']) ?? undefined,
    correlationBreakers: (snap.correlation_breakers as Sector['correlationBreakers']) ?? [],
    pairsTrades: (snap.pairs_trades as Sector['pairsTrades']) ?? [],
  };
}

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sector-analysis-luxury w-full">
      {/* ====== CENTERED SECTOR HEADER ====== */}
      <SectorHeader sector={sector} onBack={onBack} cachedAnalysis={cachedAnalysis} />

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
          <ErrorBoundary boundary="sector-analyzer-tab" fallback={<TabErrorFallback />}>
            {renderTabContent()}
          </ErrorBoundary>
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
  sectors: Sector[];
  isLoading: boolean;
  isError: boolean;
}

const trustItems = [
  { label: 'Institutional Data', hint: 'High-quality, real-time data', icon: ShieldCheck },
  { label: 'Advanced Analytics', hint: 'Deep insights & trends', icon: Crosshair },
  { label: 'Actionable Insights', hint: 'Make smarter decisions', icon: Zap },
];

const HomeView = memo<HomeViewProps>(({ onSelectSector, sectors, isLoading, isError }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="relative flex min-h-[calc(100vh-128px)] flex-col items-center pb-7 pt-4"
  >
    {/* Fino Explains — pinned top-right (swapped with the market-status badge) */}
    <FinoExplains
      title="What is the Sector Analyzer?"
      className="absolute right-0 top-0 z-30"
    >
      Pick a sector and get an AI deep-dive — what&apos;s driving it, which names are leading,
      and how it stacks up against the rest of the market.
    </FinoExplains>

    {/* Title */}
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-7 text-center"
    >
      <div className="sector-orb absolute left-1/2 top-[-58px] h-[178px] w-[178px] -translate-x-1/2 rounded-full opacity-30" />
      <div className="absolute left-1/2 top-[-4px] h-24 w-[560px] max-w-[70vw] -translate-x-1/2 rounded-full bg-gold-primary/7 blur-[82px]" />
      <h1 className="relative font-sans text-[46px] font-bold leading-none md:text-[62px]">
        <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">Sector</span>{' '}
        <span className="text-ink-primary">Analyzer</span>
      </h1>
      <p className="relative mt-4 text-[9px] font-medium uppercase tracking-[0.46em] text-ink-tertiary">
        Institutional-grade sector deep dive
      </p>
      {/* Market-status badge — moved here (swapped with the Fino Explains panel).
          Renders only when the US market is closed; centered under the subtitle. */}
      <div className="mt-ds-3 flex justify-center">
        <MarketStatusBadge className="relative top-auto right-auto" />
      </div>
    </motion.div>

    {/* Subtitle */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.14 }}
      className="mb-8 text-center"
    >
      <h2 className="text-[20px] font-semibold text-ink-primary md:text-[22px]">
        Which sector would you like to explore?
      </h2>
    </motion.div>

    {/* Sector Grid */}
    {isLoading ? (
      <div className="w-full max-w-[1224px]">
        <SkeletonGrid count={11} cols={4} />
      </div>
    ) : isError ? (
      <div className="w-full max-w-[1224px] py-16 text-center">
        <p className="text-[13px] text-ink-secondary">Unable to load sector data. Please refresh the page.</p>
      </div>
    ) : sectors.length === 0 ? (
      <div className="w-full max-w-[1224px] py-16 text-center">
        <p className="text-[13px] text-ink-secondary">Sector data is loading — please refresh in a moment.</p>
      </div>
    ) : (
      <SectorGrid sectors={sectors} onSelectSector={onSelectSector} />
    )}

    {/* Footer */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="relative mt-6 grid w-full max-w-[820px] grid-cols-1 overflow-hidden rounded-lg border border-white/[0.065] bg-black/24 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:grid-cols-3"
    >
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
  const { data: allAnalysis, isLoading: sectorsLoading, isError: sectorsError } = useAllSectorAnalysis();

  const sectors = useMemo<Sector[]>(
    () => (allAnalysis?.sectors ?? []).map(snapshotToSector),
    [allAnalysis],
  );

  const handleSelectSector = useCallback(async (sector: Sector) => {
    // Core tier removed 2026-06 — Finotaur+ gets unlimited sector analysis (no monthly cap)
    setSelectedSector(sector);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedSector(null);
  }, []);

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${selectedSector ? 'bg-[#0D0E0C]' : 'bg-section-base'}`}
    >
      <style>
        {`
          @keyframes sectorAmbient {
            0%, 100% { opacity: 0.42; transform: translate3d(0, 0, 0); }
            50% { opacity: 0.58; transform: translate3d(0, -10px, 0); }
          }
          @keyframes sectorDataFlow {
            from { transform: translate3d(-24px, 0, 0); opacity: 0.18; }
            50% { opacity: 0.34; }
            to { transform: translate3d(24px, -6px, 0); opacity: 0.18; }
          }
          .sector-orb {
            background:
              radial-gradient(circle at 50% 45%, rgba(232,199,102,0.13), transparent 39%),
              radial-gradient(circle at 50% 50%, rgba(32,54,70,0.34), transparent 68%);
            box-shadow: inset 0 0 72px rgba(201,166,70,0.055), 0 0 84px rgba(201,166,70,0.055);
            mask-image: radial-gradient(circle, black 0 55%, transparent 74%);
            animation: sectorAmbient 12s ease-in-out infinite;
          }
          .sector-analysis-luxury {
            position: relative;
            min-height: calc(100vh - 170px);
            border-radius: 30px 0 0 30px;
            padding: 26px 28px 26px 26px;
            color: #171717;
            background:
              radial-gradient(circle at 14% -10%, rgba(200,169,107,0.13), transparent 30%),
              radial-gradient(circle at 92% 2%, rgba(17,24,39,0.035), transparent 34%),
              linear-gradient(180deg, #FBF7EF 0%, #F6F0E4 52%, #F2EADB 100%);
            border: 1px solid rgba(200,169,107,0.20);
            border-right: 0;
            box-shadow: -36px 30px 95px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.72);
            isolation: isolate;
          }
          .sector-analysis-luxury::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            border-radius: inherit;
            background:
              linear-gradient(90deg, rgba(61,49,32,0.022) 1px, transparent 1px),
              linear-gradient(rgba(61,49,32,0.018) 1px, transparent 1px),
              radial-gradient(circle at 25% 20%, rgba(200,169,107,0.035), transparent 28%),
              radial-gradient(circle at 78% 72%, rgba(255,255,255,0.28), transparent 30%);
            background-size: 68px 68px, 68px 68px, 100% 100%, 100% 100%;
            mask-image: radial-gradient(ellipse at 50% 0%, black, transparent 70%);
            z-index: -1;
          }
          .sector-analysis-luxury::after {
            content: '';
            position: absolute;
            right: 0;
            top: 18px;
            bottom: 18px;
            width: 1px;
            height: auto;
            background: linear-gradient(180deg, transparent, rgba(200,169,107,0.48), transparent);
            pointer-events: none;
          }
          .sector-analysis-luxury > * {
            position: relative;
            z-index: 1;
          }
          .sector-analysis-luxury p,
          .sector-analysis-luxury li {
            color: #5E564C;
          }
          .sector-analysis-luxury [class*="text-white"],
          .sector-analysis-luxury [class*="text-[#E8DCC4]"] {
            color: #171717 !important;
          }
          .sector-analysis-luxury [class*="text-[#8B8B8B]"],
          .sector-analysis-luxury [class*="text-[#6B6B6B]"],
          .sector-analysis-luxury [class*="text-[#555]"],
          .sector-analysis-luxury [class*="text-[#9B9B9B]"],
          .sector-analysis-luxury [class*="text-[#B0B0B0]"],
          .sector-analysis-luxury [class*="text-[#B0A080]"],
          .sector-analysis-luxury [class*="text-[#C0C0C0]"],
          .sector-analysis-luxury [class*="text-[#C8C8C8]"],
          .sector-analysis-luxury [class*="text-[#D0D0D0]"] {
            color: #5F574C !important;
          }
          .sector-analysis-luxury [class*="border-white"] {
            border-color: rgba(17,24,39,0.07) !important;
          }
          .sector-analysis-luxury [style*="rgba(0,0,0,0.3)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.02)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.03)"] {
            background: linear-gradient(180deg, #FFFDF8, #FBF6EC) !important;
            border-color: rgba(93,75,43,0.12) !important;
            box-shadow: 0 12px 32px rgba(63,47,24,0.055), inset 0 1px 0 rgba(255,255,255,0.88) !important;
          }
          .sector-analysis-luxury [style*="rgba(201,166,70,0.04)"],
          .sector-analysis-luxury [style*="rgba(201,166,70,0.05)"],
          .sector-analysis-luxury [style*="rgba(201,166,70,0.06)"] {
            background: linear-gradient(180deg, #FFF8E9, #F9F0DF) !important;
            border-color: rgba(200,169,107,0.18) !important;
          }
          .sector-analysis-luxury [style*="rgba(255,255,255,0.04)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.05)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.06)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.08)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.1)"] {
            background: rgba(17,24,39,0.075) !important;
            border-color: rgba(17,24,39,0.075) !important;
          }
          .sector-analysis-luxury [class*="divide-white"] > :not([hidden]) ~ :not([hidden]) {
            border-color: rgba(17,24,39,0.055) !important;
          }
          .sector-analysis-luxury th {
            color: #7A746A !important;
            font-weight: 600;
            letter-spacing: 0.04em;
          }
          .sector-analysis-luxury td {
            color: #2A2926;
          }
          .sector-analysis-luxury table thead tr {
            border-color: rgba(200,169,107,0.18) !important;
          }
          .sector-analysis-luxury table tbody tr {
            transition: background-color 220ms ease, box-shadow 220ms ease;
          }
          .sector-analysis-luxury table tbody tr:hover {
            background: rgba(255,255,255,0.80) !important;
            box-shadow: inset -2px 0 0 rgba(200,169,107,0.35);
          }
          .sector-analysis-luxury button:not([class*="text-black"]) {
            color: #625D55;
          }
          .sector-analysis-luxury button:not([class*="text-black"]):hover {
            background: rgba(255,255,255,0.68) !important;
            color: #9F7F3C !important;
          }
          .sector-analysis-luxury svg [stroke="rgba(255,255,255,0.1)"],
          .sector-analysis-luxury svg [stroke="rgba(255,255,255,0.06)"] {
            stroke: rgba(17,24,39,0.08) !important;
          }
          .sector-analysis-luxury {
            min-height: calc(100vh - 132px);
            border-radius: 0;
            padding: 0;
            color: #F4F6FA;
            background:
              radial-gradient(circle at 82% 6%, rgba(201,166,70,0.10), transparent 30%),
              radial-gradient(circle at 28% 0%, rgba(34,197,94,0.055), transparent 26%),
              linear-gradient(180deg, #05080B 0%, #070A0D 48%, #050607 100%);
            border: 0;
            box-shadow: none;
          }
          .sector-analysis-luxury::before {
            z-index: 0;
            background:
              linear-gradient(90deg, rgba(201,166,70,0.045) 1px, transparent 1px),
              linear-gradient(rgba(201,166,70,0.03) 1px, transparent 1px),
              radial-gradient(circle at 78% 20%, rgba(201,166,70,0.08), transparent 32%);
            background-size: 58px 58px, 58px 58px, 100% 100%;
            opacity: 0.55;
            mask-image: radial-gradient(ellipse at 50% 8%, black, transparent 78%);
          }
          .sector-analysis-luxury::after {
            display: none;
          }
          .sector-analysis-luxury p,
          .sector-analysis-luxury li,
          .sector-analysis-luxury td {
            color: #CDD3DD;
          }
          .sector-analysis-luxury h1,
          .sector-analysis-luxury h2,
          .sector-analysis-luxury h3,
          .sector-analysis-luxury th,
          .sector-analysis-luxury [class*="text-white"],
          .sector-analysis-luxury [class*="text-[#171717]"] {
            color: #F4F6FA !important;
          }
          .sector-analysis-luxury [class*="text-[#7A746A]"],
          .sector-analysis-luxury [class*="text-[#6F6A61]"],
          .sector-analysis-luxury [class*="text-[#6B6B6B]"],
          .sector-analysis-luxury [class*="text-[#665D51]"],
          .sector-analysis-luxury [class*="text-[#5F574C]"],
          .sector-analysis-luxury [class*="text-[#625D55]"],
          .sector-analysis-luxury [class*="text-[#555]"],
          .sector-analysis-luxury [class*="text-[#4B4B4B]"],
          .sector-analysis-luxury [class*="text-[#8B8B8B]"],
          .sector-analysis-luxury [class*="text-[#9B9B9B]"],
          .sector-analysis-luxury [class*="text-[#B0B0B0]"],
          .sector-analysis-luxury [class*="text-[#B0A080]"],
          .sector-analysis-luxury [class*="text-[#C0C0C0]"],
          .sector-analysis-luxury [class*="text-[#C8C8C8]"],
          .sector-analysis-luxury [class*="text-[#D0D0D0]"],
          .sector-analysis-luxury [class*="text-[#E8DCC4]"] {
            color: #AAB2BF !important;
          }
          .sector-analysis-luxury [class*="bg-white"] {
            background-color: rgba(10,15,20,0.94) !important;
          }
          .sector-analysis-luxury [style*="#FFFDF8"],
          .sector-analysis-luxury [style*="#FBF6EC"],
          .sector-analysis-luxury [style*="#FFF8E9"],
          .sector-analysis-luxury [style*="#F9F0DF"],
          .sector-analysis-luxury [style*="rgb(255, 253, 248)"],
          .sector-analysis-luxury [style*="rgb(251, 246, 236)"],
          .sector-analysis-luxury [style*="rgb(255, 248, 233)"],
          .sector-analysis-luxury [style*="rgba(0,0,0,0.3)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.70)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.80)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.88)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.92)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.88)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.70)"],
          .sector-analysis-luxury [style*="rgba(255,255,255,0.62)"] {
            background: linear-gradient(180deg, rgba(11,17,22,0.96), rgba(7,10,13,0.96)) !important;
            border-color: rgba(201,166,70,0.14) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.055), 0 18px 42px rgba(0,0,0,0.24) !important;
          }
          .sector-analysis-luxury [class*="bg-black/["],
          .sector-analysis-luxury [class*="bg-black/"] {
            background-color: rgba(255,255,255,0.08) !important;
          }
          .sector-analysis-luxury [class*="border-b"] {
            border-color: rgba(201,166,70,0.12) !important;
          }
          .sector-analysis-luxury table tbody tr:hover {
            background: rgba(255,255,255,0.045) !important;
            box-shadow: inset 2px 0 0 rgba(201,166,70,0.32);
          }
          .sector-analysis-luxury button:not([class*="text-black"]) {
            color: #CDD3DD;
          }
          .sector-analysis-luxury button:not([class*="text-black"]):hover {
            background: rgba(201,166,70,0.10) !important;
            color: #F4D97B !important;
          }
          .fin-dark-card {
            position: relative;
            overflow: hidden;
            border-radius: 14px;
            border: 1px solid rgba(201,166,70,0.12);
            background:
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.045), transparent 34%),
              linear-gradient(180deg, rgba(13,20,26,0.92), rgba(7,11,15,0.94));
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.055), 0 18px 44px rgba(0,0,0,0.28);
          }
        `}
      </style>
      {!selectedSector && <div
        className="absolute inset-0 bg-section-base"
      style={{
        background:
          'radial-gradient(ellipse at 50% -12%, rgba(201,166,70,0.08) 0%, rgba(9,18,25,0.44) 29%, rgba(5,6,8,0.97) 64%, var(--bg-section-base) 100%)',
      }}
      />}
      {/* Background Effects */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${selectedSector ? 'hidden' : ''}`}>
        <div
          className="absolute left-1/2 top-[-210px] h-[520px] w-[78%] -translate-x-1/2 [animation:sectorAmbient_14s_ease-in-out_infinite]"
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
        <div className="absolute inset-x-[10%] top-[88px] h-[220px] opacity-35 [animation:sectorDataFlow_16s_ease-in-out_infinite] [background-image:linear-gradient(115deg,transparent_0_31%,rgba(255,255,255,0.055)_32%_32.5%,transparent_33%_54%,rgba(201,166,70,0.07)_55%_55.5%,transparent_56%)] [mask-image:radial-gradient(ellipse_at_50%_36%,black,transparent_72%)]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:84px_84px] [mask-image:radial-gradient(ellipse_at_50%_20%,black,transparent_70%)]" />
        <div className="absolute left-[14%] top-[18%] h-1 w-1 rounded-full bg-white/20 shadow-[260px_60px_0_rgba(201,166,70,0.13),790px_24px_0_rgba(255,255,255,0.10),1120px_92px_0_rgba(201,166,70,0.10)]" />
        <div className="absolute inset-x-0 bottom-0 h-[260px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(9,20,28,0.34),transparent_62%)]" />
      </div>

      {/* Content */}
      <div className={`relative z-10 w-full ${selectedSector ? 'px-5 py-4 lg:px-7' : 'px-6 py-8 lg:px-9'}`}>
        <AnimatePresence mode="wait">
          {selectedSector ? (
            <SectorAnalysisView
              key="analysis"
              sector={selectedSector}
              onBack={handleBack}
            />
          ) : (
            <HomeView
              key="home"
              onSelectSector={handleSelectSector}
              sectors={sectors}
              isLoading={sectorsLoading}
              isError={sectorsError}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SectorAnalyzer() {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('sector_analyzer');
  if (accessLoading) {
    return <AiSectorAnalyzerSkeletonPage />;
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
        currentPlan={plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : 'free'}
      />
    );
  }
  return <SectorAnalyzerContent />;
}
