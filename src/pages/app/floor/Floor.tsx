// src/pages/app/floor/Floor.tsx
// =====================================================
// THE FLOOR — competition leaderboard page
// Broker-verified discipline competition, not profit.
// Gated behind AdminBetaGate.
// =====================================================

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AdminBetaGate } from '@/components/routes/AdminBetaGate';
import { useAuth } from '@/providers/AuthProvider';
import {
  useActiveCompetition,
  useFloorLeaderboard,
} from '@/hooks/useFloor';
import { FloorLeaderboardTable } from '@/components/floor/FloorLeaderboardTable';
import { JoinFloorCard } from '@/components/floor/JoinFloorCard';
import { FloorProfileGate } from '@/components/floor/FloorProfileGate';

// ────────────────────────────────────────────────────
// Tab types
// ────────────────────────────────────────────────────
type FloorTab = 'monthly' | 'seasonal' | 'all_time';

const TABS: Array<{ id: FloorTab; label: string }> = [
  { id: 'monthly', label: 'This Month' },
  { id: 'seasonal', label: 'Season' },
  { id: 'all_time', label: 'All-Time' },
];

// Default minimum trades for seasonal/all-time (no active competition to read from)
const DEFAULT_MIN_TRADES = 20;

// ────────────────────────────────────────────────────
// Skeleton — shown while data loads
// ────────────────────────────────────────────────────
function FloorSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div
        className="h-[88px] rounded-[20px]"
        style={{ background: '#141414' }}
      />
      <div
        className="h-[320px] rounded-[20px]"
        style={{ background: '#0A0A0A' }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────
// Tab content
// ────────────────────────────────────────────────────
function FloorTabContent({
  tab,
  competitionId,
  minTrades,
  currentUserId,
  competition,
}: {
  tab: FloorTab;
  competitionId?: string;
  minTrades: number;
  currentUserId: string | null | undefined;
  competition: ReturnType<typeof useActiveCompetition>['data'];
}) {
  const { data: rows, isLoading, error } = useFloorLeaderboard(tab, competitionId);

  if (isLoading) return <FloorSkeleton />;

  if (error) {
    return (
      <div
        className="rounded-[20px] p-6 text-center text-sm"
        style={{
          background: '#0A0A0A',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171',
        }}
      >
        Failed to load leaderboard. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tab === 'monthly' && competition && (
        <JoinFloorCard competition={competition} />
      )}
      <FloorLeaderboardTable
        rows={rows ?? []}
        currentUserId={currentUserId}
        minTrades={minTrades}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────
function FloorPage() {
  const [activeTab, setActiveTab] = useState<FloorTab>('monthly');
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { data: competition, isLoading: competitionLoading } =
    useActiveCompetition();

  return (
    <div className="min-h-screen bg-[#070808] text-white">
      <div className="mx-auto max-w-[1080px] space-y-6 px-4 py-6 sm:px-6">
        {/* ── Header ── */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white leading-tight">
            The Floor
          </h1>
          <p className="text-sm" style={{ color: '#888' }}>
            Compete on discipline — not profit. Broker-verified only.
          </p>
        </div>

        {/* ── Verified-only banner ── */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium"
          style={{
            background: 'rgba(201,166,70,0.08)',
            border: '1px solid rgba(201,166,70,0.2)',
            color: '#C9A646',
          }}
        >
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          Real broker-verified trades only. No manual entries.
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 rounded-[12px] p-1"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex-1 rounded-[10px] py-2 text-sm font-medium transition-all duration-200"
              style={
                activeTab === t.id
                  ? {
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.1) 100%)',
                      color: '#E8C766',
                      border: '1px solid rgba(201,166,70,0.25)',
                    }
                  : {
                      color: '#666',
                      border: '1px solid transparent',
                    }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {competitionLoading ? (
          <FloorSkeleton />
        ) : (
          <FloorTabContent
            tab={activeTab}
            competitionId={competition?.id}
            minTrades={competition?.min_trades ?? DEFAULT_MIN_TRADES}
            currentUserId={currentUserId}
            competition={competition ?? null}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Export — wrapped in AdminBetaGate, then FloorProfileGate
// ────────────────────────────────────────────────────
export default function Floor() {
  return (
    <AdminBetaGate>
      <FloorProfileGate>
        <FloorPage />
      </FloorProfileGate>
    </AdminBetaGate>
  );
}
