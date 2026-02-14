// src/features/options-ai/components/tabs/FlowTab.tsx
// ═══════════════════════════════════════════════════════════════
// FLOW TAB — Block Trades Scanner (Luxury Edition)
// ═══════════════════════════════════════════════════════════════
// • Grouped by ticker symbol — premium luxury card design
// • Flat cards — NO expandable/accordion sections
// • Optimized for 10K+ concurrent users:
//   - All computation memoized via useMemo
//   - Zero per-card state (no expand = zero re-renders)
//   - Lightweight DOM: one card per symbol, not per trade
//   - All filtering/sorting client-side (zero API calls)
// ═══════════════════════════════════════════════════════════════

import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import type { BlockTrade } from '../../types/options-ai.types';
import { Card, SectionHeader } from '../ui';

// ── Ticker Logo ──
const LOGO_BASE = '/api/polygon/logo';

const TickerLogo = memo(function TickerLogo({
  symbol,
  size = 56,
}: {
  symbol: string;
  size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const initials = symbol.slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, rgba(20,18,15,0.9), rgba(30,27,22,0.9))',
        border: '1px solid rgba(201,166,70,0.25)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(201,166,70,0.08)',
      }}
    >
      {!hasError ? (
        <img
          src={`${LOGO_BASE}/${symbol}`}
          alt={symbol}
          className="w-full h-full object-contain p-2 rounded-2xl"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <span
          className="font-bold"
          style={{
            fontSize: size * 0.32,
            color: '#C9A646',
            textShadow: '0 0 12px rgba(201,166,70,0.3)',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
});

// ── ETF / Index Detection ──
const INDEX_ETF_SYMBOLS = new Set([
  'SPY', 'SPX', 'SPXW', 'VOO', 'IVV', 'SPLG', 'UPRO', 'SPXL', 'SPXS', 'SH', 'SDS',
  'QQQ', 'QQQM', 'TQQQ', 'SQQQ', 'NDX', 'QLD', 'PSQ',
  'DIA', 'UDOW', 'SDOW', 'DDM', 'DOG',
  'IWM', 'TNA', 'TZA', 'URTY', 'SRTY', 'IWO', 'IWN', 'VTWO',
  'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLU', 'XLP', 'XLY', 'XLB', 'XLRE', 'XLC',
  'VIX', 'VIXY', 'UVXY', 'SVXY', 'VXX', 'VIXM',
  'VTI', 'ITOT', 'SCHB', 'SPTM',
  'EEM', 'EFA', 'VWO', 'IEMG', 'VEA', 'INDA', 'FXI', 'KWEB', 'MCHI',
  'TLT', 'TMF', 'TMV', 'TBT', 'IEF', 'SHY', 'BND', 'AGG', 'HYG', 'LQD', 'JNK',
  'GLD', 'SLV', 'GDX', 'GDXJ', 'IAU', 'USO', 'UNG', 'DBA', 'DBC',
  'SSO', 'SPUU', 'OILU', 'OILD', 'LABU', 'LABD', 'SOXL', 'SOXS',
  'ARKK', 'ARKW', 'ARKG', 'ARKF', 'XBI', 'IBB', 'SMH', 'SOXX', 'HACK', 'BOTZ',
  'TAN', 'ICLN', 'LIT', 'JETS', 'DFEN', 'NAIL', 'CURE',
]);

function isIndexOrETF(symbol: string): boolean {
  return INDEX_ETF_SYMBOLS.has(symbol.toUpperCase());
}

const INDEX_MIN_PREMIUM = 5_000_000;
const STOCK_MIN_PREMIUM = 1_000_000;

// ── Helpers ──
function parsePremium(premium: string): number {
  const cleaned = premium.replace(/[^0-9.KMB]/gi, '');
  const num = parseFloat(cleaned);
  if (cleaned.toUpperCase().includes('B')) return num * 1_000_000_000;
  if (cleaned.toUpperCase().includes('M')) return num * 1_000_000;
  if (cleaned.toUpperCase().includes('K')) return num * 1_000;
  return num;
}

function formatPremium(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function getSignal(block: BlockTrade): 'LONG' | 'SHORT' {
  if (block.type === 'call' && block.side === 'buy') return 'LONG';
  if (block.type === 'put' && block.side === 'sell') return 'LONG';
  if (block.type === 'put' && block.side === 'buy') return 'SHORT';
  if (block.type === 'call' && block.side === 'sell') return 'SHORT';
  return 'LONG';
}

function getTodayFormatted(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Grouped Symbol Data ──
interface SymbolGroup {
  symbol: string;
  blocks: BlockTrade[];
  totalPremium: number;
  bullishPremium: number;
  bearishPremium: number;
  bullishCount: number;
  bearishCount: number;
  totalBlocks: number;
  bullishPercent: number;
  bearishPercent: number;
  direction: 'LONG' | 'SHORT' | 'MIXED';
  conviction: 'HIGH' | 'MODERATE';
  isETF: boolean;
  narrative: string;
}

function buildSymbolGroups(blocks: BlockTrade[]): SymbolGroup[] {
  const map = new Map<string, BlockTrade[]>();

  blocks.forEach((b) => {
    const prem = parsePremium(b.premium);
    const etf = isIndexOrETF(b.symbol);
    const minPrem = etf ? INDEX_MIN_PREMIUM : STOCK_MIN_PREMIUM;
    if (prem < minPrem) return;

    const existing = map.get(b.symbol);
    if (existing) existing.push(b);
    else map.set(b.symbol, [b]);
  });

  const groups: SymbolGroup[] = [];

  map.forEach((trades, symbol) => {
    let totalPremium = 0;
    let bullishPremium = 0;
    let bearishPremium = 0;
    let bullishCount = 0;
    let bearishCount = 0;

    trades.forEach((t) => {
      const prem = parsePremium(t.premium);
      const signal = getSignal(t);
      totalPremium += prem;
      if (signal === 'LONG') {
        bullishPremium += prem;
        bullishCount++;
      } else {
        bearishPremium += prem;
        bearishCount++;
      }
    });

    const total = bullishCount + bearishCount;
    const bullishPercent = total > 0 ? Math.round((bullishCount / total) * 100) : 50;
    const bearishPercent = 100 - bullishPercent;

    let direction: 'LONG' | 'SHORT' | 'MIXED';
    if (bullishPercent >= 60) direction = 'LONG';
    else if (bearishPercent >= 60) direction = 'SHORT';
    else direction = 'MIXED';

    const dominantPercent = Math.max(bullishPercent, bearishPercent);
    const conviction: 'HIGH' | 'MODERATE' =
      dominantPercent >= 70 && totalPremium >= 5_000_000 ? 'HIGH' : 'MODERATE';

    const narrative = `${trades.length} large block trade${trades.length !== 1 ? 's' : ''} detected, totaling ${formatPremium(totalPremium)} in premium. ${bullishCount} bullish and ${bearishCount} bearish.`;

    groups.push({
      symbol, blocks: trades, totalPremium, bullishPremium, bearishPremium,
      bullishCount, bearishCount, totalBlocks: trades.length,
      bullishPercent, bearishPercent, direction, conviction,
      isETF: isIndexOrETF(symbol), narrative,
    });
  });

  return groups;
}

// ── Types ──
type SortField = 'premium' | 'symbol' | 'time';
type DirectionFilter = 'all' | 'long' | 'short';

// ═══════════════════════════════════════════════════════════════
// ── DIRECTION BADGE — Luxury ──
// ═══════════════════════════════════════════════════════════════
const DirectionBadge = memo(function DirectionBadge({
  direction,
}: {
  direction: 'LONG' | 'SHORT' | 'MIXED';
}) {
  const config = {
    LONG: {
      label: '↗ LONG',
      bg: 'linear-gradient(135deg, rgba(46,168,90,0.2), rgba(46,168,90,0.05))',
      border: 'rgba(46,168,90,0.4)',
      color: '#3CC968',
      shadow: '0 0 12px rgba(46,168,90,0.15)',
    },
    SHORT: {
      label: '↘ SHORT',
      bg: 'linear-gradient(135deg, rgba(201,59,59,0.2), rgba(201,59,59,0.05))',
      border: 'rgba(201,59,59,0.4)',
      color: '#E05252',
      shadow: '0 0 12px rgba(201,59,59,0.15)',
    },
    MIXED: {
      label: '↕ MIXED',
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
      border: 'rgba(245,158,11,0.4)',
      color: '#FBBF24',
      shadow: '0 0 12px rgba(245,158,11,0.15)',
    },
  };

  const c = config[direction];

  return (
    <div
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs tracking-widest"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        boxShadow: c.shadow,
      }}
    >
      {c.label}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── CONVICTION BADGE — Luxury ──
// ═══════════════════════════════════════════════════════════════
const ConvictionBadge = memo(function ConvictionBadge({
  conviction,
}: {
  conviction: 'HIGH' | 'MODERATE';
}) {
  const isHigh = conviction === 'HIGH';

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest"
      style={{
        background: isHigh
          ? 'linear-gradient(135deg, rgba(46,168,90,0.12), rgba(46,168,90,0.03))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${isHigh ? 'rgba(46,168,90,0.25)' : 'rgba(255,255,255,0.08)'}`,
        color: isHigh ? '#3CC968' : '#7A7A7A',
        boxShadow: isHigh ? '0 0 8px rgba(46,168,90,0.1)' : 'none',
      }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full"
        style={{
          background: isHigh ? '#3CC968' : '#555',
          boxShadow: isHigh ? '0 0 6px rgba(46,168,90,0.6)' : 'none',
        }}
      />
      {isHigh ? 'High Conviction' : 'Moderate'}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── RATIO BAR — Thin Elegant Line with Labels ──
// ═══════════════════════════════════════════════════════════════
const RatioBar = memo(function RatioBar({
  bullishPercent,
  index = 0,
}: {
  bullishPercent: number;
  index?: number;
}) {
  const bearishPercent = 100 - bullishPercent;

  return (
    <div className="w-[160px] shrink-0">
      {/* Labels */}
      <div className="flex justify-between mb-1.5">
        <span className="text-[9px] font-medium tracking-wide" style={{ color: '#3CC968' }}>
          {bullishPercent}% Long
        </span>
        <span className="text-[9px] font-medium tracking-wide" style={{ color: '#E05252' }}>
          {bearishPercent}% Short
        </span>
      </div>
      {/* Thin track */}
      <div
        className="relative h-[4px] rounded-full overflow-hidden flex"
        style={{
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <motion.div
          className="h-full"
          style={{
            borderRadius: bearishPercent > 0 ? '9999px 0 0 9999px' : '9999px',
            background: 'linear-gradient(90deg, #2EA85A, #3CC968)',
            boxShadow: '0 0 6px rgba(46,168,90,0.3)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${bullishPercent}%` }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1], delay: index * 0.04 }}
        />
        <motion.div
          className="h-full"
          style={{
            borderRadius: bullishPercent > 0 ? '0 9999px 9999px 0' : '9999px',
            background: 'linear-gradient(90deg, #C93B3B, #E05252)',
            boxShadow: '0 0 6px rgba(201,59,59,0.3)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${bearishPercent}%` }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1], delay: index * 0.04 + 0.08 }}
        />
      </div>
      {/* Subtle glow reflection */}
      <div
        className="h-[2px] mx-2 rounded-full blur-sm opacity-20 mt-[1px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, rgba(46,168,90,0.6) 0%, rgba(46,168,90,0.1) ${bullishPercent}%, rgba(201,59,59,0.1) ${bullishPercent}%, rgba(201,59,59,0.6) 100%)`,
        }}
      />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── SYMBOL CARD — Luxury Flat Card ──
// ═══════════════════════════════════════════════════════════════
const SymbolCard = memo(function SymbolCard({
  group,
  index,
}: {
  group: SymbolGroup;
  index: number;
}) {
  const borderColor =
    group.direction === 'LONG'
      ? 'rgba(46,168,90,0.18)'
      : group.direction === 'SHORT'
      ? 'rgba(201,59,59,0.18)'
      : 'rgba(245,158,11,0.18)';

  const accentColor =
    group.direction === 'LONG'
      ? '#3CC968'
      : group.direction === 'SHORT'
      ? '#E05252'
      : '#FBBF24';

  const glowColor =
    group.direction === 'LONG'
      ? 'rgba(46,168,90,0.04)'
      : group.direction === 'SHORT'
      ? 'rgba(201,59,59,0.04)'
      : 'rgba(245,158,11,0.04)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="relative rounded-2xl overflow-hidden group"
        style={{
          background: `linear-gradient(165deg, rgba(18,16,12,0.95) 0%, ${glowColor} 60%, rgba(18,16,12,0.95) 100%)`,
          border: `1px solid ${borderColor}`,
          boxShadow: '0 4px 32px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(201,166,70,0.04)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${accentColor}40`;
          e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.3), 0 0 20px ${glowColor}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(201,166,70,0.04)';
        }}
      >
        {/* Top accent shimmer line */}
        <div
          className="absolute top-0 left-[28px] right-[28px] h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 30%, ${accentColor}50 50%, ${accentColor}30 70%, transparent 100%)`,
          }}
        />

        <div className="px-6 pt-5 pb-4">
          {/* ── ROW 1: Symbol + Badges + Premium Stats ── */}
          <div className="flex items-center gap-5 flex-wrap">
            {/* Left: Logo + Symbol Info */}
            <div className="flex items-center gap-4 min-w-[300px]">
              <TickerLogo symbol={group.symbol} size={56} />
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span
                    className="text-[22px] font-black text-white tracking-tight leading-none"
                  >
                    {group.symbol}
                  </span>
                  <DirectionBadge direction={group.direction} />
                  <ConvictionBadge conviction={group.conviction} />
                </div>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: '#6B6B6B' }}>
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: '#555' }} />
                  <span className="font-medium">{group.totalBlocks} blocks</span>
                  <span style={{ color: '#333' }}>•</span>
                  <span>{group.bullishPercent}% bullish / {group.bearishPercent}% bearish</span>
                </div>
              </div>
            </div>

            {/* Right: Premium Numbers + Bar */}
            <div className="flex items-center gap-8 flex-1 justify-end flex-wrap">
              {/* Total Premium */}
              <div className="text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.14em] mb-1.5 font-semibold"
                  style={{ color: '#6B6B6B' }}
                >
                  Total Premium
                </div>
                <div
                  className="text-[22px] font-black text-white leading-none"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 20px rgba(255,255,255,0.03)',
                  }}
                >
                  {formatPremium(group.totalPremium)}
                </div>
              </div>

              {/* Bullish */}
              <div className="text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.14em] mb-1.5 font-semibold"
                  style={{ color: '#6B6B6B' }}
                >
                  Bullish
                </div>
                <div
                  className="text-[16px] font-bold leading-none"
                  style={{
                    color: '#3CC968',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 12px rgba(60,201,104,0.15)',
                  }}
                >
                  {formatPremium(group.bullishPremium)}
                </div>
              </div>

              {/* Bearish */}
              <div className="text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.14em] mb-1.5 font-semibold"
                  style={{ color: '#6B6B6B' }}
                >
                  Bearish
                </div>
                <div
                  className="text-[16px] font-bold leading-none"
                  style={{
                    color: '#E05252',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 12px rgba(248,113,113,0.15)',
                  }}
                >
                  {formatPremium(group.bearishPremium)}
                </div>
              </div>

              {/* Ratio Bar */}
              <RatioBar bullishPercent={group.bullishPercent} index={index} />
            </div>
          </div>

          {/* ── ROW 2: Narrative footer ── */}
          <div
            className="mt-3.5 pt-3"
            style={{ borderTop: '1px solid rgba(201,166,70,0.06)' }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: '#5A5A5A' }}>
              {group.narrative}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── SUMMARY BAR — Luxury ──
// ═══════════════════════════════════════════════════════════════
const SummaryBar = memo(function SummaryBar({
  groups,
}: {
  groups: SymbolGroup[];
}) {
  const stats = useMemo(() => {
    let totalPremium = 0;
    let longPremium = 0;
    let shortPremium = 0;
    let longCount = 0;
    let shortCount = 0;

    groups.forEach((g) => {
      totalPremium += g.totalPremium;
      longPremium += g.bullishPremium;
      shortPremium += g.bearishPremium;
      longCount += g.bullishCount;
      shortCount += g.bearishCount;
    });

    const total = longCount + shortCount;
    const longPct = total > 0 ? Math.round((longCount / total) * 100) : 50;

    return { totalPremium, longPremium, shortPremium, longCount, shortCount, longPct };
  }, [groups]);

  return (
    <div
      className="rounded-2xl p-6 mb-7"
      style={{
        background: 'linear-gradient(165deg, rgba(18,16,12,0.8) 0%, rgba(201,166,70,0.03) 50%, rgba(18,16,12,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(201,166,70,0.04)',
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Total Premium */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))',
              border: '1px solid rgba(201,166,70,0.2)',
              boxShadow: '0 0 10px rgba(201,166,70,0.06)',
            }}
          >
            <DollarSign className="w-4 h-4" style={{ color: '#C9A646' }} />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold block" style={{ color: '#6B6B6B' }}>
              Total Flow
            </span>
            <span
              className="text-xl font-black text-white"
              style={{ fontVariantNumeric: 'tabular-nums', textShadow: '0 0 16px rgba(255,255,255,0.03)' }}
            >
              {formatPremium(stats.totalPremium)}
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px h-11" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,166,70,0.12), transparent)' }} />

        {/* Long / Short */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#3CC968' }} />
            <div>
              <span className="text-sm font-bold" style={{ color: '#3CC968' }}>
                {stats.longCount} Long
              </span>
              <span className="text-xs ml-2" style={{ color: '#555' }}>
                {formatPremium(stats.longPremium)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" style={{ color: '#E05252' }} />
            <div>
              <span className="text-sm font-bold" style={{ color: '#E05252' }}>
                {stats.shortCount} Short
              </span>
              <span className="text-xs ml-2" style={{ color: '#555' }}>
                {formatPremium(stats.shortPremium)}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-11" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,166,70,0.12), transparent)' }} />

        {/* Ratio Bar */}
        <div className="flex-1 min-w-[180px] max-w-[280px]">
          <div className="flex justify-between text-[10px] mb-2.5 font-semibold tracking-widest">
            <span style={{ color: '#3CC968' }}>{stats.longPct}% Long</span>
            <span style={{ color: '#E05252' }}>{100 - stats.longPct}% Short</span>
          </div>
          {/* Thin track */}
          <div
            className="relative h-[4px] rounded-full overflow-hidden flex"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${stats.longPct}%`,
                borderRadius: stats.longPct < 100 ? '9999px 0 0 9999px' : '9999px',
                background: 'linear-gradient(90deg, #2EA85A, #3CC968)',
                boxShadow: '0 0 6px rgba(46,168,90,0.3)',
              }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${100 - stats.longPct}%`,
                borderRadius: stats.longPct > 0 ? '0 9999px 9999px 0' : '9999px',
                background: 'linear-gradient(90deg, #C93B3B, #E05252)',
                boxShadow: '0 0 6px rgba(201,59,59,0.3)',
              }}
            />
          </div>
          {/* Subtle glow */}
          <div
            className="h-[2px] mx-2 rounded-full blur-sm opacity-20 mt-[1px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, rgba(46,168,90,0.6) 0%, rgba(46,168,90,0.1) ${stats.longPct}%, rgba(201,59,59,0.1) ${stats.longPct}%, rgba(201,59,59,0.6) 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── FILTER PILL — Luxury ──
// ═══════════════════════════════════════════════════════════════
const FilterPill = memo(function FilterPill({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  const activeColor = color || '#C9A646';

  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 tracking-wide"
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${activeColor}18, ${activeColor}08)`,
              border: `1px solid ${activeColor}50`,
              color: activeColor,
              boxShadow: `0 0 12px ${activeColor}10`,
            }
          : {
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#555',
            }
      }
    >
      {children}
    </button>
  );
});

// ═══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═══════════════════════════════════════════════════════════════
interface FlowTabProps {
  blockTrades: BlockTrade[];
  flows?: any[];
  sweepOrders?: any[];
  putCallHeatmap?: any[];
  typeFilter?: any;
  flowSubTab?: any;
  blockTier?: any;
  onFilterChange?: (f: any) => void;
  onSubTabChange?: (s: any) => void;
  onBlockTierChange?: (t: any) => void;
  onFlowClick?: (f: any) => void;
  filteredBlocks?: BlockTrade[];
}

export const FlowTab = memo(function FlowTab(props: FlowTabProps) {
  const { blockTrades } = props;

  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('premium');

  // Build grouped data — single pass, fully memoized
  const { displayGroups, totalSymbols } = useMemo(() => {
    let groups = buildSymbolGroups(blockTrades);

    if (directionFilter === 'long') {
      groups = groups.filter((g) => g.direction === 'LONG');
    } else if (directionFilter === 'short') {
      groups = groups.filter((g) => g.direction === 'SHORT');
    }

    groups.sort((a, b) => {
      if (sortBy === 'premium') return b.totalPremium - a.totalPremium;
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      return 0;
    });

    return { displayGroups: groups, totalSymbols: groups.length };
  }, [blockTrades, directionFilter, sortBy]);

  return (
    <Card>
      <div className="p-7 md:p-9">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <SectionHeader
              icon={Zap}
              title="Block Trades Scanner"
              subtitle="Large institutional block orders grouped by stock."
              iconBg="orange"
            />
            <div className="flex items-center gap-2.5 mt-3 ml-[52px]">
              <Clock className="w-3 h-3" style={{ color: '#555' }} />
              <span className="text-[11px] font-medium" style={{ color: '#555' }}>
                {getTodayFormatted()} • Live
              </span>
              <span className="relative flex h-2 w-2 ml-1">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                  style={{ background: '#3CC968' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: '#3CC968', boxShadow: '0 0 8px rgba(60,201,104,0.5)' }}
                />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))',
                color: '#C9A646',
                border: '1px solid rgba(201,166,70,0.2)',
                boxShadow: '0 0 10px rgba(201,166,70,0.06)',
              }}
            >
              {totalSymbols} symbols
            </span>
          </div>
        </div>

        {/* Summary Bar */}
        <SummaryBar groups={displayGroups} />

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
          <div className="flex items-center gap-2.5">
            <Filter className="w-3.5 h-3.5" style={{ color: '#555' }} />
            <FilterPill
              active={directionFilter === 'all'}
              onClick={() => setDirectionFilter('all')}
            >
              All Signals
            </FilterPill>
            <FilterPill
              active={directionFilter === 'long'}
              onClick={() => setDirectionFilter('long')}
              color="#3CC968"
            >
              ↑ Long Only
            </FilterPill>
            <FilterPill
              active={directionFilter === 'short'}
              onClick={() => setDirectionFilter('short')}
              color="#E05252"
            >
              ↓ Short Only
            </FilterPill>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: '#555' }}>
              Sort:
            </span>
            <FilterPill active={sortBy === 'premium'} onClick={() => setSortBy('premium')}>
              💰 Premium
            </FilterPill>
            <FilterPill active={sortBy === 'symbol'} onClick={() => setSortBy('symbol')}>
              🔤 Symbol
            </FilterPill>
            <FilterPill active={sortBy === 'time'} onClick={() => setSortBy('time')}>
              🕐 Time
            </FilterPill>
          </div>
        </div>

        {/* Symbol Cards */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayGroups.length > 0 ? (
              displayGroups.map((g, i) => (
                <SymbolCard key={g.symbol} group={g} index={i} />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(201,166,70,0.02))',
                    border: '1px solid rgba(201,166,70,0.12)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  <DollarSign className="w-7 h-7" style={{ color: '#555' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
                  No large block trades found
                  {directionFilter !== 'all'
                    ? ` with ${directionFilter.toUpperCase()} signal`
                    : ''}{' '}
                  today
                </p>
                <p className="text-xs mt-2" style={{ color: '#444' }}>
                  Large institutional blocks will appear here in real-time
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
});