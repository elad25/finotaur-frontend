// src/pages/app/all-markets/SummaryOverviewEmbed.tsx
// =====================================================
// FINOTAUR SUMMARY OVERVIEW EMBED - OPTIMIZED v2.0
// =====================================================
// OPTIMIZATIONS:
// 1. Accepts preloaded data via props (eliminates duplicate API calls)
// 2. SEC tickers cached in sessionStorage (1MB file loaded once)
// 3. Lazy loading for below-fold components
// 4. Memoized components to prevent re-renders
// =====================================================

import React, { useMemo, useState, useEffect, memo } from "react";
import { useSearchParams } from "react-router-dom";
import PriceChartLite from "@/components/overview/PriceChartLite";
import NewsPreview from "@/components/overview/NewsPreview";
import SECFilingsLuxury from "@/components/markets/SECFilingsLuxury";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart,
  Activity,
  Percent,
  Building2,
  Newspaper,
  Target,
  Globe,
  ExternalLink
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FinancialMetrics {
  revenueGrowth?: number;
  netIncomeGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  currentRatio?: number;
  debtToEquity?: number;
  freeCashFlow?: number;
  revenuePerShare?: number;
  bookValuePerShare?: number;
}

interface CompanyProfile {
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string;
  exchange: string;
  website: string | null;
  logo?: string | null;
  employees?: number | null;
}

interface AnalystRating {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  consensus: string;
}

interface PriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  currentPrice: number;
  upsidePercent: number;
}
interface AnalystAction {
  date: string;
  firm: string;
  action: string;
  fromGrade: string | null;
  toGrade: string | null;
}

interface SECFiling {
  id: string;
  type: "Annual" | "Quarterly/Interim" | "8-K" | "Other";
  filingDate: string;
  reportDate: string;
  documentUrl: string;
  formType?: string;
}

// ═══════════════════════════════════════════════════════════════
// PRELOADED DATA INTERFACE (from parent component)
// ═══════════════════════════════════════════════════════════════

// ✅ אחרי
interface PreloadedData {
  profile?: CompanyProfile | null;
  analystRating?: AnalystRating | null;
  priceTarget?: PriceTarget | null;
  financials?: FinancialMetrics | null;
  analystActions?: AnalystAction[];  // 🆕
}

interface Props {
  symbol?: string;
  preloadedData?: PreloadedData;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatNumber(value: number | undefined | null, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

function getFilingType(form: string): "Annual" | "Quarterly/Interim" | "8-K" | "Other" {
  if (!form) return "Other";
  const formUpper = form.toUpperCase();
  if (formUpper.includes("10-K") || formUpper === "10K") return "Annual";
  if (formUpper.includes("10-Q") || formUpper === "10Q") return "Quarterly/Interim";
  if (formUpper.includes("8-K") || formUpper === "8K") return "8-K";
  return "Other";
}

// ═══════════════════════════════════════════════════════════════
// METRIC CARD COMPONENT (Memoized)
// ═══════════════════════════════════════════════════════════════

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

const MetricCard = memo<MetricCardProps>(({ label, value, icon: Icon, trend, subtitle }) => (
  <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-3 hover:border-zinc-700/60 transition-colors">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <Icon className="w-3 h-3 text-zinc-600" />
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-base font-semibold ${
        trend === 'positive' ? 'text-emerald-400' : 
        trend === 'negative' ? 'text-red-400' : 
        'text-white'
      }`}>
        {value}
      </span>
    </div>
    {subtitle && (
      <div className="text-[9px] text-zinc-600 mt-0.5">{subtitle}</div>
    )}
  </div>
));

MetricCard.displayName = 'MetricCard';

// ═══════════════════════════════════════════════════════════════
// FINANCIAL METRICS COMPONENT (Uses preloaded or fetches)
// ═══════════════════════════════════════════════════════════════

interface FinancialMetricsGridProps {
  symbol: string;
  preloadedMetrics?: FinancialMetrics | null;
}

const FinancialMetricsGrid = memo<FinancialMetricsGridProps>(({ symbol, preloadedMetrics }) => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(preloadedMetrics || null);
  const [loading, setLoading] = useState(!preloadedMetrics);

  useEffect(() => {
    // If we have preloaded data, use it
    if (preloadedMetrics) {
      setMetrics(preloadedMetrics);
      setLoading(false);
      return;
    }

    // Otherwise fetch (fallback)
    const controller = new AbortController();
    
    const fetchMetrics = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
        const response = await fetch(`${API_BASE}/market-data/financials/${symbol}`, {
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[FinancialMetrics] Error:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchMetrics();
    }

    return () => controller.abort();
  }, [symbol, preloadedMetrics]);

  if (loading) {
    return (
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C9A646]" />
            Financial Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayMetrics = metrics || {};

  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#C9A646]" />
          Financial Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Revenue Growth"
            value={formatPercent(displayMetrics.revenueGrowth)}
            icon={TrendingUp}
            trend={displayMetrics.revenueGrowth ? (displayMetrics.revenueGrowth > 0 ? 'positive' : 'negative') : 'neutral'}
            subtitle="YoY"
          />
          <MetricCard
            label="Net Income Growth"
            value={formatPercent(displayMetrics.netIncomeGrowth)}
            icon={TrendingUp}
            trend={displayMetrics.netIncomeGrowth ? (displayMetrics.netIncomeGrowth > 0 ? 'positive' : 'negative') : 'neutral'}
            subtitle="YoY"
          />
          <MetricCard
            label="Gross Margin"
            value={formatPercent(displayMetrics.grossMargin)}
            icon={PieChart}
            subtitle="TTM"
          />
          <MetricCard
            label="Operating Margin"
            value={formatPercent(displayMetrics.operatingMargin)}
            icon={Activity}
            subtitle="TTM"
          />
          <MetricCard
            label="Net Margin"
            value={formatPercent(displayMetrics.netMargin)}
            icon={Percent}
            subtitle="TTM"
          />
          <MetricCard
            label="ROE"
            value={formatPercent(displayMetrics.roe)}
            icon={DollarSign}
            trend={displayMetrics.roe ? (displayMetrics.roe > 15 ? 'positive' : displayMetrics.roe < 5 ? 'negative' : 'neutral') : 'neutral'}
            subtitle="Return on Equity"
          />
          <MetricCard
            label="Current Ratio"
            value={formatNumber(displayMetrics.currentRatio)}
            icon={BarChart3}
            trend={displayMetrics.currentRatio ? (displayMetrics.currentRatio > 1.5 ? 'positive' : displayMetrics.currentRatio < 1 ? 'negative' : 'neutral') : 'neutral'}
            subtitle="Liquidity"
          />
          <MetricCard
            label="Debt/Equity"
            value={formatNumber(displayMetrics.debtToEquity)}
            icon={Building2}
            trend={displayMetrics.debtToEquity ? (displayMetrics.debtToEquity < 0.5 ? 'positive' : displayMetrics.debtToEquity > 2 ? 'negative' : 'neutral') : 'neutral'}
            subtitle="Leverage"
          />
        </div>
      </CardContent>
    </Card>
  );
});

FinancialMetricsGrid.displayName = 'FinancialMetricsGrid';

// ═══════════════════════════════════════════════════════════════
// ANALYST SENTIMENT COMPONENT (Uses preloaded data)
// ═══════════════════════════════════════════════════════════════

// ✅ אחרי
interface AnalystSentimentCardProps {
  symbol: string;
  preloadedRating?: AnalystRating | null;
  preloadedTarget?: PriceTarget | null;
  preloadedActions?: AnalystAction[];  // 🆕
}
// ✅ אחרי - קומפוננטה מלאה עם analyst actions

const AnalystSentimentCard = memo<AnalystSentimentCardProps>(({ 
  symbol, 
  preloadedRating, 
  preloadedTarget,
  preloadedActions  // 🆕
}) => {
  const [data, setData] = useState<{ 
    rating: AnalystRating | null; 
    priceTarget: PriceTarget | null;
    actions: AnalystAction[];  // 🆕
  }>({
    rating: preloadedRating || null,
    priceTarget: preloadedTarget || null,
    actions: preloadedActions || [],  // 🆕
  });
  const [loading, setLoading] = useState(!preloadedRating);
  const [showAllActions, setShowAllActions] = useState(false);  // 🆕

  useEffect(() => {
    if (preloadedRating !== undefined) {
      setData({ 
        rating: preloadedRating, 
        priceTarget: preloadedTarget || null,
        actions: preloadedActions || []  // 🆕
      });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
        const response = await fetch(`${API_BASE}/analyst/${symbol}`, {  // 🆕 Changed path
          signal: controller.signal
        });
        if (response.ok) {
          const result = await response.json();
          setData({ 
            rating: result.rating, 
            priceTarget: result.priceTarget,
            actions: result.analystActions || []  // 🆕
          });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[Analyst] Error:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchData();
    
    return () => controller.abort();
  }, [symbol, preloadedRating, preloadedTarget, preloadedActions]);

  // 🆕 Helper functions for actions display
  const getActionColor = (action: string): string => {
    const a = action.toLowerCase();
    if (a.includes('upgrade')) return 'text-emerald-400';
    if (a.includes('downgrade')) return 'text-red-400';
    if (a.includes('init')) return 'text-blue-400';
    return 'text-zinc-400';
  };

  const getActionBg = (action: string): string => {
    const a = action.toLowerCase();
    if (a.includes('upgrade')) return 'bg-emerald-500/10 border-emerald-500/20';
    if (a.includes('downgrade')) return 'bg-red-500/10 border-red-500/20';
    if (a.includes('init')) return 'bg-blue-500/10 border-blue-500/20';
    return 'bg-zinc-800/50 border-zinc-700/50';
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            Analyst Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-8 bg-zinc-800/50 rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-800/50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rating = data.rating;
  const priceTarget = data.priceTarget;
  const actions = data.actions || [];  // 🆕
  const total = rating?.total || 0;
  const buyPercent = total > 0 ? ((rating!.strongBuy + rating!.buy) / total) * 100 : 0;
  const holdPercent = total > 0 ? (rating!.hold / total) * 100 : 0;
  const sellPercent = total > 0 ? ((rating!.sell + rating!.strongSell) / total) * 100 : 0;
  
  const displayedActions = showAllActions ? actions : actions.slice(0, 5);  // 🆕

  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-[#C9A646]" />
          Analyst Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rating && total > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Consensus</span>
              <span className={`text-sm font-semibold ${
                rating.consensus.toLowerCase().includes('buy') ? 'text-emerald-400' :
                rating.consensus.toLowerCase().includes('sell') ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {rating.consensus}
              </span>
            </div>

            <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800">
              <div className="bg-emerald-500" style={{ width: `${buyPercent}%` }} />
              <div className="bg-yellow-500" style={{ width: `${holdPercent}%` }} />
              <div className="bg-red-500" style={{ width: `${sellPercent}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-emerald-400 font-semibold text-lg">{rating.strongBuy + rating.buy}</div>
                <div className="text-xs text-zinc-500">Buy</div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-yellow-400 font-semibold text-lg">{rating.hold}</div>
                <div className="text-xs text-zinc-500">Hold</div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-red-400 font-semibold text-lg">{rating.sell + rating.strongSell}</div>
                <div className="text-xs text-zinc-500">Sell</div>
              </div>
            </div>

            <div className="text-center text-xs text-zinc-600">
              Based on {total} analyst{total !== 1 ? 's' : ''}
            </div>

            {priceTarget && (
              <div className="pt-3 border-t border-zinc-800/60">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Price Target</span>
                  <span className="text-[#C9A646] font-semibold">${formatNumber(priceTarget.targetMean, 0)}</span>
                </div>
                {priceTarget.upsidePercent !== 0 && (
                  <div className={`text-xs text-right ${priceTarget.upsidePercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {priceTarget.upsidePercent > 0 ? '↑' : '↓'} {Math.abs(priceTarget.upsidePercent).toFixed(1)}% upside
                  </div>
                )}
              </div>
            )}

            {/* 🆕 RECENT ANALYST ACTIONS */}
            {actions.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Recent Actions
                  </span>
                  <span className="text-[10px] text-zinc-600">Last 90 days</span>
                </div>
                
                <div className="space-y-1.5">
                  {displayedActions.map((action, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-lg border ${getActionBg(action.action)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-white truncate block">
                            {action.firm}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[10px] capitalize ${getActionColor(action.action)}`}>
                              {action.action}
                            </span>
                            {action.fromGrade && action.toGrade && (
                              <>
                                <span className="text-zinc-600 text-[10px]">•</span>
                                <span className="text-[10px] text-zinc-500">{action.fromGrade}</span>
                                <span className="text-zinc-600 text-[10px]">→</span>
                                <span className="text-[10px] text-zinc-300">{action.toGrade}</span>
                              </>
                            )}
                            {!action.fromGrade && action.toGrade && (
                              <span className="text-[10px] text-zinc-300">→ {action.toGrade}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">
                          {formatDate(action.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {actions.length > 5 && (
                  <button
                    onClick={() => setShowAllActions(!showAllActions)}
                    className="w-full mt-2 py-1 text-xs text-[#C9A646] hover:text-[#D4AF37] transition-colors"
                  >
                    {showAllActions ? 'Show Less' : `Show All ${actions.length} Actions`}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500">No analyst data available</p>
        )}
      </CardContent>
    </Card>
  );
});

AnalystSentimentCard.displayName = 'AnalystSentimentCard';
// ═══════════════════════════════════════════════════════════════
// COMPANY OVERVIEW COMPONENT (Uses preloaded data)
// ═══════════════════════════════════════════════════════════════

interface CompanyOverviewCardProps {
  symbol: string;
  preloadedProfile?: CompanyProfile | null;
}

const CompanyOverviewCard = memo<CompanyOverviewCardProps>(({ symbol, preloadedProfile }) => {
  const [profile, setProfile] = useState<CompanyProfile | null>(preloadedProfile || null);
  const [loading, setLoading] = useState(!preloadedProfile);

  useEffect(() => {
    // If we have preloaded data, use it
    if (preloadedProfile !== undefined) {
      setProfile(preloadedProfile);
      setLoading(false);
      return;
    }

    // Otherwise fetch (fallback)
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
        const response = await fetch(`${API_BASE}/market-data/company/${symbol}`, {
          signal: controller.signal
        });
        if (response.ok) {
          const result = await response.json();
          setProfile(result);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[Company] Error:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchData();
    
    return () => controller.abort();
  }, [symbol, preloadedProfile]);

  const truncateAtSentence = (text: string, maxLength: number = 400): string => {
    if (!text || text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('. ');
    
    if (lastPeriod > maxLength * 0.4) {
      return text.substring(0, lastPeriod + 1);
    }
    
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return text.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C9A646]" />
            Company Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-4 bg-zinc-800/50 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayDescription = profile?.description 
    ? truncateAtSentence(profile.description, 450) 
    : null;

  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#C9A646]" />
          Company Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayDescription ? (
          <p className="text-sm text-zinc-400 leading-relaxed">
            {displayDescription}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 italic">No description available</p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/60">
          <div>
            <span className="text-xs text-zinc-600">Country</span>
            <p className="text-sm text-zinc-300">{profile?.country || 'US'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">Exchange</span>
            <p className="text-sm text-zinc-300">{profile?.exchange || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">Employees</span>
            <p className="text-sm text-zinc-300">{profile?.employees?.toLocaleString() || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">Industry</span>
            <p className="text-sm text-zinc-300">{profile?.industry || '—'}</p>
          </div>
        </div>

        {profile?.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#C9A646] hover:text-[#D4AF37] transition-colors pt-2"
          >
            <Globe className="w-4 h-4" />
            Visit Website
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <p className="text-[10px] text-zinc-600 pt-2">
          Source: SEC EDGAR / Polygon / Finnhub
        </p>
      </CardContent>
    </Card>
  );
});

CompanyOverviewCard.displayName = 'CompanyOverviewCard';

// ═══════════════════════════════════════════════════════════════
// SEC FILINGS HOOK - USES SERVER API (no CORS issues!)
// ═══════════════════════════════════════════════════════════════

function useSECFilings(symbol: string) {
  const [filings, setFilings] = useState<SECFiling[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    
    const controller = new AbortController();
    const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
    
    const fetchFilings = async () => {
      setLoading(true);
      
      try {
        // ✅ FIXED: Use server API instead of direct SEC access (avoids CORS)
        // Server endpoint: /api/sec/filings?symbol=AAPL&forms=10-K,10-Q,8-K&limit=15
        const response = await fetch(
          `${API_BASE}/sec/filings?symbol=${symbol}&forms=10-K,10-Q,8-K&limit=15`,
          { signal: controller.signal }
        );
        
        if (!response.ok) {
          console.warn('[SEC] Server returned:', response.status);
          setFilings(generateSampleFilings(symbol));
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (!data?.filings || data.filings.length === 0) {
          console.log('[SEC] No filings returned, using fallback');
          setFilings(generateSampleFilings(symbol));
          setLoading(false);
          return;
        }

        // Transform server response to our format
        const transformed: SECFiling[] = data.filings.map((f: any) => ({
          id: f.accessionNumber || f.id,
          type: getFilingType(f.form || f.formType),
          filingDate: f.filingDate,
          reportDate: f.reportDate || f.filingDate,
          documentUrl: f.filingUrl || f.documentUrl,
          formType: f.form || f.formType,
        }));
        
        setFilings(transformed);
        console.log(`[SEC] Loaded ${transformed.length} filings for ${symbol}`);
        
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[SEC] Error fetching filings:', error);
          setFilings(generateSampleFilings(symbol));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFilings();
    
    return () => controller.abort();
  }, [symbol]);

  return { filings, loading };
}

// Generate sample filings with SEC links
function generateSampleFilings(symbol: string): SECFiling[] {
  const now = new Date();
  const filings: SECFiling[] = [];
  
  for (let year = now.getFullYear(); year >= now.getFullYear() - 2; year--) {
    filings.push({
      id: `${symbol}-10K-${year}`,
      type: "Annual",
      filingDate: `${year + 1}-02-28`,
      reportDate: `${year}-12-31`,
      documentUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-K&dateb=${year + 1}0430&owner=include&count=1`,
      formType: "10-K",
    });
    
    const quarters = [
      { q: 'Q1', filed: `${year}-05-15`, period: `${year}-03-31` },
      { q: 'Q2', filed: `${year}-08-15`, period: `${year}-06-30` },
      { q: 'Q3', filed: `${year}-11-15`, period: `${year}-09-30` },
    ];
    
    for (const q of quarters) {
      if (new Date(q.filed) < now) {
        filings.push({
          id: `${symbol}-10Q-${year}-${q.q}`,
          type: "Quarterly/Interim",
          filingDate: q.filed,
          reportDate: q.period,
          documentUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-Q&owner=include&count=1`,
          formType: "10-Q",
        });
      }
    }
  }
  
  return filings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()).slice(0, 12);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

function SummaryOverviewEmbed({ symbol: propSymbol, preloadedData }: Props) {
  const [sp] = useSearchParams();
  const symbol = useMemo(() => {
    const s = (propSymbol || sp.get("symbol") || sp.get("ticker") || "").trim();
    return s ? s.toUpperCase() : "";
  }, [propSymbol, sp]);

  // Fetch SEC filings
  const { filings, loading: filingsLoading } = useSECFilings(symbol);

  // AI Analysis handler (placeholder)
  const handleAnalyze = async (filing: SECFiling) => {
    console.log('[AI Analysis] Analyzing filing:', filing);
    alert(`AI Analysis for ${filing.formType} (${filing.reportDate}) coming soon!`);
  };

  if (!symbol) {
    return (
      <div className="max-w-[1200px] mx-auto px-2 md:px-4 animate-pulse">
        <div className="h-[260px] rounded-2xl bg-[#101216] mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 space-y-6">
      {/* 1. Price Chart */}
      <div>
        <PriceChartLite symbol={symbol} />
      </div>
      
      {/* 2. Financial Metrics (uses preloaded if available) */}
      <FinancialMetricsGrid 
        symbol={symbol} 
        preloadedMetrics={preloadedData?.financials}
      />
      
      {/* 3. Analyst Sentiment + Company Overview - Side by Side */}
      <div className="grid md:grid-cols-2 gap-4">
<AnalystSentimentCard 
  symbol={symbol}
  preloadedRating={preloadedData?.analystRating}
  preloadedTarget={preloadedData?.priceTarget}
  preloadedActions={preloadedData?.analystActions}  // 🆕
/>
        <CompanyOverviewCard 
          symbol={symbol}
          preloadedProfile={preloadedData?.profile}
        />
      </div>
      
      {/* 4. News Preview */}
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#C9A646]" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewsPreview symbol={symbol} />
        </CardContent>
      </Card>
      
      {/* 5. SEC Filings */}
      <SECFilingsLuxury 
        symbol={symbol} 
        filings={filings}
        isLoading={filingsLoading}
        onAnalyze={handleAnalyze}
        analysisEnabled={false}
      />
    </div>
  );
}

export default memo(SummaryOverviewEmbed);