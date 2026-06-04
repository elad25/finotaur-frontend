// src/pages/app/macro/tabs/RiskRegime.tsx
// Container: Risk & Regime — sub-nav over Liquidity / Models

import { useSearchParams } from 'react-router-dom';
import MacroSubNav from '@/components/macro/MacroSubNav';
import Liquidity from '@/pages/app/macro/Liquidity';
import Models from '@/pages/app/macro/Models';

const NAV_ITEMS = [
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'models', label: 'Regime Models' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

const VALID_KEYS = new Set<string>(NAV_ITEMS.map((i) => i.key));

function isValidKey(k: string | null): k is NavKey {
  return k !== null && VALID_KEYS.has(k);
}

export default function RiskRegime() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const activeKey: NavKey = isValidKey(rawView) ? rawView : NAV_ITEMS[0].key;

  function handleChange(k: string) {
    setSearchParams({ view: k }, { replace: true });
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">Risk &amp; Regime</h1>
      <MacroSubNav
        items={NAV_ITEMS.map((i) => ({ key: i.key, label: i.label }))}
        active={activeKey}
        onChange={handleChange}
      />
      {activeKey === 'liquidity' && <Liquidity />}
      {activeKey === 'models' && <Models />}
    </div>
  );
}
