// src/components/SyncTradesButton.tsx
// כפתור לסנכרון ידני של עסקאות מהברוקר

import { RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function SyncTradesButton() {
  const handleSync = async () => {
    console.warn('Broker sync disabled during maintenance');
    toast.info('Broker sync temporarily unavailable', {
      description: 'Manual trade entry is fully available.',
    });
  };

  return (
    <button
      onClick={handleSync}
      disabled={true}
      title="Maintenance"
      className="flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10
                 text-[#C9A646] rounded-lg transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed
                 border border-[#C9A646]/20
                 font-medium text-sm"
    >
      <RefreshCw className="w-4 h-4" />
      Sync from Broker
    </button>
  );
}

// ============================================================================
// AUTO SYNC INDICATOR (הצג שסנכרון אוטומטי פעיל)
// ============================================================================

export function AutoSyncIndicator({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 
                    border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
      <CheckCircle className="w-3 h-3" />
      Auto-sync active
    </div>
  );
}

// ============================================================================
// SYNC STATUS CARD (הצג סטטוס סנכרון)
// ============================================================================

interface SyncStatusProps {
  lastSync?: string;
  tradesImported?: number;
  nextSync?: string;
}

export function SyncStatusCard({ lastSync, tradesImported, nextSync }: SyncStatusProps) {
  return (
    <div className="bg-[#0A0A0A] border border-[#C9A646]/10 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3 text-sm">Broker Sync Status</h3>
      
      <div className="space-y-2 text-xs">
        {lastSync && (
          <div className="flex justify-between text-zinc-400">
            <span>Last synced:</span>
            <span className="text-white">{new Date(lastSync).toLocaleString()}</span>
          </div>
        )}
        
        {tradesImported !== undefined && (
          <div className="flex justify-between text-zinc-400">
            <span>Trades imported:</span>
            <span className="text-[#C9A646] font-semibold">{tradesImported}</span>
          </div>
        )}
        
        {nextSync && (
          <div className="flex justify-between text-zinc-400">
            <span>Next sync:</span>
            <span className="text-white">{new Date(nextSync).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}