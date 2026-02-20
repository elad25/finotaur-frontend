// =====================================================
// 📋 FLOW SCANNER - All Flow Tab
// =====================================================

import { memo, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, ChevronRight, Sparkles, Search,
  BarChart3, DollarSign, Clock, Activity, X, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowItem, FlowTypeFilter, DirectionFilter, TabType } from '../shared/types';
import { FLOW_TYPE_CONFIG } from '../shared/constants';
import { filterFlowData } from '../shared/api';
import { Card, SearchBar, FilterSelect, SectionHeader } from '../shared/Ui';

// =====================================================
// Flow Card
// =====================================================

export const FlowCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const typeConfig = FLOW_TYPE_CONFIG[item.type];
  const TypeIcon = typeConfig.icon;
  const directionColor =
    item.direction === 'bullish' ? '#22C55E' :
    item.direction === 'bearish' ? '#EF4444' : '#8B8B8B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative p-5 rounded-xl transition-all duration-300 hover:scale-[1.005]"
        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${typeConfig.color}20` }}
      >
        {/* Left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ background: typeConfig.color }}
        />

        <div className="flex items-center gap-6 pl-3">
          {/* Ticker */}
          <div className="min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-white group-hover:text-[#C9A646] transition-colors">
                {item.ticker}
              </span>
              <span className="text-sm text-[#8B8B8B]">${item.price.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#6B6B6B] truncate max-w-[140px]">{item.company}</p>
          </div>

          {/* Type Badge */}
          <div className="flex items-center gap-2 min-w-[130px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${typeConfig.color}15` }}>
              <TypeIcon className="h-4 w-4" style={{ color: typeConfig.color }} />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-lg"
              style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
              {typeConfig.label}
            </span>
          </div>

          {/* Volume / Value / Time */}
          <div className="flex items-center gap-6 flex-1">
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Volume</div>
              <div className="text-base font-semibold text-white">
                {(item.volume / 1_000_000).toFixed(1)}M
              </div>
              <div className={cn('text-xs', item.volumeRatio > 1.5 ? 'text-[#F59E0B]' : 'text-[#6B6B6B]')}>
                {item.volumeRatio.toFixed(2)}x avg
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Value</div>
              <div className="text-base font-semibold text-[#C9A646]">{item.value}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Time</div>
              <div className="text-base font-semibold text-white">{item.time}</div>
            </div>
          </div>

          {/* Direction */}
          <div className="text-right min-w-[100px]">
            <div className="flex items-center justify-end gap-1 mb-2">
              {item.direction === 'bullish' && <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />}
              {item.direction === 'bearish' && <ArrowDownRight className="h-5 w-5 text-[#EF4444]" />}
              <span className="text-lg font-bold" style={{ color: directionColor }}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full capitalize"
              style={{ background: `${directionColor}15`, color: directionColor }}>
              {item.direction}
            </span>
          </div>

          <ChevronRight className="h-5 w-5 text-[#6B6B6B] group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all" />
        </div>

        {/* Signal */}
        <div className="mt-4 pt-4 border-t border-white/5 pl-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-[#C9A646]" />
            <span className="text-xs text-[#A0A0A0]">{item.signal}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// =====================================================
// Flow Drawer (detail panel)
// =====================================================

export const FlowDrawer = memo(({ isOpen, onClose, flow }: {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowItem | null;
}) => {
  if (!flow) return null;

  const typeConfig = FLOW_TYPE_CONFIG[flow.type];
  const TypeIcon = typeConfig.icon;
  const directionColor =
    flow.direction === 'bullish' ? '#22C55E' :
    flow.direction === 'bearish' ? '#EF4444' : '#8B8B8B';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[500px] z-[999] flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #0d0b08, #151210)',
              borderLeft: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-[#C9A646]/10">
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)' }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                      border: '2px solid rgba(201,166,70,0.3)',
                    }}>
                    <span className="text-[#C9A646] font-bold text-lg">{flow.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{flow.ticker}</h3>
                    <p className="text-sm text-[#6B6B6B]">{flow.company}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#C9A646]/30 transition-all"
                >
                  <X className="h-5 w-5 text-[#8B8B8B]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex gap-3">
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
                  <TypeIcon className="h-4 w-4" />
                  {typeConfig.label}
                </span>
                <span className="px-4 py-2 rounded-xl text-sm font-medium capitalize"
                  style={{ background: `${directionColor}15`, color: directionColor }}>
                  {flow.direction} Signal
                </span>
              </div>

              <Card>
                <div className="p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-[#6B6B6B] mb-1">Current Price</div>
                      <div className="text-4xl font-bold text-white">${flow.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {flow.direction === 'bullish' && <ArrowUpRight className="h-6 w-6" style={{ color: directionColor }} />}
                        {flow.direction === 'bearish' && <ArrowDownRight className="h-6 w-6" style={{ color: directionColor }} />}
                        <span className="text-2xl font-bold" style={{ color: directionColor }}>
                          {flow.changePercent >= 0 ? '+' : ''}{flow.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-sm" style={{ color: directionColor }}>
                        {flow.change >= 0 ? '+' : ''}${flow.change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Volume', value: `${(flow.volume / 1_000_000).toFixed(1)}M`, icon: BarChart3 },
                  { label: 'Vol Ratio', value: `${flow.volumeRatio.toFixed(2)}x`, icon: Activity, color: flow.volumeRatio > 1.5 ? '#F59E0B' : undefined },
                  { label: 'Value', value: flow.value, icon: DollarSign, color: '#C9A646' },
                  { label: 'Time', value: flow.time, icon: Clock },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="h-4 w-4 text-[#6B6B6B]" />
                      <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: stat.color || '#fff' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <Card highlight>
                <div className="relative p-5">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-[#C9A646]" />
                    <span className="text-sm text-[#C9A646] font-bold">Signal Analysis</span>
                  </div>
                  <p className="text-[#E8DCC4] leading-relaxed">{flow.signal}</p>
                </div>
              </Card>

              <Card>
                <div className="p-5">
                  <h4 className="text-sm font-semibold text-white mb-4">Volume Analysis</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#6B6B6B]">Today's Volume</span>
                        <span className="text-white">{(flow.volume / 1_000_000).toFixed(1)}M</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${Math.min(flow.volumeRatio * 30, 100)}%`,
                            background: flow.volumeRatio > 2
                              ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                              : 'linear-gradient(90deg, #C9A646, #F4D97B)',
                          }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#6B6B6B]">Average Volume</span>
                        <span className="text-[#8B8B8B]">{(flow.avgVolume / 1_000_000).toFixed(1)}M</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6B6B6B] rounded-full" style={{ width: '30%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="p-6 border-t border-[#C9A646]/10">
              <button
                className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
                }}
              >
                Add to Watchlist
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// =====================================================
// Signal Feed Item
// =====================================================

export const SignalFeedItem = memo(({ item, index }: { item: FlowItem; index: number }) => {
  const directionColor =
    item.direction === 'bullish' ? '#22C55E' :
    item.direction === 'bearish' ? '#EF4444' : '#8B8B8B';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
    >
      <div className="flex items-center gap-2 text-[#6B6B6B]">
        <Clock className="h-4 w-4" />
        <span className="text-xs">{item.time}</span>
      </div>
      <div className="w-px h-8 bg-[#C9A646]/20" />
      <span className="font-bold text-[#C9A646] min-w-[60px]">{item.ticker}</span>
      <p className="text-sm text-[#A0A0A0] flex-1 line-clamp-1">{item.signal}</p>
      <div className="flex items-center gap-1">
        {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: directionColor }} />}
        {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: directionColor }} />}
        <span className="text-sm font-semibold" style={{ color: directionColor }}>
          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
});

// =====================================================
// All Flow Tab (main export)
// =====================================================

interface AllFlowTabProps {
  flowData: FlowItem[];
  activeTab: TabType;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default memo(function AllFlowTab({ flowData, activeTab, onRefresh, isRefreshing }: AllFlowTabProps) {
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState<FlowTypeFilter>('all');
  const [filterDir, setFilterDir]   = useState<DirectionFilter>('all');
  const [selected, setSelected]     = useState<FlowItem | null>(null);

  const filtered = useMemo(
    () => filterFlowData(flowData, activeTab, search, filterType, filterDir),
    [flowData, activeTab, search, filterType, filterDir]
  );

  const handleClick = useCallback((item: FlowItem) => setSelected(item), []);
  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <>
      <Card className="mb-8">
        <div className="p-6 md:p-8">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <SearchBar value={search} onChange={setSearch} />

            <FilterSelect
              value={filterType}
              onChange={v => setFilterType(v as FlowTypeFilter)}
              placeholder="Flow Type"
              options={[
                { value: 'all',             label: 'All Types'      },
                { value: 'unusual_volume',  label: 'Unusual Volume' },
                { value: 'institutional',   label: 'Institutional'  },
                { value: 'insider',         label: 'Insider'        },
                { value: 'dark_pool',       label: 'Dark Pool'      },
                { value: 'accumulation',    label: 'Accumulation'   },
              ]}
            />

            <FilterSelect
              value={filterDir}
              onChange={v => setFilterDir(v as DirectionFilter)}
              placeholder="Direction"
              options={[
                { value: 'all',     label: 'All Directions' },
                { value: 'bullish', label: 'Bullish'        },
                { value: 'bearish', label: 'Bearish'        },
                { value: 'neutral', label: 'Neutral'        },
              ]}
            />

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-auto flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-[#C9A646] transition-all hover:bg-[#C9A646]/10 disabled:opacity-50"
              style={{ border: '1px solid rgba(201,166,70,0.2)' }}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Flow List */}
          <div className="space-y-3">
            {filtered.length > 0 ? (
              filtered.map((item, idx) => (
                <FlowCard key={item.id} item={item} index={idx} onClick={() => handleClick(item)} />
              ))
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-[#6B6B6B] mx-auto mb-4" />
                <p className="text-[#8B8B8B]">No flows match your filters</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <FlowDrawer isOpen={!!selected} onClose={handleClose} flow={selected} />
    </>
  );
});
