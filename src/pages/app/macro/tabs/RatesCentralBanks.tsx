// src/pages/app/macro/tabs/RatesCentralBanks.tsx
// Container: Rates & Central Banks — sub-nav over Rates / RealYields / CreditSpreads

import { useSearchParams } from 'react-router-dom';
import MacroSubNav from '@/components/macro/MacroSubNav';
import Rates from '@/pages/app/macro/Rates';
import RealYields from '@/pages/app/macro/RealYields';
import CreditSpreads from '@/pages/app/macro/CreditSpreads';

const NAV_ITEMS = [
  { key: 'yield-curve', label: 'Yield Curve & Rates' },
  { key: 'real-yields', label: 'Real Yields' },
  { key: 'credit-spreads', label: 'Credit Spreads' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

const VALID_KEYS = new Set<string>(NAV_ITEMS.map((i) => i.key));

function isValidKey(k: string | null): k is NavKey {
  return k !== null && VALID_KEYS.has(k);
}

export default function RatesCentralBanks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const activeKey: NavKey = isValidKey(rawView) ? rawView : NAV_ITEMS[0].key;

  function handleChange(k: string) {
    setSearchParams({ view: k }, { replace: true });
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">Rates &amp; Central Banks</h1>
      <MacroSubNav
        items={NAV_ITEMS.map((i) => ({ key: i.key, label: i.label }))}
        active={activeKey}
        onChange={handleChange}
      />
      {activeKey === 'yield-curve' && <Rates />}
      {activeKey === 'real-yields' && <RealYields />}
      {activeKey === 'credit-spreads' && <CreditSpreads />}
    </div>
  );
}
