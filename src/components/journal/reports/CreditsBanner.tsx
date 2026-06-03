// TODO(north-star-1B): wire to ai_usage_daily
import { useState } from 'react';

export default function CreditsBanner() {
  const [used] = useState(0);
  const cap = 30;
  const pct = Math.min(100, (used / cap) * 100);

  return (
    <div className="flex items-center justify-between rounded-xl border border-yellow-200/10 bg-black/40 px-4 py-2 text-xs text-zinc-300">
      <span>AI credits today: {used} / {cap}</span>
      <div className="w-32 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400/60 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
