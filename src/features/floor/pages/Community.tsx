// src/pages/app/community/Community.tsx
// Route: /app/floor/community
//
// "The Floor — Community" page.
// Two tabs: Feed (GlobalFeed), Leaderboard (GlobalLeaderboard).
// Tab strip follows the same SpaceDetail pattern: border-b-2 + gold active indicator.
// Default tab: Feed. Direct Messages moved to /app/floor/dm.

import { useState } from 'react';
import { Newspaper, Trophy } from 'lucide-react';
import { GlobalFeed } from '@/features/floor/components/GlobalFeed';
import { GlobalLeaderboard } from '@/features/floor/components/GlobalLeaderboard';
import { FloorProfileGate } from '@/features/floor/components/FloorProfileGate';
import { cn } from '@/lib/utils';

// ── Tab config ─────────────────────────────────────────────────────────────────

type CommunityTab = 'feed' | 'leaderboard';

const TABS: { id: CommunityTab; label: string; icon: React.ElementType }[] = [
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

// ── Page component ─────────────────────────────────────────────────────────────

export default function Community() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Tab bar (top — the "The Floor — Global" page header was removed) ── */}
      <nav
        className="shrink-0 flex items-center border-b border-border-ds-subtle px-ds-4"
        aria-label="Community sections"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-[6px] px-ds-3 py-[10px]',
              'font-sans text-[13px] font-medium',
              'transition-colors duration-base ease-out',
              'border-b-2 -mb-[1px]',
              activeTab === id
                ? 'text-ink-primary border-gold-primary'
                : 'text-ink-tertiary border-transparent hover:text-ink-secondary',
            )}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Tab content (gated behind Floor profile setup) ── */}
      <div className="flex-1 overflow-hidden">
        <FloorProfileGate>
          {activeTab === 'feed' && (
            <div className="h-full overflow-y-auto">
              <GlobalFeed />
            </div>
          )}
          {activeTab === 'leaderboard' && (
            <div className="h-full overflow-y-auto">
              <GlobalLeaderboard />
            </div>
          )}
        </FloorProfileGate>
      </div>
    </div>
  );
}
