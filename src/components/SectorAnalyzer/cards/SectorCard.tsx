// =====================================================
// 🃏 SECTOR CARD
// src/components/SectorAnalyzer/cards/SectorCard.tsx
// =====================================================

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Building2,
  Cpu,
  Factory,
  Fuel,
  Gem,
  Globe,
  Heart,
  Lightbulb,
  LucideIcon,
  ShoppingBag,
  Wheat,
} from 'lucide-react';
import type { Sector } from '../types';

const iconMap: Record<string, LucideIcon> = { Cpu, Heart, Banknote, Fuel, ShoppingBag, Factory, Gem, Lightbulb, Building2, Wheat, Globe };

export function getSectorIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Cpu;
}

const visualMap: Record<string, string> = {
  XLK: 'radial-gradient(circle at 74% 24%, rgba(67,128,186,0.34), transparent 25%), radial-gradient(circle at 28% 82%, rgba(201,166,70,0.13), transparent 34%), linear-gradient(135deg, rgba(13,31,43,0.86), rgba(5,7,10,0.55) 58%), linear-gradient(120deg, transparent 0 42%, rgba(220,220,220,0.13) 43% 46%, transparent 47%)',
  XLV: 'radial-gradient(ellipse at 72% 24%, rgba(92,158,132,0.22), transparent 31%), linear-gradient(120deg, rgba(13,31,30,0.84), rgba(6,8,10,0.56) 62%), radial-gradient(ellipse at 32% 74%, rgba(201,166,70,0.08), transparent 38%)',
  XLF: 'linear-gradient(110deg, rgba(232,232,232,0.12) 0 5%, transparent 6% 18%, rgba(255,255,255,0.10) 19% 25%, transparent 26% 42%, rgba(201,166,70,0.10) 43% 47%, transparent 48%), linear-gradient(140deg, rgba(19,24,31,0.88), rgba(5,6,8,0.52))',
  XLE: 'radial-gradient(ellipse at 76% 32%, rgba(209,140,61,0.28), transparent 30%), linear-gradient(112deg, rgba(35,24,13,0.84), rgba(5,6,8,0.58) 64%), linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.12) 43% 46%, transparent 47%)',
  XLY: 'radial-gradient(ellipse at 72% 22%, rgba(201,166,70,0.20), transparent 30%), linear-gradient(115deg, rgba(31,25,21,0.82), rgba(5,6,8,0.58) 62%), linear-gradient(90deg, transparent 34%, rgba(255,255,255,0.10) 35% 43%, transparent 44%)',
  XLI: 'radial-gradient(ellipse at 76% 25%, rgba(222,222,222,0.16), transparent 28%), linear-gradient(135deg, rgba(24,28,31,0.86), rgba(5,6,8,0.56) 62%), linear-gradient(146deg, transparent 35%, rgba(201,166,70,0.13) 36% 39%, transparent 40%)',
  XLB: 'radial-gradient(ellipse at 42% 32%, rgba(158,152,140,0.16), transparent 32%), linear-gradient(135deg, rgba(28,28,25,0.86), rgba(5,6,8,0.56) 62%), radial-gradient(circle at 78% 78%, rgba(201,166,70,0.11), transparent 35%)',
  XLU: 'radial-gradient(ellipse at 70% 24%, rgba(201,166,70,0.20), transparent 28%), linear-gradient(130deg, rgba(17,29,39,0.84), rgba(5,6,8,0.56) 62%), linear-gradient(90deg, transparent 36%, rgba(255,255,255,0.12) 37% 39%, transparent 40%)',
  XLRE: 'linear-gradient(90deg, rgba(255,255,255,0.10) 0 3%, transparent 4% 16%, rgba(255,255,255,0.08) 17% 20%, transparent 21%), linear-gradient(135deg, rgba(20,27,34,0.88), rgba(5,6,8,0.54) 60%), radial-gradient(circle at 74% 18%, rgba(201,166,70,0.15), transparent 28%)',
  XLP: 'radial-gradient(ellipse at 74% 26%, rgba(201,166,70,0.18), transparent 30%), linear-gradient(115deg, rgba(28,28,22,0.84), rgba(5,6,8,0.58) 62%), linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.09) 31% 44%, transparent 45%)',
  XLC: 'radial-gradient(circle at 76% 28%, rgba(218,218,218,0.18), transparent 29%), linear-gradient(135deg, rgba(17,29,39,0.84), rgba(5,6,8,0.56) 62%), linear-gradient(28deg, transparent 44%, rgba(201,166,70,0.12) 45% 47%, transparent 48%)',
};

const intelligenceMap: Record<string, { holdings: string; momentum: string; sentiment: string; activity: string; cta: string; spark: string }> = {
  XLK: { holdings: 'NVDA / MSFT / AAPL', momentum: '+2.8%', sentiment: 'Bullish', activity: 'Accumulation', cta: 'Deep Dive', spark: 'M 0 18 L 16 15 L 30 17 L 44 10 L 58 12 L 72 6 L 86 8 L 100 3' },
  XLV: { holdings: 'LLY / UNH / JNJ', momentum: '+0.9%', sentiment: 'Constructive', activity: 'Rotating In', cta: 'Explore Sector', spark: 'M 0 14 L 14 13 L 28 16 L 42 11 L 56 12 L 70 9 L 84 10 L 100 7' },
  XLF: { holdings: 'BRK.B / JPM / V', momentum: '+1.4%', sentiment: 'Positive', activity: 'Steady Bid', cta: 'Enter Analysis', spark: 'M 0 16 L 14 14 L 28 13 L 42 12 L 56 9 L 70 10 L 84 8 L 100 6' },
  XLE: { holdings: 'XOM / CVX / COP', momentum: '+1.9%', sentiment: 'Bullish', activity: 'Flow Rising', cta: 'Deep Dive', spark: 'M 0 15 L 15 17 L 30 12 L 45 13 L 60 8 L 75 10 L 90 5 L 100 6' },
  XLY: { holdings: 'AMZN / TSLA / HD', momentum: '+0.6%', sentiment: 'Neutral+', activity: 'Selective', cta: 'Explore Sector', spark: 'M 0 13 L 16 14 L 32 12 L 48 15 L 64 11 L 80 12 L 100 9' },
  XLI: { holdings: 'GE / CAT / RTX', momentum: '+1.1%', sentiment: 'Positive', activity: 'Institutional', cta: 'Enter Analysis', spark: 'M 0 17 L 16 15 L 32 16 L 48 13 L 64 10 L 80 11 L 100 8' },
  XLB: { holdings: 'LIN / SHW / FCX', momentum: '-0.2%', sentiment: 'Mixed', activity: 'Light Flow', cta: 'Explore Sector', spark: 'M 0 10 L 14 12 L 28 11 L 42 14 L 56 13 L 70 16 L 84 14 L 100 15' },
  XLU: { holdings: 'NEE / SO / DUK', momentum: '-0.7%', sentiment: 'Defensive', activity: 'Outflow', cta: 'Enter Analysis', spark: 'M 0 8 L 14 9 L 28 11 L 42 10 L 56 13 L 70 15 L 84 14 L 100 17' },
  XLRE: { holdings: 'PLD / AMT / EQIX', momentum: '+0.3%', sentiment: 'Neutral', activity: 'Stabilizing', cta: 'Deep Dive', spark: 'M 0 14 L 16 15 L 32 13 L 48 14 L 64 12 L 80 12 L 100 10' },
  XLP: { holdings: 'COST / WMT / PG', momentum: '+0.4%', sentiment: 'Stable', activity: 'Low Beta', cta: 'Explore Sector', spark: 'M 0 14 L 18 13 L 36 13 L 54 12 L 72 12 L 88 10 L 100 11' },
  XLC: { holdings: 'META / GOOGL / NFLX', momentum: '+2.1%', sentiment: 'Bullish', activity: 'Accumulation', cta: 'Deep Dive', spark: 'M 0 17 L 16 14 L 32 15 L 48 11 L 64 12 L 80 7 L 100 5' },
};

const descriptionMap: Record<string, string> = {
  XLK: 'Innovation & Growth',
  XLV: 'Health & Biotechnology',
  XLF: 'Banking & Insurance',
  XLE: 'Oil, Gas & Energy',
  XLY: 'Retail & Consumer',
  XLI: 'Manufacturing & Equip.',
  XLB: 'Raw Materials',
  XLU: 'Utilities & Services',
  XLRE: 'REITs & Property',
  XLP: 'Food & Essentials',
  XLC: 'Media & Telecom',
};

interface SectorCardProps {
  sector: Sector;
  onClick: () => void;
  index: number;
}

export const SectorCard = memo<SectorCardProps>(({ sector, onClick, index }) => {
  const Icon = useMemo(() => getSectorIcon(sector.icon), [sector.icon]);
  const visual = visualMap[sector.ticker] ?? visualMap.XLK;
  const intel = intelligenceMap[sector.ticker] ?? intelligenceMap.XLK;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.018, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative h-[216px] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/35"
    >
      <div
        className="relative h-full overflow-hidden rounded-lg border border-white/[0.07] bg-black/34 p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.46)] backdrop-blur-xl transition-all duration-500 group-hover:border-gold-primary/24 group-hover:shadow-[0_28px_70px_rgba(0,0,0,0.60),0_0_22px_rgba(201,166,70,0.07)]"
      >
        <div className="absolute inset-0 opacity-72 transition-transform duration-700 group-hover:scale-[1.035]" style={{ background: visual }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,6,0.20)_0%,rgba(3,4,6,0.55)_50%,rgba(3,4,6,0.93)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(201,166,70,0.09),transparent_32%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-90" />
        <div className="absolute inset-0 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.065)]" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.075] bg-black/32 text-gold-primary/85 backdrop-blur-md transition-colors duration-500 group-hover:border-gold-primary/20 group-hover:text-gold-bright">
              <Icon className="h-[17px] w-[17px]" />
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <h3 className="font-mono text-[27px] font-bold leading-none text-gold-primary/95 transition-colors duration-500 group-hover:text-gold-bright">{sector.ticker}</h3>
              <p className="mt-1 text-[14px] font-semibold leading-tight text-ink-primary">{sector.name}</p>
              <p className="mt-1 min-w-0 truncate text-[11px] leading-tight text-ink-tertiary">{descriptionMap[sector.ticker] ?? sector.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-white/[0.06] pt-2.5">
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">Holdings</p>
                <p className="mt-0.5 truncate font-mono text-[9px] text-ink-secondary">{intel.holdings}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">Momentum</p>
                <p className="mt-0.5 font-mono text-[9px] text-ink-secondary">{intel.momentum}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">AI Sentiment</p>
                <p className="mt-0.5 truncate text-[9px] text-ink-secondary">{intel.sentiment}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">Inst. Activity</p>
                <p className="mt-0.5 truncate text-[9px] text-ink-secondary">{intel.activity}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <svg viewBox="0 0 100 22" className="h-5 flex-1 overflow-visible" aria-hidden="true">
                <path d={intel.spark} fill="none" stroke="rgba(201,166,70,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d={intel.spark} fill="none" stroke="rgba(232,199,102,0.20)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.075] bg-black/32 px-2.5 py-1.5 text-[9px] font-semibold text-ink-primary backdrop-blur-md transition-all duration-500 group-hover:border-gold-primary/22 group-hover:text-gold-bright">
                {intel.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
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
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid w-full max-w-[1224px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
    {sectors.map((sector, idx) => (
      <SectorCard key={sector.id} sector={sector} onClick={() => onSelectSector(sector)} index={idx} />
    ))}
  </motion.div>
));
SectorGrid.displayName = 'SectorGrid';
