// =====================================================
// 💰 VALUATION DEEP DIVE COMPONENT
// =====================================================
// Multi-method institutional-grade valuation:
// - DCF Analysis with scenarios
// - Comparable Companies
// - Historical Valuation
// - Sum of Parts
// - Valuation Conclusion
// =====================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, TrendingUp, TrendingDown, Target, BarChart3,
  PieChart, Clock, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Activity, AlertTriangle, CheckCircle,
  Layers, Scale, History, Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  ValuationData, 
  DCFAnalysis, 
  ComparablesAnalysis,
  HistoricalValuation,
  SumOfParts,
  ValuationConclusion 
} from '../types/stock.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const getUpsideColor = (upside: number): string => {
  if (upside >= 30) return '#22C55E';
  if (upside >= 10) return '#4ADE80';
  if (upside >= 0) return '#F59E0B';
  if (upside >= -10) return '#F87171';
  return '#EF4444';
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

const SectionHeader = ({ 
  icon: Icon, 
  title, 
  subtitle 
}: { 
  icon: any; 
  title: string; 
  subtitle?: string;
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div 
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ 
        background: 'rgba(201,166,70,0.1)', 
        border: '1px solid rgba(201,166,70,0.2)' 
      }}
    >
      <Icon className="w-5 h-5 text-[#C9A646]" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
    </div>
  </div>
);

const Card = ({ 
  children, 
  className,
  highlight = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  highlight?: boolean;
}) => (
  <div 
    className={cn("rounded-2xl overflow-hidden relative", className)}
    style={{
      background: highlight 
        ? 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(13,11,8,0.95))'
        : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight 
        ? '1px solid rgba(201,166,70,0.3)' 
        : '1px solid rgba(201,166,70,0.15)',
    }}
  >
    {children}
  </div>
);

// =====================================================
// DCF ANALYSIS SECTION
// =====================================================

const DCFAnalysisSection = ({ data, currentPrice }: { data: DCFAnalysis; currentPrice: number }) => {
  const [selectedScenario, setSelectedScenario] = useState<'BASE' | 'BULL' | 'BEAR'>('BASE');
  
  const scenarioColors = {
    BASE: '#C9A646',
    BULL: '#22C55E',
    BEAR: '#EF4444',
  };

  const selectedData = data.scenarios.find(s => s.name === selectedScenario)!;

  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={Calculator} 
          title="DCF Analysis"
          subtitle="Discounted Cash Flow Valuation"
        />

        {/* Scenario Tabs */}
        <div className="flex gap-2 mb-6">
          {data.scenarios.map((scenario) => (
            <button
              key={scenario.name}
              onClick={() => setSelectedScenario(scenario.name)}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all",
                selectedScenario === scenario.name
                  ? "text-black"
                  : "text-[#8B8B8B] hover:text-white bg-white/[0.03] hover:bg-white/[0.05]"
              )}
              style={selectedScenario === scenario.name ? {
                background: `linear-gradient(135deg, ${scenarioColors[scenario.name]}, ${scenarioColors[scenario.name]}dd)`,
                boxShadow: `0 4px 20px ${scenarioColors[scenario.name]}40`,
              } : {}}
            >
              {scenario.name === 'BASE' ? '📊 Base Case' : 
               scenario.name === 'BULL' ? '🐂 Bull Case' : '🐻 Bear Case'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedScenario}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Fair Value Display */}
            <div 
              className="p-6 rounded-xl mb-6 text-center"
              style={{ 
                background: `${scenarioColors[selectedScenario]}10`,
                border: `1px solid ${scenarioColors[selectedScenario]}30`,
              }}
            >
              <p className="text-sm text-[#8B8B8B] mb-2">Intrinsic Value ({selectedScenario.toLowerCase()} case)</p>
              <p 
                className="text-4xl font-bold mb-2"
                style={{ color: scenarioColors[selectedScenario] }}
              >
                ${selectedData.fairValue.toFixed(2)}
              </p>
              <div className="flex items-center justify-center gap-2">
                {selectedData.upside >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-[#EF4444]" />
                )}
                <span className={cn(
                  "text-lg font-semibold",
                  selectedData.upside >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                )}>
                  {formatPercent(selectedData.upside)} vs current price
                </span>
              </div>
            </div>

            {/* Assumptions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Revenue Growth', value: `${selectedData.assumptions.revenueGrowth}%` },
                { label: 'Terminal Growth', value: `${selectedData.assumptions.terminalGrowth}%` },
                { label: 'WACC', value: `${selectedData.assumptions.wacc}%` },
                { label: 'Target Margin', value: `${selectedData.assumptions.margin}%` },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-xs text-[#6B6B6B] mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Sensitivity Table */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white mb-4">Sensitivity Analysis (WACC vs Growth)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-[#6B6B6B]">WACC \ Growth</th>
                  {data.sensitivityTable.growthValues.map((g) => (
                    <th key={g} className="p-2 text-[#C9A646]">{g}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sensitivityTable.waccValues.map((wacc, i) => (
                  <tr key={wacc} className="border-t border-white/5">
                    <td className="p-2 text-[#C9A646] font-medium">{wacc}%</td>
                    {data.sensitivityTable.matrix[i].map((value, j) => {
                      const upside = ((value - currentPrice) / currentPrice) * 100;
                      return (
                        <td 
                          key={j} 
                          className={cn(
                            "p-2 text-center font-medium",
                            upside >= 20 ? "text-[#22C55E] bg-[#22C55E]/10" :
                            upside >= 0 ? "text-[#4ADE80]" :
                            upside >= -10 ? "text-[#F59E0B]" : "text-[#EF4444] bg-[#EF4444]/10"
                          )}
                        >
                          ${value.toFixed(0)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};

// =====================================================
// COMPARABLE COMPANIES SECTION
// =====================================================

const ComparablesSection = ({ data }: { data: ComparablesAnalysis }) => {
  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={Scale} 
          title="Comparable Companies"
          subtitle={`${data.peers.length} peer companies analyzed`}
        />

        <div className="overflow-x-auto mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#C9A646]/10">
                <th className="text-left py-3 px-2 text-xs font-medium text-[#6B6B6B]">Company</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Mkt Cap</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">P/E</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">EV/EBITDA</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Growth</th>
              </tr>
            </thead>
            <tbody>
              {data.peers.map((peer, idx) => (
                <motion.tr 
                  key={peer.ticker}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#C9A646]">{peer.ticker}</span>
                      <span className="text-xs text-[#8B8B8B] truncate max-w-[80px]">{peer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-xs text-white">{formatCurrency(peer.marketCap)}</td>
                  <td className="py-3 px-2 text-right text-xs text-[#8B8B8B]">{peer.pe?.toFixed(1) || 'N/A'}</td>
                  <td className="py-3 px-2 text-right text-xs text-[#8B8B8B]">{peer.evEbitda?.toFixed(1) || 'N/A'}</td>
                  <td className="py-3 px-2 text-right">
                    <span className={cn(
                      "text-xs font-medium",
                      peer.growth >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                    )}>
                      {formatPercent(peer.growth)}
                    </span>
                  </td>
                </motion.tr>
              ))}
              <tr className="bg-[#C9A646]/10 border-t-2 border-[#C9A646]/30">
                <td className="py-3 px-2 text-sm font-bold text-[#C9A646]">Subject</td>
                <td className="py-3 px-2 text-right text-sm text-white">-</td>
                <td className="py-3 px-2 text-right text-sm text-white font-bold">{data.subjectMultiples.pe?.toFixed(1) || 'N/A'}</td>
                <td className="py-3 px-2 text-right text-sm text-white font-bold">{data.subjectMultiples.evEbitda?.toFixed(1) || 'N/A'}</td>
                <td className="py-3 px-2 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold text-white mb-3">Premium/Discount vs Peers</h4>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {data.premiumDiscount.slice(0, 4).map((item) => (
            <div 
              key={item.metric}
              className={cn(
                "p-3 rounded-lg border",
                item.vsMedian < 0 
                  ? "bg-[#22C55E]/10 border-[#22C55E]/20"
                  : "bg-[#EF4444]/10 border-[#EF4444]/20"
              )}
            >
              <p className="text-xs text-[#8B8B8B] mb-1">{item.metric}</p>
              <p className={cn(
                "text-lg font-bold",
                item.vsMedian < 0 ? "text-[#22C55E]" : "text-[#EF4444]"
              )}>
                {item.vsMedian >= 0 ? '+' : ''}{item.vsMedian.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>

        <h4 className="text-sm font-semibold text-white mb-3">Implied Fair Values</h4>
        <div className="space-y-2">
          {data.impliedValues.map((item) => (
            <div 
              key={item.method}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]"
            >
              <span className="text-sm text-[#8B8B8B]">{item.method}</span>
              <span className="text-sm font-semibold text-white">${item.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// =====================================================
// HISTORICAL VALUATION SECTION
// =====================================================

const HistoricalValuationSection = ({ data }: { data: HistoricalValuation }) => {
  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={History} 
          title="Historical Valuation"
          subtitle="Where are we in the range?"
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'P/E', value: data.current.pe, avg5Y: data.fiveYearAvg.pe },
            { label: 'EV/EBITDA', value: data.current.evEbitda, avg5Y: data.fiveYearAvg.evEbitda },
            { label: 'P/S', value: data.current.psRatio, avg5Y: data.fiveYearAvg.psRatio },
          ].map((item) => {
            const current = item.value || 0;
            const avg = item.avg5Y || 0;
            const premium = avg ? ((current - avg) / avg) * 100 : 0;
            
            return (
              <div key={item.label} className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-xs text-[#6B6B6B] mb-1">{item.label}</p>
                <p className="text-xl font-bold text-white mb-1">{item.value?.toFixed(1) || 'N/A'}x</p>
                <p className="text-xs text-[#8B8B8B]">5Y: {item.avg5Y?.toFixed(1) || 'N/A'}x</p>
                {item.avg5Y && (
                  <div className={cn(
                    "mt-2 text-xs font-medium text-center py-1 rounded",
                    premium < -10 ? "bg-[#22C55E]/20 text-[#22C55E]" :
                    premium > 10 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                    "bg-[#F59E0B]/20 text-[#F59E0B]"
                  )}>
                    {premium >= 0 ? '+' : ''}{premium.toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#8B8B8B]">Position in Historical Range</span>
            <span className="text-sm font-semibold text-[#C9A646]">{data.percentileInRange}th %ile</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, #22C55E 0%, #22C55E 30%, #F59E0B 30%, #F59E0B 70%, #EF4444 70%, #EF4444 100%)',
              }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#C9A646] shadow-lg"
              initial={{ left: 0 }}
              animate={{ left: `calc(${data.percentileInRange}% - 8px)` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-[#6B6B6B]">
            <span>Cheap</span>
            <span>Fair</span>
            <span>Expensive</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-xs font-semibold text-[#EF4444] mb-1">Peak P/E</p>
            <p className="text-lg font-bold text-white">{data.peakTroughAnalysis.peakPE.toFixed(1)}x</p>
            <p className="text-xs text-[#6B6B6B]">{data.peakTroughAnalysis.peakDate}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
            <p className="text-xs font-semibold text-[#22C55E] mb-1">Trough P/E</p>
            <p className="text-lg font-bold text-white">{data.peakTroughAnalysis.troughPE.toFixed(1)}x</p>
            <p className="text-xs text-[#6B6B6B]">{data.peakTroughAnalysis.troughDate}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// =====================================================
// SUM OF PARTS SECTION
// =====================================================

const SumOfPartsSection = ({ data }: { data: SumOfParts }) => {
  return (
    <Card>
      <div className="p-6">
        <SectionHeader 
          icon={Layers} 
          title="Sum of Parts Valuation"
          subtitle="Segment-by-segment analysis"
        />

        <div className="overflow-x-auto mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#C9A646]/10">
                <th className="text-left py-3 px-2 text-xs font-medium text-[#6B6B6B]">Segment</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">EBITDA</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Multiple</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">Value</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#6B6B6B]">%</th>
              </tr>
            </thead>
            <tbody>
              {data.segments.map((segment, idx) => (
                <motion.tr 
                  key={segment.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-3 px-2 text-sm text-white font-medium">{segment.name}</td>
                  <td className="py-3 px-2 text-right text-xs text-[#8B8B8B]">{formatCurrency(segment.ebitda)}</td>
                  <td className="py-3 px-2 text-right text-xs text-[#C9A646]">{segment.multiple.toFixed(1)}x</td>
                  <td className="py-3 px-2 text-right text-sm text-white font-medium">{formatCurrency(segment.value)}</td>
                  <td className="py-3 px-2 text-right text-xs text-[#8B8B8B]">{segment.percentOfTotal}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 text-center">
            <p className="text-xs text-[#8B8B8B]">Total EV</p>
            <p className="text-lg font-bold text-[#C9A646]">{formatCurrency(data.totalValue)}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-white/[0.03] text-center">
            <p className="text-xs text-[#8B8B8B]">Discount</p>
            <p className="text-lg font-bold text-[#F59E0B]">-{data.conglomerateDiscount}%</p>
          </div>
          
          <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-center">
            <p className="text-xs text-[#8B8B8B]">Fair Value</p>
            <p className="text-lg font-bold text-[#22C55E]">${data.impliedSharePrice.toFixed(2)}</p>
          </div>
        </div>

        {data.hiddenValue && (
          <div className="mt-4 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#F59E0B]">Hidden Value</p>
              <p className="text-xs text-[#8B8B8B]">{data.hiddenValue}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// =====================================================
// VALUATION CONCLUSION SECTION
// =====================================================

const ValuationConclusionSection = ({ data }: { data: ValuationConclusion }) => {
  const upsideColor = getUpsideColor(data.upsideToMid);
  const hasMarginOfSafety = data.marginOfSafety > 0;

  return (
    <Card highlight>
      <div className="p-6">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] via-[#F4D97B] to-transparent" />
        
        <SectionHeader 
          icon={Crosshair} 
          title="Valuation Conclusion"
          subtitle="Multi-method fair value estimate"
        />

        {/* Fair Value Range */}
        <div className="text-center mb-6">
          <p className="text-sm text-[#8B8B8B] mb-2">Fair Value Range</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg text-[#8B8B8B]">${data.fairValueLow.toFixed(2)}</span>
            <span className="text-3xl font-bold text-[#C9A646]">${data.fairValueMid.toFixed(2)}</span>
            <span className="text-lg text-[#8B8B8B]">${data.fairValueHigh.toFixed(2)}</span>
          </div>
        </div>

        {/* Visual Range */}
        <div className="mb-6">
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-[#C9A646]/30"
              style={{
                left: `${((data.fairValueLow - data.fairValueLow * 0.8) / (data.fairValueHigh * 1.2 - data.fairValueLow * 0.8)) * 100}%`,
                width: `${((data.fairValueHigh - data.fairValueLow) / (data.fairValueHigh * 1.2 - data.fairValueLow * 0.8)) * 100}%`,
              }}
            />
            <div 
              className="absolute top-0 h-full w-0.5 bg-[#C9A646]"
              style={{
                left: `${((data.fairValueMid - data.fairValueLow * 0.8) / (data.fairValueHigh * 1.2 - data.fairValueLow * 0.8)) * 100}%`,
              }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-lg z-10"
              style={{ 
                borderColor: upsideColor,
                left: `calc(${((data.currentPrice - data.fairValueLow * 0.8) / (data.fairValueHigh * 1.2 - data.fairValueLow * 0.8)) * 100}% - 8px)`,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-white/[0.03] text-center">
            <p className="text-xs text-[#6B6B6B]">Current</p>
            <p className="text-lg font-bold text-white">${data.currentPrice.toFixed(2)}</p>
          </div>
          
          <div 
            className="p-3 rounded-xl text-center"
            style={{ background: `${upsideColor}15`, border: `1px solid ${upsideColor}30` }}
          >
            <p className="text-xs text-[#8B8B8B]">Upside</p>
            <p className="text-lg font-bold" style={{ color: upsideColor }}>
              {data.upsideToMid >= 0 ? '+' : ''}{data.upsideToMid.toFixed(1)}%
            </p>
          </div>
          
          <div 
            className="p-3 rounded-xl text-center"
            style={{ 
              background: hasMarginOfSafety ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${hasMarginOfSafety ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            <p className="text-xs text-[#8B8B8B]">Margin of Safety</p>
            <p className={cn("text-lg font-bold", hasMarginOfSafety ? "text-[#22C55E]" : "text-[#EF4444]")}>
              {data.marginOfSafety.toFixed(1)}%
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 text-center">
            <p className="text-xs text-[#8B8B8B]">Risk/Reward</p>
            <p className="text-lg font-bold text-[#C9A646]">{data.riskRewardRatio.toFixed(1)}:1</p>
          </div>
        </div>

        {/* Entry/Exit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
            <p className="text-xs font-semibold text-[#22C55E] mb-1">Entry Price</p>
            <p className="text-xl font-bold text-white">${data.entryPrice.toFixed(2)}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-xs font-semibold text-[#EF4444] mb-1">Exit Price</p>
            <p className="text-xl font-bold text-white">${data.exitPrice.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

interface ValuationDeepDiveProps {
  data: ValuationData;
  ticker: string;
  currentPrice: number;
  className?: string;
}

export function ValuationDeepDive({ data, ticker, currentPrice, className }: ValuationDeepDiveProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      <div className="flex items-center gap-3 mb-2">
        <DollarSign className="h-6 w-6 text-[#C9A646]" />
        <h2 className="text-xl font-bold text-white">Valuation Deep Dive</h2>
        <span className="text-sm text-[#6B6B6B]">for {ticker}</span>
      </div>

      <ValuationConclusionSection data={data.conclusion} />
      <DCFAnalysisSection data={data.dcf} currentPrice={currentPrice} />

      <div className="grid lg:grid-cols-2 gap-6">
        <ComparablesSection data={data.comparables} />
        <HistoricalValuationSection data={data.historical} />
      </div>

      {data.sumOfParts && <SumOfPartsSection data={data.sumOfParts} />}
    </motion.div>
  );
}

export default ValuationDeepDive;
