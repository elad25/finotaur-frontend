import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BarChart3, Brain, ChevronRight, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { BlockTrade } from '../../types/options-ai.types';
import { Card } from '../ui';
import { fmtPriceOrDash } from '../../utils/format';

interface SymbolGroup {
  symbol: string;
  blocks: BlockTrade[];
  totalPremium: number;
  bullishPremium: number;
  bearishPremium: number;
  bullishPercent: number;
  bearishPercent: number;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  latestTime: string;
}

interface FlowTabProps {
  blockTrades: BlockTrade[];
  flows?: unknown[];
  sweepOrders?: unknown[];
  putCallHeatmap?: unknown[];
  typeFilter?: unknown;
  flowSubTab?: unknown;
  blockTier?: unknown;
  onFilterChange?: (f: unknown) => void;
  onSubTabChange?: (s: unknown) => void;
  onBlockTierChange?: (t: unknown) => void;
  onFlowClick?: (f: unknown) => void;
  filteredBlocks?: BlockTrade[];
}

type FlowFilter = 'all' | 'long' | 'short';
type FlowSort = 'premium' | 'symbol' | 'time';

const GREEN = '#3F9E6B';
const GREEN_DEEP = '#1C7A4A';
const RED = '#E24B4A';
const GOLD = '#C9A646';
const GOLD_LIGHT = '#F4D97B';
const BORDER = 'rgba(201,166,70,0.16)';
const PANEL = 'linear-gradient(180deg, rgba(16,15,12,0.96), rgba(8,8,7,0.98))';
const TABLE_COLUMNS = 'minmax(122px,1.2fr) 100px 58px 96px 108px 108px 104px 68px';
const FEATURED_COLUMNS = 'minmax(122px,1.2fr) 100px 58px 96px 108px 108px 104px 68px';
const SMALL_TABLE_COLUMNS = '1fr 70px 86px 64px';

function parsePremium(premium: string): number {
  const cleaned = premium.replace(/[^0-9.KMB]/gi, '');
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  if (cleaned.toUpperCase().includes('B')) return value * 1_000_000_000;
  if (cleaned.toUpperCase().includes('M')) return value * 1_000_000;
  if (cleaned.toUpperCase().includes('K')) return value * 1_000;
  return value;
}

function formatPremium(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${Math.round(value)}`;
}

function getSignal(block: BlockTrade): 'LONG' | 'SHORT' {
  if (block.signal === 'LONG' || block.signal === 'SHORT') return block.signal;
  if (block.type === 'call' && block.side === 'buy') return 'LONG';
  if (block.type === 'put' && block.side === 'sell') return 'LONG';
  return 'SHORT';
}

function formatTime(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function buildGroups(blocks: BlockTrade[]): SymbolGroup[] {
  const map = new Map<string, BlockTrade[]>();

  for (const block of blocks) {
    const current = map.get(block.symbol) ?? [];
    current.push(block);
    map.set(block.symbol, current);
  }

  return Array.from(map.entries())
    .map(([symbol, symbolBlocks]) => {
      let bullishPremium = 0;
      let bearishPremium = 0;

      for (const block of symbolBlocks) {
        const premium = block.premiumRaw || parsePremium(block.premium);
        if (getSignal(block) === 'LONG') bullishPremium += premium;
        else bearishPremium += premium;
      }

      const totalPremium = bullishPremium + bearishPremium;
      const bullishPercent = totalPremium > 0 ? Math.round((bullishPremium / totalPremium) * 100) : 50;
      const bearishPercent = 100 - bullishPercent;
      const direction = Math.abs(bullishPercent - bearishPercent) < 8
        ? 'NEUTRAL'
        : bullishPercent > bearishPercent ? 'LONG' : 'SHORT';
      const latestTime = [...symbolBlocks]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp;

      return {
        symbol,
        blocks: symbolBlocks,
        totalPremium,
        bullishPremium,
        bearishPremium,
        bullishPercent,
        bearishPercent,
        direction,
        latestTime,
      };
    })
    .sort((a, b) => b.totalPremium - a.totalPremium);
}

const MiniChart = memo(function MiniChart({ tone = GOLD }: { tone?: string }) {
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <defs>
        <linearGradient id="flow-mini-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.24" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M4 42 L14 32 L24 34 L34 22 L45 26 L55 14 L65 21 L76 17 L86 24 L98 16 L116 10 L116 46 L4 46 Z" fill="url(#flow-mini-fill)" />
      <path d="M4 42 L14 32 L24 34 L34 22 L45 26 L55 14 L65 21 L76 17 L86 24 L98 16 L116 10" fill="none" stroke={tone} strokeWidth="2" />
      <circle cx="116" cy="10" r="3" fill={tone} />
    </svg>
  );
});

const FlowSplitBar = memo(function FlowSplitBar({ bullish, bearish, compact = false }: { bullish: number; bearish: number; compact?: boolean }) {
  return (
    <div className={compact ? 'w-24 max-w-full justify-self-start' : 'w-[104px] max-w-full justify-self-start'}>
      <div className="mb-1 flex justify-between text-[10px] font-semibold tabular-nums">
        <span style={{ color: GREEN }}>{bullish}%</span>
        <span style={{ color: RED }}>{bearish}%</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div style={{ width: `${bullish}%`, background: GREEN }} />
        <div style={{ width: `${bearish}%`, background: RED }} />
      </div>
    </div>
  );
});

const BiasBadge = memo(function BiasBadge({ direction }: { direction: SymbolGroup['direction'] }) {
  const color = direction === 'LONG' ? GREEN : direction === 'SHORT' ? RED : GOLD_LIGHT;
  const Icon = direction === 'SHORT' ? TrendingDown : TrendingUp;

  return (
    <span
      className="inline-flex h-7 min-w-[88px] items-center justify-center gap-1 rounded-md border px-3 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: `${color}55`, background: `${color}12`, color }}
    >
      {direction !== 'NEUTRAL' && <Icon className="h-3 w-3" />}
      {direction}
    </span>
  );
});

const FlowRow = memo(function FlowRow({
  group,
  featured = false,
  onToggle,
}: {
  group: SymbolGroup;
  featured?: boolean;
  onToggle?: (symbol: string) => void;
}) {
  const tone = group.direction === 'SHORT' ? RED : group.direction === 'NEUTRAL' ? GOLD : GREEN;

  return (
    <div
      className={featured
        ? 'overflow-hidden border-b transition-colors'
        : 'grid min-h-[58px] cursor-pointer items-center border-b px-5 transition-colors hover:bg-white/[0.025]'
      }
      onClick={() => onToggle?.(group.symbol)}
      style={{
        borderColor: BORDER,
        background: featured
          ? 'radial-gradient(circle at 0% 0%, rgba(53,183,101,0.12), transparent 34%), linear-gradient(180deg, rgba(18,35,23,0.64), rgba(9,12,9,0.96))'
          : 'rgba(255,255,255,0.012)',
        ...(!featured ? { gridTemplateColumns: TABLE_COLUMNS } : {}),
      }}
    >
      {featured ? (
        <>
          <div
            className="grid min-h-[112px] items-center px-5"
            style={{ gridTemplateColumns: FEATURED_COLUMNS }}
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-ink-primary">{group.symbol}</span>
                <BarChart3 className="h-4 w-4 text-ink-tertiary" />
                <span className="h-2 w-2 rounded-full" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                {group.blocks.length} Blocks <span className="mx-2 text-ink-tertiary">.</span>
                {group.bullishPercent}% Bullish / {group.bearishPercent}% Bearish
              </p>
            </div>
            <BiasBadge direction={group.direction} />
            <div className="text-center text-lg font-bold tabular-nums text-ink-primary">{group.blocks.length}</div>
            <div className="text-base font-black tabular-nums text-ink-primary">{formatPremium(group.totalPremium)}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: GREEN }}>{formatPremium(group.bullishPremium)}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: RED }}>{formatPremium(group.bearishPremium)}</div>
            <FlowSplitBar bullish={group.bullishPercent} bearish={group.bearishPercent} />
            <div className="justify-self-end text-right text-sm tabular-nums text-ink-secondary">{formatTime(group.latestTime)}</div>
          </div>

          <div className="grid min-h-[150px] grid-cols-3 border-t" style={{ borderColor: 'rgba(201,166,70,0.08)' }}>
            <div className="px-5 py-5">
              <SectionLabel>Flow Breakdown</SectionLabel>
              <BreakdownLine label="Bullish Flow" value={group.bullishPremium} percent={group.bullishPercent} color={GREEN} />
              <BreakdownLine label="Bearish Flow" value={group.bearishPremium} percent={group.bearishPercent} color={RED} />
            </div>
            <div className="border-x px-5 py-5" style={{ borderColor: 'rgba(201,166,70,0.08)' }}>
              <SectionLabel>Premium Over Time</SectionLabel>
              <div className="mt-2 h-[86px]">
                <MiniChart tone={GOLD} />
              </div>
            </div>
            <div className="px-5 py-5">
              <SectionLabel>Trade Type</SectionLabel>
              <BreakdownLine label="Calls" value={group.bullishPremium} percent={group.bullishPercent} color={GREEN} />
              <BreakdownLine label="Puts" value={group.bearishPremium} percent={group.bearishPercent} color={RED} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-ink-primary">{group.symbol}</span>
            <BarChart3 className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <BiasBadge direction={group.direction} />
          <div className="text-center text-sm font-semibold tabular-nums text-ink-primary">{group.blocks.length}</div>
          <div className="text-sm font-semibold tabular-nums text-ink-primary">{formatPremium(group.totalPremium)}</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: GREEN }}>{formatPremium(group.bullishPremium)}</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: RED }}>{formatPremium(group.bearishPremium)}</div>
          <FlowSplitBar bullish={group.bullishPercent} bearish={group.bearishPercent} compact />
          <div className="justify-self-end text-right text-sm tabular-nums text-ink-secondary">{formatTime(group.latestTime)}</div>
        </>
      )}
    </div>
  );
});

const FlowToolbar = memo(function FlowToolbar({
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
}: {
  filter: FlowFilter;
  sortBy: FlowSort;
  onFilterChange: (filter: FlowFilter) => void;
  onSortChange: (sort: FlowSort) => void;
}) {
  const filters: { label: string; value: FlowFilter }[] = [
    { label: 'All Signals', value: 'all' },
    { label: 'Long Only', value: 'long' },
    { label: 'Short Only', value: 'short' },
  ];
  const sortOptions: { label: string; value: FlowSort }[] = [
    { label: 'Premium', value: 'premium' },
    { label: 'Symbol', value: 'symbol' },
    { label: 'Time', value: 'time' },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            className={[
              'h-9 rounded-[4px] border px-4 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors',
              filter === item.value
                ? 'border-gold-primary/55 bg-gold-primary text-black shadow-[0_0_22px_rgba(201,166,70,0.18)]'
                : 'border-white/[0.08] bg-white/[0.025] text-ink-secondary hover:border-gold-primary/35 hover:text-ink-primary',
            ].join(' ')}
            onClick={() => onFilterChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Sort by:</span>
        {sortOptions.map((item) => (
          <button
            key={item.value}
            className={[
              'h-9 rounded-[4px] border px-4 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors',
              sortBy === item.value
                ? 'border-gold-primary/35 bg-gold-primary/10 text-gold-bright'
                : 'border-white/[0.08] bg-white/[0.025] text-ink-secondary hover:border-gold-primary/35 hover:text-ink-primary',
            ].join(' ')}
            onClick={() => onSortChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
});

const SectionLabel = memo(function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary">{children}</div>;
});

const BreakdownLine = memo(function BreakdownLine({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div className="mb-4 grid grid-cols-[92px_1fr_108px] items-center gap-4">
      <span className="text-xs text-ink-secondary">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-right text-xs font-semibold tabular-nums" style={{ color }}>
        {formatPremium(value)} ({percent}%)
      </span>
    </div>
  );
});

const DistributionPanel = memo(function DistributionPanel({ groups }: { groups: SymbolGroup[] }) {
  const totals = useMemo(() => {
    const long = groups.reduce((sum, group) => sum + group.bullishPremium, 0);
    const short = groups.reduce((sum, group) => sum + group.bearishPremium, 0);
    const total = long + short;
    return {
      long,
      short,
      total,
      longPct: total > 0 ? Math.round((long / total) * 100) : 50,
      shortPct: total > 0 ? Math.round((short / total) * 100) : 50,
    };
  }, [groups]);

  return (
    <SidePanel title="Flow Distribution">
      <div className="flex items-center gap-7 pt-3">
        <div className="relative flex h-[138px] w-[138px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 150 150" className="absolute inset-0 h-full w-full">
            <circle cx="75" cy="75" r="64" fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={1} />
            <g transform="rotate(-90 75 75)">
              <circle cx="75" cy="75" r="55" fill="none" stroke="#181818" strokeWidth={10} />
              <circle
                cx="75" cy="75" r="55" fill="none" stroke={GREEN_DEEP} strokeWidth={10} strokeLinecap="butt"
                strokeDasharray={`${(totals.longPct / 100) * 345.575} 345.575`}
              />
              <circle
                cx="75" cy="75" r="55" fill="none" stroke={RED} strokeWidth={10} strokeLinecap="butt"
                strokeDasharray={`${(totals.shortPct / 100) * 345.575} 345.575`}
                strokeDashoffset={`${-(totals.longPct / 100) * 345.575}`}
              />
            </g>
          </svg>
          <div className="relative flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">Total</span>
            <span className="text-base font-bold tabular-nums text-ink-primary">{formatPremium(totals.total)}</span>
          </div>
        </div>
        <div className="flex-1 space-y-5">
          <DistributionLine label="Long" value={totals.long} percent={totals.longPct} color={GREEN} />
          <DistributionLine label="Short" value={totals.short} percent={totals.shortPct} color={RED} />
        </div>
      </div>
    </SidePanel>
  );
});

const DistributionLine = memo(function DistributionLine({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase" style={{ color }}>{label}</span>
        <span className="text-xs text-ink-secondary">{percent}%</span>
      </div>
      <div className="text-base font-black tabular-nums" style={{ color }}>{formatPremium(value)}</div>
    </div>
  );
});

const AlertsPanel = memo(function AlertsPanel({ blocks }: { blocks: BlockTrade[] }) {
  const alerts = useMemo(() => [...blocks]
    .sort((a, b) => (b.premiumRaw || parsePremium(b.premium)) - (a.premiumRaw || parsePremium(a.premium)))
    .slice(0, 3), [blocks]);

  return (
    <SidePanel title="Large Block Alerts" count={alerts.length}>
      <div className="space-y-3 pt-2">
        {alerts.map((block) => {
          const signal = getSignal(block);
          const color = signal === 'LONG' ? GREEN : RED;
          const severity = (block.premiumRaw || parsePremium(block.premium)) >= 1_000_000 ? 'CRITICAL' : 'HIGH';
          const severityColor = severity === 'CRITICAL' ? RED : GOLD_LIGHT;
          return (
            <div key={block.id} className="rounded-[6px] border border-white/[0.05] bg-white/[0.025] px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                  <span className="truncate text-sm font-semibold text-ink-primary">
                    {block.symbol} {block.strike}{block.type === 'call' ? 'C' : 'P'} {block.expiry}
                  </span>
                  <span className="shrink-0 text-xs text-ink-tertiary">{block.stockPrice != null ? `$${Math.round(block.stockPrice)}` : fmtPriceOrDash(null)}</span>
                  <span className="shrink-0 text-xs font-semibold capitalize" style={{ color }}>
                    {block.type}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-ink-tertiary">{formatTime(block.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary">Premium: {block.premium} · {block.volOiRatio?.toFixed?.(2) ?? '0.00'}x Vol/OI</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: severityColor, background: `${severityColor}18` }}>
                  {severity}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.04em] text-gold-primary transition-colors hover:text-gold-bright"
        type="button"
      >
        View All Alerts
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </SidePanel>
  );
});

const BlockTradesTable = memo(function BlockTradesTable({ blocks }: { blocks: BlockTrade[] }) {
  const rows = useMemo(() => [...blocks]
    .sort((a, b) => (b.premiumRaw || parsePremium(b.premium)) - (a.premiumRaw || parsePremium(a.premium)))
    .slice(0, 9), [blocks]);

  return (
    <div className="overflow-hidden rounded-[8px] border" style={{ borderColor: BORDER, background: PANEL }}>
      <div
        className="grid h-12 items-center border-b px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary"
        style={{ borderColor: BORDER, gridTemplateColumns: SMALL_TABLE_COLUMNS }}
      >
        <span>Contract</span>
        <span>Side</span>
        <span>Premium</span>
        <span>Time</span>
      </div>

      {rows.map((block) => {
        const signal = getSignal(block);
        const color = signal === 'LONG' ? GREEN : RED;

        return (
          <div
            key={block.id}
            className="grid min-h-[54px] items-center border-b px-4 text-sm last:border-b-0"
            style={{ borderColor: 'rgba(201,166,70,0.08)', gridTemplateColumns: SMALL_TABLE_COLUMNS }}
          >
            <div className="min-w-0">
              <div className="truncate font-bold text-ink-primary">
                {block.symbol} {block.strike}{block.type === 'call' ? 'C' : 'P'}
              </div>
              <div className="truncate text-[11px] text-ink-tertiary">{block.expiry}</div>
            </div>
            <span className="text-xs font-bold uppercase" style={{ color }}>{signal}</span>
            <span className="text-xs font-semibold tabular-nums text-ink-primary">{block.premium}</span>
            <span className="text-xs text-ink-secondary">{formatTime(block.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
});

const SidePanel = memo(function SidePanel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border p-5" style={{ borderColor: BORDER, background: PANEL }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-secondary">{title}</h3>
        {typeof count === 'number' && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold text-gold-primary" style={{ borderColor: 'rgba(201,166,70,0.34)', background: 'rgba(201,166,70,0.1)' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
});

const AISummary = memo(function AISummary({ groups }: { groups: SymbolGroup[] }) {
  const leader = groups[0];
  const totalLong = groups.reduce((sum, group) => sum + group.bullishPremium, 0);
  const bias = totalLong >= groups.reduce((sum, group) => sum + group.bearishPremium, 0) ? 'long' : 'short';

  return (
    <div className="mt-5 grid min-h-[84px] grid-cols-[auto_1fr_auto] items-center gap-6 rounded-[8px] border px-5 py-4" style={{ borderColor: BORDER, background: PANEL }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border text-gold-primary" style={{ borderColor: 'rgba(201,166,70,0.32)', background: 'rgba(201,166,70,0.08)' }}>
        <Brain className="h-6 w-6" />
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gold-primary">AI Summary</div>
        <p className="text-sm leading-relaxed text-ink-secondary">
          Strong institutional flow detected{leader ? ` in ${leader.symbol}` : ''}. Market positioning remains {bias} biased
          {leader ? ` with ${formatPremium(leader.bullishPremium)} in bullish premium.` : '.'}
        </p>
      </div>
      <button className="flex h-9 w-9 items-center justify-center rounded-md text-gold-primary transition-colors hover:bg-gold-primary/10" type="button" aria-label="Refresh flow">
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
});

export const FlowTab = memo(function FlowTab({ blockTrades }: FlowTabProps) {
  const groups = useMemo(() => buildGroups(blockTrades), [blockTrades]);
  const [filter, setFilter] = useState<FlowFilter>('all');
  const [sortBy, setSortBy] = useState<FlowSort>('premium');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(groups[0]?.symbol ?? null);
  const rows = useMemo(() => {
    const filtered = groups.filter((group) => {
      if (filter === 'long') return group.direction === 'LONG';
      if (filter === 'short') return group.direction === 'SHORT';
      return true;
    });

    return [...filtered]
      .sort((a, b) => {
        if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
        if (sortBy === 'time') return new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime();
        return b.totalPremium - a.totalPremium;
      })
      .slice(0, 8);
  }, [filter, groups, sortBy]);
  const activeExpandedSymbol = rows.some((group) => group.symbol === expandedSymbol)
    ? expandedSymbol
    : rows[0]?.symbol ?? null;
  const visibleBlocks = useMemo(() => rows.flatMap((group) => group.blocks), [rows]);
  const handleFilterChange = (nextFilter: FlowFilter) => {
    setFilter(nextFilter);
    setExpandedSymbol(null);
  };
  const handleSortChange = (nextSort: FlowSort) => {
    setSortBy(nextSort);
    setExpandedSymbol(null);
  };

  return (
    <Card>
      <div className="p-0">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {groups.length > 0 ? (
            <>
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}
              >
                <div className="space-y-3">
                  <FlowToolbar
                    filter={filter}
                    sortBy={sortBy}
                    onFilterChange={handleFilterChange}
                    onSortChange={handleSortChange}
                  />
                  <div className="overflow-x-auto overflow-y-hidden rounded-[8px] border" style={{ borderColor: BORDER, background: PANEL }}>
                    <div className="w-full min-w-[768px]">
                      <div
                        className="grid h-12 items-center border-b px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary"
                        style={{ borderColor: BORDER, gridTemplateColumns: TABLE_COLUMNS }}
                      >
                        <span>Symbol</span>
                        <span>Bias</span>
                        <span className="text-center">Blocks</span>
                        <span>Premium</span>
                        <span>Bullish</span>
                        <span>Bearish</span>
                        <span>Flow Split</span>
                        <span className="justify-self-end text-right">Time</span>
                      </div>
                      {rows.length > 0 ? rows.map((group) => (
                        <FlowRow
                          key={group.symbol}
                          group={group}
                          featured={group.symbol === activeExpandedSymbol}
                          onToggle={setExpandedSymbol}
                        />
                      )) : (
                        <div className="flex min-h-[170px] items-center justify-center text-sm font-semibold text-ink-tertiary">
                          No {filter} flow signals right now.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <DistributionPanel groups={rows} />
                  <AlertsPanel blocks={visibleBlocks.length > 0 ? visibleBlocks : blockTrades} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[8px] border text-center" style={{ borderColor: BORDER, background: PANEL }}>
              <AlertCircle className="mb-4 h-10 w-10 text-ink-tertiary" />
              <p className="text-sm font-semibold text-ink-primary">No flow blocks available</p>
              <p className="mt-2 text-xs text-ink-tertiary">Large institutional option flow will appear here.</p>
            </div>
          )}
        </motion.div>
      </div>
    </Card>
  );
});
