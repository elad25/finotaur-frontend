// =====================================================
// 👤 FLOW SCANNER — Insider & Institutional Tab
// Form 4 filings + 13F institutional moves
// =====================================================

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building, ArrowUpRight, ArrowDownRight, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowItem } from '../shared/types';
import { COLORS } from '../shared/constants';
import { Card } from '../shared/Ui';

// ─────────────────────────────────────────────────────
// Sub-tab
// ─────────────────────────────────────────────────────

type SubTab = 'all' | 'insider' | 'institutional';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all',           label: 'All',          icon: Users    },
  { id: 'insider',       label: 'Insider',       icon: Users    },
  { id: 'institutional', label: 'Institutional', icon: Building },
];

// ─────────────────────────────────────────────────────
// Insider Card
// ─────────────────────────────────────────────────────

const InsiderCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const isCluster = item.type === 'cluster_insider';
  const isBuy = item.type === 'insider_buy' || isCluster;
  const accentColor = isCluster ? '#A855F7' : isBuy ? COLORS.bullish : COLORS.bearish;
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;

  const formTypeBadge = item.form4Type === 'open_market'
    ? { label: '🟢 Open Market', color: COLORS.bullish }
    : item.form4Type === '10b5-1'
    ? { label: '⚪ 10b5-1 Plan', color: '#8B8B8B' }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: 'easeOut' }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative p-5 rounded-xl transition-all duration-200 hover:scale-[1.002]"
        style={{
          background: isCluster
            ? 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(10,9,7,0.99))'
            : 'rgba(255,255,255,0.018)',
          border: `1px solid ${accentColor}${isCluster ? '30' : '18'}`,
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: accentColor }} />

        <div className="flex items-center gap-5 pl-3">
          {/* Ticker */}
          <div className="min-w-[120px]">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isCluster && <Star className="h-3 w-3 fill-current" style={{ color: '#A855F7' }} />}
              <span className="text-lg font-bold text-white group-hover:text-[#A855F7] transition-colors">
                {item.ticker}
              </span>
            </div>
            <p className="text-[10px] text-[#6B6B6B] truncate max-w-[120px]">{item.company}</p>
          </div>

          {/* Insider info */}
          <div className="flex-1 min-w-0">
            {isCluster ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#A855F7]" />
                  <span className="text-sm font-bold text-[#A855F7]">
                    {item.clusterCount} Insiders Buying
                  </span>
                </div>
                <p className="text-[11px] text-[#8B8B8B]">CEO + CTO + CFO + Board — same week</p>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-white truncate">
                  {item.insiderName ?? '—'}
                </div>
                <div className="text-[10px] text-[#6B6B6B]">{item.insiderTitle}</div>
              </div>
            )}
          </div>

          {/* Shares + Value */}
          <div className="text-center min-w-[80px]">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Shares</div>
            <div className="text-sm font-bold text-white">
              {item.insiderShares ? item.insiderShares.toLocaleString() : '—'}
            </div>
          </div>
          <div className="text-center min-w-[70px]">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Value</div>
            <div className="text-sm font-bold" style={{ color: COLORS.gold }}>{item.value}</div>
          </div>

          {/* Form type badge */}
          {formTypeBadge && (
            <div
              className="text-[10px] font-semibold px-2 py-1 rounded-lg hidden md:block"
              style={{ background: `${formTypeBadge.color}12`, color: formTypeBadge.color }}
            >
              {formTypeBadge.label}
            </div>
          )}

          {/* Direction */}
          <div className="flex items-center gap-1 ml-auto">
            {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: dirColor }} />}
            {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: dirColor }} />}
            <span className="text-sm font-bold" style={{ color: dirColor }}>
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Signal */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] pl-3">
          <p className="text-[11px] text-[#8B8B8B] line-clamp-2">{item.signal}</p>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────
// Institutional Card
// ─────────────────────────────────────────────────────

const InstitutionalCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const isNew = item.type === 'institutional_new';
  const isExit = item.type === 'institutional_exit';
  const accentColor = isNew ? '#3B82F6' : isExit ? '#EF4444' : '#60A5FA';
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: 'easeOut' }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative p-5 rounded-xl transition-all duration-200 hover:scale-[1.002]"
        style={{
          background: isNew
            ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(10,9,7,0.99))'
            : 'rgba(255,255,255,0.018)',
          border: `1px solid ${accentColor}22`,
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: accentColor }} />

        <div className="flex items-center gap-5 pl-3">
          {/* Ticker */}
          <div className="min-w-[120px]">
            <span className="text-lg font-bold text-white group-hover:text-[#3B82F6] transition-colors">
              {item.ticker}
            </span>
            <p className="text-[10px] text-[#6B6B6B] truncate max-w-[120px]">{item.company}</p>
          </div>

          {/* Institution */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Building className="h-3.5 w-3.5 text-[#6B6B6B]" />
              <span className="text-sm font-semibold text-white truncate">
                {item.institutionName ?? '—'}
              </span>
            </div>
            <div
              className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block"
              style={{ background: `${accentColor}12`, color: accentColor }}
            >
              {isNew ? '🆕 New Position' : isExit ? '🚪 Full Exit' : '➕ Increased'}
            </div>
          </div>

          {/* Portfolio % */}
          {item.portfolioPercent != null && (
            <div className="text-center min-w-[70px]">
              <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Portfolio</div>
              <div className="text-sm font-bold text-white">{item.portfolioPercent}%</div>
            </div>
          )}

          {/* Value */}
          <div className="text-center min-w-[70px]">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Value</div>
            <div className="text-sm font-bold" style={{ color: COLORS.gold }}>{item.value}</div>
          </div>

          {/* Direction */}
          <div className="flex items-center gap-1 ml-auto">
            {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: dirColor }} />}
            {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: dirColor }} />}
            <span className="text-sm font-bold" style={{ color: dirColor }}>
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.04] pl-3">
          <p className="text-[11px] text-[#8B8B8B] line-clamp-2">{item.signal}</p>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────
// Insider & Institutional Tab
// ─────────────────────────────────────────────────────

interface InsiderInstitutionalTabProps {
  flowData: FlowItem[];
  onItemClick: (item: FlowItem) => void;
}

export default memo(function InsiderInstitutionalTab({ flowData, onItemClick }: InsiderInstitutionalTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('all');

  const insiderTypes = ['insider_buy', 'insider_sell', 'cluster_insider'];
  const institutionalTypes = ['institutional_new', 'institutional_increase', 'institutional_exit'];

  const insiderItems = flowData.filter(i => insiderTypes.includes(i.type));
  const institutionalItems = flowData.filter(i => institutionalTypes.includes(i.type));
  const allItems = [...insiderItems, ...institutionalItems];

  const displayed = subTab === 'insider'
    ? insiderItems
    : subTab === 'institutional'
    ? institutionalItems
    : allItems;

  // Stats
  const clusterBuys = insiderItems.filter(i => i.type === 'cluster_insider').length;
  const newPositions = institutionalItems.filter(i => i.type === 'institutional_new').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Insider Trades',   value: insiderItems.length,      color: '#A855F7' },
          { label: 'Cluster Buys',     value: clusterBuys,              color: '#22C55E' },
          { label: 'Institutional',    value: institutionalItems.length, color: '#3B82F6' },
          { label: 'New Positions',    value: newPositions,             color: '#F59E0B' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <div className="p-4 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{stat.label}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sub-tab nav */}
      <div className="flex items-center gap-2 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                active ? 'bg-white/[0.08] text-white' : 'text-[#6B6B6B] hover:text-[#A0A0A0]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#fff' : '#6B6B6B',
                }}>
                {t.id === 'all' ? allItems.length :
                 t.id === 'insider' ? insiderItems.length : institutionalItems.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {displayed.length > 0 ? displayed.map((item, idx) =>
          insiderTypes.includes(item.type)
            ? <InsiderCard key={item.id} item={item} index={idx} onClick={() => onItemClick(item)} />
            : <InstitutionalCard key={item.id} item={item} index={idx} onClick={() => onItemClick(item)} />
        ) : (
          <div className="text-center py-14">
            <Users className="h-10 w-10 text-[#3A3A3A] mx-auto mb-3" />
            <p className="text-[#6B6B6B] text-sm">No signals in this category</p>
          </div>
        )}
      </div>
    </div>
  );
});
