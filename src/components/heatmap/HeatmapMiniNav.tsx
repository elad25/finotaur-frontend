import type { MarketKey } from '../../types/heatmap';

const MARKETS: MarketKey[] = ['stocks','crypto','futures','forex','commodities','indices'];

export default function HeatmapMiniNav({ market, onChange }: { market: MarketKey; onChange: (m: MarketKey) => void; }) {
  return (
    <nav className="flex items-center gap-6 px-4 py-2 border-b border-border/40">
      {MARKETS.map((m) => {
        const active = m === market;
        const label = m.charAt(0).toUpperCase() + m.slice(1);
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`text-sm transition ${active ? 'text-yellow-400 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
