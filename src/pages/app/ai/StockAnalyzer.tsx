// src/pages/app/ai/StockAnalyzer.tsx
// =====================================================
// 🚀 STOCK ANALYZER — Main Page (Thin Orchestrator)
// =====================================================
// UPDATED: Replaced Dividends/News/Risks tabs with Earnings tab
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';
import { Search, XCircle } from 'lucide-react';

import { useStockAnalyzer } from '@/hooks/useStockAnalyzer';
import { POPULAR_TICKERS } from '@/constants/stock-analyzer.constants';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { UsageBadge } from '@/components/access/UsageBadge';

// Components
import { Card } from '@/components/stock-analyzer/ui';
import { SearchBar } from '@/components/stock-analyzer/SearchBar';
import { StockLoadingSkeleton } from '@/components/stock-analyzer/StockLoadingSkeleton';
import { PriceHeader } from '@/components/stock-analyzer/PriceHeader';
import { TabNav } from '@/components/stock-analyzer/TabNav';
import {
  OverviewTab,
  BusinessTab,
  FinancialsTab,
  ValuationTab,
  WallStreetTab,
  EarningsTab,
  OptionsTab,
} from '@/components/stock-analyzer/tabs';

export default function StockAnalyzer() {
  const {
    searchQuery,
    setSearchQuery,
    suggestions,
    selectedTicker,
    handleSelectTicker: originalHandleSelectTicker,
    activeTab,
    setActiveTab,
    stockData,
    news,
    isLoading,
    isLoadingNews,
    loadError,
  } = useStockAnalyzer();

  const {
    canAccessPage,
    recordStockAnalysis,
    usage,
    plan,
    loading: accessLoading,
  } = usePlatformAccess();

  // Wrap ticker selection with usage tracking
  const handleSelectTicker = async (ticker: string) => {
    const access = canAccessPage('stock_analyzer');
    if (!access.hasAccess) return;
    const allowed = await recordStockAnalysis();
    if (!allowed) return;
    originalHandleSelectTicker(ticker);
  };

  // Show gate if daily limit reached
  const access = canAccessPage('stock_analyzer');
  if (!accessLoading && !access.hasAccess && access.reason === 'daily_limit') {
    return (
      <UpgradeGate
        feature="Stock Analyzer"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentUsage={access.currentUsage}
        limit={access.limit}
        currentPlan={plan === 'platform_core' ? 'core' : plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : 'free'}
      />
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)',
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]"
          style={{ background: 'rgba(201,166,70,0.06)' }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]"
          style={{ background: 'rgba(201,166,70,0.04)' }}
        />
        <div
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: 'rgba(244,217,123,0.03)' }}
        />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Stock </span>
            <span
              style={{
                background:
                  'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Analyzer
            </span>
          </h1>
          <p className="text-[#8B8B8B]">
            Institutional-grade deep research and analysis
          </p>
          {plan !== 'platform_enterprise' && (
            <div className="mt-2">
              <UsageBadge
                used={usage.stockAnalysisToday}
                limit={usage.stockAnalysisLimit}
                label="analyses today"
              />
            </div>
          )}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={handleSelectTicker}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {isLoading && selectedTicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StockLoadingSkeleton />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {loadError && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            <Card>
              <div className="p-8 text-center">
                <XCircle className="h-12 w-12 text-[#EF4444]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Data Not Found
                </h3>
                <p className="text-[#8B8B8B]">{loadError}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {stockData && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-6"
            >
              <PriceHeader data={stockData} />

              <div className="flex justify-center overflow-x-auto">
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              <div className="min-h-[400px]">
                {activeTab === 'overview' && <OverviewTab data={stockData} />}
                {activeTab === 'business' && <BusinessTab data={stockData} />}
                {activeTab === 'financials' && (
                  <FinancialsTab data={stockData} />
                )}
                {activeTab === 'valuation' && (
                  <ValuationTab data={stockData} />
                )}
                {activeTab === 'wallstreet' && (
                  <WallStreetTab data={stockData} />
                )}
                {activeTab === 'earnings' && (
                  <EarningsTab data={stockData} />
                )}
                {activeTab === 'options' && (
                  <OptionsTab data={stockData} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!selectedTicker && !isLoading && !loadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-16 text-center"
          >
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                border: '2px solid rgba(201,166,70,0.2)',
              }}
            >
              <Search className="h-10 w-10 text-[#C9A646]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Search for a stock
            </h2>
            <p className="text-[#8B8B8B] mb-8">
              Enter a ticker symbol or company name to begin analysis
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_TICKERS.slice(0, 8).map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectTicker(stock.ticker)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(201,166,70,0.02))',
                    border: '1px solid rgba(201,166,70,0.2)',
                    color: '#C9A646',
                  }}
                >
                  {stock.ticker}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}