import HeatmapMiniNav from '../components/heatmap/HeatmapMiniNav';
import HeatmapGrid from '../components/heatmap/HeatmapGrid';
import type { MarketKey } from '../types/heatmap';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

const ORDER: MarketKey[] = ['stocks','crypto','futures','forex','commodities','indices'];

interface HeatmapPageProps {
  market?: MarketKey;
}

export default function HeatmapPage({ market: marketOverride }: HeatmapPageProps = {}) {
  const [params, setParams] = useSearchParams();
  const param = (params.get('m') || '').toLowerCase();

  const market = useMemo<MarketKey>(() => {
    if (marketOverride && ORDER.includes(marketOverride)) return marketOverride;
    if (ORDER.includes(param as MarketKey)) return param as MarketKey;
    return 'indices';
  }, [param, marketOverride]);

  const onChange = (m: MarketKey) => {
    const next = new URLSearchParams(params);
    next.set('m', m);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <HeatmapMiniNav market={market} onChange={onChange} />
      <HeatmapGrid market={market} />
    </div>
  );
}
