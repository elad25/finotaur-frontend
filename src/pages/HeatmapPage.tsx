import HeatmapMiniNav from '../components/heatmap/HeatmapMiniNav';
import HeatmapGrid from '../components/heatmap/HeatmapGrid';
import type { MarketKey } from '../types/heatmap';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

const ORDER: MarketKey[] = ['stocks','crypto','futures','forex','commodities','indices'];

export default function HeatmapPage() {
  const [params, setParams] = useSearchParams();
  const param = (params.get('m') || '').toLowerCase();

  const market = useMemo<MarketKey>(() => {
    if (ORDER.includes(param as MarketKey)) return param as MarketKey;
    return 'indices';
  }, [param]);

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
