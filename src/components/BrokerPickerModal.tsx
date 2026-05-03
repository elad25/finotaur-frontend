// src/components/BrokerPickerModal.tsx
// ═══════════════════════════════════════════════════════════════
// Broker Selection Popup — shown BEFORE broker-specific modals.
// Infrastructure supports multiple brokers; only Tradovate active.
// Optimized: memo, zero unnecessary renders.
// ═══════════════════════════════════════════════════════════════

import { memo, useCallback } from 'react';
import { X, ChevronRight, Link2, Clock } from 'lucide-react';

export type BrokerKey = 'tradovate' | 'coming_soon';

interface Broker {
  key: BrokerKey;
  name: string;
  description: string;
  available: boolean;
  badgeLabel?: string;
}

const BROKERS: Broker[] = [
  {
    key: 'tradovate',
    name: 'Tradovate',
    description: 'Auto-sync futures trades every 5 minutes',
    available: true,
  },
  {
    key: 'coming_soon',
    name: 'More brokers',
    description: 'Additional integrations coming soon',
    available: false,
    badgeLabel: 'Soon',
  },
];

interface Props {
  onClose: () => void;
  onSelect: (broker: BrokerKey) => void;
}

export const BrokerPickerModal = memo(function BrokerPickerModal({ onClose, onSelect }: Props) {
  const handleSelect = useCallback((broker: Broker) => {
    if (!broker.available) return;
    onSelect(broker.key);
  }, [onSelect]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm bg-[#111111] border border-[#C9A646]/20 rounded-[24px] shadow-[0_0_80px_rgba(201,166,70,0.12)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Connect Broker</h2>
              <p className="text-xs text-zinc-500">Select your trading platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Broker list */}
        <div className="p-4 space-y-2">
          {BROKERS.map(broker => (
            <button
              key={broker.key}
              onClick={() => handleSelect(broker)}
              disabled={!broker.available}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] border transition-all duration-200 text-left ${
                broker.available
                  ? 'bg-zinc-900 border-zinc-800 hover:border-[#C9A646]/40 hover:bg-[#C9A646]/5 group cursor-pointer'
                  : 'bg-zinc-900/40 border-zinc-800/40 cursor-not-allowed opacity-50'
              }`}
            >
              {/* Icon placeholder — each broker gets its own icon color */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                broker.available
                  ? 'bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5'
                  : 'bg-zinc-800/60'
              }`}>
                {broker.available
                  ? <Link2 className="w-5 h-5 text-[#C9A646]" />
                  : <Clock className="w-5 h-5 text-zinc-600" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${broker.available ? 'text-white' : 'text-zinc-500'}`}>
                    {broker.name}
                  </span>
                  {broker.badgeLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 font-medium">
                      {broker.badgeLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{broker.description}</p>
              </div>

              {broker.available && (
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C9A646] transition-colors shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="px-6 pb-5 pt-1">
          <p className="text-[11px] text-zinc-600 text-center">
            More broker integrations are on the way
          </p>
        </div>
      </div>
    </div>
  );
});

export default BrokerPickerModal;