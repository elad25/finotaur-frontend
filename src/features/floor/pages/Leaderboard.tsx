// src/features/floor/pages/Leaderboard.tsx
// Route: /app/floor/leaderboard
//
// "The Floor — Leaderboard" page. Split out of the former Community page so the
// Leaderboard is its own sidebar item (sibling to Feed and DM).

import { GlobalLeaderboard } from '@/features/floor/components/GlobalLeaderboard';
import { FloorProfileGate } from '@/features/floor/components/FloorProfileGate';

export default function Leaderboard() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-hidden">
        <FloorProfileGate>
          <div className="h-full overflow-y-auto">
            <GlobalLeaderboard />
          </div>
        </FloorProfileGate>
      </div>
    </div>
  );
}
