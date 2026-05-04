// TODO(Phase D): Rebuild broker connection UI with finotaur-design system
// src/components/BrokerConnectionPopup.tsx
// Maintenance stub — SnapTrade removed in Phase A1 Step 2

import { X } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  onClose: () => void;
}

// ============================================================================
// MAIN COMPONENT (maintenance stub)
// ============================================================================

export default function BrokerConnectionPopup({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#C9A646]/20 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(201,166,70,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-white mb-3">
          Broker Integrations
        </h2>

        <p className="text-zinc-400 leading-relaxed mb-6">
          Broker integrations are under maintenance. Manual trade entry is fully available.
        </p>

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
