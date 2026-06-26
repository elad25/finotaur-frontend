// src/features/floor/pages/Feed.tsx
// Route: /app/floor/feed
//
// "The Floor — Feed" page (global community feed).
// Split out of the former Community page (which had Feed + Leaderboard tabs);
// the Leaderboard now lives at /app/floor/leaderboard as its own sidebar item.

import { GlobalFeed } from '@/features/floor/components/GlobalFeed';
import { FloorProfileGate } from '@/features/floor/components/FloorProfileGate';

export default function Feed() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-hidden">
        <FloorProfileGate>
          <div className="h-full overflow-y-auto">
            <GlobalFeed />
          </div>
        </FloorProfileGate>
      </div>
    </div>
  );
}
