// src/pages/app/macro/tabs/Pulse.tsx
// Container: Macro Pulse — MacroChart (normalized performance) + existing Overview

import MacroChart from '@/components/macro/MacroChart';
import Overview from '@/pages/app/macro/Overview';
import { MarketStatusBadge } from '@/components/ai-arena/MarketStatusBadge';

export default function Pulse() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Macro Pulse</h1>
        <MarketStatusBadge hideWhenOpen />
      </div>
      <MacroChart
        title="NORMALIZED PERFORMANCE"
        initialTickers={['SPY', 'QQQ']}
        normalize
      />
      <Overview />
    </div>
  );
}
