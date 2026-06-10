// src/pages/app/macro/tabs/GlobalMarkets.tsx
// Container: Global Markets — sub-nav over GlobalHeatmap / CrossAsset

import { useSearchParams } from 'react-router-dom';
import MacroSubNav from '@/components/macro/MacroSubNav';
import GlobalHeatmap from '@/pages/app/macro/GlobalHeatmap';
import CrossAsset from '@/pages/app/macro/CrossAsset';

const NAV_ITEMS = [
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'cross-asset', label: 'Cross-Asset' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

const VALID_KEYS = new Set<string>(NAV_ITEMS.map((i) => i.key));

function isValidKey(k: string | null): k is NavKey {
  return k !== null && VALID_KEYS.has(k);
}

export default function GlobalMarkets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const activeKey: NavKey = isValidKey(rawView) ? rawView : NAV_ITEMS[0].key;

  function handleChange(k: string) {
    setSearchParams({ view: k }, { replace: true });
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">Global Markets</h1>
      <MacroSubNav
        items={NAV_ITEMS.map((i) => ({ key: i.key, label: i.label }))}
        active={activeKey}
        onChange={handleChange}
      />
      {activeKey === 'heatmap' && <GlobalHeatmap />}
      {activeKey === 'cross-asset' && <CrossAsset />}
    </div>
  );
}
