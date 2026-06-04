// src/pages/app/macro/tabs/Pulse.tsx
// Container: Macro Pulse — MacroChart (normalized performance) + existing Overview

import MacroChart from '@/components/macro/MacroChart';
import Overview from '@/pages/app/macro/Overview';

export default function Pulse() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Macro Pulse</h1>
      <MacroChart
        title="NORMALIZED PERFORMANCE"
        initialTickers={['SPY', 'QQQ']}
        normalize
      />
      <Overview />
    </div>
  );
}
