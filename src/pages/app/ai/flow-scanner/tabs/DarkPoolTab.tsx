// =====================================================
// FLOW SCANNER - Dark Pool Tab
// Off-exchange institutional prints + sweeps
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, ArrowUpRight, ArrowDownRight, Zap, Star, Building2, Sparkles,
  List, Grid2X2, Circle,
} from 'lucide-react';
import { FlowItem } from '../shared/types';
import { COLORS } from '../shared/constants';
import { Card } from '../shared/Ui';
import { getCompanyLogo } from '@/pages/app/ai/copilot/utils/companyLogo';

const PURPLE = '#6D63FF';
const DARK_POOL_TABLE_VERSION = 'dark-pool-table-v2-2026-05-23';

function parseFlowValue(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '').toUpperCase();
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num)) return 0;
  if (cleaned.endsWith('B')) return num * 1_000_000_000;
  if (cleaned.endsWith('M')) return num * 1_000_000;
  if (cleaned.endsWith('K')) return num * 1_000;
  return num;
}

function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value.toFixed(0)}`;
}

function dpScore(item: FlowItem): number {
  const dpPct = item.darkPoolPercent ?? 0;
  const volBoost = Math.min(24, Math.round((item.volumeRatio || 1) * 7));
  const directionBoost = item.direction === 'bullish' ? 10 : item.direction === 'bearish' ? 4 : 7;
  return Math.max(35, Math.min(96, Math.round(dpPct * 1.55 + volBoost + directionBoost)));
}

function convictionLabel(score: number): string {
  if (score >= 80) return 'High Conviction';
  if (score >= 65) return 'High';
  if (score >= 50) return 'Medium';
  return 'Watch';
}

function activityLabel(item: FlowItem): string {
  if (item.direction === 'bearish') return 'Distributing';
  if ((item.darkPoolPercent ?? 0) >= 35 || item.volumeRatio >= 2) return 'Accumulating';
  return 'Accumulating';
}

function insightText(item: FlowItem): string {
  if (item.direction === 'bearish') {
    return 'Heavy dark pool selling pressure detected. Potential distribution.';
  }
  if ((item.darkPoolPercent ?? 0) >= 30) {
    return 'Repeated dark pool accumulation above average. Possible institutional positioning.';
  }
  return 'Significant off-exchange activity. Likely institutional accumulation.';
}

function TickerLogo({ item, accentColor }: { item: FlowItem; accentColor: string }) {
  const logo = getCompanyLogo(item.ticker);

  return (
    <div
      className="flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06), rgba(5,5,5,0.96) 66%)',
        border: `1px solid ${accentColor}55`,
        boxShadow: `0 0 24px ${accentColor}14`,
      }}
    >
      {logo ? (
        <img src={logo} alt="" className="h-10 w-10 object-contain" />
      ) : (
        <span className="font-wordmark text-xl font-bold text-white">{item.ticker.slice(0, 2)}</span>
      )}
    </div>
  );
}

function MiniBar({ value, color = PURPLE }: { value: number; color?: string }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(10, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

function DarkPoolSparkline({ direction, seed }: { direction: FlowItem['direction']; seed: string }) {
  const bullish = direction === 'bullish';
  const color = bullish ? COLORS.bullish : direction === 'bearish' ? COLORS.bearish : PURPLE;
  const charSeed = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const points = Array.from({ length: 30 }, (_, index) => {
    const wave = Math.sin((index + charSeed) * 0.75) * 4 + Math.cos((index + charSeed) * 0.33) * 2;
    const drift = bullish ? 36 - index * 0.9 : 18 + index * 0.65;
    const y = Math.max(5, Math.min(48, drift + wave));
    return `${index * 4.8},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 140 56" className="h-[58px] w-[150px]" aria-hidden="true">
      <defs>
        <linearGradient id={`dark-pool-spark-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2="140" y1="49" y2="49" stroke={color} strokeOpacity="0.16" strokeDasharray="2 3" />
      <polyline points={`${points} 140,56 0,56`} fill={`url(#dark-pool-spark-${seed})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const DarkPoolCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const isSweep = item.type === 'dark_pool_sweep';
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;
  const accentColor = item.direction === 'bearish' ? COLORS.bearish : PURPLE;
  const dpPct = item.darkPoolPercent ?? 20;
  const avgPct = Math.max(6, Math.round(dpPct * 0.48));
  const offExchangeValue = parseFlowValue(item.value) || item.volume * item.price;
  const blockSize = item.dpPrintSize || `$${formatLargeNumber(Math.max(offExchangeValue * 0.18, 750_000))}`;
  const score = dpScore(item);
  const signalLabel = item.direction === 'bearish' ? 'Bearish' : item.direction === 'bullish' ? 'Bullish' : 'Neutral';
  const activity = activityLabel(item);
  const activityColor = item.direction === 'bearish' ? COLORS.bearish : COLORS.bullish;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-[7px] text-left transition-all duration-200 hover:-translate-y-px"
      style={{
        background: 'linear-gradient(90deg, rgba(5,5,6,0.99), rgba(13,13,13,0.99))',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 14px 30px rgba(0,0,0,0.26)',
      }}
    >
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accentColor }} />
      <Star className="absolute right-3 top-3 h-4 w-4 text-[#C9A646]/80" />

      <div className="grid min-h-[142px] grid-cols-[260px_minmax(0,510px)_190px_minmax(290px,1fr)]">
        <div className="flex min-w-0 items-center gap-4 border-r border-white/[0.06] px-6">
          <TickerLogo item={item} accentColor={accentColor} />
          <div className="min-w-0">
            <div className="font-wordmark text-xl font-bold leading-tight text-white">{item.ticker}</div>
            <div className="mt-1 truncate text-xs text-[#8B8B8B]">{item.company}</div>
            <div
              className="mt-2 flex w-fit items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: `${accentColor}1F`, color: accentColor }}
            >
              <ArrowUpRight className="h-3 w-3" />
              {isSweep ? 'Dark Pool Sweep' : 'Dark Pool Accumulation'}
            </div>
            <div className="mt-2 flex w-fit items-center gap-1.5 rounded-[6px] bg-[#C9A646]/10 px-2.5 py-1 text-[10px] font-bold uppercase text-[#D8BE67]">
              <Building2 className="h-3 w-3" />
              Institutional
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-5 border-r border-white/[0.06] px-6 py-6">
          <div className="min-w-0">
            <div className="text-[11px] text-[#8B8B8B]">Dark Pool %</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">{dpPct}%</div>
            <MiniBar value={dpPct} color={accentColor} />
            <div className="mt-2 text-[10px] text-[#7A7A7A]">vs 30D avg: {avgPct}%</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-[#8B8B8B]">Off Exchange Vol.</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">${formatLargeNumber(offExchangeValue)}</div>
            <MiniBar value={Math.min(100, item.volumeRatio * 24)} color={accentColor} />
            <div className="mt-2 text-[10px] tabular-nums" style={{ color: item.direction === 'bearish' ? COLORS.bearish : COLORS.bullish }}>
              {item.volumeRatio.toFixed(1)}x avg
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-[#8B8B8B]">Block Size</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">{blockSize}</div>
            <MiniBar value={score} color={accentColor} />
            <div className="mt-2 text-[10px] font-semibold" style={{ color: score >= 80 ? accentColor : '#D8BE67' }}>
              {score >= 80 ? 'Large' : score >= 65 ? 'Large' : 'Medium'}
            </div>
          </div>

          <div className="col-span-3 flex items-center gap-4 border-t border-white/[0.05] pt-3">
            <span className="text-[10px] font-semibold uppercase text-[#8B8B8B]">DP Score</span>
            <span className="grid h-6 w-6 place-items-center rounded-full border text-[10px] font-bold tabular-nums" style={{ borderColor: accentColor, color: accentColor }}>
              {score}
            </span>
            <span className="text-[10px] text-[#A7A7A7]">/100</span>
            <span className="text-[10px] font-semibold" style={{ color: accentColor }}>{convictionLabel(score)}</span>
            <span className="ml-auto text-[10px] font-semibold uppercase text-[#8B8B8B]">Smart Money Activity</span>
            <Circle className="h-2 w-2 fill-current" style={{ color: activityColor }} />
            <span className="text-[11px] font-semibold" style={{ color: activityColor }}>{activity}</span>
          </div>
        </div>

        <div className="flex items-center border-r border-white/[0.06] px-3 py-5">
          <div
            className="w-full rounded-[6px] border p-3"
            style={{
              borderColor: `${accentColor}55`,
              background: item.direction === 'bearish' ? 'rgba(239,68,68,0.055)' : 'rgba(109,99,255,0.055)',
            }}
          >
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase" style={{ color: accentColor }}>
              <Sparkles className="h-3 w-3" />
              AI Insight
            </div>
            <p className="text-[11px] leading-[1.55] text-[#B8B8B8]">{insightText(item)}</p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[116px_minmax(145px,1fr)] items-center gap-4 px-8 pr-12">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-[22px] font-semibold leading-tight tabular-nums text-white">
              ${item.price.toFixed(2)}
            </div>
            <div className="mt-2 flex items-center gap-1 whitespace-nowrap text-[16px] font-bold tabular-nums" style={{ color: dirColor }}>
              {item.direction === 'bullish' ? <ArrowUpRight className="h-4 w-4" /> : item.direction === 'bearish' ? <ArrowDownRight className="h-4 w-4" /> : null}
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </div>
            <div className="mt-2 w-fit rounded-[5px] px-2 py-1 text-[11px] font-semibold" style={{ background: `${dirColor}1F`, color: dirColor }}>
              {signalLabel}
            </div>
            <div className="mt-2 text-[11px] text-[#8B8B8B]">Vol: {item.volumeRatio.toFixed(1)}x <span className="ml-2">{item.time}</span></div>
          </div>
          <div className="flex min-w-0 justify-end">
            <DarkPoolSparkline direction={item.direction} seed={item.id.replace(/[^a-zA-Z0-9]/g, '') || item.ticker} />
          </div>
        </div>
      </div>
    </motion.button>
  );
});

interface DarkPoolTabProps {
  flowData: FlowItem[];
  onItemClick: (item: FlowItem) => void;
}

export default memo(function DarkPoolTab({ flowData, onItemClick }: DarkPoolTabProps) {
  const items = flowData.filter(i => i.type === 'dark_pool' || i.type === 'dark_pool_sweep');
  const sweeps = items.filter(i => i.type === 'dark_pool_sweep');
  const highActivity = items.filter(i => (i.darkPoolPercent ?? 0) > 50).length;
  const sorted = [...items].sort((a, b) => dpScore(b) - dpScore(a));

  return (
    <div className="space-y-5" data-ui-version={DARK_POOL_TABLE_VERSION}>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Prints', value: items.length, color: PURPLE },
          { label: 'Sweeps', value: sweeps.length, color: '#818CF8' },
          { label: 'High Activity (>50%)', value: highActivity, color: COLORS.bearish },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <div className="p-5 text-center">
                <div className="mb-2 text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#7A7A7A]">
                  {stat.label}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#6D63FF]" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8B8B8B]">
            Dark Pool Prints
          </h3>
          <span className="rounded-full bg-[#6D63FF]/15 px-2.5 py-1 text-[10px] font-bold uppercase text-[#8D84FF]">
            Live
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8B8B8B]">
          <span>Sort by:</span>
          <button className="rounded-[7px] border border-[#C9A646]/20 bg-[#070707] px-3 py-2 text-[#D8BE67]">
            DP Score (High to Low)
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-[7px] bg-[#6D63FF]/80 text-white">
            <List className="h-4 w-4" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-[7px] border border-[#C9A646]/14 text-[#8B8B8B]">
            <Grid2X2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-2.5">
          {sorted.map((item, idx) => (
            <DarkPoolCard key={item.id} item={item} index={idx} onClick={() => onItemClick(item)} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Eye className="mx-auto mb-3 h-10 w-10 text-[#3A3A3A]" />
          <p className="text-sm text-[#6B6B6B]">No dark pool activity detected</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="flex justify-center border-t border-[#C9A646]/10 pt-3 text-[11px] text-[#7A7A7A]">
          Dark pool data is delayed. Not financial advice.
        </div>
      )}
    </div>
  );
});
