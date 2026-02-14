// tabs/GlobalTab.tsx
// =====================================================
// 🌍 GLOBAL TAB
// Major markets: China, Europe, India, Japan
// PMIs, global indices, DXY, commodities
// All from /api/global endpoint (real data)
// =====================================================

import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  Globe, Brain, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, AlertTriangle, BarChart2, Activity,
  Layers, Shield, Clock, Target, Zap
} from 'lucide-react';
import {
  Card, SectionHeader, Badge, ProgressBar, LazySection,
  cn, SectionSkeleton, SignalDot
} from '../shared/ui';
import { useGlobal, type GlobalData } from '../shared/api';

// =====================================================
// MARKET FOCUS TABS
// =====================================================

type MarketFocus = 'all' | 'china' | 'europe' | 'japan' | 'india';

const MARKET_TABS: { id: MarketFocus; label: string; flag: string }[] = [
  { id: 'all', label: 'Overview', flag: '🌍' },
  { id: 'china', label: 'China', flag: '🇨🇳' },
  { id: 'europe', label: 'Europe', flag: '🇪🇺' },
  { id: 'japan', label: 'Japan', flag: '🇯🇵' },
  { id: 'india', label: 'India', flag: '🇮🇳' },
];

const MarketFocusTabs = memo(({ active, onChange }: { active: MarketFocus; onChange: (m: MarketFocus) => void }) => (
  <div className="flex flex-wrap gap-2 mb-6">
    {MARKET_TABS.map((tab) => {
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
            isActive ? "text-black" : "text-[#8B8B8B] hover:text-[#C9A646]"
          )}
          style={isActive
            ? { background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }
            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,166,70,0.1)' }
          }
        >
          <span>{tab.flag}</span>
          {tab.label}
        </button>
      );
    })}
  </div>
));
MarketFocusTabs.displayName = 'MarketFocusTabs';

// =====================================================
// GLOBAL PMI TABLE
// =====================================================

const GlobalPMITable = memo(({ pmis, filter }: { pmis: GlobalData['pmis']; filter: MarketFocus }) => {
  const filteredPMIs = useMemo(() => {
    if (filter === 'all') return pmis;
    const countryMap: Record<string, string[]> = {
      china: ['China', 'china'],
      europe: ['Eurozone', 'eurozone', 'Germany', 'germany', 'UK', 'uk', 'France', 'france'],
      japan: ['Japan', 'japan'],
      india: ['India', 'india'],
    };
    const countries = countryMap[filter] || [];
    return pmis.filter(p => countries.some(c => p.country.toLowerCase().includes(c.toLowerCase())));
  }, [pmis, filter]);

  const globalAvg = useMemo(() => {
    if (filteredPMIs.length === 0) return 0;
    return filteredPMIs.reduce((acc, p) => acc + p.pmi, 0) / filteredPMIs.length;
  }, [filteredPMIs]);

  if (filteredPMIs.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <SectionHeader icon={Activity} title="Manufacturing PMI" />
          <p className="text-sm text-[#6B6B6B] text-center py-8">No PMI data available for this region</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <SectionHeader
          icon={Activity}
          title="Manufacturing PMI Comparison"
          subtitle="Purchasing Managers Index — above 50 = expansion"
          action={
            <div className="text-right">
              <p className="text-xs text-[#6B6B6B]">Avg PMI</p>
              <p className={cn("text-lg font-bold", globalAvg >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                {globalAvg.toFixed(1)}
              </p>
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#C9A646]/10">
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">Country</th>
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">PMI</th>
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">Status</th>
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">Trend</th>
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">vs US</th>
                <th className="text-left text-xs text-[#6B6B6B] pb-3 font-medium">Implication</th>
              </tr>
            </thead>
            <tbody>
              {filteredPMIs.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-sm">
                    <span className="mr-2">{item.flag}</span>
                    <span className="text-white">{item.country}</span>
                  </td>
                  <td className={cn("py-3 text-sm font-bold", item.pmi >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                    {item.pmi}
                  </td>
                  <td className="py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                      item.pmi >= 50 ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                    )}>
                      {item.pmi >= 50 ? 'EXPANDING' : 'CONTRACTING'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn("text-xs",
                      item.trend === 'improving' ? 'text-[#22C55E]' :
                      item.trend === 'declining' ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                    )}>
                      {item.trend === 'improving' ? '↗️ Improving' : item.trend === 'declining' ? '↘️ Declining' : '→ Stable'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                      item.vsUS === 'better' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                      item.vsUS === 'worse' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-white/10 text-white'
                    )}>{item.vsUS.toUpperCase()}</span>
                  </td>
                  <td className="py-3 text-xs text-[#8B8B8B] max-w-[200px]">{item.implication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});
GlobalPMITable.displayName = 'GlobalPMITable';

// =====================================================
// GLOBAL INDICES
// =====================================================

const GlobalIndices = memo(({ indices, filter }: { indices: GlobalData['indices']; filter: MarketFocus }) => {
  const filteredIndices = useMemo(() => {
    if (filter === 'all') return indices;
    const countryMap: Record<string, string[]> = {
      china: ['China', 'HK', 'Hong Kong'],
      europe: ['UK', 'Germany', 'France', 'Euro'],
      japan: ['Japan'],
      india: ['India'],
    };
    const countries = countryMap[filter] || [];
    return indices.filter(idx =>
      countries.some(c => idx.country.toLowerCase().includes(c.toLowerCase()))
    );
  }, [indices, filter]);

  if (filteredIndices.length === 0) return null;

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={BarChart2} title="Market Indices" subtitle="Real-time from Yahoo Finance" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredIndices.map((index, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm">{index.flag}</span>
                <span className="text-xs text-white truncate">{index.name}</span>
              </div>
              <p className="text-sm text-[#8B8B8B] mb-1">
                {index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className={cn("text-sm font-bold",
                index.changePercent >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
              )}>
                {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});
GlobalIndices.displayName = 'GlobalIndices';

// =====================================================
// DXY & CURRENCY IMPACT
// =====================================================

const DXYSection = memo(({ dxy }: { dxy: GlobalData['dxy'] }) => {
  if (!dxy) return null;

  const strength = dxy.change > 1 ? 'STRENGTHENING' : dxy.change < -1 ? 'WEAKENING' : 'STABLE';
  const strengthColor = dxy.change > 1 ? '#22C55E' : dxy.change < -1 ? '#EF4444' : '#F59E0B';

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={DollarSign} title="US Dollar (DXY)" subtitle="Dollar strength & trade implications" />

        <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8B8B8B]">Dollar Index (DXY)</span>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{dxy.value}</span>
              <span className={cn("text-xs ml-2 font-medium",
                dxy.change > 0 ? 'text-[#22C55E]' : dxy.change < 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'
              )}>
                {dxy.change > 0 ? '+' : ''}{dxy.change.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B8B8B]">Trend:</span>
            <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strength}</span>
          </div>
        </div>

        {/* Impact Analysis */}
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Multinationals (&gt;40% intl revenue)</p>
                <p className="text-[10px] text-[#EF4444] font-medium">
                  {dxy.change > 0 ? 'HEADWIND — strong dollar hurts foreign earnings' : 'TAILWIND — weak dollar boosts foreign earnings'}
                </p>
              </div>
              <span className="text-xs text-[#6B6B6B]">AAPL, MSFT, KO, PG</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Domestic focused</p>
                <p className="text-[10px] text-[#22C55E] font-medium">NEUTRAL to POSITIVE — less currency exposure</p>
              </div>
              <span className="text-xs text-[#6B6B6B]">HD, WMT, UNH</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Importers</p>
                <p className="text-[10px] font-medium" style={{ color: dxy.change > 0 ? '#22C55E' : '#EF4444' }}>
                  {dxy.change > 0 ? 'POSITIVE — stronger dollar = cheaper imports' : 'NEGATIVE — weaker dollar = higher import costs'}
                </p>
              </div>
              <span className="text-xs text-[#6B6B6B]">TGT, COST, DG</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
DXYSection.displayName = 'DXYSection';

// =====================================================
// COMMODITIES
// =====================================================

const CommoditiesSection = memo(({ commodities }: { commodities: GlobalData['commodities'] }) => {
  if (!commodities || commodities.length === 0) return null;

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={Layers} title="Commodities" subtitle="Key commodity prices" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {commodities.map((commodity, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <p className="text-xs text-[#6B6B6B] mb-1">{commodity.name}</p>
              <p className="text-lg font-bold text-white">${commodity.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className={cn("text-xs font-medium",
                commodity.changePercent >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
              )}>
                {commodity.changePercent >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});
CommoditiesSection.displayName = 'CommoditiesSection';

// =====================================================
// CHINA DEEP DIVE
// =====================================================

const ChinaDeepDive = memo(({ china }: { china: GlobalData['china'] }) => {
  if (!china) return null;

  return (
    <Card highlight>
      <div className="relative p-6">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#F4D97B] to-transparent" />

        <SectionHeader icon={Target} title="🇨🇳 China Focus" subtitle="The world's second largest economy" />

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }}>
            <p className="text-xs text-[#6B6B6B]">GDP Growth</p>
            <p className="text-2xl font-bold text-[#C9A646]">{china.gdpGrowth}%</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-xs text-[#6B6B6B]">PMI</p>
            <p className={cn("text-2xl font-bold", china.pmi >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {china.pmi}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-xs text-[#6B6B6B]">CPI</p>
            <p className="text-2xl font-bold text-white">{china.cpi}%</p>
          </div>
        </div>

        {/* Key Risks */}
        <div className="p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20 mb-4">
          <p className="text-xs text-[#EF4444] font-semibold mb-2">Key Risks</p>
          <div className="space-y-1">
            {china.keyRisks.map((risk, idx) => (
              <p key={idx} className="text-xs text-[#8B8B8B] flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#EF4444]" />
                {risk}
              </p>
            ))}
          </div>
        </div>

        {/* US Impact */}
        <div className="p-3 rounded-lg bg-white/[0.02]">
          <p className="text-xs text-[#C9A646] font-semibold mb-1">
            <Shield className="w-3 h-3 inline mr-1" />
            Impact on US Markets
          </p>
          <p className="text-xs text-[#8B8B8B]">{china.usImpact}</p>
        </div>
      </div>
    </Card>
  );
});
ChinaDeepDive.displayName = 'ChinaDeepDive';

// =====================================================
// AI GLOBAL INSIGHT
// =====================================================

const AIGlobalInsight = memo(({ data }: { data: GlobalData }) => {
  const insight = useMemo(() => {
    const { pmis, dxy } = data;
    if (!pmis || pmis.length === 0) return null;

    const usPMI = pmis.find(p => p.country === 'USA' || p.country === 'US');
    const expanding = pmis.filter(p => p.pmi >= 50).length;
    const contracting = pmis.filter(p => p.pmi < 50).length;
    const usOutperforming = pmis.filter(p => p.vsUS === 'worse').length > pmis.length / 2;

    return {
      globalHealth: expanding > contracting ? 'EXPANDING' : 'CONTRACTING',
      globalHealthColor: expanding > contracting ? '#22C55E' : '#EF4444',
      expanding,
      contracting,
      usOutperforming,
      dollarStrong: dxy && dxy.change > 0,
    };
  }, [data]);

  if (!insight) return null;

  return (
    <Card>
      <div className="p-6">
        <SectionHeader icon={Brain} title="AI Global Insight" subtitle="Cross-market analysis" />

        <div className="p-4 rounded-xl" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }}>
          <p className="text-sm text-[#E8DCC4] leading-relaxed">
            Global manufacturing is{' '}
            <span className="font-semibold" style={{ color: insight.globalHealthColor }}>
              {insight.globalHealth}
            </span>
            {' '}({insight.expanding} expanding, {insight.contracting} contracting).
            {insight.usOutperforming && (
              <> US is outperforming global peers.{' '}
              <span className="text-[#22C55E]">Favor domestic-focused stocks</span> over multinationals.</>
            )}
            {!insight.usOutperforming && (
              <> Global recovery is broadening.{' '}
              <span className="text-[#22C55E]">International exposure</span> could add diversification benefits.</>
            )}
            {insight.dollarStrong && (
              <> Strong dollar likely to persist, creating headwinds for US exporters.</>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
});
AIGlobalInsight.displayName = 'AIGlobalInsight';

// =====================================================
// MAIN GLOBAL TAB
// =====================================================

function GlobalTab() {
  const { data, isLoading, error, refresh, lastUpdated } = useGlobal();
  const [marketFocus, setMarketFocus] = useState<MarketFocus>('all');

  const handleFocusChange = useCallback((m: MarketFocus) => setMarketFocus(m), []);

  if (error) {
    return (
      <Card>
        <div className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[#EF4444] mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load global data</p>
          <p className="text-sm text-[#8B8B8B] mb-4">{error}</p>
          <button onClick={refresh} className="px-4 py-2 rounded-lg text-sm text-[#C9A646] border border-[#C9A646]/30 hover:bg-[#C9A646]/10">
            <RefreshCw className="w-4 h-4 inline mr-2" /> Retry
          </button>
        </div>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SectionSkeleton height="h-12" />
        <SectionSkeleton height="h-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionSkeleton height="h-64" />
          <SectionSkeleton height="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Focus Tabs */}
      <MarketFocusTabs active={marketFocus} onChange={handleFocusChange} />

      {/* AI Global Insight (overview only) */}
      {marketFocus === 'all' && (
        <AIGlobalInsight data={data} />
      )}

      {/* China Deep Dive (when China selected) */}
      {(marketFocus === 'china' || marketFocus === 'all') && data.china && (
        <LazySection fallbackHeight="h-80">
          <ChinaDeepDive china={data.china} />
        </LazySection>
      )}

      {/* PMI Table */}
      <GlobalPMITable pmis={data.pmis || []} filter={marketFocus} />

      {/* Indices + DXY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazySection fallbackHeight="h-64">
          <GlobalIndices indices={data.indices || []} filter={marketFocus} />
        </LazySection>
        {marketFocus === 'all' && (
          <LazySection fallbackHeight="h-64">
            <DXYSection dxy={data.dxy} />
          </LazySection>
        )}
      </div>

      {/* Commodities */}
      {marketFocus === 'all' && (
        <LazySection fallbackHeight="h-48">
          <CommoditiesSection commodities={data.commodities || []} />
        </LazySection>
      )}

      {/* Last update */}
      {lastUpdated && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#6B6B6B]">
          <Clock className="w-3 h-3" />
          Global data from Yahoo Finance & FRED • Updated {new Date(lastUpdated).toLocaleTimeString()}
          <button onClick={refresh} className="text-[#C9A646] hover:text-[#F4D97B] ml-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(GlobalTab);