// =====================================================
// ⚡ FLOW SCANNER — Confluence Tab
// 3+ signals firing on the same ticker simultaneously
// This is where the real alpha is
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { GitMerge, ArrowUpRight, ArrowDownRight, Zap, AlertTriangle } from 'lucide-react';
import { FlowItem } from '../shared/types';
import { FLOW_TYPE_CONFIG, COLORS } from '../shared/constants';
import { Card } from '../shared/Ui';

// ─────────────────────────────────────────────────────
// Score Ring (SVG)
// ─────────────────────────────────────────────────────

const ScoreRing = memo(({ score }: { score: number }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#EF4444' : score >= 60 ? '#F59E0B' : '#6366F1';

  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 rotate-[-90deg]" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="relative text-center">
        <div className="text-sm font-bold leading-none" style={{ color }}>{score}</div>
        <div className="text-[8px] text-[#6B6B6B] uppercase tracking-wider mt-0.5">score</div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────
// Confluence Card
// ─────────────────────────────────────────────────────

const ConfluenceCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const score = item.confluenceScore ?? 0;
  const signals = item.activeSignals ?? [];
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;

  const urgency = score >= 80 ? 'critical' : score >= 60 ? 'high' : 'moderate';
  const urgencyConfig = {
    critical: { label: 'Critical',  color: '#EF4444', bg: 'rgba(239,68,68,0.07)'  },
    high:     { label: 'High',      color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
    moderate: { label: 'Moderate',  color: '#6366F1', bg: 'rgba(99,102,241,0.05)' },
  }[urgency];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.07, ease: 'easeOut' }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative p-5 rounded-xl transition-all duration-200 hover:scale-[1.003]"
        style={{
          background: urgencyConfig.bg,
          border: `1px solid ${urgencyConfig.color}30`,
          boxShadow: urgency === 'critical'
            ? `0 0 28px ${urgencyConfig.color}12`
            : 'none',
        }}
      >
        {/* Top gradient line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
          style={{ background: `linear-gradient(90deg, transparent, ${urgencyConfig.color}, transparent)` }}
        />

        <div className="flex items-center gap-5">
          {/* Score ring */}
          <ScoreRing score={score} />

          {/* Ticker + urgency */}
          <div className="min-w-[110px]">
            <div className="flex items-center gap-2 mb-0.5">
              {urgency === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />}
              <span className="text-xl font-bold text-white group-hover:text-[#EF4444] transition-colors">
                {item.ticker}
              </span>
            </div>
            <p className="text-[10px] text-[#6B6B6B] truncate max-w-[110px] mb-1">{item.company}</p>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${urgencyConfig.color}15`, color: urgencyConfig.color }}
            >
              {urgencyConfig.label} Confluence
            </span>
          </div>

          {/* Active signals */}
          <div className="flex-1">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-2">
              {signals.length} Signals Active
            </div>
            <div className="flex flex-wrap gap-1.5">
              {signals.map(sig => {
                const cfg = FLOW_TYPE_CONFIG[sig];
                return (
                  <span
                    key={sig}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${cfg.color}15`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Price + change */}
          <div className="text-right ml-auto min-w-[90px]">
            <div className="text-base font-bold text-white mb-0.5">
              ${item.price.toFixed(2)}
            </div>
            <div className="flex items-center justify-end gap-0.5">
              {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: dirColor }} />}
              {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: dirColor }} />}
              <span className="text-base font-bold" style={{ color: dirColor }}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] text-[#6B6B6B] mt-0.5">{item.time}</div>
          </div>
        </div>

        {/* Signal summary */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-start gap-2">
          <GitMerge className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: urgencyConfig.color }} />
          <p className="text-xs text-[#8B8B8B] leading-relaxed line-clamp-2">{item.signal}</p>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────
// Confluence Tab
// ─────────────────────────────────────────────────────

interface ConfluenceTabProps {
  flowData: FlowItem[];
  onItemClick: (item: FlowItem) => void;
}

export default memo(function ConfluenceTab({ flowData, onItemClick }: ConfluenceTabProps) {
  const items = flowData
    .filter(i => i.type === 'confluence')
    .sort((a, b) => (b.confluenceScore ?? 0) - (a.confluenceScore ?? 0));

  const critical = items.filter(i => (i.confluenceScore ?? 0) >= 80);
  const high     = items.filter(i => (i.confluenceScore ?? 0) >= 60 && (i.confluenceScore ?? 0) < 80);
  const moderate = items.filter(i => (i.confluenceScore ?? 0) < 60);

  return (
    <div className="space-y-6">
      {/* Header explanation */}
      <Card>
        <div className="p-4 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }}
          >
            <GitMerge className="h-4 w-4 text-[#EF4444]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">What is Confluence?</p>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              When 3+ independent signals fire on the same ticker simultaneously —
              dark pool activity, insider buying, AND unusual volume together —
              the probability of a meaningful move increases dramatically.
              These are the highest-conviction setups in the scanner.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '🔴 Critical (80+)', value: critical.length, color: '#EF4444' },
          { label: '🟡 High (60-79)',   value: high.length,     color: '#F59E0B' },
          { label: '🔵 Moderate (<60)', value: moderate.length, color: '#6366F1' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] text-[#6B6B6B]">{stat.label}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Critical */}
      {critical.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            <h3 className="text-sm font-semibold text-[#EF4444] uppercase tracking-wider">Critical Alerts</h3>
          </div>
          <div className="space-y-3">
            {critical.map((item, idx) => (
              <ConfluenceCard key={item.id} item={item} index={idx} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </div>
      )}

      {/* High */}
      {high.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-[#8B8B8B] uppercase tracking-wider">High Confluence</h3>
          </div>
          <div className="space-y-3">
            {high.map((item, idx) => (
              <ConfluenceCard key={item.id} item={item} index={idx + critical.length} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </div>
      )}

      {/* Moderate */}
      {moderate.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GitMerge className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wider">Moderate Confluence</h3>
          </div>
          <div className="space-y-3">
            {moderate.map((item, idx) => (
              <ConfluenceCard key={item.id} item={item} index={idx + critical.length + high.length} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16">
          <GitMerge className="h-10 w-10 text-[#3A3A3A] mx-auto mb-3" />
          <p className="text-sm text-[#6B6B6B]">No confluence alerts at this time</p>
          <p className="text-xs text-[#4A4A4A] mt-1">
            Confluence requires 3+ signals on the same ticker
          </p>
        </div>
      )}
    </div>
  );
});
