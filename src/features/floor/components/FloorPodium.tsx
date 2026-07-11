// src/components/floor/FloorPodium.tsx
// =====================================================
// Podium display for the top 3 Floor competitors.
// Champion = full-width dark hero card, Profit Factor as the hero number
// (quality, never a dollar figure).
// Runner-up + Third = 2-column grid below, PF-prominent.
// Gold-on-black palette (#C9A646 / #E8C766 / #0A0A0A / #141414).
// =====================================================

import { Crown } from 'lucide-react';
import { getRowRR, type FloorLeaderboardRow } from '@/features/floor/hooks/useFloor';

// ── Avatar helper ──────────────────────────────────────────────────────────────

function PodiumAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const dim = `${size}px`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="rounded-full object-cover shrink-0"
        style={{
          width: dim,
          height: dim,
          border: '1.5px solid rgba(201,166,70,0.5)',
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-bold"
      aria-hidden="true"
      style={{
        width: dim,
        height: dim,
        fontSize: `${Math.round(size * 0.38)}px`,
        background: 'rgba(201,166,70,0.15)',
        border: '1.5px solid rgba(201,166,70,0.45)',
        color: '#E8C766',
      }}
    >
      {initial}
    </div>
  );
}

// ── Null-safe stat label ───────────────────────────────────────────────────────

function statLabel(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

// ── Champion card ──────────────────────────────────────────────────────────────

function ChampionCard({ row }: { row: FloorLeaderboardRow }) {
  const nickname = row.floor_username ?? row.display_name;
  const rr = getRowRR(row);

  return (
    <div
      className="rounded-[16px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.02) 100%)',
        border: '1px solid rgba(201,166,70,0.4)',
      }}
    >
      {/* Left: crown pill + identity */}
      <div className="flex items-center gap-4 min-w-0">
        <PodiumAvatar name={nickname} avatarUrl={row.avatar_url} size={56} />

        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mb-1.5"
            style={{
              background: 'rgba(201,166,70,0.18)',
              border: '1px solid rgba(201,166,70,0.35)',
              color: '#E8C766',
            }}
          >
            <Crown className="h-[10px] w-[10px]" />
            Champion
          </span>

          <p
            className="font-semibold truncate leading-snug"
            style={{ fontSize: '24px', color: '#fff' }}
          >
            @{nickname}
          </p>

          <p className="text-[12px] mt-0.5" style={{ color: '#888' }}>
            Ranked #1
          </p>
        </div>
      </div>

      {/* Right: Profit Factor hero number + stat row */}
      <div className="flex-shrink-0 text-left sm:text-right w-full sm:w-auto">
        <p
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: '#888' }}
        >
          Profit Factor
        </p>
        <p
          className="tabular-nums font-black leading-none mt-1"
          style={{ fontSize: '44px', color: '#C9A646' }}
        >
          {row.profit_factor !== null ? row.profit_factor.toFixed(2) : '—'}
        </p>

        <p className="text-[12px] mt-2" style={{ color: '#777' }}>
          Win{' '}
          <span style={{ color: '#aaa' }}>{statLabel(row.win_rate, '%')}</span>
          {' · '}Trades{' '}
          <span style={{ color: '#aaa' }}>{row.trade_count}</span>
          {' · '}Days{' '}
          <span style={{ color: '#aaa' }}>
            {statLabel(row.active_days ?? null)}
          </span>
          {' · '}RR{' '}
          <span style={{ color: '#aaa' }}>
            {rr !== null ? `${rr.toFixed(1)}R` : '—'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Runner-up / Third card ─────────────────────────────────────────────────────

type SubPodiumSlot = 'runner-up' | 'third';

function SubPodiumCard({
  row,
  slot,
}: {
  row: FloorLeaderboardRow;
  slot: SubPodiumSlot;
}) {
  const nickname = row.floor_username ?? row.display_name;
  const isRunnerUp = slot === 'runner-up';

  const romanLabel = isRunnerUp ? 'II' : 'III';
  const slotColor = isRunnerUp ? '#9aa0a6' : '#b87333';

  return (
    <div
      className="rounded-[14px] p-4 flex flex-col gap-3"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Rank pill */}
      <span
        className="inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: 'rgba(255,255,255,0.05)',
          color: slotColor,
          border: `1px solid ${slotColor}55`,
        }}
      >
        {romanLabel}
      </span>

      {/* Avatar + nickname */}
      <div className="flex items-center gap-3 min-w-0">
        <PodiumAvatar name={nickname} avatarUrl={row.avatar_url} size={38} />
        <span
          className="text-sm font-medium truncate"
          style={{ color: '#e0e0e0' }}
        >
          @{nickname}
        </span>
      </div>

      {/* PF — prominent */}
      <p
        className="tabular-nums font-bold leading-none"
        style={{ fontSize: '26px', color: '#C9A646' }}
      >
        {row.profit_factor !== null ? row.profit_factor.toFixed(2) : '—'}
        <span
          className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: '#777' }}
        >
          PF
        </span>
      </p>

      {/* Condensed stats */}
      <p className="text-[12px]" style={{ color: '#666' }}>
        {statLabel(row.win_rate, '% win')}
        {' · '}
        {row.trade_count} trades
      </p>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function FloorPodium({ rows }: { rows: FloorLeaderboardRow[] }) {
  // Take up to first 3 qualified rows (caller passes sorted list)
  const qualified = rows.filter((r) => r.qualified).slice(0, 3);

  if (qualified.length === 0) return null;

  const [first, second, third] = qualified;

  return (
    <div className="flex flex-col gap-3">
      {/* Champion */}
      <ChampionCard row={first} />

      {/* Runner-up + Third */}
      {(second || third) && (
        <div className="grid grid-cols-2 gap-3">
          {second && <SubPodiumCard row={second} slot="runner-up" />}
          {third && <SubPodiumCard row={third} slot="third" />}
        </div>
      )}
    </div>
  );
}
