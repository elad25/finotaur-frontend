// =====================================================
// 🃏 SECTOR CARD
// src/components/SectorAnalyzer/cards/SectorCard.tsx
// =====================================================

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Heart, Banknote, Fuel, ShoppingBag, Factory, Gem, Lightbulb, Building2, Wheat, Globe, LucideIcon } from 'lucide-react';
import type { Sector } from '../types';

const iconMap: Record<string, LucideIcon> = { Cpu, Heart, Banknote, Fuel, ShoppingBag, Factory, Gem, Lightbulb, Building2, Wheat, Globe };

export function getSectorIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Cpu;
}

interface SectorCardProps {
  sector: Sector;
  onClick: () => void;
  index: number;
}

export const SectorCard = memo<SectorCardProps>(({ sector, onClick, index }) => {
  const Icon = useMemo(() => getSectorIcon(sector.icon), [sector.icon]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative text-left w-full"
    >
      <div
        className="rounded-2xl p-6 transition-all duration-500 h-full"
        style={{ background: 'linear-gradient(145deg, rgba(18,16,12,0.95), rgba(12,10,8,0.98))', border: '1px solid rgba(201,166,70,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
      >
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" style={{ background: 'linear-gradient(145deg, rgba(201,166,70,0.06), transparent 60%)', border: '1px solid rgba(201,166,70,0.2)' }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(145deg, rgba(201,166,70,0.12), rgba(201,166,70,0.04))', border: '1px solid rgba(201,166,70,0.15)' }}>
            <Icon className="h-7 w-7 text-[#C9A646] group-hover:text-[#F4D97B] transition-colors" />
          </div>
          <h3 className="text-2xl font-bold tracking-wide mb-1" style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{sector.ticker}</h3>
          <p className="text-[#8B8B8B] text-sm font-medium group-hover:text-[#A0A0A0] transition-colors">{sector.name}</p>
        </div>
      </div>
    </motion.button>
  );
});
SectorCard.displayName = 'SectorCard';

interface SectorGridProps {
  sectors: Sector[];
  onSelectSector: (sector: Sector) => void;
}

export const SectorGrid = memo<SectorGridProps>(({ sectors, onSelectSector }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full max-w-6xl">
    {sectors.map((sector, idx) => (
      <SectorCard key={sector.id} sector={sector} onClick={() => onSelectSector(sector)} index={idx} />
    ))}
  </motion.div>
));
SectorGrid.displayName = 'SectorGrid';
