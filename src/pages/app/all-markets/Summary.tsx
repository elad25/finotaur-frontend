// src/pages/app/all-markets/Summary.tsx
// =====================================================
// FINOTAUR STOCK SUMMARY PAGE - OPTIMIZED v3.4.0
// =====================================================
// 
// 🔥 v3.4.0 OPTIMIZATIONS:
// - Fixed API paths (quote at /api/quote, others at /api/market-data)
// - Added in-memory caching to prevent duplicate requests
// - Passes preloaded data to SummaryOverviewEmbed (eliminates 3 duplicate fetches)
// - SEC tickers cached in sessionStorage
// - Reduced from ~11 API calls to ~6 API calls
//
// 🔥 v3.3.0 FEATURES (preserved):
// - SECFilingsLuxury component with premium design
// - PriceChartWithScale with Y-axis price notches
// - Gold sector badge with border
// - Gold diamond indicator on 52W range
// - Sector/Industry text more prominent in gold
// - Company Overview moved below Analyst Sentiment
// - Fixed analyst data display
// =====================================================

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryOverviewEmbed from "@/pages/app/all-markets/SummaryOverviewEmbed";
import { useFundamentals } from "@/hooks/useFundamentals";
import useStockSummary from "@/hooks/useStockSummary";
import {
  KPIGrid,
  TrendsPanel,
  ValuationPanel,
  HealthTable,
  IndustryComparison,
  DCFBox,
} from "@/components/fundamentals";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Globe,
  Activity,
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  ExternalLink,
  Star,
  StarOff,
  Share2,
  Bell,
  BellOff,
  Newspaper,
  FileText,
  PieChart,
  LineChart,
  Target,
  TrendingUp as TrendUp,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown,
  Minus,
  Diamond,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type TabKey = "overview" | "fundamentals" | "financials" | "news";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: "overview", label: "Overview", icon: PieChart },
  { key: "fundamentals", label: "Fundamentals", icon: BarChart3 },
  { key: "financials", label: "Financials", icon: FileText },
  { key: "news", label: "News", icon: Newspaper },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getQueryParam(name: string) {
  if (typeof window === "undefined") return "";
  const sp = new URLSearchParams(window.location.search);
  return (sp.get(name) || "").trim();
}

function setQueryParam(next: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  Object.entries(next).forEach(([k, v]) => {
    if (v == null || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  window.history.pushState({}, "", url.toString());
}

function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num == null || isNaN(num)) return "—";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatLargeNumber(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return "—";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

function formatVolume(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return "—";
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCacheAge(ms: number | null): string {
  if (ms === null) return "Not cached";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s ago`;
  return `${seconds}s ago`;
}

// ═══════════════════════════════════════════════════════════════
// SKELETON COMPONENTS
// ═══════════════════════════════════════════════════════════════

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded bg-zinc-800/50", className)} />
);

const HeaderSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-14 w-14 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="flex gap-6">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-28" />
    </div>
  </div>
);

const KPICardSkeleton = () => (
  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-7 w-24" />
    <Skeleton className="h-3 w-16" />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// KPI CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  delay?: number;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  delay = 0,
}) => (
  <div
    className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 
               transition-all duration-300 hover:border-[#C9A646]/30 hover:bg-zinc-900/60
               hover:shadow-[0_0_20px_rgba(201,166,70,0.08)]"
    style={{ animation: `fadeSlideUp 0.5s ease-out ${delay}ms both` }}
  >
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#C9A646]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
        <Icon className="w-4 h-4 text-zinc-600 group-hover:text-[#C9A646]/60 transition-colors" />
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-white">{value}</span>
        {trend && trend !== "neutral" && (
          <span className={cn(
            "text-xs font-medium",
            trend === "up" ? "text-emerald-400" : "text-red-400"
          )}>
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
      
      {subValue && (
        <div className="mt-1 text-xs text-zinc-500">{subValue}</div>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SECTOR ETF MAPPING
// ═══════════════════════════════════════════════════════════════

const SECTOR_ETF_MAP: Record<string, string[]> = {
  // Technology
  'technology': ['XLK', 'VGT', 'QQQ'],
  'electronic computers': ['XLK', 'VGT', 'QQQ'],
  'semiconductors': ['SMH', 'SOXX', 'XLK'],
  'semiconductors & related devices': ['SMH', 'SOXX', 'XLK'],
  'software': ['IGV', 'XLK', 'QQQ'],
  // Automotive / Consumer Discretionary
  'automobiles': ['XLY', 'CARZ', 'VCR'],
  'motor vehicles & passenger car bodies': ['XLY', 'CARZ', 'VCR'],
  'consumer discretionary': ['XLY', 'VCR'],
  // Healthcare
  'healthcare': ['XLV', 'VHT', 'IBB'],
  'pharmaceuticals': ['XLV', 'XBI', 'IBB'],
  'biotechnology': ['XBI', 'IBB', 'XLV'],
  // Financials
  'financials': ['XLF', 'VFH', 'KBE'],
  'banks': ['XLF', 'KBE', 'KRE'],
  'insurance': ['XLF', 'KIE'],
  // Energy
  'energy': ['XLE', 'VDE', 'OIH'],
  'oil & gas': ['XLE', 'OIH', 'XOP'],
  // Industrials
  'industrials': ['XLI', 'VIS'],
  'aerospace': ['XLI', 'ITA', 'PPA'],
  // Consumer Staples
  'consumer staples': ['XLP', 'VDC'],
  'food': ['XLP', 'VDC'],
  'beverages': ['XLP', 'VDC'],
  // Materials
  'materials': ['XLB', 'VAW'],
  'chemicals': ['XLB', 'VAW'],
  // Utilities
  'utilities': ['XLU', 'VPU'],
  // Real Estate
  'real estate': ['XLRE', 'VNQ', 'IYR'],
  // Communication
  'communication services': ['XLC', 'VOX'],
  'media': ['XLC', 'VOX'],
  // Retail
  'retail': ['XRT', 'XLY'],
};

function getSectorETFs(sector: string | null, industry: string | null): string[] {
  if (!sector && !industry) return [];
  
  const sectorLower = (sector || '').toLowerCase();
  const industryLower = (industry || '').toLowerCase();
  
  // Check industry first (more specific)
  if (industryLower && SECTOR_ETF_MAP[industryLower]) {
    return SECTOR_ETF_MAP[industryLower];
  }
  
  // Check sector
  if (sectorLower && SECTOR_ETF_MAP[sectorLower]) {
    return SECTOR_ETF_MAP[sectorLower];
  }
  
  // Fuzzy match - check if any key is contained in sector/industry
  for (const [key, etfs] of Object.entries(SECTOR_ETF_MAP)) {
    if (sectorLower.includes(key) || industryLower.includes(key) || 
        key.includes(sectorLower) || key.includes(industryLower)) {
      return etfs;
    }
  }
  
  return ['SPY']; // Default to S&P 500
}

// ═══════════════════════════════════════════════════════════════
// SECTOR ETF BADGES COMPONENT
// ═══════════════════════════════════════════════════════════════

interface SectorETFsProps {
  sector: string | null;
  industry: string | null;
}

const SectorETFs: React.FC<SectorETFsProps> = ({ sector, industry }) => {
  const etfs = getSectorETFs(sector, industry);
  
  if (etfs.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-[10px] text-zinc-600 mr-1">Sector ETFs:</span>
      {etfs.map((etf) => (
        <span
          key={etf}
          className="px-2 py-0.5 rounded border border-[#C9A646]/40 bg-[#C9A646]/5 
                     text-[10px] font-medium text-[#C9A646] hover:bg-[#C9A646]/10 
                     cursor-pointer transition-colors"
          title={`View ${etf}`}
        >
          {etf}
        </span>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ANALYST SENTIMENT COMPONENT
// ═══════════════════════════════════════════════════════════════

interface AnalystSentimentProps {
  rating: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    total: number;
    consensus: string;
  } | null;
  priceTarget: {
    targetHigh: number;
    targetLow: number;
    targetMean: number;
    currentPrice: number;
    upsidePercent: number;
    numberOfAnalysts?: number;
  } | null;
}

const AnalystSentiment: React.FC<AnalystSentimentProps> = ({ rating, priceTarget }) => {
  if (!rating && !priceTarget) {
    return (
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            Analyst Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No analyst data available</p>
        </CardContent>
      </Card>
    );
  }

  const totalAnalysts = rating?.total || 0;
  const buyPercent = totalAnalysts > 0 ? ((rating!.strongBuy + rating!.buy) / totalAnalysts) * 100 : 0;
  const holdPercent = totalAnalysts > 0 ? (rating!.hold / totalAnalysts) * 100 : 0;
  const sellPercent = totalAnalysts > 0 ? ((rating!.sell + rating!.strongSell) / totalAnalysts) * 100 : 0;

  const getConsensusColor = (consensus: string) => {
    if (consensus.toLowerCase().includes('strong buy')) return 'text-emerald-400';
    if (consensus.toLowerCase().includes('buy')) return 'text-emerald-400';
    if (consensus.toLowerCase().includes('hold')) return 'text-yellow-400';
    if (consensus.toLowerCase().includes('sell')) return 'text-red-400';
    return 'text-zinc-400';
  };

  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-[#C9A646]" />
          Analyst Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rating && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Consensus</span>
            <span className={cn("text-sm font-semibold", getConsensusColor(rating.consensus))}>
              {rating.consensus}
            </span>
          </div>
        )}

        {rating && totalAnalysts > 0 && (
          <div className="space-y-3">
            <div className="h-2 rounded-full overflow-hidden flex bg-zinc-800">
              <div 
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${buyPercent}%` }}
              />
              <div 
                className="bg-yellow-500 transition-all duration-500"
                style={{ width: `${holdPercent}%` }}
              />
              <div 
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${sellPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-emerald-400 font-semibold text-lg">
                  {rating.strongBuy + rating.buy}
                </div>
                <div className="text-xs text-zinc-500">Buy</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {rating.strongBuy > 0 && `${rating.strongBuy} Strong`}
                  {rating.strongBuy > 0 && rating.buy > 0 && ' · '}
                  {rating.buy > 0 && `${rating.buy} Buy`}
                </div>
              </div>
              
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-yellow-400 font-semibold text-lg">
                  {rating.hold}
                </div>
                <div className="text-xs text-zinc-500">Hold</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {((rating.hold / totalAnalysts) * 100).toFixed(0)}%
                </div>
              </div>
              
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-red-400 font-semibold text-lg">
                  {rating.sell + rating.strongSell}
                </div>
                <div className="text-xs text-zinc-500">Sell</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {rating.sell > 0 && `${rating.sell} Sell`}
                  {rating.sell > 0 && rating.strongSell > 0 && ' · '}
                  {rating.strongSell > 0 && `${rating.strongSell} Strong`}
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-zinc-600">
              Based on {totalAnalysts} analyst{totalAnalysts !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {priceTarget && (
          <div className="pt-3 border-t border-zinc-800/60 space-y-3">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Price Target
            </div>
            
            <div className="relative h-8 rounded-lg bg-zinc-800/50 overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-[#C9A646]/30 to-[#C9A646]/10 rounded"
                style={{
                  left: `${Math.max(0, ((priceTarget.targetLow - priceTarget.targetLow * 0.8) / (priceTarget.targetHigh * 1.2 - priceTarget.targetLow * 0.8)) * 100)}%`,
                  right: `${Math.max(0, 100 - ((priceTarget.targetHigh - priceTarget.targetLow * 0.8) / (priceTarget.targetHigh * 1.2 - priceTarget.targetLow * 0.8)) * 100)}%`,
                }}
              />
              
              {priceTarget.currentPrice > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((priceTarget.currentPrice - priceTarget.targetLow * 0.8) / (priceTarget.targetHigh * 1.2 - priceTarget.targetLow * 0.8)) * 100))}%`,
                  }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white whitespace-nowrap">
                    Current
                  </div>
                </div>
              )}
              
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[#C9A646]"
                style={{
                  left: `${Math.min(100, Math.max(0, ((priceTarget.targetMean - priceTarget.targetLow * 0.8) / (priceTarget.targetHigh * 1.2 - priceTarget.targetLow * 0.8)) * 100))}%`,
                }}
              >
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-[#C9A646] whitespace-nowrap">
                  Avg Target
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mt-6">
              <div>
                <div className="text-xs text-zinc-500">Low</div>
                <div className="text-sm font-medium text-zinc-300">
                  ${formatNumber(priceTarget.targetLow, 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Average</div>
                <div className="text-sm font-semibold text-[#C9A646]">
                  ${formatNumber(priceTarget.targetMean, 0)}
                </div>
                {priceTarget.upsidePercent !== 0 && (
                  <div className={cn(
                    "text-xs flex items-center justify-center gap-0.5",
                    priceTarget.upsidePercent > 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {priceTarget.upsidePercent > 0 ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {Math.abs(priceTarget.upsidePercent).toFixed(1)}%
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-zinc-500">High</div>
                <div className="text-sm font-medium text-zinc-300">
                  ${formatNumber(priceTarget.targetHigh, 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════
// 52 WEEK RANGE COMPONENT - WITH DIAMOND
// ═══════════════════════════════════════════════════════════════

interface WeekRangeProps {
  low: number;
  high: number;
  current: number;
}

const WeekRange52: React.FC<WeekRangeProps> = ({ low, high, current }) => {
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>52W Range</span>
      </div>
      <div className="relative h-2 rounded-full bg-zinc-800">
        <div 
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#C9A646]/30 to-[#C9A646]/60"
          style={{ width: `${Math.min(100, Math.max(0, position))}%` }}
        />
        
        <div 
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `calc(${Math.min(100, Math.max(0, position))}% - 6px)` }}
        >
          <div 
            className="w-3 h-3 bg-[#C9A646] rotate-45 shadow-lg shadow-[#C9A646]/50"
            style={{ 
              boxShadow: '0 0 8px rgba(201,166,70,0.6), 0 0 16px rgba(201,166,70,0.3)'
            }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">${formatNumber(low, 2)}</span>
        <span className="text-[#C9A646] font-medium">${formatNumber(current, 2)}</span>
        <span className="text-zinc-400">${formatNumber(high, 2)}</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPANY OVERVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════

interface CompanyOverviewProps {
  profile: {
    name: string;
    description: string | null;
    sector: string | null;
    industry: string | null;
    country: string;
    exchange: string;
    website: string | null;
    logo?: string | null;
    employees?: number | null;
    ceo?: string | null;
  } | null;
  symbol: string;
}

const CompanyOverview: React.FC<CompanyOverviewProps> = ({ profile, symbol }) => {
  return (
    <Card className="bg-zinc-900/40 border-zinc-800/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#C9A646]" />
          Company Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.description ? (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-6">
            {profile.description}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 italic">
            No description available
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/60">
          <div>
            <span className="text-xs text-zinc-600">Country</span>
            <p className="text-sm text-zinc-300">{profile?.country || "US"}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">Exchange</span>
            <p className="text-sm text-zinc-300">{profile?.exchange || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">Employees</span>
            <p className="text-sm text-zinc-300">
              {profile?.employees?.toLocaleString() || "—"}
            </p>
          </div>
          {profile?.ceo && (
            <div>
              <span className="text-xs text-zinc-600">CEO</span>
              <p className="text-sm text-zinc-300">{profile.ceo}</p>
            </div>
          )}
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
};

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const LAST_SYMBOL_KEY = 'finotaur.summary.lastSymbol';
const DEFAULT_SYMBOL = 'AAPL';

function getLastViewedSymbol(): string {
  try {
    return localStorage.getItem(LAST_SYMBOL_KEY) || DEFAULT_SYMBOL;
  } catch {
    return DEFAULT_SYMBOL;
  }
}

function saveLastViewedSymbol(symbol: string): void {
  try {
    localStorage.setItem(LAST_SYMBOL_KEY, symbol.toUpperCase());
  } catch {
    // Ignore localStorage errors
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AllMarketsSummary() {
  
  const symbol = useMemo(() => {
    const urlSymbol = getQueryParam("symbol")?.toUpperCase();
    
    if (urlSymbol) {
      saveLastViewedSymbol(urlSymbol);
      return urlSymbol;
    }
    
    const lastSymbol = getLastViewedSymbol();
    
    if (lastSymbol && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("symbol", lastSymbol);
      window.history.replaceState({}, "", url.toString());
    }
    
    return lastSymbol;
  }, []);

  const initialTab = useMemo<TabKey>(() => {
    const t = (getQueryParam("tab") || "overview").toLowerCase();
    return (["overview", "fundamentals", "financials", "news"].includes(t)
      ? t
      : "overview") as TabKey;
  }, []);

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING - OPTIMIZED v3.4.0
  // Now uses correct API paths and includes financials
  // ═══════════════════════════════════════════════════════════════
  const { 
    data: stockData,
    quote,
    profile,
    analystRating,
    priceTarget,
    financials,
    loading, 
    error, 
    cacheAge, 
    isCached, 
    refresh 
  } = useStockSummary(symbol);

  const f: any = useFundamentals(symbol || "AAPL", "TTM", 10);
  const fundamentalsData = f?.data;
  const fundamentalsError = f?.error;
  const fundamentalsLoading = f?.isLoading ?? f?.loading ?? false;

  useEffect(() => {
    if (symbol) {
      saveLastViewedSymbol(symbol);
    }
  }, [symbol]);

  useEffect(() => {
    setQueryParam({ tab, symbol: symbol || undefined });
  }, [tab, symbol]);

  const onTabClick = useCallback((key: TabKey) => setTab(key), []);

  const isPositive = (quote?.change || 0) >= 0;
  const companyName = profile?.name || symbol || "Company";
  const sector = profile?.sector || "—";
  const industry = profile?.industry || "—";

  return (
    <div className="min-h-screen pb-12">
      {/* Inject keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          HEADER SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <div className="border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 to-transparent pb-6 mb-6">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mb-4">
          {cacheAge !== null && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isCached ? formatCacheAge(cacheAge) : 'Live'}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800/50"
            title="Refresh data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsWatchlisted(!isWatchlisted)}
            className={cn(
              "hover:bg-zinc-800/50",
              isWatchlisted ? "text-[#C9A646]" : "text-zinc-500"
            )}
          >
            {isWatchlisted ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHasAlert(!hasAlert)}
            className={cn(
              "hover:bg-zinc-800/50",
              hasAlert ? "text-[#C9A646]" : "text-zinc-500"
            )}
          >
            {hasAlert ? <Bell className="w-4 h-4 fill-current" /> : <BellOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-white hover:bg-zinc-800/50"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {loading && !quote ? (
          <HeaderSkeleton />
        ) : (
          <>
            {/* Main Header Row - Company Left, Price Right */}
            <div className="flex items-start justify-between gap-6 mb-5">
              {/* Left: Company Info */}
              <div className="flex items-start gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold
                             bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 shadow-lg overflow-hidden"
                >
                  {profile?.logo ? (
                    <img src={profile.logo} alt={symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="bg-gradient-to-br from-[#C9A646] to-[#8B7355] bg-clip-text text-transparent">
                      {symbol?.slice(0, 2) || "??"}
                    </span>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {symbol || "—"}
                    </h1>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {profile?.exchange || "NASDAQ"}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">{companyName}</p>
                  
                  {(sector !== "—" || industry !== "—") && (
                    <p className="text-zinc-500 text-xs mt-1">
                      {sector !== "—" ? sector : ""} 
                      {sector !== "—" && industry !== "—" && sector !== industry ? ` • ${industry}` : ""}
                    </p>
                  )}
                  
                  <SectorETFs sector={sector !== "—" ? sector : null} industry={industry !== "—" ? industry : null} />
                </div>
              </div>

              {/* Right: Price & Stats */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-baseline justify-end gap-3 mb-1">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    ${formatNumber(quote?.price)}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-semibold",
                    isPositive 
                      ? "bg-emerald-500/15 text-emerald-400" 
                      : "bg-red-500/15 text-red-400"
                  )}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isPositive ? "+" : ""}{formatNumber(quote?.change)}</span>
                    <span className="text-xs opacity-80">
                      ({isPositive ? "+" : ""}{formatNumber(quote?.changePercent)}%)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 mb-3">
                  As of {quote?.timestamp ? new Date(quote.timestamp).toLocaleTimeString() : 'market close'} • USD
                </p>
                
                <div className="flex gap-5 justify-end text-sm">
                  <div>
                    <span className="text-zinc-600 text-xs block">Market Cap</span>
                    <p className="text-zinc-300 font-medium">{formatLargeNumber(quote?.marketCap)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-xs block">Volume</span>
                    <p className="text-zinc-300 font-medium">{formatVolume(quote?.volume)}</p>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-zinc-600 text-xs block">P/E Ratio</span>
                    <p className="text-zinc-300 font-medium">{formatNumber(quote?.pe, 1)}</p>
                  </div>
                  <div className="hidden md:block">
                    <span className="text-zinc-600 text-xs block">Beta</span>
                    <p className="text-zinc-300 font-medium">{formatNumber(quote?.beta, 2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TABS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800/60 pb-px">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => onTabClick(key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
                active ? "text-[#C9A646]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("w-4 h-4 transition-colors", active ? "text-[#C9A646]" : "text-zinc-600")} />
              {label}
              {active && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#C9A646]"
                  style={{ animation: "fadeSlideUp 0.2s ease-out", boxShadow: "0 0 8px rgba(201,166,70,0.5)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4">
            <p className="text-red-400 text-sm">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* === OVERVIEW === */}
        {tab === "overview" && (
          <div className="space-y-6" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            {/* KPI Grid - Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KPICard
                label="Open"
                value={`$${formatNumber(quote?.open)}`}
                icon={Activity}
                delay={0}
              />
              <KPICard
                label="Prev Close"
                value={`$${formatNumber(quote?.previousClose)}`}
                icon={Calendar}
                delay={50}
              />
              <KPICard
                label="Day High"
                value={`$${formatNumber(quote?.high)}`}
                icon={TrendingUp}
                delay={100}
              />
              <KPICard
                label="Day Low"
                value={`$${formatNumber(quote?.low)}`}
                icon={TrendingDown}
                delay={150}
              />
              <KPICard
                label="EPS (TTM)"
                value={quote?.eps ? `$${formatNumber(quote.eps)}` : "—"}
                icon={DollarSign}
                delay={200}
              />
              <KPICard
                label="Dividend Yield"
                value={quote?.dividendYield ? `${formatNumber(quote.dividendYield)}%` : "—"}
                icon={PieChart}
                delay={250}
              />
            </div>

            {/* 52 Week Range */}
            {quote?.high52w && quote?.low52w && quote?.price && (
              <Card className="bg-zinc-900/40 border-zinc-800/80">
                <CardContent className="py-4">
                  <WeekRange52 
                    low={quote.low52w} 
                    high={quote.high52w} 
                    current={quote.price} 
                  />
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════
                OPTIMIZED: Pass preloaded data to SummaryOverviewEmbed
                This eliminates 3 duplicate API calls!
            ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              {symbol && (
                <SummaryOverviewEmbed 
                  symbol={symbol}
                  preloadedData={{
                    profile: profile,
                    analystRating: analystRating,
                    priceTarget: priceTarget,
                    financials: financials,
                  }}
                />
              )}
            </div>

          </div>
        )}

        {/* === FUNDAMENTALS === */}
        {tab === "fundamentals" && (
          <div className="space-y-6" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            {fundamentalsLoading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => <KPICardSkeleton key={i} />)}
              </div>
            )}
            {fundamentalsError && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="py-4">
                  <p className="text-red-400 text-sm">
                    Error: {fundamentalsError?.message || "Failed to load"}
                  </p>
                </CardContent>
              </Card>
            )}
            {!fundamentalsLoading && !fundamentalsError && !fundamentalsData && (
              <Card className="bg-zinc-900/40 border-zinc-800/80">
                <CardContent className="py-8 text-center">
                  <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No fundamentals data available for {symbol}</p>
                </CardContent>
              </Card>
            )}
            {!fundamentalsLoading && !fundamentalsError && fundamentalsData && (
              <>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[300px] rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">AI Insight</div>
                    <p className="text-zinc-200 text-sm leading-relaxed">
                      {fundamentalsData?.insight ?? "No insight available"}
                    </p>
                  </div>
                  <DCFBox data={fundamentalsData} />
                </div>
                <KPIGrid data={fundamentalsData} />
                <TrendsPanel data={fundamentalsData} />
                <div className="grid md:grid-cols-3 gap-3">
                  <ValuationPanel data={fundamentalsData} />
                  <HealthTable data={fundamentalsData} />
                  <IndustryComparison data={fundamentalsData} />
                </div>
              </>
            )}
          </div>
        )}

        {/* === FINANCIALS === */}
        {tab === "financials" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            <Card className="bg-zinc-900/40 border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-[#C9A646]" />
                  Financial Statements
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-[#C9A646]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Detailed financial statements including Income Statement, Balance Sheet, 
                    and Cash Flow will be available here.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Income Statement", "Balance Sheet", "Cash Flow"].map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-500 border border-zinc-700/50"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* === NEWS === */}
        {tab === "news" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            <Card className="bg-zinc-900/40 border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Newspaper className="w-5 h-5 text-[#C9A646]" />
                  Latest News
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 flex items-center justify-center mx-auto mb-4">
                    <Newspaper className="w-8 h-8 text-[#C9A646]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Real-time news feed and AI-powered summaries for {symbol || "your selected symbol"} 
                    will appear here.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Market News", "Press Releases", "Analysis"].map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-500 border border-zinc-700/50"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}