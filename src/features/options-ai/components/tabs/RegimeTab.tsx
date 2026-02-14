// src/features/options-ai/components/tabs/RegimeTab.tsx
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { OptionsData } from '../../types/options-ai.types';
import { Card, SectionHeader, AIInsight, MetricCard } from '../ui';

const REGIME_CFG = {
  risk_on:   { label: 'Risk-On',   color: '#22C55E', desc: 'Stocks diverging — stock-picking market', iconBg: 'green' as const },
  risk_off:  { label: 'Risk-Off',  color: '#EF4444', desc: 'Stocks moving together on macro fear', iconBg: 'red' as const },
  divergent: { label: 'Divergent', color: '#F59E0B', desc: 'Mixed signals — sector rotation in play', iconBg: 'orange' as const },
};

export const RegimeTab = memo(function RegimeTab({ data }: { data: OptionsData }) {
  const mr = data.marketRegime;
  const regime = REGIME_CFG[mr.correlationRegime];

  const vixColor = mr.vixLevel > 20 ? '#EF4444' : mr.vixLevel > 15 ? '#F59E0B' : '#22C55E';
  const vixGrad = mr.vixLevel > 20 ? 'linear-gradient(90deg, #EF4444, #F87171)' : mr.vixLevel > 15 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #22C55E, #34D399)';

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* VIX */}
        <Card>
          <div className="relative p-6">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: vixGrad }} />
            <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">VIX Level</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold" style={{ color: vixColor }}>{mr.vixLevel}</span>
              <span className="text-sm font-medium flex items-center gap-1" style={{ color: mr.vixChange > 0 ? '#EF4444' : '#22C55E' }}>
                {mr.vixChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {mr.vixChange > 0 ? '+' : ''}{mr.vixChange}
              </span>
            </div>
            <p className="text-xs text-[#8B8B8B] mt-2">Term structure: <span className="text-white capitalize">{mr.vixTermStructure}</span></p>
          </div>
        </Card>

        {/* SKEW */}
        <Card>
          <div className="relative p-6">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: mr.skewIndex > 140 ? 'linear-gradient(90deg, #EF4444, #F87171)' : 'linear-gradient(90deg, #C9A646, #F4D97B)' }} />
            <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">SKEW Index</div>
            <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: mr.skewIndex > 140 ? '#EF4444' : '#C9A646' }}>{mr.skewIndex}</div>
            <p className="text-xs text-[#8B8B8B]">{mr.skewIndex > 145 ? 'Elevated tail risk pricing' : mr.skewIndex > 130 ? 'Moderate tail risk expectations' : 'Normal tail risk pricing'}</p>
          </div>
        </Card>

        {/* 0DTE */}
        <Card>
          <div className="relative p-6">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: mr.zeroDteRatio > 0.5 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #8B8B8B, #A0A0A0)' }} />
            <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2">0DTE Ratio</div>
            <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: mr.zeroDteRatio > 0.5 ? '#F59E0B' : '#8B8B8B' }}>{(mr.zeroDteRatio * 100).toFixed(0)}%</div>
            <p className="text-xs text-[#8B8B8B]">{mr.zeroDteRatio > 0.6 ? 'Very high 0DTE activity — amplified intraday moves' : 'Normal 0DTE participation levels'}</p>
          </div>
        </Card>
      </div>

      {/* Correlation Regime */}
      <Card>
        <div className="p-6 md:p-8">
          <SectionHeader icon={Activity} title="Correlation Regime" subtitle="Are stocks moving together or diverging?" iconBg={regime.iconBg} />
          <div className="mt-4 p-5 rounded-xl" style={{ background: `${regime.color}10`, border: `1px solid ${regime.color}25` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: regime.color }} />
              <span className="text-lg font-bold" style={{ color: regime.color }}>{regime.label}</span>
            </div>
            <p className="text-sm text-[#A0A0A0]">{regime.desc}</p>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-2"><span>Risk-On</span><span>Risk-Off</span></div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, #22C55E, #F59E0B, #EF4444)', opacity: 0.3 }} />
              <div className="absolute top-0 bottom-0 w-4 rounded-full border-2 border-white shadow-lg transition-all duration-500"
                style={{ left: mr.correlationRegime === 'risk_on' ? '10%' : mr.correlationRegime === 'divergent' ? '50%' : '85%', background: regime.color }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Warning */}
      {mr.vixLevel > 18 && mr.skewIndex > 140 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <div className="p-5 flex items-start gap-4" style={{ background: 'rgba(239,68,68,0.05)', borderLeft: '4px solid #EF4444' }}>
              <AlertTriangle className="h-6 w-6 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[#EF4444] mb-1">Elevated Risk Signal</h4>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">Multiple risk indicators are simultaneously elevated. VIX term structure in backwardation combined with high SKEW and elevated 0DTE put activity historically precedes significant drawdowns. Consider reducing position sizes and ensuring adequate hedges.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <AIInsight label="AI Regime Analysis">{mr.interpretation}</AIInsight>
    </div>
  );
});
