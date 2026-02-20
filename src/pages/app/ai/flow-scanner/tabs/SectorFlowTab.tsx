// =====================================================
// 🏭 FLOW SCANNER - Sector Flow Tab
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SectorFlow } from '../shared/types';
import { Card } from '../shared/Ui';

const SectorFlowCard = memo(({ sector, index }: { sector: SectorFlow; index: number }) => {
  const trendColor =
    sector.trend === 'bullish' ? '#22C55E' :
    sector.trend === 'bearish' ? '#EF4444' : '#8B8B8B';
  const netPositive = sector.net >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <div className="relative p-5">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${trendColor}, transparent)` }} />

          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-white">{sector.sector}</span>
            <span className="text-xs px-3 py-1 rounded-full capitalize flex items-center gap-1"
              style={{ background: `${trendColor}15`, color: trendColor }}>
              {sector.trend === 'bullish' && <TrendingUp className="h-3 w-3" />}
              {sector.trend === 'bearish' && <TrendingDown className="h-3 w-3" />}
              {sector.trend}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6B6B6B]">Inflow</span>
                <span className="text-[#22C55E]">${sector.inflow}B</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#22C55E] rounded-full transition-all"
                  style={{ width: `${(sector.inflow / 3) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6B6B6B]">Outflow</span>
                <span className="text-[#EF4444]">${sector.outflow}B</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#EF4444] rounded-full transition-all"
                  style={{ width: `${(sector.outflow / 3) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-[#6B6B6B]">Net Flow</span>
            <span className="text-lg font-bold" style={{ color: netPositive ? '#22C55E' : '#EF4444' }}>
              {netPositive ? '+' : ''}${sector.net}B
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

// =====================================================
// Sector Flow Tab (export)
// =====================================================

export default memo(function SectorFlowTab({ sectorData }: { sectorData: SectorFlow[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sectorData.map((sector, idx) => (
        <SectorFlowCard key={sector.sector} sector={sector} index={idx} />
      ))}
    </div>
  );
});
