/**
 * SectorPeers — clickable chips for up to 6 peers in the same sector.
 *
 * Renders nothing when sector is null or no peers exist.
 * Links to /research/<peer-ticker> for internal navigation.
 */

import { Link } from 'react-router-dom';
import type { TickerUniverseEntry } from '@/lib/seo/types';

interface SectorPeersProps {
  currentTicker: string;
  sector: string | null;
  universe: TickerUniverseEntry[];
}

export function SectorPeers({ currentTicker, sector, universe }: SectorPeersProps) {
  if (!sector) return null;

  const peers = universe
    .filter(
      (t) =>
        t.ticker !== currentTicker &&
        t.sector === sector,
    )
    .slice(0, 6);

  if (peers.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
        {sector} Peers
      </h2>
      <div className="flex flex-wrap gap-2">
        {peers.map((peer) => (
          <Link
            key={peer.ticker}
            to={`/research/${peer.ticker}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70 transition-colors hover:border-[#C9A646]/40 hover:bg-[#C9A646]/[0.08] hover:text-[#C9A646]"
          >
            <span className="font-mono font-semibold">{peer.ticker}</span>
            {peer.name && (
              <span className="ml-1.5 text-xs text-white/40 hidden sm:inline">
                · {peer.name.length > 20 ? `${peer.name.slice(0, 20)}…` : peer.name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
