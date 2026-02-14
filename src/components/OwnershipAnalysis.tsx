// =====================================================
// 📊 OWNERSHIP & FLOW ANALYSIS COMPONENT
// =====================================================
// Comprehensive ownership analysis including:
// - Institutional Ownership
// - Insider Activity (THE GOLD!)
// - Short Interest
// - Options Flow
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Building2, TrendingUp, TrendingDown, AlertTriangle,
  ChevronDown, ChevronUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Activity, Target, Zap, Shield, Eye, BarChart3, Percent,
  Clock, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  OwnershipData, 
  InstitutionalHolder, 
  InsiderTransaction,
  InsiderActivity,
  ShortInterest 
} from '../types/stock.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getSentimentConfig = (sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH') => {
  const configs = {
    BULLISH: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', label: 'Bullish', icon: TrendingUp },
    NEUTRAL: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Neutral', icon: Activity },
    BEARISH: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Bearish', icon: TrendingDown },
  };
  return configs[sentiment];
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

// Section Header
const SectionHeader = ({ 
  icon: Icon, 
  title, 
  subtitle,
  badge,
  badgeColor = '#C9A646'
}: { 
  icon: any; 
  title: string; 
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
}) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ 
          background: 'rgba(201,166,70,0.1)', 
          border: '1px solid rgba(201,166,70,0.2)' 
        }}
      >
        <Icon className="w-5 h-5 text-[#C9A646]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
      </div>
    </div>
    {badge && (
      <span 
        className="px-3 py-1 rounded-full text-xs font-semibold"
        style={{ background: `${badgeColor}20`, color: badgeColor }}
      >
        {badge}
      </span>
    )}
  </div>
);

// Card Container
const Card = ({ 
  children, 
  className,
  highlight = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  highlight?: boolean;
}) => (
  <div 
    className={cn("rounded-2xl overflow-hidden", className)}
    style={{
      background: highlight 
        ? 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(13,11,8,0.95))'
        : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight 
        ? '1px solid rgba(201,166,70,0.3)' 
        : '1px solid rgba(201,166,70,0.15)',
    }}
  >
    {children}
  </div>
);

// Stat Box
const StatBox = ({ 
  label, 
  value, 
  subValue,
  trend,
  size = 'default'
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'default' | 'large';
}) => (
  <div className={cn(
    "p-4 rounded-xl bg-white/[0.03]",
    size === 'large' && "p-5"
  )}>
    <p className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-end gap-2">
      <p className={cn(
        "font-bold text-white",
        size === 'large' ? "text-2xl" : "text-lg"
      )}>
        {value}
      </p>
      {trend && (
        <span className={cn(
          "text-xs font-medium pb-0.5",
          trend === 'up' ? "text-[#22C55E]" : trend === 'down' ? "text-[#EF4444]" : "text-[#8B8B8B]"
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
      )}
    </div>
    {subValue && <p className="text-xs text-[#8B8B8B] mt-1">{subValue}</p>}
  </div>
);

// Progress Bar
const ProgressBar = ({ 
  value, 
  max = 100, 
  color = '#C9A646',
  showLabel = true 
}: { 
  value: number; 
  max?: number; 
  color?: string;
  showLabel?: boolean;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="w-full">
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[#6B6B6B]">0%</span>
          <span className="text-xs text-[#6B6B6B]">{max}%</span>
        </div>
      )}
    </div>
  );
};

// =====================================================
// INSTITUTIONAL OWNERSHIP SECTION
// =====================================================

const InstitutionalOwnershipSection = ({ data }: { data: OwnershipData['institutional'] }) => {
  const [showAllHolders, setShowAllHolders] = useState(false);
  const displayedHolders = showAllHolders ? data.top10Holders : data.top10Holders.slice(0, 5);

  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={Building2} 
          title="Institutional Ownership"
          subtitle={`${data.totalInstitutions} institutions holding`}
          badge={data.netBuying ? "Net Buying" : "Net Selling"}
          badgeColor={data.netBuying ? "#22C55E" : "#EF4444"}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox 
            label="Total Institutional" 
            value={`${data.totalPercent.toFixed(1)}%`}
            subValue="of shares outstanding"
          />
          <StatBox 
            label="Quarterly Change" 
            value={`${data.quarterlyChange >= 0 ? '+' : ''}${data.quarterlyChange.toFixed(2)}%`}
            trend={data.quarterlyChange > 0 ? 'up' : data.quarterlyChange < 0 ? 'down' : 'neutral'}
          />
          <StatBox 
            label="Top 10 Hold" 
            value={`${data.top10Concentration.toFixed(1)}%`}
            subValue="concentration risk"
          />
          <StatBox 
            label="Institutions" 
            value={data.totalInstitutions}
            trend={data.institutionsTrend === 'INCREASING' ? 'up' : data.institutionsTrend === 'DECREASING' ? 'down' : 'neutral'}
          />
        </div>

        {/* Ownership Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#8B8B8B]">Institutional Ownership</span>
            <span className="text-sm font-semibold text-[#C9A646]">{data.totalPercent.toFixed(1)}%</span>
          </div>
          <ProgressBar value={data.totalPercent} color="#C9A646" showLabel={false} />
        </div>

        {/* Top Holders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#C9A646]/10">
                <th className="text-left py-3 px-2 text-xs font-medium text-[#6B6B6B]">Institution</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Shares</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">% Owned</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Value</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">QoQ Change</th>
              </tr>
            </thead>
            <tbody>
              {displayedHolders.map((holder, idx) => (
                <motion.tr 
                  key={holder.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {holder.isNotable && (
                        <span className="w-2 h-2 rounded-full bg-[#C9A646]" title="Notable investor" />
                      )}
                      <span className="text-sm text-white font-medium truncate max-w-[200px]">
                        {holder.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-[#8B8B8B]">
                    {formatNumber(holder.shares)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-white font-medium">
                    {holder.percentOfCompany.toFixed(2)}%
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-[#8B8B8B]">
                    {formatCurrency(holder.value)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={cn(
                      "text-sm font-medium",
                      holder.changeQoQ > 0 ? "text-[#22C55E]" : holder.changeQoQ < 0 ? "text-[#EF4444]" : "text-[#8B8B8B]"
                    )}>
                      {holder.changeQoQ > 0 ? '+' : ''}{holder.changeQoQ.toFixed(1)}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.top10Holders.length > 5 && (
          <button
            onClick={() => setShowAllHolders(!showAllHolders)}
            className="w-full mt-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center justify-center gap-2 text-sm text-[#8B8B8B] hover:text-white"
          >
            {showAllHolders ? (
              <>Show Less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Show All {data.top10Holders.length} Holders <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        )}
      </div>
    </Card>
  );
};

// =====================================================
// INSIDER ACTIVITY SECTION (THE GOLD!)
// =====================================================

const InsiderActivitySection = ({ data }: { data: InsiderActivity }) => {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const displayedTransactions = showAllTransactions 
    ? data.recentTransactions 
    : data.recentTransactions.slice(0, 5);
  
  const sentimentConfig = getSentimentConfig(data.sentiment);
  const SentimentIcon = sentimentConfig.icon;

  return (
    <Card highlight>
      <div className="p-6">
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#F4D97B] to-transparent" />
        
        <SectionHeader 
          icon={Users} 
          title="Insider Activity"
          subtitle="Last 90 days • THE GOLD!"
          badge={sentimentConfig.label}
          badgeColor={sentimentConfig.color}
        />

        {/* Cluster Buying Alert */}
        {data.clusterBuying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ 
              background: 'rgba(34,197,94,0.1)', 
              border: '1px solid rgba(34,197,94,0.3)' 
            }}
          >
            <Zap className="h-5 w-5 text-[#22C55E]" />
            <div>
              <p className="text-sm font-semibold text-[#22C55E]">🔥 Cluster Buying Detected!</p>
              <p className="text-xs text-[#22C55E]/70">Multiple insiders buying simultaneously - strong bullish signal</p>
            </div>
          </motion.div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-[#22C55E]" />
              <span className="text-xs text-[#22C55E]">Total Buys</span>
            </div>
            <p className="text-xl font-bold text-[#22C55E]">{formatCurrency(data.last90Days.totalBuyValue)}</p>
            <p className="text-xs text-[#22C55E]/70">{data.last90Days.buyerCount} insiders</p>
          </div>

          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-4 w-4 text-[#EF4444]" />
              <span className="text-xs text-[#EF4444]">Total Sells</span>
            </div>
            <p className="text-xl font-bold text-[#EF4444]">{formatCurrency(data.last90Days.totalSellValue)}</p>
            <p className="text-xs text-[#EF4444]/70">{data.last90Days.sellerCount} insiders</p>
          </div>

          <div className={cn(
            "p-4 rounded-xl border",
            data.last90Days.netValue >= 0 
              ? "bg-[#22C55E]/10 border-[#22C55E]/20" 
              : "bg-[#EF4444]/10 border-[#EF4444]/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className={cn("h-4 w-4", data.last90Days.netValue >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")} />
              <span className={cn("text-xs", data.last90Days.netValue >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>Net Activity</span>
            </div>
            <p className={cn("text-xl font-bold", data.last90Days.netValue >= 0 ? "text-[#22C55E]" : "text-[#EF4444]")}>
              {data.last90Days.netValue >= 0 ? '+' : ''}{formatCurrency(data.last90Days.netValue)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-[#C9A646]" />
              <span className="text-xs text-[#8B8B8B]">Insider Ownership</span>
            </div>
            <p className="text-xl font-bold text-white">{data.insiderOwnershipPercent.toFixed(2)}%</p>
          </div>
        </div>

        {/* Sentiment Indicator */}
        <div 
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: sentimentConfig.bg, border: `1px solid ${sentimentConfig.color}30` }}
        >
          <div className="flex items-center gap-3">
            <SentimentIcon className="h-6 w-6" style={{ color: sentimentConfig.color }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: sentimentConfig.color }}>
                Insider Sentiment: {sentimentConfig.label}
              </p>
              <p className="text-xs text-[#8B8B8B]">Based on transaction volume and patterns</p>
            </div>
          </div>
          <div 
            className="text-3xl font-bold"
            style={{ color: sentimentConfig.color }}
          >
            {data.sentiment === 'BULLISH' ? '🐂' : data.sentiment === 'BEARISH' ? '🐻' : '⚖️'}
          </div>
        </div>

        {/* Recent Transactions */}
        <h4 className="text-sm font-semibold text-white mb-4">Notable Transactions</h4>
        <div className="space-y-3">
          {displayedTransactions.map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-4 rounded-xl border transition-all hover:scale-[1.01]",
                tx.transactionType === 'BUY' 
                  ? "bg-[#22C55E]/5 border-[#22C55E]/20 hover:border-[#22C55E]/40"
                  : tx.transactionType === 'SELL'
                  ? "bg-[#EF4444]/5 border-[#EF4444]/20 hover:border-[#EF4444]/40"
                  : "bg-white/[0.02] border-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tx.transactionType === 'BUY' 
                      ? "bg-[#22C55E]/20"
                      : tx.transactionType === 'SELL'
                      ? "bg-[#EF4444]/20"
                      : "bg-[#8B8B8B]/20"
                  )}>
                    {tx.transactionType === 'BUY' ? (
                      <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />
                    ) : tx.transactionType === 'SELL' ? (
                      <ArrowDownRight className="h-5 w-5 text-[#EF4444]" />
                    ) : (
                      <Activity className="h-5 w-5 text-[#8B8B8B]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.name}</p>
                    <p className="text-xs text-[#6B6B6B]">{tx.title}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    tx.transactionType === 'BUY' ? "text-[#22C55E]" : 
                    tx.transactionType === 'SELL' ? "text-[#EF4444]" : "text-white"
                  )}>
                    {tx.transactionType === 'BUY' ? '+' : '-'}{formatCurrency(tx.value)}
                  </p>
                  <p className="text-xs text-[#6B6B6B]">
                    {formatNumber(tx.shares)} shares @ ${tx.price.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-xs text-[#6B6B6B]">{formatDate(tx.date)}</span>
                <span className="text-xs text-[#8B8B8B]">
                  Now owns: {formatNumber(tx.sharesOwned)} shares
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {data.recentTransactions.length > 5 && (
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="w-full mt-4 py-3 rounded-xl bg-[#C9A646]/10 hover:bg-[#C9A646]/20 border border-[#C9A646]/20 transition-colors flex items-center justify-center gap-2 text-sm text-[#C9A646]"
          >
            {showAllTransactions ? (
              <>Show Less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>View All Transactions <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        )}
      </div>
    </Card>
  );
};

// =====================================================
// SHORT INTEREST SECTION
// =====================================================

const ShortInterestSection = ({ data }: { data: ShortInterest }) => {
  const squeezeConfig = {
    HIGH: { color: '#EF4444', label: 'High Squeeze Potential', icon: AlertTriangle },
    MEDIUM: { color: '#F59E0B', label: 'Medium Squeeze Potential', icon: AlertCircle },
    LOW: { color: '#22C55E', label: 'Low Squeeze Potential', icon: CheckCircle },
  };
  
  const config = squeezeConfig[data.squeezePotential];
  const SqueezeIcon = config.icon;

  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={BarChart3} 
          title="Short Interest"
          subtitle={`${data.shortRatio.toFixed(1)} days to cover`}
          badge={`${data.shortPercent.toFixed(1)}% of Float`}
          badgeColor={data.shortPercent > 15 ? "#EF4444" : data.shortPercent > 5 ? "#F59E0B" : "#22C55E"}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox 
            label="Shares Short" 
            value={formatNumber(data.sharesShort)}
          />
          <StatBox 
            label="Short % of Float" 
            value={`${data.shortPercent.toFixed(2)}%`}
            subValue={`prev: ${data.previousShortPercent.toFixed(2)}%`}
            trend={data.shortTrend === 'INCREASING' ? 'up' : data.shortTrend === 'DECREASING' ? 'down' : 'neutral'}
          />
          <StatBox 
            label="Days to Cover" 
            value={data.shortRatio.toFixed(1)}
            subValue="based on avg volume"
          />
          {data.costToBorrow && (
            <StatBox 
              label="Cost to Borrow" 
              value={`${data.costToBorrow.toFixed(1)}%`}
              subValue="annual rate"
            />
          )}
        </div>

        {/* Short Interest Visual */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#8B8B8B]">Short Interest Level</span>
            <span className={cn(
              "text-sm font-semibold",
              data.shortPercent > 15 ? "text-[#EF4444]" : data.shortPercent > 5 ? "text-[#F59E0B]" : "text-[#22C55E]"
            )}>
              {data.shortPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, #22C55E 0%, #22C55E 5%, #F59E0B 5%, #F59E0B 15%, #EF4444 15%, #EF4444 100%)',
              }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#C9A646] shadow-lg"
              initial={{ left: 0 }}
              animate={{ left: `calc(${Math.min(data.shortPercent, 30) / 30 * 100}% - 8px)` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-[#6B6B6B]">
            <span>0%</span>
            <span>5%</span>
            <span>15%</span>
            <span>30%+</span>
          </div>
        </div>

        {/* Squeeze Potential */}
        <div 
          className="p-4 rounded-xl flex items-center gap-4"
          style={{ background: `${config.color}10`, border: `1px solid ${config.color}30` }}
        >
          <SqueezeIcon className="h-6 w-6" style={{ color: config.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: config.color }}>{config.label}</p>
            <p className="text-xs text-[#8B8B8B]">
              Based on short interest, days to cover, and recent trend
            </p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
          <span className="text-sm text-[#8B8B8B]">Short Interest Trend</span>
          <div className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
            data.shortTrend === 'INCREASING' 
              ? "bg-[#EF4444]/10 text-[#EF4444]"
              : data.shortTrend === 'DECREASING'
              ? "bg-[#22C55E]/10 text-[#22C55E]"
              : "bg-[#8B8B8B]/10 text-[#8B8B8B]"
          )}>
            {data.shortTrend === 'INCREASING' ? (
              <><TrendingUp className="h-4 w-4" /> Increasing</>
            ) : data.shortTrend === 'DECREASING' ? (
              <><TrendingDown className="h-4 w-4" /> Decreasing</>
            ) : (
              <><Activity className="h-4 w-4" /> Stable</>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// =====================================================
// OPTIONS FLOW SECTION
// =====================================================

const OptionsFlowSection = ({ data }: { data: NonNullable<OwnershipData['optionsFlow']> }) => {
  const putCallSentiment = data.putCallRatio < 0.7 ? 'BULLISH' : data.putCallRatio > 1.3 ? 'BEARISH' : 'NEUTRAL';
  const sentimentConfig = getSentimentConfig(putCallSentiment);

  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={Activity} 
          title="Options Flow"
          subtitle="Unusual activity detection"
          badge={data.unusualActivity ? "🔥 Unusual Activity" : "Normal"}
          badgeColor={data.unusualActivity ? "#F59E0B" : "#8B8B8B"}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox 
            label="Put/Call Ratio" 
            value={data.putCallRatio.toFixed(2)}
            subValue={putCallSentiment.toLowerCase()}
          />
          <StatBox 
            label="Max Pain" 
            value={`$${data.maxPain.toFixed(2)}`}
          />
          <StatBox 
            label="Implied Volatility" 
            value={`${data.impliedVolatility.toFixed(1)}%`}
          />
          <StatBox 
            label="IV Percentile" 
            value={`${data.ivPercentile}%`}
            subValue="vs 52 week"
          />
        </div>

        {/* Large Bets */}
        {data.largeBets.length > 0 && (
          <>
            <h4 className="text-sm font-semibold text-white mb-3">Large Unusual Bets</h4>
            <div className="space-y-2">
              {data.largeBets.map((bet, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg flex items-center justify-between",
                    bet.sentiment === 'BULLISH' 
                      ? "bg-[#22C55E]/10 border border-[#22C55E]/20"
                      : "bg-[#EF4444]/10 border border-[#EF4444]/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      bet.type === 'CALL' ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#EF4444]/20 text-[#EF4444]"
                    )}>
                      {bet.type}
                    </span>
                    <span className="text-sm text-white">${bet.strike} strike</span>
                    <span className="text-xs text-[#6B6B6B]">exp {formatDate(bet.expiry)}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#C9A646]">{formatCurrency(bet.premium)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

interface OwnershipAnalysisProps {
  data: OwnershipData;
  ticker: string;
  className?: string;
}

export function OwnershipAnalysis({ data, ticker, className }: OwnershipAnalysisProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-2">
        <Eye className="h-6 w-6 text-[#C9A646]" />
        <h2 className="text-xl font-bold text-white">Ownership & Flow Analysis</h2>
        <span className="text-sm text-[#6B6B6B]">for {ticker}</span>
      </div>

      {/* Insider Activity - THE GOLD (highlighted) */}
      <InsiderActivitySection data={data.insider} />

      {/* Two Column Layout for Institutional & Short */}
      <div className="grid lg:grid-cols-2 gap-6">
        <InstitutionalOwnershipSection data={data.institutional} />
        <ShortInterestSection data={data.shortInterest} />
      </div>

      {/* Options Flow (if available) */}
      {data.optionsFlow && <OptionsFlowSection data={data.optionsFlow} />}
    </motion.div>
  );
}

export default OwnershipAnalysis;
