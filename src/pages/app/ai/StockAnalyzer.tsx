// src/pages/app/ai/StockAnalyzer.tsx
// =====================================================
// 🚀 STOCK ANALYZER — Main Page (v2 — AI Arena Shell)
// =====================================================
// 1A: Hero + Empty + Error via v2 components.
//     Tabs, TabNav, StockLoadingSkeleton preserved unchanged.
// =====================================================

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

import { useStockAnalyzer } from '@/hooks/useStockAnalyzer';
import { POPULAR_TICKERS } from '@/constants/stock-analyzer.constants';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { UsageBadge } from '@/components/access/UsageBadge';

import { AIArenaShell } from '@/components/ai-arena';
import { SearchBar } from '@/components/stock-analyzer/SearchBar';
import { StockLoadingSkeleton } from '@/components/stock-analyzer/StockLoadingSkeleton';
import { TabNav } from '@/components/stock-analyzer/TabNav';
import {
  StockAnalyzerHero,
  StockAnalyzerLandingHero,
  StockErrorState,
} from '@/components/stock-analyzer/v2';
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
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    selectedTicker,
    handleSelectTicker: originalHandleSelectTicker,
    activeTab,
    setActiveTab,
    stockData,
    isLoading,
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
    // Admin bypass — no limits
    if (plan === 'platform_enterprise') {
      originalHandleSelectTicker(ticker);
      return;
    }
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

  // Choose what to show in shell hero
  const customHero = stockData
    ? <StockAnalyzerHero data={stockData} />
    : (
      <StockAnalyzerLandingHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectTicker={handleSelectTicker}
        isLoading={isLoading}
        suggestedTickers={POPULAR_TICKERS}
      />
    );

  return (
    <AIArenaShell
      eyebrow={undefined}
      title={stockData ? undefined : 'Stock Analyzer'}
      subtitle={stockData ? undefined : 'Institutional-grade deep research and AI-narrated analysis.'}
      customHero={customHero}
      beam={false}
      goldHalo={false}
      constructionMarkers={false}
    >
      {/* Usage badge */}
      {stockData && (
        <motion.div
          key={`stock-analysis-${stockData.ticker}`}
          className="stock-analyzer-results relative mx-auto max-w-[1240px]"
          initial={{ opacity: 0, x: 52, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-[-96px] h-[220px] w-[58%] -translate-x-1/2 rounded-full blur-[92px]"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,226,156,0.055) 0%, rgba(201,166,70,0.018) 44%, transparent 74%)',
            }}
          />

          {plan !== 'platform_enterprise' && (
            <div className="relative z-10 mb-ds-5 flex justify-center">
              <UsageBadge
                used={usage.stockAnalysisToday}
                limit={usage.stockAnalysisLimit}
                label="analyses today"
              />
            </div>
          )}

          <div className="relative z-10 mb-ds-8">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={handleSelectTicker}
              isLoading={isLoading}
              variant="hero"
              showAnalyzeButton
            />
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && selectedTicker && <StockLoadingSkeleton />}

      {/* Error */}
      {loadError && !isLoading && (
        <div className="mt-ds-6">
          <StockErrorState message={loadError} />
        </div>
      )}

      {/* Loaded — tabs */}
      {stockData && !isLoading && (
        <motion.div
          key={`stock-analysis-body-${stockData.ticker}`}
          className="stock-analyzer-results relative mx-auto mt-ds-8 max-w-[1240px] space-y-ds-7"
          initial={{ opacity: 0, x: 72, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        >
          <div
            className="pointer-events-none absolute inset-x-[-24px] top-[-48px] h-[180px] rounded-full blur-[96px]"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse at 72% 0%, rgba(201,166,70,0.038) 0%, rgba(201,166,70,0.012) 40%, transparent 72%)',
            }}
          />
          <div className="relative z-10 overflow-x-auto pb-1">
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="relative z-10 min-h-[400px]">
            {/* All tabs mount simultaneously so their useEffect fetches fire in parallel.
                CSS hidden keeps inactive tabs invisible without unmounting them.
                OptionsTab is excluded from pre-load (no AI fetch on mount; access-gated). */}
            <div hidden={activeTab !== 'overview'}><OverviewTab data={stockData} /></div>
            <div hidden={activeTab !== 'business'}><BusinessTab data={stockData} /></div>
            <div hidden={activeTab !== 'financials'}><FinancialsTab data={stockData} /></div>
            <div hidden={activeTab !== 'valuation'}><ValuationTab data={stockData} /></div>
            <div hidden={activeTab !== 'wallstreet'}><WallStreetTab data={stockData} /></div>
            <div hidden={activeTab !== 'earnings'}><EarningsTab data={stockData} /></div>
            {activeTab === 'options' && (() => {
              const optionsAccess = canAccessPage('options_tab');
              if (!optionsAccess.hasAccess) {
                return (
                  <div className="flex flex-col items-center justify-center py-ds-9 gap-ds-3">
                    <div
                      className="w-16 h-16 rounded-[16px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                        border: '1px solid rgba(201,166,70,0.3)',
                      }}
                    >
                      <Lock className="w-8 h-8 text-gold-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-h4 font-medium text-ink-primary">Options Analysis</h3>
                    <p className="text-small text-ink-tertiary text-center max-w-xs">
                      Available from the <span className="text-gold-primary font-semibold">Core</span> plan and above.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/app/all-markets/pricing')}
                      className="mt-ds-1 px-ds-5 py-ds-2 rounded-[16px] text-small font-semibold text-ink-on-gold"
                      style={{
                        background: 'var(--gradient-gold)',
                        boxShadow: 'var(--glow-gold-resting)',
                      }}
                    >
                      Upgrade to Core
                    </button>
                  </div>
                );
              }
              return <OptionsTab data={stockData} />;
            })()}
          </div>
          <style>{`
            .stock-analyzer-results [style*="border: 1px solid rgba(201,166,70"] {
              border-color: rgba(255,255,255,0.055) !important;
            }

            .stock-analyzer-results [style*="rgba(201,166,70,0.15)"] {
              border-color: rgba(255,255,255,0.055) !important;
            }

            .stock-analyzer-results h2,
            .stock-analyzer-results h3 {
              letter-spacing: 0 !important;
            }
          `}</style>
        </motion.div>
      )}
    </AIArenaShell>
  );
}
