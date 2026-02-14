// =====================================================
// 🏛️ SECTOR HEADER - Premium Sector Analysis Header
// src/components/SectorAnalyzer/tabs/SectorHeader.tsx
// =====================================================
// ARCHITECTURE: Designed for 10K users with 4x daily data refresh
// Data is fetched server-side on schedule and cached in Redis/CDN
// All users read from the same pre-computed cache - ZERO per-user API calls
// =====================================================

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  ArrowUpRight, ArrowDownRight, Award
} from 'lucide-react';
import type { Sector, SentimentType, SubSector } from '../types';
import { cn, formatPercent, getSentimentColor, colors } from '../utils';
import { getSectorIcon } from '../cards/SectorCard';

// =====================================================
// 📡 CACHING LAYER - Cost Optimization Architecture
// =====================================================
// 
// DATA REFRESH SCHEDULE (4x daily, US Eastern):
//   1. 08:30 AM - Pre-market   (1hr before open)
//   2. 10:30 AM - Mid-morning  (1hr into trading)
//   3. 12:00 PM - Midday       (noon snapshot)
//   4. 04:30 PM - Post-close   (after market close)
//
// COST OPTIMIZATION STRATEGY:
// ┌─────────────────────────────────────────────────┐
// │  Cron Job (4x/day)                              │
// │  ├── Fetch price data (Free APIs: Yahoo/Alpha)  │
// │  ├── Compute all derived metrics                │
// │  ├── Generate AI commentary (1 call per sector) │
// │  ├── Store in Redis + CDN edge cache            │
// │  └── Invalidate stale cache                     │
// ├─────────────────────────────────────────────────┤
// │  10,000 Users                                   │
// │  ├── Read from CDN edge (0 API calls)           │
// │  ├── SWR/React Query with staleTime: 15min      │
// │  ├── SSR pre-rendered pages (Vercel ISR)        │
// │  └── WebSocket for live price overlay (optional)│
// └─────────────────────────────────────────────────┘
//
// COST BREAKDOWN (Monthly):
//   API calls:  4 refreshes × 11 sectors × 30 days = 1,320 calls
//   AI tokens:  ~1,000 tokens × 1,320 = ~1.3M tokens (~$4/month)
//   Redis:      ~$15/month (small instance)
//   CDN:        Included with Vercel/Cloudflare
//   Total:      ~$20/month for 10,000 users
//

// Types for cached data structure
interface CachedSectorData {
  sector: Sector;
  lastUpdated: string;          // ISO timestamp
  nextUpdate: string;           // ISO timestamp  
  updateSchedule: UpdateSlot;   // Which slot this was from
  dataFreshness: 'LIVE' | 'DELAYED_15M' | 'CACHED';
}

type UpdateSlot = 'PRE_MARKET' | 'MID_MORNING' | 'MIDDAY' | 'POST_CLOSE';

interface MarketStatus {
  isOpen: boolean;
  currentSlot: UpdateSlot;
  nextSlotTime: string;
  sessionLabel: string;
}

// Determine market status and update schedule
function getMarketStatus(): MarketStatus {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = eastern.getHours();
  const minute = eastern.getMinutes();
  const time = hour * 60 + minute;
  const day = eastern.getDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    return { isOpen: false, currentSlot: 'POST_CLOSE', nextSlotTime: 'Monday 8:30 AM', sessionLabel: 'Weekend' };
  }

  if (time < 510) return { isOpen: false, currentSlot: 'POST_CLOSE', nextSlotTime: '8:30 AM ET', sessionLabel: 'Pre-Market' };
  if (time < 570) return { isOpen: false, currentSlot: 'PRE_MARKET', nextSlotTime: '9:30 AM ET', sessionLabel: 'Pre-Market' };
  if (time < 630) return { isOpen: true, currentSlot: 'MID_MORNING', nextSlotTime: '12:00 PM ET', sessionLabel: 'Morning Session' };
  if (time < 720) return { isOpen: true, currentSlot: 'MID_MORNING', nextSlotTime: '12:00 PM ET', sessionLabel: 'Morning Session' };
  if (time < 960) return { isOpen: true, currentSlot: 'MIDDAY', nextSlotTime: '4:00 PM ET', sessionLabel: 'Afternoon Session' };
  if (time < 990) return { isOpen: true, currentSlot: 'MIDDAY', nextSlotTime: '4:30 PM ET', sessionLabel: 'Closing Session' };

  return { isOpen: false, currentSlot: 'POST_CLOSE', nextSlotTime: 'Tomorrow 8:30 AM ET', sessionLabel: 'After Hours' };
}



// =====================================================
// 🔴 LIVE STATUS INDICATOR
// =====================================================

const LiveIndicator = memo<{ status: MarketStatus }>(({ status }) => (
  <div className="flex items-center gap-2">
    <div className="relative">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          status.isOpen ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'
        )}
      />
      {status.isOpen && (
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#22C55E] animate-ping opacity-75" />
      )}
    </div>
    <span className="text-[11px] font-medium" style={{ color: status.isOpen ? '#22C55E' : '#F59E0B' }}>
      {status.isOpen ? 'Market Open' : status.sessionLabel}
    </span>
  </div>
));
LiveIndicator.displayName = 'LiveIndicator';

// =====================================================
// 📊 52-WEEK RANGE BAR (Premium Style)
// =====================================================

interface RangeBarProps {
  current: number;
  low: number;
  high: number;
  label: string;
}

const RangeBar = memo<RangeBarProps>(({ current, low, high, label }) => {
  const position = ((current - low) / (high - low)) * 100;
  const fromLow = ((current - low) / low) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#6B6B6B] uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-semibold" style={{ color: colors.gold.primary }}>
          {fromLow.toFixed(0)}% from low
        </span>
      </div>
      <div className="relative h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Gradient track */}
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 35%, #84CC16 65%, #22C55E 100%)',
          }}
        />
        {/* Position indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg shadow-black/40"
          style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }}
          initial={{ left: '0%' }}
          animate={{ left: `calc(${Math.min(Math.max(position, 2), 98)}% - 7px)` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-[#8B8B8B]">${low.toFixed(2)}</span>
        <span className="text-[#8B8B8B]">${high.toFixed(2)}</span>
      </div>
    </div>
  );
});
RangeBar.displayName = 'RangeBar';

// =====================================================
// 📈 MINI PERFORMANCE BARS
// =====================================================

interface PerfBarProps {
  label: string;
  value: number;
  maxAbs?: number;
}

const PerfBar = memo<PerfBarProps>(({ label, value, maxAbs = 15 }) => {
  const isPositive = value >= 0;
  const width = Math.min((Math.abs(value) / maxAbs) * 100, 100);
  const barColor = isPositive ? colors.positive : colors.negative;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-medium text-[#6B6B6B] uppercase w-8 text-right shrink-0">{label}</span>
      <div className="flex-1 flex items-center h-5">
        <div className="relative w-full h-[4px] rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {/* Center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          {/* Bar */}
          <motion.div
            className="absolute top-0 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${width / 2}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              background: barColor,
              ...(isPositive
                ? { left: '50%' }
                : { right: '50%' }),
            }}
          />
        </div>
      </div>
      <span
        className="text-[11px] font-bold min-w-[52px] text-right tabular-nums"
        style={{ color: barColor }}
      >
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
});
PerfBar.displayName = 'PerfBar';

// =====================================================
// 🎯 KEY METRICS ROW
// =====================================================

interface MetricChipProps {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  icon?: React.ReactNode;
}

const MetricChip = memo<MetricChipProps>(({ label, value, subtext, color = '#E8DCC4', icon }) => (
  <div
    className="relative flex flex-col items-center justify-center py-3 px-2 rounded-xl min-w-[100px] flex-1 overflow-hidden"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)',
      border: '1px solid rgba(201,166,70,0.06)',
    }}
  >
    {/* Subtle top accent */}
    <div
      className="absolute top-0 left-2 right-2 h-px"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.15), transparent)' }}
    />
    <span className="text-[9px] font-semibold text-[#555] uppercase tracking-[0.1em] mb-1">{label}</span>
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-[15px] font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
    {subtext && <span className="text-[9px] text-[#555] mt-0.5">{subtext}</span>}
  </div>
));
MetricChip.displayName = 'MetricChip';



// =====================================================
// 🎯 SENTIMENT BADGE (Premium)
// =====================================================

const SentimentBadge = memo<{ sentiment: SentimentType }>(({ sentiment }) => {
  const config = {
    bullish: {
      icon: TrendingUp,
      bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
      border: 'rgba(34,197,94,0.25)',
      color: '#22C55E',
      glow: '0 0 20px rgba(34,197,94,0.15)',
    },
    bearish: {
      icon: TrendingDown,
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
      border: 'rgba(239,68,68,0.25)',
      color: '#EF4444',
      glow: '0 0 20px rgba(239,68,68,0.15)',
    },
    neutral: {
      icon: Activity,
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
      border: 'rgba(245,158,11,0.25)',
      color: '#F59E0B',
      glow: '0 0 20px rgba(245,158,11,0.15)',
    },
  };

  const c = config[sentiment];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: c.glow,
      }}
    >
      <Icon className="h-4 w-4" style={{ color: c.color }} />
      <span className="text-sm font-bold capitalize" style={{ color: c.color }}>
        {sentiment}
      </span>
    </motion.div>
  );
});
SentimentBadge.displayName = 'SentimentBadge';

// =====================================================
// 🏛️ MAIN SECTOR HEADER COMPONENT
// =====================================================

interface SectorHeaderProps {
  sector: Sector;
  onBack: () => void;
}

export const SectorHeader = memo<SectorHeaderProps>(({ sector, onBack }) => {
  const Icon = useMemo(() => getSectorIcon(sector.icon), [sector.icon]);
  const marketStatus = useMemo(() => getMarketStatus(), []);

  // Simulated 52-week range (derived from sector data)
  const range52w = useMemo(() => ({
    low: sector.price * (1 - Math.abs(sector.ytdChange) / 100 - 0.15),
    high: sector.price * (1 + Math.abs(sector.ytdChange) / 100 + 0.08),
  }), [sector.price, sector.ytdChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      {/* ====== MAIN CARD ====== */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(20,18,14,0.98) 0%, rgba(14,12,9,0.99) 40%, rgba(10,9,7,1) 100%)',
          border: '1px solid rgba(201,166,70,0.12)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(201,166,70,0.03)',
        }}
      >
        {/* ====== TOP ACCENT LINE ====== */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(201,166,70,0.4) 30%, rgba(244,217,123,0.6) 50%, rgba(201,166,70,0.4) 70%, transparent 95%)',
          }}
        />

        {/* ====== BACKGROUND EFFECTS - Gold Circles ====== */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large gold circle - top right */}
          <div
            className="absolute -top-[120px] -right-[80px] w-[450px] h-[450px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.07) 0%, rgba(201,166,70,0.03) 40%, transparent 70%)' }}
          />
          {/* Medium gold circle - left center */}
          <div
            className="absolute top-[40%] -left-[120px] w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.05) 0%, rgba(201,166,70,0.02) 45%, transparent 70%)' }}
          />
          {/* Small gold circle - bottom right */}
          <div
            className="absolute -bottom-[80px] right-[20%] w-[250px] h-[250px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,166,70,0.06) 0%, rgba(201,166,70,0.025) 40%, transparent 70%)' }}
          />
          {/* Tiny accent circle - top left */}
          <div
            className="absolute top-[15%] left-[10%] w-[150px] h-[150px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(244,217,123,0.04) 0%, transparent 60%)' }}
          />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(201,166,70,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(201,166,70,1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10 p-6 lg:p-8">
          {/* ====== TOP ROW: Status Only ====== */}
          <div className="flex items-center justify-start mb-5">
            <LiveIndicator status={marketStatus} />
          </div>

          {/* ====== CENTERED TITLE (Stock Analyzer style) ====== */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-white">{sector.name} </span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {sector.ticker}
              </span>
            </h1>
            <p className="text-[#8B8B8B] text-base">{sector.description}</p>
          </div>

          {/* ====== PRICE + CHANGE + SENTIMENT ROW ====== */}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
            {/* Price */}
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl lg:text-4xl font-bold text-white tracking-tight tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              ${sector.price.toFixed(2)}
            </motion.div>

            {/* Change badge */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
              style={{
                background: sector.changePercent >= 0
                  ? 'rgba(34,197,94,0.1)'
                  : 'rgba(239,68,68,0.1)',
                border: `1px solid ${sector.changePercent >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {sector.changePercent >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-[#22C55E]" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-[#EF4444]" />
              )}
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: sector.changePercent >= 0 ? '#22C55E' : '#EF4444' }}
              >
                {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
              </span>
            </div>

            {/* Sentiment badge */}
            <SentimentBadge sentiment={sector.sentiment} />
          </div>

          {/* ====== PERFORMANCE BARS (centered) ====== */}
          <div className="flex justify-center mb-6">
            <div className="space-y-1.5 w-full max-w-[320px]">
              <PerfBar label="1W" value={sector.weekChange} />
              <PerfBar label="1M" value={sector.monthChange} />
              <PerfBar label="YTD" value={sector.ytdChange} />
            </div>
          </div>

          {/* ====== METRICS ROW ====== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <MetricChip
                label="Market Cap"
                value={sector.marketCap}
              />
              <MetricChip
                label="S&P Weight"
                value={`${sector.spWeight}%`}
              />
              <MetricChip
                label="Beta"
                value={sector.beta.toFixed(2)}
                color={sector.beta > 1 ? colors.warning : colors.positive}
              />
              <MetricChip
                label="Companies"
                value={sector.companies.toString()}
              />
              <MetricChip
                label="Momentum"
                value={sector.momentum.toString()}
                color={sector.momentum >= 50 ? colors.positive : sector.momentum >= 25 ? colors.warning : colors.negative}
              />
              <MetricChip
                label="Rel. Strength"
                value={sector.relativeStrength.toString()}
                color={sector.relativeStrength >= 60 ? colors.positive : sector.relativeStrength >= 40 ? colors.warning : colors.negative}
              />
            </div>
          </motion.div>

          {/* ====== 52-WEEK RANGE ====== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5"
          >
            <RangeBar
              current={sector.price}
              low={range52w.low}
              high={range52w.high}
              label="52-Week Range"
            />
          </motion.div>

          {/* ====== VERDICT STRIP (if available) ====== */}
          {sector.verdict && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-5 flex items-center gap-4 p-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
                border: '1px solid rgba(201,166,70,0.12)',
              }}
            >
              {/* Title */}
              <div className="flex items-center gap-2 shrink-0">
                <Award className="h-4 w-4 text-[#C9A646]" />
                <span className="text-sm font-bold text-white hidden md:inline">FINOTAUR Sector Rating</span>
              </div>

              {/* Score */}
              <div className="relative shrink-0">
                <svg width="52" height="52" className="transform -rotate-90">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <motion.circle
                    cx="26" cy="26" r="22" fill="none"
                    stroke={colors.gold.primary}
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 138.23 }}
                    animate={{ strokeDashoffset: 138.23 - (138.23 * sector.verdict.rating / 100) }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    style={{ strokeDasharray: 138.23 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{sector.verdict.rating}</span>
                </div>
              </div>

              {/* Signal + Summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: sector.verdict.signal === 'OVERWEIGHT'
                        ? colors.positive
                        : sector.verdict.signal === 'UNDERWEIGHT'
                        ? colors.negative
                        : colors.warning,
                    }}
                  >
                    {sector.verdict.signal}
                  </span>
                  <span className="text-[10px] text-[#555]">vs S&P 500</span>
                </div>
                <p className="text-[13px] text-[#8B8B8B] leading-relaxed line-clamp-2">
                  {sector.verdict.summary}
                </p>
              </div>

              {/* FINOTAUR label */}
              <div className="shrink-0 hidden md:block">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded"
                  style={{
                    background: 'rgba(201,166,70,0.08)',
                    border: '1px solid rgba(201,166,70,0.15)',
                    color: colors.gold.primary,
                  }}
                >
                  FINOTAUR Rating
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ====== BOTTOM ACCENT LINE ====== */}
        <div
          className="h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 10%, rgba(201,166,70,0.08) 50%, transparent 90%)',
          }}
        />
      </div>
    </motion.div>
  );
});

SectorHeader.displayName = 'SectorHeader';
export default SectorHeader;