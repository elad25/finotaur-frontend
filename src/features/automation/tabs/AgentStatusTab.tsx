// src/features/automation/tabs/AgentStatusTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Master switch + desktop agent pairing placeholder.
// Optionally shows recent automation_events (read-only).
// Makes it VERY clear nothing executes yet.
// ─────────────────────────────────────────────────────────────────────────────

import { Monitor, Clock, Info } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { DataState } from '@/components/ds/DataState';
import { AutomationMasterSwitch } from '../components/AutomationMasterSwitch';

// ── recent events (optional, read-only) ──────────────────────────────────────

interface AutomationEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function useRecentEvents() {
  const { id: userId } = useEffectiveUser();
  return useTimedQuery({
    queryKey: ['automation', 'events', userId ?? ''],
    queryFn: async (): Promise<AutomationEvent[]> => {
      const { data, error } = await supabase
        .from('automation_events')
        .select('id,event_type,payload,created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error?.code === '42P01') return [];
      if (error) throw error;
      return (data ?? []) as AutomationEvent[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentStatusTab() {
  const { data: events = [], isLoading, isError, error, refetch } = useRecentEvents();

  return (
    <div className="space-y-6">
      {/* Master switch */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Automation Control
        </h2>
        <AutomationMasterSwitch />
      </section>

      {/* Agent pairing — coming next phase */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Desktop Agent
        </h2>
        <Card padding="default" className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Monitor className="h-8 w-8 text-zinc-500" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-200">Desktop agent pairing</p>
            <p className="mt-1 text-sm text-zinc-500 max-w-sm">
              Coming in the next phase. The desktop agent runs locally on your machine and
              is the only component that executes trades or enforces risk halts.
              <strong className="text-zinc-400"> Nothing on this page executes orders.</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            This web UI is the configuration layer only.
          </div>
        </Card>
      </section>

      {/* Recent events (optional) */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={events}
          onRetry={refetch}
          empty={
            <Card padding="compact" className="flex items-center gap-3 text-zinc-500">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-sm">No automation events recorded yet.</span>
            </Card>
          }
        >
          {(data) => (
            <div className="space-y-1">
              {data.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between gap-4 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 font-mono">{evt.event_type}</p>
                    {evt.payload && (
                      <p className="text-xs text-zinc-600 truncate">
                        {JSON.stringify(evt.payload)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {formatRelative(evt.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DataState>
      </section>
    </div>
  );
}
