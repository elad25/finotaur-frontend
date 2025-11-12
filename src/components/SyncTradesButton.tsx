// src/components/SyncTradesButton.tsx
// כפתור לסנכרון ידני של עסקאות מהברוקר

import { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { snaptradeTradeSync } from '@/integrations/snaptrade/snaptradeTradeSync';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export function SyncTradesButton() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!user) {
      toast.error('Please sign in to sync trades');
      return;
    }

    setSyncing(true);
    
    try {
      console.log('🔄 Starting trade sync...');
      
      const result = await snaptradeTradeSync.manualSync(user.id);

      if (result.success) {
        if (result.tradesImported > 0) {
          toast.success(`✅ Imported ${result.tradesImported} new trades!`, {
            description: 'Your journal has been updated.',
            duration: 5000,
          });
        } else {
          toast.info('✓ Already up to date', {
            description: 'No new trades to import.',
          });
        }
      } else {
        toast.error('Failed to sync trades', {
          description: result.errors.join(', '),
        });
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Sync failed', {
        description: error.message || 'Please try again later.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 hover:bg-[#C9A646]/20 
                 text-[#C9A646] rounded-lg transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed
                 border border-[#C9A646]/20 hover:border-[#C9A646]/40
                 font-medium text-sm"
    >
      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync from Broker'}
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