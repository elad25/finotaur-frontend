// =====================================================
// 📋 FLOW SCANNER — All Flow Tab v2
// Universal card that renders correctly for every signal type
// =====================================================

import { memo, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, ChevronRight, Sparkles,
  Search, BarChart3, DollarSign, Clock, X, RefreshCw,
  GitMerge, Eye, Users, Zap, Activity, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowItem, FlowTypeFilter, DirectionFilter, TabType } from '../shared/types';
import { FLOW_TYPE_CONFIG, COLORS } from '../shared/constants';
import { filterFlowData } from '../shared/api';
import { Card, SearchBar, FilterSelect, SectionHeader } from '../shared/Ui';

// ─────────────────────────────────────────────────────
// Signal type filter options (for the All Flow dropdown)
// ─────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: FlowTypeFilter; label: string }[] = [
  { value: 'all',                   label: 'All Types'           },
  { value: 'unusual_volume',        label: 'Unusual Volume'      },
  { value: 'block_trade',           label: 'Block Trade'         },
  { value: 'sweep',                 label: 'Sweep Order'         },
  { value: 'dark_pool',             label: 'Dark Pool'           },
  { value: 'dark_pool_sweep',       label: 'Dark Pool Sweep'     },
  { value: 'insider_buy',           label: 'Insider Buy'         },
  { value: 'insider_sell',          label: 'Insider Sell'        },
  { value: 'cluster_insider',       label: 'Cluster Buying'      },
  { value: 'institutional_new',     label: 'New Position'        },
  { value: 'institutional_increase',label: 'Position Increase'   },
  { value: 'short_squeeze',         label: 'Short Squeeze'       },
  { value: 'confluence',            label: 'Confluence Alert'    },
];

// ─────────────────────────────────────────────────────
// Sub-detail row — different per signal category
// ─────────────────────────────────────────────────────

const SignalSubDetails = memo(({ item }: { item: FlowItem }) => {
  const cfg = FLOW_TYPE_CONFIG[item.type];

  // Dark pool
  if (item.type === 'dark_pool' || item.type === 'dark_pool_sweep') {
    return (
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">DP %</div>
          <div className="text-sm font-bold" style={{ color: cfg.color }}>
            {item.darkPoolPercent ?? '—'}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Print Size</div>
          <div className="text-sm font-bold text-white">{item.dpPrintSize ?? '—'}</div>
        </div>
      </div>
    );
  }

  // Insider
  if (['insider_buy', 'insider_sell', 'cluster_insider'].includes(item.type)) {
    return (
      <div className="flex items-center gap-6">
        {item.clusterCount ? (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Insiders</div>
            <div className="text-sm font-bold" style={{ color: cfg.color }}>{item.clusterCount}</div>
          </div>
        ) : item.insiderName ? (
          <div>
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">
              {item.insiderTitle ?? 'Insider'}
            </div>
            <div className="text-xs font-semibold text-white truncate max-w-[140px]">
              {item.insiderName}
            </div>
          </div>
        ) : null}
        {item.insiderShares && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Shares</div>
            <div className="text-sm font-bold text-white">
              {item.insiderShares.toLocaleString()}
            </div>
          </div>
        )}
        {item.form4Type && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Form</div>
            <div
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: item.form4Type === 'open_market' ? `${COLORS.bullish}18` : 'rgba(255,255,255,0.05)',
                color: item.form4Type === 'open_market' ? COLORS.bullish : COLORS.textMuted,
              }}
            >
              {item.form4Type === 'open_market' ? 'Open Market' :
               item.form4Type === '10b5-1' ? '10b5-1 Plan' : item.form4Type}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Institutional
  if (['institutional_new', 'institutional_increase', 'institutional_exit'].includes(item.type)) {
    return (
      <div className="flex items-center gap-6">
        {item.institutionName && (
          <div>
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Institution</div>
            <div className="text-xs font-semibold text-white truncate max-w-[160px]">
              {item.institutionName}
            </div>
          </div>
        )}
        {item.isNewPosition !== undefined && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Type</div>
            <div
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: item.isNewPosition ? `${cfg.color}18` : 'rgba(255,255,255,0.05)',
                color: item.isNewPosition ? cfg.color : COLORS.textMuted,
              }}
            >
              {item.isNewPosition ? '🆕 New Position' : 'Increased'}
            </div>
          </div>
        )}
        {item.portfolioPercent != null && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">% Portfolio</div>
            <div className="text-sm font-bold text-white">{item.portfolioPercent}%</div>
          </div>
        )}
      </div>
    );
  }

  // Short squeeze
  if (item.type === 'short_squeeze') {
    return (
      <div className="flex items-center gap-6">
        {item.shortInterestPercent != null && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Short Interest</div>
            <div className="text-sm font-bold" style={{ color: COLORS.warning }}>
              {item.shortInterestPercent}%
            </div>
          </div>
        )}
        {item.daysToCover != null && (
          <div className="text-center">
            <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Days to Cover</div>
            <div className="text-sm font-bold text-white">{item.daysToCover}</div>
          </div>
        )}
      </div>
    );
  }

  // Confluence
  if (item.type === 'confluence') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {(item.activeSignals ?? []).map(sig => {
          const sigCfg = FLOW_TYPE_CONFIG[sig];
          return (
            <span
              key={sig}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${sigCfg.color}18`, color: sigCfg.color }}
            >
              {sigCfg.label}
            </span>
          );
        })}
      </div>
    );
  }

  return null;
});

// ─────────────────────────────────────────────────────
// Flow Card
// ─────────────────────────────────────────────────────

export const FlowCard = memo(({ item, index, onClick }: {
  item: FlowItem;
  index: number;
  onClick: () => void;
}) => {
  const cfg = FLOW_TYPE_CONFIG[item.type];
  const TypeIcon = cfg.icon;
  const dirColor =
    item.direction === 'bullish' ? COLORS.bullish :
    item.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;

  const isConfluence = item.type === 'confluence';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, ease: 'easeOut' }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="relative rounded-xl transition-all duration-200 hover:scale-[1.002]"
        style={{
          background: isConfluence
            ? `linear-gradient(135deg, rgba(239,68,68,0.06), rgba(13,11,8,0.98))`
            : 'rgba(255,255,255,0.018)',
          border: `1px solid ${cfg.color}${isConfluence ? '35' : '18'}`,
          boxShadow: isConfluence ? `0 0 20px rgba(239,68,68,0.08)` : 'none',
        }}
      >
        {/* Left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: isConfluence
            ? `linear-gradient(180deg, ${cfg.color}, ${cfg.color}80)`
            : cfg.color
          }}
        />

        <div className="flex flex-col gap-3 p-4 pl-5">
          {/* Top row */}
          <div className="flex items-center gap-5">
            {/* Ticker + price */}
            <div className="min-w-[130px]">
              <div className="flex items-center gap-2 mb-0.5">
                {isConfluence && (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />
                )}
                <span className="text-lg font-bold text-white group-hover:text-[#C9A646] transition-colors">
                  {item.ticker}
                </span>
                <span className="text-xs text-[#6B6B6B]">${item.price.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] truncate max-w-[130px]">{item.company}</p>
            </div>

            {/* Type badge */}
            <div className="flex items-center gap-2 min-w-[150px]">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.color}15` }}
              >
                <TypeIcon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: `${cfg.color}12`, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>

            {/* Volume + Value */}
            <div className="flex items-center gap-5 flex-1">
              {!isConfluence && (
                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Volume</div>
                  <div className="text-sm font-bold text-white">
                    {(item.volume / 1_000_000).toFixed(1)}M
                  </div>
                  <div className={cn(
                    'text-[10px]',
                    item.volumeRatio > 2 ? 'text-[#F59E0B]' :
                    item.volumeRatio > 1.5 ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'
                  )}>
                    {item.volumeRatio.toFixed(2)}x avg
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Value</div>
                <div className="text-sm font-bold" style={{ color: COLORS.gold }}>{item.value}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Time</div>
                <div className="text-sm font-bold text-white">{item.time}</div>
              </div>
              {isConfluence && item.confluenceScore != null && (
                <div>
                  <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-0.5">Score</div>
                  <div className="text-sm font-bold" style={{ color: cfg.color }}>
                    {item.confluenceScore}/100
                  </div>
                </div>
              )}
            </div>

            {/* Direction */}
            <div className="flex items-center gap-1.5 ml-auto">
              {item.direction === 'bullish' && <ArrowUpRight className="h-4 w-4" style={{ color: dirColor }} />}
              {item.direction === 'bearish' && <ArrowDownRight className="h-4 w-4" style={{ color: dirColor }} />}
              <span className="text-base font-bold" style={{ color: dirColor }}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
              <ChevronRight className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#C9A646]
                                       group-hover:translate-x-0.5 transition-all ml-1" />
            </div>
          </div>

          {/* Sub-details row */}
          <div className="flex items-center justify-between pl-0">
            <SignalSubDetails item={item} />
          </div>

          {/* Signal narrative */}
          <div className="pt-2 border-t border-white/[0.04] flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-[#C9A646] mt-0.5 flex-shrink-0" />
            <span className="text-xs text-[#8B8B8B] leading-relaxed line-clamp-2">
              {item.signal}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────
// Flow Drawer (detail panel)
// ─────────────────────────────────────────────────────

export const FlowDrawer = memo(({ isOpen, onClose, flow }: {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowItem | null;
}) => {
  if (!flow) return null;

  const cfg = FLOW_TYPE_CONFIG[flow.type];
  const TypeIcon = cfg.icon;
  const dirColor =
    flow.direction === 'bullish' ? COLORS.bullish :
    flow.direction === 'bearish' ? COLORS.bearish : COLORS.neutral;

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
            className="fixed top-0 right-0 bottom-0 w-[480px] z-[999] flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #0d0b08, #111008)',
              borderLeft: `1px solid ${cfg.color}25`,
            }}
          >
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, ${cfg.color}80, transparent)` }} />

            {/* Header */}
            <div className="p-6 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${cfg.color}18`,
                      border: `1px solid ${cfg.color}30`,
                    }}
                  >
                    <TypeIcon className="h-6 w-6" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{flow.ticker}</h3>
                    <p className="text-xs text-[#6B6B6B]">{flow.company}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg flex items-center justify-center
                             bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]
                             transition-all"
                >
                  <X className="h-4 w-4 text-[#8B8B8B]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: `${cfg.color}15`, color: cfg.color }}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {cfg.label}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                  style={{ background: `${dirColor}15`, color: dirColor }}>
                  {flow.direction}
                </span>
                {flow.confluenceScore != null && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                    Score {flow.confluenceScore}/100
                  </span>
                )}
              </div>

              {/* Price card */}
              <div
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">Current Price</div>
                    <div className="text-3xl font-bold text-white">${flow.price.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {flow.direction === 'bullish' && <ArrowUpRight className="h-5 w-5" style={{ color: dirColor }} />}
                      {flow.direction === 'bearish' && <ArrowDownRight className="h-5 w-5" style={{ color: dirColor }} />}
                      <span className="text-2xl font-bold" style={{ color: dirColor }}>
                        {flow.changePercent >= 0 ? '+' : ''}{flow.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: dirColor }}>
                      {flow.change >= 0 ? '+' : ''}${flow.change.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Volume', value: `${(flow.volume / 1_000_000).toFixed(1)}M`, icon: BarChart3 },
                  { label: 'Vol Ratio', value: `${flow.volumeRatio.toFixed(2)}x`, icon: Activity, color: flow.volumeRatio > 2 ? COLORS.warning : undefined },
                  { label: 'Value', value: flow.value, icon: DollarSign, color: COLORS.gold },
                  { label: 'Time', value: flow.time, icon: Clock },
                ].map(stat => (
                  <div key={stat.label}
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.022)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <stat.icon className="h-3.5 w-3.5 text-[#6B6B6B]" />
                      <span className="text-[9px] text-[#6B6B6B] uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className="text-lg font-bold" style={{ color: stat.color ?? '#fff' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Type-specific detail */}
              {(flow.darkPoolPercent != null || flow.insiderName || flow.institutionName || flow.clusterCount) && (
                <div
                  className="p-4 rounded-xl space-y-3"
                  style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TypeIcon className="h-4 w-4" style={{ color: cfg.color }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                      {cfg.label} Details
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {flow.darkPoolPercent != null && (
                      <div><span className="text-[#6B6B6B] text-xs">Dark Pool %</span>
                        <p className="font-bold" style={{ color: cfg.color }}>{flow.darkPoolPercent}%</p></div>
                    )}
                    {flow.dpPrintSize && (
                      <div><span className="text-[#6B6B6B] text-xs">Print Size</span>
                        <p className="font-bold text-white">{flow.dpPrintSize}</p></div>
                    )}
                    {flow.insiderName && (
                      <div><span className="text-[#6B6B6B] text-xs">{flow.insiderTitle ?? 'Insider'}</span>
                        <p className="font-bold text-white">{flow.insiderName}</p></div>
                    )}
                    {flow.insiderShares && (
                      <div><span className="text-[#6B6B6B] text-xs">Shares</span>
                        <p className="font-bold text-white">{flow.insiderShares.toLocaleString()}</p></div>
                    )}
                    {flow.clusterCount && (
                      <div><span className="text-[#6B6B6B] text-xs">Cluster</span>
                        <p className="font-bold" style={{ color: cfg.color }}>{flow.clusterCount} insiders</p></div>
                    )}
                    {flow.form4Type && (
                      <div><span className="text-[#6B6B6B] text-xs">Form Type</span>
                        <p className="font-bold text-white">{flow.form4Type === 'open_market' ? 'Open Market' : flow.form4Type}</p></div>
                    )}
                    {flow.institutionName && (
                      <div className="col-span-2"><span className="text-[#6B6B6B] text-xs">Institution</span>
                        <p className="font-bold text-white">{flow.institutionName}</p></div>
                    )}
                    {flow.portfolioPercent != null && (
                      <div><span className="text-[#6B6B6B] text-xs">% of Portfolio</span>
                        <p className="font-bold text-white">{flow.portfolioPercent}%</p></div>
                    )}
                    {flow.shortInterestPercent != null && (
                      <div><span className="text-[#6B6B6B] text-xs">Short Interest</span>
                        <p className="font-bold" style={{ color: COLORS.warning }}>{flow.shortInterestPercent}%</p></div>
                    )}
                    {flow.daysToCover != null && (
                      <div><span className="text-[#6B6B6B] text-xs">Days to Cover</span>
                        <p className="font-bold text-white">{flow.daysToCover}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Confluence active signals */}
              {flow.type === 'confluence' && flow.activeSignals && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <GitMerge className="h-4 w-4 text-[#EF4444]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#EF4444]">
                      Active Signals ({flow.activeSignals.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {flow.activeSignals.map(sig => {
                      const sigCfg = FLOW_TYPE_CONFIG[sig];
                      return (
                        <span key={sig}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: `${sigCfg.color}15`, color: sigCfg.color }}>
                          {sigCfg.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Signal analysis */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(13,11,8,0.95))',
                  border: '1px solid rgba(201,166,70,0.18)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[#C9A646]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9A646]">Signal Analysis</span>
                </div>
                <p className="text-[#E8DCC4] text-sm leading-relaxed">{flow.signal}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="p-5 border-t border-white/[0.05]">
              <button
                className="w-full py-3.5 rounded-xl font-bold text-black transition-all
                           hover:scale-[1.02] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #C9A646, #F4D97B, #C9A646)',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.25)',
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

// ─────────────────────────────────────────────────────
// All Flow Tab
// ─────────────────────────────────────────────────────

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
        <div className="p-5 md:p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <SearchBar value={search} onChange={setSearch} />

            <FilterSelect
              value={filterType}
              onChange={v => setFilterType(v as FlowTypeFilter)}
              placeholder="Signal Type"
              options={TYPE_OPTIONS}
            />

            <FilterSelect
              value={filterDir}
              onChange={v => setFilterDir(v as DirectionFilter)}
              placeholder="Direction"
              options={[
                { value: 'all',     label: 'All Directions' },
                { value: 'bullish', label: '▲ Bullish'       },
                { value: 'bearish', label: '▼ Bearish'       },
                { value: 'neutral', label: '— Neutral'       },
              ]}
            />

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                         text-[#C9A646] transition-all hover:bg-[#C9A646]/8 disabled:opacity-40"
              style={{ border: '1px solid rgba(201,166,70,0.2)' }}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Count */}
          <div className="text-xs text-[#6B6B6B] mb-4">
            {filtered.length} signal{filtered.length !== 1 ? 's' : ''}
          </div>

          {/* List */}
          <div className="space-y-2.5">
            {filtered.length > 0 ? (
              filtered.map((item, idx) => (
                <FlowCard key={item.id} item={item} index={idx} onClick={() => handleClick(item)} />
              ))
            ) : (
              <div className="text-center py-14">
                <Search className="h-10 w-10 text-[#3A3A3A] mx-auto mb-3" />
                <p className="text-[#6B6B6B] text-sm">No signals match your filters</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <FlowDrawer isOpen={!!selected} onClose={handleClose} flow={selected} />
    </>
  );
});
