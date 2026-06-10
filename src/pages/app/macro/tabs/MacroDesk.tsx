// src/pages/app/macro/tabs/MacroDesk.tsx
// Container: Macro Desk — sub-nav over Reports / Sentiment / News

import { useSearchParams } from 'react-router-dom';
import MacroSubNav from '@/components/macro/MacroSubNav';
import Reports from '@/pages/app/macro/Reports';
import Sentiment from '@/pages/app/macro/Sentiment';
import News from '@/pages/app/macro/News';

const NAV_ITEMS = [
  { key: 'reports', label: 'Reports' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'news', label: 'News' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

const VALID_KEYS = new Set<string>(NAV_ITEMS.map((i) => i.key));

function isValidKey(k: string | null): k is NavKey {
  return k !== null && VALID_KEYS.has(k);
}

export default function MacroDesk() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const activeKey: NavKey = isValidKey(rawView) ? rawView : NAV_ITEMS[0].key;

  function handleChange(k: string) {
    setSearchParams({ view: k }, { replace: true });
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-4">Macro Desk</h1>
      <MacroSubNav
        items={NAV_ITEMS.map((i) => ({ key: i.key, label: i.label }))}
        active={activeKey}
        onChange={handleChange}
      />
      {activeKey === 'reports' && <Reports />}
      {activeKey === 'sentiment' && <Sentiment />}
      {activeKey === 'news' && <News />}
    </div>
  );
}
