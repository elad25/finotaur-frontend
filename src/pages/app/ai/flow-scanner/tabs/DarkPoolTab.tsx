// =====================================================
// 🌑 FLOW SCANNER — Dark Pool Tab
// Off-exchange institutional prints + sweeps
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Eye, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { FlowItem } from '../shared/types';
import { COLORS } from '../shared/constants';
import { Card, SectionHeader } from '../shared/Ui';

// ─────────────────────────────────────────────────────
// DP Percentage Bar
// ─────────────────────────────────────────────────────

const DPBar = memo(({ percent, color }: { percent: number; color: string }) => (
  <div className="w-full">
    <div className="flex justify-between text-[10px] mb-1">
      <span className="text-[#6B6B6B]">Dark Pool %</span>
      <span style={{ color }}>{percent}%</span>
    </div>
    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
      />
    </div>
  </div>
));

// ─────────────────────────────────────────────────────
// Dark Pool Card
// ─────────────────────────────────────────────────────

const DarkPoolCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const isSweep = item.type === 'dark_pool_sweep';
  const accentColor = isSweep ? '#818CF8' : '#6366F1';
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;
  const dpPct = item.darkPoolPercent ?? 0;

  // Visual intensity based on DP%
  const intensity = dpPct > 50 ? 'high' : dpPct > 35 ? 'medium' : 'low';
  const intensityColor = { high: '#EF4444', medium: '#F59E0B', low: '#6366F1' }[intensity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, ease: 'easeOut' }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative p-5 rounded-xl transition-all duration-200 hover:scale-[1.002]"
        style={{
          background: isSweep
            ? 'linear-gradient(135deg, rgba(129,140,248,0.06), rgba(10,9,7,0.99))'
            : 'rgba(255,255,255,0.018)',
          border: `1px solid ${accentColor}22`,
        }}
      >
        {/* Left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: accentColor }}
        />

        <div className="flex items-start gap-5 pl-3">
          {/* Ticker */}
          <div className="min-w-[110px]">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isSweep && <Zap className="h-3 w-3 text-[#818CF8]" />}
              <span className="text-lg font-bold text-white group-hover:text-[#6366F1] transition-colors">
                {item.ticker}
              </span>
            </div>
            <p className="text-[10px] text-[#6B6B6B] truncate max-w-[110px]">{item.company}</p>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block"
              style={{ background: `${accentColor}15`, color: accentColor }}
            >
              {isSweep ? 'DP Sweep' : 'Dark Pool'}
            </span>
          </div>

          {/* DP metrics */}
          <div className="flex-1 space-y-2">
            <DPBar percent={dpPct} color={intensityColor} />

            {/* Intensity badge */}
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: `${intensityColor}15`, color: intensityColor }}
              >
                {intensity === 'high' ? '🔴 High' :
                 intensity === 'medium' ? '🟡 Medium' : '🔵 Normal'} DP Activity
              </span>
              {item.dpPrintSize && (
                <span className="text-xs text-[#C9A646] font-semibold">
                  Largest print: {item.dpPrintSize}
                </span>
              )}
            </div>
          </div>

          {/* Price + direction */}
          <div className="text-right min-w-[100px]">
            <div className="text-base font-bold text-white mb-0.5">
              ${item.price.toFixed(2)}
            </div>
            <div className="flex items-center justify-end gap-0.5">
              {item.direction === 'bullish' && <ArrowUpRight className="h-3.5 w-3.5" style={{ color: dirColor }} />}
              {item.direction === 'bearish' && <ArrowDownRight className="h-3.5 w-3.5" style={{ color: dirColor }} />}
              <span className="text-sm font-bold" style={{ color: dirColor }}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] text-[#6B6B6B] mt-1">{item.time}</div>
          </div>
        </div>

        {/* Signal */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] pl-3">
          <p className="text-[11px] text-[#8B8B8B] leading-relaxed line-clamp-2">{item.signal}</p>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────
// Dark Pool Tab
// ─────────────────────────────────────────────────────

interface DarkPoolTabProps {
  flowData: FlowItem[];
  onItemClick: (item: FlowItem) => void;
}

export default memo(function DarkPoolTab({ flowData, onItemClick }: DarkPoolTabProps) {
  const items = flowData.filter(i => i.type === 'dark_pool' || i.type === 'dark_pool_sweep');
  const sweeps = items.filter(i => i.type === 'dark_pool_sweep');
  const regular = items.filter(i => i.type === 'dark_pool');

  // Summary stats
  const avgDPPct = items.length
    ? Math.round(items.reduce((sum, i) => sum + (i.darkPoolPercent ?? 0), 0) / items.length)
    : 0;
  const highActivity = items.filter(i => (i.darkPoolPercent ?? 0) > 50).length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Prints', value: items.length, color: '#6366F1' },
          { label: 'Sweeps', value: sweeps.length, color: '#818CF8' },
          { label: 'High Activity (>50%)', value: highActivity, color: '#EF4444' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sweeps first */}
      {sweeps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[#818CF8]" />
            <h3 className="text-sm font-semibold text-[#818CF8] uppercase tracking-wider">
              Sweep Alerts
            </h3>
            <span className="text-xs text-[#6B6B6B]">— urgent institutional moves</span>
          </div>
          <div className="space-y-2.5">
            {sweeps.map((item, idx) => (
              <DarkPoolCard key={item.id} item={item} index={idx} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </div>
      )}

      {/* Regular DP prints */}
      {regular.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Dark Pool Prints
            </h3>
          </div>
          <div className="space-y-2.5">
            {regular.map((item, idx) => (
              <DarkPoolCard key={item.id} item={item} index={idx + sweeps.length} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16">
          <Eye className="h-10 w-10 text-[#3A3A3A] mx-auto mb-3" />
          <p className="text-[#6B6B6B] text-sm">No dark pool activity detected</p>
        </div>
      )}
    </div>
  );
});
